/**
 * Purpose:
 * Persist and read Party Contact rows (persistence only).
 *
 * Architecture:
 * PartyContactService → PartyContactRepository → Drizzle
 *
 * Implementation Package:
 * BP-002 / IP-003 – Contacts & Communication
 */

import { and, asc, desc, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { partyContact } from "@/db/schema/party-contact";
import {
  PARTY_CONTACT_STATUS_CODES,
  type PartyContactStatusCode,
} from "@/modules/party/constants";

type DbClient = PostgresJsDatabase<typeof schema>;

export type PartyContactInsertValues = {
  businessId: string;
  partyId: string;
  contactTypeCode: string;
  contactValue: string;
  isPreferred: boolean;
  isVerified?: boolean;
  statusCode: PartyContactStatusCode;
  notes?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type PartyContactUpdateValues = {
  contactValue?: string;
  isPreferred?: boolean;
  isVerified?: boolean;
  statusCode?: PartyContactStatusCode;
  notes?: string | null;
  updatedBy?: string | null;
  deletedAt?: Date | null;
};

export class PartyContactRepository {
  async insert(
    values: PartyContactInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(partyContact)
      .values({
        businessId: values.businessId,
        partyId: values.partyId,
        contactTypeCode: values.contactTypeCode,
        contactValue: values.contactValue,
        isPreferred: values.isPreferred,
        isVerified: values.isVerified ?? false,
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
    partyContactId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(partyContact)
      .where(
        and(
          eq(partyContact.businessId, businessId),
          eq(partyContact.id, partyContactId),
          isNull(partyContact.deletedAt)
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
      .from(partyContact)
      .where(
        and(
          eq(partyContact.businessId, businessId),
          eq(partyContact.partyId, partyId),
          isNull(partyContact.deletedAt)
        )
      )
      .orderBy(
        asc(partyContact.contactTypeCode),
        desc(partyContact.isPreferred),
        asc(partyContact.createdAt)
      );
  }

  async findPreferredByPartyAndType(
    businessId: string,
    partyId: string,
    contactTypeCode: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(partyContact)
      .where(
        and(
          eq(partyContact.businessId, businessId),
          eq(partyContact.partyId, partyId),
          eq(partyContact.contactTypeCode, contactTypeCode),
          eq(partyContact.isPreferred, true),
          eq(partyContact.statusCode, PARTY_CONTACT_STATUS_CODES.ACTIVE),
          isNull(partyContact.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  /**
   * WHAT: Find a non-deleted contact with the same normalized value on a Party.
   * WHY: EDS-003 duplicate detection compares canonical E.164 values.
   */
  async findByPartyAndContactValue(
    businessId: string,
    partyId: string,
    contactValue: string,
    excludeContactId?: string,
    dbClient: DbClient = getDb()
  ) {
    const rows = await dbClient
      .select()
      .from(partyContact)
      .where(
        and(
          eq(partyContact.businessId, businessId),
          eq(partyContact.partyId, partyId),
          eq(partyContact.contactValue, contactValue),
          isNull(partyContact.deletedAt)
        )
      )
      .limit(5);

    if (!excludeContactId) {
      return rows[0] ?? null;
    }

    return rows.find((row) => row.id !== excludeContactId) ?? null;
  }

  async clearPreferredForPartyAndType(
    businessId: string,
    partyId: string,
    contactTypeCode: string,
    dbClient: DbClient = getDb()
  ) {
    await dbClient
      .update(partyContact)
      .set({
        isPreferred: false,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(partyContact.businessId, businessId),
          eq(partyContact.partyId, partyId),
          eq(partyContact.contactTypeCode, contactTypeCode),
          eq(partyContact.isPreferred, true),
          isNull(partyContact.deletedAt)
        )
      );
  }

  async updateById(
    businessId: string,
    partyContactId: string,
    values: PartyContactUpdateValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(partyContact)
      .set({
        ...(values.contactValue !== undefined
          ? { contactValue: values.contactValue }
          : {}),
        ...(values.isPreferred !== undefined
          ? { isPreferred: values.isPreferred }
          : {}),
        ...(values.isVerified !== undefined
          ? { isVerified: values.isVerified }
          : {}),
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
          eq(partyContact.businessId, businessId),
          eq(partyContact.id, partyContactId),
          isNull(partyContact.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }
}

export function createPartyContactRepository(): PartyContactRepository {
  return new PartyContactRepository();
}
