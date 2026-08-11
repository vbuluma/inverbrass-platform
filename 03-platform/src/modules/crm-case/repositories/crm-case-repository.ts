import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  or,
} from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { crmCase } from "@/db/schema/crm-case";
import {
  CRM_CASE_LIST_VIEWS,
  CRM_CASE_OPEN_STATUS_CODES,
  CRM_CASE_STATUS_CODES,
  type CrmCaseListView,
} from "@/modules/crm-case/constants";

type DbClient = PostgresJsDatabase<typeof schema>;

export type CrmCaseInsertValues = {
  businessId: string;
  caseNumber: string;
  caseTypeCode: string;
  categoryCode?: string | null;
  subcategoryCode?: string | null;
  subject: string;
  description: string;
  statusCode: string;
  priorityCode: string;
  severityCode: string;
  channelCode?: string | null;
  ownerUserId?: string | null;
  queueCode?: string | null;
  primaryPartyId: string;
  primaryContactPartyId?: string | null;
  linkedCommunicationId?: string | null;
  slaPolicyId?: string | null;
  escalationLevel?: number;
  openedAt?: Date;
  slaFirstResponseDueAt?: Date | null;
  slaResolutionDueAt?: Date | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export class CrmCaseRepository {
  async insert(values: CrmCaseInsertValues, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .insert(crmCase)
      .values({
        businessId: values.businessId,
        caseNumber: values.caseNumber,
        caseTypeCode: values.caseTypeCode,
        categoryCode: values.categoryCode ?? null,
        subcategoryCode: values.subcategoryCode ?? null,
        subject: values.subject,
        description: values.description,
        statusCode: values.statusCode,
        priorityCode: values.priorityCode,
        severityCode: values.severityCode,
        channelCode: values.channelCode ?? null,
        ownerUserId: values.ownerUserId ?? null,
        queueCode: values.queueCode ?? null,
        primaryPartyId: values.primaryPartyId,
        primaryContactPartyId: values.primaryContactPartyId ?? null,
        linkedCommunicationId: values.linkedCommunicationId ?? null,
        slaPolicyId: values.slaPolicyId ?? null,
        escalationLevel: values.escalationLevel ?? 0,
        openedAt: values.openedAt ?? new Date(),
        slaFirstResponseDueAt: values.slaFirstResponseDueAt ?? null,
        slaResolutionDueAt: values.slaResolutionDueAt ?? null,
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();
    return row;
  }

  async updateById(
    businessId: string,
    caseId: string,
    values: Record<string, unknown>,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(crmCase)
      .set({ ...values, updatedAt: new Date() })
      .where(
        and(
          eq(crmCase.businessId, businessId),
          eq(crmCase.id, caseId),
          isNull(crmCase.deletedAt)
        )
      )
      .returning();
    return row ?? null;
  }

  async findById(businessId: string, caseId: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select()
      .from(crmCase)
      .where(
        and(
          eq(crmCase.businessId, businessId),
          eq(crmCase.id, caseId),
          isNull(crmCase.deletedAt)
        )
      )
      .limit(1);
    return row ?? null;
  }

  async getNextSequenceNumber(businessId: string, dbClient: DbClient = getDb()) {
    const [result] = await dbClient
      .select({ total: count() })
      .from(crmCase)
      .where(eq(crmCase.businessId, businessId));
    return Number(result?.total ?? 0) + 1;
  }

  async listByFilters(
    businessId: string,
    filters: {
      view?: CrmCaseListView | string;
      currentUserId?: string;
      statusCode?: string;
      caseTypeCode?: string;
      priorityCode?: string;
      primaryPartyId?: string;
      search?: string;
    } = {},
    dbClient: DbClient = getDb()
  ) {
    const conditions = [eq(crmCase.businessId, businessId), isNull(crmCase.deletedAt)];

    if (filters.statusCode) {
      conditions.push(eq(crmCase.statusCode, filters.statusCode));
    }
    if (filters.caseTypeCode) {
      conditions.push(eq(crmCase.caseTypeCode, filters.caseTypeCode));
    }
    if (filters.priorityCode) {
      conditions.push(eq(crmCase.priorityCode, filters.priorityCode));
    }
    if (filters.primaryPartyId) {
      conditions.push(eq(crmCase.primaryPartyId, filters.primaryPartyId));
    }

    if (filters.view === CRM_CASE_LIST_VIEWS.MY && filters.currentUserId) {
      conditions.push(eq(crmCase.ownerUserId, filters.currentUserId));
    } else if (filters.view === CRM_CASE_LIST_VIEWS.QUEUE) {
      conditions.push(isNull(crmCase.ownerUserId));
      conditions.push(inArray(crmCase.statusCode, [...CRM_CASE_OPEN_STATUS_CODES]));
    } else if (filters.view === CRM_CASE_LIST_VIEWS.ESCALATED) {
      conditions.push(eq(crmCase.statusCode, CRM_CASE_STATUS_CODES.ESCALATED));
    } else if (filters.view === CRM_CASE_LIST_VIEWS.OVERDUE) {
      conditions.push(inArray(crmCase.statusCode, [...CRM_CASE_OPEN_STATUS_CODES]));
      conditions.push(isNull(crmCase.slaPausedAt));
      conditions.push(isNotNull(crmCase.slaResolutionDueAt));
      conditions.push(lt(crmCase.slaResolutionDueAt, new Date()));
    }

    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(crmCase.subject, term),
          ilike(crmCase.description, term),
          ilike(crmCase.caseNumber, term)
        )!
      );
    }

    return dbClient
      .select()
      .from(crmCase)
      .where(and(...conditions))
      .orderBy(desc(crmCase.openedAt));
  }

  async countByStatus(
    businessId: string,
    statusCodes: string[],
    dbClient: DbClient = getDb()
  ) {
    const [result] = await dbClient
      .select({ total: count() })
      .from(crmCase)
      .where(
        and(
          eq(crmCase.businessId, businessId),
          isNull(crmCase.deletedAt),
          inArray(crmCase.statusCode, statusCodes)
        )
      );
    return Number(result?.total ?? 0);
  }

  async countUnassigned(businessId: string, dbClient: DbClient = getDb()) {
    const [result] = await dbClient
      .select({ total: count() })
      .from(crmCase)
      .where(
        and(
          eq(crmCase.businessId, businessId),
          isNull(crmCase.deletedAt),
          isNull(crmCase.ownerUserId),
          inArray(crmCase.statusCode, [...CRM_CASE_OPEN_STATUS_CODES])
        )
      );
    return Number(result?.total ?? 0);
  }

  async countOverdue(businessId: string, dbClient: DbClient = getDb()) {
    const [result] = await dbClient
      .select({ total: count() })
      .from(crmCase)
      .where(
        and(
          eq(crmCase.businessId, businessId),
          isNull(crmCase.deletedAt),
          inArray(crmCase.statusCode, [...CRM_CASE_OPEN_STATUS_CODES]),
          isNull(crmCase.slaPausedAt),
          isNotNull(crmCase.slaResolutionDueAt),
          lt(crmCase.slaResolutionDueAt, new Date())
        )
      );
    return Number(result?.total ?? 0);
  }

  async listRecent(businessId: string, limit: number, dbClient: DbClient = getDb()) {
    return dbClient
      .select()
      .from(crmCase)
      .where(and(eq(crmCase.businessId, businessId), isNull(crmCase.deletedAt)))
      .orderBy(desc(crmCase.openedAt))
      .limit(limit);
  }

  async listOpenForParty(
    businessId: string,
    partyId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(crmCase)
      .where(
        and(
          eq(crmCase.businessId, businessId),
          eq(crmCase.primaryPartyId, partyId),
          isNull(crmCase.deletedAt),
          inArray(crmCase.statusCode, [...CRM_CASE_OPEN_STATUS_CODES])
        )
      )
      .orderBy(desc(crmCase.openedAt));
  }

  async listByTypeForParty(
    businessId: string,
    partyId: string,
    caseTypeCode: string,
    limit: number,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(crmCase)
      .where(
        and(
          eq(crmCase.businessId, businessId),
          eq(crmCase.primaryPartyId, partyId),
          eq(crmCase.caseTypeCode, caseTypeCode),
          isNull(crmCase.deletedAt)
        )
      )
      .orderBy(desc(crmCase.openedAt))
      .limit(limit);
  }

  async listRecentForParty(
    businessId: string,
    partyId: string,
    limit: number,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(crmCase)
      .where(
        and(
          eq(crmCase.businessId, businessId),
          eq(crmCase.primaryPartyId, partyId),
          isNull(crmCase.deletedAt)
        )
      )
      .orderBy(desc(crmCase.openedAt))
      .limit(limit);
  }

  async listOpenPastDue(businessId: string, dbClient: DbClient = getDb()) {
    return dbClient
      .select()
      .from(crmCase)
      .where(
        and(
          eq(crmCase.businessId, businessId),
          isNull(crmCase.deletedAt),
          inArray(crmCase.statusCode, [...CRM_CASE_OPEN_STATUS_CODES]),
          isNull(crmCase.slaPausedAt),
          isNotNull(crmCase.slaResolutionDueAt),
          lt(crmCase.slaResolutionDueAt, new Date()),
          isNull(crmCase.slaBreachedAt)
        )
      );
  }
}

export function createCrmCaseRepository() {
  return new CrmCaseRepository();
}
