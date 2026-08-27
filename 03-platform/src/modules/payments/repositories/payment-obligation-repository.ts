/**
 * Purpose:
 * Persist payment obligations with tenant isolation.
 *
 * Implementation Package:
 * BP-007 / IP-01 – Payment Obligation & Provider Integration Foundation
 */

import { and, desc, eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { paymentObligation } from "@/db/schema/payment-obligation";
import { PAYMENT_ERROR_CODES, PaymentObligationError } from "@/modules/payments/errors";
import type { PaymentObligationRepositoryPort } from "@/modules/payments/ports";
import type {
  PaymentObligationInsert,
  PaymentObligationRecord,
  PaymentReadyContract,
  PaymentReadyLineBreakdown,
} from "@/modules/payments/types";

type DbClient = PostgresJsDatabase<typeof schema>;

function mapRow(row: typeof paymentObligation.$inferSelect): PaymentObligationRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    obligationNumber: row.obligationNumber,
    salesOrderId: row.salesOrderId,
    orderNumber: row.orderNumber,
    customerId: row.customerId,
    currencyCode: row.currencyCode,
    amountDue: String(row.amountDue),
    paidAmount: String(row.paidAmount),
    outstandingAmount: String(row.outstandingAmount),
    paymentStatus: row.paymentStatus,
    financialInstructionType: row.financialInstructionType,
    commercialContractId: row.commercialContractId,
    snapshotId: row.snapshotId,
    paymentReadyContractRef: row.paymentReadyContractRef,
    lineBreakdown: (row.lineBreakdown as PaymentReadyLineBreakdown[] | null) ?? null,
    paymentReadyContractPayload:
      (row.paymentReadyContractPayload as PaymentReadyContract | null) ?? null,
    providerTransactionReference: row.providerTransactionReference,
    idempotencyKey: row.idempotencyKey,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  };
}

export class PaymentObligationRepository implements PaymentObligationRepositoryPort {
  constructor(private readonly db: DbClient = getDb()) {}

  async insert(values: PaymentObligationInsert): Promise<PaymentObligationRecord> {
    try {
      const [row] = await this.db
        .insert(paymentObligation)
        .values({
          id: values.id,
          businessId: values.businessId,
          obligationNumber: values.obligationNumber,
          salesOrderId: values.salesOrderId,
          orderNumber: values.orderNumber,
          customerId: values.customerId,
          currencyCode: values.currencyCode,
          amountDue: values.amountDue,
          paidAmount: values.paidAmount,
          outstandingAmount: values.outstandingAmount,
          paymentStatus: values.paymentStatus,
          financialInstructionType: values.financialInstructionType,
          commercialContractId: values.commercialContractId,
          snapshotId: values.snapshotId,
          paymentReadyContractRef: values.paymentReadyContractRef,
          lineBreakdown: values.lineBreakdown,
          paymentReadyContractPayload: values.paymentReadyContractPayload,
          providerTransactionReference: values.providerTransactionReference,
          idempotencyKey: values.idempotencyKey,
          metadata: values.metadata,
          createdBy: values.createdBy,
          updatedBy: values.updatedBy,
        })
        .returning();
      if (!row) {
        throw new PaymentObligationError(PAYMENT_ERROR_CODES.PROVIDER_ERROR, undefined, 500);
      }
      return mapRow(row);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("payment_obligation_business_idempotency_uidx")) {
        throw new PaymentObligationError(
          PAYMENT_ERROR_CODES.IDEMPOTENCY_CONFLICT,
          undefined,
          409
        );
      }
      throw error;
    }
  }

  async findById(businessId: string, obligationId: string) {
    const [row] = await this.db
      .select()
      .from(paymentObligation)
      .where(
        and(
          eq(paymentObligation.businessId, businessId),
          eq(paymentObligation.id, obligationId)
        )
      )
      .limit(1);
    return row ? mapRow(row) : null;
  }

  async findByIdempotencyKey(businessId: string, idempotencyKey: string) {
    const [row] = await this.db
      .select()
      .from(paymentObligation)
      .where(
        and(
          eq(paymentObligation.businessId, businessId),
          eq(paymentObligation.idempotencyKey, idempotencyKey)
        )
      )
      .limit(1);
    return row ? mapRow(row) : null;
  }

  async findByOrderInstruction(
    businessId: string,
    salesOrderId: string,
    financialInstructionType: string
  ) {
    const [row] = await this.db
      .select()
      .from(paymentObligation)
      .where(
        and(
          eq(paymentObligation.businessId, businessId),
          eq(paymentObligation.salesOrderId, salesOrderId),
          eq(paymentObligation.financialInstructionType, financialInstructionType)
        )
      )
      .limit(1);
    return row ? mapRow(row) : null;
  }

  async findByObligationNumber(businessId: string, obligationNumber: string) {
    const [row] = await this.db
      .select()
      .from(paymentObligation)
      .where(
        and(
          eq(paymentObligation.businessId, businessId),
          eq(paymentObligation.obligationNumber, obligationNumber)
        )
      )
      .limit(1);
    return row ? mapRow(row) : null;
  }

  async listByBusiness(businessId: string) {
    const rows = await this.db
      .select()
      .from(paymentObligation)
      .where(eq(paymentObligation.businessId, businessId))
      .orderBy(desc(paymentObligation.createdAt));
    return rows.map(mapRow);
  }

  async countAll(businessId: string) {
    const [row] = await this.db
      .select({ value: sql<number>`count(*)` })
      .from(paymentObligation)
      .where(eq(paymentObligation.businessId, businessId));
    return Number(row?.value ?? 0);
  }

  async update(
    businessId: string,
    obligationId: string,
    patch: Partial<
      Pick<
        PaymentObligationRecord,
        | "paidAmount"
        | "outstandingAmount"
        | "paymentStatus"
        | "providerTransactionReference"
        | "updatedBy"
        | "metadata"
      >
    >
  ): Promise<PaymentObligationRecord> {
    const [row] = await this.db
      .update(paymentObligation)
      .set({
        ...(patch.paidAmount !== undefined ? { paidAmount: patch.paidAmount } : {}),
        ...(patch.outstandingAmount !== undefined
          ? { outstandingAmount: patch.outstandingAmount }
          : {}),
        ...(patch.paymentStatus !== undefined ? { paymentStatus: patch.paymentStatus } : {}),
        ...(patch.providerTransactionReference !== undefined
          ? { providerTransactionReference: patch.providerTransactionReference }
          : {}),
        ...(patch.updatedBy !== undefined ? { updatedBy: patch.updatedBy } : {}),
        ...(patch.metadata !== undefined ? { metadata: patch.metadata } : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(paymentObligation.businessId, businessId),
          eq(paymentObligation.id, obligationId)
        )
      )
      .returning();
    if (!row) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.OBLIGATION_NOT_FOUND,
        undefined,
        404
      );
    }
    return mapRow(row);
  }
}

export function createPaymentObligationRepository() {
  return new PaymentObligationRepository();
}
