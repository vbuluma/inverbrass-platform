/**
 * Purpose:
 * Orchestrate BP-009 IP-02 purchase requests and ENG-005 approval.
 * Does not create RFX, PO, receipt, invoice, or payment records.
 *
 * Implementation Package:
 * BP-009 / IP-02 – Purchase Requests & Procurement Approval
 */

import { randomUUID } from "node:crypto";

import type { CurrentBusinessContext } from "@/core/auth/types";
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
  BUDGET_CHECK_STATUS_LABELS,
  BUDGET_SOURCE_LABELS,
  PROCUREMENT_AUDIT_ACTIONS,
  PROCUREMENT_PERMISSIONS,
  PROCUREMENT_TYPE_LABELS,
  PURCHASE_REQUEST_ORIGIN_LABELS,
  PURCHASE_REQUEST_ORIGIN_TYPES,
  PURCHASE_REQUEST_STATUS_LABELS,
  PURCHASE_REQUEST_STATUSES,
  type BudgetCheckStatus,
  type BudgetSourceCode,
  type ProcurementTypeCode,
  type PurchaseRequestOriginType,
  type PurchaseRequestStatus,
} from "@/modules/procurement/constants";
import { PROCUREMENT_ERROR_CODES, ProcurementError } from "@/modules/procurement/errors";
import type {
  InventoryReorderOriginPort,
  ProcurementAuditPort,
  PurchaseRequestControlPort,
  PurchaseRequestRepositoryPort,
  SuggestedSupplierPort,
} from "@/modules/procurement/ports";
import { createProcurementAuditAdapter } from "@/modules/procurement/services/procurement-audit-helper";
import { createPurchaseRequestControlRepository, createPurchaseRequestRepository } from "@/modules/procurement/repositories/purchase-request-repository";
import { createProcurementRequestWorkflowAdapter } from "@/modules/procurement/adapters/procurement-request-workflow-adapter";
import { createSuggestedSupplierAdapter } from "@/modules/procurement/adapters/suggested-supplier-adapter";
import { createInventoryReorderOriginAdapter } from "@/modules/procurement/adapters/inventory-reorder-origin-adapter";
import { assertPermission, hasPermission } from "@/modules/procurement/services/procurement-rules";
import {
  assertCanEdit,
  assertRequestRead,
  evaluateBudgetCheck,
  isPendingApproval,
  normalizeCurrency,
  resolveOverBudgetMode,
  sumLineValues,
  validateBudgetSource,
  validateLines,
  validateOriginType,
  validateProcurementType,
} from "@/modules/procurement/services/purchase-request-rules";
import { evaluateSupplierEligibility } from "@/modules/procurement/services/supplier-eligibility-service";
import type {
  AttachPurchaseRequestDocumentCommand,
  CreatePurchaseRequestCommand,
  ProcurementActor,
  PurchaseRequestDecisionCommand,
  PurchaseRequestListFilter,
  PurchaseRequestListView,
  PurchaseRequestView,
  UpdatePurchaseRequestCommand,
} from "@/modules/procurement/types";

export type PurchaseRequestServiceDependencies = {
  requests: PurchaseRequestRepositoryPort;
  numbering: DocumentNumberingPort;
  audit: ProcurementAuditPort;
  workflow: WorkflowEnginePort;
  controls: PurchaseRequestControlPort;
  suggestedSupplier: SuggestedSupplierPort;
  reorderOrigin: InventoryReorderOriginPort;
};

function actorId(context: CurrentBusinessContext) {
  return context.platformUserId || null;
}

function statusLabel(status: string) {
  return PURCHASE_REQUEST_STATUS_LABELS[status as PurchaseRequestStatus] ?? status;
}

function originLabel(origin: string) {
  return PURCHASE_REQUEST_ORIGIN_LABELS[origin as PurchaseRequestOriginType] ?? origin;
}

export class PurchaseRequestService {
  constructor(private readonly deps: PurchaseRequestServiceDependencies) {}

  async getDashboard(context: CurrentBusinessContext, actor: ProcurementActor) {
    assertRequestRead(actor);
    const list = await this.list(context, actor, { status: "all" });
    return {
      requestDraftCount: list.filter((row) => row.status === PURCHASE_REQUEST_STATUSES.DRAFT)
        .length,
      requestPendingApprovalCount: list.filter((row) => isPendingApproval(row.status)).length,
      requestApprovedCount: list.filter(
        (row) => row.status === PURCHASE_REQUEST_STATUSES.APPROVED
      ).length,
      recentRequests: list.slice(0, 8),
    };
  }

  async list(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    filter: PurchaseRequestListFilter = {}
  ): Promise<PurchaseRequestListView[]> {
    assertRequestRead(actor);
    const headers = await this.deps.requests.listByBusiness(context.businessId);
    const views: PurchaseRequestListView[] = [];
    for (const header of headers) {
      const lines = await this.deps.requests.listLines(context.businessId, header.id);
      views.push({
        id: header.id,
        requestNumber: header.requestNumber,
        need: lines[0]?.description ?? "Purchase request",
        estimatedValue: header.estimatedValue,
        currencyCode: header.currencyCode,
        status: header.status,
        statusLabel: statusLabel(header.status),
        originType: header.originType,
        originLabel: originLabel(header.originType),
        requesterUserId: header.requesterUserId,
        createdAt: header.createdAt.toISOString(),
      });
    }
    const query = filter.query?.trim().toLowerCase() ?? "";
    return views.filter((row) => {
      if (query) {
        const haystack = `${row.requestNumber} ${row.need}`.toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }
      if (filter.status === "draft") {
        return row.status === PURCHASE_REQUEST_STATUSES.DRAFT;
      }
      if (filter.status === "pending-approval") {
        return isPendingApproval(row.status);
      }
      if (filter.status === "approved") {
        return row.status === PURCHASE_REQUEST_STATUSES.APPROVED;
      }
      if (filter.status === "returned") {
        return row.status === PURCHASE_REQUEST_STATUSES.RETURNED;
      }
      if (filter.status === "rejected") {
        return row.status === PURCHASE_REQUEST_STATUSES.REJECTED;
      }
      if (filter.status === "cancelled") {
        return row.status === PURCHASE_REQUEST_STATUSES.CANCELLED;
      }
      if (filter.status === "mine") {
        return row.requesterUserId === actor.userId;
      }
      return true;
    });
  }

  async get(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    requestId: string
  ): Promise<PurchaseRequestView> {
    assertRequestRead(actor);
    return this.toView(context, actor, requestId);
  }

  async create(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    input: CreatePurchaseRequestCommand
  ): Promise<PurchaseRequestView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.REQUEST_CREATE);
    if (input.idempotencyKey?.trim()) {
      const existing = await this.deps.requests.findByIdempotencyKey(
        context.businessId,
        input.idempotencyKey.trim()
      );
      if (existing) {
        return this.toView(context, actor, existing.id);
      }
    }
    const prepared = await this.preparePayload(context, input);
    let allocated;
    try {
      allocated = await this.deps.numbering.allocate({
        businessId: context.businessId,
        documentType: DOCUMENT_NUMBERING_DOCUMENT_TYPES.PURCHASE_REQUEST,
      });
    } catch (error) {
      if (error instanceof DocumentNumberingError) {
        throw new ProcurementError(
          PROCUREMENT_ERROR_CODES.NUMBERING_POLICY_MISSING,
          undefined,
          500
        );
      }
      throw error;
    }
    const id = randomUUID();
    await this.deps.requests.insert({
      id,
      businessId: context.businessId,
      requestNumber: allocated.number,
      status: PURCHASE_REQUEST_STATUSES.DRAFT,
      ...prepared.header,
      requesterUserId: actor.userId,
      submittedAt: null,
      submittedBy: null,
      approvedAt: null,
      approvedBy: null,
      rejectedAt: null,
      rejectedBy: null,
      returnedAt: null,
      returnedBy: null,
      cancelledAt: null,
      cancelledBy: null,
      decisionReason: null,
      idempotencyKey: input.idempotencyKey?.trim() || null,
      createdBy: actorId(context),
      updatedBy: actorId(context),
      version: 1,
    });
    await this.deps.requests.replaceLines(context.businessId, id, prepared.lines);
    await this.audit(context, id, PROCUREMENT_AUDIT_ACTIONS.REQUEST_CREATED, {
      requestNumber: allocated.number,
      originType: prepared.header.originType,
    });
    return this.toView(context, actor, id);
  }

  async update(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    requestId: string,
    input: UpdatePurchaseRequestCommand
  ): Promise<PurchaseRequestView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.REQUEST_UPDATE);
    const current = await this.requireRequest(context.businessId, requestId);
    assertCanEdit(current.status);
    const merged: CreatePurchaseRequestCommand = {
      originType: input.originType ?? current.originType,
      originReference:
        input.originReference !== undefined ? input.originReference : current.originReference,
      businessUnitCode:
        input.businessUnitCode !== undefined ? input.businessUnitCode : current.businessUnitCode,
      procurementType: input.procurementType ?? current.procurementType,
      justification:
        input.justification !== undefined ? input.justification : current.justification,
      requiredDate: input.requiredDate !== undefined ? input.requiredDate : current.requiredDate,
      deliveryLocation:
        input.deliveryLocation !== undefined ? input.deliveryLocation : current.deliveryLocation,
      currencyCode: input.currencyCode ?? current.currencyCode,
      budgetSource: input.budgetSource ?? current.budgetSource,
      budgetReference:
        input.budgetReference !== undefined ? input.budgetReference : current.budgetReference,
      budgetLine: input.budgetLine !== undefined ? input.budgetLine : current.budgetLine,
      budgetPeriod: input.budgetPeriod !== undefined ? input.budgetPeriod : current.budgetPeriod,
      budgetApprovedAmount:
        input.budgetApprovedAmount !== undefined
          ? input.budgetApprovedAmount
          : current.budgetApprovedAmount,
      budgetAvailableAmount:
        input.budgetAvailableAmount !== undefined
          ? input.budgetAvailableAmount
          : current.budgetAvailableAmount,
      budgetApprovalReference:
        input.budgetApprovalReference !== undefined
          ? input.budgetApprovalReference
          : current.budgetApprovalReference,
      budgetApprovalDate:
        input.budgetApprovalDate !== undefined
          ? input.budgetApprovalDate
          : current.budgetApprovalDate,
      budgetApprover:
        input.budgetApprover !== undefined ? input.budgetApprover : current.budgetApprover,
      suggestedProfileId:
        input.suggestedProfileId !== undefined
          ? input.suggestedProfileId
          : current.suggestedProfileId,
      lines:
        input.lines ??
        (await this.deps.requests.listLines(context.businessId, requestId)).map((line) => ({
          catalogueItemId: line.catalogueItemId,
          description: line.description,
          specification: line.specification,
          quantity: line.quantity,
          uom: line.uom,
          estimatedValue: line.estimatedValue,
          requiredDate: line.requiredDate,
        })),
    };
    const prepared = await this.preparePayload(context, merged);
    await this.deps.requests.update(context.businessId, requestId, {
      ...prepared.header,
      updatedBy: actorId(context),
    });
    await this.deps.requests.replaceLines(context.businessId, requestId, prepared.lines);
    await this.audit(context, requestId, PROCUREMENT_AUDIT_ACTIONS.REQUEST_UPDATED, {
      requestNumber: current.requestNumber,
    });
    return this.toView(context, actor, requestId);
  }

  async attachDocument(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    requestId: string,
    input: AttachPurchaseRequestDocumentCommand
  ) {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.REQUEST_UPDATE);
    const current = await this.requireRequest(context.businessId, requestId);
    assertCanEdit(current.status);
    if (!input.documentTypeCode.trim() || !input.originalFileName.trim() || !input.storageReference.trim()) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.DOCUMENT_NOT_FOUND, undefined, 400);
    }
    await this.deps.requests.addDocument(context.businessId, requestId, {
      documentTypeCode: input.documentTypeCode.trim(),
      originalFileName: input.originalFileName.trim(),
      storageReference: input.storageReference.trim(),
      createdBy: actorId(context),
    });
    await this.audit(context, requestId, PROCUREMENT_AUDIT_ACTIONS.REQUEST_DOCUMENT_ATTACHED, {
      requestNumber: current.requestNumber,
      originalFileName: input.originalFileName.trim(),
    });
    return this.toView(context, actor, requestId);
  }

  async submit(context: CurrentBusinessContext, actor: ProcurementActor, requestId: string) {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.REQUEST_SUBMIT);
    const current = await this.requireRequest(context.businessId, requestId);
    if (isPendingApproval(current.status) || current.status === PURCHASE_REQUEST_STATUSES.APPROVED) {
      return this.toView(context, actor, requestId);
    }
    assertCanEdit(current.status);
    const lines = await this.deps.requests.listLines(context.businessId, requestId);
    if (lines.length === 0) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.EMPTY_REQUEST, undefined, 400);
    }
    await this.assertSuggestedSupplier(context.businessId, current.suggestedProfileId);
    const control = await this.deps.controls.getControl(context.businessId);
    evaluateBudgetCheck({
      budgetSource: current.budgetSource,
      budgetReference: current.budgetReference,
      budgetAvailableAmount: current.budgetAvailableAmount,
      budgetApprovalReference: current.budgetApprovalReference,
      budgetApprovalDate: current.budgetApprovalDate,
      budgetApprover: current.budgetApprover,
      estimatedValue: current.estimatedValue,
      overBudgetMode: resolveOverBudgetMode(control?.overBudgetMode),
    });
    const decision = await this.deps.workflow.evaluatePurchaseRequestApproval({
      businessId: context.businessId,
      operationCode: WORKFLOW_OPERATIONS.PURCHASE_REQUEST_APPROVAL,
      amount: current.estimatedValue,
      currencyCode: current.currencyCode,
      procurementType: current.procurementType,
    });
    const nextStatus = decision.required
      ? PURCHASE_REQUEST_STATUSES.IN_APPROVAL
      : PURCHASE_REQUEST_STATUSES.APPROVED;
    await this.deps.requests.update(context.businessId, requestId, {
      status: nextStatus,
      submittedAt: new Date(),
      submittedBy: actor.userId,
      approvedAt: decision.required ? null : new Date(),
      approvedBy: decision.required ? null : actor.userId,
      updatedBy: actorId(context),
    });
    await this.audit(context, requestId, PROCUREMENT_AUDIT_ACTIONS.REQUEST_SUBMITTED, {
      requestNumber: current.requestNumber,
      nextStatus,
      approvalRequired: String(decision.required),
    });
    if (!decision.required) {
      await this.audit(context, requestId, PROCUREMENT_AUDIT_ACTIONS.REQUEST_APPROVED, {
        requestNumber: current.requestNumber,
        autoApproved: "true",
      });
    }
    return this.toView(context, actor, requestId);
  }

  async approve(context: CurrentBusinessContext, actor: ProcurementActor, requestId: string) {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.REQUEST_APPROVE);
    const current = await this.requireRequest(context.businessId, requestId);
    if (current.status === PURCHASE_REQUEST_STATUSES.APPROVED) {
      return this.toView(context, actor, requestId);
    }
    if (!isPendingApproval(current.status)) {
      throw new ProcurementError(
        PROCUREMENT_ERROR_CODES.INVALID_STATUS_TRANSITION,
        undefined,
        409
      );
    }
    try {
      this.deps.workflow.assertDistinctActors(
        current.submittedBy ?? current.requesterUserId ?? "",
        actor.userId,
        "The person who submitted this request cannot approve it."
      );
    } catch (error) {
      if (error instanceof WorkflowEngineError) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.SELF_APPROVAL, undefined, 409);
      }
      throw error;
    }
    await this.deps.requests.update(context.businessId, requestId, {
      status: PURCHASE_REQUEST_STATUSES.APPROVED,
      approvedAt: new Date(),
      approvedBy: actor.userId,
      decisionReason: null,
      updatedBy: actorId(context),
    });
    await this.audit(context, requestId, PROCUREMENT_AUDIT_ACTIONS.REQUEST_APPROVED, {
      requestNumber: current.requestNumber,
    });
    return this.toView(context, actor, requestId);
  }

  async reject(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    requestId: string,
    input: PurchaseRequestDecisionCommand
  ) {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.REQUEST_APPROVE);
    const reason = input.reason?.trim() ?? "";
    if (!reason) {
      throw new ProcurementError(
        PROCUREMENT_ERROR_CODES.DECISION_REASON_REQUIRED,
        undefined,
        400,
        { field: "reason" }
      );
    }
    const current = await this.requireRequest(context.businessId, requestId);
    if (!isPendingApproval(current.status)) {
      throw new ProcurementError(
        PROCUREMENT_ERROR_CODES.INVALID_STATUS_TRANSITION,
        undefined,
        409
      );
    }
    await this.deps.requests.update(context.businessId, requestId, {
      status: PURCHASE_REQUEST_STATUSES.REJECTED,
      rejectedAt: new Date(),
      rejectedBy: actor.userId,
      decisionReason: reason,
      updatedBy: actorId(context),
    });
    await this.audit(context, requestId, PROCUREMENT_AUDIT_ACTIONS.REQUEST_REJECTED, {
      requestNumber: current.requestNumber,
      reason,
    });
    return this.toView(context, actor, requestId);
  }

  async returnRequest(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    requestId: string,
    input: PurchaseRequestDecisionCommand
  ) {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.REQUEST_APPROVE);
    const reason = input.reason?.trim() ?? "";
    if (!reason) {
      throw new ProcurementError(
        PROCUREMENT_ERROR_CODES.DECISION_REASON_REQUIRED,
        undefined,
        400,
        { field: "reason" }
      );
    }
    const current = await this.requireRequest(context.businessId, requestId);
    if (!isPendingApproval(current.status)) {
      throw new ProcurementError(
        PROCUREMENT_ERROR_CODES.INVALID_STATUS_TRANSITION,
        undefined,
        409
      );
    }
    await this.deps.requests.update(context.businessId, requestId, {
      status: PURCHASE_REQUEST_STATUSES.RETURNED,
      returnedAt: new Date(),
      returnedBy: actor.userId,
      decisionReason: reason,
      updatedBy: actorId(context),
    });
    await this.audit(context, requestId, PROCUREMENT_AUDIT_ACTIONS.REQUEST_RETURNED, {
      requestNumber: current.requestNumber,
      reason,
    });
    return this.toView(context, actor, requestId);
  }

  async cancel(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    requestId: string,
    input: PurchaseRequestDecisionCommand = {}
  ) {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.REQUEST_CANCEL);
    const current = await this.requireRequest(context.businessId, requestId);
    if (current.status === PURCHASE_REQUEST_STATUSES.CANCELLED) {
      return this.toView(context, actor, requestId);
    }
    if (
      current.status === PURCHASE_REQUEST_STATUSES.REJECTED ||
      current.status === PURCHASE_REQUEST_STATUSES.CANCELLED
    ) {
      throw new ProcurementError(
        PROCUREMENT_ERROR_CODES.INVALID_STATUS_TRANSITION,
        undefined,
        409
      );
    }
    const reason = input.reason?.trim() || "Cancelled";
    await this.deps.requests.update(context.businessId, requestId, {
      status: PURCHASE_REQUEST_STATUSES.CANCELLED,
      cancelledAt: new Date(),
      cancelledBy: actor.userId,
      decisionReason: reason,
      updatedBy: actorId(context),
    });
    await this.audit(context, requestId, PROCUREMENT_AUDIT_ACTIONS.REQUEST_CANCELLED, {
      requestNumber: current.requestNumber,
      reason,
    });
    return this.toView(context, actor, requestId);
  }

  private async preparePayload(
    context: CurrentBusinessContext,
    input: CreatePurchaseRequestCommand
  ) {
    const originType = validateOriginType(input.originType);
    let originReference = input.originReference?.trim() || null;
    let draftLines = input.lines ?? [];
    if (originType === PURCHASE_REQUEST_ORIGIN_TYPES.INVENTORY_REORDER) {
      if (!originReference) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_ORIGIN, undefined, 400, {
          field: "originReference",
        });
      }
      const origin = await this.deps.reorderOrigin.find(context.businessId, originReference);
      if (!origin) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_ORIGIN, undefined, 404, {
          field: "originReference",
        });
      }
      originReference = origin.reference;
      if (draftLines.length === 0) {
        draftLines = [
          {
            description: origin.description,
            quantity: origin.recommendedQuantity,
            uom: "EA",
            estimatedValue: "0",
          },
        ];
      }
    }
    const lines = validateLines(draftLines);
    await this.assertSuggestedSupplier(context.businessId, input.suggestedProfileId);
    const estimatedValue = sumLineValues(lines);
    const currencyCode = normalizeCurrency(input.currencyCode);
    const budgetSource = validateBudgetSource(input.budgetSource);
    const control = await this.deps.controls.getControl(context.businessId);
    const budgetCheckStatus = evaluateBudgetCheck({
      budgetSource,
      budgetReference: input.budgetReference,
      budgetAvailableAmount: input.budgetAvailableAmount,
      budgetApprovalReference: input.budgetApprovalReference,
      budgetApprovalDate: input.budgetApprovalDate,
      budgetApprover: input.budgetApprover,
      estimatedValue,
      overBudgetMode: resolveOverBudgetMode(control?.overBudgetMode),
    });
    return {
      lines,
      header: {
        originType,
        originReference,
        businessUnitCode: input.businessUnitCode?.trim() || null,
        procurementType: validateProcurementType(input.procurementType),
        justification: input.justification?.trim() || null,
        requiredDate: input.requiredDate?.trim() || null,
        deliveryLocation: input.deliveryLocation?.trim() || null,
        estimatedValue,
        currencyCode,
        budgetSource,
        budgetReference: input.budgetReference?.trim() || null,
        budgetLine: input.budgetLine?.trim() || null,
        budgetPeriod: input.budgetPeriod?.trim() || null,
        budgetApprovedAmount: input.budgetApprovedAmount?.trim() || null,
        budgetAvailableAmount: input.budgetAvailableAmount?.trim() || null,
        budgetCheckStatus,
        budgetApprovalReference: input.budgetApprovalReference?.trim() || null,
        budgetApprovalDate: input.budgetApprovalDate?.trim() || null,
        budgetApprover: input.budgetApprover?.trim() || null,
        suggestedProfileId: input.suggestedProfileId?.trim() || null,
      },
    };
  }

  private async assertSuggestedSupplier(businessId: string, profileId: string | null | undefined) {
    const id = profileId?.trim() ?? "";
    if (!id) {
      return;
    }
    const snapshot = await this.deps.suggestedSupplier.resolve(businessId, id);
    if (!snapshot) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.PROFILE_NOT_FOUND, undefined, 404, {
        field: "suggestedProfileId",
      });
    }
    const eligibility = evaluateSupplierEligibility({
      party: snapshot.party,
      profile: snapshot.profile,
      latestQualification: snapshot.latestQualification,
    });
    if (!eligibility.eligible) {
      throw new ProcurementError(
        PROCUREMENT_ERROR_CODES.SUPPLIER_NOT_ELIGIBLE,
        eligibility.reasons[0],
        409,
        { field: "suggestedProfileId" }
      );
    }
  }

  private async requireRequest(businessId: string, requestId: string) {
    const row = await this.deps.requests.findById(businessId, requestId);
    if (!row) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.REQUEST_NOT_FOUND, undefined, 404);
    }
    return row;
  }

  private async toView(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    requestId: string
  ): Promise<PurchaseRequestView> {
    const header = await this.requireRequest(context.businessId, requestId);
    const [lines, documents] = await Promise.all([
      this.deps.requests.listLines(context.businessId, requestId),
      this.deps.requests.listDocuments(context.businessId, requestId),
    ]);
    let suggestedSupplierEligible: boolean | null = null;
    let suggestedSupplierReason: string | null = null;
    if (header.suggestedProfileId) {
      const snapshot = await this.deps.suggestedSupplier.resolve(
        context.businessId,
        header.suggestedProfileId
      );
      if (snapshot) {
        const eligibility = evaluateSupplierEligibility({
          party: snapshot.party,
          profile: snapshot.profile,
          latestQualification: snapshot.latestQualification,
        });
        suggestedSupplierEligible = eligibility.eligible;
        suggestedSupplierReason = eligibility.reasons[0] ?? null;
      }
    }
    const editable = hasPermission(actor, PROCUREMENT_PERMISSIONS.REQUEST_UPDATE);
    return {
      id: header.id,
      requestNumber: header.requestNumber,
      status: header.status,
      statusLabel: statusLabel(header.status),
      originType: header.originType,
      originLabel: originLabel(header.originType),
      originReference: header.originReference,
      requesterUserId: header.requesterUserId,
      businessUnitCode: header.businessUnitCode,
      procurementType: header.procurementType,
      procurementTypeLabel:
        PROCUREMENT_TYPE_LABELS[header.procurementType as ProcurementTypeCode] ??
        header.procurementType,
      justification: header.justification,
      requiredDate: header.requiredDate,
      deliveryLocation: header.deliveryLocation,
      estimatedValue: header.estimatedValue,
      currencyCode: header.currencyCode,
      budgetSource: header.budgetSource,
      budgetSourceLabel:
        BUDGET_SOURCE_LABELS[header.budgetSource as BudgetSourceCode] ?? header.budgetSource,
      budgetReference: header.budgetReference,
      budgetLine: header.budgetLine,
      budgetPeriod: header.budgetPeriod,
      budgetApprovedAmount: header.budgetApprovedAmount,
      budgetAvailableAmount: header.budgetAvailableAmount,
      budgetCheckStatus: header.budgetCheckStatus,
      budgetCheckLabel:
        BUDGET_CHECK_STATUS_LABELS[header.budgetCheckStatus as BudgetCheckStatus] ??
        header.budgetCheckStatus,
      budgetApprovalReference: header.budgetApprovalReference,
      budgetApprovalDate: header.budgetApprovalDate,
      budgetApprover: header.budgetApprover,
      suggestedProfileId: header.suggestedProfileId,
      suggestedSupplierEligible,
      suggestedSupplierReason,
      decisionReason: header.decisionReason,
      submittedAt: header.submittedAt?.toISOString() ?? null,
      submittedBy: header.submittedBy,
      approvedAt: header.approvedAt?.toISOString() ?? null,
      approvedBy: header.approvedBy,
      rejectedAt: header.rejectedAt?.toISOString() ?? null,
      rejectedBy: header.rejectedBy,
      returnedAt: header.returnedAt?.toISOString() ?? null,
      returnedBy: header.returnedBy,
      cancelledAt: header.cancelledAt?.toISOString() ?? null,
      cancelledBy: header.cancelledBy,
      lines,
      documents,
      readyForSourcing: header.status === PURCHASE_REQUEST_STATUSES.APPROVED,
      canEdit: editable && (header.status === PURCHASE_REQUEST_STATUSES.DRAFT || header.status === PURCHASE_REQUEST_STATUSES.RETURNED),
      canSubmit:
        hasPermission(actor, PROCUREMENT_PERMISSIONS.REQUEST_SUBMIT) &&
        (header.status === PURCHASE_REQUEST_STATUSES.DRAFT ||
          header.status === PURCHASE_REQUEST_STATUSES.RETURNED),
      canApprove:
        hasPermission(actor, PROCUREMENT_PERMISSIONS.REQUEST_APPROVE) &&
        isPendingApproval(header.status),
      canCancel:
        hasPermission(actor, PROCUREMENT_PERMISSIONS.REQUEST_CANCEL) &&
        header.status !== PURCHASE_REQUEST_STATUSES.REJECTED &&
        header.status !== PURCHASE_REQUEST_STATUSES.CANCELLED,
      activity: [],
    };
  }

  private async audit(
    context: CurrentBusinessContext,
    entityId: string,
    action: string,
    references: Record<string, string | null | undefined>
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

export function createDefaultPurchaseRequestDependencies(): PurchaseRequestServiceDependencies {
  const controls = createPurchaseRequestControlRepository();
  return {
    requests: createPurchaseRequestRepository(),
    numbering: new ConfigurableDocumentNumberingService(
      createDocumentNumberingPolicyRepository()
    ),
    audit: createProcurementAuditAdapter(),
    workflow: createProcurementRequestWorkflowAdapter(controls),
    controls,
    suggestedSupplier: createSuggestedSupplierAdapter(),
    reorderOrigin: createInventoryReorderOriginAdapter(),
  };
}

export function createPurchaseRequestService(
  deps: PurchaseRequestServiceDependencies = createDefaultPurchaseRequestDependencies()
) {
  return new PurchaseRequestService(deps);
}
