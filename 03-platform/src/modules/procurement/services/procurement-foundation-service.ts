/**
 * Purpose:
 * Orchestrate BP-009 IP-01 procurement relationship on BP-002 Party.
 * Does not create RFX, PO, contract, receipt, invoice, or payment records.
 *
 * Implementation Package:
 * BP-009 / IP-01 – Procurement Foundation & Supplier Relationship
 */

import { randomUUID } from "node:crypto";

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  DOCUMENT_NUMBERING_DOCUMENT_TYPES,
  DocumentNumberingError,
  type DocumentNumberingPort,
} from "@/core/localization-regulatory/document-numbering";
import { ConfigurableDocumentNumberingService } from "@/core/localization-regulatory/services/document-numbering-service";
import { createDocumentNumberingPolicyRepository } from "@/core/localization-regulatory/repositories/document-numbering-policy-repository";
import {
  PROCUREMENT_AUDIT_ACTIONS,
  PROCUREMENT_PERMISSIONS,
  PROCUREMENT_STATUS_CODES,
  PROCUREMENT_STATUS_LABELS,
  QUALIFICATION_STATUS_CODES,
  QUALIFICATION_STATUS_LABELS,
  type ProcurementStatusCode,
} from "@/modules/procurement/constants";
import { PROCUREMENT_ERROR_CODES, ProcurementError } from "@/modules/procurement/errors";
import type {
  ProcurementAuditPort,
  ProcurementCataloguePort,
  ProcurementDocumentPort,
  ProcurementPartyPort,
  ProcurementProfileRepositoryPort,
  SupplierQualificationRepositoryPort,
} from "@/modules/procurement/ports";
import { createProcurementAuditAdapter } from "@/modules/procurement/services/procurement-audit-helper";
import { createProcurementCatalogueRepository } from "@/modules/procurement/repositories/procurement-catalogue-repository";
import { createProcurementProfileRepository } from "@/modules/procurement/repositories/procurement-profile-repository";
import { createSupplierQualificationRepository } from "@/modules/procurement/repositories/supplier-qualification-repository";
import { createProcurementPartyAdapter } from "@/modules/procurement/adapters/procurement-party-adapter";
import { createProcurementDocumentAdapter } from "@/modules/procurement/adapters/procurement-document-adapter";
import {
  assertNonEmptyCodes,
  assertPermission,
  assertPreferredAllowed,
  assertStatusChange,
  assertView,
  displayStatusLabel,
  hasPermission,
  isQualificationOutcome,
  normalizeOptionalText,
  preferredAllowed,
} from "@/modules/procurement/services/procurement-rules";
import { evaluateSupplierEligibility } from "@/modules/procurement/services/supplier-eligibility-service";
import type {
  ChangeProcurementStatusCommand,
  CreateProcurementProfileCommand,
  EligibilityView,
  ProcurementActor,
  ProcurementCataloguesView,
  ProcurementDashboardView,
  RecordQualificationCommand,
  SetPreferredCommand,
  SupplierListFilter,
  SupplierListView,
  SupplierProfileView,
  UpdateProcurementProfileCommand,
} from "@/modules/procurement/types";

export type ProcurementFoundationServiceDependencies = {
  parties: ProcurementPartyPort;
  documents: ProcurementDocumentPort;
  catalogues: ProcurementCataloguePort;
  profiles: ProcurementProfileRepositoryPort;
  qualifications: SupplierQualificationRepositoryPort;
  numbering: DocumentNumberingPort;
  audit: ProcurementAuditPort;
};

function actorId(context: CurrentBusinessContext) {
  return context.platformUserId || null;
}

function statusLabel(code: string) {
  return PROCUREMENT_STATUS_LABELS[code as ProcurementStatusCode] ?? code;
}

function qualificationLabel(code: string) {
  return isQualificationOutcome(code) ? QUALIFICATION_STATUS_LABELS[code] : code;
}

export class ProcurementFoundationService {
  constructor(private readonly deps: ProcurementFoundationServiceDependencies) {}

  async getDashboard(
    context: CurrentBusinessContext,
    actor: ProcurementActor
  ): Promise<ProcurementDashboardView> {
    assertView(actor);
    const list = await this.listSuppliers(context, actor, { status: "all" });
    return {
      activeCount: list.filter((row) => row.statusCode === PROCUREMENT_STATUS_CODES.ACTIVE)
        .length,
      preferredCount: list.filter((row) => row.isPreferred).length,
      pendingQualificationCount: list.filter(
        (row) => row.qualificationStatusCode === QUALIFICATION_STATUS_CODES.PENDING
      ).length,
      restrictedCount: list.filter(
        (row) =>
          row.statusCode === PROCUREMENT_STATUS_CODES.SUSPENDED ||
          row.statusCode === PROCUREMENT_STATUS_CODES.BLACKLISTED
      ).length,
      recent: list.slice(0, 8),
      requestDraftCount: 0,
      requestPendingApprovalCount: 0,
      requestApprovedCount: 0,
      recentRequests: [],
      openExceptionCount: 0,
    };
  }

  async getCatalogues(
    _context: CurrentBusinessContext,
    actor: ProcurementActor
  ): Promise<ProcurementCataloguesView> {
    assertView(actor);
    const [categories, capabilities, statuses, qualificationStatuses, qualificationTypes] =
      await Promise.all([
        this.deps.catalogues.listCategories(),
        this.deps.catalogues.listCapabilities(),
        this.deps.catalogues.listStatuses(),
        this.deps.catalogues.listQualificationStatuses(),
        this.deps.catalogues.listQualificationTypes(),
      ]);
    return { categories, capabilities, statuses, qualificationStatuses, qualificationTypes };
  }

  async searchParties(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    query: string
  ) {
    assertView(actor);
    return this.deps.parties.searchParties(context.businessId, query);
  }

  async listSuppliers(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    filter: SupplierListFilter = {}
  ): Promise<SupplierListView[]> {
    assertView(actor);
    const [profiles, categories, capabilities] = await Promise.all([
      this.deps.profiles.listByBusiness(context.businessId),
      this.deps.catalogues.listCategories(),
      this.deps.catalogues.listCapabilities(),
    ]);
    const categoryName = new Map(categories.map((row) => [row.code, row.name]));
    const capabilityName = new Map(capabilities.map((row) => [row.code, row.name]));
    const views: SupplierListView[] = [];
    for (const profile of profiles) {
      const party = await this.deps.parties.findParty(context.businessId, profile.partyId);
      if (!party) {
        continue;
      }
      const categoryCodes = await this.deps.profiles.listCategoryCodes(profile.id);
      const capabilityCodes = await this.deps.profiles.listCapabilityCodes(profile.id);
      views.push({
        id: profile.id,
        partyId: profile.partyId,
        partyName: party.displayName,
        partyNumber: party.partyNumber,
        profileNumber: profile.profileNumber,
        statusCode: profile.statusCode,
        statusLabel: statusLabel(profile.statusCode),
        qualificationStatusCode: profile.qualificationStatusCode,
        qualificationLabel: qualificationLabel(profile.qualificationStatusCode),
        isPreferred: profile.isPreferred,
        displayStatusLabel: displayStatusLabel(
          profile.statusCode,
          profile.isPreferred,
          statusLabel(profile.statusCode)
        ),
        categories: categoryCodes.map((code) => categoryName.get(code) ?? code),
        capabilities: capabilityCodes.map((code) => capabilityName.get(code) ?? code),
      });
    }
    const query = filter.query?.trim().toLowerCase();
    return views.filter((row) => {
      if (query) {
        const haystack = `${row.partyName} ${row.partyNumber} ${row.profileNumber} ${row.categories.join(" ")}`.toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }
      if (filter.status === "active") {
        return row.statusCode === PROCUREMENT_STATUS_CODES.ACTIVE;
      }
      if (filter.status === "preferred") {
        return row.isPreferred;
      }
      if (filter.status === "pending") {
        return row.qualificationStatusCode === QUALIFICATION_STATUS_CODES.PENDING;
      }
      if (filter.status === "restricted") {
        return (
          row.statusCode === PROCUREMENT_STATUS_CODES.SUSPENDED ||
          row.statusCode === PROCUREMENT_STATUS_CODES.BLACKLISTED
        );
      }
      return true;
    });
  }

  async getSupplier(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    profileId: string
  ): Promise<SupplierProfileView> {
    assertView(actor);
    const profile = await this.requireProfile(context.businessId, profileId);
    return this.toProfileView(context, actor, profile);
  }

  async getSupplierByParty(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    partyId: string
  ): Promise<SupplierProfileView | null> {
    assertView(actor);
    const profile = await this.deps.profiles.findByPartyId(context.businessId, partyId);
    if (!profile) {
      return null;
    }
    return this.toProfileView(context, actor, profile);
  }

  async createProfile(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    command: CreateProcurementProfileCommand
  ): Promise<SupplierProfileView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.CREATE);
    const party = await this.deps.parties.findParty(context.businessId, command.partyId);
    if (!party) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.PARTY_NOT_FOUND, undefined, 404);
    }
    if (party.businessId !== context.businessId) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.CROSS_BUSINESS_ACCESS, undefined, 403);
    }
    if (!party.hasActiveSupplierRole) {
      if (!command.assignSupplierRole) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.PARTY_NOT_SUPPLIER, undefined, 400);
      }
      await this.deps.parties.assignSupplierRole(
        context.businessId,
        party.id,
        actor.userId
      );
    }
    const existing = await this.deps.profiles.findByPartyId(context.businessId, party.id);
    if (existing) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.DUPLICATE_PROFILE, undefined, 409);
    }
    await this.assertCatalogueCodes(command.categoryCodes, command.capabilityCodes);
    const statusCode = command.statusCode ?? PROCUREMENT_STATUS_CODES.ACTIVE;
    if (command.isPreferred) {
      assertPreferredAllowed(statusCode, true);
    }
    let profileNumber: string;
    try {
      const allocated = await this.deps.numbering.allocate({
        businessId: context.businessId,
        documentType: DOCUMENT_NUMBERING_DOCUMENT_TYPES.PROCUREMENT_PROFILE,
      });
      profileNumber = allocated.number;
    } catch (error) {
      if (error instanceof DocumentNumberingError) {
        throw new ProcurementError(
          PROCUREMENT_ERROR_CODES.NUMBERING_POLICY_MISSING,
          undefined,
          500
        );
      }
      throw error;
    }
    const created = await this.deps.profiles.insert({
      id: randomUUID(),
      businessId: context.businessId,
      partyId: party.id,
      profileNumber,
      statusCode,
      qualificationStatusCode: QUALIFICATION_STATUS_CODES.PENDING,
      isPreferred: Boolean(command.isPreferred),
      isApproved: false,
      defaultDeliveryTerms: normalizeOptionalText(command.defaultDeliveryTerms),
      defaultPaymentTerms: normalizeOptionalText(command.defaultPaymentTerms),
      expectedLeadTimeDays: command.expectedLeadTimeDays ?? null,
      statusReason: null,
      statusEffectiveDate: new Date().toISOString().slice(0, 10),
      statusReviewDate: null,
      statusAuthority: null,
      createdBy: actorId(context),
      updatedBy: actorId(context),
      version: 1,
    });
    await this.deps.profiles.replaceCategories(
      context.businessId,
      created.id,
      command.categoryCodes,
      actorId(context)
    );
    await this.deps.profiles.replaceCapabilities(
      context.businessId,
      created.id,
      command.capabilityCodes,
      actorId(context)
    );
    await this.deps.audit.record({
      businessId: context.businessId,
      actorUserId: actorId(context),
      entityId: created.id,
      action: PROCUREMENT_AUDIT_ACTIONS.PROFILE_CREATED,
      outcome: "created",
      references: { partyId: party.id, profileNumber },
    });
    await this.deps.audit.record({
      businessId: context.businessId,
      actorUserId: actorId(context),
      entityId: created.id,
      action: PROCUREMENT_AUDIT_ACTIONS.PARTY_LINKED,
      outcome: "linked",
      references: { partyId: party.id },
    });
    return this.getSupplier(context, actor, created.id);
  }

  async updateProfile(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    profileId: string,
    command: UpdateProcurementProfileCommand
  ): Promise<SupplierProfileView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.UPDATE);
    const profile = await this.requireProfile(context.businessId, profileId);
    if (command.categoryCodes) {
      await this.assertCatalogueCodes(command.categoryCodes, undefined);
      const previous = await this.deps.profiles.listCategoryCodes(profile.id);
      await this.deps.profiles.replaceCategories(
        context.businessId,
        profile.id,
        command.categoryCodes,
        actorId(context)
      );
      await this.auditSetDiff(
        context,
        profile.id,
        previous,
        command.categoryCodes,
        PROCUREMENT_AUDIT_ACTIONS.CATEGORY_ADDED,
        PROCUREMENT_AUDIT_ACTIONS.CATEGORY_REMOVED
      );
    }
    if (command.capabilityCodes) {
      await this.assertCatalogueCodes(undefined, command.capabilityCodes);
      const previous = await this.deps.profiles.listCapabilityCodes(profile.id);
      await this.deps.profiles.replaceCapabilities(
        context.businessId,
        profile.id,
        command.capabilityCodes,
        actorId(context)
      );
      await this.auditSetDiff(
        context,
        profile.id,
        previous,
        command.capabilityCodes,
        PROCUREMENT_AUDIT_ACTIONS.CAPABILITY_ADDED,
        PROCUREMENT_AUDIT_ACTIONS.CAPABILITY_REMOVED
      );
    }
    await this.deps.profiles.update(context.businessId, profile.id, {
      defaultDeliveryTerms:
        command.defaultDeliveryTerms === undefined
          ? profile.defaultDeliveryTerms
          : normalizeOptionalText(command.defaultDeliveryTerms),
      defaultPaymentTerms:
        command.defaultPaymentTerms === undefined
          ? profile.defaultPaymentTerms
          : normalizeOptionalText(command.defaultPaymentTerms),
      expectedLeadTimeDays:
        command.expectedLeadTimeDays === undefined
          ? profile.expectedLeadTimeDays
          : command.expectedLeadTimeDays,
      isApproved:
        command.isApproved === undefined ? profile.isApproved : command.isApproved,
      updatedBy: actorId(context),
      version: profile.version + 1,
    });
    await this.deps.audit.record({
      businessId: context.businessId,
      actorUserId: actorId(context),
      entityId: profile.id,
      action: PROCUREMENT_AUDIT_ACTIONS.PROFILE_UPDATED,
      outcome: "updated",
    });
    return this.getSupplier(context, actor, profile.id);
  }

  async changeStatus(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    profileId: string,
    command: ChangeProcurementStatusCommand
  ): Promise<SupplierProfileView> {
    const isBlacklist = command.statusCode === PROCUREMENT_STATUS_CODES.BLACKLISTED;
    assertPermission(
      actor,
      isBlacklist ? PROCUREMENT_PERMISSIONS.BLACKLIST : PROCUREMENT_PERMISSIONS.STATUS
    );
    const profile = await this.requireProfile(context.businessId, profileId);
    assertStatusChange(command.statusCode, command.reason, false);
    const nextPreferred =
      command.statusCode === PROCUREMENT_STATUS_CODES.BLACKLISTED ||
      command.statusCode === PROCUREMENT_STATUS_CODES.SUSPENDED ||
      command.statusCode === PROCUREMENT_STATUS_CODES.INACTIVE
        ? false
        : profile.isPreferred;
    await this.deps.profiles.update(context.businessId, profile.id, {
      statusCode: command.statusCode,
      statusReason: normalizeOptionalText(command.reason) ?? profile.statusReason,
      statusEffectiveDate:
        command.effectiveDate ?? new Date().toISOString().slice(0, 10),
      statusReviewDate: command.reviewDate ?? profile.statusReviewDate,
      statusAuthority: normalizeOptionalText(command.authority) ?? profile.statusAuthority,
      isPreferred: nextPreferred,
      updatedBy: actorId(context),
      version: profile.version + 1,
    });
    const action =
      command.statusCode === PROCUREMENT_STATUS_CODES.BLACKLISTED
        ? PROCUREMENT_AUDIT_ACTIONS.SUPPLIER_BLACKLISTED
        : command.statusCode === PROCUREMENT_STATUS_CODES.SUSPENDED
          ? PROCUREMENT_AUDIT_ACTIONS.SUPPLIER_SUSPENDED
          : command.statusCode === PROCUREMENT_STATUS_CODES.INACTIVE
            ? PROCUREMENT_AUDIT_ACTIONS.SUPPLIER_DEACTIVATED
            : command.statusCode === PROCUREMENT_STATUS_CODES.ACTIVE &&
                profile.statusCode !== PROCUREMENT_STATUS_CODES.ACTIVE
              ? PROCUREMENT_AUDIT_ACTIONS.SUPPLIER_REACTIVATED
              : PROCUREMENT_AUDIT_ACTIONS.STATUS_CHANGED;
    await this.deps.audit.record({
      businessId: context.businessId,
      actorUserId: actorId(context),
      entityId: profile.id,
      action,
      outcome: command.statusCode,
      reason: command.reason,
    });
    return this.getSupplier(context, actor, profile.id);
  }

  async setPreferred(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    profileId: string,
    command: SetPreferredCommand
  ): Promise<SupplierProfileView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.PREFERRED);
    const profile = await this.requireProfile(context.businessId, profileId);
    if (command.isPreferred) {
      if (profile.statusCode === PROCUREMENT_STATUS_CODES.BLACKLISTED) {
        throw new ProcurementError(
          PROCUREMENT_ERROR_CODES.INVALID_STATUS_TRANSITION,
          "A blacklisted supplier cannot be preferred.",
          400
        );
      }
      assertPreferredAllowed(profile.statusCode, true);
    }
    await this.deps.profiles.update(context.businessId, profile.id, {
      isPreferred: command.isPreferred,
      updatedBy: actorId(context),
      version: profile.version + 1,
    });
    await this.deps.audit.record({
      businessId: context.businessId,
      actorUserId: actorId(context),
      entityId: profile.id,
      action: PROCUREMENT_AUDIT_ACTIONS.PREFERRED_CHANGED,
      outcome: command.isPreferred ? "preferred" : "not_preferred",
    });
    return this.getSupplier(context, actor, profile.id);
  }

  async recordQualification(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    profileId: string,
    command: RecordQualificationCommand
  ): Promise<SupplierProfileView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.QUALIFY);
    const profile = await this.requireProfile(context.businessId, profileId);
    const types = await this.deps.catalogues.listQualificationTypes();
    if (!types.some((row) => row.code === command.qualificationTypeCode && row.isActive)) {
      throw new ProcurementError(
        PROCUREMENT_ERROR_CODES.INVALID_QUALIFICATION_TYPE,
        undefined,
        400,
        { field: "qualificationTypeCode" }
      );
    }
    if (!isQualificationOutcome(command.outcomeCode)) {
      throw new ProcurementError(
        PROCUREMENT_ERROR_CODES.INVALID_QUALIFICATION_OUTCOME,
        undefined,
        400,
        { field: "outcomeCode" }
      );
    }
    const evidenceIds = command.evidenceDocumentIds ?? [];
    for (const documentId of evidenceIds) {
      const document = await this.deps.documents.findPartyDocument(
        context.businessId,
        profile.partyId,
        documentId
      );
      if (!document) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.DOCUMENT_NOT_FOUND, undefined, 404);
      }
    }
    const created = await this.deps.qualifications.insert({
      id: randomUUID(),
      businessId: context.businessId,
      profileId: profile.id,
      qualificationTypeCode: command.qualificationTypeCode,
      outcomeCode: command.outcomeCode,
      effectiveDate: command.effectiveDate,
      expiryDate: command.expiryDate ?? null,
      reviewDate: command.reviewDate ?? null,
      reviewerUserId: actor.userId,
      notes: normalizeOptionalText(command.notes),
      createdBy: actorId(context),
      updatedBy: actorId(context),
      version: 1,
      evidenceDocumentIds: evidenceIds,
    });
    await this.deps.profiles.update(context.businessId, profile.id, {
      qualificationStatusCode: command.outcomeCode,
      updatedBy: actorId(context),
      version: profile.version + 1,
    });
    await this.deps.audit.record({
      businessId: context.businessId,
      actorUserId: actorId(context),
      entityId: created.id,
      action: PROCUREMENT_AUDIT_ACTIONS.QUALIFICATION_CREATED,
      outcome: command.outcomeCode,
    });
    if (
      command.outcomeCode === QUALIFICATION_STATUS_CODES.QUALIFIED ||
      command.outcomeCode === QUALIFICATION_STATUS_CODES.CONDITIONAL
    ) {
      await this.deps.audit.record({
        businessId: context.businessId,
        actorUserId: actorId(context),
        entityId: created.id,
        action: PROCUREMENT_AUDIT_ACTIONS.QUALIFICATION_APPROVED,
        outcome: command.outcomeCode,
      });
    }
    return this.getSupplier(context, actor, profile.id);
  }

  async checkEligibility(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    supplierPartyId: string
  ): Promise<EligibilityView> {
    assertView(actor);
    if (supplierPartyId && context.businessId) {
      const party = await this.deps.parties.findParty(context.businessId, supplierPartyId);
      const profile = party
        ? await this.deps.profiles.findByPartyId(context.businessId, party.id)
        : null;
      const latest = profile
        ? (await this.deps.qualifications.listByProfile(context.businessId, profile.id))[0] ??
          null
        : null;
      return evaluateSupplierEligibility({ party, profile, latestQualification: latest });
    }
    return evaluateSupplierEligibility({
      party: null,
      profile: null,
      latestQualification: null,
    });
  }

  private async requireProfile(businessId: string, profileId: string) {
    const profile = await this.deps.profiles.findById(businessId, profileId);
    if (!profile) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.PROFILE_NOT_FOUND, undefined, 404);
    }
    if (profile.businessId !== businessId) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.CROSS_BUSINESS_ACCESS, undefined, 403);
    }
    return profile;
  }

  private async assertCatalogueCodes(
    categoryCodes: string[] | undefined,
    capabilityCodes: string[] | undefined
  ) {
    if (categoryCodes) {
      assertNonEmptyCodes(categoryCodes, PROCUREMENT_ERROR_CODES.INVALID_CATEGORY, "categoryCodes");
      const allowed = new Set(
        (await this.deps.catalogues.listCategories())
          .filter((row) => row.isActive)
          .map((row) => row.code)
      );
      if (categoryCodes.some((code) => !allowed.has(code))) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_CATEGORY, undefined, 400, {
          field: "categoryCodes",
        });
      }
    }
    if (capabilityCodes) {
      assertNonEmptyCodes(
        capabilityCodes,
        PROCUREMENT_ERROR_CODES.INVALID_CAPABILITY,
        "capabilityCodes"
      );
      const allowed = new Set(
        (await this.deps.catalogues.listCapabilities())
          .filter((row) => row.isActive)
          .map((row) => row.code)
      );
      if (capabilityCodes.some((code) => !allowed.has(code))) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_CAPABILITY, undefined, 400, {
          field: "capabilityCodes",
        });
      }
    }
  }

  private async auditSetDiff(
    context: CurrentBusinessContext,
    profileId: string,
    previous: string[],
    next: string[],
    addedAction: string,
    removedAction: string
  ) {
    const prev = new Set(previous);
    const upcoming = new Set(next);
    for (const code of next) {
      if (!prev.has(code)) {
        await this.deps.audit.record({
          businessId: context.businessId,
          actorUserId: actorId(context),
          entityId: profileId,
          action: addedAction,
          outcome: code,
        });
      }
    }
    for (const code of previous) {
      if (!upcoming.has(code)) {
        await this.deps.audit.record({
          businessId: context.businessId,
          actorUserId: actorId(context),
          entityId: profileId,
          action: removedAction,
          outcome: code,
        });
      }
    }
  }

  private async toProfileView(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    profile: Awaited<ReturnType<ProcurementProfileRepositoryPort["findById"]>>
  ): Promise<SupplierProfileView> {
    if (!profile) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.PROFILE_NOT_FOUND, undefined, 404);
    }
    const party = await this.deps.parties.findParty(context.businessId, profile.partyId);
    if (!party) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.PARTY_NOT_FOUND, undefined, 404);
    }
    const [categoryCodes, capabilityCodes, catalogues, qualifications] = await Promise.all([
      this.deps.profiles.listCategoryCodes(profile.id),
      this.deps.profiles.listCapabilityCodes(profile.id),
      this.getCatalogues(context, actor),
      this.deps.qualifications.listByProfile(context.businessId, profile.id),
    ]);
    const categoryByCode = new Map(catalogues.categories.map((row) => [row.code, row]));
    const capabilityByCode = new Map(catalogues.capabilities.map((row) => [row.code, row]));
    const typeByCode = new Map(catalogues.qualificationTypes.map((row) => [row.code, row]));
    const evidenceDocs = await this.deps.documents.listPartyDocuments(
      context.businessId,
      party.id
    );
    const docById = new Map(evidenceDocs.map((row) => [row.id, row]));
    const eligibility = evaluateSupplierEligibility({
      party,
      profile,
      latestQualification: qualifications[0] ?? null,
    });
    return {
      id: profile.id,
      partyId: party.id,
      partyName: party.displayName,
      partyNumber: party.partyNumber,
      partyHref: `/parties/${party.id}`,
      profileNumber: profile.profileNumber,
      statusCode: profile.statusCode,
      statusLabel: statusLabel(profile.statusCode),
      displayStatusLabel: displayStatusLabel(
        profile.statusCode,
        profile.isPreferred,
        statusLabel(profile.statusCode)
      ),
      qualificationStatusCode: profile.qualificationStatusCode,
      qualificationLabel: qualificationLabel(profile.qualificationStatusCode),
      isPreferred: profile.isPreferred,
      isApproved: profile.isApproved,
      defaultDeliveryTerms: profile.defaultDeliveryTerms,
      defaultPaymentTerms: profile.defaultPaymentTerms,
      expectedLeadTimeDays: profile.expectedLeadTimeDays,
      statusReason: profile.statusReason,
      statusEffectiveDate: profile.statusEffectiveDate,
      statusReviewDate: profile.statusReviewDate,
      statusAuthority: profile.statusAuthority,
      categories: categoryCodes
        .map((code) => categoryByCode.get(code))
        .filter((row): row is NonNullable<typeof row> => Boolean(row)),
      capabilities: capabilityCodes
        .map((code) => capabilityByCode.get(code))
        .filter((row): row is NonNullable<typeof row> => Boolean(row)),
      qualifications: qualifications.map((row) => ({
        id: row.id,
        qualificationTypeCode: row.qualificationTypeCode,
        qualificationTypeName:
          typeByCode.get(row.qualificationTypeCode)?.name ?? row.qualificationTypeCode,
        outcomeCode: row.outcomeCode,
        outcomeLabel: qualificationLabel(row.outcomeCode),
        effectiveDate: row.effectiveDate,
        expiryDate: row.expiryDate,
        reviewDate: row.reviewDate,
        reviewerUserId: row.reviewerUserId,
        notes: row.notes,
        evidence: row.evidenceDocumentIds
          .map((id) => docById.get(id))
          .filter((doc): doc is NonNullable<typeof doc> => Boolean(doc)),
      })),
      eligibility,
      activity: [],
      canEdit: hasPermission(actor, PROCUREMENT_PERMISSIONS.UPDATE),
      canQualify: hasPermission(actor, PROCUREMENT_PERMISSIONS.QUALIFY),
      canChangeStatus: hasPermission(actor, PROCUREMENT_PERMISSIONS.STATUS),
      canSetPreferred: hasPermission(actor, PROCUREMENT_PERMISSIONS.PREFERRED),
      canBlacklist: hasPermission(actor, PROCUREMENT_PERMISSIONS.BLACKLIST),
    };
  }
}

export function createDefaultProcurementFoundationDependencies(): ProcurementFoundationServiceDependencies {
  return {
    parties: createProcurementPartyAdapter(),
    documents: createProcurementDocumentAdapter(),
    catalogues: createProcurementCatalogueRepository(),
    profiles: createProcurementProfileRepository(),
    qualifications: createSupplierQualificationRepository(),
    numbering: new ConfigurableDocumentNumberingService(
      createDocumentNumberingPolicyRepository()
    ),
    audit: createProcurementAuditAdapter(),
  };
}

export function createProcurementFoundationService(
  deps: ProcurementFoundationServiceDependencies = createDefaultProcurementFoundationDependencies()
) {
  return new ProcurementFoundationService(deps);
}

export { preferredAllowed };
