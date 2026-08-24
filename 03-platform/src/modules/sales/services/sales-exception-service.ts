/**
 * Purpose:
 * BP-006 IP-04 cancellation, return/replace initiation, and versioned amendment.
 * Emits financial and stock instructions. Does not refund or move stock.
 *
 * Implementation Package:
 * BP-006 / IP-04 – Amendments, Cancellation & Returns
 */

import { CommercialError } from "@/modules/commercial";
import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  SALES_AUDIT_ACTIONS,
  SALES_DISPOSITION_TYPES,
  SALES_INSTRUCTION_STATUS_CODES,
} from "@/modules/sales/constants";
import { SalesOrderError, SALES_ERROR_CODES, SALES_USER_MESSAGES } from "@/modules/sales/errors";
import type {
  CommercialContractPort,
  SalesAuditPort,
  SalesDispositionPolicy,
  SalesExceptionRepositoryPort,
  SalesOrderLineRecord,
  SalesOrderRepositoryPort,
} from "@/modules/sales/ports";
import {
  assertCancellableStatus,
  assertCancellationReason,
  assertDispositionQuantity,
  assertReturnReason,
  cancelRequiresSod,
  dispositionPolicy,
  emitsStockInstruction,
  isLineDispositionType,
} from "@/modules/sales/services/exception-rules";
import { parseQuantity } from "@/modules/sales/services/order-lifecycle-rules";
import {
  assertOfferingMatchesSnapshot,
  assertQuantityMatchesSnapshot,
  assertSegregationOfDuties,
  copiedExpectedAmountFromContract,
  sumExpectedPayables,
} from "@/modules/sales/services/sales-order-rules";
import {
  SalesOrderService,
  createDefaultSalesOrderDependencies,
} from "@/modules/sales/services/sales-order-service";
import type {
  FinancialInstructionContract,
  InitiateLineDispositionInput,
  ProposeAmendmentInput,
  RequestCancellationInput,
  SalesOrderDetailView,
  StockReturnInstructionContract,
} from "@/modules/sales/types";

export type SalesExceptionServiceDependencies = {
  orders: SalesOrderRepositoryPort;
  exceptions: SalesExceptionRepositoryPort;
  sales: SalesOrderService;
  commercial: CommercialContractPort;
  audit?: SalesAuditPort | null;
  policy?: Partial<SalesDispositionPolicy>;
};

export class SalesExceptionService {
  constructor(private readonly deps: SalesExceptionServiceDependencies) {}

  async requestCancellation(
    context: CurrentBusinessContext,
    input: RequestCancellationInput
  ): Promise<SalesOrderDetailView> {
    this.assertContext(context);
    const detail = await this.deps.sales.getOrder(context, input.orderId);
    assertCancellableStatus(detail.status);
    const policy = this.policy();
    const reasonCode = assertCancellationReason(policy, input.reasonCode);
    const existing = (await this.deps.exceptions.listInstructionsByOrder(
      context.businessId,
      input.orderId
    )).find(
      (row) =>
        row.instructionType === SALES_DISPOSITION_TYPES.CANCEL &&
        row.status === SALES_INSTRUCTION_STATUS_CODES.PROPOSED
    );
    if (existing) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.DISPOSITION_NOT_PENDING,
        "A cancellation request is already waiting for approval.",
        409,
        { entity: "cancellation" }
      );
    }
    const requiresSod = cancelRequiresSod(detail.status, policy);
    const created = await this.deps.exceptions.insertInstruction({
      businessId: context.businessId,
      salesOrderId: input.orderId,
      salesOrderLineId: null,
      instructionType: SALES_DISPOSITION_TYPES.CANCEL,
      status: requiresSod
        ? SALES_INSTRUCTION_STATUS_CODES.PROPOSED
        : SALES_INSTRUCTION_STATUS_CODES.APPROVED,
      quantity: "0",
      reasonCode,
      comments: input.comments ?? null,
      financialInstructionEmitted: true,
      stockInstructionEmitted: false,
      refundExecuted: false,
      stockMoved: false,
      submittedBy: context.platformUserId,
      submittedAt: new Date(),
      approvedBy: requiresSod ? null : context.platformUserId,
      approvedAt: requiresSod ? null : new Date(),
      rejectedBy: null,
      rejectedAt: null,
      createdBy: context.platformUserId,
    });
    await this.audit(context, input.orderId, SALES_AUDIT_ACTIONS.CANCELLATION_REQUESTED, {
      instructionId: created.id,
      reasonCode,
      refundExecuted: false,
    });
    if (!requiresSod) {
      return this.deps.sales.recognizeCancellation(context, input.orderId, {
        reason: reasonCode,
      });
    }
    return this.deps.sales.getOrder(context, input.orderId);
  }

  async approveCancellation(
    context: CurrentBusinessContext,
    orderId: string
  ): Promise<SalesOrderDetailView> {
    this.assertContext(context);
    const pending = (await this.deps.exceptions.listInstructionsByOrder(
      context.businessId,
      orderId
    )).find(
      (row) =>
        row.instructionType === SALES_DISPOSITION_TYPES.CANCEL &&
        row.status === SALES_INSTRUCTION_STATUS_CODES.PROPOSED
    );
    if (!pending) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.DISPOSITION_NOT_PENDING,
        SALES_USER_MESSAGES.DISPOSITION_NOT_PENDING,
        409,
        { entity: "cancellation" }
      );
    }
    assertSegregationOfDuties(true, pending.submittedBy, context.platformUserId);
    await this.deps.exceptions.updateInstruction(context.businessId, pending.id, {
      status: SALES_INSTRUCTION_STATUS_CODES.APPROVED,
      approvedBy: context.platformUserId,
      approvedAt: new Date(),
    });
    await this.audit(context, orderId, SALES_AUDIT_ACTIONS.DISPOSITION_APPROVED, {
      instructionId: pending.id,
      instructionType: SALES_DISPOSITION_TYPES.CANCEL,
      refundExecuted: false,
    });
    return this.deps.sales.recognizeCancellation(context, orderId, {
      reason: pending.reasonCode,
    });
  }

  async initiateLineDisposition(
    context: CurrentBusinessContext,
    input: InitiateLineDispositionInput
  ): Promise<SalesOrderDetailView> {
    this.assertContext(context);
    const detail = await this.deps.sales.getOrder(context, input.orderId);
    if (detail.status === "CANCELLED") {
      throw new SalesOrderError(
        SALES_ERROR_CODES.ORDER_CANCELLED,
        SALES_USER_MESSAGES.ORDER_CANCELLED,
        409,
        { entity: "return" }
      );
    }
    if (!isLineDispositionType(input.instructionType)) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.INVALID_INPUT,
        "Choose return and replace, return and credit, or cancel remainder.",
        400,
        { field: "instructionType", entity: "return" }
      );
    }
    const line = detail.lines.find((item) => item.id === input.orderLineId);
    if (!line) {
      throw new SalesOrderError(SALES_ERROR_CODES.ORDER_NOT_FOUND, undefined, 404);
    }
    const policy = this.policy();
    const reasonCode = assertReturnReason(policy, input.reasonCode);
    const remaining = parseQuantity(line.openRejectedQuantity);
    const quantity = assertDispositionQuantity({
      requested: input.quantity ?? remaining,
      remainingOpenRejected: remaining,
    });
    const requiresSod = policy.returnRequiresSod;
    const created = await this.deps.exceptions.insertInstruction({
      businessId: context.businessId,
      salesOrderId: input.orderId,
      salesOrderLineId: line.id,
      instructionType: input.instructionType,
      status: requiresSod
        ? SALES_INSTRUCTION_STATUS_CODES.PROPOSED
        : SALES_INSTRUCTION_STATUS_CODES.APPROVED,
      quantity: String(quantity),
      reasonCode,
      comments: input.comments ?? null,
      financialInstructionEmitted: true,
      stockInstructionEmitted: emitsStockInstruction(input.instructionType),
      refundExecuted: false,
      stockMoved: false,
      submittedBy: context.platformUserId,
      submittedAt: new Date(),
      approvedBy: requiresSod ? null : context.platformUserId,
      approvedAt: requiresSod ? null : new Date(),
      rejectedBy: null,
      rejectedAt: null,
      createdBy: context.platformUserId,
    });
    await this.audit(context, input.orderId, SALES_AUDIT_ACTIONS.DISPOSITION_REQUESTED, {
      instructionId: created.id,
      instructionType: input.instructionType,
      quantity,
      refundExecuted: false,
      stockMoved: false,
    });
    if (!requiresSod) {
      return this.deps.sales.applyFulfilmentOutcomes(context, input.orderId);
    }
    return this.deps.sales.getOrder(context, input.orderId);
  }

  async approveDisposition(
    context: CurrentBusinessContext,
    orderId: string,
    instructionId: string
  ): Promise<SalesOrderDetailView> {
    this.assertContext(context);
    const pending = await this.deps.exceptions.findInstructionById(
      context.businessId,
      instructionId
    );
    if (!pending || pending.salesOrderId !== orderId) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.DISPOSITION_NOT_FOUND,
        SALES_USER_MESSAGES.DISPOSITION_NOT_FOUND,
        404,
        { entity: "return" }
      );
    }
    if (pending.status !== SALES_INSTRUCTION_STATUS_CODES.PROPOSED) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.DISPOSITION_NOT_PENDING,
        SALES_USER_MESSAGES.DISPOSITION_NOT_PENDING,
        409,
        { entity: "return" }
      );
    }
    assertSegregationOfDuties(true, pending.submittedBy, context.platformUserId);
    await this.deps.exceptions.updateInstruction(context.businessId, pending.id, {
      status: SALES_INSTRUCTION_STATUS_CODES.APPROVED,
      approvedBy: context.platformUserId,
      approvedAt: new Date(),
    });
    await this.audit(context, orderId, SALES_AUDIT_ACTIONS.DISPOSITION_APPROVED, {
      instructionId: pending.id,
      instructionType: pending.instructionType,
      refundExecuted: false,
      stockMoved: false,
    });
    if (pending.instructionType === SALES_DISPOSITION_TYPES.CANCEL) {
      return this.deps.sales.recognizeCancellation(context, orderId, {
        reason: pending.reasonCode,
      });
    }
    return this.deps.sales.applyFulfilmentOutcomes(context, orderId);
  }

  async proposeAmendment(
    context: CurrentBusinessContext,
    input: ProposeAmendmentInput
  ): Promise<SalesOrderDetailView> {
    this.assertContext(context);
    const detail = await this.deps.sales.getOrder(context, input.orderId);
    if (
      detail.status === "DRAFT" ||
      detail.status === "SUBMITTED_FOR_CONFIRMATION"
    ) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.INVALID_STATUS_TRANSITION,
        "Change a draft sale directly. Versioned amendments apply after confirmation.",
        409,
        { entity: "amendment" }
      );
    }
    if (detail.status === "CANCELLED" || detail.status === "COMPLETED") {
      throw new SalesOrderError(
        SALES_ERROR_CODES.MATERIAL_VALUE_IMMUTABLE,
        SALES_USER_MESSAGES.MATERIAL_VALUE_IMMUTABLE,
        409,
        { entity: "amendment" }
      );
    }
    const line = await this.requireLine(context.businessId, input.orderId, input.orderLineId);
    if (!input.reason.trim()) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.INVALID_INPUT,
        "Add a reason for this change.",
        400,
        { field: "reason", entity: "amendment" }
      );
    }
    assertOfferingMatchesSnapshot(line.offeringId, input.snapshot);
    assertQuantityMatchesSnapshot(input.quantity, input.snapshot);
    let contract;
    try {
      contract = this.deps.commercial.consumeFromSnapshot(context, input.snapshot, {
        expected: input.expected,
        expectedCurrency: detail.currencyCode,
        consumerRef: `bp-006-amend-${input.orderId}-${line.id}`,
      });
      this.deps.commercial.validate(context, contract, input.snapshot);
      this.deps.commercial.verifyIntegrity(context, contract, input.snapshot);
    } catch (error) {
      this.rethrowCommercial(error);
    }
    const proposedExpected = copiedExpectedAmountFromContract(contract);
    const prior = await this.deps.exceptions.listAmendmentsByOrder(
      context.businessId,
      input.orderId
    );
    const requiresSod = this.policy().amendmentRequiresSod;
    const created = await this.deps.exceptions.insertAmendment({
      businessId: context.businessId,
      salesOrderId: input.orderId,
      salesOrderLineId: line.id,
      versionNumber: prior.length + 1,
      status: requiresSod
        ? SALES_INSTRUCTION_STATUS_CODES.PROPOSED
        : SALES_INSTRUCTION_STATUS_CODES.APPROVED,
      reason: input.reason.trim(),
      previousQuantity: line.quantity,
      proposedQuantity: String(input.quantity),
      previousExpectedAmount: detail.expectedAmount,
      proposedExpectedAmount: proposedExpected,
      previousCommercialContractId: line.commercialContractId,
      proposedCommercialContractId: contract.contractId,
      previousSnapshotId: line.snapshotId,
      proposedSnapshotId: input.snapshot.snapshotId,
      snapshotPayload: input.snapshot,
      contractPayload: contract,
      proposedBy: context.platformUserId,
      proposedAt: new Date(),
      approvedBy: requiresSod ? null : context.platformUserId,
      approvedAt: requiresSod ? null : new Date(),
      createdBy: context.platformUserId,
    });
    await this.audit(context, input.orderId, SALES_AUDIT_ACTIONS.AMENDMENT_PROPOSED, {
      amendmentId: created.id,
      previousExpectedAmount: detail.expectedAmount,
      proposedExpectedAmount: proposedExpected,
    });
    if (!requiresSod) {
      return this.applyApprovedAmendment(context, created.id);
    }
    return this.deps.sales.getOrder(context, input.orderId);
  }

  async approveAmendment(
    context: CurrentBusinessContext,
    orderId: string,
    amendmentId: string
  ): Promise<SalesOrderDetailView> {
    this.assertContext(context);
    const pending = await this.deps.exceptions.findAmendmentById(
      context.businessId,
      amendmentId
    );
    if (!pending || pending.salesOrderId !== orderId) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.AMENDMENT_NOT_FOUND,
        SALES_USER_MESSAGES.AMENDMENT_NOT_FOUND,
        404,
        { entity: "amendment" }
      );
    }
    if (pending.status !== SALES_INSTRUCTION_STATUS_CODES.PROPOSED) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.AMENDMENT_NOT_PENDING,
        SALES_USER_MESSAGES.AMENDMENT_NOT_PENDING,
        409,
        { entity: "amendment" }
      );
    }
    assertSegregationOfDuties(true, pending.proposedBy, context.platformUserId);
    await this.deps.exceptions.updateAmendment(context.businessId, pending.id, {
      status: SALES_INSTRUCTION_STATUS_CODES.APPROVED,
      approvedBy: context.platformUserId,
      approvedAt: new Date(),
    });
    await this.audit(context, orderId, SALES_AUDIT_ACTIONS.AMENDMENT_APPROVED, {
      amendmentId: pending.id,
      previousExpectedAmount: pending.previousExpectedAmount,
      proposedExpectedAmount: pending.proposedExpectedAmount,
    });
    return this.applyApprovedAmendment(context, pending.id);
  }

  async getFinancialInstruction(
    context: CurrentBusinessContext,
    orderId: string
  ): Promise<FinancialInstructionContract> {
    const detail = await this.deps.sales.getOrder(context, orderId);
    const approved = (detail.dispositions ?? []).filter(
      (row) => row.status === SALES_INSTRUCTION_STATUS_CODES.APPROVED
    );
    const type = approved[0]?.instructionType ?? "NONE";
    return {
      orderId: detail.id,
      orderNumber: detail.orderNumber,
      businessId: detail.businessId,
      instructionType: type,
      expectedAmount: detail.expectedAmount,
      currency: detail.currencyCode,
      refundExecuted: false,
      paymentRecorded: false,
    };
  }

  async getStockReturnInstruction(
    context: CurrentBusinessContext,
    orderId: string
  ): Promise<StockReturnInstructionContract> {
    const detail = await this.deps.sales.getOrder(context, orderId);
    return {
      orderId: detail.id,
      orderNumber: detail.orderNumber,
      businessId: detail.businessId,
      inventoryExecuted: false,
      stockMoved: false,
      lines: (detail.dispositions ?? [])
        .filter(
          (row) =>
            row.status === SALES_INSTRUCTION_STATUS_CODES.APPROVED &&
            row.stockInstructionEmitted &&
            row.orderLineId
        )
        .map((row) => ({
          orderLineId: row.orderLineId!,
          quantity: row.quantity,
          instructionType: row.instructionType,
        })),
    };
  }

  private async applyApprovedAmendment(
    context: CurrentBusinessContext,
    amendmentId: string
  ): Promise<SalesOrderDetailView> {
    const amendment = await this.deps.exceptions.findAmendmentById(
      context.businessId,
      amendmentId
    );
    if (!amendment) {
      throw new SalesOrderError(SALES_ERROR_CODES.AMENDMENT_NOT_FOUND, undefined, 404);
    }
    const order = await this.deps.orders.findById(
      context.businessId,
      amendment.salesOrderId
    );
    if (!order) {
      throw new SalesOrderError(SALES_ERROR_CODES.ORDER_NOT_FOUND, undefined, 404);
    }
    try {
      this.deps.commercial.validate(
        context,
        amendment.contractPayload,
        amendment.snapshotPayload
      );
      this.deps.commercial.verifyIntegrity(
        context,
        amendment.contractPayload,
        amendment.snapshotPayload
      );
    } catch (error) {
      this.rethrowCommercial(error);
    }
    const expected = copiedExpectedAmountFromContract(amendment.contractPayload);
    const unitValue = String(
      amendment.snapshotPayload.resolution.basePrice.unitPrice
    );
    await this.deps.orders.updateLine(context.businessId, amendment.salesOrderLineId, {
      quantity: amendment.proposedQuantity,
      commercialLineAmount: expected,
      lineTotal: expected,
      agreedUnitValue: unitValue,
      unitPrice: unitValue,
      snapshotId: amendment.proposedSnapshotId,
      commercialContractId: amendment.proposedCommercialContractId,
      commercialBreakdown: amendment.contractPayload.breakdown,
    });
    const links = await this.deps.orders.listCommercialLinks(
      context.businessId,
      amendment.salesOrderId
    );
    const link = links.find((row) => row.salesOrderLineId === amendment.salesOrderLineId);
    if (link) {
      await this.deps.orders.updateCommercialLink(context.businessId, link.id, {
        snapshotId: amendment.proposedSnapshotId,
        commercialContractId: amendment.proposedCommercialContractId,
        expectedPayable: expected,
        integrityHash: amendment.contractPayload.integrity.snapshotIntegrityHash,
        snapshotPayload: amendment.snapshotPayload,
        contractPayload: amendment.contractPayload,
        consumedAt: new Date(),
      });
    }
    const refreshedLinks = await this.deps.orders.listCommercialLinks(
      context.businessId,
      amendment.salesOrderId
    );
    const headerExpected = sumExpectedPayables(
      refreshedLinks.map((row) => row.expectedPayable),
      order.currencyCode
    );
    await this.deps.orders.update(context.businessId, amendment.salesOrderId, {
      expectedAmount: headerExpected,
      grandTotal: headerExpected,
      commercialContractId: amendment.proposedCommercialContractId,
      snapshotId: amendment.proposedSnapshotId,
      updatedBy: context.platformUserId,
    });
    return this.deps.sales.applyFulfilmentOutcomes(context, amendment.salesOrderId);
  }

  private policy(): SalesDispositionPolicy {
    return dispositionPolicy(this.deps.policy);
  }

  private assertContext(context: CurrentBusinessContext): void {
    if (!context?.businessId?.trim()) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.BUSINESS_CONTEXT_REQUIRED,
        SALES_USER_MESSAGES.BUSINESS_CONTEXT_REQUIRED,
        403
      );
    }
  }

  private async requireLine(
    businessId: string,
    orderId: string,
    lineId: string
  ): Promise<SalesOrderLineRecord> {
    const lines = await this.deps.orders.listLines(businessId, orderId);
    const line = lines.find((row) => row.id === lineId);
    if (!line) {
      throw new SalesOrderError(SALES_ERROR_CODES.ORDER_NOT_FOUND, undefined, 404);
    }
    return line;
  }

  private async audit(
    context: CurrentBusinessContext,
    orderId: string,
    action: string,
    references: Record<string, unknown>
  ) {
    if (!this.deps.audit) {
      return;
    }
    await this.deps.audit.record({
      businessId: context.businessId,
      actorUserId: context.platformUserId ?? null,
      orderId,
      partyId: null,
      operation: action,
      action,
      outcome: "SUCCESS",
      references,
    });
  }

  private rethrowCommercial(error: unknown): never {
    if (error instanceof SalesOrderError) {
      throw error;
    }
    if (error instanceof CommercialError) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.COMMERCIAL_CONTRACT_INVALID,
        SALES_USER_MESSAGES.COMMERCIAL_CONTRACT_INVALID,
        409,
        { entity: "commercial total" }
      );
    }
    throw new SalesOrderError(
      SALES_ERROR_CODES.COMMERCIAL_CONTRACT_INVALID,
      SALES_USER_MESSAGES.COMMERCIAL_CONTRACT_INVALID,
      409,
      { entity: "commercial total" }
    );
  }
}

export function createSalesExceptionService(deps: SalesExceptionServiceDependencies) {
  return new SalesExceptionService(deps);
}

export function createDefaultSalesExceptionService() {
  const deps = createDefaultSalesOrderDependencies();
  const exceptions = deps.exceptions;
  if (!exceptions) {
    throw new SalesOrderError(
      SALES_ERROR_CODES.PROVIDER_ERROR,
      "Cancellation and returns are not available.",
      500
    );
  }
  return new SalesExceptionService({
    orders: deps.orders,
    exceptions,
    sales: new SalesOrderService(deps),
    commercial: deps.commercial,
    audit: deps.audit,
  });
}
