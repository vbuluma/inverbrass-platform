/**
 * Event-driven Consent Engine (UX-001.2).
 *
 * Receives consent events from channels and updates Party Communication Preferences.
 * Party Workspace displays consent — it never determines consent source.
 */

import { and, desc, eq } from "drizzle-orm";

import { DEFAULT_CONSENT_VERSION } from "@/core/communication-preference/constants";
import {
  createCommunicationPreferenceRepository,
  type CommunicationPreferenceRepository,
} from "@/core/communication-preference/repositories/communication-preference-repository";
import { createConsentSourceService } from "@/core/localization-regulatory/services/consent-source-service";
import { getDb } from "@/db/client";
import { partyConsentEvent } from "@/db/schema/party-consent-event";

export const CONSENT_TYPE_CODES = {
  MARKETING: "MARKETING",
  TRANSACTIONAL: "TRANSACTIONAL",
  PROMOTIONAL: "PROMOTIONAL",
} as const;

export type ConsentTypeCode =
  (typeof CONSENT_TYPE_CODES)[keyof typeof CONSENT_TYPE_CODES];

export const CONSENT_EVENT_STATUS_CODES = {
  GRANTED: "GRANTED",
  REVOKED: "REVOKED",
  PENDING: "PENDING",
} as const;

export type ConsentEventStatusCode =
  (typeof CONSENT_EVENT_STATUS_CODES)[keyof typeof CONSENT_EVENT_STATUS_CODES];

export type CaptureConsentEventPayload = {
  businessId: string;
  partyId: string;
  consentTypeCode: ConsentTypeCode;
  statusCode: ConsentEventStatusCode;
  consentSourceCode: string;
  consentDate?: Date;
  capturedBy?: string | null;
  evidence?: string | null;
  ipAddress?: string | null;
  browser?: string | null;
  device?: string | null;
  referenceId?: string | null;
  notes?: string | null;
  countryCode?: string | null;
};

export type ConsentEventView = {
  id: string;
  consentTypeCode: string;
  statusCode: string;
  consentDate: string;
  consentSourceCode: string;
  consentSourceLabel: string;
  capturedBy: string | null;
  evidence: string | null;
  referenceId: string | null;
  notes: string | null;
};

export class ConsentEngineError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "ConsentEngineError";
  }
}

export class ConsentEngineService {
  constructor(
    private readonly preferenceRepository: CommunicationPreferenceRepository = createCommunicationPreferenceRepository(),
    private readonly consentSourceService = createConsentSourceService()
  ) {}

  async captureEvent(
    payload: CaptureConsentEventPayload
  ): Promise<{ eventId: string }> {
    const isValid = await this.consentSourceService.isValidSource(
      payload.consentSourceCode,
      payload.countryCode
    );
    if (!isValid) {
      throw new ConsentEngineError(
        "INVALID_CONSENT_SOURCE",
        "The consent source is not configured for this jurisdiction."
      );
    }

    const db = getDb();
    const consentDate = payload.consentDate ?? new Date();
    const granted = payload.statusCode === CONSENT_EVENT_STATUS_CODES.GRANTED;

    const [event] = await db
      .insert(partyConsentEvent)
      .values({
        businessId: payload.businessId,
        partyId: payload.partyId,
        consentTypeCode: payload.consentTypeCode,
        statusCode: payload.statusCode,
        consentDate,
        consentSourceCode: payload.consentSourceCode,
        capturedBy: payload.capturedBy ?? null,
        evidence: payload.evidence ?? null,
        ipAddress: payload.ipAddress ?? null,
        browser: payload.browser ?? null,
        device: payload.device ?? null,
        referenceId: payload.referenceId ?? null,
        notes: payload.notes ?? null,
      })
      .returning({ id: partyConsentEvent.id });

    const preference = await this.preferenceRepository.findActiveByPartyId(
      payload.businessId,
      payload.partyId
    );

    if (preference) {
      const patch: Record<string, boolean | Date | string | null> = {
        consentDate,
        consentSource: payload.consentSourceCode,
        consentVersion: DEFAULT_CONSENT_VERSION,
        updatedAt: new Date(),
      };

      if (payload.consentTypeCode === CONSENT_TYPE_CODES.MARKETING) {
        patch.marketingConsent = granted;
      }
      if (payload.consentTypeCode === CONSENT_TYPE_CODES.PROMOTIONAL) {
        patch.promotionalConsent = granted;
      }
      if (payload.consentTypeCode === CONSENT_TYPE_CODES.TRANSACTIONAL) {
        patch.transactionalConsent = granted;
      }

      await this.preferenceRepository.updateById(
        payload.businessId,
        preference.id,
        patch,
        preference.version
      );
    }

    return { eventId: event.id };
  }

  async listEventsForParty(
    businessId: string,
    partyId: string,
    countryCode?: string | null
  ): Promise<ConsentEventView[]> {
    const db = getDb();
    const catalogue = await this.consentSourceService.getCatalogue(countryCode);
    const labelByCode = new Map(catalogue.map((entry) => [entry.code, entry.label]));

    const events = await db
      .select()
      .from(partyConsentEvent)
      .where(
        and(
          eq(partyConsentEvent.businessId, businessId),
          eq(partyConsentEvent.partyId, partyId)
        )
      )
      .orderBy(desc(partyConsentEvent.consentDate));

    return events.map((row) => ({
      id: row.id,
      consentTypeCode: row.consentTypeCode,
      statusCode: row.statusCode,
      consentDate: row.consentDate.toISOString(),
      consentSourceCode: row.consentSourceCode,
      consentSourceLabel:
        labelByCode.get(row.consentSourceCode) ?? row.consentSourceCode,
      capturedBy: row.capturedBy,
      evidence: row.evidence,
      referenceId: row.referenceId,
      notes: row.notes,
    }));
  }
}

export function createConsentEngineService(): ConsentEngineService {
  return new ConsentEngineService();
}
