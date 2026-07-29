/**
 * Purpose:
 * Party Communication & Consent Preferences — workspace orchestration.
 *
 * Architecture:
 * Server Actions → PartyCommunicationPreferenceService → CommunicationPreferenceService
 *
 * Implementation Package:
 * BP-002 / IP-012 – Party Communication & Consent Preferences
 */

import { eq } from "drizzle-orm";

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  AUDIT_ENTITY_NAMES,
  AUDIT_OPERATIONS,
  AUDIT_SOURCE_MODULES,
  createAuditService,
} from "@/core/audit";
import {
  CommunicationPreferenceError,
  createCommunicationPreferenceService,
  type SaveCommunicationPreferencePayload,
} from "@/core/communication-preference";
import { createConsentEngineService } from "@/core/consent/services/consent-engine-service";
import { createConsentSourceService } from "@/core/localization-regulatory/services/consent-source-service";
import { getDb } from "@/db/client";
import { business } from "@/db/schema/business";
import {
  buildTimelineEventFromContext,
  createPartyTimelineService,
  PARTY_TIMELINE_EVENT_CATEGORIES,
} from "@/core/party-timeline";
import { PartyError, PARTY_USER_MESSAGES } from "@/modules/party/errors";
import { createPartyReferenceRepository } from "@/modules/party/repositories/party-reference-repository";
import { createPartyRepository } from "@/modules/party/repositories/party-repository";
import { recordPartyEntityAudit } from "@/modules/party/services/party-audit-helper";
import type { PartyCommunicationPreferencesPanelView } from "@/modules/party/types";
import { savePartyCommunicationPreferenceSchema } from "@/modules/party/validators/party-communication-preference-validators";

export class PartyCommunicationPreferenceService {
  constructor(
    private readonly partyRepository = createPartyRepository(),
    private readonly referenceRepository = createPartyReferenceRepository(),
    private readonly preferenceService = createCommunicationPreferenceService(),
    private readonly consentEngine = createConsentEngineService(),
    private readonly consentSourceService = createConsentSourceService(),
    private readonly timelineService = createPartyTimelineService(),
    private readonly auditService = createAuditService()
  ) {}

  async getCommunicationPreferences(
    context: CurrentBusinessContext,
    partyId: string
  ): Promise<PartyCommunicationPreferencesPanelView> {
    await this.requireParty(context, partyId);
    const catalogues = await this.loadCatalogues(context.businessId);
    const panel = await this.preferenceService.getOrCreateActiveProfile(
      context.businessId,
      partyId,
      context.platformUserId,
      catalogues
    );
    const consentEvents = await this.consentEngine.listEventsForParty(
      context.businessId,
      partyId,
      catalogues.countryCode
    );

    return { ...panel, consentEvents };
  }

  async saveCommunicationPreferences(
    context: CurrentBusinessContext,
    partyId: string,
    payload: SaveCommunicationPreferencePayload
  ): Promise<PartyCommunicationPreferencesPanelView> {
    const parsed = savePartyCommunicationPreferenceSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new PartyError(
        "INVALID_INPUT",
        first?.message ?? PARTY_USER_MESSAGES.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    await this.requireParty(context, partyId);
    const catalogues = await this.loadCatalogues(context.businessId);

    try {
      const result = await this.preferenceService.saveActiveProfile(
        context.businessId,
        partyId,
        parsed.data as SaveCommunicationPreferencePayload,
        context.platformUserId,
        catalogues
      );

      const operation =
        result.before.version === 1 && !result.before.updatedBy
          ? AUDIT_OPERATIONS.CREATE
          : AUDIT_OPERATIONS.UPDATE;

      await recordPartyEntityAudit(this.auditService, context, {
        partyId,
        entityName: AUDIT_ENTITY_NAMES.PARTY_COMMUNICATION_PREFERENCE,
        entityId: result.after.id,
        operation,
        sourceModule: AUDIT_SOURCE_MODULES.PARTY_COMMUNICATION_PREFERENCES,
        before: this.preferenceService.toAuditSnapshot(result.before),
        after: this.preferenceService.toAuditSnapshot(result.after),
      });

      await this.timelineService.recordEvent(
        buildTimelineEventFromContext(context, {
          partyId,
          eventType: result.consentChanged
            ? "COMMUNICATION_CONSENT_UPDATED"
            : "COMMUNICATION_PREFERENCE_UPDATED",
          eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.COMMUNICATION,
          summary: result.consentChanged
            ? "Communication consent updated"
            : "Communication preferences updated",
          referenceEntity: AUDIT_ENTITY_NAMES.PARTY_COMMUNICATION_PREFERENCE,
          referenceId: result.after.id,
        })
      );

      return {
        ...result.panel,
        consentEvents: await this.consentEngine.listEventsForParty(
          context.businessId,
          partyId,
          catalogues.countryCode
        ),
      };
    } catch (error) {
      if (error instanceof CommunicationPreferenceError) {
        throw new PartyError(
          "INVALID_INPUT",
          error.message,
          error.code === "CONFLICT" ? 409 : 400,
          error.field
        );
      }
      throw error;
    }
  }

  private async requireParty(
    context: CurrentBusinessContext,
    partyId: string
  ) {
    const party = await this.partyRepository.findById(
      context.businessId,
      partyId
    );

    if (!party) {
      throw new PartyError(
        "PARTY_NOT_FOUND",
        "Party not found.",
        404
      );
    }

    return party;
  }

  private async loadCatalogues(businessId: string) {
    const db = getDb();
    const [businessRow] = await db
      .select({ countryCode: business.countryCode })
      .from(business)
      .where(eq(business.id, businessId))
      .limit(1);

    const countryCode = businessRow?.countryCode ?? null;
    const [languages, timezones, consentSources] = await Promise.all([
      this.referenceRepository.listActiveLanguages(),
      this.referenceRepository.listActiveTimezones(),
      this.consentSourceService.getCatalogue(countryCode),
    ]);

    return {
      languages,
      timezones,
      consentSources,
      countryCode,
    };
  }
}

export function createPartyCommunicationPreferenceService(): PartyCommunicationPreferenceService {
  return new PartyCommunicationPreferenceService();
}
