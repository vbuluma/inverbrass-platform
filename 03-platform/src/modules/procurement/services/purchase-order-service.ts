/**
 * Purpose:
 * Orchestrate BP-009 IP-06 purchase orders: generate, approve, issue, accept, amend, close.
 * Does not post inventory, receipts, invoices, or GL entries.
 *
 * Implementation Package:
 * BP-009 / IP-06 – Purchase Order Management
 */

import { randomBytes, randomUUID } from "node:crypto";

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
  PO_SOURCE_TYPES,
  PO_STATUSES,
  PO_SUPPLIER_ACTIONS,
  PO_VERSION_STATUSES,
  PROCUREMENT_AUDIT_ACTIONS,
  PROCUREMENT_PERMISSIONS,
  PERFORMANCE_MEASURE_CODES,
  PERFORMANCE_SOURCE_TYPES,
} from "@/modules/procurement/constants";
import { PROCUREMENT_ERROR_CODES, ProcurementError } from "@/modules/procurement/errors";
import type {
  ProcurementAuditPort,
  ProcurementPerformanceBridgePort,
  PurchaseOrderControlPort,
  PurchaseOrderStorePort,
  ContractStorePort,
  PurchaseRequestRepositoryPort,
  SourcingStorePort,
  SuggestedSupplierPort,
} from "@/modules/procurement/ports";
import { createProcurementPoWorkflowAdapter } from "@/modules/procurement/adapters/procurement-po-workflow-adapter";
import { createSuggestedSupplierAdapter } from "@/modules/procurement/adapters/suggested-supplier-adapter";
import {
  createPurchaseOrderControlRepository,
  createPurchaseOrderRepository,
} from "@/modules/procurement/repositories/purchase-order-repository";
import { createContractRepository } from "@/modules/procurement/repositories/contract-repository";
import { createPurchaseRequestRepository } from "@/modules/procurement/repositories/purchase-request-repository";
import { createSourcingRepository } from "@/modules/procurement/repositories/sourcing-repository";
import { createProcurementAuditAdapter } from "@/modules/procurement/services/procurement-audit-helper";
import { createProcurementPerformanceBridge } from "@/modules/procurement/services/performance-service";
import { assertPermission } from "@/modules/procurement/services/procurement-rules";
import { evaluateSupplierEligibility } from "@/modules/procurement/services/supplier-eligibility-service";
import {
  assertApprovedPurchaseRequest,
  assertCanAmendPo,
  assertCanApprovePo,
  assertCanCancelPo,
  assertCanClosePo,
  assertCanIssuePo,
  assertCanRecordFulfilment,
  assertCanSubmitPo,
  assertPoRead,
  assertSkipRfxAllowed,
  assertSupplierRespondable,
  isMaterialAmendment,
  poStatusLabel,
  sumPoLineTotals,
  validatePoLines,
  versionStatusForIssue,
  versionStatusForSupersede,
} from "@/modules/procurement/services/purchase-order-rules";
import type {
  AmendPurchaseOrderCommand,
  GeneratePoFromAwardCommand,
  GeneratePoFromContractCommand,
  GeneratePoFromPurchaseRequestCommand,
  IssuePurchaseOrderCommand,
  PoDecisionCommand,
  PoLineView,
  PoPaymentTermView,
  PoSupplierActionCommand,
  PoSupplierPortalView,
  PoVersionView,
  ProcurementActor,
  PurchaseOrderListFilter,
  PurchaseOrderListView,
  PurchaseOrderView,
  RecordPoFulfilmentCommand,
} from "@/modules/procurement/types";

export type PurchaseOrderServiceDependencies = {
  store: PurchaseOrderStorePort;
  sourcing: SourcingStorePort;
  requests: PurchaseRequestRepositoryPort;
  contracts?: ContractStorePort;
  numbering: DocumentNumberingPort;
  audit: ProcurementAuditPort;
  workflow: WorkflowEnginePort;
  controls: PurchaseOrderControlPort;
  suggestedSupplier: SuggestedSupplierPort;
  notifications: NotificationEnginePort;
  performance?: ProcurementPerformanceBridgePort;
};

function actorId(context: CurrentBusinessContext) {
  return context.platformUserId || null;
}

const AMENDABLE_STATUSES = new Set<string>([
  PO_STATUSES.ISSUED,
  PO_STATUSES.ACCEPTED,
  PO_STATUSES.CHANGE_REQUESTED,
  PO_STATUSES.REJECTED,
]);

const CANCELLABLE_STATUSES = new Set<string>([
  PO_STATUSES.DRAFT,
  PO_STATUSES.PENDING_APPROVAL,
  PO_STATUSES.APPROVED,
  PO_STATUSES.ISSUED,
  PO_STATUSES.ACCEPTED,
  PO_STATUSES.CHANGE_REQUESTED,
  PO_STATUSES.REJECTED,
]);

const CLOSABLE_STATUSES = new Set<string>([
  PO_STATUSES.ACCEPTED,
  PO_STATUSES.PARTIALLY_FULFILLED,
  PO_STATUSES.FULFILLED,
]);

function mapValidatedLines(
  lines: ReturnType<typeof validatePoLines>
): Array<Omit<import("@/modules/procurement/types").PoLineRecord, "id" | "businessId" | "versionId">> {
  return lines.map((line) => ({
    sequence: line.sequence,
    description: line.description,
    quantity: line.quantity,
    uom: line.uom,
    unitPrice: line.unitPrice,
    taxRate: line.taxRate,
    lineSubtotal: line.lineSubtotal,
    lineTax: line.lineTax,
    lineTotal: line.lineTotal,
    awardLineId: line.awardLineId ?? null,
    quoteLineId: line.quoteLineId ?? null,
    purchaseRequestLineId: line.purchaseRequestLineId ?? null,
    catalogueItemId: line.catalogueItemId ?? null,
    promisedDeliveryDate: line.promisedDeliveryDate ?? null,
    deliveryLocation: line.deliveryLocation ?? null,
    comments: line.comments ?? null,
    lineType: line.lineType ?? "INVENTORY",
  }));
}

function requirePo<T>(row: T | null): T {
  if (!row) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.PO_NOT_FOUND, undefined, 404);
  }
  return row;
}

function mapLineView(line: {
  id: string;
  sequence: number;
  description: string;
  quantity: string;
  uom: string;
  unitPrice: string;
  taxRate: string;
  lineSubtotal: string;
  lineTax: string;
  lineTotal: string;
  promisedDeliveryDate: string | null;
  deliveryLocation: string | null;
  comments: string | null;
  lineType: string;
}): PoLineView {
  return {
    id: line.id,
    sequence: line.sequence,
    description: line.description,
    quantity: line.quantity,
    uom: line.uom,
    unitPrice: line.unitPrice,
    taxRate: line.taxRate,
    lineSubtotal: line.lineSubtotal,
    lineTax: line.lineTax,
    lineTotal: line.lineTotal,
    promisedDeliveryDate: line.promisedDeliveryDate,
    deliveryLocation: line.deliveryLocation,
    comments: line.comments,
    lineType: line.lineType,
    orderedQuantity: line.quantity,
    receivedQuantity: "0",
    outstandingQuantity: line.quantity,
    fulfilmentStatus: "NOT_RECEIVED",
    fulfilmentStatusLabel: "Not received",
    lastReceiptDate: null,
    isOverdue: false,
  };
}

function mapPaymentTermView(term: {
  sequence: number;
  milestoneName: string;
  percentage: string;
  amount: string | null;
  triggerEvent: string | null;
  duePeriodDays: number | null;
  comments: string | null;
}): PoPaymentTermView {
  return {
    sequence: term.sequence,
    milestoneName: term.milestoneName,
    percentage: term.percentage,
    amount: term.amount,
    triggerEvent: term.triggerEvent,
    duePeriodDays: term.duePeriodDays,
    comments: term.comments,
  };
}

export class PurchaseOrderService {
  constructor(private readonly deps: PurchaseOrderServiceDependencies) {}

  async list(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    filter: PurchaseOrderListFilter = {}
  ): Promise<PurchaseOrderListView[]> {
    assertPoRead(actor);
    const rows = await this.deps.store.listByBusiness(context.businessId);
    const views: PurchaseOrderListView[] = [];
    for (const row of rows) {
      const supplier = await this.deps.suggestedSupplier.resolve(context.businessId, row.profileId);
      views.push({
        id: row.id,
        poNumber: row.poNumber,
        supplierName: supplier?.party.displayName ?? "Supplier",
        status: row.status,
        statusLabel: poStatusLabel(row.status),
        sourceType: row.sourceType,
        totalAmount: row.totalAmount,
        currencyCode: row.currencyCode,
        issuedAt: row.issuedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      });
    }
    const query = filter.query?.trim().toLowerCase() ?? "";
    return views.filter((row) => {
      if (query) {
        const haystack = `${row.poNumber} ${row.supplierName}`.toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }
      switch (filter.status) {
        case "draft":
          return row.status === PO_STATUSES.DRAFT;
        case "pending-approval":
          return row.status === PO_STATUSES.PENDING_APPROVAL;
        case "issued":
          return row.status === PO_STATUSES.ISSUED;
        case "accepted":
          return row.status === PO_STATUSES.ACCEPTED;
        case "closed":
          return row.status === PO_STATUSES.CLOSED;
        case "cancelled":
          return row.status === PO_STATUSES.CANCELLED;
        default:
          return true;
      }
    });
  }

  async get(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    poId: string
  ): Promise<PurchaseOrderView> {
    assertPoRead(actor);
    return this.toView(context, poId);
  }

  async generateFromAward(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    input: GeneratePoFromAwardCommand
  ): Promise<PurchaseOrderView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.PO_CREATE);
    const awardId = input.awardId.trim();
    const award = requirePo(await this.deps.sourcing.findAwardById(context.businessId, awardId));
    const existing = await this.deps.store.findByAwardId(context.businessId, awardId);
    if (existing) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.PO_ALREADY_EXISTS, undefined, 409);
    }
    const awardLines = await this.deps.sourcing.listAwardLines(awardId);
    if (awardLines.length === 0) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.AWARD_LINES_REQUIRED, undefined, 409);
    }
    const snapshot = await this.assertEligibleSupplier(context.businessId, award.profileId);
    const event = requirePo(
      await this.deps.sourcing.findEvent(context.businessId, award.eventId)
    );
    if (event.status !== "AWARDED") {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.AWARD_NOT_APPROVED, undefined, 409);
    }
    const prIds = await this.deps.sourcing.listEventPrIds(event.id);
    const winningQuoteId = award.winningQuoteId ?? awardLines[0]?.winningQuoteId;
    if (!winningQuoteId) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.AWARD_INVALID, undefined, 409);
    }
    const quotes = await this.deps.sourcing.listQuotes(event.id, award.profileId);
    const winningQuote = quotes.find((row) => row.id === winningQuoteId);
    const paymentTerms = await this.deps.sourcing.listPaymentTerms(winningQuoteId);
    const lineDrafts = awardLines.map((line) => ({
      description: line.description,
      quantity: line.quantity,
      uom: line.uom,
      unitPrice: line.unitPrice,
      taxRate: line.taxRate,
      awardLineId: line.id,
      quoteLineId: line.winningQuoteLineId,
    }));
    const validatedLines = validatePoLines(lineDrafts);
    const totals = sumPoLineTotals(validatedLines);
    const allocated = await this.allocatePoNumber(context.businessId);
    const poId = randomUUID();
    const versionId = randomUUID();
    await this.deps.store.insert({
      id: poId,
      businessId: context.businessId,
      poNumber: allocated.number,
      profileId: award.profileId,
      sourceType: PO_SOURCE_TYPES.AWARD,
      purchaseRequestId: prIds[0] ?? null,
      sourcingEventId: event.id,
      awardId,
      contractId: null,
      contractVersionId: null,
      callOffReference: null,
      winningQuoteId,
      currencyCode: award.currencyCode,
      status: PO_STATUSES.DRAFT,
      currentVersionId: versionId,
      acceptedVersionId: null,
      subtotalAmount: totals.subtotalAmount,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      year1Amount: winningQuote?.year1Amount ?? null,
      tcvAmount: winningQuote?.tcvAmount ?? null,
      tcoAmount: winningQuote?.tcoAmount ?? null,
      deliveryLocation: null,
      warrantyNotes: winningQuote?.warrantyNotes ?? null,
      termsAndConditions: null,
      submittedAt: null,
      submittedBy: null,
      approvedAt: null,
      approvedBy: null,
      issuedAt: null,
      issuedBy: null,
      acceptedAt: null,
      cancelledAt: null,
      cancelledBy: null,
      cancellationReason: null,
      closedAt: null,
      closedBy: null,
      closureReason: null,
      issueIdempotencyKey: null,
      createdBy: actorId(context),
      updatedBy: actorId(context),
    });
    await this.deps.store.insertVersion({
      id: versionId,
      businessId: context.businessId,
      purchaseOrderId: poId,
      versionNumber: 1,
      status: PO_VERSION_STATUSES.DRAFT,
      subtotalAmount: totals.subtotalAmount,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      year1Amount: winningQuote?.year1Amount ?? null,
      tcvAmount: winningQuote?.tcvAmount ?? null,
      tcoAmount: winningQuote?.tcoAmount ?? null,
      promisedDeliveryDate: null,
      warrantyNotes: winningQuote?.warrantyNotes ?? null,
      termsAndConditions: null,
      issuedAt: null,
      issuedBy: null,
      supersededAt: null,
      createdBy: actorId(context),
    });
    await this.deps.store.insertLines(context.businessId, versionId, mapValidatedLines(validatedLines));
    await this.deps.store.insertPaymentTerms(
      context.businessId,
      versionId,
      paymentTerms.map((term, index) => ({
        sequence: index + 1,
        milestoneName: term.milestoneName,
        percentage: term.percentage,
        amount: term.amount,
        triggerEvent: term.triggerEvent,
        duePeriodDays: term.duePeriodDays,
        comments: term.comments,
      }))
    );
    await this.audit(context, poId, PROCUREMENT_AUDIT_ACTIONS.PO_CREATED, {
      poNumber: allocated.number,
      sourceType: PO_SOURCE_TYPES.AWARD,
      awardId,
      winningQuoteId,
      supplierName: snapshot.party.displayName,
    });
    return this.toView(context, poId);
  }

  async generateFromPurchaseRequest(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    input: GeneratePoFromPurchaseRequestCommand
  ): Promise<PurchaseOrderView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.PO_CREATE);
    const prId = input.purchaseRequestId.trim();
    const pr = requirePo(await this.deps.requests.findById(context.businessId, prId));
    assertApprovedPurchaseRequest(pr.status, pr.originType);
    const control = await this.deps.controls.getOrCreateControl(context.businessId);
    assertSkipRfxAllowed(control.skipRfxEnabled, control.skipRfxMaxAmount, pr.estimatedValue);
    const profileId = input.profileId?.trim() || pr.suggestedProfileId?.trim() || "";
    if (!profileId) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
        field: "profileId",
      });
    }
    const snapshot = await this.assertEligibleSupplier(context.businessId, profileId);
    const prLines = await this.deps.requests.listLines(context.businessId, prId);
    if (prLines.length === 0) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.EMPTY_REQUEST, undefined, 400);
    }
    const lineDrafts = prLines.map((line) => ({
      description: line.description,
      quantity: line.quantity,
      uom: line.uom,
      unitPrice: line.estimatedValue,
      taxRate: "0",
      purchaseRequestLineId: line.id,
      catalogueItemId: line.catalogueItemId,
    }));
    const validatedLines = validatePoLines(lineDrafts);
    const totals = sumPoLineTotals(validatedLines);
    const allocated = await this.allocatePoNumber(context.businessId);
    const poId = randomUUID();
    const versionId = randomUUID();
    await this.deps.store.insert({
      id: poId,
      businessId: context.businessId,
      poNumber: allocated.number,
      profileId,
      sourceType: PO_SOURCE_TYPES.PURCHASE_REQUEST,
      purchaseRequestId: prId,
      sourcingEventId: null,
      awardId: null,
      contractId: null,
      contractVersionId: null,
      callOffReference: null,
      winningQuoteId: null,
      currencyCode: pr.currencyCode,
      status: PO_STATUSES.DRAFT,
      currentVersionId: versionId,
      acceptedVersionId: null,
      subtotalAmount: totals.subtotalAmount,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      year1Amount: null,
      tcvAmount: null,
      tcoAmount: null,
      deliveryLocation: pr.deliveryLocation,
      warrantyNotes: null,
      termsAndConditions: null,
      submittedAt: null,
      submittedBy: null,
      approvedAt: null,
      approvedBy: null,
      issuedAt: null,
      issuedBy: null,
      acceptedAt: null,
      cancelledAt: null,
      cancelledBy: null,
      cancellationReason: null,
      closedAt: null,
      closedBy: null,
      closureReason: null,
      issueIdempotencyKey: null,
      createdBy: actorId(context),
      updatedBy: actorId(context),
    });
    await this.deps.store.insertVersion({
      id: versionId,
      businessId: context.businessId,
      purchaseOrderId: poId,
      versionNumber: 1,
      status: PO_VERSION_STATUSES.DRAFT,
      subtotalAmount: totals.subtotalAmount,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      year1Amount: null,
      tcvAmount: null,
      tcoAmount: null,
      promisedDeliveryDate: pr.requiredDate,
      warrantyNotes: null,
      termsAndConditions: null,
      issuedAt: null,
      issuedBy: null,
      supersededAt: null,
      createdBy: actorId(context),
    });
    await this.deps.store.insertLines(context.businessId, versionId, mapValidatedLines(validatedLines));
    await this.audit(context, poId, PROCUREMENT_AUDIT_ACTIONS.PO_CREATED, {
      poNumber: allocated.number,
      sourceType: PO_SOURCE_TYPES.PURCHASE_REQUEST,
      purchaseRequestId: prId,
      supplierName: snapshot.party.displayName,
    });
    return this.toView(context, poId);
  }

  async generateFromContract(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    input: GeneratePoFromContractCommand
  ): Promise<PurchaseOrderView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.PO_CREATE);
    const contractStore = this.deps.contracts;
    if (!contractStore) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.PROVIDER_ERROR, undefined, 500);
    }
    const contractId = input.contractId.trim();
    const contract = requirePo(await contractStore.findById(context.businessId, contractId));
    const version = requirePo(
      contract.currentVersionId
        ? await contractStore.findVersionById(context.businessId, contract.currentVersionId)
        : null
    );
    await this.assertEligibleSupplier(context.businessId, contract.profileId);
    const paymentTerms = await contractStore.listPaymentTerms(version.id);
    const quantity = input.quantity?.trim() || "1";
    const unitPrice = input.unitPrice?.trim() || input.amount?.trim() || "0";
    const amount = input.amount?.trim() || (Number(quantity) * Number(unitPrice)).toFixed(2);
    const lineDrafts = [
      {
        description: input.description.trim(),
        quantity,
        uom: "EA",
        unitPrice,
        taxRate: "0",
      },
    ];
    const validatedLines = validatePoLines(lineDrafts);
    const totals = sumPoLineTotals(validatedLines);
    const allocated = await this.allocatePoNumber(context.businessId);
    const poId = randomUUID();
    const versionId = randomUUID();
    await this.deps.store.insert({
      id: poId,
      businessId: context.businessId,
      poNumber: allocated.number,
      profileId: contract.profileId,
      sourceType: PO_SOURCE_TYPES.CONTRACT_CALLOFF,
      purchaseRequestId: contract.purchaseRequestId,
      sourcingEventId: contract.sourcingEventId,
      awardId: contract.awardId,
      contractId: contract.id,
      contractVersionId: version.id,
      callOffReference: input.callOffReference?.trim() || null,
      winningQuoteId: contract.winningQuoteId,
      currencyCode: contract.currencyCode,
      status: PO_STATUSES.DRAFT,
      currentVersionId: versionId,
      acceptedVersionId: null,
      subtotalAmount: totals.subtotalAmount,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      year1Amount: contract.annualValue,
      tcvAmount: contract.totalValue,
      tcoAmount: null,
      deliveryLocation: null,
      warrantyNotes: null,
      termsAndConditions: null,
      submittedAt: null,
      submittedBy: null,
      approvedAt: null,
      approvedBy: null,
      issuedAt: null,
      issuedBy: null,
      acceptedAt: null,
      cancelledAt: null,
      cancelledBy: null,
      cancellationReason: null,
      closedAt: null,
      closedBy: null,
      closureReason: null,
      issueIdempotencyKey: null,
      createdBy: actorId(context),
      updatedBy: actorId(context),
    });
    await this.deps.store.insertVersion({
      id: versionId,
      businessId: context.businessId,
      purchaseOrderId: poId,
      versionNumber: 1,
      status: PO_VERSION_STATUSES.DRAFT,
      subtotalAmount: totals.subtotalAmount,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      year1Amount: contract.annualValue,
      tcvAmount: contract.totalValue,
      tcoAmount: null,
      promisedDeliveryDate: null,
      warrantyNotes: null,
      termsAndConditions: null,
      issuedAt: null,
      issuedBy: null,
      supersededAt: null,
      createdBy: actorId(context),
    });
    await this.deps.store.insertLines(context.businessId, versionId, mapValidatedLines(validatedLines));
    await this.deps.store.insertPaymentTerms(
      context.businessId,
      versionId,
      paymentTerms.map((term, index) => ({
        sequence: index + 1,
        milestoneName: term.milestoneName,
        percentage: term.percentage,
        amount: term.amount,
        triggerEvent: term.triggerEvent,
        duePeriodDays: term.duePeriodDays,
        comments: term.comments,
      }))
    );
    await this.audit(context, poId, PROCUREMENT_AUDIT_ACTIONS.PO_CREATED, {
      poNumber: allocated.number,
      sourceType: PO_SOURCE_TYPES.CONTRACT_CALLOFF,
      contractId: contract.id,
      contractVersionId: version.id,
      amount,
    });
    return this.toView(context, poId);
  }

  async submit(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    poId: string
  ): Promise<PurchaseOrderView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.PO_SUBMIT);
    const current = requirePo(await this.deps.store.findById(context.businessId, poId));
    assertCanSubmitPo(current.status);
    const decision = await this.deps.workflow.evaluateOperationApproval({
      businessId: context.businessId,
      operationCode: WORKFLOW_OPERATIONS.PURCHASE_ORDER_APPROVAL,
    });
    const nextStatus = decision.required ? PO_STATUSES.PENDING_APPROVAL : PO_STATUSES.APPROVED;
    await this.deps.store.update(context.businessId, poId, {
      status: nextStatus,
      submittedAt: new Date(),
      submittedBy: actor.userId,
      approvedAt: decision.required ? null : new Date(),
      approvedBy: decision.required ? null : actor.userId,
      updatedBy: actorId(context),
    });
    await this.audit(context, poId, PROCUREMENT_AUDIT_ACTIONS.PO_SUBMITTED, {
      poNumber: current.poNumber,
      nextStatus,
      approvalRequired: String(decision.required),
    });
    if (!decision.required) {
      await this.audit(context, poId, PROCUREMENT_AUDIT_ACTIONS.PO_APPROVED, {
        poNumber: current.poNumber,
        autoApproved: "true",
      });
    }
    return this.toView(context, poId);
  }

  async approve(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    poId: string
  ): Promise<PurchaseOrderView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.PO_APPROVE);
    const current = requirePo(await this.deps.store.findById(context.businessId, poId));
    if (current.status === PO_STATUSES.APPROVED) {
      return this.toView(context, poId);
    }
    assertCanApprovePo(current.status);
    try {
      this.deps.workflow.assertDistinctActors(
        current.submittedBy ?? current.createdBy ?? "",
        actor.userId,
        "The person who submitted this order cannot approve it."
      );
    } catch (error) {
      if (error instanceof WorkflowEngineError) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.SELF_APPROVAL, undefined, 409);
      }
      throw error;
    }
    await this.deps.store.update(context.businessId, poId, {
      status: PO_STATUSES.APPROVED,
      approvedAt: new Date(),
      approvedBy: actor.userId,
      updatedBy: actorId(context),
    });
    await this.audit(context, poId, PROCUREMENT_AUDIT_ACTIONS.PO_APPROVED, {
      poNumber: current.poNumber,
    });
    return this.toView(context, poId);
  }

  async rejectApproval(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    poId: string,
    input: PoDecisionCommand
  ): Promise<PurchaseOrderView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.PO_APPROVE);
    const reason = input.reason?.trim() ?? "";
    if (!reason) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.PO_REASON_REQUIRED, undefined, 400, {
        field: "reason",
      });
    }
    const current = requirePo(await this.deps.store.findById(context.businessId, poId));
    assertCanApprovePo(current.status);
    await this.deps.store.update(context.businessId, poId, {
      status: PO_STATUSES.DRAFT,
      submittedAt: null,
      submittedBy: null,
      approvedAt: null,
      approvedBy: null,
      updatedBy: actorId(context),
    });
    await this.audit(context, poId, PROCUREMENT_AUDIT_ACTIONS.PO_APPROVAL_REJECTED, {
      poNumber: current.poNumber,
      reason,
    });
    return this.toView(context, poId);
  }

  async issue(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    poId: string,
    input: IssuePurchaseOrderCommand = {}
  ): Promise<PurchaseOrderView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.PO_ISSUE);
    const idempotencyKey = input.idempotencyKey?.trim() || null;
    if (idempotencyKey) {
      const existing = await this.deps.store.findByIssueIdempotencyKey(
        context.businessId,
        idempotencyKey
      );
      if (existing) {
        return this.toView(context, existing.id);
      }
    }
    const current = requirePo(await this.deps.store.findById(context.businessId, poId));
    if (current.status === PO_STATUSES.ISSUED && current.issueIdempotencyKey === idempotencyKey) {
      return this.toView(context, poId);
    }
    assertCanIssuePo(current.status);
    const versionId = current.currentVersionId;
    if (!versionId) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.PO_VERSION_INVALID, undefined, 409);
    }
    const now = new Date();
    const accessToken = randomBytes(32).toString("hex");
    await this.deps.store.updateVersion(context.businessId, versionId, {
      status: versionStatusForIssue(),
      issuedAt: now,
      issuedBy: actor.userId,
    });
    await this.deps.store.insertSupplierToken({
      id: randomUUID(),
      businessId: context.businessId,
      purchaseOrderId: poId,
      versionId,
      profileId: current.profileId,
      accessToken,
      tokenExpiresAt: null,
      revokedAt: null,
    });
    await this.deps.store.update(context.businessId, poId, {
      status: PO_STATUSES.ISSUED,
      issuedAt: now,
      issuedBy: actor.userId,
      issueIdempotencyKey: idempotencyKey,
      updatedBy: actorId(context),
    });
    await this.audit(context, poId, PROCUREMENT_AUDIT_ACTIONS.PO_ISSUED, {
      poNumber: current.poNumber,
      versionId,
    });
    if (this.deps.performance) {
      await this.deps.performance.recordEvent({
        businessId: context.businessId,
        profileId: current.profileId,
        measureCode: PERFORMANCE_MEASURE_CODES.PO_ISSUED,
        sourceType: PERFORMANCE_SOURCE_TYPES.PURCHASE_ORDER,
        sourceId: poId,
        sourceKey: `po:${poId}:issued`,
        actorUserId: actorId(context),
      });
    }
    const supplier = await this.deps.suggestedSupplier.resolve(context.businessId, current.profileId);
    try {
      await this.deps.notifications.requestDocumentDelivery({
        businessId: context.businessId,
        documentType: "PURCHASE_ORDER",
        referenceId: poId,
        channel: "EMAIL",
        recipientHint: supplier?.party.displayName ?? null,
        payload: { poNumber: current.poNumber, accessToken },
      });
    } catch {
      // PO remains issued even when notification delivery fails.
    }
    return this.toView(context, poId);
  }

  async getByToken(token: string): Promise<PoSupplierPortalView> {
    return this.toPortal(token);
  }

  async acceptByToken(token: string, input: PoSupplierActionCommand = {}): Promise<PoSupplierPortalView> {
    const { po, version } = await this.requireUsableToken(token.trim());
    assertSupplierRespondable(po.status);
    const idempotencyKey = input.idempotencyKey?.trim() || null;
    if (idempotencyKey) {
      const existing = await this.deps.store.findSupplierResponseByIdempotencyKey(
        po.businessId,
        idempotencyKey
      );
      if (existing) {
        return this.toPortal(token.trim());
      }
    }
    await this.deps.store.insertSupplierResponse({
      id: randomUUID(),
      businessId: po.businessId,
      purchaseOrderId: po.id,
      versionId: version.id,
      profileId: po.profileId,
      actionType: PO_SUPPLIER_ACTIONS.ACCEPT,
      reason: null,
      idempotencyKey,
    });
    await this.deps.store.updateVersion(po.businessId, version.id, {
      status: PO_VERSION_STATUSES.ACCEPTED,
    });
    await this.deps.store.update(po.businessId, po.id, {
      status: PO_STATUSES.ACCEPTED,
      acceptedAt: new Date(),
      acceptedVersionId: version.id,
      updatedBy: null,
    });
    await this.auditForBusiness(po.businessId, po.id, PROCUREMENT_AUDIT_ACTIONS.PO_ACCEPTED, {
      poNumber: po.poNumber,
      versionId: version.id,
    });
    return this.toPortal(token.trim());
  }

  async rejectByToken(token: string, input: PoSupplierActionCommand): Promise<PoSupplierPortalView> {
    const reason = input.reason?.trim() ?? "";
    if (!reason) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.PO_REASON_REQUIRED, undefined, 400, {
        field: "reason",
      });
    }
    const { po, version } = await this.requireUsableToken(token.trim());
    assertSupplierRespondable(po.status);
    await this.deps.store.insertSupplierResponse({
      id: randomUUID(),
      businessId: po.businessId,
      purchaseOrderId: po.id,
      versionId: version.id,
      profileId: po.profileId,
      actionType: PO_SUPPLIER_ACTIONS.REJECT,
      reason,
      idempotencyKey: input.idempotencyKey?.trim() || null,
    });
    await this.deps.store.update(po.businessId, po.id, {
      status: PO_STATUSES.REJECTED,
      updatedBy: null,
    });
    await this.auditForBusiness(po.businessId, po.id, PROCUREMENT_AUDIT_ACTIONS.PO_REJECTED_BY_SUPPLIER, {
      poNumber: po.poNumber,
      reason,
    });
    return this.toPortal(token.trim());
  }

  async requestChangeByToken(
    token: string,
    input: PoSupplierActionCommand
  ): Promise<PoSupplierPortalView> {
    const reason = input.reason?.trim() ?? "";
    if (!reason) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.PO_REASON_REQUIRED, undefined, 400, {
        field: "reason",
      });
    }
    const { po, version } = await this.requireUsableToken(token.trim());
    assertSupplierRespondable(po.status);
    await this.deps.store.insertSupplierResponse({
      id: randomUUID(),
      businessId: po.businessId,
      purchaseOrderId: po.id,
      versionId: version.id,
      profileId: po.profileId,
      actionType: PO_SUPPLIER_ACTIONS.REQUEST_CHANGE,
      reason,
      idempotencyKey: input.idempotencyKey?.trim() || null,
    });
    await this.deps.store.update(po.businessId, po.id, {
      status: PO_STATUSES.CHANGE_REQUESTED,
      updatedBy: null,
    });
    await this.auditForBusiness(po.businessId, po.id, PROCUREMENT_AUDIT_ACTIONS.PO_CHANGE_REQUESTED, {
      poNumber: po.poNumber,
      reason,
    });
    return this.toPortal(token.trim());
  }

  async amend(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    poId: string,
    input: AmendPurchaseOrderCommand
  ): Promise<PurchaseOrderView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.PO_AMEND);
    const current = requirePo(await this.deps.store.findById(context.businessId, poId));
    assertCanAmendPo(current.status);
    const currentVersionId = current.currentVersionId;
    if (!currentVersionId) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.PO_VERSION_INVALID, undefined, 409);
    }
    const versions = await this.deps.store.listVersions(poId);
    const currentVersion = requirePo(
      await this.deps.store.findVersionById(context.businessId, currentVersionId)
    );
    const validatedLines = validatePoLines(input.lines);
    const totals = sumPoLineTotals(validatedLines);
    const control = await this.deps.controls.getOrCreateControl(context.businessId);
    const material = isMaterialAmendment(
      currentVersion.totalAmount,
      totals.totalAmount,
      control.materialAmendmentThreshold
    );
    const nextVersionNumber = (versions.at(-1)?.versionNumber ?? 0) + 1;
    const versionId = randomUUID();
    await this.deps.store.updateVersion(context.businessId, currentVersionId, {
      status: versionStatusForSupersede(),
      supersededAt: new Date(),
    });
    await this.deps.store.revokeTokensForVersion(context.businessId, currentVersionId, new Date());
    await this.deps.store.insertVersion({
      id: versionId,
      businessId: context.businessId,
      purchaseOrderId: poId,
      versionNumber: nextVersionNumber,
      status: PO_VERSION_STATUSES.DRAFT,
      subtotalAmount: totals.subtotalAmount,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      year1Amount: currentVersion.year1Amount,
      tcvAmount: currentVersion.tcvAmount,
      tcoAmount: currentVersion.tcoAmount,
      promisedDeliveryDate: input.promisedDeliveryDate ?? currentVersion.promisedDeliveryDate,
      warrantyNotes: input.warrantyNotes ?? currentVersion.warrantyNotes,
      termsAndConditions: input.termsAndConditions ?? currentVersion.termsAndConditions,
      issuedAt: null,
      issuedBy: null,
      supersededAt: null,
      createdBy: actorId(context),
    });
    await this.deps.store.insertLines(context.businessId, versionId, mapValidatedLines(validatedLines));
    if (input.paymentTerms?.length) {
      await this.deps.store.insertPaymentTerms(
        context.businessId,
        versionId,
        input.paymentTerms.map((term, index) => ({
          sequence: index + 1,
          milestoneName: term.milestoneName,
          percentage: term.percentage,
          amount: term.amount ?? null,
          triggerEvent: term.triggerEvent ?? null,
          duePeriodDays: term.duePeriodDays ?? null,
          comments: term.comments ?? null,
        }))
      );
    } else {
      const priorTerms = await this.deps.store.listPaymentTerms(currentVersionId);
      await this.deps.store.insertPaymentTerms(
        context.businessId,
        versionId,
        priorTerms.map((term) => ({
          sequence: term.sequence,
          milestoneName: term.milestoneName,
          percentage: term.percentage,
          amount: term.amount,
          triggerEvent: term.triggerEvent,
          duePeriodDays: term.duePeriodDays,
          comments: term.comments,
        }))
      );
    }
    const nextStatus = material ? PO_STATUSES.DRAFT : current.status;
    await this.deps.store.update(context.businessId, poId, {
      status: nextStatus,
      currentVersionId: versionId,
      acceptedVersionId: material ? null : current.acceptedVersionId,
      subtotalAmount: totals.subtotalAmount,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      deliveryLocation: input.deliveryLocation ?? current.deliveryLocation,
      warrantyNotes: input.warrantyNotes ?? current.warrantyNotes,
      termsAndConditions: input.termsAndConditions ?? current.termsAndConditions,
      submittedAt: material ? null : current.submittedAt,
      submittedBy: material ? null : current.submittedBy,
      approvedAt: material ? null : current.approvedAt,
      approvedBy: material ? null : current.approvedBy,
      issuedAt: material ? null : current.issuedAt,
      issuedBy: material ? null : current.issuedBy,
      acceptedAt: material ? null : current.acceptedAt,
      updatedBy: actorId(context),
    });
    await this.audit(context, poId, PROCUREMENT_AUDIT_ACTIONS.PO_AMENDED, {
      poNumber: current.poNumber,
      versionNumber: String(nextVersionNumber),
      material: String(material),
    });
    return this.toView(context, poId);
  }

  async cancel(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    poId: string,
    input: PoDecisionCommand
  ): Promise<PurchaseOrderView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.PO_CANCEL);
    const reason = input.reason?.trim() ?? "";
    if (!reason) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.PO_REASON_REQUIRED, undefined, 400, {
        field: "reason",
      });
    }
    const current = requirePo(await this.deps.store.findById(context.businessId, poId));
    assertCanCancelPo(current.status);
    await this.deps.store.update(context.businessId, poId, {
      status: PO_STATUSES.CANCELLED,
      cancelledAt: new Date(),
      cancelledBy: actor.userId,
      cancellationReason: reason,
      updatedBy: actorId(context),
    });
    await this.audit(context, poId, PROCUREMENT_AUDIT_ACTIONS.PO_CANCELLED, {
      poNumber: current.poNumber,
      reason,
    });
    return this.toView(context, poId);
  }

  async close(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    poId: string,
    input: PoDecisionCommand
  ): Promise<PurchaseOrderView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.PO_CLOSE);
    const reason = input.reason?.trim() ?? "";
    if (!reason) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.PO_REASON_REQUIRED, undefined, 400, {
        field: "reason",
      });
    }
    const current = requirePo(await this.deps.store.findById(context.businessId, poId));
    assertCanClosePo(current.status);
    await this.deps.store.update(context.businessId, poId, {
      status: PO_STATUSES.CLOSED,
      closedAt: new Date(),
      closedBy: actor.userId,
      closureReason: reason,
      updatedBy: actorId(context),
    });
    await this.audit(context, poId, PROCUREMENT_AUDIT_ACTIONS.PO_CLOSED, {
      poNumber: current.poNumber,
      reason,
    });
    return this.toView(context, poId);
  }

  async recordFulfilmentEvent(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    poId: string,
    input: RecordPoFulfilmentCommand
  ): Promise<PurchaseOrderView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.PO_UPDATE);
    const current = requirePo(await this.deps.store.findById(context.businessId, poId));
    assertCanRecordFulfilment(current.status);
    const nextStatus = input.fullyFulfilled
      ? PO_STATUSES.FULFILLED
      : PO_STATUSES.PARTIALLY_FULFILLED;
    await this.deps.store.update(context.businessId, poId, {
      status: nextStatus,
      updatedBy: actorId(context),
    });
    return this.toView(context, poId);
  }

  private async toView(context: CurrentBusinessContext, poId: string): Promise<PurchaseOrderView> {
    const header = requirePo(await this.deps.store.findById(context.businessId, poId));
    const supplier = await this.deps.suggestedSupplier.resolve(context.businessId, header.profileId);
    const versions = await this.buildVersionViews(context.businessId, poId);
    const currentVersion = versions.find((row) => row.id === header.currentVersionId) ?? null;
    return {
      id: header.id,
      poNumber: header.poNumber,
      profileId: header.profileId,
      supplierName: supplier?.party.displayName ?? "Supplier",
      sourceType: header.sourceType,
      purchaseRequestId: header.purchaseRequestId,
      sourcingEventId: header.sourcingEventId,
      awardId: header.awardId,
      contractId: header.contractId,
      contractVersionId: header.contractVersionId,
      callOffReference: header.callOffReference,
      winningQuoteId: header.winningQuoteId,
      currencyCode: header.currencyCode,
      status: header.status,
      statusLabel: poStatusLabel(header.status),
      subtotalAmount: header.subtotalAmount,
      taxAmount: header.taxAmount,
      totalAmount: header.totalAmount,
      year1Amount: header.year1Amount,
      tcvAmount: header.tcvAmount,
      tcoAmount: header.tcoAmount,
      deliveryLocation: header.deliveryLocation,
      warrantyNotes: header.warrantyNotes,
      termsAndConditions: header.termsAndConditions,
      currentVersion,
      versions,
      canSubmit: header.status === PO_STATUSES.DRAFT,
      canApprove: header.status === PO_STATUSES.PENDING_APPROVAL,
      canIssue: header.status === PO_STATUSES.APPROVED,
      canAmend: AMENDABLE_STATUSES.has(header.status),
      canCancel: CANCELLABLE_STATUSES.has(header.status),
      canClose: CLOSABLE_STATUSES.has(header.status),
      submittedAt: header.submittedAt?.toISOString() ?? null,
      approvedAt: header.approvedAt?.toISOString() ?? null,
      issuedAt: header.issuedAt?.toISOString() ?? null,
      acceptedAt: header.acceptedAt?.toISOString() ?? null,
      createdAt: header.createdAt.toISOString(),
    };
  }

  private async buildVersionViews(businessId: string, poId: string): Promise<PoVersionView[]> {
    const versions = await this.deps.store.listVersions(poId);
    const views: PoVersionView[] = [];
    for (const version of versions) {
      if (version.businessId !== businessId) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.CROSS_BUSINESS_ACCESS, undefined, 403);
      }
      const lines = await this.deps.store.listLines(version.id);
      const paymentTerms = await this.deps.store.listPaymentTerms(version.id);
      views.push({
        id: version.id,
        versionNumber: version.versionNumber,
        status: version.status,
        subtotalAmount: version.subtotalAmount,
        taxAmount: version.taxAmount,
        totalAmount: version.totalAmount,
        issuedAt: version.issuedAt?.toISOString() ?? null,
        supersededAt: version.supersededAt?.toISOString() ?? null,
        lines: lines.map(mapLineView),
        paymentTerms: paymentTerms.map(mapPaymentTermView),
      });
    }
    return views;
  }

  private async toPortal(token: string): Promise<PoSupplierPortalView> {
    const { po, version } = await this.requireUsableToken(token);
    const supplier = await this.deps.suggestedSupplier.resolve(po.businessId, po.profileId);
    const lines = await this.deps.store.listLines(version.id);
    const paymentTerms = await this.deps.store.listPaymentTerms(version.id);
    return {
      poNumber: po.poNumber,
      supplierName: supplier?.party.displayName ?? "Supplier",
      status: po.status,
      statusLabel: poStatusLabel(po.status),
      currencyCode: po.currencyCode,
      totalAmount: version.totalAmount,
      lines: lines.map(mapLineView),
      paymentTerms: paymentTerms.map(mapPaymentTermView),
      warrantyNotes: version.warrantyNotes,
      termsAndConditions: version.termsAndConditions,
      canAccept: po.status === PO_STATUSES.ISSUED,
      canReject: po.status === PO_STATUSES.ISSUED,
      canRequestChange: po.status === PO_STATUSES.ISSUED,
    };
  }

  private async requireUsableToken(token: string) {
    const tokenRow = await this.deps.store.findTokenByAccessToken(token);
    if (!tokenRow) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.PO_TOKEN_INVALID, undefined, 404);
    }
    if (tokenRow.revokedAt) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.PO_TOKEN_REVOKED, undefined, 409);
    }
    const po = requirePo(await this.deps.store.findById(tokenRow.businessId, tokenRow.purchaseOrderId));
    const version = requirePo(
      await this.deps.store.findVersionById(tokenRow.businessId, tokenRow.versionId)
    );
    if (tokenRow.tokenExpiresAt && tokenRow.tokenExpiresAt.getTime() <= Date.now()) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.PO_TOKEN_REVOKED, undefined, 409);
    }
    return { po, version, tokenRow };
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
      throw new ProcurementError(
        PROCUREMENT_ERROR_CODES.SUPPLIER_NOT_ELIGIBLE,
        eligibility.actionRequired ?? eligibility.reasons[0],
        409
      );
    }
    return snapshot;
  }

  private async allocatePoNumber(businessId: string) {
    try {
      return await this.deps.numbering.allocate({
        businessId,
        documentType: DOCUMENT_NUMBERING_DOCUMENT_TYPES.PURCHASE_ORDER,
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
    await this.auditForBusiness(context.businessId, entityId, action, references, actorId(context));
  }

  private async auditForBusiness(
    businessId: string,
    entityId: string,
    action: string,
    references?: Record<string, string>,
    actorUserId: string | null = null
  ) {
    await this.deps.audit.record({
      businessId,
      actorUserId,
      entityId,
      action,
      outcome: "SUCCESS",
      references,
    });
  }
}

export function createDefaultPurchaseOrderDependencies(): PurchaseOrderServiceDependencies {
  const controls = createPurchaseOrderControlRepository();
  const contracts = createContractRepository();
  return {
    store: createPurchaseOrderRepository(),
    sourcing: createSourcingRepository(),
    requests: createPurchaseRequestRepository(),
    contracts,
    numbering: new ConfigurableDocumentNumberingService(createDocumentNumberingPolicyRepository()),
    audit: createProcurementAuditAdapter(),
    workflow: createProcurementPoWorkflowAdapter(controls),
    controls,
    suggestedSupplier: createSuggestedSupplierAdapter(),
    notifications: createInProcessNotificationAdapter(),
    performance: createProcurementPerformanceBridge(),
  };
}

export function createPurchaseOrderService(
  deps: PurchaseOrderServiceDependencies = createDefaultPurchaseOrderDependencies()
): PurchaseOrderService {
  return new PurchaseOrderService(deps);
}
