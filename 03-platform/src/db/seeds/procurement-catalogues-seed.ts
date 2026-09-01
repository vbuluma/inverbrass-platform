/**
 * Purpose:
 * Idempotent seed for BP-009 IP-01 procurement catalogues.
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import {
  procurementContractType,
  procurementQualificationStatus,
  procurementQualificationType,
  procurementStatus,
  procurementSupplierCapability,
  procurementSupplierCategory,
} from "@/db/schema/procurement-reference";
import {
  procurementContractTypes,
  procurementQualificationStatuses,
  procurementQualificationTypes,
  procurementStatuses,
  procurementSupplierCapabilities,
  procurementSupplierCategories,
} from "@/db/seeds/procurement-catalogues";

type SeedCounts = {
  inserted: number;
  updated: number;
  skipped: number;
};

type CatalogueRow = {
  code: string;
  name: string;
  description: string;
  displayOrder: number;
  isActive: boolean;
};

async function seedCatalogue(
  db: PostgresJsDatabase,
  table:
    | typeof procurementSupplierCategory
    | typeof procurementSupplierCapability
    | typeof procurementStatus
    | typeof procurementQualificationStatus
    | typeof procurementQualificationType
    | typeof procurementContractType,
  rows: readonly CatalogueRow[]
): Promise<SeedCounts> {
  const counts = { inserted: 0, updated: 0, skipped: 0 };
  for (const row of rows) {
    const [existing] = await db
      .select({ id: table.id })
      .from(table)
      .where(eq(table.code, row.code))
      .limit(1);
    if (!existing) {
      await db.insert(table).values(row);
      counts.inserted += 1;
      continue;
    }
    await db
      .update(table)
      .set({
        name: row.name,
        description: row.description,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        updatedAt: new Date(),
      })
      .where(eq(table.id, existing.id));
    counts.updated += 1;
  }
  return counts;
}

export async function seedProcurementCatalogues(db: PostgresJsDatabase) {
  const categories = await seedCatalogue(
    db,
    procurementSupplierCategory,
    procurementSupplierCategories
  );
  const capabilities = await seedCatalogue(
    db,
    procurementSupplierCapability,
    procurementSupplierCapabilities
  );
  const statuses = await seedCatalogue(db, procurementStatus, procurementStatuses);
  const qualificationStatuses = await seedCatalogue(
    db,
    procurementQualificationStatus,
    procurementQualificationStatuses
  );
  const qualificationTypes = await seedCatalogue(
    db,
    procurementQualificationType,
    procurementQualificationTypes
  );
  const contractTypes = await seedCatalogue(
    db,
    procurementContractType,
    procurementContractTypes
  );
  return {
    categories,
    capabilities,
    statuses,
    qualificationStatuses,
    qualificationTypes,
    contractTypes,
  };
}
