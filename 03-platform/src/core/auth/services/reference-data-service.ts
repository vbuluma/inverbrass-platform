/**
 * Purpose:
 * Load reference catalog data for authentication and registration UI forms.
 *
 * Design rationale:
 * Catalogue reads stay in one service so registration, login, recovery, and
 * setup share identical active-record filters and empty-result behaviour.
 *
 * Business rationale:
 * Selectors must never throw when catalogues are empty or temporarily
 * unavailable; UI shows a friendly message instead.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding
 *
 * Implementation Package:
 * IP-006A – Platform Initialization & Security Hardening
 *
 * Responsibilities:
 * - Read active countries, business types, and currencies for form selectors
 * - Return empty collections safely and log informative messages
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
 * - Empty catalogues fail soft (no unhandled exceptions)
 *
 * Extension Points:
 * - Additional reference lists may be added for future onboarding fields
 */

import { and, asc, eq } from "drizzle-orm";

import type {
  BusinessTypeOption,
  CountryOption,
  CurrencyOption,
  IndustryOption,
} from "@/core/auth/types";
import { getDb } from "@/db/client";
import { businessType } from "@/db/schema/business-type";
import { country } from "@/db/schema/country";
import { currency } from "@/db/schema/currency";
import { industry } from "@/db/schema/industry";

export class ReferenceDataService {
  /**
   * WHAT: Load active countries ordered for selectors.
   * WHY: Auth and setup screens need a stable, non-throwing country catalogue.
   */
  async getActiveCountries(): Promise<CountryOption[]> {
    try {
      const db = getDb();

      const rows = await db
        .select({
          code: country.code,
          name: country.name,
          phoneCode: country.phoneCode,
          currencyCode: country.currencyCode,
        })
        .from(country)
        .where(eq(country.isActive, true))
        .orderBy(asc(country.displayOrder), asc(country.name));

      if (rows.length === 0) {
        console.info(
          "[reference-data] No active countries found. Seed countries before onboarding."
        );
      }

      return rows;
    } catch (error) {
      console.error(
        "[reference-data] Failed to load active countries; returning empty collection.",
        error
      );
      return [];
    }
  }

  /**
   * WHAT: Load active Industry Solutions for Business Registration.
   * WHY: Industry selection drives Business Template filtering — not hardcoded.
   */
  async getActiveIndustries(): Promise<IndustryOption[]> {
    try {
      const db = getDb();

      const rows = await db
        .select({
          id: industry.id,
          name: industry.name,
          code: industry.code,
          description: industry.description,
        })
        .from(industry)
        .where(eq(industry.isActive, true))
        .orderBy(asc(industry.displayOrder), asc(industry.name));

      if (rows.length === 0) {
        console.info(
          "[reference-data] No active industries found. Seed industries before Business Registration."
        );
      }

      return rows;
    } catch (error) {
      console.error(
        "[reference-data] Failed to load active industries; returning empty collection.",
        error
      );
      return [];
    }
  }

  /**
   * WHAT: Load active Business Templates (business_type), optionally by industry.
   * WHY: Templates must be filtered by Industry Solution — never a global list alone.
   */
  async getActiveBusinessTypes(
    industryId?: string
  ): Promise<BusinessTypeOption[]> {
    try {
      const db = getDb();

      const rows = await db
        .select({
          id: businessType.id,
          name: businessType.name,
          code: businessType.code,
          industryId: businessType.industryId,
        })
        .from(businessType)
        .where(
          industryId
            ? and(
                eq(businessType.isActive, true),
                eq(businessType.industryId, industryId)
              )
            : eq(businessType.isActive, true)
        )
        .orderBy(asc(businessType.displayOrder), asc(businessType.name));

      if (rows.length === 0) {
        console.info(
          "[reference-data] No active business templates found for the requested filter. Seed industries and business types before Business Registration."
        );
      }

      return rows;
    } catch (error) {
      console.error(
        "[reference-data] Failed to load active business templates; returning empty collection.",
        error
      );
      return [];
    }
  }

  /**
   * WHAT: Load active ISO currency catalogue rows for selectors.
   * WHY: IP-006 currency steps consume shared reference data (no duplicate ownership).
   */
  async getActiveCurrencies(): Promise<CurrencyOption[]> {
    try {
      const db = getDb();

      const rows = await db
        .select({
          code: currency.code,
          name: currency.name,
          symbol: currency.symbol,
          decimalPlaces: currency.decimalPlaces,
          isActive: currency.isActive,
        })
        .from(currency)
        .where(eq(currency.isActive, true))
        .orderBy(asc(currency.displayOrder), asc(currency.name));

      if (rows.length === 0) {
        console.info(
          "[reference-data] No active currencies found. Seed currencies before business setup."
        );
      }

      return rows;
    } catch (error) {
      console.error(
        "[reference-data] Failed to load active currencies; returning empty collection.",
        error
      );
      return [];
    }
  }
}

export function createReferenceDataService(): ReferenceDataService {
  return new ReferenceDataService();
}
