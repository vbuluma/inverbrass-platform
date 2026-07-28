/**
 * Purpose:
 * Persist and read Organizational Unit rows (persistence only).
 *
 * Engine:
 * ENG-003c – Organization Structure Engine
 */

import { and, asc, desc, eq, ilike, isNull, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { organizationalUnit } from "@/db/schema/organizational-unit";
import {
  ORGANIZATIONAL_UNIT_STATUS_CODES,
  type OrganizationalUnitStatusCode,
} from "@/modules/party/constants";

type DbClient = PostgresJsDatabase<typeof schema>;

export type OrganizationalUnitInsertValues = {
  businessId: string;
  organizationPartyId: string;
  unitCode: string;
  unitName: string;
  organizationalUnitTypeCode: string;
  parentOrganizationalUnitId?: string | null;
  isHeadOffice: boolean;
  phone?: string | null;
  email?: string | null;
  partyAddressId?: string | null;
  countryCode?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  statusCode: OrganizationalUnitStatusCode;
  openingDate?: string | null;
  closingDate?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type OrganizationalUnitUpdateValues = {
  unitName?: string;
  organizationalUnitTypeCode?: string;
  parentOrganizationalUnitId?: string | null;
  isHeadOffice?: boolean;
  phone?: string | null;
  email?: string | null;
  partyAddressId?: string | null;
  countryCode?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  statusCode?: OrganizationalUnitStatusCode;
  openingDate?: string | null;
  closingDate?: string | null;
  notes?: string | null;
  updatedBy?: string | null;
  deletedAt?: Date | null;
};

export class OrganizationalUnitRepository {
  async insert(
    values: OrganizationalUnitInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(organizationalUnit)
      .values({
        businessId: values.businessId,
        organizationPartyId: values.organizationPartyId,
        unitCode: values.unitCode,
        unitName: values.unitName,
        organizationalUnitTypeCode: values.organizationalUnitTypeCode,
        parentOrganizationalUnitId: values.parentOrganizationalUnitId ?? null,
        isHeadOffice: values.isHeadOffice,
        phone: values.phone ?? null,
        email: values.email ?? null,
        partyAddressId: values.partyAddressId ?? null,
        countryCode: values.countryCode ?? null,
        latitude: values.latitude ?? null,
        longitude: values.longitude ?? null,
        statusCode: values.statusCode,
        openingDate: values.openingDate ?? null,
        closingDate: values.closingDate ?? null,
        notes: values.notes ?? null,
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();

    return row;
  }

  async findById(
    businessId: string,
    organizationalUnitId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(organizationalUnit)
      .where(
        and(
          eq(organizationalUnit.businessId, businessId),
          eq(organizationalUnit.id, organizationalUnitId),
          isNull(organizationalUnit.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async findByOrganizationAndCode(
    businessId: string,
    organizationPartyId: string,
    unitCode: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(organizationalUnit)
      .where(
        and(
          eq(organizationalUnit.businessId, businessId),
          eq(organizationalUnit.organizationPartyId, organizationPartyId),
          eq(organizationalUnit.unitCode, unitCode),
          isNull(organizationalUnit.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async findHeadOfficeForOrganization(
    businessId: string,
    organizationPartyId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(organizationalUnit)
      .where(
        and(
          eq(organizationalUnit.businessId, businessId),
          eq(organizationalUnit.organizationPartyId, organizationPartyId),
          eq(organizationalUnit.isHeadOffice, true),
          eq(
            organizationalUnit.statusCode,
            ORGANIZATIONAL_UNIT_STATUS_CODES.ACTIVE
          ),
          isNull(organizationalUnit.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async listByOrganizationPartyId(
    businessId: string,
    organizationPartyId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(organizationalUnit)
      .where(
        and(
          eq(organizationalUnit.businessId, businessId),
          eq(organizationalUnit.organizationPartyId, organizationPartyId),
          isNull(organizationalUnit.deletedAt)
        )
      )
      .orderBy(
        desc(organizationalUnit.isHeadOffice),
        desc(organizationalUnit.statusCode),
        asc(organizationalUnit.unitName),
        asc(organizationalUnit.createdAt)
      );
  }

  async searchByOrganization(
    businessId: string,
    organizationPartyId: string,
    filters: {
      query?: string;
      organizationalUnitTypeCode?: string;
      statusCode?: string;
    },
    dbClient: DbClient = getDb()
  ) {
    const conditions = [
      eq(organizationalUnit.businessId, businessId),
      eq(organizationalUnit.organizationPartyId, organizationPartyId),
      isNull(organizationalUnit.deletedAt),
    ];

    if (filters.organizationalUnitTypeCode) {
      conditions.push(
        eq(
          organizationalUnit.organizationalUnitTypeCode,
          filters.organizationalUnitTypeCode
        )
      );
    }

    if (filters.statusCode) {
      conditions.push(eq(organizationalUnit.statusCode, filters.statusCode));
    }

    const query = filters.query?.trim();
    if (query) {
      const pattern = `%${query}%`;
      conditions.push(
        or(
          ilike(organizationalUnit.unitName, pattern),
          ilike(organizationalUnit.unitCode, pattern),
          ilike(organizationalUnit.organizationalUnitTypeCode, pattern)
        )!
      );
    }

    return dbClient
      .select()
      .from(organizationalUnit)
      .where(and(...conditions))
      .orderBy(
        desc(organizationalUnit.isHeadOffice),
        desc(organizationalUnit.statusCode),
        asc(organizationalUnit.unitName)
      );
  }

  async updateById(
    businessId: string,
    organizationalUnitId: string,
    values: OrganizationalUnitUpdateValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(organizationalUnit)
      .set({
        ...(values.unitName !== undefined ? { unitName: values.unitName } : {}),
        ...(values.organizationalUnitTypeCode !== undefined
          ? { organizationalUnitTypeCode: values.organizationalUnitTypeCode }
          : {}),
        ...(values.parentOrganizationalUnitId !== undefined
          ? { parentOrganizationalUnitId: values.parentOrganizationalUnitId }
          : {}),
        ...(values.isHeadOffice !== undefined
          ? { isHeadOffice: values.isHeadOffice }
          : {}),
        ...(values.phone !== undefined ? { phone: values.phone } : {}),
        ...(values.email !== undefined ? { email: values.email } : {}),
        ...(values.partyAddressId !== undefined
          ? { partyAddressId: values.partyAddressId }
          : {}),
        ...(values.countryCode !== undefined
          ? { countryCode: values.countryCode }
          : {}),
        ...(values.latitude !== undefined ? { latitude: values.latitude } : {}),
        ...(values.longitude !== undefined
          ? { longitude: values.longitude }
          : {}),
        ...(values.statusCode !== undefined
          ? { statusCode: values.statusCode }
          : {}),
        ...(values.openingDate !== undefined
          ? { openingDate: values.openingDate }
          : {}),
        ...(values.closingDate !== undefined
          ? { closingDate: values.closingDate }
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
          eq(organizationalUnit.businessId, businessId),
          eq(organizationalUnit.id, organizationalUnitId),
          isNull(organizationalUnit.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }
}

export function createOrganizationalUnitRepository(): OrganizationalUnitRepository {
  return new OrganizationalUnitRepository();
}
