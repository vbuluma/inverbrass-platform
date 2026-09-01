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
  {
    policyCode: "PROCUREMENT_PROFILE_DEFAULT",
    documentType: "PROCUREMENT_PROFILE",
    prefix: "SPP",
    nextValue: 0,
    padding: 6,
    isActive: true,
  },
  {
    policyCode: "PURCHASE_REQUEST_DEFAULT",
    documentType: "PURCHASE_REQUEST",
    prefix: "PR",
    nextValue: 0,
    padding: 6,
    isActive: true,
  },
  {
    policyCode: "SOURCING_EVENT_DEFAULT",
    documentType: "SOURCING_EVENT",
    prefix: "RFX",
    nextValue: 0,
    padding: 6,
    isActive: true,
  },
  {
    policyCode: "PURCHASE_ORDER_DEFAULT",
    documentType: "PURCHASE_ORDER",
    prefix: "PO",
    nextValue: 0,
    padding: 6,
    isActive: true,
  },
  {
    policyCode: "CONTRACT_DEFAULT",
    documentType: "CONTRACT",
    prefix: "CTR",
    nextValue: 0,
    padding: 6,
    isActive: true,
  },
  {
    policyCode: "PROCUREMENT_GOODS_RECEIPT_DEFAULT",
    documentType: "PROCUREMENT_GOODS_RECEIPT",
    prefix: "GREC",
    nextValue: 0,
    padding: 6,
    isActive: true,
  },
  {
    policyCode: "PROCUREMENT_ASSET_RECEIPT_DEFAULT",
    documentType: "PROCUREMENT_ASSET_RECEIPT",
    prefix: "AREC",
    nextValue: 0,
    padding: 6,
    isActive: true,
  },
  {
    policyCode: "PROCUREMENT_SERVICE_CONFIRMATION_DEFAULT",
    documentType: "PROCUREMENT_SERVICE_CONFIRMATION",
    prefix: "SVC",
    nextValue: 0,
    padding: 6,
    isActive: true,
  },
  {
    policyCode: "PROCUREMENT_SUPPLIER_INVOICE_DEFAULT",
    documentType: "PROCUREMENT_SUPPLIER_INVOICE",
    prefix: "SINV",
    nextValue: 0,
    padding: 6,
    isActive: true,
  },
  {
    policyCode: "PROCUREMENT_EXCEPTION_DEFAULT",
    documentType: "PROCUREMENT_EXCEPTION",
    prefix: "EXC",
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
