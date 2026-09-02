/**
 * Purpose:
 * Orchestrate BP-009 IP-07 contracts: create, approve, activate, amend, renew, call-off.
 */

import { randomUUID } from "node:crypto";

import type { CurrentBusinessContext } from "@/core/auth/types";
import type { NotificationEnginePort } from "@/core/notification-engine/ports";
import { createInProcessNotificationAdapter } from "@/core/notification-engine/adapters/in-process-notification-adapter";
import type { WorkflowEnginePort } from "@/core/workflow-engine";
import { WORKFLOW_OPERATIONS } from "@/core/workflow-engine/constants";
import { WorkflowEngineError } from "@/core/workflow-engine/errors";
import {
  DOCUMENT_NUMBERING_DOCUMENT_TYPES,
  DocumentNumberingError,
  type DocumentNumberingPort,
} from "@/core/localization-regulatory/document-numbering";
import { ConfigurableDocumentNumberingService } from "@/core/localization-regulatory/services/document-numbering-service";
import { createDocumentNumberingPolicyRepository } from "@/core/localization-regulatory/repositories/document-numbering-policy-repository";
import {
  CONTRACT_SOURCE_TYPES,
  CONTRACT_STATUSES,
  CONTRACT_VERSION_STATUSES,
  PROCUREMENT_AUDIT_ACTIONS,
  PROCUREMENT_PERMISSIONS,
} from "@/modules/procurement/constants";
import { PROCUREMENT_ERROR_CODES, ProcurementError } from "@/modules/procurement/errors";
import type {
  ContractControlPort,
  ContractStorePort,
  PurchaseOrderStorePort,
  PurchaseRequestRepositoryPort,
  ProcurementAuditPort,
  SourcingStorePort,
  SuggestedSupplierPort,
} from "@/modules/procurement/ports";
import { createProcurementContractWorkflowAdapter } from "@/modules/procurement/adapters/procurement-contract-workflow-adapter";
import { createSuggestedSupplierAdapter } from "@/modules/procurement/adapters/suggested-supplier-adapter";
import {
  createContractControlRepository,
  createContractRepository,
} from "@/modules/procurement/repositories/contract-repository";
import { createPurchaseOrderRepository } from "@/modules/procurement/repositories/purchase-order-repository";
import { createPurchaseRequestRepository } from "@/modules/procurement/repositories/purchase-request-repository";
import { createSourcingRepository } from "@/modules/procurement/repositories/sourcing-repository";
import { createProcurementAuditAdapter } from "@/modules/procurement/services/procurement-audit-helper";
import {
  assertCallOffAllowed,
  assertCallOffWithinCeiling,
  assertContractStatus,
  computeRemainingContractValue,
  deriveExpiryStatus,
  isCommittedPoStatus,
  isMaterialContractAmendment,
  resolveContractCeiling,
  validateContractCommercial,
  validateContractDates,
} from "@/modules/procurement/services/contract-rules";
import { assertPermission } from "@/modules/procurement/services/procurement-rules";
import { evaluateSupplierEligibility } from "@/modules/procurement/services/supplier-eligibility-service";
import { formatProcurementMoney } from "@/modules/procurement/services/evaluation-outcome-rules";
import type {
  ActivateContractCommand,
  AmendContractCommand,
  ContractDecisionCommand,
  ContractListFilter,
  ContractListView,
  ContractView,
  CreateContractCallOffCommand,
  CreateContractCommand,
  GenerateContractFromAwardCommand,
  GenerateContractFromPurchaseRequestCommand,
  ProcurementActor,
  PurchaseOrderView,
  RenewContractCommand,
} from "@/modules/procurement/types";
import type { PurchaseOrderService } from "@/modules/procurement/services/purchase-order-service";
import {
  createDefaultPurchaseOrderDependencies,
  createPurchaseOrderService,
} from "@/modules/procurement/services/purchase-order-service";

export type ContractServiceDependencies = {
  store: ContractStorePort;
  poStore: PurchaseOrderStorePort;
  sourcing: SourcingStorePort;
  requests: PurchaseRequestRepositoryPort;
  numbering: DocumentNumberingPort;
  audit: ProcurementAuditPort;
  workflow: WorkflowEnginePort;
  controls: ContractControlPort;
  suggestedSupplier: SuggestedSupplierPort;
  notifications: NotificationEnginePort;
  purchaseOrders?: Pick<PurchaseOrderService, "generateFromContract">;
};

function actorId(context: CurrentBusinessContext) {
  return context.platformUserId || null;
}

function requireContract<T>(row: T | null): T {
  if (!row) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.CONTRACT_NOT_FOUND, undefined, 404);
  }
  return row;
}

export class ContractService {
  constructor(private readonly deps: ContractServiceDependencies) {}

  async list(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    filter: ContractListFilter = {}
  ): Promise<ContractListView[]> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.CONTRACT_READ);
    const rows = await this.deps.store.listByBusiness(context.businessId);
    const views: ContractListView[] = [];
    for (const row of rows) {
      if (filter.status && row.status !== filter.status) {
        continue;
      }
      if (filter.profileId && row.profileId !== filter.profileId) {
        continue;
      }
      if (filter.contractTypeCode && row.contractTypeCode !== filter.contractTypeCode) {
        continue;
      }
      if (filter.categoryCode && row.categoryCode !== filter.categoryCode) {
        continue;
      }
      if (filter.expiringOnly && row.status !== CONTRACT_STATUSES.EXPIRING) {
        continue;
      }
      const snapshot = await this.deps.suggestedSupplier.resolve(context.businessId, row.profileId);
      const relatedPos = await this.deps.poStore.listByContractId(context.businessId, row.id);
      views.push({
        id: row.id,
        contractNumber: row.contractNumber,
        title: row.title,
        supplierName: snapshot?.party.displayName ?? row.profileId,
        contractTypeCode: row.contractTypeCode,
        status: row.status,
        statusLabel: row.status,
        startDate: row.startDate,
        endDate: row.endDate,
        totalValueLabel: row.totalValue
          ? formatProcurementMoney(row.totalValue, row.currencyCode)
          : null,
        currencyCode: row.currencyCode,
        ownerName: row.ownerName,
        relatedPoCount: relatedPos.length,
      });
    }
    return views;
  }

  async get(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    contractId: string
  ): Promise<ContractView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.CONTRACT_READ);
    return this.toView(context, contractId);
  }

  async create(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    input: CreateContractCommand
  ): Promise<ContractView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.CONTRACT_CREATE);
    await this.assertEligibleSupplier(context.businessId, input.profileId.trim());
    validateContractDates(input.startDate ?? null, input.endDate ?? null);
    const commercial = validateContractCommercial({
      valueType: input.valueType,
      totalValue: input.totalValue,
      annualValue: input.annualValue,
      callOffCeiling: input.callOffCeiling,
      currencyCode: input.currencyCode,
      paymentTerms: input.paymentTerms,
      periodValues: input.periodValues,
    });
    const allocated = await this.allocateContractNumber(context.businessId);
    const contractId = randomUUID();
    const versionId = randomUUID();
    await this.deps.store.insert({
      id: contractId,
      businessId: context.businessId,
      contractNumber: allocated.number,
      profileId: input.profileId.trim(),
      contractTypeCode: input.contractTypeCode.trim(),
      title: input.title.trim(),
      description: input.description?.trim() || null,
      status: CONTRACT_STATUSES.DRAFT,
      sourceType: CONTRACT_SOURCE_TYPES.MANUAL,
      purchaseRequestId: null,
      sourcingEventId: null,
      awardId: null,
      winningQuoteId: null,
      currencyCode: input.currencyCode.trim().toUpperCase(),
      valueType: commercial.valueType,
      totalValue: input.totalValue?.trim() || null,
      annualValue: input.annualValue?.trim() || null,
      callOffCeiling: input.callOffCeiling?.trim() || null,
      categoryCode: input.categoryCode?.trim() || null,
      ownerUserId: actorId(context),
      ownerName: input.ownerName?.trim() || null,
      currentVersionId: versionId,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      executionDate: input.executionDate ?? null,
      renewalOption: input.renewalOption ?? false,
      noticePeriodDays: input.noticePeriodDays ?? null,
      callOffsPermitted: input.callOffsPermitted ?? true,
      executionEvidenceDocumentId: null,
      submittedAt: null,
      submittedBy: null,
      approvedAt: null,
      approvedBy: null,
      rejectedAt: null,
      rejectedBy: null,
      rejectionReason: null,
      activatedAt: null,
      activatedBy: null,
      suspendedAt: null,
      suspendedBy: null,
      suspensionReason: null,
      terminatedAt: null,
      terminatedBy: null,
      terminationReason: null,
      closedAt: null,
      closedBy: null,
      closureReason: null,
      createdBy: actorId(context),
      updatedBy: actorId(context),
    });
    await this.persistVersion(context, contractId, versionId, 1, {
      status: CONTRACT_VERSION_STATUSES.CURRENT,
      changeReason: "Initial version",
      valueType: commercial.valueType,
      totalValue: input.totalValue?.trim() || null,
      annualValue: input.annualValue?.trim() || null,
      callOffCeiling: input.callOffCeiling?.trim() || null,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      renewalOption: input.renewalOption ?? false,
      noticePeriodDays: input.noticePeriodDays ?? null,
      callOffsPermitted: input.callOffsPermitted ?? true,
      paymentTerms: commercial.paymentTerms,
      periodValues: commercial.periodValues,
    });
    await this.audit(context, contractId, PROCUREMENT_AUDIT_ACTIONS.CONTRACT_CREATED, {
      contractNumber: allocated.number,
      sourceType: CONTRACT_SOURCE_TYPES.MANUAL,
    });
    return this.toView(context, contractId);
  }

  async generateFromAward(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    input: GenerateContractFromAwardCommand
  ): Promise<ContractView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.CONTRACT_CREATE);
    const awardId = input.awardId.trim();
    const existing = await this.deps.store.findByAwardId(context.businessId, awardId);
    if (existing) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.CONTRACT_ALREADY_EXISTS, undefined, 409);
    }
    const award = requireContract(await this.deps.sourcing.findAwardById(context.businessId, awardId));
    const snapshot = await this.assertEligibleSupplier(context.businessId, award.profileId);
    const event = requireContract(
      await this.deps.sourcing.findEvent(context.businessId, award.eventId)
    );
    const prIds = await this.deps.sourcing.listEventPrIds(event.id);
    const quotes = await this.deps.sourcing.listQuotes(event.id, award.profileId);
    const winningQuote = quotes.find((row) => row.id === award.winningQuoteId) ?? quotes.at(-1);
    const allocated = await this.allocateContractNumber(context.businessId);
    const contractId = randomUUID();
    const versionId = randomUUID();
    const paymentTerms = winningQuote
      ? await this.deps.sourcing.listPaymentTerms(winningQuote.id)
      : [];
    await this.deps.store.insert({
      id: contractId,
      businessId: context.businessId,
      contractNumber: allocated.number,
      profileId: award.profileId,
      contractTypeCode: "SUPPLY_AGREEMENT",
      title: `${event.title} — Contract`,
      description: null,
      status: CONTRACT_STATUSES.DRAFT,
      sourceType: CONTRACT_SOURCE_TYPES.AWARD,
      purchaseRequestId: prIds[0] ?? null,
      sourcingEventId: event.id,
      awardId,
      winningQuoteId: winningQuote?.id ?? null,
      currencyCode: award.currencyCode,
      valueType: "FIXED",
      totalValue: award.awardedAmount,
      annualValue: winningQuote?.year1Amount ?? null,
      callOffCeiling: null,
      categoryCode: event.categoryCode,
      ownerUserId: actorId(context),
      ownerName: null,
      currentVersionId: versionId,
      startDate: null,
      endDate: null,
      executionDate: null,
      renewalOption: false,
      noticePeriodDays: null,
      callOffsPermitted: true,
      executionEvidenceDocumentId: null,
      submittedAt: null,
      submittedBy: null,
      approvedAt: null,
      approvedBy: null,
      rejectedAt: null,
      rejectedBy: null,
      rejectionReason: null,
      activatedAt: null,
      activatedBy: null,
      suspendedAt: null,
      suspendedBy: null,
      suspensionReason: null,
      terminatedAt: null,
      terminatedBy: null,
      terminationReason: null,
      closedAt: null,
      closedBy: null,
      closureReason: null,
      createdBy: actorId(context),
      updatedBy: actorId(context),
    });
    await this.persistVersion(context, contractId, versionId, 1, {
      status: CONTRACT_VERSION_STATUSES.CURRENT,
      changeReason: "Generated from award",
      valueType: "FIXED",
      totalValue: award.awardedAmount,
      annualValue: winningQuote?.year1Amount ?? null,
      callOffCeiling: null,
      startDate: null,
      endDate: null,
      renewalOption: false,
      noticePeriodDays: null,
      callOffsPermitted: true,
      paymentTerms: paymentTerms.map((term, index) => ({
        milestoneName: term.milestoneName,
        percentage: term.percentage,
        amount: term.amount,
        triggerEvent: term.triggerEvent,
        duePeriodDays: term.duePeriodDays,
        comments: term.comments,
        sequence: index + 1,
      })),
      periodValues: [],
    });
    await this.audit(context, contractId, PROCUREMENT_AUDIT_ACTIONS.CONTRACT_CREATED, {
      contractNumber: allocated.number,
      sourceType: CONTRACT_SOURCE_TYPES.AWARD,
      awardId,
      supplierName: snapshot.party.displayName,
    });
    return this.toView(context, contractId);
  }

  async generateFromPurchaseRequest(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    input: GenerateContractFromPurchaseRequestCommand
  ): Promise<ContractView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.CONTRACT_CREATE);
    const control = await this.deps.controls.getOrCreateControl(context.businessId);
    if (!control.directContractFromPrEnabled) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.DIRECT_CONTRACT_NOT_ALLOWED, undefined, 409);
    }
    const prId = input.purchaseRequestId.trim();
    const pr = requireContract(await this.deps.requests.findById(context.businessId, prId));
    const profileId = input.profileId?.trim() || pr.suggestedProfileId?.trim() || "";
    if (!profileId) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
        field: "profileId",
      });
    }
    await this.assertEligibleSupplier(context.businessId, profileId);
    const allocated = await this.allocateContractNumber(context.businessId);
    const contractId = randomUUID();
    const versionId = randomUUID();
    await this.deps.store.insert({
      id: contractId,
      businessId: context.businessId,
      contractNumber: allocated.number,
      profileId,
      contractTypeCode: "SERVICE_CONTRACT",
      title: `${pr.requestNumber} — Contract`,
      description: pr.justification,
      status: CONTRACT_STATUSES.DRAFT,
      sourceType: CONTRACT_SOURCE_TYPES.PURCHASE_REQUEST,
      purchaseRequestId: prId,
      sourcingEventId: null,
      awardId: null,
      winningQuoteId: null,
      currencyCode: pr.currencyCode,
      valueType: "FIXED",
      totalValue: pr.estimatedValue,
      annualValue: null,
      callOffCeiling: null,
      categoryCode: null,
      ownerUserId: actorId(context),
      ownerName: null,
      currentVersionId: versionId,
      startDate: null,
      endDate: null,
      executionDate: null,
      renewalOption: false,
      noticePeriodDays: null,
      callOffsPermitted: true,
      executionEvidenceDocumentId: null,
      submittedAt: null,
      submittedBy: null,
      approvedAt: null,
      approvedBy: null,
      rejectedAt: null,
      rejectedBy: null,
      rejectionReason: null,
      activatedAt: null,
      activatedBy: null,
      suspendedAt: null,
      suspendedBy: null,
      suspensionReason: null,
      terminatedAt: null,
      terminatedBy: null,
      terminationReason: null,
      closedAt: null,
      closedBy: null,
      closureReason: null,
      createdBy: actorId(context),
      updatedBy: actorId(context),
    });
    await this.persistVersion(context, contractId, versionId, 1, {
      status: CONTRACT_VERSION_STATUSES.CURRENT,
      changeReason: "Generated from purchase request",
      valueType: "FIXED",
      totalValue: pr.estimatedValue,
      annualValue: null,
      callOffCeiling: null,
      startDate: null,
      endDate: null,
      renewalOption: false,
      noticePeriodDays: null,
      callOffsPermitted: true,
      paymentTerms: [],
      periodValues: [],
    });
    await this.audit(context, contractId, PROCUREMENT_AUDIT_ACTIONS.CONTRACT_CREATED, {
      contractNumber: allocated.number,
      sourceType: CONTRACT_SOURCE_TYPES.PURCHASE_REQUEST,
      purchaseRequestId: prId,
    });
    return this.toView(context, contractId);
  }

  async submit(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    contractId: string
  ): Promise<ContractView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.CONTRACT_SUBMIT);
    const current = requireContract(await this.deps.store.findById(context.businessId, contractId));
    assertContractStatus(current.status, CONTRACT_STATUSES.DRAFT);
    const decision = await this.deps.workflow.evaluateOperationApproval({
      businessId: context.businessId,
      operationCode: WORKFLOW_OPERATIONS.CONTRACT_APPROVAL,
    });
    const nextStatus = decision.required
      ? CONTRACT_STATUSES.PENDING_APPROVAL
      : CONTRACT_STATUSES.APPROVED;
    await this.deps.store.update(context.businessId, contractId, {
      status: nextStatus,
      submittedAt: new Date(),
      submittedBy: actorId(context),
      approvedAt: decision.required ? null : new Date(),
      approvedBy: decision.required ? null : actorId(context),
      updatedBy: actorId(context),
    });
    await this.audit(context, contractId, PROCUREMENT_AUDIT_ACTIONS.CONTRACT_SUBMITTED, {
      status: nextStatus,
    });
    if (!decision.required) {
      await this.markPendingExecution(context, actor, contractId);
    }
    return this.toView(context, contractId);
  }

  async approve(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    contractId: string
  ): Promise<ContractView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.CONTRACT_APPROVE);
    const current = requireContract(await this.deps.store.findById(context.businessId, contractId));
    assertContractStatus(current.status, CONTRACT_STATUSES.PENDING_APPROVAL);
    try {
      this.deps.workflow.assertDistinctActors(
        current.submittedBy ?? current.createdBy ?? "",
        actorId(context) ?? "",
        "The person who submitted this contract cannot approve it."
      );
    } catch (error) {
      if (error instanceof WorkflowEngineError) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.SELF_APPROVAL, undefined, 409);
      }
      throw error;
    }
    await this.deps.store.update(context.businessId, contractId, {
      status: CONTRACT_STATUSES.APPROVED,
      approvedAt: new Date(),
      approvedBy: actorId(context),
      updatedBy: actorId(context),
    });
    await this.audit(context, contractId, PROCUREMENT_AUDIT_ACTIONS.CONTRACT_APPROVED, {});
    return this.markPendingExecution(context, actor, contractId);
  }

  async reject(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    contractId: string,
    input: ContractDecisionCommand
  ): Promise<ContractView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.CONTRACT_APPROVE);
    const current = requireContract(await this.deps.store.findById(context.businessId, contractId));
    assertContractStatus(current.status, CONTRACT_STATUSES.PENDING_APPROVAL);
    const reason = input.reason?.trim();
    if (!reason) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.DECISION_REASON_REQUIRED, undefined, 400);
    }
    await this.deps.store.update(context.businessId, contractId, {
      status: CONTRACT_STATUSES.REJECTED,
      rejectedAt: new Date(),
      rejectedBy: actorId(context),
      rejectionReason: reason,
      updatedBy: actorId(context),
    });
    await this.audit(context, contractId, PROCUREMENT_AUDIT_ACTIONS.CONTRACT_REJECTED, { reason });
    return this.toView(context, contractId);
  }

  async markPendingExecution(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    contractId: string
  ): Promise<ContractView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.CONTRACT_UPDATE);
    const current = requireContract(await this.deps.store.findById(context.businessId, contractId));
    assertContractStatus(current.status, CONTRACT_STATUSES.APPROVED);
    await this.deps.store.update(context.businessId, contractId, {
      status: CONTRACT_STATUSES.PENDING_EXECUTION,
      updatedBy: actorId(context),
    });
    await this.audit(context, contractId, PROCUREMENT_AUDIT_ACTIONS.CONTRACT_PENDING_EXECUTION, {});
    return this.toView(context, contractId);
  }

  async activate(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    contractId: string,
    input: ActivateContractCommand = {}
  ): Promise<ContractView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.CONTRACT_ACTIVATE);
    const current = requireContract(await this.deps.store.findById(context.businessId, contractId));
    assertContractStatus(current.status, CONTRACT_STATUSES.PENDING_EXECUTION);
    const control = await this.deps.controls.getOrCreateControl(context.businessId);
    const evidenceId =
      input.executionEvidenceDocumentId?.trim() || current.executionEvidenceDocumentId;
    if (control.requiresExecutionEvidence && !evidenceId) {
      throw new ProcurementError(
        PROCUREMENT_ERROR_CODES.CONTRACT_EXECUTION_EVIDENCE_REQUIRED,
        undefined,
        409
      );
    }
    const controlWarning = control.expiryWarningDays;
    const nextStatus = deriveExpiryStatus(
      CONTRACT_STATUSES.ACTIVE,
      current.endDate,
      controlWarning
    );
    await this.deps.store.update(context.businessId, contractId, {
      status: nextStatus,
      executionDate: input.executionDate ?? current.executionDate ?? new Date().toISOString().slice(0, 10),
      executionEvidenceDocumentId: evidenceId,
      activatedAt: new Date(),
      activatedBy: actorId(context),
      updatedBy: actorId(context),
    });
    await this.audit(context, contractId, PROCUREMENT_AUDIT_ACTIONS.CONTRACT_ACTIVATED, {});
    return this.toView(context, contractId);
  }

  async amend(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    contractId: string,
    input: AmendContractCommand
  ): Promise<ContractView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.CONTRACT_AMEND);
    const current = requireContract(await this.deps.store.findById(context.businessId, contractId));
    assertContractStatus(current.status, [
      CONTRACT_STATUSES.ACTIVE,
      CONTRACT_STATUSES.EXPIRING,
      CONTRACT_STATUSES.APPROVED,
      CONTRACT_STATUSES.PENDING_EXECUTION,
    ]);
    const currentVersion = requireContract(
      current.currentVersionId
        ? await this.deps.store.findVersionById(context.businessId, current.currentVersionId)
        : null
    );
    const commercial = validateContractCommercial({
      valueType: current.valueType,
      totalValue: input.totalValue ?? current.totalValue,
      annualValue: input.annualValue ?? current.annualValue,
      callOffCeiling: input.callOffCeiling ?? current.callOffCeiling,
      currencyCode: current.currencyCode,
      paymentTerms: input.paymentTerms,
      periodValues: input.periodValues,
    });
    const control = await this.deps.controls.getOrCreateControl(context.businessId);
    const material = isMaterialContractAmendment({
      threshold: control.materialAmendmentThreshold,
      previousTotal: current.totalValue,
      nextTotal: input.totalValue ?? current.totalValue,
      previousEndDate: current.endDate,
      nextEndDate: input.endDate ?? current.endDate,
      profileChanged: false,
    });
    await this.deps.store.updateVersion(context.businessId, currentVersion.id, {
      supersededAt: new Date(),
      status: CONTRACT_VERSION_STATUSES.SUPERSEDED,
    });
    const versions = await this.deps.store.listVersions(contractId);
    const versionId = randomUUID();
    const nextNumber = versions.length + 1;
    await this.persistVersion(context, contractId, versionId, nextNumber, {
      status: CONTRACT_VERSION_STATUSES.CURRENT,
      changeReason: input.changeReason.trim(),
      valueType: commercial.valueType,
      totalValue: input.totalValue ?? current.totalValue,
      annualValue: input.annualValue ?? current.annualValue,
      callOffCeiling: input.callOffCeiling ?? current.callOffCeiling,
      startDate: input.startDate ?? current.startDate,
      endDate: input.endDate ?? current.endDate,
      renewalOption: input.renewalOption ?? current.renewalOption,
      noticePeriodDays: input.noticePeriodDays ?? current.noticePeriodDays,
      callOffsPermitted: input.callOffsPermitted ?? current.callOffsPermitted,
      paymentTerms: commercial.paymentTerms,
      periodValues: commercial.periodValues,
    });
    const nextStatus = material ? CONTRACT_STATUSES.PENDING_APPROVAL : current.status;
    await this.deps.store.update(context.businessId, contractId, {
      title: input.title?.trim() || current.title,
      description: input.description?.trim() ?? current.description,
      totalValue: input.totalValue ?? current.totalValue,
      annualValue: input.annualValue ?? current.annualValue,
      callOffCeiling: input.callOffCeiling ?? current.callOffCeiling,
      startDate: input.startDate ?? current.startDate,
      endDate: input.endDate ?? current.endDate,
      renewalOption: input.renewalOption ?? current.renewalOption,
      noticePeriodDays: input.noticePeriodDays ?? current.noticePeriodDays,
      callOffsPermitted: input.callOffsPermitted ?? current.callOffsPermitted,
      currentVersionId: versionId,
      status: nextStatus,
      submittedAt: material ? new Date() : current.submittedAt,
      submittedBy: material ? actorId(context) : current.submittedBy,
      updatedBy: actorId(context),
    });
    await this.audit(context, contractId, PROCUREMENT_AUDIT_ACTIONS.CONTRACT_AMENDED, {
      previousVersionId: currentVersion.id,
      newVersionId: versionId,
      material: String(material),
    });
    return this.toView(context, contractId);
  }

  async renew(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    contractId: string,
    input: RenewContractCommand
  ): Promise<ContractView> {
    const renewed = await this.amend(context, actor, contractId, {
      ...input,
      changeReason: input.changeReason?.trim() || "Contract renewal",
    });
    await this.audit(context, contractId, PROCUREMENT_AUDIT_ACTIONS.CONTRACT_RENEWED, {});
    return renewed;
  }

  async suspend(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    contractId: string,
    input: ContractDecisionCommand
  ): Promise<ContractView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.CONTRACT_SUSPEND);
    const current = requireContract(await this.deps.store.findById(context.businessId, contractId));
    assertContractStatus(current.status, [CONTRACT_STATUSES.ACTIVE, CONTRACT_STATUSES.EXPIRING]);
    const reason = input.reason?.trim();
    if (!reason) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.DECISION_REASON_REQUIRED, undefined, 400);
    }
    await this.deps.store.update(context.businessId, contractId, {
      status: CONTRACT_STATUSES.SUSPENDED,
      suspendedAt: new Date(),
      suspendedBy: actorId(context),
      suspensionReason: reason,
      updatedBy: actorId(context),
    });
    await this.audit(context, contractId, PROCUREMENT_AUDIT_ACTIONS.CONTRACT_SUSPENDED, { reason });
    return this.toView(context, contractId);
  }

  async terminate(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    contractId: string,
    input: ContractDecisionCommand
  ): Promise<ContractView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.CONTRACT_SUSPEND);
    const current = requireContract(await this.deps.store.findById(context.businessId, contractId));
    const reason = input.reason?.trim();
    if (!reason) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.DECISION_REASON_REQUIRED, undefined, 400);
    }
    await this.deps.store.update(context.businessId, contractId, {
      status: CONTRACT_STATUSES.TERMINATED,
      terminatedAt: new Date(),
      terminatedBy: actorId(context),
      terminationReason: reason,
      updatedBy: actorId(context),
    });
    await this.audit(context, contractId, PROCUREMENT_AUDIT_ACTIONS.CONTRACT_TERMINATED, { reason });
    return this.toView(context, contractId);
  }

  async close(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    contractId: string,
    input: ContractDecisionCommand
  ): Promise<ContractView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.CONTRACT_CLOSE);
    const current = requireContract(await this.deps.store.findById(context.businessId, contractId));
    await this.deps.store.update(context.businessId, contractId, {
      status: CONTRACT_STATUSES.CLOSED,
      closedAt: new Date(),
      closedBy: actorId(context),
      closureReason: input.reason?.trim() || null,
      updatedBy: actorId(context),
    });
    await this.audit(context, contractId, PROCUREMENT_AUDIT_ACTIONS.CONTRACT_CLOSED, {});
    return this.toView(context, contractId);
  }

  async refreshExpiryStatus(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    contractId: string
  ): Promise<ContractView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.CONTRACT_READ);
    const current = requireContract(await this.deps.store.findById(context.businessId, contractId));
    const control = await this.deps.controls.getOrCreateControl(context.businessId);
    const nextStatus = deriveExpiryStatus(current.status, current.endDate, control.expiryWarningDays);
    if (nextStatus !== current.status) {
      await this.deps.store.update(context.businessId, contractId, {
        status: nextStatus,
        updatedBy: actorId(context),
      });
      if (nextStatus === CONTRACT_STATUSES.EXPIRED) {
        await this.audit(context, contractId, PROCUREMENT_AUDIT_ACTIONS.CONTRACT_EXPIRED, {});
      }
    }
    return this.toView(context, contractId);
  }

  async createCallOff(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    contractId: string,
    input: CreateContractCallOffCommand
  ): Promise<PurchaseOrderView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.CONTRACT_CALLOFF);
    if (!this.deps.purchaseOrders) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.PROVIDER_ERROR, undefined, 500);
    }
    const current = requireContract(await this.deps.store.findById(context.businessId, contractId));
    const snapshot = await this.deps.suggestedSupplier.resolve(context.businessId, current.profileId);
    const eligibility = snapshot
      ? evaluateSupplierEligibility({
          party: snapshot.party,
          profile: snapshot.profile,
          latestQualification: snapshot.latestQualification,
        })
      : { eligible: false };
    assertCallOffAllowed({
      status: current.status,
      callOffsPermitted: current.callOffsPermitted,
      endDate: current.endDate,
      supplierEligible: eligibility.eligible,
    });
    const committed = await this.committedAmounts(context.businessId, contractId);
    const amount =
      input.amount?.trim() ||
      (input.quantity && input.unitPrice
        ? (Number(input.quantity) * Number(input.unitPrice)).toFixed(2)
        : "");
    if (!amount) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
        field: "amount",
      });
    }
    const ceiling = resolveContractCeiling({
      valueType: current.valueType,
      totalValue: current.totalValue,
      callOffCeiling: current.callOffCeiling,
    });
    assertCallOffWithinCeiling(current.valueType, ceiling, committed, amount);
    const po = await this.deps.purchaseOrders.generateFromContract(context, actor, {
      contractId,
      description: input.description.trim(),
      quantity: input.quantity ?? "1",
      unitPrice: input.unitPrice ?? amount,
      amount,
      callOffReference: input.callOffReference ?? null,
    });
    await this.audit(context, contractId, PROCUREMENT_AUDIT_ACTIONS.CONTRACT_CALLOFF_CREATED, {
      contractVersionId: current.currentVersionId ?? "",
      poId: po.id,
      amount,
    });
    return po;
  }

  async getRemainingValue(context: CurrentBusinessContext, contractId: string) {
    const current = requireContract(await this.deps.store.findById(context.businessId, contractId));
    const committed = await this.committedAmounts(context.businessId, contractId);
    return computeRemainingContractValue({
      valueType: current.valueType,
      ceiling: resolveContractCeiling({
        valueType: current.valueType,
        totalValue: current.totalValue,
        callOffCeiling: current.callOffCeiling,
      }),
      committedAmounts: committed,
    });
  }

  private async committedAmounts(businessId: string, contractId: string) {
    const pos = await this.deps.poStore.listByContractId(businessId, contractId);
    return pos.filter((row) => isCommittedPoStatus(row.status)).map((row) => row.totalAmount);
  }

  private async persistVersion(
    context: CurrentBusinessContext,
    contractId: string,
    versionId: string,
    versionNumber: number,
    input: {
      status: string;
      changeReason: string;
      valueType: string;
      totalValue: string | null;
      annualValue: string | null;
      callOffCeiling: string | null;
      startDate: string | null;
      endDate: string | null;
      renewalOption: boolean;
      noticePeriodDays: number | null;
      callOffsPermitted: boolean;
      paymentTerms: Array<{
        milestoneName: string;
        percentage: string;
        amount?: string | null;
        triggerEvent?: string | null;
        duePeriodDays?: number | null;
        comments?: string | null;
        sequence?: number;
      }>;
      periodValues: Array<{ periodYear: number; amount: string; description?: string | null }>;
    }
  ) {
    await this.deps.store.insertVersion({
      id: versionId,
      businessId: context.businessId,
      contractId,
      versionNumber,
      status: input.status,
      changeReason: input.changeReason,
      effectiveDate: new Date().toISOString().slice(0, 10),
      valueType: input.valueType,
      totalValue: input.totalValue,
      annualValue: input.annualValue,
      callOffCeiling: input.callOffCeiling,
      startDate: input.startDate,
      endDate: input.endDate,
      renewalOption: input.renewalOption,
      noticePeriodDays: input.noticePeriodDays,
      callOffsPermitted: input.callOffsPermitted,
      supersededAt: null,
      createdBy: actorId(context),
    });
    await this.deps.store.insertPaymentTerms(
      context.businessId,
      versionId,
      input.paymentTerms.map((term, index) => ({
        sequence: term.sequence ?? index + 1,
        milestoneName: term.milestoneName,
        percentage: term.percentage,
        amount: term.amount ?? null,
        triggerEvent: term.triggerEvent ?? null,
        duePeriodDays: term.duePeriodDays ?? null,
        comments: term.comments ?? null,
      }))
    );
    await this.deps.store.insertPeriodValues(
      context.businessId,
      versionId,
      input.periodValues.map((row, index) => ({
        periodYear: row.periodYear,
        sequence: index + 1,
        amount: row.amount,
        description: row.description ?? null,
      }))
    );
  }

  private async toView(context: CurrentBusinessContext, contractId: string): Promise<ContractView> {
    const row = requireContract(await this.deps.store.findById(context.businessId, contractId));
    const snapshot = await this.deps.suggestedSupplier.resolve(context.businessId, row.profileId);
    const versions = await this.deps.store.listVersions(contractId);
    const currentVersion = row.currentVersionId
      ? await this.deps.store.findVersionById(context.businessId, row.currentVersionId)
      : null;
    const paymentTerms = currentVersion
      ? await this.deps.store.listPaymentTerms(currentVersion.id)
      : [];
    const periodValues = currentVersion
      ? await this.deps.store.listPeriodValues(currentVersion.id)
      : [];
    const remaining = await this.getRemainingValue(context, contractId);
    const relatedPos = await this.deps.poStore.listByContractId(context.businessId, contractId);
    const pr = row.purchaseRequestId
      ? await this.deps.requests.findById(context.businessId, row.purchaseRequestId)
      : null;
    const event = row.sourcingEventId
      ? await this.deps.sourcing.findEvent(context.businessId, row.sourcingEventId)
      : null;
    const mapVersion = async (version: NonNullable<typeof currentVersion>) => {
      const terms = await this.deps.store.listPaymentTerms(version.id);
      const periods = await this.deps.store.listPeriodValues(version.id);
      return {
        id: version.id,
        versionNumber: version.versionNumber,
        status: version.status,
        changeReason: version.changeReason,
        effectiveDate: version.effectiveDate,
        totalValue: version.totalValue,
        totalValueLabel: version.totalValue
          ? formatProcurementMoney(version.totalValue, row.currencyCode)
          : null,
        annualValue: version.annualValue,
        callOffCeiling: version.callOffCeiling,
        startDate: version.startDate,
        endDate: version.endDate,
        periodValues: periods.map((period) => ({
          periodYear: period.periodYear,
          amount: period.amount,
          amountLabel: formatProcurementMoney(period.amount, row.currencyCode),
          description: period.description,
        })),
        paymentTerms: terms.map((term) => ({
          sequence: term.sequence,
          milestoneName: term.milestoneName,
          percentage: term.percentage,
          amount: term.amount,
          triggerEvent: term.triggerEvent,
          duePeriodDays: term.duePeriodDays,
          comments: term.comments,
        })),
        createdAt: version.createdAt.toISOString(),
      };
    };
    const versionViews = [];
    for (const version of versions.sort((a, b) => b.versionNumber - a.versionNumber)) {
      versionViews.push(await mapVersion(version));
    }
    return {
      id: row.id,
      contractNumber: row.contractNumber,
      title: row.title,
      description: row.description,
      profileId: row.profileId,
      partyName: snapshot?.party.displayName ?? row.profileId,
      contractTypeCode: row.contractTypeCode,
      status: row.status,
      statusLabel: row.status,
      sourceType: row.sourceType,
      purchaseRequestId: row.purchaseRequestId,
      purchaseRequestNumber: pr?.requestNumber ?? null,
      sourcingEventId: row.sourcingEventId,
      sourcingEventNumber: event?.eventNumber ?? null,
      awardId: row.awardId,
      currencyCode: row.currencyCode,
      valueType: row.valueType,
      totalValue: row.totalValue,
      totalValueLabel: row.totalValue
        ? formatProcurementMoney(row.totalValue, row.currencyCode)
        : null,
      annualValue: row.annualValue,
      annualValueLabel: row.annualValue
        ? formatProcurementMoney(row.annualValue, row.currencyCode)
        : null,
      callOffCeiling: row.callOffCeiling,
      callOffCeilingLabel: row.callOffCeiling
        ? formatProcurementMoney(row.callOffCeiling, row.currencyCode)
        : null,
      committedAmount: remaining.committed,
      committedAmountLabel: formatProcurementMoney(remaining.committed, row.currencyCode),
      remainingAmount: remaining.remaining,
      remainingAmountLabel: remaining.remaining
        ? formatProcurementMoney(remaining.remaining, row.currencyCode)
        : null,
      categoryCode: row.categoryCode,
      ownerName: row.ownerName,
      startDate: row.startDate,
      endDate: row.endDate,
      executionDate: row.executionDate,
      renewalOption: row.renewalOption,
      noticePeriodDays: row.noticePeriodDays,
      callOffsPermitted: row.callOffsPermitted,
      executionEvidenceDocumentId: row.executionEvidenceDocumentId,
      currentVersion: currentVersion ? await mapVersion(currentVersion) : null,
      versions: versionViews,
      paymentTerms: paymentTerms.map((term) => ({
        sequence: term.sequence,
        milestoneName: term.milestoneName,
        percentage: term.percentage,
        amount: term.amount,
        triggerEvent: term.triggerEvent,
        duePeriodDays: term.duePeriodDays,
        comments: term.comments,
      })),
      periodValues: periodValues.map((period) => ({
        periodYear: period.periodYear,
        amount: period.amount,
        amountLabel: formatProcurementMoney(period.amount, row.currencyCode),
        description: period.description,
      })),
      relatedPurchaseOrders: relatedPos.map((po) => ({
        poId: po.id,
        poNumber: po.poNumber,
        status: po.status,
        statusLabel: po.status,
        totalAmount: po.totalAmount,
        totalAmountLabel: formatProcurementMoney(po.totalAmount, po.currencyCode),
        contractVersionId: po.contractVersionId,
        createdAt: po.createdAt.toISOString(),
      })),
      canSubmit: row.status === CONTRACT_STATUSES.DRAFT,
      canApprove: row.status === CONTRACT_STATUSES.PENDING_APPROVAL,
      canReject: row.status === CONTRACT_STATUSES.PENDING_APPROVAL,
      canMarkPendingExecution: row.status === CONTRACT_STATUSES.APPROVED,
      canActivate: row.status === CONTRACT_STATUSES.PENDING_EXECUTION,
      canAmend: ([CONTRACT_STATUSES.ACTIVE, CONTRACT_STATUSES.EXPIRING] as string[]).includes(
        row.status
      ),
      canRenew: (
        [CONTRACT_STATUSES.ACTIVE, CONTRACT_STATUSES.EXPIRING, CONTRACT_STATUSES.EXPIRED] as string[]
      ).includes(row.status),
      canSuspend: ([CONTRACT_STATUSES.ACTIVE, CONTRACT_STATUSES.EXPIRING] as string[]).includes(
        row.status
      ),
      canTerminate: (
        [
          CONTRACT_STATUSES.ACTIVE,
          CONTRACT_STATUSES.EXPIRING,
          CONTRACT_STATUSES.SUSPENDED,
        ] as string[]
      ).includes(row.status),
      canClose: (
        [CONTRACT_STATUSES.ACTIVE, CONTRACT_STATUSES.EXPIRED, CONTRACT_STATUSES.TERMINATED] as string[]
      ).includes(row.status),
      canCreateCallOff: ([CONTRACT_STATUSES.ACTIVE, CONTRACT_STATUSES.EXPIRING] as string[]).includes(
        row.status
      ),
    };
  }

  private async assertEligibleSupplier(businessId: string, profileId: string) {
    const snapshot = await this.deps.suggestedSupplier.resolve(businessId, profileId);
    if (!snapshot) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.PROFILE_NOT_FOUND, undefined, 404);
    }
    const eligibility = evaluateSupplierEligibility({
      party: snapshot.party,
      profile: snapshot.profile,
      latestQualification: snapshot.latestQualification,
    });
    if (!eligibility.eligible) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.SUPPLIER_BLACKLISTED, undefined, 409);
    }
    return snapshot;
  }

  private async allocateContractNumber(businessId: string) {
    try {
      return await this.deps.numbering.allocate({
        businessId,
        documentType: DOCUMENT_NUMBERING_DOCUMENT_TYPES.CONTRACT,
      });
    } catch (error) {
      if (error instanceof DocumentNumberingError) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.NUMBERING_POLICY_MISSING, undefined, 409);
      }
      throw error;
    }
  }

  private async audit(
    context: CurrentBusinessContext,
    entityId: string,
    action: string,
    references?: Record<string, string>
  ) {
    await this.deps.audit.record({
      businessId: context.businessId,
      actorUserId: actorId(context),
      entityId,
      action,
      outcome: "SUCCESS",
      references,
    });
  }
}

export function createDefaultContractDependencies(): ContractServiceDependencies {
  const controls = createContractControlRepository();
  const store = createContractRepository();
  const poStore = createPurchaseOrderRepository();
  const purchaseOrders = createPurchaseOrderService({
    ...createDefaultPurchaseOrderDependencies(),
    store: poStore,
    contracts: store,
  });
  return {
    store,
    poStore,
    sourcing: createSourcingRepository(),
    requests: createPurchaseRequestRepository(),
    numbering: new ConfigurableDocumentNumberingService(createDocumentNumberingPolicyRepository()),
    audit: createProcurementAuditAdapter(),
    workflow: createProcurementContractWorkflowAdapter(controls),
    controls,
    suggestedSupplier: createSuggestedSupplierAdapter(),
    notifications: createInProcessNotificationAdapter(),
    purchaseOrders,
  };
}

export function createContractService(
  overrides: Partial<ContractServiceDependencies> = {}
): ContractService {
  const defaults = createDefaultContractDependencies();
  return new ContractService({ ...defaults, ...overrides });
}
