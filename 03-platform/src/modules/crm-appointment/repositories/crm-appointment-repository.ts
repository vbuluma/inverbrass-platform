/**
 * Persist and read CRM Appointment rows.
 * BP-004 / IP-06
 */

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNull,
  lt,
  lte,
  or,
} from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { crmAppointment } from "@/db/schema/crm-appointment";
import { crmAppointmentParticipant } from "@/db/schema/crm-appointment-participant";
import {
  CRM_APPOINTMENT_LIST_VIEWS,
  CRM_APPOINTMENT_OPEN_STATUS_CODES,
  CRM_APPOINTMENT_STATUS_CODES,
  type CrmAppointmentListView,
} from "@/modules/crm-appointment/constants";

type DbClient = PostgresJsDatabase<typeof schema>;

export type CrmAppointmentInsertValues = {
  businessId: string;
  appointmentNumber: string;
  appointmentTypeCode: string;
  subject: string;
  description?: string | null;
  statusCode: string;
  startDateTime: Date;
  endDateTime: Date;
  location?: string | null;
  virtualMeetingUrl?: string | null;
  ownerUserId: string;
  primaryPartyId: string;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type CrmAppointmentUpdateValues = {
  subject?: string;
  description?: string | null;
  statusCode?: string;
  startDateTime?: Date;
  endDateTime?: Date;
  location?: string | null;
  virtualMeetingUrl?: string | null;
  ownerUserId?: string;
  linkedActivityId?: string | null;
  cancelReason?: string | null;
  noShowReason?: string | null;
  outcomeNotes?: string | null;
  meetingNotes?: string | null;
  decisions?: string | null;
  actionItemsSummary?: string | null;
  reminderSentAt?: Date | null;
  completedAt?: Date | null;
  cancelledAt?: Date | null;
  noShowAt?: Date | null;
  updatedBy?: string | null;
  version?: number;
};

export type CrmAppointmentListQueryFilters = {
  view?: CrmAppointmentListView | string;
  currentUserId?: string;
  appointmentTypeCode?: string;
  statusCode?: string;
  ownerUserId?: string;
  primaryPartyId?: string;
  startFrom?: Date;
  startTo?: Date;
  search?: string;
  upcomingOnly?: boolean;
};

export class CrmAppointmentRepository {
  async insert(values: CrmAppointmentInsertValues, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .insert(crmAppointment)
      .values({
        businessId: values.businessId,
        appointmentNumber: values.appointmentNumber,
        appointmentTypeCode: values.appointmentTypeCode,
        subject: values.subject,
        description: values.description ?? null,
        statusCode: values.statusCode,
        startDateTime: values.startDateTime,
        endDateTime: values.endDateTime,
        location: values.location ?? null,
        virtualMeetingUrl: values.virtualMeetingUrl ?? null,
        ownerUserId: values.ownerUserId,
        primaryPartyId: values.primaryPartyId,
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();

    return row;
  }

  async updateById(
    businessId: string,
    appointmentId: string,
    values: CrmAppointmentUpdateValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(crmAppointment)
      .set({ ...values, updatedAt: new Date() })
      .where(
        and(
          eq(crmAppointment.businessId, businessId),
          eq(crmAppointment.id, appointmentId),
          isNull(crmAppointment.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }

  async findById(
    businessId: string,
    appointmentId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(crmAppointment)
      .where(
        and(
          eq(crmAppointment.businessId, businessId),
          eq(crmAppointment.id, appointmentId),
          isNull(crmAppointment.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async getNextSequenceNumber(
    businessId: string,
    dbClient: DbClient = getDb()
  ): Promise<number> {
    const [result] = await dbClient
      .select({ total: count() })
      .from(crmAppointment)
      .where(eq(crmAppointment.businessId, businessId));

    return Number(result?.total ?? 0) + 1;
  }

  async listByFilters(
    businessId: string,
    filters: CrmAppointmentListQueryFilters = {},
    dbClient: DbClient = getDb()
  ) {
    const conditions = [
      eq(crmAppointment.businessId, businessId),
      isNull(crmAppointment.deletedAt),
    ];

    if (filters.appointmentTypeCode) {
      conditions.push(
        eq(crmAppointment.appointmentTypeCode, filters.appointmentTypeCode)
      );
    }

    if (filters.statusCode) {
      conditions.push(eq(crmAppointment.statusCode, filters.statusCode));
    } else if (filters.upcomingOnly) {
      conditions.push(
        inArray(crmAppointment.statusCode, [...CRM_APPOINTMENT_OPEN_STATUS_CODES])
      );
    }

    if (filters.ownerUserId) {
      conditions.push(eq(crmAppointment.ownerUserId, filters.ownerUserId));
    }

    if (filters.primaryPartyId) {
      conditions.push(eq(crmAppointment.primaryPartyId, filters.primaryPartyId));
    }

    if (filters.startFrom) {
      conditions.push(gte(crmAppointment.startDateTime, filters.startFrom));
    }

    if (filters.startTo) {
      conditions.push(lte(crmAppointment.startDateTime, filters.startTo));
    }

    if (filters.view === CRM_APPOINTMENT_LIST_VIEWS.MY && filters.currentUserId) {
      const participantAppointmentIds = dbClient
        .select({ appointmentId: crmAppointmentParticipant.appointmentId })
        .from(crmAppointmentParticipant)
        .where(
          and(
            eq(crmAppointmentParticipant.businessId, businessId),
            eq(crmAppointmentParticipant.userId, filters.currentUserId)
          )
        );

      conditions.push(
        or(
          eq(crmAppointment.ownerUserId, filters.currentUserId),
          inArray(crmAppointment.id, participantAppointmentIds)
        )!
      );
    }

    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(crmAppointment.subject, term),
          ilike(crmAppointment.appointmentNumber, term)
        )!
      );
    }

    return dbClient
      .select()
      .from(crmAppointment)
      .where(and(...conditions))
      .orderBy(asc(crmAppointment.startDateTime));
  }

  async countByStatus(
    businessId: string,
    statusCodes: string[],
    dbClient: DbClient = getDb()
  ): Promise<number> {
    const [result] = await dbClient
      .select({ total: count() })
      .from(crmAppointment)
      .where(
        and(
          eq(crmAppointment.businessId, businessId),
          isNull(crmAppointment.deletedAt),
          inArray(crmAppointment.statusCode, statusCodes)
        )
      );

    return Number(result?.total ?? 0);
  }

  async countOwnedByStatus(
    businessId: string,
    ownerUserId: string,
    statusCodes: string[],
    dbClient: DbClient = getDb()
  ): Promise<number> {
    const [result] = await dbClient
      .select({ total: count() })
      .from(crmAppointment)
      .where(
        and(
          eq(crmAppointment.businessId, businessId),
          eq(crmAppointment.ownerUserId, ownerUserId),
          isNull(crmAppointment.deletedAt),
          inArray(crmAppointment.statusCode, statusCodes)
        )
      );

    return Number(result?.total ?? 0);
  }

  async listRecent(
    businessId: string,
    limit: number,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(crmAppointment)
      .where(
        and(
          eq(crmAppointment.businessId, businessId),
          isNull(crmAppointment.deletedAt)
        )
      )
      .orderBy(desc(crmAppointment.startDateTime))
      .limit(limit);
  }

  async listUpcomingForParty(
    businessId: string,
    partyId: string,
    limit: number,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(crmAppointment)
      .where(
        and(
          eq(crmAppointment.businessId, businessId),
          eq(crmAppointment.primaryPartyId, partyId),
          eq(crmAppointment.statusCode, CRM_APPOINTMENT_STATUS_CODES.SCHEDULED),
          gte(crmAppointment.startDateTime, new Date()),
          isNull(crmAppointment.deletedAt)
        )
      )
      .orderBy(asc(crmAppointment.startDateTime))
      .limit(limit);
  }

  /**
   * Owner availability / conflict detection — overlapping open appointments.
   */
  async findOwnerConflicts(
    businessId: string,
    ownerUserId: string,
    startDateTime: Date,
    endDateTime: Date,
    excludeAppointmentId?: string,
    dbClient: DbClient = getDb()
  ) {
    const openStatuses = [
      CRM_APPOINTMENT_STATUS_CODES.SCHEDULED,
      CRM_APPOINTMENT_STATUS_CODES.HELD,
      CRM_APPOINTMENT_STATUS_CODES.RESCHEDULED,
    ];

    const rows = await dbClient
      .select()
      .from(crmAppointment)
      .where(
        and(
          eq(crmAppointment.businessId, businessId),
          eq(crmAppointment.ownerUserId, ownerUserId),
          isNull(crmAppointment.deletedAt),
          inArray(crmAppointment.statusCode, openStatuses),
          lt(crmAppointment.startDateTime, endDateTime),
          gt(crmAppointment.endDateTime, startDateTime)
        )
      );

    if (!excludeAppointmentId) return rows;
    return rows.filter((row) => row.id !== excludeAppointmentId);
  }
}

export function createCrmAppointmentRepository() {
  return new CrmAppointmentRepository();
}
