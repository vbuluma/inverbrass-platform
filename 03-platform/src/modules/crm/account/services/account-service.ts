/**
 * Purpose:
 * Account & Contact Management orchestration.
 *
 * Implementation Package:
 * BP-004 / IP-04 – Customer & Contact Management
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
  PARTY_TIMELINE_SOURCE_MODULES,
} from "@/core/party-timeline";
import {
  createWorkAssignmentService,
  WORK_ASSIGNMENT_TYPES,
  WORK_OWNER_TYPES,
  WORK_SUBJECT_TYPES,
} from "@/core/work-assignment-sla";
import { createPartyCommunicationPreferenceService } from "@/modules/party/services/party-communication-preference-service";
import { createCrmRecordRepository } from "@/modules/crm/repositories/crm-record-repository";
import { createCrmReferenceRepository } from "@/modules/crm/repositories/crm-reference-repository";
import { recordCrmEntityAudit } from "@/modules/crm/services/crm-audit-helper";
import {
  ACCOUNT_DEFAULT_PAGE_SIZE,
  ACCOUNT_STATUS_CODES,
  INFLUENCE_LEVEL_CODES,
} from "@/modules/crm/account/constants";
import { AccountError, ACCOUNT_USER_MESSAGES } from "@/modules/crm/account/errors";
import { createAccountReferenceRepository } from "@/modules/crm/account/repositories/account-reference-repository";
import {
  createAccountRepository,
  type AccountJoinedRow,
  type AccountRepository,
} from "@/modules/crm/account/repositories/account-repository";
import {
  formatAccountNumber,
  isAccountEditable,
  isAccountStatusCode,
  isWithinHierarchyDepth,
  wouldCreateCircularHierarchy,
} from "@/modules/crm/account/services/account-rules";
import type {
  AccountContactView,
  AccountDashboardView,
  AccountDetailView,
  AccountHierarchyWidgetSummary,
  AccountListFilters,
  AccountListView,
  AccountRegistrationCatalogues,
  AccountSummaryView,
  AssignAccountContactPayload,
  CreateAccountPayload,
  UpdateAccountContactPayload,
  UpdateAccountPayload,
} from "@/modules/crm/account/types";
import {
  accountListFiltersSchema,
  accountSearchQuerySchema,
  assignAccountContactSchema,
  createAccountSchema,
  updateAccountContactSchema,
  updateAccountSchema,
} from "@/modules/crm/account/validators/account-validators";

export class AccountService {
  constructor(
    private readonly accountRepository = createAccountRepository(),
    private readonly referenceRepository = createAccountReferenceRepository(),
    private readonly crmReferenceRepository = createCrmReferenceRepository(),
    private readonly crmRepository = createCrmRecordRepository(),
    private readonly timelineService = createPartyTimelineService(),
    private readonly auditService = createAuditService(),
    private readonly workAssignmentService = createWorkAssignmentService(),
    private readonly communicationPreferenceService = createPartyCommunicationPreferenceService()
  ) {}

  async getRegistrationCatalogues(
    context: CurrentBusinessContext
  ): Promise<AccountRegistrationCatalogues> {
    const [accountTypes, accountStatuses, contactRoles, branches, ownerParties] =
      await Promise.all([
        this.referenceRepository.listActiveAccountTypes(),
        this.referenceRepository.listActiveAccountStatuses(),
        this.referenceRepository.listActiveContactRoles(),
        this.crmReferenceRepository.listBranchOptions(context.businessId),
        this.crmReferenceRepository.listOwnerPartyOptions(context.businessId),
      ]);

    if (accountTypes.length === 0 || accountStatuses.length === 0) {
      throw new AccountError(
        "REFERENCE_DATA_MISSING",
        ACCOUNT_USER_MESSAGES.REFERENCE_DATA_MISSING,
        503
      );
    }

    return {
      accountTypes,
      accountStatuses,
      contactRoles,
      branches,
      ownerParties,
      influenceLevels: Object.entries(INFLUENCE_LEVEL_CODES).map(([code, value]) => ({
        code: value,
        name: code.charAt(0) + code.slice(1).toLowerCase(),
      })),
    };
  }

  async getDashboard(context: CurrentBusinessContext): Promise<AccountDashboardView> {
    const [
      totalAccounts,
      activeCount,
      prospectCount,
      inactiveCount,
      recentRows,
      typeGroups,
      types,
    ] = await Promise.all([
      this.accountRepository.countByBusinessId(context.businessId),
      this.accountRepository.countByStatus(
        context.businessId,
        ACCOUNT_STATUS_CODES.ACTIVE
      ),
      this.accountRepository.countByStatus(
        context.businessId,
        ACCOUNT_STATUS_CODES.PROSPECT
      ),
      this.accountRepository.countByStatus(
        context.businessId,
        ACCOUNT_STATUS_CODES.INACTIVE
      ),
      this.accountRepository.listRecentlyUpdated(context.businessId, 8),
      this.accountRepository.countGroupedByType(context.businessId),
      this.referenceRepository.listActiveAccountTypes(),
    ]);

    const typeNameByCode = new Map(types.map((t) => [t.code, t.name]));
    const recentlyUpdated = await Promise.all(
      recentRows.map((row) => this.toSummaryView(context, row))
    );

    return {
      totalAccounts,
      activeCount,
      prospectCount,
      inactiveCount,
      recentlyUpdated,
      typeSummary: typeGroups.map((group) => ({
        typeCode: group.typeCode,
        typeName: typeNameByCode.get(group.typeCode) ?? group.typeCode,
        count: Number(group.total),
      })),
    };
  }

  async createAccount(
    context: CurrentBusinessContext,
    payload: CreateAccountPayload
  ): Promise<AccountDetailView> {
    const parsed = createAccountSchema.safeParse(payload);
    if (!parsed.success) {
      throw new AccountError(
        "INVALID_INPUT",
        parsed.error.issues[0]?.message ?? "Invalid account input.",
        400
      );
    }

    const input = parsed.data;

    if (!(await this.referenceRepository.isActiveAccountType(input.accountTypeCode))) {
      throw new AccountError("INVALID_INPUT", "The selected account type is invalid.", 400);
    }

    const statusCode = input.statusCode ?? ACCOUNT_STATUS_CODES.PROSPECT;
    if (
      !isAccountStatusCode(statusCode) ||
      !(await this.referenceRepository.isActiveAccountStatus(statusCode))
    ) {
      throw new AccountError("INVALID_INPUT", "The selected account status is invalid.", 400);
    }

    const duplicate = await this.accountRepository.findByName(
      context.businessId,
      input.name
    );
    if (duplicate) {
      throw new AccountError(
        "DUPLICATE_ACCOUNT_NAME",
        ACCOUNT_USER_MESSAGES.DUPLICATE_ACCOUNT_NAME,
        409
      );
    }

    if (input.partyId) {
      const party = await this.crmReferenceRepository.findParty(
        context.businessId,
        input.partyId
      );
      if (!party) {
        throw new AccountError("PARTY_NOT_FOUND", "The selected party was not found.", 404);
      }
    }

    if (input.crmRecordId) {
      const crm = await this.crmRepository.findByIdJoined(
        context.businessId,
        input.crmRecordId
      );
      if (!crm) {
        throw new AccountError(
          "INVALID_INPUT",
          "The selected customer record was not found.",
          404
        );
      }
    }

    await this.assertValidParent(context, null, input.parentAccountId ?? null);

    const sequence = await this.accountRepository.nextAccountSequence(context.businessId);
    const row = await this.accountRepository.insert({
      businessId: context.businessId,
      accountNumber: formatAccountNumber(sequence),
      name: input.name,
      accountTypeCode: input.accountTypeCode,
      statusCode,
      partyId: input.partyId ?? null,
      crmRecordId: input.crmRecordId ?? null,
      parentAccountId: input.parentAccountId ?? null,
      ownerPartyId: input.ownerPartyId ?? null,
      branchId: input.branchId ?? null,
      segmentCode: input.segmentCode ?? null,
      classificationTags: input.classificationTags ?? null,
      notes: input.notes ?? null,
      createdBy: context.platformUserId,
      updatedBy: context.platformUserId,
    });

    if (row.ownerPartyId) {
      await this.workAssignmentService.assign(context, {
        subjectType: WORK_SUBJECT_TYPES.CRM_ACCOUNT,
        subjectId: row.id,
        ownerType: WORK_OWNER_TYPES.PARTY,
        ownerId: row.ownerPartyId,
        ownerPartyId: row.ownerPartyId,
        assignmentType: WORK_ASSIGNMENT_TYPES.MANUAL,
        reasonCode: "INITIAL_OWNER",
      });
    }

    const timelinePartyId = row.partyId;
    if (timelinePartyId) {
      await this.timelineService.recordEvent(
        buildTimelineEventFromContext(context, {
          partyId: timelinePartyId,
          eventType: PARTY_TIMELINE_EVENT_TYPES.ACCOUNT_CREATED,
          eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.LIFECYCLE,
          sourceModule: PARTY_TIMELINE_SOURCE_MODULES.CRM,
          summary: `Account created — ${row.accountNumber}`,
          referenceEntity: AUDIT_ENTITY_NAMES.CRM_ACCOUNT,
          referenceId: row.id,
          metadata: { accountNumber: row.accountNumber, name: row.name },
        })
      );
    }

    await recordCrmEntityAudit(this.auditService, context, {
      partyId: row.partyId ?? context.platformUserId,
      entityName: AUDIT_ENTITY_NAMES.CRM_ACCOUNT,
      entityId: row.id,
      operation: AUDIT_OPERATIONS.CREATE,
      sourceModule: AUDIT_SOURCE_MODULES.CRM_MANAGEMENT,
      createValues: {
        accountNumber: row.accountNumber,
        name: row.name,
        accountTypeCode: row.accountTypeCode,
        statusCode: row.statusCode,
      },
    });

    return this.getAccount(context, row.id);
  }

  async getAccount(
    context: CurrentBusinessContext,
    accountId: string
  ): Promise<AccountDetailView> {
    const row = await this.requireAccount(context, accountId);
    return this.toDetailView(context, row);
  }

  async listAccounts(
    context: CurrentBusinessContext,
    filters: AccountListFilters
  ): Promise<AccountListView> {
    const parsed = accountListFiltersSchema.safeParse(filters);
    if (!parsed.success) {
      throw new AccountError(
        "INVALID_INPUT",
        parsed.error.issues[0]?.message ?? "Invalid list filters.",
        400
      );
    }

    const limit = parsed.data.limit ?? ACCOUNT_DEFAULT_PAGE_SIZE;
    const offset = parsed.data.offset ?? 0;
    const { items, total } = await this.accountRepository.listByFilters(
      context.businessId,
      { ...parsed.data, limit, offset }
    );

    return {
      items: await Promise.all(items.map((row) => this.toSummaryView(context, row))),
      total,
      limit,
      offset,
    };
  }

  async searchAccounts(
    context: CurrentBusinessContext,
    query: string
  ): Promise<AccountSummaryView[]> {
    const parsed = accountSearchQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new AccountError(
        "INVALID_INPUT",
        parsed.error.issues[0]?.message ?? "Invalid search query.",
        400
      );
    }

    const { items } = await this.accountRepository.listByFilters(context.businessId, {
      search: parsed.data,
      limit: 25,
    });

    return Promise.all(items.map((row) => this.toSummaryView(context, row)));
  }

  async updateAccount(
    context: CurrentBusinessContext,
    accountId: string,
    payload: UpdateAccountPayload
  ): Promise<AccountDetailView> {
    const parsed = updateAccountSchema.safeParse(payload);
    if (!parsed.success) {
      throw new AccountError(
        "INVALID_INPUT",
        parsed.error.issues[0]?.message ?? "Invalid account input.",
        400
      );
    }

    const existing = await this.requireAccount(context, accountId);
    if (!isAccountEditable(existing.statusCode)) {
      throw new AccountError(
        "ACCOUNT_READ_ONLY",
        ACCOUNT_USER_MESSAGES.ACCOUNT_READ_ONLY,
        409
      );
    }

    if (
      parsed.data.accountTypeCode &&
      !(await this.referenceRepository.isActiveAccountType(parsed.data.accountTypeCode))
    ) {
      throw new AccountError("INVALID_INPUT", "The selected account type is invalid.", 400);
    }

    if (
      parsed.data.statusCode &&
      (!(await this.referenceRepository.isActiveAccountStatus(parsed.data.statusCode)) ||
        !isAccountStatusCode(parsed.data.statusCode))
    ) {
      throw new AccountError("INVALID_INPUT", "The selected account status is invalid.", 400);
    }

    if (parsed.data.name && parsed.data.name !== existing.name) {
      const duplicate = await this.accountRepository.findByName(
        context.businessId,
        parsed.data.name,
        accountId
      );
      if (duplicate) {
        throw new AccountError(
          "DUPLICATE_ACCOUNT_NAME",
          ACCOUNT_USER_MESSAGES.DUPLICATE_ACCOUNT_NAME,
          409
        );
      }
    }

    if (parsed.data.parentAccountId !== undefined) {
      await this.assertValidParent(
        context,
        accountId,
        parsed.data.parentAccountId ?? null
      );
    }

    const updated = await this.accountRepository.updateById(
      context.businessId,
      accountId,
      {
        name: parsed.data.name,
        accountTypeCode: parsed.data.accountTypeCode,
        statusCode: parsed.data.statusCode,
        partyId: parsed.data.partyId,
        crmRecordId: parsed.data.crmRecordId,
        parentAccountId: parsed.data.parentAccountId,
        ownerPartyId: parsed.data.ownerPartyId,
        branchId: parsed.data.branchId,
        segmentCode: parsed.data.segmentCode,
        classificationTags: parsed.data.classificationTags,
        notes: parsed.data.notes,
        updatedBy: context.platformUserId,
      },
      parsed.data.version
    );

    if (!updated) {
      throw new AccountError(
        "VERSION_CONFLICT",
        "This account was updated by someone else. Refresh and try again.",
        409
      );
    }

    if (
      parsed.data.ownerPartyId !== undefined &&
      parsed.data.ownerPartyId !== existing.ownerPartyId &&
      parsed.data.ownerPartyId
    ) {
      await this.workAssignmentService.assign(context, {
        subjectType: WORK_SUBJECT_TYPES.CRM_ACCOUNT,
        subjectId: accountId,
        ownerType: WORK_OWNER_TYPES.PARTY,
        ownerId: parsed.data.ownerPartyId,
        ownerPartyId: parsed.data.ownerPartyId,
        assignmentType: WORK_ASSIGNMENT_TYPES.MANUAL,
        reasonCode: "REASSIGN",
      });

      if (existing.partyId) {
        await this.timelineService.recordEvent(
          buildTimelineEventFromContext(context, {
            partyId: existing.partyId,
            eventType: PARTY_TIMELINE_EVENT_TYPES.ACCOUNT_OWNER_CHANGED,
            eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.LIFECYCLE,
            sourceModule: PARTY_TIMELINE_SOURCE_MODULES.CRM,
            summary: `Account owner changed — ${existing.accountNumber}`,
            referenceEntity: AUDIT_ENTITY_NAMES.CRM_ACCOUNT,
            referenceId: accountId,
          })
        );
      }
    }

    return this.getAccount(context, accountId);
  }

  async assignContact(
    context: CurrentBusinessContext,
    accountId: string,
    payload: AssignAccountContactPayload
  ): Promise<AccountDetailView> {
    const parsed = assignAccountContactSchema.safeParse(payload);
    if (!parsed.success) {
      throw new AccountError(
        "INVALID_INPUT",
        parsed.error.issues[0]?.message ?? "Invalid contact role input.",
        400
      );
    }

    const account = await this.requireAccount(context, accountId);
    if (!isAccountEditable(account.statusCode)) {
      throw new AccountError(
        "ACCOUNT_READ_ONLY",
        ACCOUNT_USER_MESSAGES.ACCOUNT_READ_ONLY,
        409
      );
    }

    const contactParty = await this.crmReferenceRepository.findParty(
      context.businessId,
      parsed.data.contactPartyId
    );
    if (!contactParty) {
      throw new AccountError("PARTY_NOT_FOUND", "The selected contact party was not found.", 404);
    }

    if (!(await this.referenceRepository.isActiveContactRole(parsed.data.roleCode))) {
      throw new AccountError("INVALID_INPUT", "The selected contact role is invalid.", 400);
    }

    if (parsed.data.isPrimary) {
      await this.accountRepository.clearPrimary(accountId);
    }

    const contact = await this.accountRepository.insertContact({
      accountId,
      contactPartyId: parsed.data.contactPartyId,
      roleCode: parsed.data.roleCode,
      influenceLevel: parsed.data.influenceLevel ?? null,
      isPrimary: parsed.data.isPrimary ?? false,
      opportunityId: parsed.data.opportunityId ?? null,
      notes: parsed.data.notes ?? null,
      createdBy: context.platformUserId,
      updatedBy: context.platformUserId,
    });

    const timelinePartyId = account.partyId ?? parsed.data.contactPartyId;
    await this.timelineService.recordEvent(
      buildTimelineEventFromContext(context, {
        partyId: timelinePartyId,
        eventType: PARTY_TIMELINE_EVENT_TYPES.CONTACT_ROLE_ASSIGNED,
        eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.RELATIONSHIP,
        sourceModule: PARTY_TIMELINE_SOURCE_MODULES.CRM,
        summary: `Contact role assigned — ${contactParty.displayName}`,
        referenceEntity: AUDIT_ENTITY_NAMES.CRM_ACCOUNT_CONTACT,
        referenceId: contact.id,
        metadata: {
          accountId,
          roleCode: parsed.data.roleCode,
          contactPartyId: parsed.data.contactPartyId,
        },
      })
    );

    await recordCrmEntityAudit(this.auditService, context, {
      partyId: timelinePartyId,
      entityName: AUDIT_ENTITY_NAMES.CRM_ACCOUNT_CONTACT,
      entityId: contact.id,
      operation: AUDIT_OPERATIONS.CREATE,
      sourceModule: AUDIT_SOURCE_MODULES.CRM_MANAGEMENT,
      createValues: {
        accountId,
        contactPartyId: parsed.data.contactPartyId,
        roleCode: parsed.data.roleCode,
        isPrimary: parsed.data.isPrimary ?? false,
      },
    });

    return this.getAccount(context, accountId);
  }

  async updateContact(
    context: CurrentBusinessContext,
    accountId: string,
    accountContactId: string,
    payload: UpdateAccountContactPayload
  ): Promise<AccountDetailView> {
    const parsed = updateAccountContactSchema.safeParse(payload);
    if (!parsed.success) {
      throw new AccountError(
        "INVALID_INPUT",
        parsed.error.issues[0]?.message ?? "Invalid contact role input.",
        400
      );
    }

    await this.requireAccount(context, accountId);
    const existing = await this.accountRepository.findContactById(accountContactId);
    if (!existing || existing.accountId !== accountId) {
      throw new AccountError(
        "CONTACT_ROLE_NOT_FOUND",
        "The account contact role was not found.",
        404
      );
    }

    if (
      parsed.data.roleCode &&
      !(await this.referenceRepository.isActiveContactRole(parsed.data.roleCode))
    ) {
      throw new AccountError("INVALID_INPUT", "The selected contact role is invalid.", 400);
    }

    if (parsed.data.isPrimary) {
      await this.accountRepository.clearPrimary(accountId);
    }

    const updated = await this.accountRepository.updateContactById(
      accountContactId,
      {
        roleCode: parsed.data.roleCode,
        influenceLevel: parsed.data.influenceLevel,
        isPrimary: parsed.data.isPrimary,
        opportunityId: parsed.data.opportunityId,
        notes: parsed.data.notes,
        updatedBy: context.platformUserId,
      },
      parsed.data.version
    );

    if (!updated) {
      throw new AccountError(
        "VERSION_CONFLICT",
        "This contact role was updated by someone else. Refresh and try again.",
        409
      );
    }

    return this.getAccount(context, accountId);
  }

  async removeContact(
    context: CurrentBusinessContext,
    accountId: string,
    accountContactId: string,
    version: number
  ): Promise<AccountDetailView> {
    await this.requireAccount(context, accountId);
    const existing = await this.accountRepository.findContactById(accountContactId);
    if (!existing || existing.accountId !== accountId) {
      throw new AccountError(
        "CONTACT_ROLE_NOT_FOUND",
        "The account contact role was not found.",
        404
      );
    }

    const removed = await this.accountRepository.softDeleteContact(
      accountContactId,
      context.platformUserId,
      version
    );

    if (!removed) {
      throw new AccountError(
        "VERSION_CONFLICT",
        "This contact role was updated by someone else. Refresh and try again.",
        409
      );
    }

    return this.getAccount(context, accountId);
  }

  async getAccountHierarchyWidgetSummary(
    context: CurrentBusinessContext,
    partyId: string
  ): Promise<AccountHierarchyWidgetSummary | null> {
    const { items } = await this.accountRepository.listByFilters(context.businessId, {
      partyId,
      limit: 10,
    });

    if (items.length === 0) {
      const crm = await this.crmRepository.findByPartyId(context.businessId, partyId);
      if (!crm) {
        return null;
      }
      const linked = await this.accountRepository.listByCrmRecordId(
        context.businessId,
        crm.id
      );
      if (linked.length === 0) {
        return null;
      }
      return this.buildHierarchyWidget(context, linked);
    }

    return this.buildHierarchyWidget(context, items);
  }

  private async buildHierarchyWidget(
    context: CurrentBusinessContext,
    rows: AccountJoinedRow[]
  ): Promise<AccountHierarchyWidgetSummary> {
    const summaries = await Promise.all(
      rows.map((row) => this.toSummaryView(context, row))
    );
    const primary = summaries[0]!;
    const primaryContact = await this.accountRepository.findPrimaryContact(
      primary.accountId
    );
    const childCount = summaries.reduce((sum, item) => sum + item.childCount, 0);

    return {
      accountCount: summaries.length,
      primaryAccount: primary,
      primaryContactName: primaryContact?.contactDisplayName ?? null,
      childCount,
    };
  }

  private async assertValidParent(
    context: CurrentBusinessContext,
    accountId: string | null,
    parentAccountId: string | null
  ) {
    if (!parentAccountId) {
      return;
    }

    const parent = await this.accountRepository.findById(
      context.businessId,
      parentAccountId
    );
    if (!parent) {
      throw new AccountError("ACCOUNT_NOT_FOUND", "The parent account was not found.", 404);
    }

    const links = await this.accountRepository.listParentLinks(context.businessId);
    const parentByAccountId = new Map(
      links.map((link) => [link.id, link.parentAccountId])
    );

    if (
      accountId &&
      wouldCreateCircularHierarchy(accountId, parentAccountId, parentByAccountId)
    ) {
      throw new AccountError(
        "CIRCULAR_HIERARCHY",
        ACCOUNT_USER_MESSAGES.CIRCULAR_HIERARCHY,
        409
      );
    }

    if (!isWithinHierarchyDepth(parentAccountId, parentByAccountId)) {
      throw new AccountError(
        "HIERARCHY_DEPTH_EXCEEDED",
        ACCOUNT_USER_MESSAGES.HIERARCHY_DEPTH_EXCEEDED,
        409
      );
    }
  }

  private async requireAccount(
    context: CurrentBusinessContext,
    accountId: string
  ): Promise<AccountJoinedRow> {
    const row = await this.accountRepository.findById(context.businessId, accountId);
    if (!row) {
      throw new AccountError("ACCOUNT_NOT_FOUND", "The account was not found.", 404);
    }
    return row;
  }

  private async toSummaryView(
    context: CurrentBusinessContext,
    row: AccountJoinedRow
  ): Promise<AccountSummaryView> {
    const [
      accountTypeName,
      statusName,
      ownerDisplayName,
      contactCount,
      childCount,
    ] = await Promise.all([
      this.referenceRepository.getAccountTypeName(row.accountTypeCode),
      this.referenceRepository.getAccountStatusName(row.statusCode),
      row.ownerPartyId
        ? this.crmReferenceRepository.findPartyDisplayName(
            context.businessId,
            row.ownerPartyId
          )
        : Promise.resolve(null),
      this.accountRepository.countContacts(row.id),
      this.accountRepository.countChildren(row.id),
    ]);

    return {
      accountId: row.id,
      accountNumber: row.accountNumber,
      name: row.name,
      accountTypeCode: row.accountTypeCode,
      accountTypeName,
      statusCode: row.statusCode,
      statusName,
      partyId: row.partyId,
      partyDisplayName: row.partyDisplayName,
      crmRecordId: row.crmRecordId,
      parentAccountId: row.parentAccountId,
      parentAccountName: row.parentAccountName,
      ownerPartyId: row.ownerPartyId,
      ownerDisplayName,
      segmentCode: row.segmentCode,
      contactCount,
      childCount,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async toContactView(
    context: CurrentBusinessContext,
    contact: Awaited<ReturnType<AccountRepository["listContacts"]>>[number]
  ): Promise<AccountContactView> {
    const [roleName, channels, consentPanel] = await Promise.all([
      this.referenceRepository.getContactRoleName(contact.roleCode),
      this.accountRepository.findPreferredChannels(contact.contactPartyId),
      this.communicationPreferenceService
        .getCommunicationPreferences(context, contact.contactPartyId)
        .catch(() => null),
    ]);

    const preference = consentPanel?.preference ?? null;
    const marketingConsent = preference?.marketingConsent ?? null;
    const transactionalConsent = preference?.transactionalConsent ?? null;
    const emailEnabled = preference?.emailEnabled ?? null;
    const smsEnabled = preference?.smsEnabled ?? null;
    const canCommunicateOutbound = Boolean(
      (transactionalConsent && (emailEnabled || smsEnabled)) ||
        (marketingConsent && (emailEnabled || smsEnabled))
    );

    return {
      accountContactId: contact.id,
      contactPartyId: contact.contactPartyId,
      contactDisplayName: contact.contactDisplayName,
      contactPartyNumber: contact.contactPartyNumber,
      roleCode: contact.roleCode,
      roleName,
      influenceLevel: contact.influenceLevel,
      isPrimary: contact.isPrimary,
      opportunityId: contact.opportunityId,
      notes: contact.notes,
      preferredEmail: channels.preferredEmail,
      preferredPhone: channels.preferredPhone,
      marketingConsent,
      transactionalConsent,
      emailEnabled,
      smsEnabled,
      canCommunicateOutbound,
      version: contact.version,
    };
  }

  private async toDetailView(
    context: CurrentBusinessContext,
    row: AccountJoinedRow
  ): Promise<AccountDetailView> {
    const summary = await this.toSummaryView(context, row);
    const [branchName, children, contactRows, assignmentSummary] = await Promise.all([
      row.branchId
        ? this.crmReferenceRepository.getBranchName(context.businessId, row.branchId)
        : Promise.resolve(null),
      this.accountRepository.listChildren(context.businessId, row.id),
      this.accountRepository.listContacts(row.id),
      this.workAssignmentService.getSummary(
        context,
        WORK_SUBJECT_TYPES.CRM_ACCOUNT,
        row.id
      ),
    ]);

    const contacts = await Promise.all(
      contactRows.map((contact) => this.toContactView(context, contact))
    );
    const childSummaries = await Promise.all(
      children.map((child) => this.toSummaryView(context, child))
    );

    return {
      ...summary,
      branchId: row.branchId,
      branchName,
      classificationTags: row.classificationTags ?? [],
      notes: row.notes,
      version: row.version,
      children: childSummaries,
      contacts,
      assignmentSummary,
    };
  }
}

export function createAccountService(): AccountService {
  return new AccountService();
}
