/**
 * Purpose:
 * Static country fallback for auth selectors when the database is temporarily unreachable.
 *
 * Design rationale:
 * Login must remain usable during brief Supabase pooler blips. Values mirror
 * `src/db/seeds/countries.ts` so they stay aligned with seeded catalogue data.
 */

import type { CountryOption } from "@/core/auth/types";
import { countries as seededCountries } from "@/db/seeds/countries";

export const AUTH_COUNTRY_FALLBACK: CountryOption[] = seededCountries
  .filter((row) => row.isActive)
  .map((row) => ({
    code: row.code,
    name: row.name,
    phoneCode: row.phoneCode,
    currencyCode: row.currencyCode,
  }));
