/**
 * Purpose:
 * Persist and read branch rows for Business Setup.
 *
 * Architecture:
 * BusinessSetupService → BranchRepository → Drizzle
 *
 * Implementation Package:
 * BP-001 – Business Onboarding Enhancement & Stabilization
 */

import { and, asc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { branch } from "@/db/schema/branch";

type DbClient = PostgresJsDatabase<typeof schema>;

export type BranchInsertValues = {
  businessId: string;
  code: string;
  name: string;
  branchType: string;
  physicalAddress: string;
  county: string;
  city: string;
  contactPhone: string;
  email?: string | null;
  gpsLatitude?: string | null;
  gpsLongitude?: string | null;
  openingDate?: string | null;
  isActive: boolean;
  isHeadOffice: boolean;
  isDefault: boolean;
};

export class BranchRepository {
  async listByBusinessId(
    businessId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(branch)
      .where(eq(branch.businessId, businessId))
      .orderBy(asc(branch.name));
  }

  async findByCode(
    businessId: string,
    code: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select({ id: branch.id })
      .from(branch)
      .where(and(eq(branch.businessId, businessId), eq(branch.code, code)))
      .limit(1);

    return row ?? null;
  }

  async replaceBusinessBranches(
    businessId: string,
    rows: BranchInsertValues[],
    dbClient: DbClient = getDb()
  ): Promise<void> {
    await dbClient.delete(branch).where(eq(branch.businessId, businessId));

    if (rows.length === 0) {
      return;
    }

    await dbClient.insert(branch).values(
      rows.map((row) => ({
        businessId: row.businessId,
        code: row.code,
        name: row.name,
        branchType: row.branchType,
        physicalAddress: row.physicalAddress,
        county: row.county,
        city: row.city,
        contactPhone: row.contactPhone,
        email: row.email ?? null,
        gpsLatitude: row.gpsLatitude ?? null,
        gpsLongitude: row.gpsLongitude ?? null,
        openingDate: row.openingDate ?? null,
        isActive: row.isActive,
        isHeadOffice: row.isHeadOffice,
        isDefault: row.isDefault,
      }))
    );
  }
}

export function createBranchRepository(): BranchRepository {
  return new BranchRepository();
}
