/**
 * Purpose:
 * Consume the BP-006 payment-ready contract. Does not scrape sales_order lines.
 *
 * Implementation Package:
 * BP-007 / IP-01 – Payment Obligation & Provider Integration Foundation
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import { SalesOrderError } from "@/modules/sales/errors";
import { createSalesOrderService } from "@/modules/sales/services/sales-order-service";
import type { PaymentReadyOrderContract } from "@/modules/sales/types";
import type { PaymentReadyContractPort } from "@/modules/payments/ports";
import type { PaymentReadyContract } from "@/modules/payments/types";

function toConsumed(contract: PaymentReadyOrderContract): PaymentReadyContract {
  return {
    orderId: contract.orderId,
    orderNumber: contract.orderNumber,
    businessId: contract.businessId,
    customerId: contract.customerId,
    expectedAmount: contract.expectedAmount,
    currency: contract.currency,
    commercialContractId: contract.commercialContractId,
    snapshotId: contract.snapshotId,
    operationalStatus: contract.operationalStatus,
    financialInstructionType: contract.financialInstructionType,
    expiresAt: null,
    lines: contract.lines.map((line) => ({
      orderLineId: line.orderLineId,
      offeringId: line.offeringId,
      expectedPayable: line.expectedPayable,
      currencyCode: line.currencyCode,
    })),
  };
}

export class SalesPaymentReadyContractAdapter implements PaymentReadyContractPort {
  constructor(private readonly sales = createSalesOrderService()) {}

  async getByOrderId(
    context: CurrentBusinessContext,
    orderId: string
  ): Promise<PaymentReadyContract | null> {
    try {
      const contract = await this.sales.getPaymentReadyContract(context, orderId);
      return toConsumed(contract);
    } catch (error) {
      if (error instanceof SalesOrderError) {
        if (
          error.code === "ORDER_NOT_FOUND" ||
          error.code === "CROSS_BUSINESS_ACCESS"
        ) {
          return null;
        }
      }
      throw error;
    }
  }
}

export function createSalesPaymentReadyContractAdapter() {
  return new SalesPaymentReadyContractAdapter();
}
