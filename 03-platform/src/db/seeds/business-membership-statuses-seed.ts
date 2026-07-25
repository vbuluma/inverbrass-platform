/**
 * Purpose:
 * Idempotent seed runner for business membership status catalogue.
 *
 * Why it exists:
 * Membership status codes are referenced during onboarding and context checks.
 * Seeding keeps the catalogue aligned with BUSINESS_MEMBERSHIP_STATUS constants.
 *
 * Implementation Package:
 * IP-006A – Platform Initialization & Security Hardening
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { businessMembershipStatus } from "@/db/schema/business-membership-status";
import { businessMembershipStatuses } from "@/db/seeds/business-membership-statuses";

type SeedCounts = {
  inserted: number;
  updated: number;
  skipped: number;
};

export async function seedBusinessMembershipStatuses(
  db: PostgresJsDatabase
): Promise<SeedCounts> {
  const counts = { inserted: 0, updated: 0, skipped: 0 };

  for (const row of businessMembershipStatuses) {
    const [existing] = await db
      .select({ id: businessMembershipStatus.id })
      .from(businessMembershipStatus)
      .where(eq(businessMembershipStatus.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(businessMembershipStatus).values(row);
      counts.inserted += 1;
      continue;
    }

    await db
      .update(businessMembershipStatus)
      .set({
        name: row.name,
        description: row.description,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        updatedAt: new Date(),
      })
      .where(eq(businessMembershipStatus.id, existing.id));

    counts.updated += 1;
  }

  return counts;
}
