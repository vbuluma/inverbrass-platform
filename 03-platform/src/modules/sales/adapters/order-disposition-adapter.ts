/**
 * Purpose:
 * IP-04 disposition port. Production reads approved IP-04 instructions.
 * Tests may inject the in-memory adapter. Unavailable remains a fail-closed fallback.
 *
 * Implementation Package:
 * BP-006 / IP-02 – Order Lifecycle & Fulfilment
 * BP-006 / IP-04 – Amendments, Cancellation & Returns
 */

import {
  SALES_DISPOSITION_TYPES,
  SALES_INSTRUCTION_STATUS_CODES,
} from "@/modules/sales/constants";
import type {
  LineDispositionOutcome,
  OrderDispositionOutcome,
  OrderDispositionPort,
  SalesExceptionRepositoryPort,
} from "@/modules/sales/ports";
import {
  closesRejectedWithoutReplacement,
  keepsRejectedInOutstanding,
} from "@/modules/sales/services/exception-rules";
import { parseQuantity } from "@/modules/sales/services/order-lifecycle-rules";

export class UnavailableOrderDispositionAdapter implements OrderDispositionPort {
  async getDisposition(
    businessId: string,
    orderId: string
  ): Promise<OrderDispositionOutcome> {
    return {
      businessId,
      orderId,
      available: false,
      cancellationAuthorized: false,
      cancellationReason: null,
      lines: [],
    };
  }
}

export class InMemoryOrderDispositionAdapter implements OrderDispositionPort {
  private readonly rows = new Map<string, OrderDispositionOutcome>();

  private key(businessId: string, orderId: string) {
    return `${businessId}:${orderId}`;
  }

  setDisposition(outcome: OrderDispositionOutcome) {
    this.rows.set(this.key(outcome.businessId, outcome.orderId), outcome);
  }

  authorizeCancellation(
    businessId: string,
    orderId: string,
    reason?: string | null
  ) {
    const existing = this.rows.get(this.key(businessId, orderId));
    this.setDisposition({
      businessId,
      orderId,
      available: true,
      cancellationAuthorized: true,
      cancellationReason: reason ?? existing?.cancellationReason ?? null,
      lines: existing?.lines ?? [],
    });
  }

  async getDisposition(
    businessId: string,
    orderId: string
  ): Promise<OrderDispositionOutcome> {
    const stored = this.rows.get(this.key(businessId, orderId));
    if (!stored || stored.businessId !== businessId) {
      return {
        businessId,
        orderId,
        available: false,
        cancellationAuthorized: false,
        cancellationReason: null,
        lines: [],
      };
    }
    return stored;
  }
}

export class PersistedOrderDispositionAdapter implements OrderDispositionPort {
  constructor(private readonly exceptions: SalesExceptionRepositoryPort) {}

  async getDisposition(
    businessId: string,
    orderId: string
  ): Promise<OrderDispositionOutcome> {
    const instructions = (
      await this.exceptions.listInstructionsByOrder(businessId, orderId)
    ).filter((row) => row.status === SALES_INSTRUCTION_STATUS_CODES.APPROVED);
    const cancel = instructions.find(
      (row) => row.instructionType === SALES_DISPOSITION_TYPES.CANCEL
    );
    const byLine = new Map<string, LineDispositionOutcome>();
    for (const row of instructions) {
      if (!row.salesOrderLineId) {
        continue;
      }
      const current = byLine.get(row.salesOrderLineId) ?? {
        orderLineId: row.salesOrderLineId,
        closedWithoutReplacementQuantity: 0,
        replacementPendingQuantity: 0,
      };
      const qty = parseQuantity(row.quantity);
      if (closesRejectedWithoutReplacement(row.instructionType)) {
        current.closedWithoutReplacementQuantity += qty;
      }
      if (keepsRejectedInOutstanding(row.instructionType)) {
        current.replacementPendingQuantity += qty;
      }
      byLine.set(row.salesOrderLineId, current);
    }
    return {
      businessId,
      orderId,
      available: true,
      cancellationAuthorized: Boolean(cancel),
      cancellationReason: cancel?.reasonCode ?? cancel?.comments ?? null,
      lines: [...byLine.values()],
    };
  }
}

export function createUnavailableOrderDispositionAdapter() {
  return new UnavailableOrderDispositionAdapter();
}

export function createPersistedOrderDispositionAdapter(
  exceptions: SalesExceptionRepositoryPort
) {
  return new PersistedOrderDispositionAdapter(exceptions);
}
