/**
 * Purpose:
 * BP-006 sales/order orchestration — create, convert, draft edit,
 * consume BP-005 contract, confirm with maker-checker, manage lifecycle
 * and completion gates, expose handoff contracts.
 *
 * Implementation Package:
 * BP-006 / IP-01 – Sales & Order Creation
 * BP-006 / IP-02 – Order Lifecycle & Fulfilment
 * BP-006 / IP-03 – Delivery, Inspection & Service Completion
 * BP-006 / IP-04 – Amendments, Cancellation & Returns
 * BP-006 / IP-05 – Downstream Handoff & Sales Workspace
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import { CommercialError } from "@/modules/commercial";
import { canConvertQuotationToOrder } from "@/modules/crm/quotation/services/quotation-rules";
import {
  createBp005CommercialResolveAdapter,
  createSalesCommercialContractAdapter,
} from "@/modules/sales/adapters/commercial-contract-adapter";
import { createSalesCompletionChecklistAdapter } from "@/modules/sales/adapters/completion-checklist-adapter";
import { createPersistedFulfilmentOutcomeAdapter } from "@/modules/sales/adapters/delivery-outcome-adapter";
import { createUnavailableFulfilmentOutcomeAdapter } from "@/modules/sales/adapters/fulfilment-outcome-adapter";
import {
  createPersistedOrderDispositionAdapter,
  createUnavailableOrderDispositionAdapter,
} from "@/modules/sales/adapters/order-disposition-adapter";
import {
  createOfferingLookupAdapter,
  createPartyLookupAdapter,
  createQuotationLookupAdapter,
} from "@/modules/sales/adapters/master-lookup-adapter";
import { createSalesDeliveryRepository } from "@/modules/sales/repositories/sales-delivery-repository";
import { createSalesExceptionRepository } from "@/modules/sales/repositories/sales-exception-repository";
import { createSalesOrderRepository } from "@/modules/sales/repositories/sales-order-repository";
import { createSalesAuditAdapter } from "@/modules/sales/services/sales-order-audit-helper";
import {
  SALES_AUDIT_ACTIONS,
  SALES_COMPLETION_POLICY,
  SALES_CONFIRMATION_POLICY,
  SALES_INSPECTION_STATUS_CODES,
  SALES_ORDER_HANDOFF_STATUS_CODES,
  SALES_ORDER_NUMBER_PREFIX,
  SALES_ORDER_SOURCE_TYPES,
  SALES_ORDER_STATUS_CODES,
  SALES_PAYMENT_STATUS_CODES,
  SALES_SERVICE_COMPLETION_STATUS_CODES,
} from "@/modules/sales/constants";
import { SalesOrderError, SALES_ERROR_CODES, SALES_USER_MESSAGES } from "@/modules/sales/errors";
import type {
  CommercialContractPort,
  CommercialResolvePort,
  CompletionChecklistPort,
  FulfilmentOutcomePort,
  OfferingLookupPort,
  OfferingLookupResult,
  OrderDispositionPort,
  PartyLookupPort,
  QuotationLookupPort,
  SalesAuditPort,
  SalesOrderCommercialLinkInsert,
  SalesOrderLineInsert,
  SalesOrderLineRecord,
  SalesOrderRecord,
  SalesDeliveryRepositoryPort,
  SalesExceptionRepositoryPort,
  SalesOrderRepositoryPort,
} from "@/modules/sales/ports";
import { deliveryEventStatusLabel } from "@/modules/sales/services/delivery-rules";
import {
  amendmentStatusLabel,
  dispositionTypeLabel,
  instructionStatusLabel,
} from "@/modules/sales/services/exception-rules";
import {
  assertCurrencyMatches,
  assertDraftEditable,
  assertExpectedCopiedNotInvented,
  assertIp01DoesNotAdvanceFulfilment,
  assertOfferingMatchesSnapshot,
  assertQuantityMatchesSnapshot,
  assertRequiredLines,
  assertSalesOrderTransition,
  assertSameBusiness,
  assertSegregationOfDuties,
  assertValidQuantity,
  copiedExpectedAmountFromContract,
  isConfirmedStatus,
  isDraftStatus,
  isSubmittedStatus,
  lineTypeFromProductType,
  salesStatusLabel,
  sumExpectedPayables,
} from "@/modules/sales/services/sales-order-rules";
import {
  assertCancellationAuthorized,
  assertCompletionEligible,
  assertFulfilmentProgressionAllowed,
  assertSalesLifecycleTransition,
  buildCompletionReadiness,
  buildNextActionReadiness,
  customerStatusLabel,
  deriveOperationalHeaderStatus,
  deriveOrderLineFulfilment,
  formatQuantity,
  isCancelledStatus,
  isCompletedStatus,
  nextActionForLifecycle,
  normalizeLifecycleTarget,
  parseQuantity,
  sumLineQuantities,
  walkLifecycleSteps,
  type DerivedLineFulfilment,
} from "@/modules/sales/services/order-lifecycle-rules";
import {
  appendOperationalNote,
  assertOperationalNoteBody,
  isInspectionPendingStatus,
  isServiceRemainingStatus,
  parseOperationalNotes,
  paymentStatusLabel,
  toBookingHandoffContract,
  toFinancialInstructionContract,
  toFulfilmentHandoffContract,
  toPaymentReadyContract,
  toStockReturnInstructionContract,
  workspaceFlags,
} from "@/modules/sales/services/handoff-rules";
import type {
  AddOperationalNoteInput,
  ConvertQuotationInput,
  CreateDirectSaleInput,
  CreateDirectSaleLineInput,
  InventoryFulfilmentHandoffContract,
  SalesDownstreamHandoffContract,
  PaymentReadyOrderContract,
  RecognizeCancellationInput,
  RejectCompletionInput,
  RejectConfirmationInput,
  SalesCompletionPolicy,
  SalesConfirmationPolicy,
  SalesOrderDetailView,
  SalesDashboardView,
  TransitionOrderInput,
  UpdateDraftSaleInput,
} from "@/modules/sales/types";

export type SalesOrderServiceDependencies = {
  orders: SalesOrderRepositoryPort;
  parties: PartyLookupPort;
  offerings: OfferingLookupPort;
  quotations: QuotationLookupPort;
  commercial: CommercialContractPort;
  commercialResolver?: CommercialResolvePort | null;
  audit?: SalesAuditPort | null;
  confirmationPolicy?: SalesConfirmationPolicy;
  completionPolicy?: SalesCompletionPolicy;
  fulfilmentOutcomes?: FulfilmentOutcomePort;
  disposition?: OrderDispositionPort;
  completionChecklist?: CompletionChecklistPort;
  deliveries?: SalesDeliveryRepositoryPort | null;
  exceptions?: SalesExceptionRepositoryPort | null;
};

export class SalesOrderService {
  constructor(private readonly deps: SalesOrderServiceDependencies) {}

  async createDirectSale(
    context: CurrentBusinessContext,
    input: CreateDirectSaleInput
  ): Promise<SalesOrderDetailView> {
    this.assertContext(context);
    const customer = await this.requireCustomer(context.businessId, input.customerPartyId);
    const prepared = await this.prepareLines(
      context,
      customer.id,
      input.currencyCode,
      input.lines,
      `bp-006-direct-${customer.id}`
    );

    const orderNumber = await this.generateOrderNumber(context.businessId);
    const created = await this.deps.orders.insert({
      businessId: context.businessId,
      orderNumber,
      sourceType: SALES_ORDER_SOURCE_TYPES.DIRECT,
      quotationId: null,
      quotationVersionId: null,
      crmRecordId: input.crmRecordId ?? null,
      partyId: customer.id,
      accountId: null,
      opportunityId: null,
      status: SALES_ORDER_STATUS_CODES.DRAFT,
      currencyCode: prepared.currencyCode,
      orderDate: input.orderDate ? new Date(input.orderDate) : new Date(),
      expectedAmount: prepared.expectedAmount,
      subtotal: prepared.principalAmount,
      taxAmount: prepared.taxAmount,
      grandTotal: prepared.expectedAmount,
      commercialContractId: prepared.primaryContractId,
      snapshotId: prepared.primarySnapshotId,
      confirmationRequiresSod: this.policy().requiresSegregationOfDuties,
      completionRequiresSod: this.completionPolicy().requiresSegregationOfDuties,
      submittedBy: null,
      submittedAt: null,
      confirmedBy: null,
      confirmedAt: null,
      confirmationRejectedBy: null,
      confirmationRejectedAt: null,
      confirmationRejectedReason: null,
      handoffStatus: SALES_ORDER_HANDOFF_STATUS_CODES.PENDING,
      paymentStatus: SALES_PAYMENT_STATUS_CODES.NOT_RECORDED,
      metadata: { source: SALES_ORDER_SOURCE_TYPES.DIRECT },
      createdBy: context.platformUserId,
      updatedBy: context.platformUserId,
    });

    await this.persistPrepared(context.businessId, created.id, prepared);
    await this.audit(context, created.id, customer.id, SALES_AUDIT_ACTIONS.ORDER_CREATED, {
      orderNumber,
      sourceType: SALES_ORDER_SOURCE_TYPES.DIRECT,
    });
    return this.getOrder(context, created.id);
  }

  async convertFromQuotation(
    context: CurrentBusinessContext,
    input: ConvertQuotationInput
  ): Promise<SalesOrderDetailView> {
    this.assertContext(context);
    const quotation = await this.deps.quotations.findInBusiness(
      context.businessId,
      input.quotationId
    );
    if (!quotation) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.QUOTATION_NOT_FOUND,
        SALES_USER_MESSAGES.QUOTATION_NOT_FOUND,
        404,
        {
          entity: "quotation",
          nextAction: "Open quotations for this business and choose an accepted quotation.",
        }
      );
    }
    assertSameBusiness(
      context.businessId,
      quotation.businessId,
      SALES_ERROR_CODES.QUOTATION_NOT_IN_BUSINESS,
      "quotation"
    );
    if (!canConvertQuotationToOrder(quotation.status, quotation.validUntil)) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.QUOTATION_NOT_ELIGIBLE,
        SALES_USER_MESSAGES.QUOTATION_NOT_ELIGIBLE,
        409,
        {
          field: "status",
          entity: "quotation",
          nextAction: "Accept the quotation first, or start a new sale.",
        }
      );
    }

    const existing = await this.deps.orders.findByQuotationId(
      context.businessId,
      quotation.id
    );
    if (existing) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.QUOTATION_ALREADY_CONVERTED,
        SALES_USER_MESSAGES.QUOTATION_ALREADY_CONVERTED,
        409,
        {
          entity: "quotation",
          nextAction: "Open the existing sale instead of converting again.",
        }
      );
    }

    await this.requireCustomer(context.businessId, quotation.partyId);
    assertRequiredLines(quotation.lines.length);

    const lineInputs =
      input.lineSnapshots && input.lineSnapshots.length > 0
        ? input.lineSnapshots
        : await this.resolveQuotationLineContracts(context, quotation);

    const prepared = await this.prepareLines(
      context,
      quotation.partyId,
      quotation.currencyCode,
      lineInputs,
      `bp-006-quote-${quotation.id}`
    );

    const orderNumber = await this.generateOrderNumber(context.businessId);
    const created = await this.deps.orders.insert({
      businessId: context.businessId,
      orderNumber,
      sourceType: SALES_ORDER_SOURCE_TYPES.QUOTATION,
      quotationId: quotation.id,
      quotationVersionId: quotation.currentVersionId,
      crmRecordId: quotation.crmRecordId,
      partyId: quotation.partyId,
      accountId: quotation.accountId,
      opportunityId: quotation.opportunityId,
      status: SALES_ORDER_STATUS_CODES.DRAFT,
      currencyCode: prepared.currencyCode,
      orderDate: new Date(),
      expectedAmount: prepared.expectedAmount,
      subtotal: prepared.principalAmount,
      taxAmount: prepared.taxAmount,
      grandTotal: prepared.expectedAmount,
      commercialContractId: prepared.primaryContractId,
      snapshotId: prepared.primarySnapshotId,
      confirmationRequiresSod: this.policy().requiresSegregationOfDuties,
      completionRequiresSod: this.completionPolicy().requiresSegregationOfDuties,
      submittedBy: null,
      submittedAt: null,
      confirmedBy: null,
      confirmedAt: null,
      confirmationRejectedBy: null,
      confirmationRejectedAt: null,
      confirmationRejectedReason: null,
      handoffStatus: SALES_ORDER_HANDOFF_STATUS_CODES.PENDING,
      paymentStatus: SALES_PAYMENT_STATUS_CODES.NOT_RECORDED,
      metadata: {
        source: SALES_ORDER_SOURCE_TYPES.QUOTATION,
        quotationNumber: quotation.quotationNumber,
      },
      createdBy: context.platformUserId,
      updatedBy: context.platformUserId,
    });

    const withQuotationLineIds = {
      ...prepared,
      lineInserts: prepared.lineInserts.map((line, index) => ({
        ...line,
        quotationLineId: quotation.lines[index]?.id ?? line.quotationLineId,
      })),
    };
    await this.persistPrepared(context.businessId, created.id, withQuotationLineIds);
    await this.audit(context, created.id, quotation.partyId, SALES_AUDIT_ACTIONS.ORDER_CREATED, {
      orderNumber,
      sourceType: SALES_ORDER_SOURCE_TYPES.QUOTATION,
      quotationId: quotation.id,
    });
    return this.getOrder(context, created.id);
  }

  async updateDraft(
    context: CurrentBusinessContext,
    orderId: string,
    input: UpdateDraftSaleInput
  ): Promise<SalesOrderDetailView> {
    this.assertContext(context);
    const order = await this.requireOrder(context.businessId, orderId);
    assertDraftEditable(order.status);

    if (input.lines && input.lines.length > 0) {
      const prepared = await this.prepareLines(
        context,
        order.partyId ?? "",
        input.currencyCode ?? order.currencyCode,
        input.lines,
        `bp-006-draft-${order.id}`
      );
      await this.deps.orders.update(context.businessId, order.id, {
        currencyCode: prepared.currencyCode,
        expectedAmount: prepared.expectedAmount,
        subtotal: prepared.principalAmount,
        taxAmount: prepared.taxAmount,
        grandTotal: prepared.expectedAmount,
        commercialContractId: prepared.primaryContractId,
        snapshotId: prepared.primarySnapshotId,
        orderDate: input.orderDate ? new Date(input.orderDate) : order.orderDate,
        updatedBy: context.platformUserId,
      });
      await this.persistPrepared(context.businessId, order.id, prepared);
    } else if (input.orderDate) {
      await this.deps.orders.update(context.businessId, order.id, {
        orderDate: new Date(input.orderDate),
        updatedBy: context.platformUserId,
      });
    }

    await this.audit(context, order.id, order.partyId, SALES_AUDIT_ACTIONS.ORDER_UPDATED, {
      orderNumber: order.orderNumber,
    });
    return this.getOrder(context, order.id);
  }

  async submitConfirmation(
    context: CurrentBusinessContext,
    orderId: string
  ): Promise<SalesOrderDetailView> {
    this.assertContext(context);
    const order = await this.requireOrder(context.businessId, orderId);
    if (isConfirmedStatus(order.status)) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.ORDER_ALREADY_CONFIRMED,
        SALES_USER_MESSAGES.ORDER_ALREADY_CONFIRMED,
        409,
        { entity: "sale" }
      );
    }
    await this.assertCommercialIntegrity(context, order);
    assertSalesOrderTransition(
      order.status,
      SALES_ORDER_STATUS_CODES.SUBMITTED_FOR_CONFIRMATION
    );
    await this.deps.orders.update(context.businessId, order.id, {
      status: SALES_ORDER_STATUS_CODES.SUBMITTED_FOR_CONFIRMATION,
      submittedBy: context.platformUserId,
      submittedAt: new Date(),
      confirmationRejectedBy: null,
      confirmationRejectedAt: null,
      confirmationRejectedReason: null,
      updatedBy: context.platformUserId,
    });
    await this.audit(
      context,
      order.id,
      order.partyId,
      SALES_AUDIT_ACTIONS.ORDER_SUBMITTED_FOR_CONFIRMATION,
      { orderNumber: order.orderNumber }
    );
    return this.getOrder(context, order.id);
  }

  async approveConfirmation(
    context: CurrentBusinessContext,
    orderId: string
  ): Promise<SalesOrderDetailView> {
    this.assertContext(context);
    const order = await this.requireOrder(context.businessId, orderId);
    if (isConfirmedStatus(order.status)) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.ORDER_ALREADY_CONFIRMED,
        SALES_USER_MESSAGES.ORDER_ALREADY_CONFIRMED,
        409,
        { entity: "sale" }
      );
    }
    const requiresSod = order.confirmationRequiresSod;
    const target = SALES_ORDER_STATUS_CODES.CONFIRMED;
    if (requiresSod) {
      if (!isSubmittedStatus(order.status)) {
        throw new SalesOrderError(
          SALES_ERROR_CODES.CONFIRMATION_NOT_PENDING,
          SALES_USER_MESSAGES.CONFIRMATION_NOT_PENDING,
          409,
          {
            entity: "confirmation",
            nextAction: "Submit this sale for confirmation first.",
          }
        );
      }
      assertSegregationOfDuties(
        true,
        order.submittedBy ?? order.createdBy,
        context.platformUserId
      );
    } else if (!isDraftStatus(order.status) && !isSubmittedStatus(order.status)) {
      assertSalesOrderTransition(order.status, target);
    }
    assertIp01DoesNotAdvanceFulfilment(target);
    await this.assertCommercialIntegrity(context, order);
    await this.deps.orders.update(context.businessId, order.id, {
      status: target,
      confirmedBy: context.platformUserId,
      confirmedAt: new Date(),
      handoffStatus: SALES_ORDER_HANDOFF_STATUS_CODES.READY,
      updatedBy: context.platformUserId,
    });
    await this.audit(context, order.id, order.partyId, SALES_AUDIT_ACTIONS.ORDER_CONFIRMED, {
      orderNumber: order.orderNumber,
      expectedAmount: order.expectedAmount,
    });
    return this.getOrder(context, order.id);
  }

  async rejectConfirmation(
    context: CurrentBusinessContext,
    orderId: string,
    input: RejectConfirmationInput = {}
  ): Promise<SalesOrderDetailView> {
    this.assertContext(context);
    const order = await this.requireOrder(context.businessId, orderId);
    if (!isSubmittedStatus(order.status)) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.CONFIRMATION_NOT_PENDING,
        SALES_USER_MESSAGES.CONFIRMATION_NOT_PENDING,
        409,
        { entity: "confirmation" }
      );
    }
    assertSegregationOfDuties(
      order.confirmationRequiresSod,
      order.submittedBy ?? order.createdBy,
      context.platformUserId
    );
    assertSalesOrderTransition(order.status, SALES_ORDER_STATUS_CODES.DRAFT);
    await this.deps.orders.update(context.businessId, order.id, {
      status: SALES_ORDER_STATUS_CODES.DRAFT,
      confirmationRejectedBy: context.platformUserId,
      confirmationRejectedAt: new Date(),
      confirmationRejectedReason: input.reason ?? null,
      submittedBy: null,
      submittedAt: null,
      updatedBy: context.platformUserId,
    });
    await this.audit(
      context,
      order.id,
      order.partyId,
      SALES_AUDIT_ACTIONS.ORDER_CONFIRMATION_REJECTED,
      { orderNumber: order.orderNumber, reason: input.reason ?? null }
    );
    return this.getOrder(context, order.id);
  }

  async getByQuotationId(
    context: CurrentBusinessContext,
    quotationId: string
  ): Promise<SalesOrderDetailView | null> {
    this.assertContext(context);
    const existing = await this.deps.orders.findByQuotationId(
      context.businessId,
      quotationId
    );
    if (!existing) {
      return null;
    }
    return this.toDetailView(context.businessId, existing, context.platformUserId);
  }

  async getOrder(
    context: CurrentBusinessContext,
    orderId: string
  ): Promise<SalesOrderDetailView> {
    this.assertContext(context);
    const order = await this.requireOrder(context.businessId, orderId);
    return this.toDetailView(context.businessId, order, context.platformUserId);
  }

  async getDashboard(context: CurrentBusinessContext): Promise<SalesDashboardView> {
    this.assertContext(context);
    const orders = await this.deps.orders.listByBusiness(context.businessId);
    const summaries = await Promise.all(
      orders.map(async (order) => this.toSummaryView(context.businessId, order))
    );
    const expectedSalesValue = sumExpectedPayables(
      orders.map((row) => row.expectedAmount),
      orders[0]?.currencyCode ?? "KES"
    );
    return {
      draftCount: orders.filter((row) => isDraftStatus(row.status)).length,
      submittedCount: orders.filter((row) => isSubmittedStatus(row.status)).length,
      confirmedCount: orders.filter((row) => isConfirmedStatus(row.status)).length,
      inProgressCount: orders.filter(
        (row) =>
          row.status === SALES_ORDER_STATUS_CODES.IN_PROGRESS ||
          row.status === SALES_ORDER_STATUS_CODES.PARTIALLY_FULFILLED
      ).length,
      completedCount: orders.filter((row) => isCompletedStatus(row.status)).length,
      cancelledCount: orders.filter((row) => isCancelledStatus(row.status)).length,
      outstandingFulfilmentCount: summaries.filter(
        (row) =>
          Number(row.outstandingQuantity) > 0 &&
          row.status !== SALES_ORDER_STATUS_CODES.CANCELLED &&
          !isDraftStatus(row.status) &&
          !isSubmittedStatus(row.status)
      ).length,
      inspectionPendingCount: summaries.filter((row) => row.inspectionPending).length,
      serviceRemainingCount: summaries.filter((row) => row.serviceRemaining).length,
      convertedQuoteCount: summaries.filter((row) => row.convertedFromQuote).length,
      expectedSalesValue,
      paymentCollectionAvailable: false,
      paymentStatusLabel: paymentStatusLabel(),
      recentOrders: summaries,
    };
  }

  async getPaymentReadyContract(
    context: CurrentBusinessContext,
    orderId: string
  ): Promise<PaymentReadyOrderContract> {
    const detail = await this.getOrder(context, orderId);
    return toPaymentReadyContract(detail);
  }

  async prepareCommercial(
    context: CurrentBusinessContext,
    input: {
      customerPartyId: string;
      offeringId: string;
      quantity: number;
      currencyCode: string;
    }
  ) {
    this.assertContext(context);
    await this.requireCustomer(context.businessId, input.customerPartyId);
    await this.requireOffering(context.businessId, input.offeringId);
    assertValidQuantity(input.quantity);
    if (!this.deps.commercialResolver) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.COMMERCIAL_CONTRACT_REQUIRED,
        SALES_USER_MESSAGES.COMMERCIAL_CONTRACT_REQUIRED,
        400,
        { entity: "commercial total" }
      );
    }
    try {
      return await this.deps.commercialResolver.resolveAndConsume(context, {
        offeringId: input.offeringId,
        partyId: input.customerPartyId,
        currencyCode: input.currencyCode.trim().toUpperCase(),
        quantity: input.quantity,
        consumerRef: `bp-006-prepare-${input.offeringId}`,
      });
    } catch (error) {
      this.rethrowCommercial(error);
    }
  }

  async getFulfilmentHandoffContract(
    context: CurrentBusinessContext,
    orderId: string
  ): Promise<InventoryFulfilmentHandoffContract> {
    const detail = await this.getOrder(context, orderId);
    return toFulfilmentHandoffContract(detail);
  }

  async getDownstreamHandoff(
    context: CurrentBusinessContext,
    orderId: string
  ): Promise<SalesDownstreamHandoffContract> {
    const detail = await this.getOrder(context, orderId);
    return {
      payment: toPaymentReadyContract(detail),
      fulfilment: toFulfilmentHandoffContract(detail),
      financialInstruction: toFinancialInstructionContract(detail),
      stockReturnInstruction: toStockReturnInstructionContract(detail),
      booking: toBookingHandoffContract(detail),
      paymentCollectionAvailable: false,
      inventoryExecuted: false,
      schedulerExecuted: false,
    };
  }

  async addOperationalNote(
    context: CurrentBusinessContext,
    input: AddOperationalNoteInput
  ): Promise<SalesOrderDetailView> {
    this.assertContext(context);
    const order = await this.requireOrder(context.businessId, input.orderId);
    const body = assertOperationalNoteBody(input.body);
    if (input.orderLineId) {
      const lines = await this.deps.orders.listLines(context.businessId, order.id);
      if (!lines.some((line) => line.id === input.orderLineId)) {
        throw new SalesOrderError(SALES_ERROR_CODES.ORDER_NOT_FOUND, undefined, 404);
      }
    }
    const note = {
      id: crypto.randomUUID(),
      orderLineId: input.orderLineId ?? null,
      body,
      createdBy: context.platformUserId,
      createdAt: new Date().toISOString(),
    };
    await this.deps.orders.update(context.businessId, order.id, {
      metadata: appendOperationalNote(order.metadata, note),
      updatedBy: context.platformUserId,
    });
    await this.audit(context, order.id, order.partyId, SALES_AUDIT_ACTIONS.NOTE_ADDED, {
      noteId: note.id,
      orderLineId: note.orderLineId,
    });
    return this.getOrder(context, order.id);
  }

  async applyFulfilmentOutcomes(
    context: CurrentBusinessContext,
    orderId: string
  ): Promise<SalesOrderDetailView> {
    this.assertContext(context);
    const order = await this.requireOrder(context.businessId, orderId);
    if (isCancelledStatus(order.status) || isCompletedStatus(order.status)) {
      return this.toDetailView(context.businessId, order, context.platformUserId);
    }
    const projection = await this.projectFulfilment(context.businessId, order);
    const desired = deriveOperationalHeaderStatus(order.status, projection.lines);
    const steps = walkLifecycleSteps(order.status, desired);
    let current = order;
    for (const step of steps) {
      await this.persistLifecycleTransition(
        context,
        current,
        step,
        "Delivery and service results updated the sale status."
      );
      current = await this.requireOrder(context.businessId, orderId);
    }
    return this.getOrder(context, orderId);
  }

  async transitionOrder(
    context: CurrentBusinessContext,
    orderId: string,
    input: TransitionOrderInput
  ): Promise<SalesOrderDetailView> {
    this.assertContext(context);
    const order = await this.requireOrder(context.businessId, orderId);
    const target = normalizeLifecycleTarget(input.targetStatus);
    if (target === SALES_ORDER_STATUS_CODES.COMPLETED) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.INVALID_STATUS_TRANSITION,
        "Complete this sale through the completion check, not a direct status change.",
        409,
        { field: "status", entity: "sale" }
      );
    }
    if (target === SALES_ORDER_STATUS_CODES.CANCELLED) {
      return this.recognizeCancellation(context, orderId, { reason: input.reason });
    }
    const projection = await this.projectFulfilment(context.businessId, order);
    this.assertTransitionPreconditions(order.status, target, projection);
    await this.persistLifecycleTransition(context, order, target, input.reason);
    return this.getOrder(context, orderId);
  }

  async recognizeCancellation(
    context: CurrentBusinessContext,
    orderId: string,
    input: RecognizeCancellationInput = {}
  ): Promise<SalesOrderDetailView> {
    this.assertContext(context);
    const order = await this.requireOrder(context.businessId, orderId);
    const disposition = await this.dispositionPort().getDisposition(
      context.businessId,
      order.id
    );
    if (disposition.businessId !== context.businessId) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.CROSS_BUSINESS_ACCESS,
        SALES_USER_MESSAGES.CROSS_BUSINESS_ACCESS,
        403,
        { entity: "sale" }
      );
    }
    assertCancellationAuthorized(order.status, disposition.cancellationAuthorized);
    assertSalesLifecycleTransition(order.status, SALES_ORDER_STATUS_CODES.CANCELLED);
    await this.deps.orders.update(context.businessId, order.id, {
      status: SALES_ORDER_STATUS_CODES.CANCELLED,
      updatedBy: context.platformUserId,
      metadata: {
        ...(order.metadata ?? {}),
        cancellationReason: input.reason ?? disposition.cancellationReason,
      },
    });
    await this.audit(
      context,
      order.id,
      order.partyId,
      SALES_AUDIT_ACTIONS.CANCELLATION_RECOGNIZED,
      {
        orderNumber: order.orderNumber,
        previousStatus: order.status,
        newStatus: SALES_ORDER_STATUS_CODES.CANCELLED,
        reason: input.reason ?? disposition.cancellationReason,
      }
    );
    return this.getOrder(context, orderId);
  }

  async requestOrderCompletion(
    context: CurrentBusinessContext,
    orderId: string
  ): Promise<SalesOrderDetailView> {
    this.assertContext(context);
    await this.applyFulfilmentOutcomes(context, orderId);
    const order = await this.requireOrder(context.businessId, orderId);
    if (isCompletedStatus(order.status)) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.ORDER_ALREADY_COMPLETED,
        SALES_USER_MESSAGES.ORDER_ALREADY_COMPLETED,
        409,
        { entity: "sale" }
      );
    }
    const projection = await this.projectFulfilment(context.businessId, order);
    assertCompletionEligible(projection.completion);
    const requiresSod = order.completionRequiresSod;
    if (!requiresSod) {
      return this.completeOrder(context, order);
    }
    await this.deps.orders.update(context.businessId, order.id, {
      completionSubmittedBy: context.platformUserId,
      completionSubmittedAt: new Date(),
      completionRejectedBy: null,
      completionRejectedAt: null,
      completionRejectedReason: null,
      updatedBy: context.platformUserId,
    });
    await this.audit(
      context,
      order.id,
      order.partyId,
      SALES_AUDIT_ACTIONS.COMPLETION_REQUESTED,
      {
        orderNumber: order.orderNumber,
        previousStatus: order.status,
        outstandingQuantity: formatQuantity(sumLineQuantities(projection.lines).outstanding),
      }
    );
    return this.getOrder(context, orderId);
  }

  async approveOrderCompletion(
    context: CurrentBusinessContext,
    orderId: string
  ): Promise<SalesOrderDetailView> {
    this.assertContext(context);
    const order = await this.requireOrder(context.businessId, orderId);
    if (isCompletedStatus(order.status)) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.ORDER_ALREADY_COMPLETED,
        SALES_USER_MESSAGES.ORDER_ALREADY_COMPLETED,
        409,
        { entity: "sale" }
      );
    }
    if (!order.completionSubmittedBy) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.COMPLETION_NOT_PENDING,
        SALES_USER_MESSAGES.COMPLETION_NOT_PENDING,
        409,
        {
          entity: "completion",
          nextAction: "Request completion first.",
        }
      );
    }
    assertSegregationOfDuties(
      order.completionRequiresSod,
      order.completionSubmittedBy,
      context.platformUserId
    );
    const projection = await this.projectFulfilment(context.businessId, order);
    assertCompletionEligible(projection.completion);
    return this.completeOrder(context, order);
  }

  async rejectOrderCompletion(
    context: CurrentBusinessContext,
    orderId: string,
    input: RejectCompletionInput = {}
  ): Promise<SalesOrderDetailView> {
    this.assertContext(context);
    const order = await this.requireOrder(context.businessId, orderId);
    if (!order.completionSubmittedBy) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.COMPLETION_NOT_PENDING,
        SALES_USER_MESSAGES.COMPLETION_NOT_PENDING,
        409,
        { entity: "completion" }
      );
    }
    assertSegregationOfDuties(
      order.completionRequiresSod,
      order.completionSubmittedBy,
      context.platformUserId
    );
    await this.deps.orders.update(context.businessId, order.id, {
      completionSubmittedBy: null,
      completionSubmittedAt: null,
      completionRejectedBy: context.platformUserId,
      completionRejectedAt: new Date(),
      completionRejectedReason: input.reason ?? null,
      updatedBy: context.platformUserId,
    });
    await this.audit(
      context,
      order.id,
      order.partyId,
      SALES_AUDIT_ACTIONS.COMPLETION_REJECTED,
      {
        orderNumber: order.orderNumber,
        previousStatus: order.status,
        newStatus: order.status,
        reason: input.reason ?? null,
      }
    );
    return this.getOrder(context, orderId);
  }

  async assertFulfilmentAllowed(
    context: CurrentBusinessContext,
    orderId: string
  ): Promise<void> {
    this.assertContext(context);
    const order = await this.requireOrder(context.businessId, orderId);
    assertFulfilmentProgressionAllowed(order.status);
  }

  private policy(): SalesConfirmationPolicy {
    return this.deps.confirmationPolicy ?? SALES_CONFIRMATION_POLICY;
  }

  private completionPolicy(): SalesCompletionPolicy {
    return this.deps.completionPolicy ?? SALES_COMPLETION_POLICY;
  }

  private fulfilmentPort(): FulfilmentOutcomePort {
    return this.deps.fulfilmentOutcomes ?? createUnavailableFulfilmentOutcomeAdapter();
  }

  private dispositionPort(): OrderDispositionPort {
    return this.deps.disposition ?? createUnavailableOrderDispositionAdapter();
  }

  private checklistPort(): CompletionChecklistPort {
    return this.deps.completionChecklist ?? createSalesCompletionChecklistAdapter();
  }

  private async completeOrder(
    context: CurrentBusinessContext,
    order: SalesOrderRecord
  ) {
    assertSalesLifecycleTransition(order.status, SALES_ORDER_STATUS_CODES.COMPLETED);
    await this.deps.orders.update(context.businessId, order.id, {
      status: SALES_ORDER_STATUS_CODES.COMPLETED,
      completedBy: context.platformUserId,
      completedAt: new Date(),
      updatedBy: context.platformUserId,
    });
    await this.audit(context, order.id, order.partyId, SALES_AUDIT_ACTIONS.ORDER_COMPLETED, {
      orderNumber: order.orderNumber,
      previousStatus: order.status,
      newStatus: SALES_ORDER_STATUS_CODES.COMPLETED,
    });
    return this.getOrder(context, order.id);
  }

  private assertTransitionPreconditions(
    currentStatus: string,
    target: string,
    projection: { lines: DerivedLineFulfilment[]; hasActivity: boolean; totals: ReturnType<typeof sumLineQuantities> }
  ) {
    assertSalesLifecycleTransition(currentStatus, target);
    if (target === SALES_ORDER_STATUS_CODES.IN_PROGRESS) {
      assertFulfilmentProgressionAllowed(currentStatus);
      if (!projection.hasActivity) {
        throw new SalesOrderError(
          SALES_ERROR_CODES.FULFILMENT_NOT_ALLOWED,
          "The sale cannot move to in progress until delivery or service work is recorded.",
          409,
          { field: "status", entity: "sale" }
        );
      }
    }
    if (target === SALES_ORDER_STATUS_CODES.PARTIALLY_FULFILLED) {
      if (!(projection.totals.accepted > 0 && projection.totals.outstanding > 0)) {
        throw new SalesOrderError(
          SALES_ERROR_CODES.INVALID_STATUS_TRANSITION,
          "Partial fulfilment requires some quantity accepted and some still outstanding.",
          409,
          { field: "status", entity: "sale" }
        );
      }
    }
  }

  private async persistLifecycleTransition(
    context: CurrentBusinessContext,
    order: SalesOrderRecord,
    target: string,
    reason?: string | null
  ) {
    if (order.status === target) {
      return;
    }
    this.assertTransitionPreconditions(
      order.status,
      target,
      await this.projectFulfilment(context.businessId, order)
    );
    await this.deps.orders.update(context.businessId, order.id, {
      status: target,
      updatedBy: context.platformUserId,
    });
    await this.audit(context, order.id, order.partyId, SALES_AUDIT_ACTIONS.LIFECYCLE_TRANSITIONED, {
      orderNumber: order.orderNumber,
      previousStatus: order.status,
      newStatus: target,
      reason: reason ?? null,
    });
  }

  private async projectFulfilment(businessId: string, order: SalesOrderRecord) {
    const [orderLines, outcomes, disposition] = await Promise.all([
      this.deps.orders.listLines(businessId, order.id),
      this.fulfilmentPort().getOrderOutcome(businessId, order.id),
      this.dispositionPort().getDisposition(businessId, order.id),
    ]);
    if (outcomes.businessId !== businessId || outcomes.orderId !== order.id) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.CROSS_BUSINESS_ACCESS,
        SALES_USER_MESSAGES.CROSS_BUSINESS_ACCESS,
        403,
        { entity: "delivery result" }
      );
    }
    if (disposition.businessId !== businessId || disposition.orderId !== order.id) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.CROSS_BUSINESS_ACCESS,
        SALES_USER_MESSAGES.CROSS_BUSINESS_ACCESS,
        403,
        { entity: "sale" }
      );
    }
    const knownLineIds = new Set(orderLines.map((line) => line.id));
    for (const outcome of outcomes.lines) {
      if (outcome.businessId !== businessId || outcome.orderId !== order.id) {
        throw new SalesOrderError(
          SALES_ERROR_CODES.CROSS_BUSINESS_ACCESS,
          SALES_USER_MESSAGES.CROSS_BUSINESS_ACCESS,
          403,
          { entity: "delivery result" }
        );
      }
      if (!knownLineIds.has(outcome.orderLineId)) {
        throw new SalesOrderError(
          SALES_ERROR_CODES.INVALID_FULFILMENT_OUTCOME,
          SALES_USER_MESSAGES.INVALID_FULFILMENT_OUTCOME,
          409,
          { entity: "sale line" }
        );
      }
    }
    const lines = orderLines.map((line) =>
      deriveOrderLineFulfilment(line, outcomes, disposition, isCancelledStatus(order.status))
    );
    const totals = sumLineQuantities(lines);
    const checklist = await this.checklistPort().evaluate({
      businessId,
      orderId: order.id,
      outstandingQuantity: totals.outstanding,
      inspectionPending: lines.some(
        (line) => line.inspectionStatus === SALES_INSPECTION_STATUS_CODES.PENDING
      ),
      inspectionFailed: lines.some(
        (line) => line.inspectionStatus === SALES_INSPECTION_STATUS_CODES.FAILED
      ),
      serviceIncomplete: lines.some(
        (line) =>
          line.serviceCompletionStatus === SALES_SERVICE_COMPLETION_STATUS_CODES.PENDING
      ),
      dispositionRequired: totals.openRejected > 0,
      evidenceMissing: lines.some((line) => line.evidenceMissing),
      acceptedExceedsOrdered: lines.some((line) => line.accepted > line.ordered),
    });
    const completion = buildCompletionReadiness({
      status: order.status,
      lines,
      checklistPassed: checklist.passed,
      checklistBlockers: checklist.blockers,
      sodRequired: order.completionRequiresSod,
      sodPending: Boolean(order.completionRequiresSod && order.completionSubmittedBy),
    });
    return {
      lines,
      totals,
      hasActivity: lines.some((line) => line.hasActivity) || outcomes.hasAnyActivity,
      completion,
      readiness: buildNextActionReadiness({
        status: order.status,
        lines,
        completion,
      }),
    };
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

  private async requireOrder(businessId: string, orderId: string) {
    const order = await this.deps.orders.findById(businessId, orderId);
    if (!order) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.ORDER_NOT_FOUND,
        SALES_USER_MESSAGES.ORDER_NOT_FOUND,
        404,
        { entity: "sale", nextAction: "Open Sales for this business and choose an existing sale." }
      );
    }
    return order;
  }

  private async requireCustomer(businessId: string, partyId: string) {
    if (!partyId?.trim()) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.CUSTOMER_NOT_FOUND,
        SALES_USER_MESSAGES.CUSTOMER_NOT_FOUND,
        400,
        { field: "customerId", entity: "customer" }
      );
    }
    const customer = await this.deps.parties.findInBusiness(businessId, partyId);
    if (!customer) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.CUSTOMER_NOT_IN_BUSINESS,
        SALES_USER_MESSAGES.CUSTOMER_NOT_IN_BUSINESS,
        403,
        {
          field: "customerId",
          entity: "customer",
          nextAction: "Search customers in this business and select one.",
        }
      );
    }
    assertSameBusiness(
      businessId,
      customer.businessId,
      SALES_ERROR_CODES.CUSTOMER_NOT_IN_BUSINESS,
      "customer"
    );
    return customer;
  }

  private async requireOffering(
    businessId: string,
    offeringId: string
  ): Promise<OfferingLookupResult> {
    const offering = await this.deps.offerings.findInBusiness(businessId, offeringId);
    if (!offering) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.OFFERING_NOT_IN_BUSINESS,
        SALES_USER_MESSAGES.OFFERING_NOT_IN_BUSINESS,
        403,
        {
          field: "offeringId",
          entity: "product",
          nextAction: "Search products and services in this business and select one.",
        }
      );
    }
    assertSameBusiness(
      businessId,
      offering.businessId,
      SALES_ERROR_CODES.OFFERING_NOT_IN_BUSINESS,
      "product"
    );
    return offering;
  }

  private async prepareLines(
    context: CurrentBusinessContext,
    customerId: string,
    currencyCode: string,
    lines: CreateDirectSaleLineInput[],
    consumerRef: string
  ) {
    assertRequiredLines(lines.length);
    const currency = currencyCode.trim().toUpperCase();
    const lineInserts: SalesOrderLineInsert[] = [];
    const linkInserts: Array<
      Omit<SalesOrderCommercialLinkInsert, "salesOrderId" | "salesOrderLineId"> & {
        offeringId: string;
      }
    > = [];

    for (const [index, line] of lines.entries()) {
      assertValidQuantity(line.quantity, "quantity");
      const offering = await this.requireOffering(context.businessId, line.offeringId);
      if (!line.snapshot) {
        throw new SalesOrderError(
          SALES_ERROR_CODES.COMMERCIAL_CONTRACT_REQUIRED,
          SALES_USER_MESSAGES.COMMERCIAL_CONTRACT_REQUIRED,
          400,
          {
            field: "expectedAmount",
            entity: "commercial total",
            nextAction: "Prepare the commercial total for this customer and product first.",
          }
        );
      }
      assertSameBusiness(
        context.businessId,
        line.snapshot.businessId,
        SALES_ERROR_CODES.CROSS_BUSINESS_ACCESS,
        "commercial total"
      );
      assertOfferingMatchesSnapshot(line.offeringId, line.snapshot);
      assertQuantityMatchesSnapshot(line.quantity, line.snapshot);

      const contract = this.consumeContract(
        context,
        line.snapshot,
        line.expected,
        currency,
        `${consumerRef}-line-${index + 1}`
      );
      assertCurrencyMatches(currency, contract.commercial.currency);
      const expectedPayable = copiedExpectedAmountFromContract(contract);
      const unitValue = String(line.snapshot.resolution.basePrice.unitPrice);
      const lineType = lineTypeFromProductType(offering.productTypeCode);

      lineInserts.push({
        businessId: context.businessId,
        salesOrderId: "",
        lineNumber: index + 1,
        offeringId: offering.id,
        offeringVariantId: null,
        lineType,
        description: line.description ?? offering.productName,
        quantity: String(line.quantity),
        agreedUnitValue: unitValue,
        commercialLineAmount: expectedPayable,
        currencyCode: currency,
        unitPrice: unitValue,
        lineTotal: expectedPayable,
        snapshotId: line.snapshot.snapshotId,
        commercialContractId: contract.contractId,
        commercialBreakdown: contract.breakdown,
        quotationLineId: null,
        metadata: {
          offeringCode: offering.productCode,
          offeringName: offering.productName,
        },
      });

      linkInserts.push({
        offeringId: offering.id,
        businessId: context.businessId,
        snapshotId: line.snapshot.snapshotId,
        commercialContractId: contract.contractId,
        expectedAmountId: contract.identity.expectedAmountId,
        expectedPayable,
        currencyCode: currency,
        integrityHash: contract.integrity.snapshotIntegrityHash,
        snapshotPayload: line.snapshot,
        contractPayload: contract,
        provenance: contract.provenance,
        consumerRef: `${consumerRef}-line-${index + 1}`,
        createdBy: context.platformUserId,
      });
    }

    const expectedAmount = sumExpectedPayables(
      linkInserts.map((link) => link.expectedPayable),
      currency
    );
    const principalAmount = sumExpectedPayables(
      linkInserts.map((link) => link.contractPayload.commercial.principalAmount),
      currency
    );
    const taxAmount = sumExpectedPayables(
      linkInserts.map((link) => link.contractPayload.commercial.totalTax),
      currency
    );

    return {
      currencyCode: currency,
      expectedAmount,
      principalAmount,
      taxAmount,
      primaryContractId: linkInserts[0]?.commercialContractId ?? null,
      primarySnapshotId: linkInserts[0]?.snapshotId ?? null,
      lineInserts,
      linkInserts,
      customerId,
    };
  }

  private consumeContract(
    context: CurrentBusinessContext,
    snapshot: CreateDirectSaleLineInput["snapshot"],
    expected: CreateDirectSaleLineInput["expected"],
    currencyCode: string,
    consumerRef: string
  ) {
    try {
      return this.deps.commercial.consumeFromSnapshot(context, snapshot, {
        expected,
        expectedCurrency: currencyCode,
        consumerRef,
      });
    } catch (error) {
      this.rethrowCommercial(error);
    }
  }

  private async persistPrepared(
    businessId: string,
    orderId: string,
    prepared: Awaited<ReturnType<SalesOrderService["prepareLines"]>>
  ) {
    await this.deps.orders.replaceCommercialLinks(businessId, orderId, []);
    const lines = await this.deps.orders.replaceLines(
      businessId,
      orderId,
      prepared.lineInserts.map((line) => ({ ...line, salesOrderId: orderId }))
    );
    await this.deps.orders.replaceCommercialLinks(
      businessId,
      orderId,
      prepared.linkInserts.map((link, index) => ({
        ...link,
        salesOrderId: orderId,
        salesOrderLineId: lines[index]?.id ?? null,
      }))
    );
  }

  private async resolveQuotationLineContracts(
    context: CurrentBusinessContext,
    quotation: {
      partyId: string;
      currencyCode: string;
      lines: Array<{ offeringId: string; quantity: number; description: string | null }>;
    }
  ): Promise<CreateDirectSaleLineInput[]> {
    if (!this.deps.commercialResolver) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.COMMERCIAL_CONTRACT_REQUIRED,
        SALES_USER_MESSAGES.COMMERCIAL_CONTRACT_REQUIRED,
        400,
        {
          entity: "commercial total",
          nextAction: "Prepare the commercial total, then convert the quotation.",
        }
      );
    }
    const resolved: CreateDirectSaleLineInput[] = [];
    for (const line of quotation.lines) {
      try {
        const consumed = await this.deps.commercialResolver.resolveAndConsume(context, {
          offeringId: line.offeringId,
          partyId: quotation.partyId,
          currencyCode: quotation.currencyCode,
          quantity: line.quantity,
          consumerRef: `bp-006-quote-line-${line.offeringId}`,
        });
        resolved.push({
          offeringId: line.offeringId,
          quantity: line.quantity,
          snapshot: consumed.snapshot,
          expected: consumed.expected,
          description: line.description,
        });
      } catch (error) {
        this.rethrowCommercial(error);
      }
    }
    return resolved;
  }

  private async assertCommercialIntegrity(
    context: CurrentBusinessContext,
    order: SalesOrderRecord
  ) {
    const links = await this.deps.orders.listCommercialLinks(
      context.businessId,
      order.id
    );
    if (links.length === 0) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.COMMERCIAL_CONTRACT_REQUIRED,
        SALES_USER_MESSAGES.COMMERCIAL_CONTRACT_REQUIRED,
        409,
        {
          entity: "commercial total",
          nextAction: "Prepare a commercial total before confirming this sale.",
        }
      );
    }
    const payables: string[] = [];
    for (const link of links) {
      assertSameBusiness(
        context.businessId,
        link.businessId,
        SALES_ERROR_CODES.CROSS_BUSINESS_ACCESS,
        "commercial total"
      );
      try {
        this.deps.commercial.validate(context, link.contractPayload, link.snapshotPayload);
        this.deps.commercial.verifyIntegrity(
          context,
          link.contractPayload,
          link.snapshotPayload
        );
      } catch (error) {
        this.rethrowCommercial(error);
      }
      assertCurrencyMatches(order.currencyCode, link.contractPayload.commercial.currency);
      const expected = copiedExpectedAmountFromContract(link.contractPayload);
      assertExpectedCopiedNotInvented(link.expectedPayable, expected, order.currencyCode);
      payables.push(expected);
    }
    const headerExpected = sumExpectedPayables(payables, order.currencyCode);
    assertExpectedCopiedNotInvented(order.expectedAmount, headerExpected, order.currencyCode);
  }

  private async toSummaryView(businessId: string, order: SalesOrderRecord) {
    const customer = order.partyId
      ? await this.deps.parties.findInBusiness(businessId, order.partyId)
      : null;
    const projection = await this.projectFulfilment(businessId, order);
    const flags = workspaceFlags({
      status: order.status,
      sourceType: order.sourceType,
      inspectionPending: projection.lines.some((line) =>
        isInspectionPendingStatus(line.inspectionStatus)
      ),
      serviceRemaining: projection.lines.some((line) =>
        isServiceRemainingStatus(line.serviceCompletionStatus)
      ),
      outstandingQuantity: projection.totals.outstanding,
    });
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      customerId: order.partyId ?? "",
      customerName: customer?.displayName ?? null,
      status: order.status,
      statusLabel: salesStatusLabel(order.status),
      sourceType: order.sourceType,
      currencyCode: order.currencyCode,
      expectedAmount: order.expectedAmount,
      paymentStatus: order.paymentStatus,
      orderDate: order.orderDate.toISOString(),
      createdAt: order.createdAt.toISOString(),
      nextAction: nextActionForLifecycle({
        status: order.status,
        confirmationRequiresSod: order.confirmationRequiresSod,
        completion: projection.completion,
      }),
      outstandingQuantity: formatQuantity(projection.totals.outstanding),
      inspectionPending: flags.inspectionPending,
      serviceRemaining: flags.serviceRemaining,
      convertedFromQuote: flags.convertedFromQuote,
    };
  }

  private async toDetailView(
    businessId: string,
    order: SalesOrderRecord,
    viewerUserId?: string | null
  ): Promise<SalesOrderDetailView> {
    const [lines, links, customer] = await Promise.all([
      this.deps.orders.listLines(businessId, order.id),
      this.deps.orders.listCommercialLinks(businessId, order.id),
      order.partyId
        ? this.deps.parties.findInBusiness(businessId, order.partyId)
        : Promise.resolve(null),
    ]);
    const projection = await this.projectFulfilment(businessId, order);
    const fulfilmentByLine = new Map(
      projection.lines.map((line) => [line.orderLineId, line])
    );
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      businessId: order.businessId,
      sourceType: order.sourceType,
      quotationId: order.quotationId,
      quotationVersionId: order.quotationVersionId,
      opportunityId: order.opportunityId,
      crmRecordId: order.crmRecordId,
      customerId: order.partyId ?? "",
      customerName: customer?.displayName ?? null,
      status: order.status,
      statusLabel: salesStatusLabel(order.status),
      customerStatusLabel: customerStatusLabel(order.status),
      currencyCode: order.currencyCode,
      orderDate: order.orderDate.toISOString(),
      expectedAmount: order.expectedAmount,
      principalAmount: order.subtotal,
      taxAmount: order.taxAmount,
      commercialContractId: order.commercialContractId,
      snapshotId: order.snapshotId,
      confirmationRequiresSod: order.confirmationRequiresSod,
      submittedBy: order.submittedBy,
      submittedAt: order.submittedAt?.toISOString() ?? null,
      confirmedBy: order.confirmedBy,
      confirmedAt: order.confirmedAt?.toISOString() ?? null,
      createdBy: order.createdBy,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      paymentStatus: order.paymentStatus,
      paymentRecorded: false,
      completionRequiresSod: order.completionRequiresSod,
      completionSubmittedBy: order.completionSubmittedBy,
      completionSubmittedAt: order.completionSubmittedAt?.toISOString() ?? null,
      completedBy: order.completedBy,
      completedAt: order.completedAt?.toISOString() ?? null,
      lines: lines.map((line) => this.toLineView(line, fulfilmentByLine.get(line.id))),
      commercialLinks: links.map((link) => ({
        id: link.id,
        snapshotId: link.snapshotId,
        commercialContractId: link.commercialContractId,
        expectedPayable: link.expectedPayable,
        currencyCode: link.currencyCode,
        integrityHash: link.integrityHash,
        consumedAt: link.consumedAt.toISOString(),
        consumerRef: link.consumerRef,
      })),
      nextAction: nextActionForLifecycle({
        status: order.status,
        confirmationRequiresSod: order.confirmationRequiresSod,
        completion: projection.completion,
      }),
      fulfilment: {
        hasActivity: projection.hasActivity,
        orderedQuantity: formatQuantity(projection.totals.ordered),
        acceptedQuantity: formatQuantity(projection.totals.accepted),
        rejectedQuantity: formatQuantity(projection.totals.rejected),
        deliveredQuantity: formatQuantity(projection.totals.delivered),
        missingQuantity: formatQuantity(projection.totals.missing),
        outstandingQuantity: formatQuantity(projection.totals.outstanding),
        openRejectedQuantity: formatQuantity(projection.totals.openRejected),
        completion: projection.completion,
      },
      readiness: projection.readiness,
      deliveries: await this.listDeliveryViews(businessId, order.id),
      dispositions: await this.listDispositionViews(businessId, order.id),
      amendments: await this.listAmendmentViews(businessId, order.id),
      notes: parseOperationalNotes(order.metadata),
      viewerUserId: viewerUserId ?? null,
    };
  }

  private async listDeliveryViews(businessId: string, orderId: string) {
    if (!this.deps.deliveries) {
      return [];
    }
    const [events, inspections] = await Promise.all([
      this.deps.deliveries.listEventsByOrder(businessId, orderId),
      this.deps.deliveries.listInspectionsByOrder(businessId, orderId),
    ]);
    const inspectionByEvent = new Map(
      inspections.map((row) => [row.deliveryEventId, row])
    );
    return events.map((event) => {
      const inspection = inspectionByEvent.get(event.id);
      return {
        id: event.id,
        orderLineId: event.salesOrderLineId,
        eventType: event.eventType,
        status: event.status,
        statusLabel: deliveryEventStatusLabel(event.status),
        claimedQuantity: formatQuantity(parseQuantity(event.claimedQuantity)),
        acceptedQuantity: formatQuantity(
          parseQuantity(inspection?.acceptedQuantity ?? "0")
        ),
        rejectedQuantity: formatQuantity(
          parseQuantity(inspection?.rejectedQuantity ?? "0")
        ),
        recordedBy: event.recordedBy,
        deliveredAt: event.deliveredAt.toISOString(),
        inspectedBy: inspection?.inspectedBy ?? event.completedBy,
        comments: inspection?.comments ?? event.notes,
        rejectionReasonCode: inspection?.rejectionReasonCode ?? null,
        qualityFindingCode: inspection?.qualityFindingCode ?? null,
        evidenceNote: inspection?.evidenceNote ?? event.evidenceNote,
      };
    });
  }

  private async listDispositionViews(businessId: string, orderId: string) {
    if (!this.deps.exceptions) {
      return [];
    }
    const rows = await this.deps.exceptions.listInstructionsByOrder(businessId, orderId);
    return rows.map((row) => ({
      id: row.id,
      orderLineId: row.salesOrderLineId,
      instructionType: row.instructionType,
      instructionTypeLabel: dispositionTypeLabel(row.instructionType),
      status: row.status,
      statusLabel: instructionStatusLabel(row.status),
      quantity: row.quantity,
      reasonCode: row.reasonCode,
      comments: row.comments,
      submittedBy: row.submittedBy,
      approvedBy: row.approvedBy,
      refundExecuted: false as const,
      stockMoved: false as const,
      financialInstructionEmitted: row.financialInstructionEmitted,
      stockInstructionEmitted: row.stockInstructionEmitted,
    }));
  }

  private async listAmendmentViews(businessId: string, orderId: string) {
    if (!this.deps.exceptions) {
      return [];
    }
    const rows = await this.deps.exceptions.listAmendmentsByOrder(businessId, orderId);
    return rows.map((row) => ({
      id: row.id,
      orderLineId: row.salesOrderLineId,
      versionNumber: row.versionNumber,
      status: row.status,
      statusLabel: amendmentStatusLabel(row.status),
      reason: row.reason,
      previousQuantity: row.previousQuantity,
      proposedQuantity: row.proposedQuantity,
      previousExpectedAmount: row.previousExpectedAmount,
      proposedExpectedAmount: row.proposedExpectedAmount,
      proposedBy: row.proposedBy,
      approvedBy: row.approvedBy,
    }));
  }

  private toLineView(line: SalesOrderLineRecord, fulfilment?: DerivedLineFulfilment) {
    const metadata = (line.metadata ?? {}) as {
      offeringName?: string;
      offeringCode?: string;
    };
    return {
      id: line.id,
      lineNumber: line.lineNumber,
      offeringId: line.offeringId,
      offeringName: metadata.offeringName ?? null,
      offeringCode: metadata.offeringCode ?? null,
      lineType: line.lineType,
      description: line.description,
      orderedQuantity: line.quantity,
      agreedUnitValue: line.agreedUnitValue,
      commercialLineAmount: line.commercialLineAmount,
      currencyCode: line.currencyCode,
      snapshotId: line.snapshotId,
      commercialContractId: line.commercialContractId,
      commercialBreakdown: Array.isArray(line.commercialBreakdown)
        ? line.commercialBreakdown
        : null,
      quotationLineId: line.quotationLineId,
      acceptedQuantity: formatQuantity(fulfilment?.accepted ?? 0),
      rejectedQuantity: formatQuantity(fulfilment?.rejected ?? 0),
      deliveredQuantity: formatQuantity(fulfilment?.delivered ?? 0),
      missingQuantity: formatQuantity(fulfilment?.missing ?? fulfilment?.ordered ?? Number(line.quantity)),
      outstandingQuantity: formatQuantity(
        fulfilment?.outstanding ?? Number(line.quantity)
      ),
      openRejectedQuantity: formatQuantity(fulfilment?.openRejected ?? 0),
      fulfilmentStatus: fulfilment?.status ?? "NOT_STARTED",
      fulfilmentStatusLabel: fulfilment?.statusLabel ?? "Not started",
      inspectionStatus: fulfilment?.inspectionStatus ?? SALES_INSPECTION_STATUS_CODES.NOT_REQUIRED,
      serviceCompletionStatus:
        fulfilment?.serviceCompletionStatus ?? "NOT_REQUIRED",
    };
  }

  private async generateOrderNumber(businessId: string): Promise<string> {
    const count = await this.deps.orders.countAll(businessId);
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const candidate = `${SALES_ORDER_NUMBER_PREFIX}-${String(count + 1 + attempt).padStart(6, "0")}`;
      const existing = await this.deps.orders.findByOrderNumber(businessId, candidate);
      if (!existing) {
        return candidate;
      }
    }
    throw new SalesOrderError(
      SALES_ERROR_CODES.ORDER_NUMBER_NOT_UNIQUE,
      SALES_USER_MESSAGES.ORDER_NUMBER_NOT_UNIQUE,
      409,
      { field: "orderNumber", entity: "sale" }
    );
  }

  private async audit(
    context: CurrentBusinessContext,
    orderId: string,
    partyId: string | null,
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
      partyId,
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
      const tampered =
        error.code.includes("TAMPER") || error.code.includes("INTEGRITY");
      const currency = error.code.includes("CURRENCY");
      throw new SalesOrderError(
        tampered
          ? SALES_ERROR_CODES.COMMERCIAL_CONTRACT_TAMPERED
          : currency
            ? SALES_ERROR_CODES.COMMERCIAL_CURRENCY_MISMATCH
            : SALES_ERROR_CODES.COMMERCIAL_CONTRACT_INVALID,
        tampered
          ? SALES_USER_MESSAGES.COMMERCIAL_CONTRACT_TAMPERED
          : currency
            ? SALES_USER_MESSAGES.COMMERCIAL_CURRENCY_MISMATCH
            : SALES_USER_MESSAGES.COMMERCIAL_CONTRACT_INVALID,
        409,
        {
          field: error.field,
          entity: "commercial total",
          nextAction: "Prepare the commercial total again, then confirm the sale.",
        }
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

export function createDefaultSalesOrderDependencies(): SalesOrderServiceDependencies {
  const orders = createSalesOrderRepository();
  const deliveries = createSalesDeliveryRepository();
  const exceptions = createSalesExceptionRepository();
  return {
    orders,
    parties: createPartyLookupAdapter(),
    offerings: createOfferingLookupAdapter(),
    quotations: createQuotationLookupAdapter(),
    commercial: createSalesCommercialContractAdapter(),
    commercialResolver: createBp005CommercialResolveAdapter(),
    audit: createSalesAuditAdapter(),
    confirmationPolicy: SALES_CONFIRMATION_POLICY,
    completionPolicy: SALES_COMPLETION_POLICY,
    fulfilmentOutcomes: createPersistedFulfilmentOutcomeAdapter(deliveries, orders),
    disposition: createPersistedOrderDispositionAdapter(exceptions),
    completionChecklist: createSalesCompletionChecklistAdapter(),
    deliveries,
    exceptions,
  };
}

export function createSalesOrderService(deps?: SalesOrderServiceDependencies) {
  return new SalesOrderService(deps ?? createDefaultSalesOrderDependencies());
}
