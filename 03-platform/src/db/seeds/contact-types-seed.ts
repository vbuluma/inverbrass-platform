/**
 * Purpose:
 * Idempotent seed runner for Contact Type reference catalogue.
 *
 * Implementation Package:
 * BP-002 / IP-003 – Contacts & Communication
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { contactType } from "@/db/schema/contact-type";
import { contactTypes } from "@/db/seeds/contact-types";

type SeedCounts = {
  inserted: number;
  updated: number;
  skipped: number;
};

export async function seedContactTypes(
  db: PostgresJsDatabase
): Promise<SeedCounts> {
  const counts = { inserted: 0, updated: 0, skipped: 0 };

  for (const row of contactTypes) {
    const [existing] = await db
      .select({ id: contactType.id })
      .from(contactType)
      .where(eq(contactType.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(contactType).values(row);
      counts.inserted += 1;
      continue;
    }

    await db
      .update(contactType)
      .set({
        name: row.name,
        description: row.description,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        updatedAt: new Date(),
      })
      .where(eq(contactType.id, existing.id));

    counts.updated += 1;
  }

  return counts;
}
