/**
 * Purpose:
 * Reusable Communication & Consent orchestration for Party profiles.
 *
 * Architecture:
 * Business Service → CommunicationPreferenceService → Repository → Database
 *
 * Implementation Package:
 * BP-002 / IP-012 – Party Communication & Consent Preferences
 */

import {
  COMMUNICATION_PREFERENCE_STATUS_CODES,
  DEFAULT_CONSENT_VERSION,
  PREFERRED_CONTACT_METHOD_LABELS,
  PREFERRED_CONTACT_METHODS,
  PREFERRED_CONTACT_TIME_LABELS,
  PREFERRED_CONTACT_TIMES,
  type PreferredContactMethod,
  type PreferredContactTime,
} from "@/core/communication-preference/constants";
import {
  createCommunicationPreferenceRepository,
  type CommunicationPreferenceRepository,
} from "@/core/communication-preference/repositories/communication-preference-repository";
import {
  validatePreferredContactMethod,
  validateQuietHours,
} from "@/core/communication-preference/rules";
import type {
  CommunicationPreferenceCatalogues,
  CommunicationPreferencePanelView,
  CommunicationPreferenceView,
  SaveCommunicationPreferencePayload,
} from "@/core/communication-preference/types";
import { createConsentSourceService } from "@/core/localization-regulatory/services/consent-source-service";
import type { partyCommunicationPreference } from "@/db/schema/party-communication-preference";

type PreferenceRow = typeof partyCommunicationPreference.$inferSelect;

type CatalogueInput = {
  languages: Array<{ code: string; name: string }>;
  timezones: Array<{ code: string; name: string }>;
  consentSources?: Array<{ code: string; label: string }>;
  countryCode?: string | null;
};

export class CommunicationPreferenceError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly field?: string
  ) {
    super(message);
    this.name = "CommunicationPreferenceError";
  }
}

export class CommunicationPreferenceService {
  constructor(
    private readonly repository: CommunicationPreferenceRepository = createCommunicationPreferenceRepository(),
    private readonly consentSourceService = createConsentSourceService()
  ) {}

  async buildCatalogues(
    input: CatalogueInput
  ): Promise<CommunicationPreferenceCatalogues> {
    const consentSources =
      input.consentSources && input.consentSources.length > 0
        ? input.consentSources
        : await this.consentSourceService.getCatalogue(input.countryCode);

    return {
      languages: input.languages,
      timezones: input.timezones,
      contactMethods: Object.values(PREFERRED_CONTACT_METHODS).map((code) => ({
        code,
        label: PREFERRED_CONTACT_METHOD_LABELS[code],
      })),
      contactTimes: Object.values(PREFERRED_CONTACT_TIMES).map((code) => ({
        code,
        label: PREFERRED_CONTACT_TIME_LABELS[code],
      })),
      consentSources,
    };
  }

  async getOrCreateActiveProfile(
    businessId: string,
    partyId: string,
    createdBy: string | null,
    catalogues: CatalogueInput
  ): Promise<CommunicationPreferencePanelView> {
    let row = await this.repository.findActiveByPartyId(businessId, partyId);

    if (!row) {
      row = await this.repository.insert({
        businessId,
        partyId,
        statusCode: COMMUNICATION_PREFERENCE_STATUS_CODES.ACTIVE,
        consentVersion: DEFAULT_CONSENT_VERSION,
        createdBy,
        updatedBy: createdBy,
      });
    }

    return {
      preference: this.toView(row, catalogues),
      catalogues: await this.buildCatalogues(catalogues),
    };
  }

  async saveActiveProfile(
    businessId: string,
    partyId: string,
    payload: SaveCommunicationPreferencePayload,
    updatedBy: string | null,
    catalogues: CatalogueInput
  ): Promise<{
    panel: CommunicationPreferencePanelView;
    consentChanged: boolean;
    before: PreferenceRow;
    after: PreferenceRow;
  }> {
    const existing = await this.repository.findActiveByPartyId(
      businessId,
      partyId
    );

    if (!existing) {
      throw new CommunicationPreferenceError(
        "NOT_FOUND",
        "Communication preference profile not found."
      );
    }

    if (
      payload.version !== undefined &&
      payload.version !== existing.version
    ) {
      throw new CommunicationPreferenceError(
        "CONFLICT",
        "Preferences were updated elsewhere. Refresh and try again."
      );
    }

    const merged = this.mergePayload(existing, payload);

    const quietHoursError = validateQuietHours(
      merged.quietHoursStart,
      merged.quietHoursEnd
    );
    if (quietHoursError) {
      throw new CommunicationPreferenceError(
        "INVALID_INPUT",
        quietHoursError,
        "quietHoursStart"
      );
    }

    const methodError = validatePreferredContactMethod(
      merged.preferredContactMethod as PreferredContactMethod | null,
      {
        emailEnabled: merged.emailEnabled,
        smsEnabled: merged.smsEnabled,
        whatsAppEnabled: merged.whatsAppEnabled,
        phoneEnabled: merged.phoneEnabled,
        pushNotificationEnabled: merged.pushNotificationEnabled,
        postalMailEnabled: merged.postalMailEnabled,
      }
    );
    if (methodError) {
      throw new CommunicationPreferenceError(
        "INVALID_INPUT",
        methodError,
        "preferredContactMethod"
      );
    }

    if (
      merged.preferredLanguageCode &&
      !catalogues.languages.some(
        (language) => language.code === merged.preferredLanguageCode
      )
    ) {
      throw new CommunicationPreferenceError(
        "INVALID_INPUT",
        "Select a valid preferred language.",
        "preferredLanguageCode"
      );
    }

    if (
      merged.preferredTimezoneCode &&
      !catalogues.timezones.some(
        (timezone) => timezone.code === merged.preferredTimezoneCode
      )
    ) {
      throw new CommunicationPreferenceError(
        "INVALID_INPUT",
        "Select a valid preferred time zone.",
        "preferredTimezoneCode"
      );
    }

    // Consent is event-driven — Party Workspace cannot change consent fields.
    const consentChanged = false;
    const consentDate = existing.consentDate;
    const consentSource = existing.consentSource;
    const consentVersion = existing.consentVersion;

    const updated = await this.repository.updateById(
      businessId,
      existing.id,
      {
        preferredLanguageCode: merged.preferredLanguageCode,
        preferredTimezoneCode: merged.preferredTimezoneCode,
        preferredContactMethod: merged.preferredContactMethod,
        preferredContactTime: merged.preferredContactTime,
        quietHoursStart: merged.quietHoursStart,
        quietHoursEnd: merged.quietHoursEnd,
        marketingConsent: existing.marketingConsent,
        transactionalConsent: existing.transactionalConsent,
        promotionalConsent: existing.promotionalConsent,
        emailEnabled: merged.emailEnabled,
        smsEnabled: merged.smsEnabled,
        whatsAppEnabled: merged.whatsAppEnabled,
        phoneEnabled: merged.phoneEnabled,
        pushNotificationEnabled: merged.pushNotificationEnabled,
        postalMailEnabled: merged.postalMailEnabled,
        consentDate,
        consentSource,
        consentVersion,
        notes: merged.notes,
        updatedBy,
      },
      existing.version
    );

    if (!updated) {
      throw new CommunicationPreferenceError(
        "CONFLICT",
        "Preferences were updated elsewhere. Refresh and try again."
      );
    }

    return {
      panel: {
        preference: this.toView(updated, catalogues),
        catalogues: await this.buildCatalogues(catalogues),
      },
      consentChanged,
      before: existing,
      after: updated,
    };
  }

  toAuditSnapshot(row: PreferenceRow): Record<string, unknown> {
    return {
      preferredLanguageCode: row.preferredLanguageCode,
      preferredTimezoneCode: row.preferredTimezoneCode,
      preferredContactMethod: row.preferredContactMethod,
      preferredContactTime: row.preferredContactTime,
      quietHoursStart: row.quietHoursStart,
      quietHoursEnd: row.quietHoursEnd,
      marketingConsent: row.marketingConsent,
      transactionalConsent: row.transactionalConsent,
      promotionalConsent: row.promotionalConsent,
      emailEnabled: row.emailEnabled,
      smsEnabled: row.smsEnabled,
      whatsAppEnabled: row.whatsAppEnabled,
      phoneEnabled: row.phoneEnabled,
      pushNotificationEnabled: row.pushNotificationEnabled,
      postalMailEnabled: row.postalMailEnabled,
      consentDate: row.consentDate?.toISOString() ?? null,
      consentSource: row.consentSource,
      consentVersion: row.consentVersion,
      notes: row.notes,
    };
  }

  private mergePayload(
    existing: PreferenceRow,
    payload: SaveCommunicationPreferencePayload
  ) {
    return {
      preferredLanguageCode:
        payload.preferredLanguageCode !== undefined
          ? payload.preferredLanguageCode
          : existing.preferredLanguageCode,
      preferredTimezoneCode:
        payload.preferredTimezoneCode !== undefined
          ? payload.preferredTimezoneCode
          : existing.preferredTimezoneCode,
      preferredContactMethod:
        payload.preferredContactMethod !== undefined
          ? payload.preferredContactMethod
          : existing.preferredContactMethod,
      preferredContactTime:
        payload.preferredContactTime !== undefined
          ? payload.preferredContactTime
          : existing.preferredContactTime,
      quietHoursStart:
        payload.quietHoursStart !== undefined
          ? payload.quietHoursStart
          : existing.quietHoursStart,
      quietHoursEnd:
        payload.quietHoursEnd !== undefined
          ? payload.quietHoursEnd
          : existing.quietHoursEnd,
      marketingConsent:
        payload.marketingConsent ?? existing.marketingConsent,
      transactionalConsent:
        payload.transactionalConsent ?? existing.transactionalConsent,
      promotionalConsent:
        payload.promotionalConsent ?? existing.promotionalConsent,
      emailEnabled: payload.emailEnabled ?? existing.emailEnabled,
      smsEnabled: payload.smsEnabled ?? existing.smsEnabled,
      whatsAppEnabled: payload.whatsAppEnabled ?? existing.whatsAppEnabled,
      phoneEnabled: payload.phoneEnabled ?? existing.phoneEnabled,
      pushNotificationEnabled:
        payload.pushNotificationEnabled ?? existing.pushNotificationEnabled,
      postalMailEnabled:
        payload.postalMailEnabled ?? existing.postalMailEnabled,
      notes: payload.notes !== undefined ? payload.notes : existing.notes,
    };
  }

  private toView(
    row: PreferenceRow,
    catalogues: CatalogueInput
  ): CommunicationPreferenceView {
    const language = catalogues.languages.find(
      (item) => item.code === row.preferredLanguageCode
    );
    const timezone = catalogues.timezones.find(
      (item) => item.code === row.preferredTimezoneCode
    );

    return {
      id: row.id,
      partyId: row.partyId,
      preferredLanguageCode: row.preferredLanguageCode,
      preferredLanguageName: language?.name ?? null,
      preferredTimezoneCode: row.preferredTimezoneCode,
      preferredTimezoneName: timezone?.name ?? null,
      preferredContactMethod:
        (row.preferredContactMethod as PreferredContactMethod | null) ?? null,
      preferredContactTime:
        (row.preferredContactTime as PreferredContactTime | null) ?? null,
      quietHoursStart: row.quietHoursStart,
      quietHoursEnd: row.quietHoursEnd,
      marketingConsent: row.marketingConsent,
      transactionalConsent: row.transactionalConsent,
      promotionalConsent: row.promotionalConsent,
      emailEnabled: row.emailEnabled,
      smsEnabled: row.smsEnabled,
      whatsAppEnabled: row.whatsAppEnabled,
      phoneEnabled: row.phoneEnabled,
      pushNotificationEnabled: row.pushNotificationEnabled,
      postalMailEnabled: row.postalMailEnabled,
      consentDate: row.consentDate?.toISOString() ?? null,
      consentSource:
        (row.consentSource as CommunicationPreferenceView["consentSource"]) ??
        null,
      consentVersion: row.consentVersion,
      notes: row.notes,
      statusCode: row.statusCode,
      version: row.version,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

export function createCommunicationPreferenceService(): CommunicationPreferenceService {
  return new CommunicationPreferenceService();
}
