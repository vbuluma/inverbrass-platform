/**
 * Purpose:
 * IP-03 fulfilment-outcome adapter — rolls delivery/inspection records into
 * the IP-02 quantity contract. Does not invent fulfilled quantity.
 *
 * Implementation Package:
 * BP-006 / IP-03 – Delivery, Inspection & Service Completion
 */

import { SALES_DELIVERY_POLICY } from "@/modules/sales/constants";
import type {
  FulfilmentOutcomePort,
  LineFulfilmentOutcome,
  OrderFulfilmentOutcome,
  SalesDeliveryPolicy,
  SalesDeliveryRepositoryPort,
  SalesOrderLineRecord,
  SalesOrderRepositoryPort,
} from "@/modules/sales/ports";
import { rollupLineFulfilmentOutcome } from "@/modules/sales/services/delivery-rules";
import { parseQuantity } from "@/modules/sales/services/order-lifecycle-rules";

export class PersistedFulfilmentOutcomeAdapter implements FulfilmentOutcomePort {
  constructor(
    private readonly deliveries: SalesDeliveryRepositoryPort,
    private readonly orders: SalesOrderRepositoryPort,
    private readonly policy: SalesDeliveryPolicy = SALES_DELIVERY_POLICY
  ) {}

  async getOrderOutcome(
    businessId: string,
    orderId: string
  ): Promise<OrderFulfilmentOutcome> {
    const [lines, events, inspections] = await Promise.all([
      this.orders.listLines(businessId, orderId),
      this.deliveries.listEventsByOrder(businessId, orderId),
      this.deliveries.listInspectionsByOrder(businessId, orderId),
    ]);
    const outcomes: LineFulfilmentOutcome[] = lines.map((line: SalesOrderLineRecord) =>
      rollupLineFulfilmentOutcome({
        businessId,
        orderId,
        orderLineId: line.id,
        lineType: line.lineType,
        events: events
          .filter((event) => event.salesOrderLineId === line.id)
          .map((event) => ({
            id: event.id,
            eventType: event.eventType,
            status: event.status,
            claimedQuantity: parseQuantity(event.claimedQuantity),
            evidenceNote: event.evidenceNote,
            evidenceRef: event.evidenceRef,
          })),
        inspections: inspections
          .filter((row) => row.salesOrderLineId === line.id)
          .map((row) => ({
            deliveryEventId: row.deliveryEventId,
            acceptedQuantity: parseQuantity(row.acceptedQuantity),
            rejectedQuantity: parseQuantity(row.rejectedQuantity),
            evidenceNote: row.evidenceNote,
            evidenceRef: row.evidenceRef,
          })),
        policy: this.policy,
      })
    );
    return {
      businessId,
      orderId,
      lines: outcomes,
      hasAnyActivity: outcomes.some((line) => line.hasActivity),
    };
  }
}

export function createPersistedFulfilmentOutcomeAdapter(
  deliveries: SalesDeliveryRepositoryPort,
  orders: SalesOrderRepositoryPort,
  policy?: SalesDeliveryPolicy
) {
  return new PersistedFulfilmentOutcomeAdapter(deliveries, orders, policy);
}
