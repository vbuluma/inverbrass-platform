/**
 * Purpose:
 * ENG-003a currency catalogue lookup for payment-obligation verification.
 *
 * Implementation Package:
 * BP-007 / IP-01 – Payment Obligation & Provider Integration Foundation
 */

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { currency } from "@/db/schema/currency";
import type { CurrencyReferencePort } from "@/modules/payments/ports";

export class CurrencyCatalogueAdapter implements CurrencyReferencePort {
  constructor(private readonly db = getDb()) {}

  async isActiveCode(code: string): Promise<boolean> {
    const normalised = code.trim().toUpperCase();
    if (!normalised) {
      return false;
    }
    const [row] = await this.db
      .select({ code: currency.code })
      .from(currency)
      .where(and(eq(currency.code, normalised), eq(currency.isActive, true)))
      .limit(1);
    return Boolean(row);
  }
}

export function createCurrencyCatalogueAdapter() {
  return new CurrencyCatalogueAdapter();
}

export class InMemoryCurrencyReference implements CurrencyReferencePort {
  constructor(private readonly codes: Set<string> = new Set(["KES"])) {}

  async isActiveCode(code: string): Promise<boolean> {
    return this.codes.has(code.trim().toUpperCase());
  }
}
