/**
 * Purpose:
 * Persist immutable payment receipts with tenant isolation.
 *
 * Implementation Package:
 * BP-007 / IP-05 – Receipting & Payment Evidence
 */

import { and, desc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { paymentReceipt, paymentReceiptDelivery } from "@/db/schema/payment-receipt";
import { PAYMENT_ERROR_CODES, PaymentObligationError } from "@/modules/payments/errors";
import type { PaymentReceiptRepositoryPort } from "@/modules/payments/ports";
import type {
  PaymentReceiptDeliveryRecord,
  PaymentReceiptInsert,
  PaymentReceiptRecord,
} from "@/modules/payments/types";

type DbClient = PostgresJsDatabase<typeof schema>;

function mapReceipt(row: typeof paymentReceipt.$inferSelect): PaymentReceiptRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    receiptNumber: row.receiptNumber,
    numberingPolicyId: row.numberingPolicyId,
    paymentTransactionId: row.paymentTransactionId,
    paymentObligationId: row.paymentObligationId,
    customerId: row.customerId,
    salesOrderId: row.salesOrderId,
    orderNumber: row.orderNumber,
    invoiceId: row.invoiceId,
    invoiceNumber: row.invoiceNumber,
    currencyCode: row.currencyCode,
    amount: String(row.amount),
    paymentDateTime: row.paymentDateTime,
    methodId: row.methodId,
    networkId: row.networkId,
    providerId: row.providerId,
    channelId: row.channelId,
    methodName: row.methodName,
    networkName: row.networkName,
    providerName: row.providerName,
    channelName: row.channelName,
    providerTransactionReference: row.providerTransactionReference,
    internalPaymentTransactionNumber: row.internalPaymentTransactionNumber,
    documentId: row.documentId,
    documentStorageKey: row.documentStorageKey,
    documentStatus: row.documentStatus,
    status: row.status,
    deliveryStatus: row.deliveryStatus,
    originalReceiptId: row.originalReceiptId,
    idempotencyKey: row.idempotencyKey,
    evidence: (row.evidence as Record<string, unknown> | null) ?? null,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  };
}

function mapDelivery(
  row: typeof paymentReceiptDelivery.$inferSelect
): PaymentReceiptDeliveryRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    receiptId: row.receiptId,
    channel: row.channel,
    status: row.status,
    failureReason: row.failureReason,
    requestedAt: row.requestedAt,
    createdBy: row.createdBy,
  };
}

export class PaymentReceiptRepository implements PaymentReceiptRepositoryPort {
  constructor(private readonly db: DbClient = getDb()) {}

  async insert(values: PaymentReceiptInsert): Promise<PaymentReceiptRecord> {
    try {
      const [row] = await this.db
        .insert(paymentReceipt)
        .values({
          id: values.id,
          businessId: values.businessId,
          receiptNumber: values.receiptNumber,
          numberingPolicyId: values.numberingPolicyId,
          paymentTransactionId: values.paymentTransactionId,
          paymentObligationId: values.paymentObligationId,
          customerId: values.customerId,
          salesOrderId: values.salesOrderId,
          orderNumber: values.orderNumber,
          invoiceId: values.invoiceId,
          invoiceNumber: values.invoiceNumber,
          currencyCode: values.currencyCode,
          amount: values.amount,
          paymentDateTime: values.paymentDateTime,
          methodId: values.methodId,
          networkId: values.networkId,
          providerId: values.providerId,
          channelId: values.channelId,
          methodName: values.methodName,
          networkName: values.networkName,
          providerName: values.providerName,
          channelName: values.channelName,
          providerTransactionReference: values.providerTransactionReference,
          internalPaymentTransactionNumber: values.internalPaymentTransactionNumber,
          documentId: values.documentId,
          documentStorageKey: values.documentStorageKey,
          documentStatus: values.documentStatus,
          status: values.status,
          deliveryStatus: values.deliveryStatus,
          originalReceiptId: values.originalReceiptId,
          idempotencyKey: values.idempotencyKey,
          evidence: values.evidence,
          metadata: values.metadata,
          createdBy: values.createdBy,
          updatedBy: values.updatedBy,
        })
        .returning();
      if (!row) {
        throw new PaymentObligationError(PAYMENT_ERROR_CODES.PROVIDER_ERROR, undefined, 500);
      }
      return mapReceipt(row);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (
        message.includes("payment_receipt_business_idempotency_uidx") ||
        message.includes("payment_receipt_business_transaction_uidx")
      ) {
        throw new PaymentObligationError(
          PAYMENT_ERROR_CODES.IDEMPOTENCY_CONFLICT,
          undefined,
          409
        );
      }
      throw error;
    }
  }

  async updateDelivery(
    businessId: string,
    receiptId: string,
    patch: Partial<Pick<PaymentReceiptRecord, "deliveryStatus" | "updatedBy" | "metadata">>
  ): Promise<PaymentReceiptRecord> {
    const [row] = await this.db
      .update(paymentReceipt)
      .set({
        ...(patch.deliveryStatus !== undefined
          ? { deliveryStatus: patch.deliveryStatus }
          : {}),
        ...(patch.updatedBy !== undefined ? { updatedBy: patch.updatedBy } : {}),
        ...(patch.metadata !== undefined ? { metadata: patch.metadata } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(paymentReceipt.businessId, businessId), eq(paymentReceipt.id, receiptId)))
      .returning();
    if (!row) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.RECEIPT_NOT_FOUND,
        undefined,
        404
      );
    }
    return mapReceipt(row);
  }

  async findById(businessId: string, receiptId: string) {
    const [row] = await this.db
      .select()
      .from(paymentReceipt)
      .where(and(eq(paymentReceipt.businessId, businessId), eq(paymentReceipt.id, receiptId)))
      .limit(1);
    return row ? mapReceipt(row) : null;
  }

  async findByTransaction(businessId: string, paymentTransactionId: string) {
    const [row] = await this.db
      .select()
      .from(paymentReceipt)
      .where(
        and(
          eq(paymentReceipt.businessId, businessId),
          eq(paymentReceipt.paymentTransactionId, paymentTransactionId)
        )
      )
      .limit(1);
    return row ? mapReceipt(row) : null;
  }

  async findByIdempotencyKey(businessId: string, idempotencyKey: string) {
    const [row] = await this.db
      .select()
      .from(paymentReceipt)
      .where(
        and(
          eq(paymentReceipt.businessId, businessId),
          eq(paymentReceipt.idempotencyKey, idempotencyKey)
        )
      )
      .limit(1);
    return row ? mapReceipt(row) : null;
  }

  async listByBusiness(businessId: string) {
    const rows = await this.db
      .select()
      .from(paymentReceipt)
      .where(eq(paymentReceipt.businessId, businessId))
      .orderBy(desc(paymentReceipt.createdAt));
    return rows.map(mapReceipt);
  }

  async listByObligation(businessId: string, obligationId: string) {
    const rows = await this.db
      .select()
      .from(paymentReceipt)
      .where(
        and(
          eq(paymentReceipt.businessId, businessId),
          eq(paymentReceipt.paymentObligationId, obligationId)
        )
      )
      .orderBy(desc(paymentReceipt.createdAt));
    return rows.map(mapReceipt);
  }

  async insertDelivery(values: {
    businessId: string;
    receiptId: string;
    channel: string;
    status: string;
    failureReason: string | null;
    createdBy: string | null;
  }): Promise<PaymentReceiptDeliveryRecord> {
    const [row] = await this.db.insert(paymentReceiptDelivery).values(values).returning();
    if (!row) {
      throw new PaymentObligationError(PAYMENT_ERROR_CODES.PROVIDER_ERROR, undefined, 500);
    }
    return mapDelivery(row);
  }

  async listDeliveries(businessId: string, receiptId: string) {
    const rows = await this.db
      .select()
      .from(paymentReceiptDelivery)
      .where(
        and(
          eq(paymentReceiptDelivery.businessId, businessId),
          eq(paymentReceiptDelivery.receiptId, receiptId)
        )
      )
      .orderBy(desc(paymentReceiptDelivery.requestedAt));
    return rows.map(mapDelivery);
  }
}

export function createPaymentReceiptRepository() {
  return new PaymentReceiptRepository();
}
