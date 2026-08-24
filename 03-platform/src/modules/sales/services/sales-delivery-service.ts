/**
 * Purpose:
 * BP-006 IP-03 delivery, inspection, and service completion orchestration.
 * Records operational outcomes for IP-02. Does not move stock, take payment,
 * or start returns.
 *
 * Implementation Package:
 * BP-006 / IP-03 – Delivery, Inspection & Service Completion
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  SALES_AUDIT_ACTIONS,
  SALES_DELIVERY_EVENT_STATUS_CODES,
  SALES_DELIVERY_EVENT_TYPES,
} from "@/modules/sales/constants";
import { SalesOrderError, SALES_ERROR_CODES, SALES_USER_MESSAGES } from "@/modules/sales/errors";
import type {
  SalesAuditPort,
  SalesDeliveryPolicy,
  SalesDeliveryRepositoryPort,
  SalesOrderLineRecord,
  SalesOrderRepositoryPort,
} from "@/modules/sales/ports";
import {
  assertDeliveredWithinOrdered,
  assertEvidencePresent,
  assertInspectionComments,
  assertInspectionQuantities,
  assertNonNegativeQuantity,
  deliveryEventStatusLabel,
  deliveryPolicy,
  isPhysicalLine,
  isServiceLine,
} from "@/modules/sales/services/delivery-rules";
import { parseQuantity } from "@/modules/sales/services/order-lifecycle-rules";
import { assertSegregationOfDuties } from "@/modules/sales/services/sales-order-rules";
import {
  SalesOrderService,
  createDefaultSalesOrderDependencies,
} from "@/modules/sales/services/sales-order-service";
import type {
  BookingHandoffContract,
  CompleteServiceDeliveryInput,
  InspectDeliveryInput,
  RecordPhysicalDeliveryInput,
  SalesDeliveryEventView,
  SalesOrderDetailView,
  StartServiceDeliveryInput,
} from "@/modules/sales/types";

export type SalesDeliveryServiceDependencies = {
  orders: SalesOrderRepositoryPort;
  deliveries: SalesDeliveryRepositoryPort;
  sales: SalesOrderService;
  audit?: SalesAuditPort | null;
  policy?: Partial<SalesDeliveryPolicy>;
};

export class SalesDeliveryService {
  constructor(private readonly deps: SalesDeliveryServiceDependencies) {}

  async recordPhysicalDelivery(
    context: CurrentBusinessContext,
    input: RecordPhysicalDeliveryInput
  ): Promise<SalesOrderDetailView> {
    this.assertContext(context);
    await this.deps.sales.assertFulfilmentAllowed(context, input.orderId);
    const line = await this.requireLine(context.businessId, input.orderId, input.orderLineId);
    if (!isPhysicalLine(line.lineType)) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.LINE_TYPE_MISMATCH,
        SALES_USER_MESSAGES.LINE_TYPE_MISMATCH,
        409,
        { field: "orderLineId", entity: "delivery" }
      );
    }
    const claimed = assertNonNegativeQuantity(input.claimedQuantity, "claimedQuantity");
    if (claimed <= 0) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.INVALID_QUANTITY,
        SALES_USER_MESSAGES.INVALID_QUANTITY,
        400,
        { field: "claimedQuantity", entity: "delivery" }
      );
    }
    const totals = await this.lineDeliveredTotals(context.businessId, input.orderId, line.id);
    assertDeliveredWithinOrdered({
      ordered: parseQuantity(line.quantity),
      alreadyDelivered: totals.delivered + totals.uninspectedClaimed,
      additionalDelivered: claimed,
    });
    const created = await this.deps.deliveries.insertEvent({
      businessId: context.businessId,
      salesOrderId: input.orderId,
      salesOrderLineId: line.id,
      eventType: SALES_DELIVERY_EVENT_TYPES.PHYSICAL,
      status: SALES_DELIVERY_EVENT_STATUS_CODES.RECORDED,
      claimedQuantity: String(claimed),
      deliveredAt: new Date(),
      recordedBy: context.platformUserId,
      recordedAt: new Date(),
      notes: input.notes ?? null,
      evidenceNote: input.evidenceNote ?? null,
      evidenceRef: input.evidenceRef ?? null,
      completedBy: null,
      completedAt: null,
      createdBy: context.platformUserId,
    });
    await this.audit(context, input.orderId, SALES_AUDIT_ACTIONS.DELIVERY_RECORDED, {
      deliveryEventId: created.id,
      orderLineId: line.id,
      claimedQuantity: claimed,
    });
    return this.deps.sales.applyFulfilmentOutcomes(context, input.orderId);
  }

  async inspectDelivery(
    context: CurrentBusinessContext,
    input: InspectDeliveryInput
  ): Promise<SalesOrderDetailView> {
    this.assertContext(context);
    await this.deps.sales.assertFulfilmentAllowed(context, input.orderId);
    const event = await this.requireEvent(context.businessId, input.deliveryEventId);
    if (event.salesOrderId !== input.orderId || event.businessId !== context.businessId) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.CROSS_BUSINESS_ACCESS,
        SALES_USER_MESSAGES.CROSS_BUSINESS_ACCESS,
        403,
        { entity: "delivery" }
      );
    }
    if (event.eventType !== SALES_DELIVERY_EVENT_TYPES.PHYSICAL) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.LINE_TYPE_MISMATCH,
        SALES_USER_MESSAGES.LINE_TYPE_MISMATCH,
        409,
        { entity: "inspection" }
      );
    }
    const existing = await this.deps.deliveries.findInspectionByEvent(
      context.businessId,
      event.id
    );
    if (existing) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.DELIVERY_ALREADY_INSPECTED,
        SALES_USER_MESSAGES.DELIVERY_ALREADY_INSPECTED,
        409,
        { entity: "inspection" }
      );
    }
    const policy = this.policy();
    assertSegregationOfDuties(
      policy.inspectionRequiresSod,
      event.recordedBy,
      context.platformUserId
    );
    const claimed = parseQuantity(event.claimedQuantity);
    const inspected = assertInspectionQuantities({
      claimed,
      accepted: input.acceptedQuantity,
      rejected: input.rejectedQuantity,
    });
    const line = await this.requireLine(
      context.businessId,
      input.orderId,
      event.salesOrderLineId
    );
    const totals = await this.lineDeliveredTotals(context.businessId, input.orderId, line.id);
    assertDeliveredWithinOrdered({
      ordered: parseQuantity(line.quantity),
      alreadyDelivered: totals.delivered,
      additionalDelivered: inspected.delivered,
    });
    assertInspectionComments({
      policy,
      claimed,
      accepted: inspected.accepted,
      rejected: inspected.rejected,
      comments: input.comments,
      rejectionReasonCode: input.rejectionReasonCode,
    });
    await this.deps.deliveries.insertInspection({
      businessId: context.businessId,
      salesOrderId: input.orderId,
      salesOrderLineId: event.salesOrderLineId,
      deliveryEventId: event.id,
      acceptedQuantity: String(inspected.accepted),
      rejectedQuantity: String(inspected.rejected),
      comments: input.comments ?? null,
      rejectionReasonCode: input.rejectionReasonCode ?? null,
      qualityFindingCode: input.qualityFindingCode ?? null,
      evidenceNote: input.evidenceNote ?? null,
      evidenceRef: input.evidenceRef ?? null,
      inspectedBy: context.platformUserId,
      inspectedAt: new Date(),
      createdBy: context.platformUserId,
    });
    await this.deps.deliveries.updateEvent(context.businessId, event.id, {
      status: SALES_DELIVERY_EVENT_STATUS_CODES.INSPECTED,
    });
    await this.audit(context, input.orderId, SALES_AUDIT_ACTIONS.INSPECTION_RECORDED, {
      deliveryEventId: event.id,
      acceptedQuantity: inspected.accepted,
      rejectedQuantity: inspected.rejected,
      rejectionReasonCode: input.rejectionReasonCode ?? null,
      qualityFindingCode: input.qualityFindingCode ?? null,
    });
    return this.deps.sales.applyFulfilmentOutcomes(context, input.orderId);
  }

  async startServiceDelivery(
    context: CurrentBusinessContext,
    input: StartServiceDeliveryInput
  ): Promise<SalesOrderDetailView> {
    this.assertContext(context);
    await this.deps.sales.assertFulfilmentAllowed(context, input.orderId);
    const line = await this.requireLine(context.businessId, input.orderId, input.orderLineId);
    if (!isServiceLine(line.lineType)) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.LINE_TYPE_MISMATCH,
        SALES_USER_MESSAGES.LINE_TYPE_MISMATCH,
        409,
        { entity: "service" }
      );
    }
    const quantity = assertNonNegativeQuantity(
      input.quantity ?? parseQuantity(line.quantity),
      "quantity"
    );
    if (quantity <= 0) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.INVALID_QUANTITY,
        SALES_USER_MESSAGES.INVALID_QUANTITY,
        400,
        { field: "quantity", entity: "service" }
      );
    }
    const existingEvents = await this.deps.deliveries.listEventsByOrder(
      context.businessId,
      input.orderId
    );
    const alreadyInProgress = existingEvents.some(
      (event) =>
        event.salesOrderLineId === line.id &&
        event.eventType === SALES_DELIVERY_EVENT_TYPES.SERVICE &&
        event.status === SALES_DELIVERY_EVENT_STATUS_CODES.SERVICE_IN_PROGRESS
    );
    if (alreadyInProgress) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.INVALID_STATUS_TRANSITION,
        "This service is already in progress.",
        409,
        { entity: "service" }
      );
    }
    const created = await this.deps.deliveries.insertEvent({
      businessId: context.businessId,
      salesOrderId: input.orderId,
      salesOrderLineId: line.id,
      eventType: SALES_DELIVERY_EVENT_TYPES.SERVICE,
      status: SALES_DELIVERY_EVENT_STATUS_CODES.SERVICE_IN_PROGRESS,
      claimedQuantity: String(quantity),
      deliveredAt: new Date(),
      recordedBy: context.platformUserId,
      recordedAt: new Date(),
      notes: input.notes ?? null,
      evidenceNote: input.evidenceNote ?? null,
      evidenceRef: input.evidenceRef ?? null,
      completedBy: null,
      completedAt: null,
      createdBy: context.platformUserId,
    });
    await this.audit(context, input.orderId, SALES_AUDIT_ACTIONS.SERVICE_STARTED, {
      deliveryEventId: created.id,
      orderLineId: line.id,
    });
    return this.deps.sales.applyFulfilmentOutcomes(context, input.orderId);
  }

  async completeServiceDelivery(
    context: CurrentBusinessContext,
    input: CompleteServiceDeliveryInput
  ): Promise<SalesOrderDetailView> {
    this.assertContext(context);
    await this.deps.sales.assertFulfilmentAllowed(context, input.orderId);
    const policy = this.policy();
    assertEvidencePresent({
      required: policy.serviceEvidenceRequired,
      evidenceNote: input.evidenceNote,
      evidenceRef: input.evidenceRef,
    });
    let event = input.deliveryEventId
      ? await this.requireEvent(context.businessId, input.deliveryEventId)
      : null;
    if (!event && input.orderLineId) {
      const events = await this.deps.deliveries.listEventsByOrder(
        context.businessId,
        input.orderId
      );
      event =
        events.find(
          (row) =>
            row.salesOrderLineId === input.orderLineId &&
            row.eventType === SALES_DELIVERY_EVENT_TYPES.SERVICE &&
            row.status === SALES_DELIVERY_EVENT_STATUS_CODES.SERVICE_IN_PROGRESS
        ) ?? null;
    }
    if (!event) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.SERVICE_NOT_STARTED,
        SALES_USER_MESSAGES.SERVICE_NOT_STARTED,
        409,
        {
          entity: "service",
          nextAction: "Start the service first, then another authorised person can complete it.",
        }
      );
    }
    if (event.salesOrderId !== input.orderId || event.businessId !== context.businessId) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.CROSS_BUSINESS_ACCESS,
        SALES_USER_MESSAGES.CROSS_BUSINESS_ACCESS,
        403,
        { entity: "service" }
      );
    }
    if (event.status === SALES_DELIVERY_EVENT_STATUS_CODES.SERVICE_COMPLETED) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.SERVICE_ALREADY_COMPLETED,
        SALES_USER_MESSAGES.SERVICE_ALREADY_COMPLETED,
        409,
        { entity: "service" }
      );
    }
    assertSegregationOfDuties(
      policy.serviceCompletionRequiresSod,
      event.recordedBy,
      context.platformUserId
    );
    const completedQuantity = assertNonNegativeQuantity(
      input.completedQuantity ?? parseQuantity(event.claimedQuantity),
      "completedQuantity"
    );
    const line = await this.requireLine(
      context.businessId,
      input.orderId,
      event.salesOrderLineId
    );
    const totals = await this.lineDeliveredTotals(
      context.businessId,
      input.orderId,
      line.id
    );
    assertDeliveredWithinOrdered({
      ordered: parseQuantity(line.quantity),
      alreadyDelivered: totals.delivered,
      additionalDelivered: completedQuantity,
    });
    await this.deps.deliveries.updateEvent(context.businessId, event.id, {
      status: SALES_DELIVERY_EVENT_STATUS_CODES.SERVICE_COMPLETED,
      claimedQuantity: String(completedQuantity),
      evidenceNote: input.evidenceNote ?? event.evidenceNote,
      evidenceRef: input.evidenceRef ?? event.evidenceRef,
      notes: input.comments ?? event.notes,
      completedBy: context.platformUserId,
      completedAt: new Date(),
    });
    await this.audit(context, input.orderId, SALES_AUDIT_ACTIONS.SERVICE_COMPLETED, {
      deliveryEventId: event.id,
      completedQuantity,
      inventoryExecuted: false,
    });
    return this.deps.sales.applyFulfilmentOutcomes(context, input.orderId);
  }

  async getBookingHandoff(
    context: CurrentBusinessContext,
    orderId: string
  ): Promise<BookingHandoffContract> {
    const detail = await this.deps.sales.getOrder(context, orderId);
    return {
      orderId: detail.id,
      orderNumber: detail.orderNumber,
      businessId: detail.businessId,
      schedulerExecuted: false,
      lines: detail.lines.map((line) => ({
        orderLineId: line.id,
        offeringId: line.offeringId,
        lineType: line.lineType,
      })),
    };
  }

  async listDeliveryViews(
    businessId: string,
    orderId: string
  ): Promise<SalesDeliveryEventView[]> {
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
        claimedQuantity: event.claimedQuantity,
        acceptedQuantity: inspection?.acceptedQuantity ?? "0",
        rejectedQuantity: inspection?.rejectedQuantity ?? "0",
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

  private policy(): SalesDeliveryPolicy {
    return deliveryPolicy(this.deps.policy);
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

  private async requireEvent(businessId: string, eventId: string) {
    const event = await this.deps.deliveries.findEventById(businessId, eventId);
    if (!event) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.DELIVERY_NOT_FOUND,
        SALES_USER_MESSAGES.DELIVERY_NOT_FOUND,
        404,
        { entity: "delivery" }
      );
    }
    return event;
  }

  private async requireLine(
    businessId: string,
    orderId: string,
    lineId: string
  ): Promise<SalesOrderLineRecord> {
    const lines = await this.deps.orders.listLines(businessId, orderId);
    const line = lines.find((row) => row.id === lineId);
    if (!line || line.businessId !== businessId) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.ORDER_NOT_FOUND,
        "That sale line could not be found for the current business.",
        404,
        { entity: "sale line" }
      );
    }
    return line;
  }

  private async lineDeliveredTotals(
    businessId: string,
    orderId: string,
    lineId: string
  ) {
    const [events, inspections] = await Promise.all([
      this.deps.deliveries.listEventsByOrder(businessId, orderId),
      this.deps.deliveries.listInspectionsByOrder(businessId, orderId),
    ]);
    const lineEvents = events.filter((event) => event.salesOrderLineId === lineId);
    const inspectionByEvent = new Map(
      inspections.map((row) => [row.deliveryEventId, row])
    );
    let delivered = 0;
    let uninspectedClaimed = 0;
    for (const event of lineEvents) {
      const inspection = inspectionByEvent.get(event.id);
      if (inspection) {
        delivered +=
          parseQuantity(inspection.acceptedQuantity) +
          parseQuantity(inspection.rejectedQuantity);
      } else if (event.eventType === SALES_DELIVERY_EVENT_TYPES.PHYSICAL) {
        uninspectedClaimed += parseQuantity(event.claimedQuantity);
      } else if (event.status === SALES_DELIVERY_EVENT_STATUS_CODES.SERVICE_COMPLETED) {
        delivered += parseQuantity(event.claimedQuantity);
      }
    }
    return { delivered, uninspectedClaimed };
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
}

export function createSalesDeliveryService(deps: SalesDeliveryServiceDependencies) {
  return new SalesDeliveryService(deps);
}

export function createDefaultSalesDeliveryService() {
  const deps = createDefaultSalesOrderDependencies();
  const deliveries = deps.deliveries;
  if (!deliveries) {
    throw new SalesOrderError(
      SALES_ERROR_CODES.PROVIDER_ERROR,
      "Delivery recording is not available.",
      500
    );
  }
  return new SalesDeliveryService({
    orders: deps.orders,
    deliveries,
    sales: new SalesOrderService(deps),
    audit: deps.audit,
  });
}
