/**
 * Purpose:
 * Load reference catalog data for authentication and registration UI forms.
 *
 * Business Context:
 * Registration and recovery screens require active countries and business types from
 * the platform reference tables without embedding catalog logic in UI components.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding
 *
 * Implementation Package:
 * IP-005 – Authentication UI
 *
 * Responsibilities:
 * - Read active countries and business types for form selectors
 *
 * Non-Responsibilities:
 * - Reference data administration
 * - Validation of user selections beyond active flag checks
 *
 * Dependencies:
 * - Drizzle ORM reference schemas
 *
 * Business Rules Implemented:
 * - Configuration over customization — catalog-driven selectors
 *
 * Extension Points:
 * - Additional reference lists may be added for future onboarding fields
 */

import { asc, eq } from "drizzle-orm";

import type {
  BusinessTypeOption,
  CountryOption,
} from "@/core/auth/types";
import { getDb } from "@/db/client";
import { businessType } from "@/db/schema/business-type";
import { country } from "@/db/schema/country";

export class ReferenceDataService {
  async getActiveCountries(): Promise<CountryOption[]> {
    const db = getDb();

    const rows = await db
      .select({
        code: country.code,
        name: country.name,
        phoneCode: country.phoneCode,
      })
      .from(country)
      .where(eq(country.isActive, true))
      .orderBy(asc(country.displayOrder), asc(country.name));

    return rows;
  }

  async getActiveBusinessTypes(): Promise<BusinessTypeOption[]> {
    const db = getDb();

    const rows = await db
      .select({
        id: businessType.id,
        name: businessType.name,
        code: businessType.code,
      })
      .from(businessType)
      .where(eq(businessType.isActive, true))
      .orderBy(asc(businessType.displayOrder), asc(businessType.name));

    return rows;
  }
}

export function createReferenceDataService(): ReferenceDataService {
  return new ReferenceDataService();
}
