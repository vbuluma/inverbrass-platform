/**
 * Purpose:
 * Persist and read CRM opportunity records.
 *
 * Implementation Package:
 * BP-004 / IP-03 – Opportunity Management
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

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { crmLead } from "@/db/schema/crm-lead";
import { crmOpportunity } from "@/db/schema/crm-opportunity";
import { crmOpportunityLineItem } from "@/db/schema/crm-opportunity-line-item";
import { party } from "@/db/schema/party";
import { product } from "@/db/schema/product";
import { OPPORTUNITY_STATUS_CODES } from "@/modules/crm/opportunity/constants";

type DbClient = PostgresJsDatabase<typeof schema>;

export type OpportunityInsertValues = {
  businessId: string;
  crmRecordId: string;
  partyId: string;
  accountId?: string | null;
  sourceLeadId?: string | null;
  primaryContactPartyId?: string | null;
  opportunityNumber: string;
  name: string;
  pipelineId: string;
  stageCode: string;
  statusCode: string;
  ownerPartyId?: string | null;
  branchId?: string | null;
  expectedCloseDate?: string | null;
  amount?: string | null;
  currencyCode?: string | null;
  probability?: number;
  weightedAmount?: string | null;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type OpportunityUpdateValues = {
  name?: string;
  accountId?: string | null;
  stageCode?: string;
  statusCode?: string;
  ownerPartyId?: string | null;
  branchId?: string | null;
  primaryContactPartyId?: string | null;
  expectedCloseDate?: string | null;
  amount?: string | null;
  currencyCode?: string | null;
  probability?: number;
  weightedAmount?: string | null;
  lossReasonCode?: string | null;
  competitorCode?: string | null;
  closeNotes?: string | null;
  closedAt?: Date | null;
  metadata?: Record<string, unknown> | null;
  updatedBy?: string | null;
};

export type OpportunityJoinedRow = typeof crmOpportunity.$inferSelect & {
  partyDisplayName: string;
  partyNumber: string;
  sourceLeadNumber: string | null;
};

export class OpportunityRepository {
  async insert(values: OpportunityInsertValues, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .insert(crmOpportunity)
      .values({
        businessId: values.businessId,
        crmRecordId: values.crmRecordId,
        partyId: values.partyId,
        accountId: values.accountId ?? null,
        sourceLeadId: values.sourceLeadId ?? null,
        primaryContactPartyId: values.primaryContactPartyId ?? null,
        opportunityNumber: values.opportunityNumber,
        name: values.name,
        pipelineId: values.pipelineId,
        stageCode: values.stageCode,
        statusCode: values.statusCode,
        ownerPartyId: values.ownerPartyId ?? null,
        branchId: values.branchId ?? null,
        expectedCloseDate: values.expectedCloseDate ?? null,
        amount: values.amount ?? null,
        currencyCode: values.currencyCode ?? null,
        probability: values.probability ?? 0,
        weightedAmount: values.weightedAmount ?? null,
        metadata: values.metadata ?? null,
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();

    return row!;
  }

  async findByIdJoined(
    businessId: string,
    opportunityId: string,
    dbClient: DbClient = getDb()
  ): Promise<OpportunityJoinedRow | null> {
    const [row] = await dbClient
      .select({
        id: crmOpportunity.id,
        businessId: crmOpportunity.businessId,
        crmRecordId: crmOpportunity.crmRecordId,
        partyId: crmOpportunity.partyId,
        accountId: crmOpportunity.accountId,
        sourceLeadId: crmOpportunity.sourceLeadId,
        primaryContactPartyId: crmOpportunity.primaryContactPartyId,
        opportunityNumber: crmOpportunity.opportunityNumber,
        name: crmOpportunity.name,
        pipelineId: crmOpportunity.pipelineId,
        stageCode: crmOpportunity.stageCode,
        statusCode: crmOpportunity.statusCode,
        ownerPartyId: crmOpportunity.ownerPartyId,
        branchId: crmOpportunity.branchId,
        expectedCloseDate: crmOpportunity.expectedCloseDate,
        amount: crmOpportunity.amount,
        currencyCode: crmOpportunity.currencyCode,
        probability: crmOpportunity.probability,
        weightedAmount: crmOpportunity.weightedAmount,
        lossReasonCode: crmOpportunity.lossReasonCode,
        competitorCode: crmOpportunity.competitorCode,
        closeNotes: crmOpportunity.closeNotes,
        closedAt: crmOpportunity.closedAt,
        metadata: crmOpportunity.metadata,
        createdAt: crmOpportunity.createdAt,
        createdBy: crmOpportunity.createdBy,
        updatedAt: crmOpportunity.updatedAt,
        updatedBy: crmOpportunity.updatedBy,
        deletedAt: crmOpportunity.deletedAt,
        version: crmOpportunity.version,
        partyDisplayName: party.displayName,
        partyNumber: party.partyNumber,
        sourceLeadNumber: crmLead.leadNumber,
      })
      .from(crmOpportunity)
      .innerJoin(party, eq(crmOpportunity.partyId, party.id))
      .leftJoin(crmLead, eq(crmOpportunity.sourceLeadId, crmLead.id))
      .where(
        and(
          eq(crmOpportunity.businessId, businessId),
          eq(crmOpportunity.id, opportunityId),
          isNull(crmOpportunity.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async updateById(
    businessId: string,
    opportunityId: string,
    values: OpportunityUpdateValues,
    expectedVersion: number,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(crmOpportunity)
      .set({
        ...values,
        updatedAt: new Date(),
        version: expectedVersion + 1,
      })
      .where(
        and(
          eq(crmOpportunity.businessId, businessId),
          eq(crmOpportunity.id, opportunityId),
          eq(crmOpportunity.version, expectedVersion),
          isNull(crmOpportunity.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }

  async nextOpportunitySequence(businessId: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({ total: count() })
      .from(crmOpportunity)
      .where(eq(crmOpportunity.businessId, businessId));
    return Number(row?.total ?? 0) + 1;
  }

  async countByStatus(businessId: string, statusCode: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({ total: count() })
      .from(crmOpportunity)
      .where(
        and(
          eq(crmOpportunity.businessId, businessId),
          eq(crmOpportunity.statusCode, statusCode),
          isNull(crmOpportunity.deletedAt)
        )
      );
    return Number(row?.total ?? 0);
  }

  async sumOpenPipelineValue(businessId: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({
        total: sql<string>`coalesce(sum(${crmOpportunity.amount}), 0)`,
        weighted: sql<string>`coalesce(sum(${crmOpportunity.weightedAmount}), 0)`,
      })
      .from(crmOpportunity)
      .where(
        and(
          eq(crmOpportunity.businessId, businessId),
          eq(crmOpportunity.statusCode, OPPORTUNITY_STATUS_CODES.OPEN),
          isNull(crmOpportunity.deletedAt)
        )
      );
    return {
      pipelineValue: row?.total ?? "0",
      weightedForecast: row?.weighted ?? "0",
    };
  }

  async countGroupedByStage(businessId: string, dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        stageCode: crmOpportunity.stageCode,
        total: count(),
      })
      .from(crmOpportunity)
      .where(
        and(
          eq(crmOpportunity.businessId, businessId),
          eq(crmOpportunity.statusCode, OPPORTUNITY_STATUS_CODES.OPEN),
          isNull(crmOpportunity.deletedAt)
        )
      )
      .groupBy(crmOpportunity.stageCode);
  }

  async listOpenByPartyId(
    businessId: string,
    partyId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select({
        id: crmOpportunity.id,
        businessId: crmOpportunity.businessId,
        crmRecordId: crmOpportunity.crmRecordId,
        partyId: crmOpportunity.partyId,
        accountId: crmOpportunity.accountId,
        sourceLeadId: crmOpportunity.sourceLeadId,
        primaryContactPartyId: crmOpportunity.primaryContactPartyId,
        opportunityNumber: crmOpportunity.opportunityNumber,
        name: crmOpportunity.name,
        pipelineId: crmOpportunity.pipelineId,
        stageCode: crmOpportunity.stageCode,
        statusCode: crmOpportunity.statusCode,
        ownerPartyId: crmOpportunity.ownerPartyId,
        branchId: crmOpportunity.branchId,
        expectedCloseDate: crmOpportunity.expectedCloseDate,
        amount: crmOpportunity.amount,
        currencyCode: crmOpportunity.currencyCode,
        probability: crmOpportunity.probability,
        weightedAmount: crmOpportunity.weightedAmount,
        lossReasonCode: crmOpportunity.lossReasonCode,
        competitorCode: crmOpportunity.competitorCode,
        closeNotes: crmOpportunity.closeNotes,
        closedAt: crmOpportunity.closedAt,
        metadata: crmOpportunity.metadata,
        createdAt: crmOpportunity.createdAt,
        createdBy: crmOpportunity.createdBy,
        updatedAt: crmOpportunity.updatedAt,
        updatedBy: crmOpportunity.updatedBy,
        deletedAt: crmOpportunity.deletedAt,
        version: crmOpportunity.version,
        partyDisplayName: party.displayName,
        partyNumber: party.partyNumber,
        sourceLeadNumber: crmLead.leadNumber,
      })
      .from(crmOpportunity)
      .innerJoin(party, eq(crmOpportunity.partyId, party.id))
      .leftJoin(crmLead, eq(crmOpportunity.sourceLeadId, crmLead.id))
      .where(
        and(
          eq(crmOpportunity.businessId, businessId),
          eq(crmOpportunity.partyId, partyId),
          eq(crmOpportunity.statusCode, OPPORTUNITY_STATUS_CODES.OPEN),
          isNull(crmOpportunity.deletedAt)
        )
      )
      .orderBy(desc(crmOpportunity.amount), desc(crmOpportunity.updatedAt));
  }

  async listRecentlyUpdated(businessId: string, limit: number, dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        id: crmOpportunity.id,
        businessId: crmOpportunity.businessId,
        crmRecordId: crmOpportunity.crmRecordId,
        partyId: crmOpportunity.partyId,
        accountId: crmOpportunity.accountId,
        sourceLeadId: crmOpportunity.sourceLeadId,
        primaryContactPartyId: crmOpportunity.primaryContactPartyId,
        opportunityNumber: crmOpportunity.opportunityNumber,
        name: crmOpportunity.name,
        pipelineId: crmOpportunity.pipelineId,
        stageCode: crmOpportunity.stageCode,
        statusCode: crmOpportunity.statusCode,
        ownerPartyId: crmOpportunity.ownerPartyId,
        branchId: crmOpportunity.branchId,
        expectedCloseDate: crmOpportunity.expectedCloseDate,
        amount: crmOpportunity.amount,
        currencyCode: crmOpportunity.currencyCode,
        probability: crmOpportunity.probability,
        weightedAmount: crmOpportunity.weightedAmount,
        lossReasonCode: crmOpportunity.lossReasonCode,
        competitorCode: crmOpportunity.competitorCode,
        closeNotes: crmOpportunity.closeNotes,
        closedAt: crmOpportunity.closedAt,
        metadata: crmOpportunity.metadata,
        createdAt: crmOpportunity.createdAt,
        createdBy: crmOpportunity.createdBy,
        updatedAt: crmOpportunity.updatedAt,
        updatedBy: crmOpportunity.updatedBy,
        deletedAt: crmOpportunity.deletedAt,
        version: crmOpportunity.version,
        partyDisplayName: party.displayName,
        partyNumber: party.partyNumber,
        sourceLeadNumber: crmLead.leadNumber,
      })
      .from(crmOpportunity)
      .innerJoin(party, eq(crmOpportunity.partyId, party.id))
      .leftJoin(crmLead, eq(crmOpportunity.sourceLeadId, crmLead.id))
      .where(and(eq(crmOpportunity.businessId, businessId), isNull(crmOpportunity.deletedAt)))
      .orderBy(desc(crmOpportunity.updatedAt))
      .limit(limit);
  }

  async listByFilters(
    businessId: string,
    filters: {
      search?: string;
      statusCode?: string;
      stageCode?: string;
      pipelineId?: string;
      ownerPartyId?: string;
      crmRecordId?: string;
      partyId?: string;
      limit?: number;
      offset?: number;
    },
    dbClient: DbClient = getDb()
  ) {
    const conditions = [
      eq(crmOpportunity.businessId, businessId),
      isNull(crmOpportunity.deletedAt),
    ];

    if (filters.statusCode) conditions.push(eq(crmOpportunity.statusCode, filters.statusCode));
    if (filters.stageCode) conditions.push(eq(crmOpportunity.stageCode, filters.stageCode));
    if (filters.pipelineId) conditions.push(eq(crmOpportunity.pipelineId, filters.pipelineId));
    if (filters.ownerPartyId) conditions.push(eq(crmOpportunity.ownerPartyId, filters.ownerPartyId));
    if (filters.crmRecordId) conditions.push(eq(crmOpportunity.crmRecordId, filters.crmRecordId));
    if (filters.partyId) conditions.push(eq(crmOpportunity.partyId, filters.partyId));

    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(crmOpportunity.opportunityNumber, term),
          ilike(crmOpportunity.name, term),
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
          id: crmOpportunity.id,
          businessId: crmOpportunity.businessId,
          crmRecordId: crmOpportunity.crmRecordId,
          partyId: crmOpportunity.partyId,
          accountId: crmOpportunity.accountId,
          sourceLeadId: crmOpportunity.sourceLeadId,
          primaryContactPartyId: crmOpportunity.primaryContactPartyId,
          opportunityNumber: crmOpportunity.opportunityNumber,
          name: crmOpportunity.name,
          pipelineId: crmOpportunity.pipelineId,
          stageCode: crmOpportunity.stageCode,
          statusCode: crmOpportunity.statusCode,
          ownerPartyId: crmOpportunity.ownerPartyId,
          branchId: crmOpportunity.branchId,
          expectedCloseDate: crmOpportunity.expectedCloseDate,
          amount: crmOpportunity.amount,
          currencyCode: crmOpportunity.currencyCode,
          probability: crmOpportunity.probability,
          weightedAmount: crmOpportunity.weightedAmount,
          lossReasonCode: crmOpportunity.lossReasonCode,
          competitorCode: crmOpportunity.competitorCode,
          closeNotes: crmOpportunity.closeNotes,
          closedAt: crmOpportunity.closedAt,
          metadata: crmOpportunity.metadata,
          createdAt: crmOpportunity.createdAt,
          createdBy: crmOpportunity.createdBy,
          updatedAt: crmOpportunity.updatedAt,
          updatedBy: crmOpportunity.updatedBy,
          deletedAt: crmOpportunity.deletedAt,
          version: crmOpportunity.version,
          partyDisplayName: party.displayName,
          partyNumber: party.partyNumber,
          sourceLeadNumber: crmLead.leadNumber,
        })
        .from(crmOpportunity)
        .innerJoin(party, eq(crmOpportunity.partyId, party.id))
        .leftJoin(crmLead, eq(crmOpportunity.sourceLeadId, crmLead.id))
        .where(whereClause)
        .orderBy(desc(crmOpportunity.updatedAt))
        .limit(limit)
        .offset(offset),
      dbClient
        .select({ total: count() })
        .from(crmOpportunity)
        .innerJoin(party, eq(crmOpportunity.partyId, party.id))
        .where(whereClause),
    ]);

    return { items, total: Number(totalRow?.total ?? 0) };
  }

  async listLineItems(opportunityId: string, dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        id: crmOpportunityLineItem.id,
        productId: crmOpportunityLineItem.productId,
        productCode: product.productCode,
        productName: product.productName,
        quantity: crmOpportunityLineItem.quantity,
        unitPrice: crmOpportunityLineItem.unitPrice,
        lineAmount: crmOpportunityLineItem.lineAmount,
        notes: crmOpportunityLineItem.notes,
      })
      .from(crmOpportunityLineItem)
      .innerJoin(product, eq(crmOpportunityLineItem.productId, product.id))
      .where(eq(crmOpportunityLineItem.opportunityId, opportunityId))
      .orderBy(crmOpportunityLineItem.displayOrder);
  }

  async insertLineItem(
    opportunityId: string,
    values: {
      productId: string;
      quantity?: string;
      unitPrice?: string | null;
      lineAmount?: string | null;
      notes?: string | null;
      displayOrder?: number;
    },
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(crmOpportunityLineItem)
      .values({
        opportunityId,
        productId: values.productId,
        quantity: values.quantity ?? "1",
        unitPrice: values.unitPrice ?? null,
        lineAmount: values.lineAmount ?? null,
        notes: values.notes ?? null,
        displayOrder: values.displayOrder ?? 0,
      })
      .returning();
    return row!;
  }
}

export function createOpportunityRepository(): OpportunityRepository {
  return new OpportunityRepository();
}
