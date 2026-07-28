/**
 * Purpose:
 * Idempotent seed runner for Document Type reference catalogue.
 *
 * Implementation Package:
 * BP-002 / IP-007 – Party Documents
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { documentType } from "@/db/schema/document-type";
import { documentTypes } from "@/db/seeds/document-types";

type SeedCounts = {
  inserted: number;
  updated: number;
  skipped: number;
};

export async function seedDocumentTypes(
  db: PostgresJsDatabase
): Promise<SeedCounts> {
  const counts = { inserted: 0, updated: 0, skipped: 0 };

  for (const row of documentTypes) {
    const [existing] = await db
      .select({ id: documentType.id })
      .from(documentType)
      .where(eq(documentType.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(documentType).values(row);
      counts.inserted += 1;
      continue;
    }

    await db
      .update(documentType)
      .set({
        name: row.name,
        description: row.description,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        updatedAt: new Date(),
      })
      .where(eq(documentType.id, existing.id));

    counts.updated += 1;
  }

  return counts;
}
