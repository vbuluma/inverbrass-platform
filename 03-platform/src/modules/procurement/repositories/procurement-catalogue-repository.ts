/**
 * Purpose:
 * Load BP-009 IP-01 configuration catalogues.
 */

import { asc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  procurementQualificationStatus,
  procurementQualificationType,
  procurementStatus,
  procurementSupplierCapability,
  procurementSupplierCategory,
} from "@/db/schema/procurement-reference";
import type { ProcurementCataloguePort } from "@/modules/procurement/ports";
import type { CatalogueRef } from "@/modules/procurement/types";

function mapRow(row: {
  code: string;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
}): CatalogueRef {
  return {
    code: row.code,
    name: row.name,
    description: row.description,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
  };
}

export class ProcurementCatalogueRepository implements ProcurementCataloguePort {
  constructor(private readonly db = getDb()) {}

  async listCategories() {
    const rows = await this.db
      .select()
      .from(procurementSupplierCategory)
      .where(eq(procurementSupplierCategory.isActive, true))
      .orderBy(asc(procurementSupplierCategory.displayOrder));
    return rows.map(mapRow);
  }

  async listCapabilities() {
    const rows = await this.db
      .select()
      .from(procurementSupplierCapability)
      .where(eq(procurementSupplierCapability.isActive, true))
      .orderBy(asc(procurementSupplierCapability.displayOrder));
    return rows.map(mapRow);
  }

  async listStatuses() {
    const rows = await this.db
      .select()
      .from(procurementStatus)
      .where(eq(procurementStatus.isActive, true))
      .orderBy(asc(procurementStatus.displayOrder));
    return rows.map(mapRow);
  }

  async listQualificationStatuses() {
    const rows = await this.db
      .select()
      .from(procurementQualificationStatus)
      .where(eq(procurementQualificationStatus.isActive, true))
      .orderBy(asc(procurementQualificationStatus.displayOrder));
    return rows.map(mapRow);
  }

  async listQualificationTypes() {
    const rows = await this.db
      .select()
      .from(procurementQualificationType)
      .where(eq(procurementQualificationType.isActive, true))
      .orderBy(asc(procurementQualificationType.displayOrder));
    return rows.map(mapRow);
  }
}

export function createProcurementCatalogueRepository() {
  return new ProcurementCatalogueRepository();
}
