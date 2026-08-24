/**
 * Purpose:
 * Empty/in-memory IP-03 fulfilment-outcome adapters.
 * Production uses PersistedFulfilmentOutcomeAdapter. These remain for
 * tests and as a fail-closed fallback when no delivery records exist.
 *
 * Implementation Package:
 * BP-006 / IP-02 – Order Lifecycle & Fulfilment
 */

import type {
  FulfilmentOutcomePort,
  LineFulfilmentOutcome,
  OrderFulfilmentOutcome,
} from "@/modules/sales/ports";

export class UnavailableFulfilmentOutcomeAdapter implements FulfilmentOutcomePort {
  async getOrderOutcome(
    businessId: string,
    orderId: string
  ): Promise<OrderFulfilmentOutcome> {
    return {
      businessId,
      orderId,
      lines: [],
      hasAnyActivity: false,
    };
  }
}

export class InMemoryFulfilmentOutcomeAdapter implements FulfilmentOutcomePort {
  private readonly outcomes = new Map<string, OrderFulfilmentOutcome>();

  private key(businessId: string, orderId: string) {
    return `${businessId}:${orderId}`;
  }

  setOutcome(outcome: OrderFulfilmentOutcome) {
    this.outcomes.set(this.key(outcome.businessId, outcome.orderId), {
      ...outcome,
      hasAnyActivity:
        outcome.hasAnyActivity ||
        outcome.lines.some((line) => line.hasActivity || line.acceptedQuantity > 0 || line.rejectedQuantity > 0),
    });
  }

  setLine(businessId: string, orderId: string, line: LineFulfilmentOutcome) {
    const existing = this.outcomes.get(this.key(businessId, orderId));
    const lines = [
      ...(existing?.lines.filter((item) => item.orderLineId !== line.orderLineId) ?? []),
      { ...line, businessId, orderId },
    ];
    this.setOutcome({
      businessId,
      orderId,
      lines,
      hasAnyActivity: lines.some((item) => item.hasActivity),
    });
  }

  async getOrderOutcome(
    businessId: string,
    orderId: string
  ): Promise<OrderFulfilmentOutcome> {
    const stored = this.outcomes.get(this.key(businessId, orderId));
    if (!stored) {
      return {
        businessId,
        orderId,
        lines: [],
        hasAnyActivity: false,
      };
    }
    if (stored.businessId !== businessId) {
      return {
        businessId,
        orderId,
        lines: [],
        hasAnyActivity: false,
      };
    }
    return {
      businessId: stored.businessId,
      orderId: stored.orderId,
      hasAnyActivity: stored.hasAnyActivity,
      lines: stored.lines,
    };
  }
}

export function createUnavailableFulfilmentOutcomeAdapter() {
  return new UnavailableFulfilmentOutcomeAdapter();
}
