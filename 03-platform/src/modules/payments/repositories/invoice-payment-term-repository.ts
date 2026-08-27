/**
 * Purpose:
 * Persist invoice payment terms (configuration, not a hard-coded due-date rule).
 *
 * Implementation Package:
 * BP-007 / IP-04 – Billing, Invoicing & Credit Sales
 */

import { asc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { invoicePaymentTerm } from "@/db/schema/invoice-payment-term";
import type { InvoicePaymentTermPort } from "@/modules/payments/ports";
import type { InvoicePaymentTermRecord } from "@/modules/payments/types";

type DbClient = PostgresJsDatabase<typeof schema>;

function mapRow(
  row: typeof invoicePaymentTerm.$inferSelect
): InvoicePaymentTermRecord {
  return {
    code: row.code,
    name: row.name,
    netDays: row.netDays,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
  };
}

export class InvoicePaymentTermRepository implements InvoicePaymentTermPort {
  constructor(private readonly db: DbClient = getDb()) {}

  async listActive() {
    const rows = await this.db
      .select()
      .from(invoicePaymentTerm)
      .where(eq(invoicePaymentTerm.isActive, true))
      .orderBy(asc(invoicePaymentTerm.displayOrder));
    return rows.map(mapRow);
  }

  async findByCode(code: string) {
    const [row] = await this.db
      .select()
      .from(invoicePaymentTerm)
      .where(eq(invoicePaymentTerm.code, code))
      .limit(1);
    return row ? mapRow(row) : null;
  }
}

export function createInvoicePaymentTermRepository() {
  return new InvoicePaymentTermRepository();
}
