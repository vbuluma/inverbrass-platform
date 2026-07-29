/**
 * ENG-003b — Localization & Regulatory Engine
 * Consent Source reference data access.
 */

import { and, asc, eq, isNull, or } from "drizzle-orm";

import { getDb } from "@/db/client";
import { consentSource } from "@/db/schema/consent-source";

export type ConsentSourceOption = {
  code: string;
  label: string;
  countryCode: string | null;
};

export class ConsentSourceRepository {
  async findActiveForCountry(
    countryCode?: string | null
  ): Promise<ConsentSourceOption[]> {
    const db = getDb();

    const rows = await db
      .select({
        code: consentSource.code,
        name: consentSource.name,
        countryCode: consentSource.countryCode,
        displayOrder: consentSource.displayOrder,
      })
      .from(consentSource)
      .where(
        and(
          eq(consentSource.isActive, true),
          countryCode
            ? or(
                isNull(consentSource.countryCode),
                eq(consentSource.countryCode, countryCode)
              )
            : isNull(consentSource.countryCode)
        )
      )
      .orderBy(asc(consentSource.displayOrder), asc(consentSource.name));

    return rows.map((row) => ({
      code: row.code,
      label: row.name,
      countryCode: row.countryCode,
    }));
  }
}

export function createConsentSourceRepository(): ConsentSourceRepository {
  return new ConsentSourceRepository();
}
