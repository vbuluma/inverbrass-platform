import { asc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { crmCommunicationChannel } from "@/db/schema/crm-communication-channel";
import { seedCrmCommunicationCatalogues } from "@/db/seeds/crm-communication-catalogues-seed";

type DbClient = PostgresJsDatabase<typeof schema>;

export class CrmCommunicationCatalogueRepository {
  async ensureDefaults(dbClient: DbClient = getDb()) {
    await seedCrmCommunicationCatalogues(dbClient);
  }

  async listActiveChannels(dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        code: crmCommunicationChannel.code,
        name: crmCommunicationChannel.name,
        requiresConsentOutbound: crmCommunicationChannel.requiresConsentOutbound,
      })
      .from(crmCommunicationChannel)
      .where(eq(crmCommunicationChannel.isActive, true))
      .orderBy(asc(crmCommunicationChannel.displayOrder));
  }

  async findChannelByCode(code: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select()
      .from(crmCommunicationChannel)
      .where(eq(crmCommunicationChannel.code, code))
      .limit(1);
    return row ?? null;
  }
}

export function createCrmCommunicationCatalogueRepository() {
  return new CrmCommunicationCatalogueRepository();
}
