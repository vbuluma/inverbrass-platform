import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { crmCommunicationEntityLink } from "@/db/schema/crm-communication-entity-link";

type DbClient = PostgresJsDatabase<typeof schema>;

export class CrmCommunicationEntityLinkRepository {
  async insertMany(
    values: Array<{
      businessId: string;
      communicationId: string;
      entityTypeCode: string;
      entityId: string;
      isPrimary?: boolean;
      createdBy?: string | null;
    }>,
    dbClient: DbClient = getDb()
  ) {
    if (values.length === 0) return [];
    return dbClient.insert(crmCommunicationEntityLink).values(values).returning();
  }

  async listByCommunicationId(communicationId: string, dbClient: DbClient = getDb()) {
    return dbClient
      .select()
      .from(crmCommunicationEntityLink)
      .where(eq(crmCommunicationEntityLink.communicationId, communicationId));
  }
}

export function createCrmCommunicationEntityLinkRepository() {
  return new CrmCommunicationEntityLinkRepository();
}
