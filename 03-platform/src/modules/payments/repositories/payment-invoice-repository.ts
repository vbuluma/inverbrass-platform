/**
 * Purpose:
 * Persist customer invoices with tenant isolation.
 *
 * Implementation Package:
 * BP-007 / IP-04 – Billing, Invoicing & Credit Sales
 */

import { and, desc, eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { invoiceAdjustment } from "@/db/schema/invoice-adjustment";
import { paymentInvoice } from "@/db/schema/payment-invoice";
import { PAYMENT_ERROR_CODES, PaymentObligationError } from "@/modules/payments/errors";
import type { PaymentInvoiceRepositoryPort } from "@/modules/payments/ports";
import type {
  InvoiceAdjustmentRecord,
  PaymentInvoiceInsert,
  PaymentInvoiceRecord,
} from "@/modules/payments/types";

type DbClient = PostgresJsDatabase<typeof schema>;

function mapInvoice(row: typeof paymentInvoice.$inferSelect): PaymentInvoiceRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    obligationId: row.obligationId,
    salesOrderId: row.salesOrderId,
    orderNumber: row.orderNumber,
    customerId: row.customerId,
    invoiceNumber: row.invoiceNumber,
    numberingPolicyId: row.numberingPolicyId,
    currencyCode: row.currencyCode,
    invoiceAmount: String(row.invoiceAmount),
    paidAmount: String(row.paidAmount),
    outstandingAmount: String(row.outstandingAmount),
    openingPaidAmount: String(row.openingPaidAmount),
    amountDueSnapshot: String(row.amountDueSnapshot),
    commercialContractId: row.commercialContractId,
    snapshotId: row.snapshotId,
    paymentTermCode: row.paymentTermCode,
    issueDate: row.issueDate,
    dueDate: row.dueDate,
    status: row.status,
    documentId: row.documentId,
    documentStatus: row.documentStatus,
    cancellationReason: row.cancellationReason,
    cancelledAt: row.cancelledAt,
    cancelledBy: row.cancelledBy,
    idempotencyKey: row.idempotencyKey,
    provenance: (row.provenance as Record<string, unknown> | null) ?? null,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  };
}

function mapAdjustment(
  row: typeof invoiceAdjustment.$inferSelect
): InvoiceAdjustmentRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    invoiceId: row.invoiceId,
    adjustmentType: row.adjustmentType,
    status: row.status,
    amount: String(row.amount),
    currencyCode: row.currencyCode,
    reason: row.reason,
    handedOffToIp06: row.handedOffToIp06,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
  };
}

export class PaymentInvoiceRepository implements PaymentInvoiceRepositoryPort {
  constructor(private readonly db: DbClient = getDb()) {}

  async insert(values: PaymentInvoiceInsert): Promise<PaymentInvoiceRecord> {
    try {
      const [row] = await this.db
        .insert(paymentInvoice)
        .values({
          id: values.id,
          businessId: values.businessId,
          obligationId: values.obligationId,
          salesOrderId: values.salesOrderId,
          orderNumber: values.orderNumber,
          customerId: values.customerId,
          invoiceNumber: values.invoiceNumber,
          numberingPolicyId: values.numberingPolicyId,
          currencyCode: values.currencyCode,
          invoiceAmount: values.invoiceAmount,
          paidAmount: values.paidAmount,
          outstandingAmount: values.outstandingAmount,
          openingPaidAmount: values.openingPaidAmount,
          amountDueSnapshot: values.amountDueSnapshot,
          commercialContractId: values.commercialContractId,
          snapshotId: values.snapshotId,
          paymentTermCode: values.paymentTermCode,
          issueDate: values.issueDate,
          dueDate: values.dueDate,
          status: values.status,
          documentId: values.documentId,
          documentStatus: values.documentStatus,
          cancellationReason: values.cancellationReason,
          cancelledAt: values.cancelledAt,
          cancelledBy: values.cancelledBy,
          idempotencyKey: values.idempotencyKey,
          provenance: values.provenance,
          metadata: values.metadata,
          createdBy: values.createdBy,
          updatedBy: values.updatedBy,
        })
        .returning();
      if (!row) {
        throw new PaymentObligationError(PAYMENT_ERROR_CODES.PROVIDER_ERROR, undefined, 500);
      }
      return mapInvoice(row);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("payment_invoice_business_idempotency_uidx")) {
        throw new PaymentObligationError(
          PAYMENT_ERROR_CODES.IDEMPOTENCY_CONFLICT,
          undefined,
          409
        );
      }
      throw error;
    }
  }

  async update(
    businessId: string,
    invoiceId: string,
    patch: Partial<
      Pick<
        PaymentInvoiceRecord,
        | "status"
        | "paidAmount"
        | "outstandingAmount"
        | "issueDate"
        | "dueDate"
        | "documentId"
        | "documentStatus"
        | "cancellationReason"
        | "cancelledAt"
        | "cancelledBy"
        | "updatedBy"
        | "metadata"
      >
    >
  ): Promise<PaymentInvoiceRecord> {
    const [row] = await this.db
      .update(paymentInvoice)
      .set({
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.paidAmount !== undefined ? { paidAmount: patch.paidAmount } : {}),
        ...(patch.outstandingAmount !== undefined
          ? { outstandingAmount: patch.outstandingAmount }
          : {}),
        ...(patch.issueDate !== undefined ? { issueDate: patch.issueDate } : {}),
        ...(patch.dueDate !== undefined ? { dueDate: patch.dueDate } : {}),
        ...(patch.documentId !== undefined ? { documentId: patch.documentId } : {}),
        ...(patch.documentStatus !== undefined
          ? { documentStatus: patch.documentStatus }
          : {}),
        ...(patch.cancellationReason !== undefined
          ? { cancellationReason: patch.cancellationReason }
          : {}),
        ...(patch.cancelledAt !== undefined ? { cancelledAt: patch.cancelledAt } : {}),
        ...(patch.cancelledBy !== undefined ? { cancelledBy: patch.cancelledBy } : {}),
        ...(patch.updatedBy !== undefined ? { updatedBy: patch.updatedBy } : {}),
        ...(patch.metadata !== undefined ? { metadata: patch.metadata } : {}),
        updatedAt: new Date(),
      })
      .where(
        and(eq(paymentInvoice.businessId, businessId), eq(paymentInvoice.id, invoiceId))
      )
      .returning();
    if (!row) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.INVOICE_NOT_FOUND,
        undefined,
        404
      );
    }
    return mapInvoice(row);
  }

  async findById(businessId: string, invoiceId: string) {
    const [row] = await this.db
      .select()
      .from(paymentInvoice)
      .where(
        and(eq(paymentInvoice.businessId, businessId), eq(paymentInvoice.id, invoiceId))
      )
      .limit(1);
    return row ? mapInvoice(row) : null;
  }

  async findByIdempotencyKey(businessId: string, idempotencyKey: string) {
    const [row] = await this.db
      .select()
      .from(paymentInvoice)
      .where(
        and(
          eq(paymentInvoice.businessId, businessId),
          eq(paymentInvoice.idempotencyKey, idempotencyKey)
        )
      )
      .limit(1);
    return row ? mapInvoice(row) : null;
  }

  async findActiveByObligation(businessId: string, obligationId: string) {
    const rows = await this.db
      .select()
      .from(paymentInvoice)
      .where(
        and(
          eq(paymentInvoice.businessId, businessId),
          eq(paymentInvoice.obligationId, obligationId)
        )
      )
      .orderBy(desc(paymentInvoice.createdAt));
    return (
      rows
        .map(mapInvoice)
        .find(
          (row) => row.status !== "CANCELLED" && row.status !== "CREDITED"
        ) ?? null
    );
  }

  async listByBusiness(businessId: string) {
    const rows = await this.db
      .select()
      .from(paymentInvoice)
      .where(eq(paymentInvoice.businessId, businessId))
      .orderBy(desc(paymentInvoice.createdAt));
    return rows.map(mapInvoice);
  }

  async listByObligation(businessId: string, obligationId: string) {
    const rows = await this.db
      .select()
      .from(paymentInvoice)
      .where(
        and(
          eq(paymentInvoice.businessId, businessId),
          eq(paymentInvoice.obligationId, obligationId)
        )
      )
      .orderBy(desc(paymentInvoice.createdAt));
    return rows.map(mapInvoice);
  }

  async countAll(businessId: string) {
    const [row] = await this.db
      .select({ value: sql<number>`count(*)` })
      .from(paymentInvoice)
      .where(eq(paymentInvoice.businessId, businessId));
    return Number(row?.value ?? 0);
  }

  async insertAdjustment(values: {
    businessId: string;
    invoiceId: string;
    adjustmentType: string;
    status: string;
    amount: string;
    currencyCode: string;
    reason: string;
    handedOffToIp06: string;
    createdBy: string | null;
  }): Promise<InvoiceAdjustmentRecord> {
    const [row] = await this.db
      .insert(invoiceAdjustment)
      .values(values)
      .returning();
    if (!row) {
      throw new PaymentObligationError(PAYMENT_ERROR_CODES.PROVIDER_ERROR, undefined, 500);
    }
    return mapAdjustment(row);
  }

  async listAdjustments(businessId: string, invoiceId: string) {
    const rows = await this.db
      .select()
      .from(invoiceAdjustment)
      .where(
        and(
          eq(invoiceAdjustment.businessId, businessId),
          eq(invoiceAdjustment.invoiceId, invoiceId)
        )
      )
      .orderBy(desc(invoiceAdjustment.createdAt));
    return rows.map(mapAdjustment);
  }
}

export function createPaymentInvoiceRepository() {
  return new PaymentInvoiceRepository();
}
