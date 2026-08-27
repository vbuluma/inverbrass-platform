/**
 * Purpose:
 * Idempotent seed for invoice payment terms.
 *
 * Implementation Package:
 * BP-007 / IP-04 – Billing, Invoicing & Credit Sales
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { invoicePaymentTerm } from "@/db/schema/invoice-payment-term";
import { invoicePaymentTerms } from "@/db/seeds/invoice-payment-terms";

export async function seedInvoicePaymentTerms(db: PostgresJsDatabase) {
  let inserted = 0;
  let updated = 0;
  for (const row of invoicePaymentTerms) {
    const [existing] = await db
      .select({ code: invoicePaymentTerm.code })
      .from(invoicePaymentTerm)
      .where(eq(invoicePaymentTerm.code, row.code))
      .limit(1);
    if (existing) {
      await db
        .update(invoicePaymentTerm)
        .set({
          name: row.name,
          netDays: row.netDays,
          displayOrder: row.displayOrder,
          isActive: row.isActive,
          updatedAt: new Date(),
        })
        .where(eq(invoicePaymentTerm.code, row.code));
      updated += 1;
      continue;
    }
    await db.insert(invoicePaymentTerm).values(row);
    inserted += 1;
  }
  return { inserted, updated, skipped: 0 };
}
