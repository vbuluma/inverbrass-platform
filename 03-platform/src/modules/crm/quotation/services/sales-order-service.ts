/**
 * Purpose:
 * BP-004 conversion stub now delegates order persistence to BP-006 IP-01.
 * CRM does not own the sales order record.
 *
 * Implementation Package:
 * BP-004 / IP-10 – Quotations & Sales Pipeline (handoff)
 * BP-006 / IP-01 – Sales & Order Creation (owner)
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import { CrmError, CRM_USER_MESSAGES } from "@/modules/crm/errors";
import type { SalesOrderDetailView } from "@/modules/crm/quotation/types";
import { SalesOrderError } from "@/modules/sales/errors";
import { createSalesOrderService as createBp006SalesOrderService } from "@/modules/sales/services/sales-order-service";
import type { SalesOrderDetailView as Bp006SalesOrderDetailView } from "@/modules/sales/types";

function mapToCrmView(order: Bp006SalesOrderDetailView): SalesOrderDetailView {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    quotationId: order.quotationId ?? "",
    quotationVersionId: order.quotationVersionId,
    partyId: order.customerId,
    accountId: null,
    opportunityId: order.opportunityId,
    status: order.status,
    handoffStatus: "PENDING",
    currencyCode: order.currencyCode,
    subtotal: Number(order.principalAmount),
    taxAmount: Number(order.taxAmount),
    grandTotal: Number(order.expectedAmount),
    lines: order.lines.map((line) => ({
      id: line.id,
      lineNumber: line.lineNumber,
      offeringId: line.offeringId,
      description: line.description,
      quantity: Number(line.orderedQuantity),
      unitPrice: Number(line.agreedUnitValue),
      lineTotal: Number(line.commercialLineAmount),
      quotationLineId: line.quotationLineId,
    })),
    createdAt: order.createdAt,
  };
}

export class SalesOrderService {
  async createFromQuotation(
    context: CurrentBusinessContext,
    quotationId: string
  ): Promise<SalesOrderDetailView> {
    try {
      const order = await createBp006SalesOrderService().convertFromQuotation(context, {
        quotationId,
      });
      return mapToCrmView(order);
    } catch (error) {
      if (error instanceof SalesOrderError) {
        if (error.code === "QUOTATION_NOT_ELIGIBLE") {
          throw new CrmError("QUOTATION_EXPIRED", error.message, 409);
        }
        if (
          error.code === "QUOTATION_ALREADY_CONVERTED" ||
          error.code === "ORDER_ALREADY_EXISTS"
        ) {
          throw new CrmError(
            "SALES_ORDER_ALREADY_EXISTS",
            CRM_USER_MESSAGES.SALES_ORDER_ALREADY_EXISTS,
            409
          );
        }
        throw new CrmError("INVALID_INPUT", error.message, error.statusCode, error.field);
      }
      throw error;
    }
  }

  async getByQuotationId(
    context: CurrentBusinessContext,
    quotationId: string
  ): Promise<SalesOrderDetailView | null> {
    try {
      const order = await createBp006SalesOrderService().getByQuotationId(
        context,
        quotationId
      );
      return order ? mapToCrmView(order) : null;
    } catch (error) {
      if (error instanceof SalesOrderError) {
        throw new CrmError("INVALID_INPUT", error.message, error.statusCode, error.field);
      }
      throw error;
    }
  }
}

export function createSalesOrderService() {
  return new SalesOrderService();
}
