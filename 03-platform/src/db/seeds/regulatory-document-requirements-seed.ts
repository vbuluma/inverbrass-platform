/**
 * Purpose:
 * Idempotent seed runner for ENG-003b required document configuration.
 *
 * Engine:
 * ENG-003b – Localization & Regulatory Engine
 */

import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { requiredDocument } from "@/db/schema/required-document";
import { regulatoryRuleSet } from "@/db/schema/regulatory-rule-set";
import {
  regulatoryDocumentRequirements,
  regulatoryRuleSets,
} from "@/db/seeds/regulatory-document-requirements";

type SeedCounts = {
  inserted: number;
  updated: number;
  skipped: number;
};

export async function seedRegulatoryDocumentRequirements(
  db: PostgresJsDatabase
): Promise<SeedCounts> {
  const counts = { inserted: 0, updated: 0, skipped: 0 };

  for (const row of regulatoryRuleSets) {
    const [existing] = await db
      .select({ id: regulatoryRuleSet.id })
      .from(regulatoryRuleSet)
      .where(eq(regulatoryRuleSet.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(regulatoryRuleSet).values(row);
      counts.inserted += 1;
    } else {
      await db
        .update(regulatoryRuleSet)
        .set({
          name: row.name,
          countryCode: row.countryCode,
          partyTypeCode: row.partyTypeCode,
          industryCode: row.industryCode,
          displayOrder: row.displayOrder,
          isActive: row.isActive,
          updatedAt: new Date(),
        })
        .where(eq(regulatoryRuleSet.id, existing.id));
      counts.updated += 1;
    }
  }

  for (const row of regulatoryDocumentRequirements) {
    const [existing] = await db
      .select({ id: requiredDocument.id })
      .from(requiredDocument)
      .where(
        and(
          eq(requiredDocument.ruleSetCode, row.ruleSetCode),
          eq(requiredDocument.documentTypeCode, row.documentTypeCode)
        )
      )
      .limit(1);

    if (!existing) {
      await db.insert(requiredDocument).values(row);
      counts.inserted += 1;
    } else {
      await db
        .update(requiredDocument)
        .set({
          requirementLevel: row.requirementLevel,
          displayOrder: row.displayOrder,
          isActive: row.isActive,
          updatedAt: new Date(),
        })
        .where(eq(requiredDocument.id, existing.id));
      counts.updated += 1;
    }
  }

  return counts;
}
