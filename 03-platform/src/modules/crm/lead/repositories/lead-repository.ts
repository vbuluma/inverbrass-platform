/**
 * Purpose:
 * Persist and read CRM lead records.
 *
 * Implementation Package:
 * BP-004 / IP-02 – Lead Management
 */

import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  ne,
  or,
} from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { crmLead } from "@/db/schema/crm-lead";
import { party } from "@/db/schema/party";
import {
  LEAD_ACTIVE_STATUS_CODES,
  type LeadStatusCode,
} from "@/modules/crm/lead/constants";

type DbClient = PostgresJsDatabase<typeof schema>;

export type LeadInsertValues = {
  businessId: string;
  partyId: string;
  leadNumber: string;
  statusCode: LeadStatusCode | string;
  sourceCode: string;
  channelCode?: string | null;
  ownerPartyId?: string | null;
  branchId?: string | null;
  companyName?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type LeadUpdateValues = {
  statusCode?: string;
  sourceCode?: string;
  channelCode?: string | null;
  ownerPartyId?: string | null;
  branchId?: string | null;
  companyName?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  qualificationScore?: number | null;
  convertedCrmId?: string | null;
  convertedAt?: Date | null;
  disqualificationReasonCode?: string | null;
  notes?: string | null;
  updatedBy?: string | null;
};

export type LeadListQueryFilters = {
  search?: string;
  statusCode?: string;
  sourceCode?: string;
  ownerPartyId?: string;
  branchId?: string;
  limit?: number;
  offset?: number;
};

export type LeadRow = typeof crmLead.$inferSelect;

export type LeadJoinedRow = LeadRow & {
  partyDisplayName: string;
  partyNumber: string;
};

export class LeadRepository {
  async insert(values: LeadInsertValues, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .insert(crmLead)
      .values({
        businessId: values.businessId,
        partyId: values.partyId,
        leadNumber: values.leadNumber,
        statusCode: values.statusCode,
        sourceCode: values.sourceCode,
        channelCode: values.channelCode ?? null,
        ownerPartyId: values.ownerPartyId ?? null,
        branchId: values.branchId ?? null,
        companyName: values.companyName ?? null,
        contactName: values.contactName ?? null,
        email: values.email ?? null,
        phone: values.phone ?? null,
        notes: values.notes ?? null,
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();

    return row!;
  }

  async findByIdJoined(
    businessId: string,
    leadId: string,
    dbClient: DbClient = getDb()
  ): Promise<LeadJoinedRow | null> {
    const [row] = await dbClient
      .select({
        id: crmLead.id,
        businessId: crmLead.businessId,
        partyId: crmLead.partyId,
        leadNumber: crmLead.leadNumber,
        statusCode: crmLead.statusCode,
        sourceCode: crmLead.sourceCode,
        channelCode: crmLead.channelCode,
        ownerPartyId: crmLead.ownerPartyId,
        branchId: crmLead.branchId,
        companyName: crmLead.companyName,
        contactName: crmLead.contactName,
        email: crmLead.email,
        phone: crmLead.phone,
        qualificationScore: crmLead.qualificationScore,
        convertedCrmId: crmLead.convertedCrmId,
        convertedAt: crmLead.convertedAt,
        disqualificationReasonCode: crmLead.disqualificationReasonCode,
        notes: crmLead.notes,
        metadata: crmLead.metadata,
        createdAt: crmLead.createdAt,
        createdBy: crmLead.createdBy,
        updatedAt: crmLead.updatedAt,
        updatedBy: crmLead.updatedBy,
        deletedAt: crmLead.deletedAt,
        version: crmLead.version,
        partyDisplayName: party.displayName,
        partyNumber: party.partyNumber,
      })
      .from(crmLead)
      .innerJoin(party, eq(crmLead.partyId, party.id))
      .where(
        and(
          eq(crmLead.businessId, businessId),
          eq(crmLead.id, leadId),
          isNull(crmLead.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async findActiveByPartyId(
    businessId: string,
    partyId: string,
    dbClient: DbClient = getDb()
  ): Promise<LeadJoinedRow | null> {
    const [row] = await dbClient
      .select({
        id: crmLead.id,
        businessId: crmLead.businessId,
        partyId: crmLead.partyId,
        leadNumber: crmLead.leadNumber,
        statusCode: crmLead.statusCode,
        sourceCode: crmLead.sourceCode,
        channelCode: crmLead.channelCode,
        ownerPartyId: crmLead.ownerPartyId,
        branchId: crmLead.branchId,
        companyName: crmLead.companyName,
        contactName: crmLead.contactName,
        email: crmLead.email,
        phone: crmLead.phone,
        qualificationScore: crmLead.qualificationScore,
        convertedCrmId: crmLead.convertedCrmId,
        convertedAt: crmLead.convertedAt,
        disqualificationReasonCode: crmLead.disqualificationReasonCode,
        notes: crmLead.notes,
        metadata: crmLead.metadata,
        createdAt: crmLead.createdAt,
        createdBy: crmLead.createdBy,
        updatedAt: crmLead.updatedAt,
        updatedBy: crmLead.updatedBy,
        deletedAt: crmLead.deletedAt,
        version: crmLead.version,
        partyDisplayName: party.displayName,
        partyNumber: party.partyNumber,
      })
      .from(crmLead)
      .innerJoin(party, eq(crmLead.partyId, party.id))
      .where(
        and(
          eq(crmLead.businessId, businessId),
          eq(crmLead.partyId, partyId),
          inArray(crmLead.statusCode, LEAD_ACTIVE_STATUS_CODES),
          isNull(crmLead.deletedAt)
        )
      )
      .orderBy(desc(crmLead.updatedAt))
      .limit(1);

    return row ?? null;
  }

  async updateById(
    businessId: string,
    leadId: string,
    values: LeadUpdateValues,
    expectedVersion: number,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(crmLead)
      .set({
        ...values,
        updatedAt: new Date(),
        version: expectedVersion + 1,
      })
      .where(
        and(
          eq(crmLead.businessId, businessId),
          eq(crmLead.id, leadId),
          eq(crmLead.version, expectedVersion),
          isNull(crmLead.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }

  async nextLeadSequence(businessId: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({ total: count() })
      .from(crmLead)
      .where(eq(crmLead.businessId, businessId));
    return Number(row?.total ?? 0) + 1;
  }

  async countByBusinessId(businessId: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({ total: count() })
      .from(crmLead)
      .where(and(eq(crmLead.businessId, businessId), isNull(crmLead.deletedAt)));
    return Number(row?.total ?? 0);
  }

  async countByStatus(
    businessId: string,
    statusCode: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select({ total: count() })
      .from(crmLead)
      .where(
        and(
          eq(crmLead.businessId, businessId),
          eq(crmLead.statusCode, statusCode),
          isNull(crmLead.deletedAt)
        )
      );
    return Number(row?.total ?? 0);
  }

  async countGroupedByStatus(businessId: string, dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        statusCode: crmLead.statusCode,
        total: count(),
      })
      .from(crmLead)
      .where(and(eq(crmLead.businessId, businessId), isNull(crmLead.deletedAt)))
      .groupBy(crmLead.statusCode);
  }

  async countGroupedBySource(businessId: string, dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        sourceCode: crmLead.sourceCode,
        total: count(),
      })
      .from(crmLead)
      .where(and(eq(crmLead.businessId, businessId), isNull(crmLead.deletedAt)))
      .groupBy(crmLead.sourceCode);
  }

  async listRecentlyUpdatedByBusinessId(
    businessId: string,
    limit: number,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select({
        id: crmLead.id,
        businessId: crmLead.businessId,
        partyId: crmLead.partyId,
        leadNumber: crmLead.leadNumber,
        statusCode: crmLead.statusCode,
        sourceCode: crmLead.sourceCode,
        channelCode: crmLead.channelCode,
        ownerPartyId: crmLead.ownerPartyId,
        branchId: crmLead.branchId,
        companyName: crmLead.companyName,
        contactName: crmLead.contactName,
        email: crmLead.email,
        phone: crmLead.phone,
        qualificationScore: crmLead.qualificationScore,
        convertedCrmId: crmLead.convertedCrmId,
        convertedAt: crmLead.convertedAt,
        disqualificationReasonCode: crmLead.disqualificationReasonCode,
        notes: crmLead.notes,
        metadata: crmLead.metadata,
        createdAt: crmLead.createdAt,
        createdBy: crmLead.createdBy,
        updatedAt: crmLead.updatedAt,
        updatedBy: crmLead.updatedBy,
        deletedAt: crmLead.deletedAt,
        version: crmLead.version,
        partyDisplayName: party.displayName,
        partyNumber: party.partyNumber,
      })
      .from(crmLead)
      .innerJoin(party, eq(crmLead.partyId, party.id))
      .where(and(eq(crmLead.businessId, businessId), isNull(crmLead.deletedAt)))
      .orderBy(desc(crmLead.updatedAt))
      .limit(limit);
  }

  async listByFilters(
    businessId: string,
    filters: LeadListQueryFilters,
    dbClient: DbClient = getDb()
  ) {
    const conditions = [eq(crmLead.businessId, businessId), isNull(crmLead.deletedAt)];

    if (filters.statusCode) {
      conditions.push(eq(crmLead.statusCode, filters.statusCode));
    }
    if (filters.sourceCode) {
      conditions.push(eq(crmLead.sourceCode, filters.sourceCode));
    }
    if (filters.ownerPartyId) {
      conditions.push(eq(crmLead.ownerPartyId, filters.ownerPartyId));
    }
    if (filters.branchId) {
      conditions.push(eq(crmLead.branchId, filters.branchId));
    }
    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(crmLead.leadNumber, term),
          ilike(party.displayName, term),
          ilike(party.partyNumber, term),
          ilike(crmLead.email, term),
          ilike(crmLead.phone, term),
          ilike(crmLead.companyName, term)
        )!
      );
    }

    const whereClause = and(...conditions);
    const limit = filters.limit ?? 25;
    const offset = filters.offset ?? 0;

    const [items, [totalRow]] = await Promise.all([
      dbClient
        .select({
          id: crmLead.id,
          businessId: crmLead.businessId,
          partyId: crmLead.partyId,
          leadNumber: crmLead.leadNumber,
          statusCode: crmLead.statusCode,
          sourceCode: crmLead.sourceCode,
          channelCode: crmLead.channelCode,
          ownerPartyId: crmLead.ownerPartyId,
          branchId: crmLead.branchId,
          companyName: crmLead.companyName,
          contactName: crmLead.contactName,
          email: crmLead.email,
          phone: crmLead.phone,
          qualificationScore: crmLead.qualificationScore,
          convertedCrmId: crmLead.convertedCrmId,
          convertedAt: crmLead.convertedAt,
          disqualificationReasonCode: crmLead.disqualificationReasonCode,
          notes: crmLead.notes,
          metadata: crmLead.metadata,
          createdAt: crmLead.createdAt,
          createdBy: crmLead.createdBy,
          updatedAt: crmLead.updatedAt,
          updatedBy: crmLead.updatedBy,
          deletedAt: crmLead.deletedAt,
          version: crmLead.version,
          partyDisplayName: party.displayName,
          partyNumber: party.partyNumber,
        })
        .from(crmLead)
        .innerJoin(party, eq(crmLead.partyId, party.id))
        .where(whereClause)
        .orderBy(desc(crmLead.updatedAt))
        .limit(limit)
        .offset(offset),
      dbClient
        .select({ total: count() })
        .from(crmLead)
        .innerJoin(party, eq(crmLead.partyId, party.id))
        .where(whereClause),
    ]);

    return { items, total: Number(totalRow?.total ?? 0) };
  }

  async findDuplicateCandidates(
    businessId: string,
    input: { email?: string | null; phone?: string | null; companyName?: string | null },
    excludeLeadId?: string,
    dbClient: DbClient = getDb()
  ) {
    const matchConditions = [];

    if (input.email?.trim()) {
      matchConditions.push(eq(crmLead.email, input.email.trim()));
    }
    if (input.phone?.trim()) {
      matchConditions.push(eq(crmLead.phone, input.phone.trim()));
    }
    if (input.companyName?.trim()) {
      matchConditions.push(eq(crmLead.companyName, input.companyName.trim()));
    }

    if (matchConditions.length === 0) {
      return [];
    }

    const conditions = [
      eq(crmLead.businessId, businessId),
      isNull(crmLead.deletedAt),
      or(...matchConditions)!,
    ];

    if (excludeLeadId) {
      conditions.push(ne(crmLead.id, excludeLeadId));
    }

    return dbClient
      .select({
        id: crmLead.id,
        leadNumber: crmLead.leadNumber,
        email: crmLead.email,
        phone: crmLead.phone,
        companyName: crmLead.companyName,
      })
      .from(crmLead)
      .where(and(...conditions))
      .limit(5);
  }
}

export function createLeadRepository(): LeadRepository {
  return new LeadRepository();
}
