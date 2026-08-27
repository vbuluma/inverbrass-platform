/**
 * Purpose:
 * IP-11 tax compliance service — obligations, calendar, filing, remittance, evidence.
 * Consumes IP-03/IP-06 tax amounts; never recalculates tax.
 *
 * Implementation Package:
 * BP-005 / IP-11
 */

import { randomUUID } from "node:crypto";

import type { CurrentBusinessContext } from "@/core/auth/types";

import {
  CommercialError,
  COMMERCIAL_USER_MESSAGES,
} from "@/modules/commercial/errors";
import {
  KENYA_COMPLIANCE_RULE_TEMPLATES,
  KENYA_JURISDICTION,
} from "@/modules/commercial/tax-compliance/kenya-reference-config";
import {
  TAX_COMPLIANCE_EVENT_TYPES,
  TAX_COMPLIANCE_PERMISSIONS,
  TAX_COMPLIANCE_RULE_LIFECYCLE,
  TAX_COMPLIANCE_STATUSES,
  TAX_EVIDENCE_STATUSES,
  TAX_FILING_STATUSES,
  TAX_REMITTANCE_STATUSES,
} from "@/modules/commercial/tax-compliance/tax-compliance-constants";
import {
  assertFilingTransition,
  deriveComplianceStatus,
  generateFilingPeriod,
  isRuleEffectiveAt,
  outstandingAmount,
  toIsoDate,
} from "@/modules/commercial/tax-compliance/tax-compliance-rules";
import {
  createInMemoryTaxComplianceStore,
  type TaxComplianceStore,
} from "@/modules/commercial/tax-compliance/tax-compliance-store";
import type {
  AddTaxRegistrationInput,
  CreateTaxComplianceProfileInput,
  CreateTaxObligationFromSnapshotInput,
  TaxComplianceActor,
  TaxComplianceDashboardView,
  TaxComplianceProfileView,
  TaxComplianceRuleView,
  TaxEvidenceView,
  TaxFilingPeriodView,
  TaxFilingView,
  TaxObligationView,
  TaxRegistrationView,
  TaxRemittanceView,
} from "@/modules/commercial/tax-compliance/tax-compliance-types";

function nowIso(): string {
  return new Date().toISOString();
}

function todayIso(): string {
  return toIsoDate(new Date());
}

export class TaxComplianceService {
  constructor(
    private readonly store: TaxComplianceStore = createInMemoryTaxComplianceStore()
  ) {}

  private assertPermission(
    actor: TaxComplianceActor,
    permission: string
  ): void {
    if (!actor.permissions.includes(permission)) {
      throw new CommercialError(
        "TAX_COMPLIANCE_UNAUTHORIZED",
        COMMERCIAL_USER_MESSAGES.TAX_COMPLIANCE_UNAUTHORIZED,
        403
      );
    }
  }

  private assertBusiness(
    context: CurrentBusinessContext,
    businessId: string
  ): void {
    if (businessId !== context.businessId) {
      throw new CommercialError(
        "BUSINESS_CONTEXT_MISMATCH",
        COMMERCIAL_USER_MESSAGES.BUSINESS_CONTEXT_MISMATCH,
        403,
        "businessId"
      );
    }
  }

  getDashboard(
    context: CurrentBusinessContext
  ): TaxComplianceDashboardView {
    const businessId = context.businessId;
    const obligations = this.store.listObligations(businessId);
    return {
      profile: this.store.getProfile(businessId),
      registrations: this.store.listRegistrations(businessId),
      upcomingFilings: obligations.filter(
        (o) =>
          o.filingStatus === TAX_FILING_STATUSES.DUE ||
          o.filingStatus === TAX_FILING_STATUSES.NOT_DUE ||
          o.filingStatus === TAX_FILING_STATUSES.PREPARED
      ),
      upcomingRemittances: obligations.filter(
        (o) =>
          o.remittanceStatus === TAX_REMITTANCE_STATUSES.DUE ||
          o.remittanceStatus === TAX_REMITTANCE_STATUSES.PARTIALLY_PAID ||
          o.remittanceStatus === TAX_REMITTANCE_STATUSES.NOT_DUE
      ),
      overdue: obligations.filter(
        (o) => o.complianceStatus === TAX_COMPLIANCE_STATUSES.OVERDUE
      ),
      missingEvidence: obligations.filter(
        (o) =>
          o.evidenceStatus === TAX_EVIDENCE_STATUSES.MISSING ||
          o.evidenceStatus === TAX_EVIDENCE_STATUSES.REQUIRED ||
          o.complianceStatus === TAX_COMPLIANCE_STATUSES.EVIDENCE_MISSING
      ),
      exceptions: obligations.filter(
        (o) => o.complianceStatus === TAX_COMPLIANCE_STATUSES.EXCEPTION
      ),
      periods: this.store.listPeriods(businessId),
      recentEvents: this.store.listEvents(businessId),
    };
  }

  createProfile(
    context: CurrentBusinessContext,
    actor: TaxComplianceActor,
    input: CreateTaxComplianceProfileInput
  ): TaxComplianceProfileView {
    this.assertPermission(actor, TAX_COMPLIANCE_PERMISSIONS.MANAGE);
    if (!input.countryCode?.trim()) {
      throw new CommercialError(
        "TAX_COMPLIANCE_CONFIG_MISSING",
        "countryCode is required for a tax compliance profile.",
        400,
        "countryCode"
      );
    }
    const existing = this.store.getProfile(context.businessId);
    if (existing) {
      throw new CommercialError(
        "TAX_RULE_INVALID",
        "Tax compliance profile already exists for this business.",
        409
      );
    }
    const country = input.countryCode.trim().toUpperCase();
    const jurisdiction =
      input.defaultJurisdictionCode?.trim() ||
      (country === KENYA_JURISDICTION.countryCode
        ? KENYA_JURISDICTION.jurisdictionCode
        : `${country}-NATIONAL`);
    const createdAt = nowIso();
    const profile: TaxComplianceProfileView = {
      profileId: randomUUID(),
      businessId: context.businessId,
      countryCode: country,
      defaultJurisdictionCode: jurisdiction,
      isActive: true,
      createdAt,
      updatedAt: createdAt,
    };
    this.store.saveProfile(profile);
    this.store.addEvent({
      businessId: context.businessId,
      obligationId: null,
      entityType: "PROFILE",
      entityId: profile.profileId,
      eventType: TAX_COMPLIANCE_EVENT_TYPES.PROFILE_CREATED,
      actorUserId: actor.userId,
      beforeStatus: null,
      afterStatus: "ACTIVE",
      reason: null,
      performedAt: createdAt,
    });

    if (input.seedJurisdictionTemplates !== false && country === "KE") {
      this.seedKenyaTemplates(context.businessId, actor.userId);
    }
    return profile;
  }

  private seedKenyaTemplates(businessId: string, actorUserId: string): void {
    for (const template of KENYA_COMPLIANCE_RULE_TEMPLATES) {
      const rule: TaxComplianceRuleView = {
        ruleVersionId: randomUUID(),
        businessId,
        ruleKey: template.ruleKey,
        versionNumber: 1,
        lifecycleStatus: TAX_COMPLIANCE_RULE_LIFECYCLE.ACTIVE,
        label: template.label,
        description: template.description ?? null,
        countryCode: template.countryCode,
        jurisdictionCode: template.jurisdictionCode,
        taxTypeCode: template.taxTypeCode,
        taxRegimeCode: template.taxRegimeCode,
        authorityCode: template.authorityCode,
        filingFrequency: template.filingFrequency,
        remittanceFrequency: template.remittanceFrequency,
        dueDateRule: { ...template.dueDateRule },
        requiresRegistration: template.requiresRegistration,
        registrationType: template.registrationType ?? null,
        filingRequired: template.filingRequired,
        remittanceRequired: template.remittanceRequired,
        requiredEvidenceTypes: [...template.requiredEvidenceTypes],
        effectiveFrom: template.effectiveFrom,
        effectiveTo: template.effectiveTo,
        previousVersionId: null,
      };
      this.store.saveRule(rule);
      this.store.addEvent({
        businessId,
        obligationId: null,
        entityType: "RULE",
        entityId: rule.ruleVersionId,
        eventType: TAX_COMPLIANCE_EVENT_TYPES.RULE_ACTIVATED,
        actorUserId,
        beforeStatus: null,
        afterStatus: rule.lifecycleStatus,
        reason: "Seeded jurisdiction template",
        performedAt: nowIso(),
      });
    }
  }

  addRegistration(
    context: CurrentBusinessContext,
    actor: TaxComplianceActor,
    input: AddTaxRegistrationInput
  ): TaxRegistrationView {
    this.assertPermission(actor, TAX_COMPLIANCE_PERMISSIONS.MANAGE);
    const profile = this.store.getProfile(context.businessId);
    if (!profile) {
      throw new CommercialError(
        "TAX_COMPLIANCE_CONFIG_MISSING",
        "Create a tax compliance profile before adding registrations.",
        400
      );
    }
    if (!input.registrationNumber?.trim() || !input.registrationType?.trim()) {
      throw new CommercialError(
        "INVALID_INPUT",
        "registrationType and registrationNumber are required.",
        400
      );
    }
    const reg: TaxRegistrationView = {
      registrationId: randomUUID(),
      businessId: context.businessId,
      profileId: profile.profileId,
      countryCode: (input.countryCode ?? profile.countryCode).toUpperCase(),
      jurisdictionCode:
        input.jurisdictionCode ?? profile.defaultJurisdictionCode,
      taxAuthorityCode: input.taxAuthorityCode.trim(),
      registrationType: input.registrationType.trim(),
      registrationNumber: input.registrationNumber.trim(),
      taxTypeCode: input.taxTypeCode ?? null,
      effectiveFrom: input.effectiveFrom ?? null,
      effectiveTo: input.effectiveTo ?? null,
      isActive: true,
    };
    this.store.saveRegistration(reg);
    this.store.addEvent({
      businessId: context.businessId,
      obligationId: null,
      entityType: "REGISTRATION",
      entityId: reg.registrationId,
      eventType: TAX_COMPLIANCE_EVENT_TYPES.REGISTRATION_ADDED,
      actorUserId: actor.userId,
      beforeStatus: null,
      afterStatus: "ACTIVE",
      reason: null,
      performedAt: nowIso(),
    });
    return reg;
  }

  resolveApplicableRule(
    context: CurrentBusinessContext,
    input: {
      taxTypeCode: string;
      asOf: string;
      jurisdictionCode?: string | null;
      requireActive?: boolean;
    }
  ): TaxComplianceRuleView {
    const profile = this.store.getProfile(context.businessId);
    if (!profile) {
      throw new CommercialError(
        "TAX_COMPLIANCE_CONFIG_MISSING",
        "Tax compliance profile is missing.",
        400
      );
    }
    const jurisdiction =
      input.jurisdictionCode ?? profile.defaultJurisdictionCode;
    const candidates = this.store
      .listRules(context.businessId)
      .filter(
        (r) =>
          r.taxTypeCode === input.taxTypeCode &&
          r.jurisdictionCode === jurisdiction &&
          isRuleEffectiveAt(r, input.asOf)
      )
      .sort((a, b) => b.versionNumber - a.versionNumber);

    const active = candidates.filter(
      (r) => r.lifecycleStatus === TAX_COMPLIANCE_RULE_LIFECYCLE.ACTIVE
    );
    if (input.requireActive !== false) {
      if (active.length === 0) {
        const inactive = candidates[0];
        if (
          inactive &&
          inactive.lifecycleStatus !== TAX_COMPLIANCE_RULE_LIFECYCLE.ACTIVE
        ) {
          throw new CommercialError(
            "TAX_RULE_INVALID",
            "Inactive/unapproved tax compliance rule cannot be used.",
            409,
            "lifecycleStatus",
            { ruleKey: inactive.ruleKey, status: inactive.lifecycleStatus }
          );
        }
        throw new CommercialError(
          "TAX_COMPLIANCE_CONFIG_MISSING",
          "No active tax compliance rule for this tax type and effective date.",
          404,
          "taxTypeCode"
        );
      }
      return active[0]!;
    }
    if (!candidates[0]) {
      throw new CommercialError(
        "TAX_COMPLIANCE_CONFIG_MISSING",
        "No tax compliance rule for this context.",
        404
      );
    }
    return candidates[0];
  }

  generateCalendarPeriod(
    context: CurrentBusinessContext,
    actor: TaxComplianceActor,
    input: { taxTypeCode: string; asOf: string; jurisdictionCode?: string }
  ): TaxFilingPeriodView {
    this.assertPermission(actor, TAX_COMPLIANCE_PERMISSIONS.MANAGE);
    const rule = this.resolveApplicableRule(context, {
      taxTypeCode: input.taxTypeCode,
      asOf: input.asOf,
      jurisdictionCode: input.jurisdictionCode,
    });
    if (!rule.dueDateRule) {
      throw new CommercialError(
        "DUE_DATE_RULE_MISSING",
        COMMERCIAL_USER_MESSAGES.DUE_DATE_RULE_MISSING,
        400
      );
    }
    const generated = generateFilingPeriod(
      rule.filingFrequency,
      input.asOf,
      rule.dueDateRule
    );
    const period: TaxFilingPeriodView = {
      periodId: randomUUID(),
      businessId: context.businessId,
      jurisdictionCode: rule.jurisdictionCode,
      taxTypeCode: rule.taxTypeCode,
      periodKey: generated.periodKey,
      periodStart: generated.periodStart,
      periodEnd: generated.periodEnd,
      filingDueDate: generated.filingDueDate,
      remittanceDueDate: generated.remittanceDueDate,
      ruleVersionId: rule.ruleVersionId,
      status: "OPEN",
    };
    this.store.savePeriod(period);
    this.store.addEvent({
      businessId: context.businessId,
      obligationId: null,
      entityType: "PERIOD",
      entityId: period.periodId,
      eventType: TAX_COMPLIANCE_EVENT_TYPES.PERIOD_GENERATED,
      actorUserId: actor.userId,
      beforeStatus: null,
      afterStatus: period.status,
      reason: null,
      performedAt: nowIso(),
    });
    return period;
  }

  /**
   * Create obligation from commercial tax component — amounts are inputs, not recalculated.
   */
  createObligationFromSnapshot(
    context: CurrentBusinessContext,
    actor: TaxComplianceActor,
    input: CreateTaxObligationFromSnapshotInput
  ): TaxObligationView {
    this.assertPermission(actor, TAX_COMPLIANCE_PERMISSIONS.MANAGE);
    const profile = this.store.getProfile(context.businessId);
    if (!profile) {
      throw new CommercialError(
        "TAX_COMPLIANCE_CONFIG_MISSING",
        "Tax compliance profile is missing.",
        400
      );
    }
    if (!input.taxAmount?.trim() || !input.taxableAmount?.trim()) {
      throw new CommercialError(
        "INVALID_INPUT",
        "taxableAmount and taxAmount from IP-03/IP-06 are required.",
        400
      );
    }
    if (!input.snapshotId?.trim() || !input.taxComponentId?.trim()) {
      throw new CommercialError(
        "INVALID_INPUT",
        "snapshotId and taxComponentId are required for traceability.",
        400
      );
    }

    const rule = this.resolveApplicableRule(context, {
      taxTypeCode: input.taxTypeCode,
      asOf: input.obligationDate,
      jurisdictionCode: input.jurisdictionCode ?? profile.defaultJurisdictionCode,
    });

    if (rule.requiresRegistration) {
      const regs = this.store.listRegistrations(context.businessId);
      const ok = regs.some(
        (r) =>
          r.isActive &&
          (r.taxTypeCode == null ||
            r.taxTypeCode === input.taxTypeCode ||
            r.registrationType === rule.registrationType)
      );
      if (!ok) {
        throw new CommercialError(
          "TAX_REGISTRATION_MISSING",
          COMMERCIAL_USER_MESSAGES.TAX_REGISTRATION_MISSING,
          400,
          "registration"
        );
      }
    }

    if (!rule.dueDateRule) {
      throw new CommercialError(
        "DUE_DATE_RULE_MISSING",
        COMMERCIAL_USER_MESSAGES.DUE_DATE_RULE_MISSING,
        400
      );
    }

    const period = generateFilingPeriod(
      rule.filingFrequency,
      input.obligationDate,
      rule.dueDateRule
    );

    const evidenceStatus =
      rule.requiredEvidenceTypes.length > 0
        ? TAX_EVIDENCE_STATUSES.REQUIRED
        : TAX_EVIDENCE_STATUSES.NOT_REQUIRED;

    const asOf = todayIso();
    let filingStatus: string = TAX_FILING_STATUSES.NOT_DUE;
    let remittanceStatus: string = TAX_REMITTANCE_STATUSES.NOT_DUE;
    if (asOf >= period.filingDueDate) {
      filingStatus = TAX_FILING_STATUSES.DUE;
    }
    if (asOf >= period.remittanceDueDate) {
      remittanceStatus = TAX_REMITTANCE_STATUSES.DUE;
    }

    const createdAt = nowIso();
    const obligation: TaxObligationView = {
      obligationId: randomUUID(),
      businessId: context.businessId,
      countryCode: rule.countryCode,
      jurisdictionCode: rule.jurisdictionCode,
      taxRegimeCode: rule.taxRegimeCode,
      taxTypeCode: input.taxTypeCode,
      periodKey: period.periodKey,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      snapshotId: input.snapshotId,
      resolutionId: input.resolutionId,
      commercialContractId: input.commercialContractId ?? null,
      taxComponentId: input.taxComponentId,
      taxableAmount: input.taxableAmount,
      taxAmount: input.taxAmount,
      currencyCode: input.currencyCode,
      obligationDate: input.obligationDate,
      filingDueDate: period.filingDueDate,
      remittanceDueDate: period.remittanceDueDate,
      filingStatus,
      remittanceStatus,
      evidenceStatus,
      complianceStatus: deriveComplianceStatus({
        filingStatus,
        remittanceStatus,
        evidenceStatus:
          evidenceStatus === TAX_EVIDENCE_STATUSES.REQUIRED
            ? TAX_EVIDENCE_STATUSES.MISSING
            : evidenceStatus,
        filingDueDate: period.filingDueDate,
        remittanceDueDate: period.remittanceDueDate,
        asOf,
      }),
      ruleVersionId: rule.ruleVersionId,
      ruleKey: rule.ruleKey,
      createdAt,
      updatedAt: createdAt,
    };
    if (obligation.evidenceStatus === TAX_EVIDENCE_STATUSES.REQUIRED) {
      obligation.evidenceStatus = TAX_EVIDENCE_STATUSES.MISSING;
    }
    obligation.complianceStatus = deriveComplianceStatus({
      filingStatus: obligation.filingStatus,
      remittanceStatus: obligation.remittanceStatus,
      evidenceStatus: obligation.evidenceStatus,
      filingDueDate: obligation.filingDueDate,
      remittanceDueDate: obligation.remittanceDueDate,
      asOf,
    });

    this.store.saveObligation(obligation);
    this.store.saveFiling({
      filingId: randomUUID(),
      businessId: context.businessId,
      obligationId: obligation.obligationId,
      filingReference: null,
      taxTypeCode: obligation.taxTypeCode,
      periodKey: obligation.periodKey,
      amountDeclared: null,
      amountExpected: obligation.taxAmount,
      filingDate: null,
      dueDate: obligation.filingDueDate,
      status: obligation.filingStatus,
      authorityCode: rule.authorityCode,
      acknowledgementRef: null,
      notes: null,
      ruleVersionId: rule.ruleVersionId,
    });
    this.store.saveRemittance({
      remittanceId: randomUUID(),
      businessId: context.businessId,
      obligationId: obligation.obligationId,
      expectedAmount: obligation.taxAmount,
      amountRemitted: "0.000000",
      outstandingAmount: obligation.taxAmount,
      remittanceDate: null,
      dueDate: obligation.remittanceDueDate,
      paymentReference: null,
      authorityCode: rule.authorityCode,
      status: obligation.remittanceStatus,
      notes: null,
    });

    this.store.addEvent({
      businessId: context.businessId,
      obligationId: obligation.obligationId,
      entityType: "OBLIGATION",
      entityId: obligation.obligationId,
      eventType: TAX_COMPLIANCE_EVENT_TYPES.OBLIGATION_CREATED,
      actorUserId: actor.userId,
      beforeStatus: null,
      afterStatus: obligation.complianceStatus,
      reason: `From snapshot ${input.snapshotId} / component ${input.taxComponentId}`,
      performedAt: createdAt,
    });
    return obligation;
  }

  private requireObligation(
    context: CurrentBusinessContext,
    obligationId: string
  ): TaxObligationView {
    const o = this.store.getObligation(context.businessId, obligationId);
    if (!o) {
      throw new CommercialError(
        "TAX_COMPLIANCE_CONFIG_MISSING",
        "Tax obligation not found for this business.",
        404,
        "obligationId"
      );
    }
    return o;
  }

  private refreshObligationStatus(
    obligation: TaxObligationView,
    asOf = todayIso()
  ): TaxObligationView {
    obligation.complianceStatus = deriveComplianceStatus({
      filingStatus: obligation.filingStatus,
      remittanceStatus: obligation.remittanceStatus,
      evidenceStatus: obligation.evidenceStatus,
      filingDueDate: obligation.filingDueDate,
      remittanceDueDate: obligation.remittanceDueDate,
      asOf,
    });
    obligation.updatedAt = nowIso();
    return this.store.saveObligation(obligation);
  }

  transitionFiling(
    context: CurrentBusinessContext,
    actor: TaxComplianceActor,
    obligationId: string,
    toStatus: string,
    options?: {
      filingReference?: string | null;
      amountDeclared?: string | null;
      acknowledgementRef?: string | null;
      notes?: string | null;
      asOf?: string;
    }
  ): TaxFilingView {
    this.assertPermission(actor, TAX_COMPLIANCE_PERMISSIONS.FILE);
    const obligation = this.requireObligation(context, obligationId);
    assertFilingTransition(obligation.filingStatus, toStatus);
    const filing =
      this.store.listFilings(context.businessId, obligationId)[0] ?? null;
    if (!filing) {
      throw new CommercialError(
        "TAX_COMPLIANCE_CONFIG_MISSING",
        "Filing record missing for obligation.",
        404
      );
    }
    const before = filing.status;
    filing.status = toStatus;
    filing.filingReference =
      options?.filingReference ?? filing.filingReference;
    filing.amountDeclared = options?.amountDeclared ?? filing.amountDeclared;
    filing.acknowledgementRef =
      options?.acknowledgementRef ?? filing.acknowledgementRef;
    filing.notes = options?.notes ?? filing.notes;
    if (
      toStatus === TAX_FILING_STATUSES.SUBMITTED ||
      toStatus === TAX_FILING_STATUSES.ACCEPTED
    ) {
      filing.filingDate = options?.asOf ?? todayIso();
    }
    this.store.saveFiling(filing);
    obligation.filingStatus = toStatus;
    this.refreshObligationStatus(obligation, options?.asOf ?? todayIso());

    const eventType =
      toStatus === TAX_FILING_STATUSES.PREPARED
        ? TAX_COMPLIANCE_EVENT_TYPES.FILING_PREPARED
        : toStatus === TAX_FILING_STATUSES.SUBMITTED
          ? TAX_COMPLIANCE_EVENT_TYPES.FILING_SUBMITTED
          : toStatus === TAX_FILING_STATUSES.ACCEPTED
            ? TAX_COMPLIANCE_EVENT_TYPES.FILING_ACCEPTED
            : toStatus === TAX_FILING_STATUSES.REJECTED
              ? TAX_COMPLIANCE_EVENT_TYPES.FILING_REJECTED
              : TAX_COMPLIANCE_EVENT_TYPES.OBLIGATION_AMENDED;
    this.store.addEvent({
      businessId: context.businessId,
      obligationId,
      entityType: "FILING",
      entityId: filing.filingId,
      eventType,
      actorUserId: actor.userId,
      beforeStatus: before,
      afterStatus: toStatus,
      reason: options?.notes ?? null,
      performedAt: nowIso(),
    });
    return filing;
  }

  recordRemittance(
    context: CurrentBusinessContext,
    actor: TaxComplianceActor,
    obligationId: string,
    amountRemitted: string,
    options?: {
      paymentReference?: string | null;
      remittanceDate?: string | null;
      notes?: string | null;
    }
  ): TaxRemittanceView {
    this.assertPermission(actor, TAX_COMPLIANCE_PERMISSIONS.REMIT);
    const obligation = this.requireObligation(context, obligationId);
    const remittance =
      this.store.listRemittances(context.businessId, obligationId)[0] ?? null;
    if (!remittance) {
      throw new CommercialError(
        "TAX_COMPLIANCE_CONFIG_MISSING",
        "Remittance record missing for obligation.",
        404
      );
    }
    const previous = Number(remittance.amountRemitted);
    const add = Number(amountRemitted);
    if (!Number.isFinite(add) || add < 0) {
      throw new CommercialError(
        "INVALID_INPUT",
        "amountRemitted must be a non-negative number.",
        400
      );
    }
    const total = previous + add;
    remittance.amountRemitted = total.toFixed(6);
    remittance.outstandingAmount = outstandingAmount(
      remittance.expectedAmount,
      remittance.amountRemitted
    );
    remittance.paymentReference =
      options?.paymentReference ?? remittance.paymentReference;
    remittance.remittanceDate =
      options?.remittanceDate ?? todayIso();
    remittance.notes = options?.notes ?? remittance.notes;
    const outstanding = Number(remittance.outstandingAmount);
    if (outstanding <= 0) {
      remittance.status = TAX_REMITTANCE_STATUSES.PAID;
      remittance.outstandingAmount = "0.000000";
    } else if (total > 0) {
      remittance.status = TAX_REMITTANCE_STATUSES.PARTIALLY_PAID;
    }
    this.store.saveRemittance(remittance);
    obligation.remittanceStatus = remittance.status;
    this.refreshObligationStatus(obligation);
    this.store.addEvent({
      businessId: context.businessId,
      obligationId,
      entityType: "REMITTANCE",
      entityId: remittance.remittanceId,
      eventType: TAX_COMPLIANCE_EVENT_TYPES.REMITTANCE_RECORDED,
      actorUserId: actor.userId,
      beforeStatus: null,
      afterStatus: remittance.status,
      reason: options?.notes ?? null,
      performedAt: nowIso(),
    });
    return remittance;
  }

  uploadEvidence(
    context: CurrentBusinessContext,
    actor: TaxComplianceActor,
    input: {
      obligationId: string;
      evidenceType: string;
      documentRef: string;
      description?: string | null;
    }
  ): TaxEvidenceView {
    this.assertPermission(actor, TAX_COMPLIANCE_PERMISSIONS.EVIDENCE);
    const obligation = this.requireObligation(context, input.obligationId);
    if (!input.documentRef?.trim()) {
      throw new CommercialError(
        "INVALID_INPUT",
        "documentRef is required (platform file reference).",
        400,
        "documentRef"
      );
    }
    const rule = this.store.getRule(
      context.businessId,
      obligation.ruleVersionId
    );
    if (
      rule &&
      rule.requiredEvidenceTypes.length > 0 &&
      !rule.requiredEvidenceTypes.includes(input.evidenceType)
    ) {
      // Allow OTHER / additional evidence, but flag missing requirements separately
    }
    const evidence: TaxEvidenceView = {
      evidenceId: randomUUID(),
      businessId: context.businessId,
      obligationId: obligation.obligationId,
      evidenceType: input.evidenceType,
      documentRef: input.documentRef.trim(),
      uploadedBy: actor.userId,
      uploadedAt: nowIso(),
      description: input.description ?? null,
      periodKey: obligation.periodKey,
      status: TAX_EVIDENCE_STATUSES.UPLOADED,
    };
    this.store.saveEvidence(evidence);
    obligation.evidenceStatus = TAX_EVIDENCE_STATUSES.UPLOADED;
    this.refreshObligationStatus(obligation);
    this.store.addEvent({
      businessId: context.businessId,
      obligationId: obligation.obligationId,
      entityType: "EVIDENCE",
      entityId: evidence.evidenceId,
      eventType: TAX_COMPLIANCE_EVENT_TYPES.EVIDENCE_UPLOADED,
      actorUserId: actor.userId,
      beforeStatus: TAX_EVIDENCE_STATUSES.MISSING,
      afterStatus: TAX_EVIDENCE_STATUSES.UPLOADED,
      reason: null,
      performedAt: nowIso(),
    });
    return evidence;
  }

  verifyEvidence(
    context: CurrentBusinessContext,
    actor: TaxComplianceActor,
    evidenceId: string,
    accept: boolean,
    reason?: string | null
  ): TaxEvidenceView {
    this.assertPermission(actor, TAX_COMPLIANCE_PERMISSIONS.EVIDENCE);
    const evidence = this.store
      .listEvidence(context.businessId)
      .find((e) => e.evidenceId === evidenceId);
    if (!evidence) {
      throw new CommercialError(
        "TAX_COMPLIANCE_CONFIG_MISSING",
        "Evidence not found for this business.",
        404
      );
    }
    if (evidence.status === TAX_EVIDENCE_STATUSES.VERIFIED && !accept) {
      // allow rejection from verified only via explicit reject path
    }
    const before = evidence.status;
    evidence.status = accept
      ? TAX_EVIDENCE_STATUSES.VERIFIED
      : TAX_EVIDENCE_STATUSES.REJECTED;
    this.store.saveEvidence(evidence);
    const obligation = this.requireObligation(context, evidence.obligationId);
    if (accept) {
      obligation.evidenceStatus = TAX_EVIDENCE_STATUSES.VERIFIED;
    } else {
      obligation.evidenceStatus = TAX_EVIDENCE_STATUSES.REJECTED;
    }
    this.refreshObligationStatus(obligation);
    this.store.addEvent({
      businessId: context.businessId,
      obligationId: obligation.obligationId,
      entityType: "EVIDENCE",
      entityId: evidence.evidenceId,
      eventType: accept
        ? TAX_COMPLIANCE_EVENT_TYPES.EVIDENCE_VERIFIED
        : TAX_COMPLIANCE_EVENT_TYPES.EVIDENCE_REJECTED,
      actorUserId: actor.userId,
      beforeStatus: before,
      afterStatus: evidence.status,
      reason: reason ?? null,
      performedAt: nowIso(),
    });
    return evidence;
  }

  markOverdue(
    context: CurrentBusinessContext,
    actor: TaxComplianceActor,
    obligationId: string,
    asOf: string
  ): TaxObligationView {
    this.assertPermission(actor, TAX_COMPLIANCE_PERMISSIONS.MANAGE);
    const obligation = this.requireObligation(context, obligationId);
    if (
      asOf > obligation.filingDueDate &&
      obligation.filingStatus !== TAX_FILING_STATUSES.ACCEPTED &&
      obligation.filingStatus !== TAX_FILING_STATUSES.SUBMITTED
    ) {
      obligation.filingStatus = TAX_FILING_STATUSES.OVERDUE;
      const filing = this.store.listFilings(
        context.businessId,
        obligationId
      )[0];
      if (filing) {
        filing.status = TAX_FILING_STATUSES.OVERDUE;
        this.store.saveFiling(filing);
      }
    }
    if (
      asOf > obligation.remittanceDueDate &&
      obligation.remittanceStatus !== TAX_REMITTANCE_STATUSES.PAID &&
      obligation.remittanceStatus !== TAX_REMITTANCE_STATUSES.WAIVED
    ) {
      obligation.remittanceStatus = TAX_REMITTANCE_STATUSES.OVERDUE;
      const rem = this.store.listRemittances(
        context.businessId,
        obligationId
      )[0];
      if (rem) {
        rem.status = TAX_REMITTANCE_STATUSES.OVERDUE;
        this.store.saveRemittance(rem);
      }
    }
    this.refreshObligationStatus(obligation, asOf);
    this.store.addEvent({
      businessId: context.businessId,
      obligationId,
      entityType: "OBLIGATION",
      entityId: obligationId,
      eventType: TAX_COMPLIANCE_EVENT_TYPES.MARKED_OVERDUE,
      actorUserId: actor.userId,
      beforeStatus: null,
      afterStatus: obligation.complianceStatus,
      reason: `asOf=${asOf}`,
      performedAt: nowIso(),
    });
    return obligation;
  }

  suspendRule(
    context: CurrentBusinessContext,
    actor: TaxComplianceActor,
    ruleVersionId: string
  ): TaxComplianceRuleView {
    this.assertPermission(actor, TAX_COMPLIANCE_PERMISSIONS.MANAGE);
    const rule = this.store.getRule(context.businessId, ruleVersionId);
    if (!rule) {
      throw new CommercialError(
        "TAX_COMPLIANCE_CONFIG_MISSING",
        "Rule not found.",
        404
      );
    }
    rule.lifecycleStatus = TAX_COMPLIANCE_RULE_LIFECYCLE.SUSPENDED;
    return this.store.saveRule(rule);
  }

  getObligation(
    context: CurrentBusinessContext,
    obligationId: string
  ): TaxObligationView {
    return this.requireObligation(context, obligationId);
  }

  listEvidenceForObligation(
    context: CurrentBusinessContext,
    obligationId: string
  ): TaxEvidenceView[] {
    this.requireObligation(context, obligationId);
    return this.store.listEvidence(context.businessId, obligationId);
  }
}

export function createTaxComplianceService(store?: TaxComplianceStore) {
  return new TaxComplianceService(store ?? createInMemoryTaxComplianceStore());
}
