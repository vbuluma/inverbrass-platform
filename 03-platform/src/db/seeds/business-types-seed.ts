/**
 * Purpose:
 * Idempotent seed runner for business types used by owner registration.
 *
 * Why it exists:
 * Registration requires an active business-type catalogue. Types are linked to
 * industries by code so the seed remains configuration-driven.
 *
 * Implementation Package:
 * IP-006A – Platform Initialization & Security Hardening
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { businessType } from "@/db/schema/business-type";
import { industry } from "@/db/schema/industry";
import { businessTypes } from "@/db/seeds/business-types";

type SeedCounts = {
  inserted: number;
  updated: number;
  skipped: number;
};

export async function seedBusinessTypes(
  db: PostgresJsDatabase
): Promise<SeedCounts> {
  const counts = { inserted: 0, updated: 0, skipped: 0 };

  // ----------------------------------------------------
  // Resolve industry ids once so each business type maps by industryCode.
  // ----------------------------------------------------
  const industryRows = await db
    .select({ id: industry.id, code: industry.code })
    .from(industry);
  const industryIdByCode = new Map(
    industryRows.map((row) => [row.code, row.id])
  );

  for (const row of businessTypes) {
    const industryId = industryIdByCode.get(row.industryCode);

    if (!industryId) {
      throw new Error(
        `Missing industry "${row.industryCode}" required by business type "${row.code}".`
      );
    }

    const [existing] = await db
      .select({ id: businessType.id })
      .from(businessType)
      .where(eq(businessType.code, row.code))
      .limit(1);

    const values = {
      industryId,
      code: row.code,
      name: row.name,
      description: row.description,
      iconCode: row.iconCode,
      displayOrder: row.displayOrder,
      isActive: row.isActive,
    };

    if (!existing) {
      await db.insert(businessType).values(values);
      counts.inserted += 1;
      continue;
    }

    await db
      .update(businessType)
      .set({
        ...values,
        updatedAt: new Date(),
      })
      .where(eq(businessType.id, existing.id));

    counts.updated += 1;
  }

  return counts;
}
