/**
 * Purpose:
 * Persist and read catalogue channel reference data (persistence only).
 *
 * Implementation Package:
 * BP-003 / IP-007 – Digital Catalogue Engine
 */

import { asc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { catalogueChannel } from "@/db/schema/catalogue-channel";
import { CATALOGUE_CHANNEL_STATUS_CODES } from "@/modules/product/constants";

type DbClient = PostgresJsDatabase<typeof schema>;

export class CatalogueChannelRepository {
  async listActive(dbClient: DbClient = getDb()) {
    return dbClient
      .select()
      .from(catalogueChannel)
      .where(eq(catalogueChannel.status, CATALOGUE_CHANNEL_STATUS_CODES.ACTIVE))
      .orderBy(asc(catalogueChannel.displayOrder), asc(catalogueChannel.name));
  }

  async findByCode(code: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select()
      .from(catalogueChannel)
      .where(eq(catalogueChannel.code, code))
      .limit(1);

    return row ?? null;
  }

  async findById(id: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select()
      .from(catalogueChannel)
      .where(eq(catalogueChannel.id, id))
      .limit(1);

    return row ?? null;
  }
}

export function createCatalogueChannelRepository() {
  return new CatalogueChannelRepository();
}
