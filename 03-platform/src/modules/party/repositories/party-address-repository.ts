/**
 * Purpose:
 * Persist and read Party Address rows (persistence only).
 *
 * Architecture:
 * PartyAddressService → PartyAddressRepository → Drizzle
 *
 * Implementation Package:
 * BP-002 / IP-004 – Address Management
 */

import { and, asc, desc, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { partyAddress } from "@/db/schema/party-address";
import type { PartyAddressStatusCode } from "@/modules/party/constants";

type DbClient = PostgresJsDatabase<typeof schema>;

export type PartyAddressInsertValues = {
  businessId: string;
  partyId: string;
  addressTypeCode: string;
  countryCode: string;
  stateProvince?: string | null;
  countyDistrict?: string | null;
  cityTown?: string | null;
  wardLocality?: string | null;
  postalCode?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  landmark?: string | null;
  gpsLatitude?: string | null;
  gpsLongitude?: string | null;
  isDefault: boolean;
  statusCode: PartyAddressStatusCode;
  notes?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type PartyAddressUpdateValues = {
  countryCode?: string;
  stateProvince?: string | null;
  countyDistrict?: string | null;
  cityTown?: string | null;
  wardLocality?: string | null;
  postalCode?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  landmark?: string | null;
  gpsLatitude?: string | null;
  gpsLongitude?: string | null;
  isDefault?: boolean;
  statusCode?: PartyAddressStatusCode;
  notes?: string | null;
  updatedBy?: string | null;
  deletedAt?: Date | null;
};

export class PartyAddressRepository {
  async insert(
    values: PartyAddressInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(partyAddress)
      .values({
        businessId: values.businessId,
        partyId: values.partyId,
        addressTypeCode: values.addressTypeCode,
        countryCode: values.countryCode,
        stateProvince: values.stateProvince ?? null,
        countyDistrict: values.countyDistrict ?? null,
        cityTown: values.cityTown ?? null,
        wardLocality: values.wardLocality ?? null,
        postalCode: values.postalCode ?? null,
        addressLine1: values.addressLine1 ?? null,
        addressLine2: values.addressLine2 ?? null,
        landmark: values.landmark ?? null,
        gpsLatitude: values.gpsLatitude ?? null,
        gpsLongitude: values.gpsLongitude ?? null,
        isDefault: values.isDefault,
        statusCode: values.statusCode,
        notes: values.notes ?? null,
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();

    return row;
  }

  async findById(
    businessId: string,
    partyAddressId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(partyAddress)
      .where(
        and(
          eq(partyAddress.businessId, businessId),
          eq(partyAddress.id, partyAddressId),
          isNull(partyAddress.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async listByPartyId(
    businessId: string,
    partyId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(partyAddress)
      .where(
        and(
          eq(partyAddress.businessId, businessId),
          eq(partyAddress.partyId, partyId),
          isNull(partyAddress.deletedAt)
        )
      )
      .orderBy(
        asc(partyAddress.addressTypeCode),
        desc(partyAddress.isDefault),
        asc(partyAddress.createdAt)
      );
  }

  async clearDefaultForPartyAndType(
    businessId: string,
    partyId: string,
    addressTypeCode: string,
    dbClient: DbClient = getDb()
  ) {
    await dbClient
      .update(partyAddress)
      .set({
        isDefault: false,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(partyAddress.businessId, businessId),
          eq(partyAddress.partyId, partyId),
          eq(partyAddress.addressTypeCode, addressTypeCode),
          eq(partyAddress.isDefault, true),
          isNull(partyAddress.deletedAt)
        )
      );
  }

  async findPrimaryCountryCode(
    businessId: string,
    partyId: string,
    dbClient: DbClient = getDb()
  ): Promise<string | null> {
    const [defaultRow] = await dbClient
      .select({ countryCode: partyAddress.countryCode })
      .from(partyAddress)
      .where(
        and(
          eq(partyAddress.businessId, businessId),
          eq(partyAddress.partyId, partyId),
          eq(partyAddress.isDefault, true),
          isNull(partyAddress.deletedAt)
        )
      )
      .limit(1);

    if (defaultRow?.countryCode) {
      return defaultRow.countryCode;
    }

    const [firstRow] = await dbClient
      .select({ countryCode: partyAddress.countryCode })
      .from(partyAddress)
      .where(
        and(
          eq(partyAddress.businessId, businessId),
          eq(partyAddress.partyId, partyId),
          isNull(partyAddress.deletedAt)
        )
      )
      .orderBy(asc(partyAddress.createdAt))
      .limit(1);

    return firstRow?.countryCode ?? null;
  }

  async updateById(
    businessId: string,
    partyAddressId: string,
    values: PartyAddressUpdateValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(partyAddress)
      .set({
        ...(values.countryCode !== undefined
          ? { countryCode: values.countryCode }
          : {}),
        ...(values.stateProvince !== undefined
          ? { stateProvince: values.stateProvince }
          : {}),
        ...(values.countyDistrict !== undefined
          ? { countyDistrict: values.countyDistrict }
          : {}),
        ...(values.cityTown !== undefined ? { cityTown: values.cityTown } : {}),
        ...(values.wardLocality !== undefined
          ? { wardLocality: values.wardLocality }
          : {}),
        ...(values.postalCode !== undefined
          ? { postalCode: values.postalCode }
          : {}),
        ...(values.addressLine1 !== undefined
          ? { addressLine1: values.addressLine1 }
          : {}),
        ...(values.addressLine2 !== undefined
          ? { addressLine2: values.addressLine2 }
          : {}),
        ...(values.landmark !== undefined ? { landmark: values.landmark } : {}),
        ...(values.gpsLatitude !== undefined
          ? { gpsLatitude: values.gpsLatitude }
          : {}),
        ...(values.gpsLongitude !== undefined
          ? { gpsLongitude: values.gpsLongitude }
          : {}),
        ...(values.isDefault !== undefined ? { isDefault: values.isDefault } : {}),
        ...(values.statusCode !== undefined
          ? { statusCode: values.statusCode }
          : {}),
        ...(values.notes !== undefined ? { notes: values.notes } : {}),
        ...(values.deletedAt !== undefined
          ? { deletedAt: values.deletedAt }
          : {}),
        ...(values.updatedBy !== undefined
          ? { updatedBy: values.updatedBy }
          : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(partyAddress.businessId, businessId),
          eq(partyAddress.id, partyAddressId),
          isNull(partyAddress.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }
}

export function createPartyAddressRepository(): PartyAddressRepository {
  return new PartyAddressRepository();
}

export function formatGpsForStorage(value: number | null | undefined): string | null {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }
  return String(value);
}
