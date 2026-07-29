/**
 * Purpose:
 * Idempotent seed runner for Group Membership Role reference catalogue.
 *
 * Implementation Package:
 * BP-002 / IP-008 – Party Groups & Membership
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { groupMembershipRole } from "@/db/schema/group-membership-role";
import { groupMembershipRoles } from "@/db/seeds/group-membership-roles";

type SeedCounts = {
  inserted: number;
  updated: number;
  skipped: number;
};

export async function seedGroupMembershipRoles(
  db: PostgresJsDatabase
): Promise<SeedCounts> {
  const counts = { inserted: 0, updated: 0, skipped: 0 };

  for (const row of groupMembershipRoles) {
    const [existing] = await db
      .select({ id: groupMembershipRole.id })
      .from(groupMembershipRole)
      .where(eq(groupMembershipRole.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(groupMembershipRole).values(row);
      counts.inserted += 1;
      continue;
    }

    await db
      .update(groupMembershipRole)
      .set({
        name: row.name,
        description: row.description,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        updatedAt: new Date(),
      })
      .where(eq(groupMembershipRole.id, existing.id));

    counts.updated += 1;
  }

  return counts;
}
