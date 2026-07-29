/**
 * Purpose:
 * Party Group & Membership Management — groups, members, party memberships.
 *
 * Architecture:
 * Server Actions → PartyGroupService → Repositories → Drizzle
 *
 * Implementation Package:
 * BP-002 / IP-008 – Party Groups & Membership
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  AUDIT_ENTITY_NAMES,
  AUDIT_SOURCE_MODULES,
  createAuditService,
} from "@/core/audit";
import {
  buildTimelineEventFromContext,
  createPartyTimelineService,
  PARTY_TIMELINE_EVENT_CATEGORIES,
  PARTY_TIMELINE_EVENT_TYPES,
} from "@/core/party-timeline";
import {
  PARTY_GROUP_MEMBER_STATUS_CODES,
  PARTY_GROUP_STATUS_CODES,
  type PartyGroupMemberStatusCode,
  type PartyGroupStatusCode,
  type PartyTypeCode,
} from "@/modules/party/constants";
import { PartyError, PARTY_USER_MESSAGES } from "@/modules/party/errors";
import { createPartyGroupMemberRepository } from "@/modules/party/repositories/party-group-member-repository";
import { createPartyGroupRepository } from "@/modules/party/repositories/party-group-repository";
import { createPartyReferenceRepository } from "@/modules/party/repositories/party-reference-repository";
import { createPartyRepository } from "@/modules/party/repositories/party-repository";
import {
  canDeactivateGroup,
  canExitMembership,
  canReactivateGroup,
  canRejoinMembership,
  isPartyGroupMemberStatusCode,
  isPartyGroupStatusCode,
  normalizeGroupCode,
  todayIsoDate,
} from "@/modules/party/services/party-group-rules";
import type {
  AddPartyGroupMemberPayload,
  AddPartyToGroupPayload,
  CreatePartyGroupPayload,
  PartyGroupDashboardView,
  PartyGroupDetailView,
  PartyGroupMemberView,
  PartyGroupMembersPanelView,
  PartyGroupMembershipView,
  PartyGroupSearchResultView,
  PartyGroupsPanelView,
  PartyGroupSummaryView,
  UpdatePartyGroupMemberPayload,
  UpdatePartyGroupPayload,
} from "@/modules/party/types";
import {
  addPartyGroupMemberSchema,
  addPartyToGroupSchema,
  createPartyGroupSchema,
  groupSearchQuerySchema,
  updatePartyGroupMemberSchema,
  updatePartyGroupSchema,
} from "@/modules/party/validators/party-group-validators";
import { nullableTrimmed } from "@/modules/party/validators/party-address-validators";
import {
  inferAuditOperationFromEventType,
  recordPartyEntityAudit,
} from "@/modules/party/services/party-audit-helper";

export class PartyGroupService {
  constructor(
    private readonly partyRepository = createPartyRepository(),
    private readonly partyGroupRepository = createPartyGroupRepository(),
    private readonly partyGroupMemberRepository = createPartyGroupMemberRepository(),
    private readonly referenceRepository = createPartyReferenceRepository(),
    private readonly timelineService = createPartyTimelineService(),
    private readonly auditService = createAuditService()
  ) {}

  async getGroupDashboard(
    context: CurrentBusinessContext
  ): Promise<PartyGroupDashboardView> {
    const [groups, groupTypes, countries] = await Promise.all([
      this.partyGroupRepository.listByBusinessId(context.businessId),
      this.referenceRepository.listActiveGroupTypes(),
      this.referenceRepository.listActiveCountries(),
    ]);

    if (groupTypes.length === 0) {
      throw new PartyError(
        "REFERENCE_DATA_MISSING",
        "Group Type catalogue is empty. Seed Party Group catalogues before continuing.",
        503
      );
    }

    const typeNameByCode = new Map(groupTypes.map((t) => [t.code, t.name]));
    const memberCounts = await this.partyGroupRepository.countMembersByGroupIds(
      context.businessId,
      groups.map((g) => g.id)
    );

    return {
      groups: groups.map((group) =>
        this.toGroupSummary(group, typeNameByCode, memberCounts)
      ),
      availableGroupTypes: groupTypes,
      countries,
    };
  }

  async getGroupDetail(
    context: CurrentBusinessContext,
    partyGroupId: string
  ): Promise<PartyGroupDetailView> {
    const group = await this.requireGroup(context, partyGroupId);
    const [groupType, countries, activeCount, totalCount] = await Promise.all([
      this.referenceRepository.findGroupTypeByCode(group.groupTypeCode),
      this.referenceRepository.listActiveCountries(),
      this.partyGroupMemberRepository.countByGroupId(
        context.businessId,
        partyGroupId,
        PARTY_GROUP_MEMBER_STATUS_CODES.ACTIVE
      ),
      this.partyGroupMemberRepository.countByGroupId(
        context.businessId,
        partyGroupId
      ),
    ]);

    const countryName =
      countries.find((c) => c.code === group.countryCode)?.name ?? null;

    const statusCode = isPartyGroupStatusCode(group.statusCode)
      ? group.statusCode
      : PARTY_GROUP_STATUS_CODES.ACTIVE;

    return {
      id: group.id,
      groupName: group.groupName,
      groupCode: group.groupCode,
      groupTypeCode: group.groupTypeCode,
      groupTypeName: groupType?.name ?? group.groupTypeCode,
      statusCode,
      description: group.description,
      countryCode: group.countryCode,
      countryName,
      activeMemberCount: activeCount,
      totalMemberCount: totalCount,
    };
  }

  async getGroupMembersPanel(
    context: CurrentBusinessContext,
    partyGroupId: string
  ): Promise<PartyGroupMembersPanelView> {
    const [group, memberRows, membershipRoles, partyTypes] = await Promise.all([
      this.getGroupDetail(context, partyGroupId),
      this.partyGroupMemberRepository.listByGroupId(
        context.businessId,
        partyGroupId
      ),
      this.referenceRepository.listActiveGroupMembershipRoles(),
      this.referenceRepository.listActivePartyTypes(),
    ]);

    if (membershipRoles.length === 0) {
      throw new PartyError(
        "REFERENCE_DATA_MISSING",
        "Group Membership Role catalogue is empty. Seed Party Group catalogues before continuing.",
        503
      );
    }

    const roleNameByCode = new Map(
      membershipRoles.map((r) => [r.code, r.name])
    );
    const partyTypeNameByCode = new Map(
      partyTypes.map((t) => [t.code, t.name])
    );

    const partyIds = [...new Set(memberRows.map((m) => m.partyId))];
    const parties = await Promise.all(
      partyIds.map((id) =>
        this.partyRepository.findById(context.businessId, id)
      )
    );
    const partyById = new Map(
      parties.filter((p) => p !== null).map((p) => [p!.id, p!])
    );

    const members = memberRows.map((row) =>
      this.toMemberView(row, partyById, roleNameByCode, partyTypeNameByCode)
    );

    return {
      group,
      members,
      availableMembershipRoles: membershipRoles,
    };
  }

  async getPartyGroupsPanel(
    context: CurrentBusinessContext,
    partyId: string
  ): Promise<PartyGroupsPanelView> {
    await this.requireParty(context, partyId);

    const [
      memberRows,
      groups,
      groupTypes,
      membershipRoles,
    ] = await Promise.all([
      this.partyGroupMemberRepository.listByPartyId(
        context.businessId,
        partyId
      ),
      this.partyGroupRepository.listByBusinessId(context.businessId),
      this.referenceRepository.listActiveGroupTypes(),
      this.referenceRepository.listActiveGroupMembershipRoles(),
    ]);

    if (groupTypes.length === 0 || membershipRoles.length === 0) {
      throw new PartyError(
        "REFERENCE_DATA_MISSING",
        "Group catalogues are empty. Seed Party Group catalogues before continuing.",
        503
      );
    }

    const typeNameByCode = new Map(groupTypes.map((t) => [t.code, t.name]));
    const roleNameByCode = new Map(
      membershipRoles.map((r) => [r.code, r.name])
    );
    const groupById = new Map(groups.map((g) => [g.id, g]));
    const memberCounts = await this.partyGroupRepository.countMembersByGroupIds(
      context.businessId,
      groups.map((g) => g.id)
    );

    const memberships = memberRows
      .map((row) => {
        const group = groupById.get(row.partyGroupId);
        if (!group) {
          return null;
        }

        const groupStatus = isPartyGroupStatusCode(group.statusCode)
          ? group.statusCode
          : PARTY_GROUP_STATUS_CODES.ACTIVE;
        const memberStatus = isPartyGroupMemberStatusCode(row.statusCode)
          ? row.statusCode
          : PARTY_GROUP_MEMBER_STATUS_CODES.ACTIVE;

        return {
          id: row.id,
          partyGroupId: row.partyGroupId,
          groupName: group.groupName,
          groupCode: group.groupCode,
          groupTypeCode: group.groupTypeCode,
          groupTypeName:
            typeNameByCode.get(group.groupTypeCode) ?? group.groupTypeCode,
          groupStatusCode: groupStatus,
          membershipRoleCode: row.membershipRoleCode,
          membershipRoleName:
            roleNameByCode.get(row.membershipRoleCode) ??
            row.membershipRoleCode,
          joinDate: row.joinDate,
          exitDate: row.exitDate,
          statusCode: memberStatus,
          isPrimaryContact: row.isPrimaryContact,
          notes: row.notes,
        } satisfies PartyGroupMembershipView;
      })
      .filter((row): row is PartyGroupMembershipView => row !== null);

    const activeGroupIds = new Set(
      memberRows
        .filter(
          (m) => m.statusCode === PARTY_GROUP_MEMBER_STATUS_CODES.ACTIVE
        )
        .map((m) => m.partyGroupId)
    );

    const availableGroups = groups
      .filter(
        (g) =>
          g.statusCode === PARTY_GROUP_STATUS_CODES.ACTIVE &&
          !activeGroupIds.has(g.id)
      )
      .map((group) =>
        this.toGroupSummary(group, typeNameByCode, memberCounts)
      );

    return {
      memberships,
      availableGroups,
      availableMembershipRoles: membershipRoles,
    };
  }

  async createGroup(
    context: CurrentBusinessContext,
    payload: CreatePartyGroupPayload
  ): Promise<PartyGroupDashboardView> {
    const parsed = createPartyGroupSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new PartyError(
        "INVALID_INPUT",
        first?.message ?? PARTY_USER_MESSAGES.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    const groupType = await this.referenceRepository.findGroupTypeByCode(
      parsed.data.groupTypeCode
    );
    if (!groupType) {
      throw new PartyError(
        "INVALID_INPUT",
        "Select a valid group type.",
        400,
        "groupTypeCode"
      );
    }

    const normalizedCode = normalizeGroupCode(parsed.data.groupCode);
    const duplicate = await this.partyGroupRepository.findByCode(
      context.businessId,
      normalizedCode
    );
    if (duplicate) {
      throw new PartyError(
        "DUPLICATE_GROUP_CODE",
        PARTY_USER_MESSAGES.DUPLICATE_GROUP_CODE,
        409,
        "groupCode"
      );
    }

    await this.partyGroupRepository.insert({
      businessId: context.businessId,
      groupName: parsed.data.groupName.trim(),
      groupCode: normalizedCode,
      groupTypeCode: parsed.data.groupTypeCode,
      statusCode: PARTY_GROUP_STATUS_CODES.ACTIVE,
      description: nullableTrimmed(parsed.data.description),
      countryCode: nullableTrimmed(parsed.data.countryCode),
      createdBy: context.platformUserId,
      updatedBy: context.platformUserId,
    });

    return this.getGroupDashboard(context);
  }

  async updateGroup(
    context: CurrentBusinessContext,
    partyGroupId: string,
    payload: UpdatePartyGroupPayload
  ): Promise<PartyGroupMembersPanelView> {
    const parsed = updatePartyGroupSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new PartyError(
        "INVALID_INPUT",
        first?.message ?? PARTY_USER_MESSAGES.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    await this.requireGroup(context, partyGroupId);

    if (parsed.data.groupTypeCode) {
      const groupType = await this.referenceRepository.findGroupTypeByCode(
        parsed.data.groupTypeCode
      );
      if (!groupType) {
        throw new PartyError(
          "INVALID_INPUT",
          "Select a valid group type.",
          400,
          "groupTypeCode"
        );
      }
    }

    await this.partyGroupRepository.updateById(
      context.businessId,
      partyGroupId,
      {
        ...(parsed.data.groupName !== undefined
          ? { groupName: parsed.data.groupName.trim() }
          : {}),
        ...(parsed.data.groupTypeCode !== undefined
          ? { groupTypeCode: parsed.data.groupTypeCode }
          : {}),
        ...(parsed.data.description !== undefined
          ? { description: nullableTrimmed(parsed.data.description) }
          : {}),
        ...(parsed.data.countryCode !== undefined
          ? { countryCode: nullableTrimmed(parsed.data.countryCode) }
          : {}),
        updatedBy: context.platformUserId,
      }
    );

    return this.getGroupMembersPanel(context, partyGroupId);
  }

  async deactivateGroup(
    context: CurrentBusinessContext,
    partyGroupId: string
  ): Promise<PartyGroupMembersPanelView> {
    const group = await this.requireGroup(context, partyGroupId);

    if (
      !canDeactivateGroup(group.statusCode as PartyGroupStatusCode)
    ) {
      throw new PartyError(
        "INVALID_GROUP_TRANSITION",
        PARTY_USER_MESSAGES.INVALID_GROUP_TRANSITION,
        400
      );
    }

    await this.partyGroupRepository.updateById(
      context.businessId,
      partyGroupId,
      {
        statusCode: PARTY_GROUP_STATUS_CODES.INACTIVE,
        updatedBy: context.platformUserId,
      }
    );

    return this.getGroupMembersPanel(context, partyGroupId);
  }

  async reactivateGroup(
    context: CurrentBusinessContext,
    partyGroupId: string
  ): Promise<PartyGroupMembersPanelView> {
    const group = await this.requireGroup(context, partyGroupId);

    if (
      !canReactivateGroup(group.statusCode as PartyGroupStatusCode)
    ) {
      throw new PartyError(
        "INVALID_GROUP_TRANSITION",
        PARTY_USER_MESSAGES.INVALID_GROUP_TRANSITION,
        400
      );
    }

    await this.partyGroupRepository.updateById(
      context.businessId,
      partyGroupId,
      {
        statusCode: PARTY_GROUP_STATUS_CODES.ACTIVE,
        updatedBy: context.platformUserId,
      }
    );

    return this.getGroupMembersPanel(context, partyGroupId);
  }

  async addMemberToGroup(
    context: CurrentBusinessContext,
    partyGroupId: string,
    payload: AddPartyGroupMemberPayload
  ): Promise<PartyGroupMembersPanelView> {
    const parsed = addPartyGroupMemberSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new PartyError(
        "INVALID_INPUT",
        first?.message ?? PARTY_USER_MESSAGES.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    const group = await this.requireGroup(context, partyGroupId);
    if (group.statusCode !== PARTY_GROUP_STATUS_CODES.ACTIVE) {
      throw new PartyError(
        "GROUP_INACTIVE",
        PARTY_USER_MESSAGES.GROUP_INACTIVE,
        400
      );
    }

    await this.insertMembership(context, group.id, parsed.data.partyId, {
      membershipRoleCode: parsed.data.membershipRoleCode,
      joinDate: parsed.data.joinDate,
      isPrimaryContact: parsed.data.isPrimaryContact,
      notes: parsed.data.notes,
    });

    return this.getGroupMembersPanel(context, partyGroupId);
  }

  async addPartyToGroup(
    context: CurrentBusinessContext,
    partyId: string,
    payload: AddPartyToGroupPayload
  ): Promise<PartyGroupsPanelView> {
    const parsed = addPartyToGroupSchema.safeParse(payload);
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
    const group = await this.requireGroup(context, parsed.data.partyGroupId);

    if (group.statusCode !== PARTY_GROUP_STATUS_CODES.ACTIVE) {
      throw new PartyError(
        "GROUP_INACTIVE",
        PARTY_USER_MESSAGES.GROUP_INACTIVE,
        400,
        "partyGroupId"
      );
    }

    await this.insertMembership(
      context,
      parsed.data.partyGroupId,
      partyId,
      {
        membershipRoleCode: parsed.data.membershipRoleCode,
        joinDate: parsed.data.joinDate,
        isPrimaryContact: parsed.data.isPrimaryContact,
        notes: parsed.data.notes,
      }
    );

    await this.timelineService.recordEvent(
      buildTimelineEventFromContext(context, {
        partyId,
        eventType: PARTY_TIMELINE_EVENT_TYPES.GROUP_JOINED,
        eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.GROUPS,
        summary: `Joined group — ${group.groupName}`,
        referenceEntity: "party_group",
        referenceId: parsed.data.partyGroupId,
      })
    );

    await recordPartyEntityAudit(this.auditService, context, {
      partyId,
      entityName: AUDIT_ENTITY_NAMES.PARTY_GROUP,
      entityId: parsed.data.partyGroupId,
      operation: inferAuditOperationFromEventType(
        PARTY_TIMELINE_EVENT_TYPES.GROUP_JOINED
      ),
      sourceModule: AUDIT_SOURCE_MODULES.PARTY_GROUPS,
    });

    return this.getPartyGroupsPanel(context, partyId);
  }

  async updateMember(
    context: CurrentBusinessContext,
    partyGroupId: string,
    partyGroupMemberId: string,
    payload: UpdatePartyGroupMemberPayload
  ): Promise<PartyGroupMembersPanelView> {
    const parsed = updatePartyGroupMemberSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new PartyError(
        "INVALID_INPUT",
        first?.message ?? PARTY_USER_MESSAGES.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    await this.requireGroup(context, partyGroupId);
    const member = await this.requireMemberForGroup(
      context,
      partyGroupId,
      partyGroupMemberId
    );

    if (parsed.data.membershipRoleCode) {
      const role = await this.referenceRepository.findGroupMembershipRoleByCode(
        parsed.data.membershipRoleCode
      );
      if (!role) {
        throw new PartyError(
          "INVALID_INPUT",
          "Select a valid membership role.",
          400,
          "membershipRoleCode"
        );
      }
    }

    await this.partyGroupMemberRepository.updateById(
      context.businessId,
      partyGroupMemberId,
      {
        ...(parsed.data.membershipRoleCode !== undefined
          ? { membershipRoleCode: parsed.data.membershipRoleCode }
          : {}),
        ...(parsed.data.joinDate !== undefined
          ? { joinDate: parsed.data.joinDate.trim() }
          : {}),
        ...(parsed.data.exitDate !== undefined
          ? { exitDate: nullableTrimmed(parsed.data.exitDate) }
          : {}),
        ...(parsed.data.isPrimaryContact !== undefined
          ? { isPrimaryContact: parsed.data.isPrimaryContact }
          : {}),
        ...(parsed.data.notes !== undefined
          ? { notes: nullableTrimmed(parsed.data.notes) }
          : {}),
        updatedBy: context.platformUserId,
      }
    );

    if (
      parsed.data.isPrimaryContact === true &&
      member.statusCode === PARTY_GROUP_MEMBER_STATUS_CODES.ACTIVE
    ) {
      await this.clearOtherPrimaryContacts(
        context,
        partyGroupId,
        partyGroupMemberId
      );
    }

    return this.getGroupMembersPanel(context, partyGroupId);
  }

  async leaveGroup(
    context: CurrentBusinessContext,
    partyId: string,
    partyGroupMemberId: string
  ): Promise<PartyGroupsPanelView> {
    await this.requireParty(context, partyId);
    const member = await this.requireMemberForParty(
      context,
      partyId,
      partyGroupMemberId
    );

    if (
      !canExitMembership(member.statusCode as PartyGroupMemberStatusCode)
    ) {
      throw new PartyError(
        "INVALID_GROUP_MEMBER_TRANSITION",
        PARTY_USER_MESSAGES.INVALID_GROUP_MEMBER_TRANSITION,
        400
      );
    }

    const group = await this.requireGroup(context, member.partyGroupId);

    await this.partyGroupMemberRepository.updateById(
      context.businessId,
      partyGroupMemberId,
      {
        statusCode: PARTY_GROUP_MEMBER_STATUS_CODES.EXITED,
        exitDate: member.exitDate ?? todayIsoDate(),
        updatedBy: context.platformUserId,
      }
    );

    await this.timelineService.recordEvent(
      buildTimelineEventFromContext(context, {
        partyId,
        eventType: PARTY_TIMELINE_EVENT_TYPES.GROUP_LEFT,
        eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.GROUPS,
        summary: `Left group — ${group.groupName}`,
        referenceEntity: "party_group_member",
        referenceId: partyGroupMemberId,
      })
    );

    await recordPartyEntityAudit(this.auditService, context, {
      partyId,
      entityName: AUDIT_ENTITY_NAMES.PARTY_GROUP_MEMBER,
      entityId: partyGroupMemberId,
      operation: inferAuditOperationFromEventType(
        PARTY_TIMELINE_EVENT_TYPES.GROUP_LEFT
      ),
      sourceModule: AUDIT_SOURCE_MODULES.PARTY_GROUPS,
    });

    return this.getPartyGroupsPanel(context, partyId);
  }

  async exitMemberFromGroup(
    context: CurrentBusinessContext,
    partyGroupId: string,
    partyGroupMemberId: string
  ): Promise<PartyGroupMembersPanelView> {
    const group = await this.requireGroup(context, partyGroupId);
    const member = await this.requireMemberForGroup(
      context,
      partyGroupId,
      partyGroupMemberId
    );

    if (
      !canExitMembership(member.statusCode as PartyGroupMemberStatusCode)
    ) {
      throw new PartyError(
        "INVALID_GROUP_MEMBER_TRANSITION",
        PARTY_USER_MESSAGES.INVALID_GROUP_MEMBER_TRANSITION,
        400
      );
    }

    await this.partyGroupMemberRepository.updateById(
      context.businessId,
      partyGroupMemberId,
      {
        statusCode: PARTY_GROUP_MEMBER_STATUS_CODES.EXITED,
        exitDate: member.exitDate ?? todayIsoDate(),
        updatedBy: context.platformUserId,
      }
    );

    await this.timelineService.recordEvent(
      buildTimelineEventFromContext(context, {
        partyId: member.partyId,
        eventType: PARTY_TIMELINE_EVENT_TYPES.GROUP_LEFT,
        eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.GROUPS,
        summary: `Left group — ${group.groupName}`,
        referenceEntity: "party_group_member",
        referenceId: partyGroupMemberId,
      })
    );

    await recordPartyEntityAudit(this.auditService, context, {
      partyId: member.partyId,
      entityName: AUDIT_ENTITY_NAMES.PARTY_GROUP_MEMBER,
      entityId: partyGroupMemberId,
      operation: inferAuditOperationFromEventType(
        PARTY_TIMELINE_EVENT_TYPES.GROUP_LEFT
      ),
      sourceModule: AUDIT_SOURCE_MODULES.PARTY_GROUPS,
    });

    return this.getGroupMembersPanel(context, partyGroupId);
  }

  async rejoinMember(
    context: CurrentBusinessContext,
    partyGroupId: string,
    partyGroupMemberId: string
  ): Promise<PartyGroupMembersPanelView> {
    const group = await this.requireGroup(context, partyGroupId);
    if (group.statusCode !== PARTY_GROUP_STATUS_CODES.ACTIVE) {
      throw new PartyError(
        "GROUP_INACTIVE",
        PARTY_USER_MESSAGES.GROUP_INACTIVE,
        400
      );
    }

    const member = await this.requireMemberForGroup(
      context,
      partyGroupId,
      partyGroupMemberId
    );

    if (
      !canRejoinMembership(member.statusCode as PartyGroupMemberStatusCode)
    ) {
      throw new PartyError(
        "INVALID_GROUP_MEMBER_TRANSITION",
        PARTY_USER_MESSAGES.INVALID_GROUP_MEMBER_TRANSITION,
        400
      );
    }

    const duplicate =
      await this.partyGroupMemberRepository.findActiveByGroupAndParty(
        context.businessId,
        partyGroupId,
        member.partyId
      );
    if (duplicate && duplicate.id !== partyGroupMemberId) {
      throw new PartyError(
        "DUPLICATE_ACTIVE_GROUP_MEMBERSHIP",
        PARTY_USER_MESSAGES.DUPLICATE_ACTIVE_GROUP_MEMBERSHIP,
        409
      );
    }

    await this.partyGroupMemberRepository.updateById(
      context.businessId,
      partyGroupMemberId,
      {
        statusCode: PARTY_GROUP_MEMBER_STATUS_CODES.ACTIVE,
        exitDate: null,
        updatedBy: context.platformUserId,
      }
    );

    await this.timelineService.recordEvent(
      buildTimelineEventFromContext(context, {
        partyId: member.partyId,
        eventType: PARTY_TIMELINE_EVENT_TYPES.GROUP_JOINED,
        eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.GROUPS,
        summary: `Rejoined group — ${group.groupName}`,
        referenceEntity: "party_group_member",
        referenceId: partyGroupMemberId,
      })
    );

    await recordPartyEntityAudit(this.auditService, context, {
      partyId: member.partyId,
      entityName: AUDIT_ENTITY_NAMES.PARTY_GROUP_MEMBER,
      entityId: partyGroupMemberId,
      operation: inferAuditOperationFromEventType(
        PARTY_TIMELINE_EVENT_TYPES.GROUP_JOINED
      ),
      sourceModule: AUDIT_SOURCE_MODULES.PARTY_GROUPS,
    });

    return this.getGroupMembersPanel(context, partyGroupId);
  }

  async searchGroups(
    context: CurrentBusinessContext,
    query: string
  ): Promise<PartyGroupSearchResultView[]> {
    const parsed = groupSearchQuerySchema.safeParse({ query });
    if (!parsed.success) {
      return [];
    }

    const [rows, groupTypes] = await Promise.all([
      this.partyGroupRepository.search(
        context.businessId,
        parsed.data.query
      ),
      this.referenceRepository.listActiveGroupTypes(),
    ]);

    const typeNameByCode = new Map(groupTypes.map((t) => [t.code, t.name]));

    return rows.map((row) => ({
      id: row.id,
      groupName: row.groupName,
      groupCode: row.groupCode,
      groupTypeName: typeNameByCode.get(row.groupTypeCode) ?? row.groupTypeCode,
    }));
  }

  private async insertMembership(
    context: CurrentBusinessContext,
    partyGroupId: string,
    partyId: string,
    payload: {
      membershipRoleCode: string;
      joinDate?: string;
      isPrimaryContact?: boolean;
      notes?: string;
    }
  ) {
    const party = await this.partyRepository.findById(
      context.businessId,
      partyId
    );
    if (!party) {
      throw new PartyError(
        "PARTY_NOT_FOUND",
        PARTY_USER_MESSAGES.PARTY_NOT_FOUND,
        404,
        "partyId"
      );
    }

    const role = await this.referenceRepository.findGroupMembershipRoleByCode(
      payload.membershipRoleCode
    );
    if (!role) {
      throw new PartyError(
        "INVALID_INPUT",
        "Select a valid membership role.",
        400,
        "membershipRoleCode"
      );
    }

    const duplicate =
      await this.partyGroupMemberRepository.findActiveByGroupAndParty(
        context.businessId,
        partyGroupId,
        partyId
      );
    if (duplicate) {
      throw new PartyError(
        "DUPLICATE_ACTIVE_GROUP_MEMBERSHIP",
        PARTY_USER_MESSAGES.DUPLICATE_ACTIVE_GROUP_MEMBERSHIP,
        409,
        "partyId"
      );
    }

    const joinDate = payload.joinDate?.trim() || todayIsoDate();

    const inserted = await this.partyGroupMemberRepository.insert({
      businessId: context.businessId,
      partyGroupId,
      partyId,
      membershipRoleCode: payload.membershipRoleCode,
      joinDate,
      statusCode: PARTY_GROUP_MEMBER_STATUS_CODES.ACTIVE,
      isPrimaryContact: payload.isPrimaryContact ?? false,
      notes: nullableTrimmed(payload.notes),
      createdBy: context.platformUserId,
      updatedBy: context.platformUserId,
    });

    if (payload.isPrimaryContact && inserted) {
      await this.clearOtherPrimaryContacts(
        context,
        partyGroupId,
        inserted.id
      );
    }
  }

  private async clearOtherPrimaryContacts(
    context: CurrentBusinessContext,
    partyGroupId: string,
    keepMemberId: string
  ) {
    const members = await this.partyGroupMemberRepository.listByGroupId(
      context.businessId,
      partyGroupId
    );

    for (const member of members) {
      if (
        member.id !== keepMemberId &&
        member.isPrimaryContact &&
        member.statusCode === PARTY_GROUP_MEMBER_STATUS_CODES.ACTIVE
      ) {
        await this.partyGroupMemberRepository.updateById(
          context.businessId,
          member.id,
          {
            isPrimaryContact: false,
            updatedBy: context.platformUserId,
          }
        );
      }
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
        PARTY_USER_MESSAGES.PARTY_NOT_FOUND,
        404
      );
    }
    return party;
  }

  private async requireGroup(
    context: CurrentBusinessContext,
    partyGroupId: string
  ) {
    const group = await this.partyGroupRepository.findById(
      context.businessId,
      partyGroupId
    );
    if (!group) {
      throw new PartyError(
        "PARTY_GROUP_NOT_FOUND",
        PARTY_USER_MESSAGES.PARTY_GROUP_NOT_FOUND,
        404
      );
    }
    return group;
  }

  private async requireMemberForGroup(
    context: CurrentBusinessContext,
    partyGroupId: string,
    partyGroupMemberId: string
  ) {
    const member = await this.partyGroupMemberRepository.findById(
      context.businessId,
      partyGroupMemberId
    );
    if (!member || member.partyGroupId !== partyGroupId) {
      throw new PartyError(
        "PARTY_GROUP_MEMBER_NOT_FOUND",
        PARTY_USER_MESSAGES.PARTY_GROUP_MEMBER_NOT_FOUND,
        404
      );
    }
    return member;
  }

  private async requireMemberForParty(
    context: CurrentBusinessContext,
    partyId: string,
    partyGroupMemberId: string
  ) {
    const member = await this.partyGroupMemberRepository.findById(
      context.businessId,
      partyGroupMemberId
    );
    if (!member || member.partyId !== partyId) {
      throw new PartyError(
        "PARTY_GROUP_MEMBER_NOT_FOUND",
        PARTY_USER_MESSAGES.PARTY_GROUP_MEMBER_NOT_FOUND,
        404
      );
    }
    return member;
  }

  private toGroupSummary(
    group: {
      id: string;
      groupName: string;
      groupCode: string;
      groupTypeCode: string;
      statusCode: string;
      countryCode: string | null;
    },
    typeNameByCode: Map<string, string>,
    memberCounts: Map<string, number>
  ): PartyGroupSummaryView {
    const statusCode = isPartyGroupStatusCode(group.statusCode)
      ? group.statusCode
      : PARTY_GROUP_STATUS_CODES.ACTIVE;

    return {
      id: group.id,
      groupName: group.groupName,
      groupCode: group.groupCode,
      groupTypeCode: group.groupTypeCode,
      groupTypeName: typeNameByCode.get(group.groupTypeCode) ?? group.groupTypeCode,
      statusCode,
      memberCount: memberCounts.get(group.id) ?? 0,
      countryCode: group.countryCode,
    };
  }

  private toMemberView(
    row: {
      id: string;
      partyGroupId: string;
      partyId: string;
      membershipRoleCode: string;
      joinDate: string;
      exitDate: string | null;
      statusCode: string;
      isPrimaryContact: boolean;
      notes: string | null;
    },
    partyById: Map<
      string,
      {
        id: string;
        partyNumber: string;
        displayName: string;
        partyTypeCode: string;
      }
    >,
    roleNameByCode: Map<string, string>,
    partyTypeNameByCode: Map<string, string>
  ): PartyGroupMemberView {
    const party = partyById.get(row.partyId);
    const statusCode = isPartyGroupMemberStatusCode(row.statusCode)
      ? row.statusCode
      : PARTY_GROUP_MEMBER_STATUS_CODES.ACTIVE;

    return {
      id: row.id,
      partyGroupId: row.partyGroupId,
      partyId: row.partyId,
      partyNumber: party?.partyNumber ?? "—",
      partyName: party?.displayName ?? "Unknown party",
      partyTypeCode: (party?.partyTypeCode ?? "INDIVIDUAL") as PartyTypeCode,
      partyTypeName:
        partyTypeNameByCode.get(party?.partyTypeCode ?? "") ??
        party?.partyTypeCode ??
        "—",
      membershipRoleCode: row.membershipRoleCode,
      membershipRoleName:
        roleNameByCode.get(row.membershipRoleCode) ?? row.membershipRoleCode,
      joinDate: row.joinDate,
      exitDate: row.exitDate,
      statusCode,
      isPrimaryContact: row.isPrimaryContact,
      notes: row.notes,
    };
  }
}

export function createPartyGroupService(): PartyGroupService {
  return new PartyGroupService();
}
