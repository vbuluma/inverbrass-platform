/**
 * Purpose:
 * Read approved purchase-request budget for sourcing. Not a second budget ledger.
 */

import { PURCHASE_REQUEST_STATUSES } from "@/modules/procurement/constants";
import type { ApprovedRequestBudgetPort, PurchaseRequestRepositoryPort } from "@/modules/procurement/ports";
import { createPurchaseRequestRepository } from "@/modules/procurement/repositories/purchase-request-repository";

export class SourcingBudgetAdapter implements ApprovedRequestBudgetPort {
  constructor(
    private readonly requests: PurchaseRequestRepositoryPort = createPurchaseRequestRepository()
  ) {}

  async getApproved(businessId: string, requestId: string) {
    const row = await this.requests.findById(businessId, requestId);
    if (!row || row.status !== PURCHASE_REQUEST_STATUSES.APPROVED) {
      return null;
    }
    return {
      id: row.id,
      requestNumber: row.requestNumber,
      status: row.status,
      estimatedValue: row.estimatedValue,
      currencyCode: row.currencyCode,
    };
  }

  async getLinked(businessId: string, requestId: string) {
    const row = await this.requests.findById(businessId, requestId);
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      requestNumber: row.requestNumber,
      status: row.status,
      estimatedValue: row.estimatedValue,
      currencyCode: row.currencyCode,
    };
  }
}

export function createSourcingBudgetAdapter() {
  return new SourcingBudgetAdapter();
}
