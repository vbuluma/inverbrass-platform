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
import {
  getReferenceCacheEntry,
  isReferenceCacheFresh,
  setReferenceCache,
  sleep,
} from "@/core/auth/services/reference-data-cache";
import { AUTH_COUNTRY_FALLBACK } from "@/core/auth/services/reference-data-fallbacks";
import { getDb } from "@/db/client";
import { businessType } from "@/db/schema/business-type";
import { country } from "@/db/schema/country";
import { currency } from "@/db/schema/currency";
import { industry } from "@/db/schema/industry";

const CACHE_KEYS = {
  countries: "reference:countries:active",
  industries: "reference:industries:active",
  businessTypes: "reference:business-types:active",
  currencies: "reference:currencies:active",
} as const;

const DB_RETRY_ATTEMPTS = 3;

async function withReferenceQueryRetry<T>(
  label: string,
  query: () => Promise<T>
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= DB_RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await query();
    } catch (error) {
      lastError = error;
      console.warn(
        `[reference-data] ${label} attempt ${attempt}/${DB_RETRY_ATTEMPTS} failed.`,
        error
      );

      if (attempt < DB_RETRY_ATTEMPTS) {
        await sleep(attempt * 400);
      }
    }
  }

  throw lastError;
}

export class ReferenceDataService {
  /**
   * WHAT: Load active countries ordered for selectors.
   * WHY: Auth and setup screens need a stable, non-throwing country catalogue.
   */
  async getActiveCountries(): Promise<CountryOption[]> {
    const cacheKey = CACHE_KEYS.countries;
    const cached = getReferenceCacheEntry<CountryOption[]>(cacheKey);

    if (cached && isReferenceCacheFresh(cached)) {
      return cached.data;
    }

    try {
      const rows = await withReferenceQueryRetry("getActiveCountries", async () => {
        const db = getDb();

        return db
          .select({
            code: country.code,
            name: country.name,
            phoneCode: country.phoneCode,
            currencyCode: country.currencyCode,
          })
          .from(country)
          .where(eq(country.isActive, true))
          .orderBy(asc(country.displayOrder), asc(country.name));
      });

      if (rows.length === 0) {
        console.info(
          "[reference-data] No active countries found. Seed countries before onboarding."
        );
      } else {
        setReferenceCache(cacheKey, rows);
      }

      return rows.length > 0 ? rows : AUTH_COUNTRY_FALLBACK;
    } catch (error) {
      console.error(
        "[reference-data] Failed to load active countries after retries.",
        error
      );

      if (cached) {
        console.warn("[reference-data] Serving stale cached countries.");
        return cached.data;
      }

      console.warn(
        "[reference-data] Serving static country fallback for auth selectors."
      );
      return AUTH_COUNTRY_FALLBACK;
    }
  }

  /**
   * WHAT: Load active Industry Solutions for Business Registration.
   * WHY: Industry selection drives Business Template filtering — not hardcoded.
   */
  async getActiveIndustries(): Promise<IndustryOption[]> {
    const cacheKey = CACHE_KEYS.industries;
    const cached = getReferenceCacheEntry<IndustryOption[]>(cacheKey);

    if (cached && isReferenceCacheFresh(cached)) {
      return cached.data;
    }

    try {
      const rows = await withReferenceQueryRetry("getActiveIndustries", async () => {
        const db = getDb();

        return db
          .select({
            id: industry.id,
            name: industry.name,
            code: industry.code,
            description: industry.description,
          })
          .from(industry)
          .where(eq(industry.isActive, true))
          .orderBy(asc(industry.displayOrder), asc(industry.name));
      });

      if (rows.length === 0) {
        console.info(
          "[reference-data] No active industries found. Seed industries before Business Registration."
        );
      } else {
        setReferenceCache(cacheKey, rows);
      }

      return rows;
    } catch (error) {
      console.error(
        "[reference-data] Failed to load active industries after retries.",
        error
      );

      return cached?.data ?? [];
    }
  }

  /**
   * WHAT: Load active Business Templates (business_type), optionally by industry.
   * WHY: Templates must be filtered by Industry Solution — never a global list alone.
   */
  async getActiveBusinessTypes(
    industryId?: string
  ): Promise<BusinessTypeOption[]> {
    const cacheKey = `${CACHE_KEYS.businessTypes}:${industryId ?? "all"}`;
    const cached = getReferenceCacheEntry<BusinessTypeOption[]>(cacheKey);

    if (cached && isReferenceCacheFresh(cached)) {
      return cached.data;
    }

    try {
      const rows = await withReferenceQueryRetry(
        "getActiveBusinessTypes",
        async () => {
          const db = getDb();

          return db
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
        }
      );

      if (rows.length === 0) {
        console.info(
          "[reference-data] No active business templates found for the requested filter. Seed industries and business types before Business Registration."
        );
      } else {
        setReferenceCache(cacheKey, rows);
      }

      return rows;
    } catch (error) {
      console.error(
        "[reference-data] Failed to load active business templates after retries.",
        error
      );

      return cached?.data ?? [];
    }
  }

  /**
   * WHAT: Load active ISO currency catalogue rows for selectors.
   * WHY: IP-006 currency steps consume shared reference data (no duplicate ownership).
   */
  async getActiveCurrencies(): Promise<CurrencyOption[]> {
    const cacheKey = CACHE_KEYS.currencies;
    const cached = getReferenceCacheEntry<CurrencyOption[]>(cacheKey);

    if (cached && isReferenceCacheFresh(cached)) {
      return cached.data;
    }

    try {
      const rows = await withReferenceQueryRetry("getActiveCurrencies", async () => {
        const db = getDb();

        return db
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
      });

      if (rows.length === 0) {
        console.info(
          "[reference-data] No active currencies found. Seed currencies before business setup."
        );
      } else {
        setReferenceCache(cacheKey, rows);
      }

      return rows;
    } catch (error) {
      console.error(
        "[reference-data] Failed to load active currencies after retries.",
        error
      );

      return cached?.data ?? [];
    }
  }
}

export function createReferenceDataService(): ReferenceDataService {
  return new ReferenceDataService();
}
