/**
 * Purpose:
 * Persist and read party_communication_preference rows (persistence only).
 *
 * Architecture:
 * CommunicationPreferenceService → CommunicationPreferenceRepository → Drizzle
 *
 * Implementation Package:
 * BP-002 / IP-012 – Party Communication & Consent Preferences
 */

import { and, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { partyCommunicationPreference } from "@/db/schema/party-communication-preference";
import {
  COMMUNICATION_PREFERENCE_STATUS_CODES,
  type CommunicationPreferenceStatusCode,
} from "@/core/communication-preference/constants";

type DbClient = PostgresJsDatabase<typeof schema>;

export type CommunicationPreferenceInsertValues = {
  businessId: string;
  partyId: string;
  preferredLanguageCode?: string | null;
  preferredTimezoneCode?: string | null;
  preferredContactMethod?: string | null;
  preferredContactTime?: string | null;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  marketingConsent?: boolean;
  transactionalConsent?: boolean;
  promotionalConsent?: boolean;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  whatsAppEnabled?: boolean;
  phoneEnabled?: boolean;
  pushNotificationEnabled?: boolean;
  postalMailEnabled?: boolean;
  consentDate?: Date | null;
  consentSource?: string | null;
  consentVersion?: string | null;
  notes?: string | null;
  statusCode: CommunicationPreferenceStatusCode;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type CommunicationPreferenceUpdateValues = {
  preferredLanguageCode?: string | null;
  preferredTimezoneCode?: string | null;
  preferredContactMethod?: string | null;
  preferredContactTime?: string | null;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  marketingConsent?: boolean;
  transactionalConsent?: boolean;
  promotionalConsent?: boolean;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  whatsAppEnabled?: boolean;
  phoneEnabled?: boolean;
  pushNotificationEnabled?: boolean;
  postalMailEnabled?: boolean;
  consentDate?: Date | null;
  consentSource?: string | null;
  consentVersion?: string | null;
  notes?: string | null;
  statusCode?: CommunicationPreferenceStatusCode;
  updatedBy?: string | null;
  version?: number;
};

export class CommunicationPreferenceRepository {
  async findActiveByPartyId(
    businessId: string,
    partyId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(partyCommunicationPreference)
      .where(
        and(
          eq(partyCommunicationPreference.businessId, businessId),
          eq(partyCommunicationPreference.partyId, partyId),
          eq(
            partyCommunicationPreference.statusCode,
            COMMUNICATION_PREFERENCE_STATUS_CODES.ACTIVE
          ),
          isNull(partyCommunicationPreference.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async insert(
    values: CommunicationPreferenceInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(partyCommunicationPreference)
      .values({
        businessId: values.businessId,
        partyId: values.partyId,
        preferredLanguageCode: values.preferredLanguageCode ?? null,
        preferredTimezoneCode: values.preferredTimezoneCode ?? null,
        preferredContactMethod: values.preferredContactMethod ?? null,
        preferredContactTime: values.preferredContactTime ?? null,
        quietHoursStart: values.quietHoursStart ?? null,
        quietHoursEnd: values.quietHoursEnd ?? null,
        marketingConsent: values.marketingConsent ?? false,
        transactionalConsent: values.transactionalConsent ?? true,
        promotionalConsent: values.promotionalConsent ?? false,
        emailEnabled: values.emailEnabled ?? true,
        smsEnabled: values.smsEnabled ?? true,
        whatsAppEnabled: values.whatsAppEnabled ?? false,
        phoneEnabled: values.phoneEnabled ?? true,
        pushNotificationEnabled: values.pushNotificationEnabled ?? false,
        postalMailEnabled: values.postalMailEnabled ?? false,
        consentDate: values.consentDate ?? null,
        consentSource: values.consentSource ?? null,
        consentVersion: values.consentVersion ?? null,
        notes: values.notes ?? null,
        statusCode: values.statusCode,
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();

    return row;
  }

  async updateById(
    businessId: string,
    preferenceId: string,
    values: CommunicationPreferenceUpdateValues,
    expectedVersion: number,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(partyCommunicationPreference)
      .set({
        ...values,
        updatedAt: new Date(),
        version: expectedVersion + 1,
      })
      .where(
        and(
          eq(partyCommunicationPreference.id, preferenceId),
          eq(partyCommunicationPreference.businessId, businessId),
          eq(partyCommunicationPreference.version, expectedVersion),
          isNull(partyCommunicationPreference.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }
}

export function createCommunicationPreferenceRepository(): CommunicationPreferenceRepository {
  return new CommunicationPreferenceRepository();
}
