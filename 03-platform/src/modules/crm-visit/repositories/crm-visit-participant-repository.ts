import { asc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { crmVisitParticipant } from "@/db/schema/crm-visit-participant";

type DbClient = PostgresJsDatabase<typeof schema>;

export class CrmVisitParticipantRepository {
  async insert(
    values: {
      businessId: string;
      visitId: string;
      userId: string;
      isPrimaryAuthor?: boolean;
      contributionNotes?: string | null;
      createdBy?: string | null;
    },
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(crmVisitParticipant)
      .values({
        businessId: values.businessId,
        visitId: values.visitId,
        userId: values.userId,
        isPrimaryAuthor: values.isPrimaryAuthor ?? false,
        contributionNotes: values.contributionNotes ?? null,
        createdBy: values.createdBy ?? null,
      })
      .returning();
    return row;
  }

  async listByVisitId(visitId: string, dbClient: DbClient = getDb()) {
    return dbClient
      .select()
      .from(crmVisitParticipant)
      .where(eq(crmVisitParticipant.visitId, visitId))
      .orderBy(asc(crmVisitParticipant.createdAt));
  }
}

export function createCrmVisitParticipantRepository() {
  return new CrmVisitParticipantRepository();
}
