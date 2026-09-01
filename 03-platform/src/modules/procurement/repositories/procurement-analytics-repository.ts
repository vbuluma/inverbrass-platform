/**
 * Purpose:
 * Read-only procurement analytics queries for BP-009 IP-12.
 */

import { and, count, eq, gte, inArray, isNull, lte, sql, sum } from "drizzle-orm";

import { getDb } from "@/db/client";
import { procurementContract } from "@/db/schema/procurement-contract";
import { procurementException } from "@/db/schema/procurement-exception";
import { procurementSupplierInvoice } from "@/db/schema/procurement-invoice";
import { procurementProfile, procurementProfileCategory } from "@/db/schema/procurement-profile";
import { procurementPurchaseOrder } from "@/db/schema/procurement-purchase-order";
import { procurementPurchaseRequest } from "@/db/schema/procurement-purchase-request";
import { procurementReceipt } from "@/db/schema/procurement-receiving";
import {
  procurementAward,
  procurementSourcingEvent,
  procurementSourcingInvitation,
  procurementSupplierQuote,
} from "@/db/schema/procurement-sourcing";
import {
  CONTRACT_STATUSES,
  EXCEPTION_STATUSES,
  INVOICE_STATUSES,
  LIFECYCLE_ANCHOR_TYPES,
  PO_STATUSES,
} from "@/modules/procurement/constants";
import { PROCUREMENT_ERROR_CODES, ProcurementError } from "@/modules/procurement/errors";
import type { LifecycleSnapshot } from "@/modules/procurement/services/procurement-lifecycle-rules";

const OPEN_EXCEPTION_STATUSES = [
  EXCEPTION_STATUSES.OPEN,
  EXCEPTION_STATUSES.ASSIGNED,
  EXCEPTION_STATUSES.IN_PROGRESS,
  EXCEPTION_STATUSES.RESOLVED_PENDING_APPROVAL,
] as const;

const OUTSTANDING_PO_STATUSES = [
  PO_STATUSES.ISSUED,
  PO_STATUSES.ACCEPTED,
  PO_STATUSES.PARTIALLY_FULFILLED,
] as const;

const UNMATCHED_INVOICE_STATUSES = [INVOICE_STATUSES.UNMATCHED, INVOICE_STATUSES.VARIANCE] as const;

export class ProcurementAnalyticsRepository {
  constructor(private readonly db = getDb()) {}

  async getSpendBySupplier(businessId: string) {
    const rows = await this.db
      .select({
        profileId: procurementPurchaseOrder.profileId,
        amount: sum(procurementPurchaseOrder.totalAmount),
      })
      .from(procurementPurchaseOrder)
      .where(
        and(
          eq(procurementPurchaseOrder.businessId, businessId),
          isNull(procurementPurchaseOrder.deletedAt),
          sql`${procurementPurchaseOrder.issuedAt} IS NOT NULL`
        )
      )
      .groupBy(procurementPurchaseOrder.profileId);
    return rows.map((row) => ({
      profileId: row.profileId,
      amount: row.amount ?? "0",
    }));
  }

  async getSpendByCategory(businessId: string) {
    const rows = await this.db
      .select({
        categoryCode: procurementProfileCategory.categoryCode,
        amount: sum(procurementPurchaseOrder.totalAmount),
      })
      .from(procurementPurchaseOrder)
      .innerJoin(
        procurementProfileCategory,
        eq(procurementProfileCategory.profileId, procurementPurchaseOrder.profileId)
      )
      .where(
        and(
          eq(procurementPurchaseOrder.businessId, businessId),
          eq(procurementProfileCategory.businessId, businessId),
          isNull(procurementPurchaseOrder.deletedAt),
          sql`${procurementPurchaseOrder.issuedAt} IS NOT NULL`
        )
      )
      .groupBy(procurementProfileCategory.categoryCode);
    return rows.map((row) => ({
      categoryCode: row.categoryCode,
      amount: row.amount ?? "0",
    }));
  }

  async getSpendByBusinessUnit(businessId: string) {
    const rows = await this.db
      .select({
        businessUnitCode: procurementPurchaseRequest.businessUnitCode,
        amount: sum(procurementPurchaseOrder.totalAmount),
      })
      .from(procurementPurchaseOrder)
      .innerJoin(
        procurementPurchaseRequest,
        eq(procurementPurchaseRequest.id, procurementPurchaseOrder.purchaseRequestId)
      )
      .where(
        and(
          eq(procurementPurchaseOrder.businessId, businessId),
          isNull(procurementPurchaseOrder.deletedAt),
          sql`${procurementPurchaseOrder.issuedAt} IS NOT NULL`
        )
      )
      .groupBy(procurementPurchaseRequest.businessUnitCode);
    return rows.map((row) => ({
      businessUnitCode: row.businessUnitCode ?? "UNASSIGNED",
      amount: row.amount ?? "0",
    }));
  }

  async countOutstandingPurchaseOrders(businessId: string) {
    const [row] = await this.db
      .select({ value: count() })
      .from(procurementPurchaseOrder)
      .where(
        and(
          eq(procurementPurchaseOrder.businessId, businessId),
          inArray(procurementPurchaseOrder.status, [...OUTSTANDING_PO_STATUSES]),
          isNull(procurementPurchaseOrder.deletedAt)
        )
      );
    return Number(row?.value ?? 0);
  }

  async countUnmatchedInvoices(businessId: string) {
    const [row] = await this.db
      .select({ value: count() })
      .from(procurementSupplierInvoice)
      .where(
        and(
          eq(procurementSupplierInvoice.businessId, businessId),
          inArray(procurementSupplierInvoice.status, [...UNMATCHED_INVOICE_STATUSES])
        )
      );
    return Number(row?.value ?? 0);
  }

  async countOpenExceptions(businessId: string) {
    const [row] = await this.db
      .select({ value: count() })
      .from(procurementException)
      .where(
        and(
          eq(procurementException.businessId, businessId),
          inArray(procurementException.status, [...OPEN_EXCEPTION_STATUSES])
        )
      );
    return Number(row?.value ?? 0);
  }

  async countContractExpiries(businessId: string, withinDays = 90) {
    const today = new Date();
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + withinDays);
    const [row] = await this.db
      .select({ value: count() })
      .from(procurementContract)
      .where(
        and(
          eq(procurementContract.businessId, businessId),
          inArray(procurementContract.status, [CONTRACT_STATUSES.ACTIVE, CONTRACT_STATUSES.EXPIRING]),
          gte(procurementContract.endDate, today.toISOString().slice(0, 10)),
          lte(procurementContract.endDate, horizon.toISOString().slice(0, 10))
        )
      );
    return Number(row?.value ?? 0);
  }

  async getRfxMetrics(businessId: string) {
    const [events] = await this.db
      .select({ value: count() })
      .from(procurementSourcingEvent)
      .where(eq(procurementSourcingEvent.businessId, businessId));
    const [invitations] = await this.db
      .select({ value: count() })
      .from(procurementSourcingInvitation)
      .where(eq(procurementSourcingInvitation.businessId, businessId));
    const [responses] = await this.db
      .select({ value: count() })
      .from(procurementSupplierQuote)
      .where(
        and(
          eq(procurementSupplierQuote.businessId, businessId),
          sql`${procurementSupplierQuote.submittedAt} IS NOT NULL`
        )
      );
    const [awards] = await this.db
      .select({ value: count() })
      .from(procurementAward)
      .where(eq(procurementAward.businessId, businessId));
    return {
      eventCount: Number(events?.value ?? 0),
      invitationCount: Number(invitations?.value ?? 0),
      responseCount: Number(responses?.value ?? 0),
      awardCount: Number(awards?.value ?? 0),
    };
  }

  async countSupplierStatus(businessId: string) {
    const rows = await this.db
      .select({
        statusCode: procurementProfile.statusCode,
        isPreferred: procurementProfile.isPreferred,
        value: count(),
      })
      .from(procurementProfile)
      .where(eq(procurementProfile.businessId, businessId))
      .groupBy(procurementProfile.statusCode, procurementProfile.isPreferred);
    return rows;
  }

  async loadLifecycleSnapshot(
    businessId: string,
    anchorType: string,
    anchorId: string
  ): Promise<LifecycleSnapshot> {
    if (anchorType === LIFECYCLE_ANCHOR_TYPES.PURCHASE_ORDER) {
      return this.loadFromPurchaseOrder(businessId, anchorId);
    }
    if (anchorType === LIFECYCLE_ANCHOR_TYPES.PURCHASE_REQUEST) {
      return this.loadFromPurchaseRequest(businessId, anchorId);
    }
    if (anchorType === LIFECYCLE_ANCHOR_TYPES.INVOICE) {
      return this.loadFromInvoice(businessId, anchorId);
    }
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.PROFILE_NOT_FOUND, undefined, 404);
  }

  private async loadFromPurchaseOrder(businessId: string, poId: string): Promise<LifecycleSnapshot> {
    const [po] = await this.db
      .select()
      .from(procurementPurchaseOrder)
      .where(
        and(eq(procurementPurchaseOrder.businessId, businessId), eq(procurementPurchaseOrder.id, poId))
      )
      .limit(1);
    if (!po) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.PROFILE_NOT_FOUND, undefined, 404);
    }
    const snapshot: LifecycleSnapshot = {
      purchaseOrder: {
        id: po.id,
        number: po.poNumber,
        status: po.status,
        issuedAt: po.issuedAt?.toISOString() ?? null,
        acceptedAt: po.acceptedAt?.toISOString() ?? null,
      },
    };
    if (po.purchaseRequestId) {
      const [pr] = await this.db
        .select()
        .from(procurementPurchaseRequest)
        .where(eq(procurementPurchaseRequest.id, po.purchaseRequestId))
        .limit(1);
      if (pr) {
        snapshot.purchaseRequest = {
          id: pr.id,
          number: pr.requestNumber,
          status: pr.status,
          submittedAt: pr.submittedAt?.toISOString() ?? null,
          approvedAt: pr.approvedAt?.toISOString() ?? null,
        };
      }
    }
    if (po.sourcingEventId) {
      const [event] = await this.db
        .select()
        .from(procurementSourcingEvent)
        .where(eq(procurementSourcingEvent.id, po.sourcingEventId))
        .limit(1);
      if (event) {
        snapshot.sourcingEvent = {
          id: event.id,
          number: event.eventNumber,
          status: event.status,
          createdAt: event.createdAt?.toISOString() ?? null,
          closedAt: event.closedAt?.toISOString() ?? null,
        };
      }
    }
    if (po.awardId) {
      const [award] = await this.db
        .select()
        .from(procurementAward)
        .where(eq(procurementAward.id, po.awardId))
        .limit(1);
      if (award) {
        snapshot.award = {
          id: award.id,
          status: "AWARDED",
          createdAt: award.createdAt?.toISOString() ?? null,
        };
      }
    }
    if (po.contractId) {
      const [contract] = await this.db
        .select()
        .from(procurementContract)
        .where(eq(procurementContract.id, po.contractId))
        .limit(1);
      if (contract) {
        snapshot.contract = {
          id: contract.id,
          number: contract.contractNumber,
          status: contract.status,
          activatedAt: contract.activatedAt?.toISOString() ?? null,
        };
      }
    }
    const [receipt] = await this.db
      .select()
      .from(procurementReceipt)
      .where(
        and(
          eq(procurementReceipt.businessId, businessId),
          eq(procurementReceipt.purchaseOrderId, po.id)
        )
      )
      .limit(1);
    if (receipt) {
      snapshot.receipt = {
        id: receipt.id,
        number: receipt.receiptNumber,
        status: receipt.status,
        confirmedAt: receipt.confirmedAt?.toISOString() ?? null,
      };
    }
    const [invoice] = await this.db
      .select()
      .from(procurementSupplierInvoice)
      .where(
        and(
          eq(procurementSupplierInvoice.businessId, businessId),
          eq(procurementSupplierInvoice.purchaseOrderId, po.id)
        )
      )
      .limit(1);
    if (invoice) {
      snapshot.invoice = {
        id: invoice.id,
        number: invoice.internalInvoiceNumber,
        status: invoice.status,
        matchedAt: invoice.matchedAt?.toISOString() ?? null,
        paymentReadyAt: invoice.paymentReadyAt?.toISOString() ?? null,
      };
    }
    return snapshot;
  }

  private async loadFromPurchaseRequest(
    businessId: string,
    requestId: string
  ): Promise<LifecycleSnapshot> {
    const [pr] = await this.db
      .select()
      .from(procurementPurchaseRequest)
      .where(
        and(
          eq(procurementPurchaseRequest.businessId, businessId),
          eq(procurementPurchaseRequest.id, requestId)
        )
      )
      .limit(1);
    if (!pr) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.PROFILE_NOT_FOUND, undefined, 404);
    }
    const [po] = await this.db
      .select()
      .from(procurementPurchaseOrder)
      .where(
        and(
          eq(procurementPurchaseOrder.businessId, businessId),
          eq(procurementPurchaseOrder.purchaseRequestId, requestId)
        )
      )
      .limit(1);
    if (po) {
      return this.loadFromPurchaseOrder(businessId, po.id);
    }
    return {
      purchaseRequest: {
        id: pr.id,
        number: pr.requestNumber,
        status: pr.status,
        submittedAt: pr.submittedAt?.toISOString() ?? null,
        approvedAt: pr.approvedAt?.toISOString() ?? null,
      },
    };
  }

  private async loadFromInvoice(businessId: string, invoiceId: string): Promise<LifecycleSnapshot> {
    const [invoice] = await this.db
      .select()
      .from(procurementSupplierInvoice)
      .where(
        and(
          eq(procurementSupplierInvoice.businessId, businessId),
          eq(procurementSupplierInvoice.id, invoiceId)
        )
      )
      .limit(1);
    if (!invoice?.purchaseOrderId) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.PROFILE_NOT_FOUND, undefined, 404);
    }
    return this.loadFromPurchaseOrder(businessId, invoice.purchaseOrderId);
  }
}

export function createProcurementAnalyticsRepository() {
  return new ProcurementAnalyticsRepository();
}
