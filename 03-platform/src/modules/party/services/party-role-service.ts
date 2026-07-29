/**
 * Purpose:
 * Party Role Management — assign, end, reactivate, and set primary roles.
 *
 * Architecture:
 * Server Actions → PartyRoleService → Repositories → Drizzle
 *
 * Implementation Package:
 * BP-002 / IP-002 – Party Roles
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  AUDIT_ENTITY_NAMES,
  AUDIT_OPERATIONS,
  AUDIT_SOURCE_MODULES,
  createAuditService,
} from "@/core/audit";
import {
  buildTimelineEventFromContext,
  createPartyTimelineService,
  PARTY_TIMELINE_EVENT_CATEGORIES,
  PARTY_TIMELINE_EVENT_TYPES,
} from "@/core/party-timeline";
import { getDb } from "@/db/client";
import {
  PARTY_ROLE_STATUS_CODES,
  type PartyRoleStatusCode,
} from "@/modules/party/constants";
import { PartyError, PARTY_USER_MESSAGES } from "@/modules/party/errors";
import { createPartyReferenceRepository } from "@/modules/party/repositories/party-reference-repository";
import { createPartyRepository } from "@/modules/party/repositories/party-repository";
import { createPartyRoleRepository } from "@/modules/party/repositories/party-role-repository";
import {
  canEndPartyRole,
  canReactivatePartyRole,
  canSetPrimaryRole,
  shouldAssignAsPrimary,
  todayIsoDate,
  wouldDuplicateActiveRole,
} from "@/modules/party/services/party-role-rules";
import { recordPartyEntityAudit } from "@/modules/party/services/party-audit-helper";
import type {
  AssignPartyRolePayload,
  PartyRoleCountView,
  PartyRolesPanelView,
  PartyRoleView,
  UpdatePartyRolePayload,
} from "@/modules/party/types";
import {
  assignPartyRoleSchema,
  updatePartyRoleSchema,
} from "@/modules/party/validators/party-role-validators";

export class PartyRoleService {
  constructor(
    private readonly partyRepository = createPartyRepository(),
    private readonly partyRoleRepository = createPartyRoleRepository(),
    private readonly referenceRepository = createPartyReferenceRepository(),
    private readonly timelineService = createPartyTimelineService(),
    private readonly auditService = createAuditService()
  ) {}

  async getPartyRoles(
    context: CurrentBusinessContext,
    partyId: string
  ): Promise<PartyRolesPanelView> {
    await this.requireParty(context, partyId);

    const [rows, roleTypes] = await Promise.all([
      this.partyRoleRepository.listByPartyId(context.businessId, partyId),
      this.referenceRepository.listActiveRoleTypes(),
    ]);

    if (roleTypes.length === 0) {
      throw new PartyError(
        "REFERENCE_DATA_MISSING",
        "Role Type catalogue is empty. Seed Party Role catalogues before continuing.",
        503
      );
    }

    const nameByCode = new Map(roleTypes.map((r) => [r.code, r.name]));
    const views = rows.map((row) => this.toView(row, nameByCode));

    const activeRoles = views.filter(
      (role) => role.statusCode === PARTY_ROLE_STATUS_CODES.ACTIVE
    );
    const historyRoles = views.filter(
      (role) => role.statusCode === PARTY_ROLE_STATUS_CODES.ENDED
    );

    const activeCodes = new Set(activeRoles.map((role) => role.roleTypeCode));
    const availableRoleTypes = roleTypes.filter(
      (roleType) => !activeCodes.has(roleType.code)
    );

    return { activeRoles, historyRoles, availableRoleTypes };
  }

  async assignRole(
    context: CurrentBusinessContext,
    partyId: string,
    payload: AssignPartyRolePayload
  ): Promise<PartyRolesPanelView> {
    const parsed = assignPartyRoleSchema.safeParse(payload);
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

    const roleType = await this.referenceRepository.findRoleTypeByCode(
      parsed.data.roleTypeCode
    );
    if (!roleType) {
      throw new PartyError(
        "INVALID_INPUT",
        "Select a valid role type.",
        400,
        "roleTypeCode"
      );
    }

    const activeRoles = await this.partyRoleRepository.listByPartyId(
      context.businessId,
      partyId
    );
    const activeCodes = activeRoles
      .filter((row) => row.statusCode === PARTY_ROLE_STATUS_CODES.ACTIVE)
      .map((row) => row.roleTypeCode);

    if (wouldDuplicateActiveRole(activeCodes, parsed.data.roleTypeCode)) {
      throw new PartyError(
        "DUPLICATE_ACTIVE_ROLE",
        PARTY_USER_MESSAGES.DUPLICATE_ACTIVE_ROLE,
        409,
        "roleTypeCode"
      );
    }

    const makePrimary = shouldAssignAsPrimary(
      activeCodes.length,
      parsed.data.isPrimary
    );

    const db = getDb();
    let insertedRoleId = "";
    await db.transaction(async (tx) => {
      if (makePrimary) {
        await this.partyRoleRepository.clearPrimaryForParty(
          context.businessId,
          partyId,
          tx
        );
      }

      const inserted = await this.partyRoleRepository.insert(
        {
          businessId: context.businessId,
          partyId,
          roleTypeCode: parsed.data.roleTypeCode,
          statusCode: PARTY_ROLE_STATUS_CODES.ACTIVE,
          isPrimary: makePrimary,
          effectiveDate: parsed.data.effectiveDate?.trim() || todayIsoDate(),
          endDate: null,
          createdBy: context.platformUserId,
          updatedBy: context.platformUserId,
        },
        tx
      );
      insertedRoleId = inserted.id;
    });

    await this.timelineService.recordEvent(
      buildTimelineEventFromContext(context, {
        partyId,
        eventType: PARTY_TIMELINE_EVENT_TYPES.ROLE_ASSIGNED,
        eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.REGISTRATION,
        summary: `${roleType.name} role assigned`,
        referenceEntity: "party_role",
      })
    );

    await recordPartyEntityAudit(this.auditService, context, {
      partyId,
      entityName: AUDIT_ENTITY_NAMES.PARTY_ROLE,
      entityId: insertedRoleId,
      operation: AUDIT_OPERATIONS.CREATE,
      sourceModule: AUDIT_SOURCE_MODULES.PARTY_ROLES,
      createValues: {
        roleTypeCode: parsed.data.roleTypeCode,
        statusCode: PARTY_ROLE_STATUS_CODES.ACTIVE,
        isPrimary: makePrimary,
        effectiveDate: parsed.data.effectiveDate?.trim() || todayIsoDate(),
      },
    });

    return this.getPartyRoles(context, partyId);
  }

  /**
   * WHAT: End (remove) an active role while retaining history.
   * WHY: No physical deletion — ACTIVE → ENDED with end date.
   */
  async removeRole(
    context: CurrentBusinessContext,
    partyId: string,
    partyRoleId: string
  ): Promise<PartyRolesPanelView> {
    return this.endRole(context, partyId, partyRoleId);
  }

  async endRole(
    context: CurrentBusinessContext,
    partyId: string,
    partyRoleId: string,
    endDate?: string
  ): Promise<PartyRolesPanelView> {
    await this.requireParty(context, partyId);
    const role = await this.requireRole(context, partyId, partyRoleId);

    if (!canEndPartyRole(role.statusCode as PartyRoleStatusCode)) {
      throw new PartyError(
        "INVALID_ROLE_TRANSITION",
        PARTY_USER_MESSAGES.INVALID_ROLE_TRANSITION,
        400
      );
    }

    const endDateValue = endDate?.trim() || todayIsoDate();

    await this.partyRoleRepository.updateById(context.businessId, partyRoleId, {
      statusCode: PARTY_ROLE_STATUS_CODES.ENDED,
      isPrimary: false,
      endDate: endDateValue,
      updatedBy: context.platformUserId,
    });

    const roleType = await this.referenceRepository.findRoleTypeByCode(
      role.roleTypeCode
    );
    await this.timelineService.recordEvent(
      buildTimelineEventFromContext(context, {
        partyId,
        eventType: PARTY_TIMELINE_EVENT_TYPES.ROLE_REMOVED,
        eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.REGISTRATION,
        summary: `${roleType?.name ?? role.roleTypeCode} role removed`,
        referenceEntity: "party_role",
        referenceId: partyRoleId,
      })
    );

    await recordPartyEntityAudit(this.auditService, context, {
      partyId,
      entityName: AUDIT_ENTITY_NAMES.PARTY_ROLE,
      entityId: partyRoleId,
      operation: AUDIT_OPERATIONS.DEACTIVATE,
      sourceModule: AUDIT_SOURCE_MODULES.PARTY_ROLES,
      before: {
        statusCode: role.statusCode,
        isPrimary: role.isPrimary,
        endDate: role.endDate,
      },
      after: {
        statusCode: PARTY_ROLE_STATUS_CODES.ENDED,
        isPrimary: false,
        endDate: endDateValue,
      },
    });

    await this.ensurePrimaryIfNeeded(context, partyId);
    return this.getPartyRoles(context, partyId);
  }

  async reactivateRole(
    context: CurrentBusinessContext,
    partyId: string,
    partyRoleId: string
  ): Promise<PartyRolesPanelView> {
    await this.requireParty(context, partyId);
    const role = await this.requireRole(context, partyId, partyRoleId);

    if (!canReactivatePartyRole(role.statusCode as PartyRoleStatusCode)) {
      throw new PartyError(
        "INVALID_ROLE_TRANSITION",
        PARTY_USER_MESSAGES.INVALID_ROLE_TRANSITION,
        400
      );
    }

    const duplicate =
      await this.partyRoleRepository.findActiveByPartyAndRoleType(
        context.businessId,
        partyId,
        role.roleTypeCode
      );
    if (duplicate) {
      throw new PartyError(
        "DUPLICATE_ACTIVE_ROLE",
        PARTY_USER_MESSAGES.DUPLICATE_ACTIVE_ROLE,
        409
      );
    }

    const activeCount = await this.partyRoleRepository.countActiveRolesForParty(
      context.businessId,
      partyId
    );
    const makePrimary = activeCount === 0;

    const db = getDb();
    await db.transaction(async (tx) => {
      if (makePrimary) {
        await this.partyRoleRepository.clearPrimaryForParty(
          context.businessId,
          partyId,
          tx
        );
      }

      await this.partyRoleRepository.updateById(
        context.businessId,
        partyRoleId,
        {
          statusCode: PARTY_ROLE_STATUS_CODES.ACTIVE,
          isPrimary: makePrimary,
          endDate: null,
          updatedBy: context.platformUserId,
        },
        tx
      );
    });

    const roleType = await this.referenceRepository.findRoleTypeByCode(
      role.roleTypeCode
    );
    await this.timelineService.recordEvent(
      buildTimelineEventFromContext(context, {
        partyId,
        eventType: PARTY_TIMELINE_EVENT_TYPES.ROLE_ASSIGNED,
        eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.REGISTRATION,
        summary: `${roleType?.name ?? role.roleTypeCode} role reactivated`,
        referenceEntity: "party_role",
        referenceId: partyRoleId,
      })
    );

    await recordPartyEntityAudit(this.auditService, context, {
      partyId,
      entityName: AUDIT_ENTITY_NAMES.PARTY_ROLE,
      entityId: partyRoleId,
      operation: AUDIT_OPERATIONS.ACTIVATE,
      sourceModule: AUDIT_SOURCE_MODULES.PARTY_ROLES,
      before: {
        statusCode: role.statusCode,
        isPrimary: role.isPrimary,
        endDate: role.endDate,
      },
      after: {
        statusCode: PARTY_ROLE_STATUS_CODES.ACTIVE,
        isPrimary: makePrimary,
        endDate: null,
      },
    });

    return this.getPartyRoles(context, partyId);
  }

  async changePrimaryRole(
    context: CurrentBusinessContext,
    partyId: string,
    partyRoleId: string
  ): Promise<PartyRolesPanelView> {
    await this.requireParty(context, partyId);
    const role = await this.requireRole(context, partyId, partyRoleId);

    if (!canSetPrimaryRole(role.statusCode as PartyRoleStatusCode)) {
      throw new PartyError(
        "INVALID_ROLE_TRANSITION",
        "Only an active role can be set as primary.",
        400
      );
    }

    const db = getDb();
    await db.transaction(async (tx) => {
      await this.partyRoleRepository.clearPrimaryForParty(
        context.businessId,
        partyId,
        tx
      );
      await this.partyRoleRepository.updateById(
        context.businessId,
        partyRoleId,
        {
          isPrimary: true,
          updatedBy: context.platformUserId,
        },
        tx
      );
    });

    const roleType = await this.referenceRepository.findRoleTypeByCode(
      role.roleTypeCode
    );
    await this.timelineService.recordEvent(
      buildTimelineEventFromContext(context, {
        partyId,
        eventType: PARTY_TIMELINE_EVENT_TYPES.ROLE_PRIMARY_SET,
        eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.REGISTRATION,
        summary: `${roleType?.name ?? role.roleTypeCode} set as primary role`,
        referenceEntity: "party_role",
        referenceId: partyRoleId,
      })
    );

    await recordPartyEntityAudit(this.auditService, context, {
      partyId,
      entityName: AUDIT_ENTITY_NAMES.PARTY_ROLE,
      entityId: partyRoleId,
      operation: AUDIT_OPERATIONS.UPDATE,
      sourceModule: AUDIT_SOURCE_MODULES.PARTY_ROLES,
      before: { isPrimary: role.isPrimary },
      after: { isPrimary: true },
    });

    return this.getPartyRoles(context, partyId);
  }

  async updateRole(
    context: CurrentBusinessContext,
    partyId: string,
    partyRoleId: string,
    payload: UpdatePartyRolePayload
  ): Promise<PartyRolesPanelView> {
    // Honor primary intent from the raw payload before generic field updates.
    // A missing/stripped isPrimary on the shared update path previously fell
    // through to an updatedBy-only write (HTTP 200) without changing primary.
    if (payload.isPrimary === true) {
      return this.changePrimaryRole(context, partyId, partyRoleId);
    }

    const parsed = updatePartyRoleSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new PartyError(
        "INVALID_INPUT",
        first?.message ?? PARTY_USER_MESSAGES.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    if (parsed.data.reactivate) {
      return this.reactivateRole(context, partyId, partyRoleId);
    }

    if (parsed.data.isPrimary === true) {
      return this.changePrimaryRole(context, partyId, partyRoleId);
    }

    await this.requireParty(context, partyId);
    const roleBefore = await this.requireRole(context, partyId, partyRoleId);

    await this.partyRoleRepository.updateById(context.businessId, partyRoleId, {
      ...(parsed.data.effectiveDate?.trim()
        ? { effectiveDate: parsed.data.effectiveDate.trim() }
        : {}),
      ...(parsed.data.endDate !== undefined
        ? {
            endDate:
              parsed.data.endDate === null || parsed.data.endDate === ""
                ? null
                : parsed.data.endDate,
          }
        : {}),
      updatedBy: context.platformUserId,
    });

    const roleAfter = await this.requireRole(context, partyId, partyRoleId);
    const roleType = await this.referenceRepository.findRoleTypeByCode(
      roleAfter.roleTypeCode
    );
    await this.timelineService.recordEvent(
      buildTimelineEventFromContext(context, {
        partyId,
        eventType: PARTY_TIMELINE_EVENT_TYPES.ROLE_UPDATED,
        eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.REGISTRATION,
        summary: `${roleType?.name ?? roleAfter.roleTypeCode} role updated`,
        referenceEntity: "party_role",
        referenceId: partyRoleId,
      })
    );

    await recordPartyEntityAudit(this.auditService, context, {
      partyId,
      entityName: AUDIT_ENTITY_NAMES.PARTY_ROLE,
      entityId: partyRoleId,
      operation: AUDIT_OPERATIONS.UPDATE,
      sourceModule: AUDIT_SOURCE_MODULES.PARTY_ROLES,
      before: {
        effectiveDate: roleBefore.effectiveDate,
        endDate: roleBefore.endDate,
      },
      after: {
        effectiveDate: roleAfter.effectiveDate,
        endDate: roleAfter.endDate,
      },
    });

    return this.getPartyRoles(context, partyId);
  }

  async getRoleCountsForBusiness(
    context: CurrentBusinessContext
  ): Promise<PartyRoleCountView[]> {
    const rows =
      await this.partyRoleRepository.countActiveByRoleTypeForBusiness(
        context.businessId
      );

    return rows.map((row) => ({
      roleTypeCode: row.roleTypeCode,
      roleTypeName: row.roleTypeName,
      count: Number(row.value),
    }));
  }

  private async requireParty(
    context: CurrentBusinessContext,
    partyId: string
  ) {
    const party = await this.partyRepository.findByIdIncludingArchived(
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

  private async requireRole(
    context: CurrentBusinessContext,
    partyId: string,
    partyRoleId: string
  ) {
    const role = await this.partyRoleRepository.findById(
      context.businessId,
      partyRoleId
    );
    if (!role || role.partyId !== partyId) {
      throw new PartyError(
        "PARTY_ROLE_NOT_FOUND",
        PARTY_USER_MESSAGES.PARTY_ROLE_NOT_FOUND,
        404
      );
    }
    return role;
  }

  private async ensurePrimaryIfNeeded(
    context: CurrentBusinessContext,
    partyId: string
  ) {
    const rows = await this.partyRoleRepository.listByPartyId(
      context.businessId,
      partyId
    );
    const active = rows.filter(
      (row) => row.statusCode === PARTY_ROLE_STATUS_CODES.ACTIVE
    );
    if (active.length === 0) {
      return;
    }
    if (active.some((row) => row.isPrimary)) {
      return;
    }

    await this.partyRoleRepository.updateById(context.businessId, active[0].id, {
      isPrimary: true,
      updatedBy: context.platformUserId,
    });
  }

  private toView(
    row: {
      id: string;
      partyId: string;
      roleTypeCode: string;
      statusCode: string;
      isPrimary: boolean;
      effectiveDate: string;
      endDate: string | null;
    },
    nameByCode: Map<string, string>
  ): PartyRoleView {
    return {
      id: row.id,
      partyId: row.partyId,
      roleTypeCode: row.roleTypeCode,
      roleTypeName: nameByCode.get(row.roleTypeCode) ?? row.roleTypeCode,
      statusCode: row.statusCode as PartyRoleStatusCode,
      isPrimary: row.isPrimary,
      effectiveDate: row.effectiveDate,
      endDate: row.endDate,
    };
  }
}

export function createPartyRoleService(): PartyRoleService {
  return new PartyRoleService();
}
