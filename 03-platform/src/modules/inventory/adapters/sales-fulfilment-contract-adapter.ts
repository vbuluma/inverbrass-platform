/**
 * Purpose:
 * Consume the BP-006 fulfilment handoff contract. Does not write sales
 * tables and does not inspect payment transaction status.
 *
 * Implementation Package:
 * BP-008 / IP-03 – Stock Reservation & Sales Deduction
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import type { InventorySalesFulfilmentPort } from "@/modules/inventory/ports";
import type { InventorySalesFulfilmentContract } from "@/modules/inventory/types";
import { toFulfilmentHandoffContract } from "@/modules/sales/services/handoff-rules";
import { createSalesOrderService } from "@/modules/sales/services/sales-order-service";

export class SalesFulfilmentContractAdapter implements InventorySalesFulfilmentPort {
  constructor(private readonly sales = createSalesOrderService()) {}

  async getByOrderId(
    context: CurrentBusinessContext,
    orderId: string
  ): Promise<InventorySalesFulfilmentContract | null> {
    try {
      const detail = await this.sales.getOrder(context, orderId);
      const fulfilment = toFulfilmentHandoffContract(detail);
      return {
        orderId: fulfilment.orderId,
        orderNumber: fulfilment.orderNumber,
        businessId: fulfilment.businessId,
        operationalStatus: detail.status,
        lines: fulfilment.lines.map((line) => ({
          orderLineId: line.orderLineId,
          offeringId: line.offeringId,
          orderedQuantity: line.orderedQuantity,
          salesUomId: line.salesUomId,
          outstandingQuantity: line.outstandingQuantity,
          acceptedQuantity: line.acceptedQuantity,
          lineType: line.lineType,
          fulfilmentStatus: line.fulfilmentStatus,
        })),
      };
    } catch {
      return null;
    }
  }
}

export function createSalesFulfilmentContractAdapter() {
  return new SalesFulfilmentContractAdapter();
}
