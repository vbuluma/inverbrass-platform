/**
 * Purpose:
 * Idempotent seed for ENG-003b invoice and receipt numbering policies.
 * BP-007 does not invent document numbers; it consumes these policies.
 *
 * Engine:
 * ENG-003b – Localization & Regulatory Engine
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { documentNumberingPolicy } from "@/db/schema/document-numbering-policy";

const PLATFORM_POLICIES = [
  {
    policyCode: "INVOICE_DEFAULT",
    documentType: "INVOICE",
    prefix: "INV",
    nextValue: 0,
    padding: 6,
    isActive: true,
  },
  {
    policyCode: "RECEIPT_DEFAULT",
    documentType: "RECEIPT",
    prefix: "RCT",
    nextValue: 0,
    padding: 6,
    isActive: true,
  },
  {
    policyCode: "REFUND_DEFAULT",
    documentType: "REFUND",
    prefix: "RF",
    nextValue: 0,
    padding: 6,
    isActive: true,
  },
  {
    policyCode: "PAYMENT_EXCEPTION_DEFAULT",
    documentType: "PAYMENT_EXCEPTION",
    prefix: "EXC",
    nextValue: 0,
    padding: 6,
    isActive: true,
  },
  {
    policyCode: "STOCK_RECEIPT_DEFAULT",
    documentType: "STOCK_RECEIPT",
    prefix: "GR",
    nextValue: 0,
    padding: 6,
    isActive: true,
  },
  {
    policyCode: "OPENING_BALANCE_DEFAULT",
    documentType: "OPENING_BALANCE",
    prefix: "OPEN",
    nextValue: 0,
    padding: 6,
    isActive: true,
  },
  {
    policyCode: "STOCK_RESERVATION_DEFAULT",
    documentType: "STOCK_RESERVATION",
    prefix: "RSV",
    nextValue: 0,
    padding: 6,
    isActive: true,
  },
  {
    policyCode: "STOCK_ADJUSTMENT_DEFAULT",
    documentType: "STOCK_ADJUSTMENT",
    prefix: "AJ",
    nextValue: 0,
    padding: 6,
    isActive: true,
  },
  {
    policyCode: "STOCKTAKE_DEFAULT",
    documentType: "STOCKTAKE",
    prefix: "STK",
    nextValue: 0,
    padding: 6,
    isActive: true,
  },
  {
    policyCode: "STOCK_CONTROL_ADVICE_DEFAULT",
    documentType: "STOCK_CONTROL_ADVICE",
    prefix: "SCA",
    nextValue: 0,
    padding: 6,
    isActive: true,
  },
  {
    policyCode: "INVENTORY_EXCEPTION_DEFAULT",
    documentType: "INVENTORY_EXCEPTION",
    prefix: "IEX",
    nextValue: 0,
    padding: 6,
    isActive: true,
  },
  {
    policyCode: "STOCK_TRANSFER_DEFAULT",
    documentType: "STOCK_TRANSFER",
    prefix: "TR",
    nextValue: 0,
    padding: 6,
    isActive: true,
  },
] as const;

export async function seedDocumentNumberingPolicies(db: PostgresJsDatabase) {
  let inserted = 0;
  let updated = 0;
  for (const policy of PLATFORM_POLICIES) {
    const [existing] = await db
      .select({ id: documentNumberingPolicy.id })
      .from(documentNumberingPolicy)
      .where(eq(documentNumberingPolicy.policyCode, policy.policyCode))
      .limit(1);
    if (existing) {
      await db
        .update(documentNumberingPolicy)
        .set({
          documentType: policy.documentType,
          prefix: policy.prefix,
          padding: policy.padding,
          isActive: policy.isActive,
          updatedAt: new Date(),
        })
        .where(eq(documentNumberingPolicy.policyCode, policy.policyCode));
      updated += 1;
      continue;
    }
    await db.insert(documentNumberingPolicy).values({
      businessId: null,
      ...policy,
    });
    inserted += 1;
  }
  return { inserted, updated, skipped: 0 };
}
