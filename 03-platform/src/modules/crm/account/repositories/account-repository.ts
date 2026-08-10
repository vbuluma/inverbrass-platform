/**
 * Purpose:
 * Persist and read CRM accounts and account contacts.
 *
 * Implementation Package:
 * BP-004 / IP-04 – Customer & Contact Management
 */

import {
  and,
  count,
  desc,
  eq,
  ilike,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { alias } from "drizzle-orm/pg-core";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { crmAccount } from "@/db/schema/crm-account";
import { crmAccountContact } from "@/db/schema/crm-account-contact";
import { party } from "@/db/schema/party";
import { partyContact } from "@/db/schema/party-contact";

type DbClient = PostgresJsDatabase<typeof schema>;

export type AccountInsertValues = {
  businessId: string;
  accountNumber: string;
  name: string;
  accountTypeCode: string;
  statusCode: string;
  partyId?: string | null;
  crmRecordId?: string | null;
  parentAccountId?: string | null;
  ownerPartyId?: string | null;
  branchId?: string | null;
  segmentCode?: string | null;
  classificationTags?: string[] | null;
  notes?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type AccountUpdateValues = {
  name?: string;
  accountTypeCode?: string;
  statusCode?: string;
  partyId?: string | null;
  crmRecordId?: string | null;
  parentAccountId?: string | null;
  ownerPartyId?: string | null;
  branchId?: string | null;
  segmentCode?: string | null;
  classificationTags?: string[] | null;
  notes?: string | null;
  updatedBy?: string | null;
};

export type AccountContactInsertValues = {
  accountId: string;
  contactPartyId: string;
  roleCode: string;
  influenceLevel?: string | null;
  isPrimary?: boolean;
  opportunityId?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type AccountRow = typeof crmAccount.$inferSelect;

export type AccountJoinedRow = AccountRow & {
  partyDisplayName: string | null;
  parentAccountName: string | null;
};

export class AccountRepository {
  async insert(values: AccountInsertValues, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .insert(crmAccount)
      .values({
        businessId: values.businessId,
        accountNumber: values.accountNumber,
        name: values.name,
        accountTypeCode: values.accountTypeCode,
        statusCode: values.statusCode,
        partyId: values.partyId ?? null,
        crmRecordId: values.crmRecordId ?? null,
        parentAccountId: values.parentAccountId ?? null,
        ownerPartyId: values.ownerPartyId ?? null,
        branchId: values.branchId ?? null,
        segmentCode: values.segmentCode ?? null,
        classificationTags: values.classificationTags ?? null,
        notes: values.notes ?? null,
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();
    return row!;
  }

  async findById(
    businessId: string,
    accountId: string,
    dbClient: DbClient = getDb()
  ): Promise<AccountJoinedRow | null> {
    const parentAccount = alias(crmAccount, "parent_account");
    const [row] = await dbClient
      .select({
        id: crmAccount.id,
        businessId: crmAccount.businessId,
        accountNumber: crmAccount.accountNumber,
        name: crmAccount.name,
        partyId: crmAccount.partyId,
        crmRecordId: crmAccount.crmRecordId,
        accountTypeCode: crmAccount.accountTypeCode,
        statusCode: crmAccount.statusCode,
        parentAccountId: crmAccount.parentAccountId,
        ownerPartyId: crmAccount.ownerPartyId,
        branchId: crmAccount.branchId,
        segmentCode: crmAccount.segmentCode,
        classificationTags: crmAccount.classificationTags,
        notes: crmAccount.notes,
        metadata: crmAccount.metadata,
        createdAt: crmAccount.createdAt,
        createdBy: crmAccount.createdBy,
        updatedAt: crmAccount.updatedAt,
        updatedBy: crmAccount.updatedBy,
        deletedAt: crmAccount.deletedAt,
        version: crmAccount.version,
        partyDisplayName: party.displayName,
        parentAccountName: parentAccount.name,
      })
      .from(crmAccount)
      .leftJoin(party, eq(crmAccount.partyId, party.id))
      .leftJoin(parentAccount, eq(crmAccount.parentAccountId, parentAccount.id))
      .where(
        and(
          eq(crmAccount.businessId, businessId),
          eq(crmAccount.id, accountId),
          isNull(crmAccount.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async findByName(
    businessId: string,
    name: string,
    excludeAccountId?: string,
    dbClient: DbClient = getDb()
  ) {
    const conditions = [
      eq(crmAccount.businessId, businessId),
      eq(crmAccount.name, name),
      isNull(crmAccount.deletedAt),
    ];
    if (excludeAccountId) {
      conditions.push(sql`${crmAccount.id} <> ${excludeAccountId}`);
    }
    const [row] = await dbClient
      .select({ id: crmAccount.id })
      .from(crmAccount)
      .where(and(...conditions))
      .limit(1);
    return row ?? null;
  }

  async updateById(
    businessId: string,
    accountId: string,
    values: AccountUpdateValues,
    expectedVersion: number,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(crmAccount)
      .set({
        ...values,
        updatedAt: new Date(),
        version: expectedVersion + 1,
      })
      .where(
        and(
          eq(crmAccount.businessId, businessId),
          eq(crmAccount.id, accountId),
          eq(crmAccount.version, expectedVersion),
          isNull(crmAccount.deletedAt)
        )
      )
      .returning();
    return row ?? null;
  }

  async nextAccountSequence(businessId: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({ total: count() })
      .from(crmAccount)
      .where(eq(crmAccount.businessId, businessId));
    return Number(row?.total ?? 0) + 1;
  }

  async countByBusinessId(businessId: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({ total: count() })
      .from(crmAccount)
      .where(and(eq(crmAccount.businessId, businessId), isNull(crmAccount.deletedAt)));
    return Number(row?.total ?? 0);
  }

  async countByStatus(
    businessId: string,
    statusCode: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select({ total: count() })
      .from(crmAccount)
      .where(
        and(
          eq(crmAccount.businessId, businessId),
          eq(crmAccount.statusCode, statusCode),
          isNull(crmAccount.deletedAt)
        )
      );
    return Number(row?.total ?? 0);
  }

  async countGroupedByType(businessId: string, dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        typeCode: crmAccount.accountTypeCode,
        total: count(),
      })
      .from(crmAccount)
      .where(and(eq(crmAccount.businessId, businessId), isNull(crmAccount.deletedAt)))
      .groupBy(crmAccount.accountTypeCode);
  }

  async listParentLinks(businessId: string, dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        id: crmAccount.id,
        parentAccountId: crmAccount.parentAccountId,
      })
      .from(crmAccount)
      .where(and(eq(crmAccount.businessId, businessId), isNull(crmAccount.deletedAt)));
  }

  async listChildren(
    businessId: string,
    parentAccountId: string,
    dbClient: DbClient = getDb()
  ) {
    const parentAccount = alias(crmAccount, "parent_account");
    return dbClient
      .select({
        id: crmAccount.id,
        businessId: crmAccount.businessId,
        accountNumber: crmAccount.accountNumber,
        name: crmAccount.name,
        partyId: crmAccount.partyId,
        crmRecordId: crmAccount.crmRecordId,
        accountTypeCode: crmAccount.accountTypeCode,
        statusCode: crmAccount.statusCode,
        parentAccountId: crmAccount.parentAccountId,
        ownerPartyId: crmAccount.ownerPartyId,
        branchId: crmAccount.branchId,
        segmentCode: crmAccount.segmentCode,
        classificationTags: crmAccount.classificationTags,
        notes: crmAccount.notes,
        metadata: crmAccount.metadata,
        createdAt: crmAccount.createdAt,
        createdBy: crmAccount.createdBy,
        updatedAt: crmAccount.updatedAt,
        updatedBy: crmAccount.updatedBy,
        deletedAt: crmAccount.deletedAt,
        version: crmAccount.version,
        partyDisplayName: party.displayName,
        parentAccountName: parentAccount.name,
      })
      .from(crmAccount)
      .leftJoin(party, eq(crmAccount.partyId, party.id))
      .leftJoin(parentAccount, eq(crmAccount.parentAccountId, parentAccount.id))
      .where(
        and(
          eq(crmAccount.businessId, businessId),
          eq(crmAccount.parentAccountId, parentAccountId),
          isNull(crmAccount.deletedAt)
        )
      )
      .orderBy(crmAccount.name);
  }

  async listByCrmRecordId(
    businessId: string,
    crmRecordId: string,
    dbClient: DbClient = getDb()
  ) {
    const parentAccount = alias(crmAccount, "parent_account");
    return dbClient
      .select({
        id: crmAccount.id,
        businessId: crmAccount.businessId,
        accountNumber: crmAccount.accountNumber,
        name: crmAccount.name,
        partyId: crmAccount.partyId,
        crmRecordId: crmAccount.crmRecordId,
        accountTypeCode: crmAccount.accountTypeCode,
        statusCode: crmAccount.statusCode,
        parentAccountId: crmAccount.parentAccountId,
        ownerPartyId: crmAccount.ownerPartyId,
        branchId: crmAccount.branchId,
        segmentCode: crmAccount.segmentCode,
        classificationTags: crmAccount.classificationTags,
        notes: crmAccount.notes,
        metadata: crmAccount.metadata,
        createdAt: crmAccount.createdAt,
        createdBy: crmAccount.createdBy,
        updatedAt: crmAccount.updatedAt,
        updatedBy: crmAccount.updatedBy,
        deletedAt: crmAccount.deletedAt,
        version: crmAccount.version,
        partyDisplayName: party.displayName,
        parentAccountName: parentAccount.name,
      })
      .from(crmAccount)
      .leftJoin(party, eq(crmAccount.partyId, party.id))
      .leftJoin(parentAccount, eq(crmAccount.parentAccountId, parentAccount.id))
      .where(
        and(
          eq(crmAccount.businessId, businessId),
          eq(crmAccount.crmRecordId, crmRecordId),
          isNull(crmAccount.deletedAt)
        )
      )
      .orderBy(desc(crmAccount.updatedAt));
  }

  async listByPartyId(
    businessId: string,
    partyId: string,
    dbClient: DbClient = getDb()
  ) {
    return this.listByFilters(businessId, { partyId, limit: 25 }, dbClient);
  }

  async listRecentlyUpdated(
    businessId: string,
    limit: number,
    dbClient: DbClient = getDb()
  ) {
    return this.listByFilters(businessId, { limit }, dbClient).then((r) => r.items);
  }

  async listByFilters(
    businessId: string,
    filters: {
      search?: string;
      statusCode?: string;
      accountTypeCode?: string;
      ownerPartyId?: string;
      crmRecordId?: string;
      partyId?: string;
      parentAccountId?: string;
      limit?: number;
      offset?: number;
    },
    dbClient: DbClient = getDb()
  ) {
    const parentAccount = alias(crmAccount, "parent_account");
    const conditions = [
      eq(crmAccount.businessId, businessId),
      isNull(crmAccount.deletedAt),
    ];

    if (filters.statusCode) conditions.push(eq(crmAccount.statusCode, filters.statusCode));
    if (filters.accountTypeCode)
      conditions.push(eq(crmAccount.accountTypeCode, filters.accountTypeCode));
    if (filters.ownerPartyId)
      conditions.push(eq(crmAccount.ownerPartyId, filters.ownerPartyId));
    if (filters.crmRecordId)
      conditions.push(eq(crmAccount.crmRecordId, filters.crmRecordId));
    if (filters.partyId) conditions.push(eq(crmAccount.partyId, filters.partyId));
    if (filters.parentAccountId)
      conditions.push(eq(crmAccount.parentAccountId, filters.parentAccountId));

    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(crmAccount.name, term),
          ilike(crmAccount.accountNumber, term),
          ilike(party.displayName, term)
        )!
      );
    }

    const whereClause = and(...conditions);
    const limit = filters.limit ?? 25;
    const offset = filters.offset ?? 0;

    const [items, [totalRow]] = await Promise.all([
      dbClient
        .select({
          id: crmAccount.id,
          businessId: crmAccount.businessId,
          accountNumber: crmAccount.accountNumber,
          name: crmAccount.name,
          partyId: crmAccount.partyId,
          crmRecordId: crmAccount.crmRecordId,
          accountTypeCode: crmAccount.accountTypeCode,
          statusCode: crmAccount.statusCode,
          parentAccountId: crmAccount.parentAccountId,
          ownerPartyId: crmAccount.ownerPartyId,
          branchId: crmAccount.branchId,
          segmentCode: crmAccount.segmentCode,
          classificationTags: crmAccount.classificationTags,
          notes: crmAccount.notes,
          metadata: crmAccount.metadata,
          createdAt: crmAccount.createdAt,
          createdBy: crmAccount.createdBy,
          updatedAt: crmAccount.updatedAt,
          updatedBy: crmAccount.updatedBy,
          deletedAt: crmAccount.deletedAt,
          version: crmAccount.version,
          partyDisplayName: party.displayName,
          parentAccountName: parentAccount.name,
        })
        .from(crmAccount)
        .leftJoin(party, eq(crmAccount.partyId, party.id))
        .leftJoin(parentAccount, eq(crmAccount.parentAccountId, parentAccount.id))
        .where(whereClause)
        .orderBy(desc(crmAccount.updatedAt))
        .limit(limit)
        .offset(offset),
      dbClient
        .select({ total: count() })
        .from(crmAccount)
        .leftJoin(party, eq(crmAccount.partyId, party.id))
        .where(whereClause),
    ]);

    return { items, total: Number(totalRow?.total ?? 0) };
  }

  async countContacts(accountId: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({ total: count() })
      .from(crmAccountContact)
      .where(
        and(eq(crmAccountContact.accountId, accountId), isNull(crmAccountContact.deletedAt))
      );
    return Number(row?.total ?? 0);
  }

  async countChildren(accountId: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({ total: count() })
      .from(crmAccount)
      .where(
        and(eq(crmAccount.parentAccountId, accountId), isNull(crmAccount.deletedAt))
      );
    return Number(row?.total ?? 0);
  }

  async listContacts(accountId: string, dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        id: crmAccountContact.id,
        accountId: crmAccountContact.accountId,
        contactPartyId: crmAccountContact.contactPartyId,
        roleCode: crmAccountContact.roleCode,
        influenceLevel: crmAccountContact.influenceLevel,
        isPrimary: crmAccountContact.isPrimary,
        opportunityId: crmAccountContact.opportunityId,
        notes: crmAccountContact.notes,
        version: crmAccountContact.version,
        contactDisplayName: party.displayName,
        contactPartyNumber: party.partyNumber,
      })
      .from(crmAccountContact)
      .innerJoin(party, eq(crmAccountContact.contactPartyId, party.id))
      .where(
        and(eq(crmAccountContact.accountId, accountId), isNull(crmAccountContact.deletedAt))
      )
      .orderBy(desc(crmAccountContact.isPrimary), party.displayName);
  }

  async findPrimaryContact(accountId: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({
        id: crmAccountContact.id,
        contactPartyId: crmAccountContact.contactPartyId,
        contactDisplayName: party.displayName,
      })
      .from(crmAccountContact)
      .innerJoin(party, eq(crmAccountContact.contactPartyId, party.id))
      .where(
        and(
          eq(crmAccountContact.accountId, accountId),
          eq(crmAccountContact.isPrimary, true),
          isNull(crmAccountContact.deletedAt)
        )
      )
      .limit(1);
    return row ?? null;
  }

  async insertContact(
    values: AccountContactInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(crmAccountContact)
      .values({
        accountId: values.accountId,
        contactPartyId: values.contactPartyId,
        roleCode: values.roleCode,
        influenceLevel: values.influenceLevel ?? null,
        isPrimary: values.isPrimary ?? false,
        opportunityId: values.opportunityId ?? null,
        notes: values.notes ?? null,
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();
    return row!;
  }

  async clearPrimary(accountId: string, dbClient: DbClient = getDb()) {
    await dbClient
      .update(crmAccountContact)
      .set({ isPrimary: false, updatedAt: new Date() })
      .where(
        and(
          eq(crmAccountContact.accountId, accountId),
          eq(crmAccountContact.isPrimary, true),
          isNull(crmAccountContact.deletedAt)
        )
      );
  }

  async updateContactById(
    accountContactId: string,
    values: {
      roleCode?: string;
      influenceLevel?: string | null;
      isPrimary?: boolean;
      opportunityId?: string | null;
      notes?: string | null;
      updatedBy?: string | null;
    },
    expectedVersion: number,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(crmAccountContact)
      .set({
        ...values,
        updatedAt: new Date(),
        version: expectedVersion + 1,
      })
      .where(
        and(
          eq(crmAccountContact.id, accountContactId),
          eq(crmAccountContact.version, expectedVersion),
          isNull(crmAccountContact.deletedAt)
        )
      )
      .returning();
    return row ?? null;
  }

  async softDeleteContact(
    accountContactId: string,
    updatedBy: string | null,
    expectedVersion: number,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(crmAccountContact)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
        updatedBy,
        version: expectedVersion + 1,
      })
      .where(
        and(
          eq(crmAccountContact.id, accountContactId),
          eq(crmAccountContact.version, expectedVersion),
          isNull(crmAccountContact.deletedAt)
        )
      )
      .returning();
    return row ?? null;
  }

  async findContactById(accountContactId: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select()
      .from(crmAccountContact)
      .where(
        and(eq(crmAccountContact.id, accountContactId), isNull(crmAccountContact.deletedAt))
      )
      .limit(1);
    return row ?? null;
  }

  async findPreferredChannels(partyId: string, dbClient: DbClient = getDb()) {
    const rows = await dbClient
      .select({
        contactTypeCode: partyContact.contactTypeCode,
        contactValue: partyContact.contactValue,
        isPreferred: partyContact.isPreferred,
      })
      .from(partyContact)
      .where(
        and(
          eq(partyContact.partyId, partyId),
          isNull(partyContact.deletedAt),
          eq(partyContact.statusCode, "ACTIVE")
        )
      );

    const preferredEmail =
      rows.find((r) => r.contactTypeCode === "EMAIL" && r.isPreferred)?.contactValue ??
      rows.find((r) => r.contactTypeCode === "EMAIL")?.contactValue ??
      null;
    const preferredPhone =
      rows.find(
        (r) =>
          (r.contactTypeCode === "MOBILE" || r.contactTypeCode === "PHONE") &&
          r.isPreferred
      )?.contactValue ??
      rows.find(
        (r) => r.contactTypeCode === "MOBILE" || r.contactTypeCode === "PHONE"
      )?.contactValue ??
      null;

    return { preferredEmail, preferredPhone };
  }
}

export function createAccountRepository(): AccountRepository {
  return new AccountRepository();
}
