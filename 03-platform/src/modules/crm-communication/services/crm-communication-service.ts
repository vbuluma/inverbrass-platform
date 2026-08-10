/**
 * CRM Communication orchestration — BP-004 / IP-08
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import { createAuditService } from "@/core/audit";
import { createCommunicationPreferenceRepository } from "@/core/communication-preference/repositories/communication-preference-repository";
import {
  buildTimelineEventFromContext,
  createPartyTimelineService,
  PARTY_TIMELINE_EVENT_CATEGORIES,
  PARTY_TIMELINE_EVENT_TYPES,
  PARTY_TIMELINE_SOURCE_MODULES,
} from "@/core/party-timeline";
import { getDb } from "@/db/client";
import {
  CRM_ACTIVITY_RECORD_SOURCE_CODES,
  CRM_ACTIVITY_TYPE_CODES,
} from "@/modules/crm-activity/constants";
import { createCrmActivityService } from "@/modules/crm-activity/services/crm-activity-service";
import {
  CRM_COMMUNICATION_CHANNEL_LABELS,
  CRM_COMMUNICATION_CONSENT_RESULTS,
  CRM_COMMUNICATION_DIRECTION_CODES,
  CRM_COMMUNICATION_DIRECTION_LABELS,
  CRM_COMMUNICATION_ENTITY_TYPE_CODES,
  CRM_COMMUNICATION_STATUS_CODES,
  type CrmCommunicationChannelCode,
  type CrmCommunicationDirectionCode,
} from "@/modules/crm-communication/constants";
import {
  CRM_COMMUNICATION_USER_MESSAGES,
  CrmCommunicationError,
} from "@/modules/crm-communication/errors";
import { createCrmCommunicationCatalogueRepository } from "@/modules/crm-communication/repositories/crm-communication-catalogue-repository";
import { createCrmCommunicationEntityLinkRepository } from "@/modules/crm-communication/repositories/crm-communication-entity-link-repository";
import { createCrmCommunicationReferenceRepository } from "@/modules/crm-communication/repositories/crm-communication-reference-repository";
import { createCrmCommunicationRepository } from "@/modules/crm-communication/repositories/crm-communication-repository";
import {
  AUDIT_OPERATIONS,
  recordCrmCommunicationAudit,
} from "@/modules/crm-communication/services/crm-communication-audit-helper";
import {
  buildCommunicationNumber,
  mapChannelToPreferenceField,
  requiresOutboundContactValue,
  resolveConsentResult,
} from "@/modules/crm-communication/services/crm-communication-rules";
import type {
  CreateCrmCommunicationAddendumPayload,
  CreateCrmCommunicationPayload,
  CrmCommunicationCustomer360Contribution,
  CrmCommunicationDashboardView,
  CrmCommunicationDetailView,
  CrmCommunicationListFilters,
  CrmCommunicationRegistrationCatalogues,
  CrmCommunicationSummaryView,
} from "@/modules/crm-communication/types";
import {
  createCrmCommunicationAddendumSchema,
  createCrmCommunicationSchema,
  crmCommunicationListFiltersSchema,
} from "@/modules/crm-communication/validators/crm-communication-validators";
import { createPartyRepository } from "@/modules/party/repositories/party-repository";

type CommunicationRow = NonNullable<
  Awaited<
    ReturnType<ReturnType<typeof createCrmCommunicationRepository>["findById"]>
  >
>;

export class CrmCommunicationService {
  constructor(
    private readonly communicationRepository = createCrmCommunicationRepository(),
    private readonly entityLinkRepository = createCrmCommunicationEntityLinkRepository(),
    private readonly catalogueRepository = createCrmCommunicationCatalogueRepository(),
    private readonly referenceRepository = createCrmCommunicationReferenceRepository(),
    private readonly preferenceRepository = createCommunicationPreferenceRepository(),
    private readonly partyRepository = createPartyRepository(),
    private readonly activityService = createCrmActivityService(),
    private readonly timelineService = createPartyTimelineService(),
    private readonly auditService = createAuditService()
  ) {}

  async getRegistrationCatalogues(
    context: CurrentBusinessContext
  ): Promise<CrmCommunicationRegistrationCatalogues> {
    await this.catalogueRepository.ensureDefaults();
    const [owners, channels] = await Promise.all([
      this.referenceRepository.listActiveOwners(context.businessId),
      this.catalogueRepository.listActiveChannels(),
    ]);
    return {
      channels,
      owners: owners.map((row) => ({
        id: row.id,
        displayName:
          row.displayName?.trim() || `${row.firstName} ${row.lastName}`.trim(),
      })),
    };
  }

  async getDashboard(
    context: CurrentBusinessContext
  ): Promise<CrmCommunicationDashboardView> {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [
      totalLast30Days,
      outboundLast30Days,
      inboundLast30Days,
      consentBlockedLast30Days,
      recentRows,
    ] = await Promise.all([
      this.communicationRepository.countSince(context.businessId, since),
      this.communicationRepository.countSince(context.businessId, since, {
        directionCode: CRM_COMMUNICATION_DIRECTION_CODES.OUTBOUND,
      }),
      this.communicationRepository.countSince(context.businessId, since, {
        directionCode: CRM_COMMUNICATION_DIRECTION_CODES.INBOUND,
      }),
      this.communicationRepository.countSince(context.businessId, since, {
        statusCode: CRM_COMMUNICATION_STATUS_CODES.BLOCKED_CONSENT,
      }),
      this.communicationRepository.listRecent(context.businessId, 10),
    ]);

    return {
      totalLast30Days,
      outboundLast30Days,
      inboundLast30Days,
      consentBlockedLast30Days,
      recentCommunications: await Promise.all(
        recentRows.map((row) => this.toSummaryView(context, row))
      ),
    };
  }

  async listCommunications(
    context: CurrentBusinessContext,
    filters: CrmCommunicationListFilters = {}
  ): Promise<CrmCommunicationSummaryView[]> {
    const parsed = crmCommunicationListFiltersSchema.safeParse(filters);
    if (!parsed.success) {
      throw new CrmCommunicationError(
        "INVALID_INPUT",
        CRM_COMMUNICATION_USER_MESSAGES.INVALID_INPUT
      );
    }
    const rows = await this.communicationRepository.listByFilters(
      context.businessId,
      {
        ...parsed.data,
        currentUserId: context.platformUserId,
        from: parsed.data.from ? new Date(parsed.data.from) : undefined,
        to: parsed.data.to ? new Date(parsed.data.to) : undefined,
      }
    );
    return Promise.all(rows.map((row) => this.toSummaryView(context, row)));
  }

  async getCommunication(
    context: CurrentBusinessContext,
    communicationId: string
  ): Promise<CrmCommunicationDetailView> {
    const row = await this.communicationRepository.findById(
      context.businessId,
      communicationId
    );
    if (!row) {
      throw new CrmCommunicationError(
        "NOT_FOUND",
        CRM_COMMUNICATION_USER_MESSAGES.NOT_FOUND,
        404
      );
    }
    return this.toDetailView(context, row);
  }

  async logCommunication(
    context: CurrentBusinessContext,
    payload: CreateCrmCommunicationPayload
  ): Promise<CrmCommunicationDetailView> {
    const parsed = createCrmCommunicationSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new CrmCommunicationError(
        "INVALID_INPUT",
        first?.message ?? CRM_COMMUNICATION_USER_MESSAGES.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    await this.catalogueRepository.ensureDefaults();
    const channel = await this.catalogueRepository.findChannelByCode(
      parsed.data.channelTypeCode
    );
    if (!channel) {
      throw new CrmCommunicationError(
        "INVALID_CATALOGUE_CODE",
        CRM_COMMUNICATION_USER_MESSAGES.INVALID_CATALOGUE_CODE,
        400,
        "channelTypeCode"
      );
    }

    if (
      requiresOutboundContactValue(
        parsed.data.directionCode,
        parsed.data.channelTypeCode
      ) &&
      !parsed.data.contactChannelValue?.trim()
    ) {
      throw new CrmCommunicationError(
        "CONTACT_CHANNEL_REQUIRED",
        CRM_COMMUNICATION_USER_MESSAGES.CONTACT_CHANNEL_REQUIRED,
        400,
        "contactChannelValue"
      );
    }

    const ownerAssignable = await this.referenceRepository.isOwnerAssignable(
      context.businessId,
      parsed.data.ownerUserId
    );
    if (!ownerAssignable) {
      throw new CrmCommunicationError(
        "INACTIVE_OWNER",
        CRM_COMMUNICATION_USER_MESSAGES.INACTIVE_OWNER,
        400,
        "ownerUserId"
      );
    }

    const party = await this.partyRepository.findByIdIncludingArchived(
      context.businessId,
      parsed.data.primaryPartyId
    );
    if (!party) {
      throw new CrmCommunicationError(
        "PARTY_REQUIRED",
        CRM_COMMUNICATION_USER_MESSAGES.PARTY_REQUIRED,
        400,
        "primaryPartyId"
      );
    }

    const preference = await this.preferenceRepository.findActiveByPartyId(
      context.businessId,
      parsed.data.primaryPartyId
    );
    const preferenceField = mapChannelToPreferenceField(
      parsed.data.channelTypeCode
    );
    const channelEnabled =
      preference && preferenceField
        ? Boolean(preference[preferenceField])
        : preference
          ? true
          : null;

    const consentCheckResult = resolveConsentResult({
      directionCode: parsed.data.directionCode,
      requiresConsentOutbound: channel.requiresConsentOutbound,
      channelEnabled,
      allowOverride: parsed.data.allowConsentOverride,
    });

    if (consentCheckResult === CRM_COMMUNICATION_CONSENT_RESULTS.BLOCKED) {
      // Still persist a blocked attempt for audit/analytics, then surface error
      const blocked = await this.persistCommunication(context, {
        ...parsed.data,
        statusCode: CRM_COMMUNICATION_STATUS_CODES.BLOCKED_CONSENT,
        consentCheckResult,
      });

      await this.timelineService.recordEvent(
        buildTimelineEventFromContext(context, {
          partyId: parsed.data.primaryPartyId,
          eventType: PARTY_TIMELINE_EVENT_TYPES.COMMUNICATION_BLOCKED,
          eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.COMMUNICATION,
          sourceModule: PARTY_TIMELINE_SOURCE_MODULES.CRM_COMMUNICATION,
          summary: `Outbound ${channel.name} blocked by consent`,
          referenceEntity: "crm_communication",
          referenceId: blocked.id,
        })
      );

      throw new CrmCommunicationError(
        "CONSENT_BLOCKED",
        CRM_COMMUNICATION_USER_MESSAGES.CONSENT_BLOCKED,
        403,
        "channelTypeCode"
      );
    }

    const created = await this.persistCommunication(context, {
      ...parsed.data,
      statusCode: CRM_COMMUNICATION_STATUS_CODES.LOGGED,
      consentCheckResult,
    });

    const eventType =
      parsed.data.directionCode === CRM_COMMUNICATION_DIRECTION_CODES.OUTBOUND
        ? PARTY_TIMELINE_EVENT_TYPES.COMMUNICATION_SENT
        : PARTY_TIMELINE_EVENT_TYPES.COMMUNICATION_RECEIVED;

    await this.timelineService.recordEvent(
      buildTimelineEventFromContext(context, {
        partyId: parsed.data.primaryPartyId,
        eventType,
        eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.COMMUNICATION,
        sourceModule: PARTY_TIMELINE_SOURCE_MODULES.CRM_COMMUNICATION,
        summary: `${channel.name} ${parsed.data.directionCode.toLowerCase()}: ${
          parsed.data.subject || parsed.data.summary.slice(0, 80)
        }`,
        referenceEntity: "crm_communication",
        referenceId: created.id,
      })
    );

    if (parsed.data.createFollowUpTask) {
      const activity = await this.activityService.createActivity(context, {
        activityTypeCode:
          parsed.data.channelTypeCode === "EMAIL"
            ? CRM_ACTIVITY_TYPE_CODES.EMAIL
            : parsed.data.channelTypeCode === "PHONE"
              ? CRM_ACTIVITY_TYPE_CODES.CALL
              : CRM_ACTIVITY_TYPE_CODES.FOLLOW_UP,
        subject: `Follow up: ${parsed.data.subject || channel.name}`,
        description: parsed.data.summary,
        ownerUserId: parsed.data.ownerUserId,
        primaryPartyId: parsed.data.primaryPartyId,
        recordSourceCode: CRM_ACTIVITY_RECORD_SOURCE_CODES.MANUAL,
        sourceReferenceType: "COMMUNICATION",
        sourceReferenceId: created.id,
      });
      await this.communicationRepository.updateById(context.businessId, created.id, {
        linkedActivityId: activity.id,
        updatedBy: context.platformUserId,
      });
    }

    return this.getCommunication(context, created.id);
  }

  async createAddendum(
    context: CurrentBusinessContext,
    communicationId: string,
    payload: CreateCrmCommunicationAddendumPayload
  ): Promise<CrmCommunicationDetailView> {
    const parsed = createCrmCommunicationAddendumSchema.safeParse(payload);
    if (!parsed.success) {
      throw new CrmCommunicationError(
        "INVALID_INPUT",
        CRM_COMMUNICATION_USER_MESSAGES.INVALID_INPUT
      );
    }

    const existing = await this.communicationRepository.findById(
      context.businessId,
      communicationId
    );
    if (!existing) {
      throw new CrmCommunicationError(
        "NOT_FOUND",
        CRM_COMMUNICATION_USER_MESSAGES.NOT_FOUND,
        404
      );
    }

    const addendum = await this.persistCommunication(context, {
      channelTypeCode: existing.channelTypeCode,
      directionCode: existing.directionCode,
      subject: parsed.data.subject ?? `Addendum to ${existing.communicationNumber}`,
      summary: parsed.data.summary,
      communicatedAt: new Date().toISOString(),
      ownerUserId: context.platformUserId,
      primaryPartyId: existing.primaryPartyId,
      threadId: existing.threadId ?? existing.id,
      contactChannelValue: existing.contactChannelValue,
      isSensitive: existing.isSensitive,
      statusCode: CRM_COMMUNICATION_STATUS_CODES.LOGGED,
      consentCheckResult: CRM_COMMUNICATION_CONSENT_RESULTS.NOT_REQUIRED,
      addendumToId: existing.id,
    });

    return this.getCommunication(context, addendum.id);
  }

  async getCustomer360Contribution(
    context: CurrentBusinessContext,
    partyId: string
  ): Promise<CrmCommunicationCustomer360Contribution> {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const rows = await this.communicationRepository.listRecentForParty(
      context.businessId,
      partyId,
      since,
      20
    );
    const recentCommunications = await Promise.all(
      rows.map((row) => this.toSummaryView(context, row))
    );
    const latest = recentCommunications[0] ?? null;

    return {
      lastInteractionChannel: latest?.channelTypeLabel ?? null,
      lastInteractionAt: latest?.communicatedAt ?? null,
      recentCommunicationCount: recentCommunications.length,
      recentCommunications: recentCommunications.slice(0, 5),
    };
  }

  private async persistCommunication(
    context: CurrentBusinessContext,
    data: {
      channelTypeCode: string;
      directionCode: string;
      subject?: string | null;
      summary: string;
      communicatedAt?: string;
      durationSeconds?: number | null;
      templateCode?: string | null;
      threadId?: string | null;
      primaryPartyId: string;
      contactChannelValue?: string | null;
      ownerUserId: string;
      isSensitive?: boolean;
      linkedVisitId?: string | null;
      statusCode: string;
      consentCheckResult: string;
      addendumToId?: string | null;
    }
  ) {
    const db = getDb();
    const sequence = await this.communicationRepository.getNextSequenceNumber(
      context.businessId,
      db
    );

    return db.transaction(async (tx) => {
      const row = await this.communicationRepository.insert(
        {
          businessId: context.businessId,
          communicationNumber: buildCommunicationNumber(sequence),
          channelTypeCode: data.channelTypeCode,
          directionCode: data.directionCode,
          subject: data.subject ?? null,
          summary: data.summary,
          communicatedAt: data.communicatedAt
            ? new Date(data.communicatedAt)
            : new Date(),
          durationSeconds: data.durationSeconds ?? null,
          statusCode: data.statusCode,
          consentCheckResult: data.consentCheckResult,
          templateCode: data.templateCode ?? null,
          threadId: data.threadId ?? null,
          primaryPartyId: data.primaryPartyId,
          contactChannelValue: data.contactChannelValue ?? null,
          ownerUserId: data.ownerUserId,
          isSensitive: data.isSensitive ?? false,
          addendumToId: data.addendumToId ?? null,
          linkedVisitId: data.linkedVisitId ?? null,
          createdBy: context.platformUserId,
          updatedBy: context.platformUserId,
        },
        tx
      );

      // Self-thread when no thread provided
      if (!data.threadId) {
        await this.communicationRepository.updateById(
          context.businessId,
          row.id,
          { threadId: row.id },
          tx
        );
        row.threadId = row.id;
      }

      await this.entityLinkRepository.insertMany(
        [
          {
            businessId: context.businessId,
            communicationId: row.id,
            entityTypeCode: CRM_COMMUNICATION_ENTITY_TYPE_CODES.PARTY,
            entityId: data.primaryPartyId,
            isPrimary: true,
            createdBy: context.platformUserId,
          },
        ],
        tx
      );

      await recordCrmCommunicationAudit(this.auditService, context, {
        communicationId: row.id,
        operation: AUDIT_OPERATIONS.CREATE,
        createValues: {
          communicationNumber: row.communicationNumber,
          channelTypeCode: row.channelTypeCode,
          directionCode: row.directionCode,
          statusCode: row.statusCode,
        },
      });

      return row;
    });
  }

  private async toSummaryView(
    context: CurrentBusinessContext,
    row: CommunicationRow
  ): Promise<CrmCommunicationSummaryView> {
    const [ownerDisplayName, party] = await Promise.all([
      this.referenceRepository.getOwnerDisplayName(row.ownerUserId),
      this.partyRepository.findByIdIncludingArchived(
        context.businessId,
        row.primaryPartyId
      ),
    ]);
    const channelCode = row.channelTypeCode as CrmCommunicationChannelCode;
    const directionCode = row.directionCode as CrmCommunicationDirectionCode;

    return {
      id: row.id,
      communicationNumber: row.communicationNumber,
      channelTypeCode: row.channelTypeCode,
      channelTypeLabel:
        CRM_COMMUNICATION_CHANNEL_LABELS[channelCode] ?? row.channelTypeCode,
      directionCode: row.directionCode,
      directionLabel:
        CRM_COMMUNICATION_DIRECTION_LABELS[directionCode] ?? row.directionCode,
      subject: row.subject,
      summary: row.summary,
      communicatedAt: row.communicatedAt.toISOString(),
      statusCode: row.statusCode,
      consentCheckResult: row.consentCheckResult,
      primaryPartyId: row.primaryPartyId,
      primaryPartyDisplayName: party?.displayName ?? "Unknown Party",
      ownerUserId: row.ownerUserId,
      ownerDisplayName: ownerDisplayName ?? "Unknown",
      threadId: row.threadId,
      isSensitive: row.isSensitive,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async toDetailView(
    context: CurrentBusinessContext,
    row: CommunicationRow
  ): Promise<CrmCommunicationDetailView> {
    const summary = await this.toSummaryView(context, row);
    const threadRows = row.threadId
      ? await this.communicationRepository.listByThread(
          context.businessId,
          row.threadId
        )
      : [];

    return {
      ...summary,
      durationSeconds: row.durationSeconds,
      templateCode: row.templateCode,
      contactChannelValue: row.contactChannelValue,
      linkedActivityId: row.linkedActivityId,
      linkedVisitId: row.linkedVisitId,
      addendumToId: row.addendumToId,
      recordSourceCode: row.recordSourceCode,
      deliveryStatusCode: row.deliveryStatusCode,
      threadEntries: await Promise.all(
        threadRows.map((threadRow) => this.toSummaryView(context, threadRow))
      ),
    };
  }
}

export function createCrmCommunicationService() {
  return new CrmCommunicationService();
}
