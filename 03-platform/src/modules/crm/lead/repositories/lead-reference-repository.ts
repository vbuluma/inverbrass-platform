/**
 * Purpose:
 * Lead reference catalogue reads.
 *
 * Implementation Package:
 * BP-004 / IP-02 – Lead Management
 */

import { asc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { leadDisqualificationReason } from "@/db/schema/lead-disqualification-reason";
import { leadSource } from "@/db/schema/lead-source";
import { leadStatus } from "@/db/schema/lead-status";

export class LeadReferenceRepository {
  async listActiveLeadStatuses() {
    const db = getDb();
    return db
      .select({
        code: leadStatus.code,
        name: leadStatus.name,
        description: leadStatus.description,
      })
      .from(leadStatus)
      .where(eq(leadStatus.isActive, true))
      .orderBy(asc(leadStatus.displayOrder));
  }

  async listActiveLeadSources() {
    const db = getDb();
    return db
      .select({
        code: leadSource.code,
        name: leadSource.name,
        description: leadSource.description,
      })
      .from(leadSource)
      .where(eq(leadSource.isActive, true))
      .orderBy(asc(leadSource.displayOrder));
  }

  async listActiveDisqualificationReasons() {
    const db = getDb();
    return db
      .select({
        code: leadDisqualificationReason.code,
        name: leadDisqualificationReason.name,
        description: leadDisqualificationReason.description,
      })
      .from(leadDisqualificationReason)
      .where(eq(leadDisqualificationReason.isActive, true))
      .orderBy(asc(leadDisqualificationReason.displayOrder));
  }

  async getLeadStatusName(code: string): Promise<string> {
    const db = getDb();
    const [row] = await db
      .select({ name: leadStatus.name })
      .from(leadStatus)
      .where(eq(leadStatus.code, code))
      .limit(1);
    return row?.name ?? code;
  }

  async getLeadSourceName(code: string): Promise<string> {
    const db = getDb();
    const [row] = await db
      .select({ name: leadSource.name })
      .from(leadSource)
      .where(eq(leadSource.code, code))
      .limit(1);
    return row?.name ?? code;
  }

  async getDisqualificationReasonName(code: string): Promise<string | null> {
    const db = getDb();
    const [row] = await db
      .select({ name: leadDisqualificationReason.name })
      .from(leadDisqualificationReason)
      .where(eq(leadDisqualificationReason.code, code))
      .limit(1);
    return row?.name ?? null;
  }

  async isActiveLeadSource(code: string): Promise<boolean> {
    const db = getDb();
    const [row] = await db
      .select({ id: leadSource.id })
      .from(leadSource)
      .where(eq(leadSource.code, code))
      .limit(1);
    return Boolean(row);
  }

  async isActiveDisqualificationReason(code: string): Promise<boolean> {
    const db = getDb();
    const [row] = await db
      .select({ id: leadDisqualificationReason.id })
      .from(leadDisqualificationReason)
      .where(eq(leadDisqualificationReason.code, code))
      .limit(1);
    return Boolean(row);
  }
}

export function createLeadReferenceRepository(): LeadReferenceRepository {
  return new LeadReferenceRepository();
}
