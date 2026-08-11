/**
 * Purpose:
 * Campaign lifecycle orchestration — plan, activate, members, responses, ROI.
 *
 * Implementation Package:
 * BP-004 / IP-11 – Campaign Management
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import { AUDIT_OPERATIONS, createAuditService } from "@/core/audit";
import {
  createPartyTimelineService,
  PARTY_TIMELINE_EVENT_CATEGORIES,
} from "@/core/party-timeline";
import { createCampaignConsentAdapter } from "@/modules/crm/adapters/campaign-consent-adapter";
import { createCampaignOutreachAdapter } from "@/modules/crm/adapters/campaign-outreach-adapter";
import { createLeadAttributionAdapter } from "@/modules/crm/adapters/lead-attribution-adapter";
import {
  CAMPAIGN_MEMBER_STATUS_CODES,
  CAMPAIGN_NUMBER_PREFIX,
  CAMPAIGN_STATUS_CODES,
  CRM_CAMPAIGN_TIMELINE_EVENT_TYPES,
  campaignMemberStatusLabel,
  campaignStatusLabel,
  campaignTypeLabel,
  type CampaignMemberStatusCode,
  type CampaignStatusCode,
} from "@/modules/crm/constants";
import { CrmError, CRM_USER_MESSAGES } from "@/modules/crm/errors";
import { createCampaignMemberRepository } from "@/modules/crm/campaign/repositories/campaign-member-repository";
import { createCampaignRepository } from "@/modules/crm/campaign/repositories/campaign-repository";
import {
  canEditCampaignMembers,
  canTransitionCampaignStatus,
  computeCampaignRoi,
  isCampaignReadOnly,
} from "@/modules/crm/campaign/services/campaign-rules";
import type {
  CampaignDashboardView,
  CampaignDetailView,
  CampaignMemberView,
  CampaignSearchFilters,
  CampaignSearchResultView,
  CampaignSummaryView,
  CreateCampaignPayload,
  UpdateCampaignPayload,
} from "@/modules/crm/campaign/types";
import {
  campaignSearchFiltersSchema,
  createCampaignSchema,
  markMemberStatusSchema,
  updateCampaignSchema,
} from "@/modules/crm/campaign/validators/campaign-validators";
import {
  CRM_AUDIT_ENTITY_NAMES,
  CRM_AUDIT_SOURCE_MODULE_CAMPAIGN,
  recordCrmEntityAudit,
} from "@/modules/crm/quotation/services/crm-audit-helper";
import { createPartyGroupMemberRepository } from "@/modules/party/repositories/party-group-member-repository";
import { createPartyGroupRepository } from "@/modules/party/repositories/party-group-repository";
import { PARTY_GROUP_MEMBER_STATUS_CODES } from "@/modules/party/constants";
import type { campaign as campaignTable } from "@/db/schema/campaign";

type CampaignRow = typeof campaignTable.$inferSelect;

const CRM_TIMELINE_SOURCE_MODULE = "crm_campaigns";

export class CampaignService {
  constructor(
    private readonly campaignRepository = createCampaignRepository(),
    private readonly memberRepository = createCampaignMemberRepository(),
    private readonly partyGroupRepository = createPartyGroupRepository(),
    private readonly partyGroupMemberRepository = createPartyGroupMemberRepository(),
    private readonly consentAdapter = createCampaignConsentAdapter(),
    private readonly outreachAdapter = createCampaignOutreachAdapter(),
    private readonly leadAttributionAdapter = createLeadAttributionAdapter(),
    private readonly timelineService = createPartyTimelineService(),
    private readonly auditService = createAuditService()
  ) {}

  async createCampaign(
    context: CurrentBusinessContext,
    payload: CreateCampaignPayload
  ): Promise<CampaignDetailView> {
    const parsed = createCampaignSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new CrmError(
        "INVALID_INPUT",
        first?.message ?? CRM_USER_MESSAGES.INVALID_INPUT,
        400
      );
    }

    if (parsed.data.partyGroupId) {
      await this.requirePartyGroup(context, parsed.data.partyGroupId);
    }

    const sequence = await this.campaignRepository.nextSequence(context.businessId);
    const campaignNumber = `${CAMPAIGN_NUMBER_PREFIX}-${String(sequence).padStart(5, "0")}`;

    const row = await this.campaignRepository.insert({
      businessId: context.businessId,
      campaignNumber,
      name: parsed.data.name,
      campaignType: parsed.data.campaignType,
      status: CAMPAIGN_STATUS_CODES.PLANNED,
      startAt: parsed.data.startAt ? new Date(parsed.data.startAt) : null,
      endAt: parsed.data.endAt ? new Date(parsed.data.endAt) : null,
      budgetAmount: String(parsed.data.budgetAmount ?? 0),
      currencyCode: parsed.data.currencyCode.toUpperCase(),
      objective: parsed.data.objective ?? null,
      ownerUserId: parsed.data.ownerUserId ?? context.platformUserId ?? null,
      partyGroupId: parsed.data.partyGroupId ?? null,
      expectedResponseCount: parsed.data.expectedResponseCount ?? 0,
      notes: parsed.data.notes ?? null,
      metadata: parsed.data.metadata ?? null,
      createdBy: context.platformUserId ?? null,
      updatedBy: context.platformUserId ?? null,
    });

    await recordCrmEntityAudit(this.auditService, context, {
      entityName: CRM_AUDIT_ENTITY_NAMES.CAMPAIGN,
      entityId: row.id,
      operation: AUDIT_OPERATIONS.CREATE,
      sourceModule: CRM_AUDIT_SOURCE_MODULE_CAMPAIGN,
      createValues: {
        campaignNumber: row.campaignNumber,
        name: row.name,
        status: row.status,
      },
    });

    if (row.partyGroupId) {
      await this.syncAudienceFromPartyGroup(context, row.id);
    }

    return this.getCampaignDetail(context, row.id);
  }

  async getCampaignDetail(
    context: CurrentBusinessContext,
    campaignId: string
  ): Promise<CampaignDetailView> {
    const row = await this.requireCampaign(context, campaignId);
    return this.mapDetailView(context, row);
  }

  async searchCampaigns(
    context: CurrentBusinessContext,
    filters: CampaignSearchFilters
  ): Promise<CampaignSearchResultView> {
    const parsed = campaignSearchFiltersSchema.safeParse(filters);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new CrmError(
        "INVALID_INPUT",
        first?.message ?? CRM_USER_MESSAGES.INVALID_INPUT,
        400
      );
    }

    const result = await this.campaignRepository.search(
      context.businessId,
      parsed.data
    );

    const items: CampaignSummaryView[] = [];
    for (const row of result.items) {
      const memberCount = await this.memberRepository.countByCampaign(
        context.businessId,
        row.id
      );
      items.push(this.mapSummaryView(row, memberCount));
    }

    return {
      items,
      totalCount: result.totalCount,
      page: result.page,
      pageSize: result.pageSize,
    };
  }

  async getDashboard(
    context: CurrentBusinessContext
  ): Promise<CampaignDashboardView> {
    const [plannedCount, activeCount, completedCount, totalBudget, recent] =
      await Promise.all([
        this.campaignRepository.countByStatus(
          context.businessId,
          CAMPAIGN_STATUS_CODES.PLANNED
        ),
        this.campaignRepository.countByStatus(
          context.businessId,
          CAMPAIGN_STATUS_CODES.ACTIVE
        ),
        this.campaignRepository.countByStatus(
          context.businessId,
          CAMPAIGN_STATUS_CODES.COMPLETED
        ),
        this.campaignRepository.sumBudget(context.businessId),
        this.searchCampaigns(context, { page: 1, pageSize: 10 }),
      ]);

    return {
      totalCount: recent.totalCount,
      plannedCount,
      activeCount,
      completedCount,
      totalBudget,
      recent: recent.items,
    };
  }

  async updateCampaign(
    context: CurrentBusinessContext,
    campaignId: string,
    payload: UpdateCampaignPayload
  ): Promise<CampaignDetailView> {
    const row = await this.requireEditableCampaign(context, campaignId);
    const parsed = updateCampaignSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new CrmError(
        "INVALID_INPUT",
        first?.message ?? CRM_USER_MESSAGES.INVALID_INPUT,
        400
      );
    }

    if (parsed.data.partyGroupId) {
      await this.requirePartyGroup(context, parsed.data.partyGroupId);
    }

    await this.campaignRepository.update(context.businessId, campaignId, {
      name: parsed.data.name,
      campaignType: parsed.data.campaignType,
      startAt:
        parsed.data.startAt === undefined
          ? undefined
          : parsed.data.startAt
            ? new Date(parsed.data.startAt)
            : null,
      endAt:
        parsed.data.endAt === undefined
          ? undefined
          : parsed.data.endAt
            ? new Date(parsed.data.endAt)
            : null,
      budgetAmount:
        parsed.data.budgetAmount === undefined
          ? undefined
          : String(parsed.data.budgetAmount),
      actualCost:
        parsed.data.actualCost === undefined
          ? undefined
          : String(parsed.data.actualCost),
      objective: parsed.data.objective,
      ownerUserId: parsed.data.ownerUserId,
      partyGroupId: parsed.data.partyGroupId,
      expectedResponseCount: parsed.data.expectedResponseCount,
      notes: parsed.data.notes,
      metadata: parsed.data.metadata,
      updatedBy: context.platformUserId ?? null,
    });

    await recordCrmEntityAudit(this.auditService, context, {
      entityName: CRM_AUDIT_ENTITY_NAMES.CAMPAIGN,
      entityId: campaignId,
      operation: AUDIT_OPERATIONS.UPDATE,
      sourceModule: CRM_AUDIT_SOURCE_MODULE_CAMPAIGN,
      before: { name: row.name, status: row.status },
      after: {
        name: parsed.data.name ?? row.name,
        status: row.status,
      },
      trackFields: ["name", "status"],
    });

    return this.getCampaignDetail(context, campaignId);
  }

  async activateCampaign(
    context: CurrentBusinessContext,
    campaignId: string
  ): Promise<CampaignDetailView> {
    return this.transitionStatus(
      context,
      campaignId,
      CAMPAIGN_STATUS_CODES.ACTIVE
    );
  }

  async completeCampaign(
    context: CurrentBusinessContext,
    campaignId: string
  ): Promise<CampaignDetailView> {
    return this.transitionStatus(
      context,
      campaignId,
      CAMPAIGN_STATUS_CODES.COMPLETED
    );
  }

  async cancelCampaign(
    context: CurrentBusinessContext,
    campaignId: string
  ): Promise<CampaignDetailView> {
    return this.transitionStatus(
      context,
      campaignId,
      CAMPAIGN_STATUS_CODES.CANCELLED
    );
  }

  async syncAudienceFromPartyGroup(
    context: CurrentBusinessContext,
    campaignId: string
  ): Promise<CampaignDetailView> {
    const row = await this.requireEditableCampaign(context, campaignId);
    if (!row.partyGroupId) {
      throw new CrmError(
        "INVALID_INPUT",
        "Assign a party group before syncing audience.",
        400
      );
    }

    await this.requirePartyGroup(context, row.partyGroupId);
    const groupMembers = await this.partyGroupMemberRepository.listByGroupId(
      context.businessId,
      row.partyGroupId
    );

    for (const groupMember of groupMembers) {
      if (groupMember.statusCode !== PARTY_GROUP_MEMBER_STATUS_CODES.ACTIVE) {
        continue;
      }

      const existing = await this.memberRepository.findByCampaignAndParty(
        context.businessId,
        campaignId,
        groupMember.partyId
      );
      if (existing) {
        continue;
      }

      const inserted = await this.memberRepository.insert({
        businessId: context.businessId,
        campaignId,
        partyId: groupMember.partyId,
        memberStatus: CAMPAIGN_MEMBER_STATUS_CODES.TARGETED,
        createdBy: context.platformUserId ?? null,
        updatedBy: context.platformUserId ?? null,
      });

      await this.timelineService.recordEvent({
        businessId: context.businessId,
        partyId: groupMember.partyId,
        eventType: CRM_CAMPAIGN_TIMELINE_EVENT_TYPES.CAMPAIGN_MEMBER_ADDED,
        eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.OPERATIONS,
        summary: `Added to campaign ${row.campaignNumber}`,
        sourceModule: CRM_TIMELINE_SOURCE_MODULE,
        referenceEntity: CRM_AUDIT_ENTITY_NAMES.CAMPAIGN_MEMBER,
        referenceId: inserted.id,
        performedByUserId: context.platformUserId ?? null,
        createdBy: context.platformUserId ?? null,
      });
    }

    return this.getCampaignDetail(context, campaignId);
  }

  async markMemberSent(
    context: CurrentBusinessContext,
    campaignId: string,
    memberId: string,
    outreachChannel?: string | null
  ): Promise<CampaignDetailView> {
    const campaignRow = await this.requireEditableCampaign(context, campaignId);
    if (!canEditCampaignMembers(campaignRow.status)) {
      throw new CrmError(
        "CAMPAIGN_READ_ONLY",
        CRM_USER_MESSAGES.CAMPAIGN_READ_ONLY,
        409
      );
    }

    const member = await this.requireMember(context, campaignId, memberId);
    const consent = await this.consentAdapter.checkMarketingConsent(
      context,
      member.partyId
    );

    if (!consent.granted) {
      throw new CrmError(
        "CAMPAIGN_CONSENT_REQUIRED",
        CRM_USER_MESSAGES.CAMPAIGN_CONSENT_REQUIRED,
        403
      );
    }

    await this.outreachAdapter.sendOutreach(context, {
      campaignId,
      memberId,
      partyId: member.partyId,
      channel: outreachChannel ?? campaignRow.campaignType,
    });

    await this.memberRepository.update(context.businessId, memberId, {
      memberStatus: CAMPAIGN_MEMBER_STATUS_CODES.SENT,
      consentCheckedAt: consent.checkedAt,
      consentGranted: true,
      outreachChannel: outreachChannel ?? campaignRow.campaignType,
      updatedBy: context.platformUserId ?? null,
    });

    return this.getCampaignDetail(context, campaignId);
  }

  async recordMemberResponse(
    context: CurrentBusinessContext,
    campaignId: string,
    memberId: string,
    options: { notes?: string | null; existingLeadId?: string | null } = {}
  ): Promise<CampaignDetailView> {
    await this.requireEditableCampaign(context, campaignId);
    const member = await this.requireMember(context, campaignId, memberId);
    const now = new Date();

    const attribution =
      await this.leadAttributionAdapter.attributeLeadFromCampaignResponse(
        context,
        {
          campaignId,
          partyId: member.partyId,
          memberId,
          existingLeadId: options.existingLeadId,
        }
      );

    await this.memberRepository.update(context.businessId, memberId, {
      memberStatus: CAMPAIGN_MEMBER_STATUS_CODES.RESPONDED,
      respondedAt: now,
      leadId: attribution.leadId,
      notes: options.notes ?? member.notes,
      metadata: {
        ...((member.metadata as Record<string, unknown> | null) ?? {}),
        leadAttributionDeferred: attribution.deferredToIp02,
      },
      updatedBy: context.platformUserId ?? null,
    });

    await this.timelineService.recordEvent({
      businessId: context.businessId,
      partyId: member.partyId,
      eventType: CRM_CAMPAIGN_TIMELINE_EVENT_TYPES.CAMPAIGN_RESPONSE,
      eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.OPERATIONS,
      summary: "Campaign response recorded",
      sourceModule: CRM_TIMELINE_SOURCE_MODULE,
      referenceEntity: CRM_AUDIT_ENTITY_NAMES.CAMPAIGN_MEMBER,
      referenceId: memberId,
      performedByUserId: context.platformUserId ?? null,
      createdBy: context.platformUserId ?? null,
    });

    if (attribution.leadId) {
      await this.timelineService.recordEvent({
        businessId: context.businessId,
        partyId: member.partyId,
        eventType: CRM_CAMPAIGN_TIMELINE_EVENT_TYPES.CAMPAIGN_LEAD_ATTRIBUTED,
        eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.OPERATIONS,
        summary: "Lead attributed to campaign",
        sourceModule: CRM_TIMELINE_SOURCE_MODULE,
        referenceEntity: "lead",
        referenceId: attribution.leadId,
        performedByUserId: context.platformUserId ?? null,
        createdBy: context.platformUserId ?? null,
      });
    }

    return this.getCampaignDetail(context, campaignId);
  }

  async markMemberConverted(
    context: CurrentBusinessContext,
    campaignId: string,
    memberId: string,
    opportunityId?: string | null
  ): Promise<CampaignDetailView> {
    await this.requireEditableCampaign(context, campaignId);
    await this.requireMember(context, campaignId, memberId);

    await this.memberRepository.update(context.businessId, memberId, {
      memberStatus: CAMPAIGN_MEMBER_STATUS_CODES.CONVERTED,
      convertedAt: new Date(),
      opportunityId: opportunityId ?? null,
      updatedBy: context.platformUserId ?? null,
    });

    return this.getCampaignDetail(context, campaignId);
  }

  async updateMemberStatus(
    context: CurrentBusinessContext,
    campaignId: string,
    memberId: string,
    payload: {
      memberStatus: string;
      outreachChannel?: string | null;
      notes?: string | null;
    }
  ): Promise<CampaignDetailView> {
    const parsed = markMemberStatusSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new CrmError(
        "INVALID_INPUT",
        first?.message ?? CRM_USER_MESSAGES.INVALID_INPUT,
        400
      );
    }

    if (parsed.data.memberStatus === CAMPAIGN_MEMBER_STATUS_CODES.SENT) {
      return this.markMemberSent(
        context,
        campaignId,
        memberId,
        parsed.data.outreachChannel
      );
    }
    if (parsed.data.memberStatus === CAMPAIGN_MEMBER_STATUS_CODES.RESPONDED) {
      return this.recordMemberResponse(context, campaignId, memberId, {
        notes: parsed.data.notes,
      });
    }
    if (parsed.data.memberStatus === CAMPAIGN_MEMBER_STATUS_CODES.CONVERTED) {
      return this.markMemberConverted(context, campaignId, memberId);
    }

    await this.requireEditableCampaign(context, campaignId);
    await this.requireMember(context, campaignId, memberId);
    await this.memberRepository.update(context.businessId, memberId, {
      memberStatus: parsed.data.memberStatus,
      outreachChannel: parsed.data.outreachChannel,
      notes: parsed.data.notes,
      updatedBy: context.platformUserId ?? null,
    });

    return this.getCampaignDetail(context, campaignId);
  }

  private async transitionStatus(
    context: CurrentBusinessContext,
    campaignId: string,
    toStatus: CampaignStatusCode
  ): Promise<CampaignDetailView> {
    const row = await this.requireCampaign(context, campaignId);
    if (!canTransitionCampaignStatus(row.status, toStatus)) {
      throw new CrmError(
        "INVALID_CAMPAIGN_STATUS_TRANSITION",
        CRM_USER_MESSAGES.INVALID_CAMPAIGN_STATUS_TRANSITION,
        409
      );
    }

    await this.campaignRepository.update(context.businessId, campaignId, {
      status: toStatus,
      updatedBy: context.platformUserId ?? null,
    });

    await recordCrmEntityAudit(this.auditService, context, {
      entityName: CRM_AUDIT_ENTITY_NAMES.CAMPAIGN,
      entityId: campaignId,
      operation: AUDIT_OPERATIONS.UPDATE,
      sourceModule: CRM_AUDIT_SOURCE_MODULE_CAMPAIGN,
      before: { status: row.status },
      after: { status: toStatus },
      trackFields: ["status"],
    });

    return this.getCampaignDetail(context, campaignId);
  }

  private async requireCampaign(
    context: CurrentBusinessContext,
    campaignId: string
  ): Promise<CampaignRow> {
    const row = await this.campaignRepository.findById(
      context.businessId,
      campaignId
    );
    if (!row) {
      throw new CrmError(
        "CAMPAIGN_NOT_FOUND",
        CRM_USER_MESSAGES.CAMPAIGN_NOT_FOUND,
        404
      );
    }
    return row;
  }

  private async requireEditableCampaign(
    context: CurrentBusinessContext,
    campaignId: string
  ): Promise<CampaignRow> {
    const row = await this.requireCampaign(context, campaignId);
    if (isCampaignReadOnly(row.status)) {
      throw new CrmError(
        "CAMPAIGN_READ_ONLY",
        CRM_USER_MESSAGES.CAMPAIGN_READ_ONLY,
        409
      );
    }
    return row;
  }

  private async requireMember(
    context: CurrentBusinessContext,
    campaignId: string,
    memberId: string
  ) {
    const member = await this.memberRepository.findById(
      context.businessId,
      memberId
    );
    if (!member || member.campaignId !== campaignId) {
      throw new CrmError(
        "CAMPAIGN_MEMBER_NOT_FOUND",
        CRM_USER_MESSAGES.CAMPAIGN_MEMBER_NOT_FOUND,
        404
      );
    }
    return member;
  }

  private async requirePartyGroup(
    context: CurrentBusinessContext,
    partyGroupId: string
  ) {
    const group = await this.partyGroupRepository.findById(
      context.businessId,
      partyGroupId
    );
    if (!group) {
      throw new CrmError(
        "PARTY_GROUP_NOT_FOUND",
        CRM_USER_MESSAGES.PARTY_GROUP_NOT_FOUND,
        404
      );
    }
    return group;
  }

  private mapSummaryView(
    row: CampaignRow,
    memberCount: number
  ): CampaignSummaryView {
    return {
      id: row.id,
      campaignNumber: row.campaignNumber,
      name: row.name,
      campaignType: row.campaignType,
      campaignTypeLabel: campaignTypeLabel(row.campaignType),
      status: row.status,
      statusLabel: campaignStatusLabel(row.status),
      startAt: row.startAt?.toISOString() ?? null,
      endAt: row.endAt?.toISOString() ?? null,
      budgetAmount: Number(row.budgetAmount),
      actualCost: Number(row.actualCost),
      currencyCode: row.currencyCode,
      partyGroupId: row.partyGroupId,
      ownerUserId: row.ownerUserId,
      memberCount,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async mapDetailView(
    context: CurrentBusinessContext,
    row: CampaignRow
  ): Promise<CampaignDetailView> {
    const memberRows = await this.memberRepository.listByCampaignId(
      context.businessId,
      row.id
    );

    const members: CampaignMemberView[] = memberRows.map(({ member, partyDisplayName }) => ({
      id: member.id,
      partyId: member.partyId,
      partyDisplayName,
      memberStatus: member.memberStatus,
      memberStatusLabel: campaignMemberStatusLabel(member.memberStatus),
      leadId: member.leadId,
      opportunityId: member.opportunityId,
      consentGranted: member.consentGranted,
      outreachChannel: member.outreachChannel,
      respondedAt: member.respondedAt?.toISOString() ?? null,
      convertedAt: member.convertedAt?.toISOString() ?? null,
      createdAt: member.createdAt.toISOString(),
    }));

    const roi = computeCampaignRoi({
      statuses: members.map((m) => m.memberStatus as CampaignMemberStatusCode),
      budgetAmount: Number(row.budgetAmount),
      actualCost: Number(row.actualCost),
    });

    return {
      ...this.mapSummaryView(row, members.length),
      objective: row.objective,
      expectedResponseCount: row.expectedResponseCount,
      notes: row.notes,
      metadata: (row.metadata as Record<string, unknown> | null) ?? null,
      members,
      roi,
    };
  }
}

export function createCampaignService() {
  return new CampaignService();
}
