/**
 * Purpose:
 * Read Product reference catalogues and owner party options.
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation
 */

import { and, asc, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { currency } from "@/db/schema/currency";
import { party } from "@/db/schema/party";
import { productStatus } from "@/db/schema/product-status";
import { productType } from "@/db/schema/product-type";

type DbClient = PostgresJsDatabase<typeof schema>;

export class ProductReferenceRepository {
  async listActiveProductTypes(dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        code: productType.code,
        name: productType.name,
        description: productType.description,
      })
      .from(productType)
      .where(eq(productType.isActive, true))
      .orderBy(asc(productType.displayOrder), asc(productType.name));
  }

  async listActiveProductStatuses(dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        code: productStatus.code,
        name: productStatus.name,
        description: productStatus.description,
      })
      .from(productStatus)
      .where(eq(productStatus.isActive, true))
      .orderBy(asc(productStatus.displayOrder), asc(productStatus.name));
  }

  async listActiveCurrencies(dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        code: currency.code,
        name: currency.name,
        description: currency.symbol,
      })
      .from(currency)
      .where(eq(currency.isActive, true))
      .orderBy(asc(currency.code));
  }

  async isActiveProductType(code: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({ code: productType.code })
      .from(productType)
      .where(and(eq(productType.code, code), eq(productType.isActive, true)))
      .limit(1);

    return Boolean(row);
  }

  async getProductTypeName(code: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({ name: productType.name })
      .from(productType)
      .where(eq(productType.code, code))
      .limit(1);

    return row?.name ?? code;
  }

  async getProductStatusName(code: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({ name: productStatus.name })
      .from(productStatus)
      .where(eq(productStatus.code, code))
      .limit(1);

    return row?.name ?? code;
  }

  async listOwnerPartyOptions(
    businessId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select({
        id: party.id,
        displayName: party.displayName,
        partyNumber: party.partyNumber,
      })
      .from(party)
      .where(and(eq(party.businessId, businessId), isNull(party.deletedAt)))
      .orderBy(asc(party.displayName))
      .limit(200);
  }

  async findOwnerParty(
    businessId: string,
    partyId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select({
        id: party.id,
        displayName: party.displayName,
      })
      .from(party)
      .where(
        and(
          eq(party.businessId, businessId),
          eq(party.id, partyId),
          isNull(party.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }
}

export function createProductReferenceRepository(): ProductReferenceRepository {
  return new ProductReferenceRepository();
}
