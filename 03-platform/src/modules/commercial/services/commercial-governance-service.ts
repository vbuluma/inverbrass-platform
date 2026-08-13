/**
 * Purpose:
 * IP-08 commercial governance — lifecycle, maker/checker, materiality,
 * overrides, effective dating, audit events. Does not recalculate price/tax.
 *
 * Architecture:
 *   Request → IP-08 GovernanceDecision → existing commercial engine
 *   IP-06 Snapshot remains immutable historical truth.
 *
 * Implementation Package:
 * BP-005 / IP-08 – Commercial Governance
 */

import { randomUUID } from "node:crypto";

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  AUDIT_ENTITY_NAMES,
  AUDIT_OPERATIONS,
  AUDIT_SOURCE_MODULES,
  createAuditService,
  createFieldChanges,
} from "@/core/audit";

import {
  COMMERCIAL_GOVERNANCE_DECISION_CODES,
  COMMERCIAL_GOVERNANCE_EVENT_TYPES,
  COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES,
  COMMERCIAL_GOVERNANCE_PERMISSIONS,
  COMMERCIAL_OVERRIDE_STATUS_CODES,
} from "@/modules/commercial/constants";
import {
  CommercialError,
  COMMERCIAL_USER_MESSAGES,
} from "@/modules/commercial/errors";
import {
  assertBusinessScope,
  assertLifecycleTransition,
  assertPermission,
  assertSegregationOfDuties,
  buildGovernanceDecision,
  detectMaterialChange,
  evaluateActivationDecision,
  exceedsApprovalThreshold,
  isCommerciallyEffectiveAt,
} from "@/modules/commercial/services/commercial-governance-rules";
import {
  createInMemoryCommercialGovernanceStore,
  type CommercialGovernanceStore,
} from "@/modules/commercial/services/commercial-governance-store";
import { createCommercialValidationService } from "@/modules/commercial/services/commercial-validation-service";
import type {
  CommercialGovernanceActor,
  CommercialGovernanceDecision,
  CommercialGovernanceEventView,
  CommercialGovernancePolicyView,
  CommercialGovernanceWorkspaceView,
  CommercialOverrideRequestView,
  CommercialRuleVersionView,
  CommercialSnapshot,
  CreateCommercialRuleDraftInput,
  RequestCommercialOverrideInput,
  UpdateCommercialRuleDraftInput,
  UpsertCommercialGovernancePolicyInput,
} from "@/modules/commercial/types";

function nowIso(): string {
  return new Date().toISOString();
}

export class CommercialGovernanceService {
  constructor(
    private readonly store: CommercialGovernanceStore = createInMemoryCommercialGovernanceStore(),
    private readonly auditService: {
      record: (payload: unknown) => Promise<void>;
    } | null = null
  ) {}

  private async safeAudit(payload: {
    businessId: string;
    entityName: string;
    entityId: string;
    operation: string;
    changedBy: string;
    sourceModule: string;
    changes: unknown;
  }): Promise<void> {
    try {
      const svc = this.auditService ?? createAuditService();
      await svc.record(payload as never);
    } catch {
      // ENG-013 contract: audit failures must not block governance.
    }
  }

  getPolicy(
    context: CurrentBusinessContext
  ): CommercialGovernancePolicyView {
    return this.store.getOrCreatePolicy(context.businessId);
  }

  upsertPolicy(
    context: CurrentBusinessContext,
    actor: CommercialGovernanceActor,
    input: UpsertCommercialGovernancePolicyInput
  ): CommercialGovernancePolicyView {
    assertBusinessScope(context.businessId, context.businessId);
    assertPermission(actor, COMMERCIAL_GOVERNANCE_PERMISSIONS.EDIT);
    return this.store.upsertPolicy(context.businessId, input, actor.userId);
  }

  getWorkspace(
    context: CurrentBusinessContext
  ): CommercialGovernanceWorkspaceView {
    const businessId = context.businessId;
    const policy = this.store.getOrCreatePolicy(businessId);
    return {
      policy,
      drafts: this.store.listRules(
        businessId,
        COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES.DRAFT
      ),
      pendingApproval: this.store.listRules(
        businessId,
        COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES.PENDING_APPROVAL
      ),
      active: this.store.listRules(
        businessId,
        COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES.ACTIVE
      ),
      suspended: this.store.listRules(
        businessId,
        COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES.SUSPENDED
      ),
      recentEvents: this.store.listEvents(businessId).slice(0, 50),
      pendingOverrides: this.store.listOverrides(
        businessId,
        COMMERCIAL_OVERRIDE_STATUS_CODES.REQUESTED
      ),
    };
  }

  getRuleHistory(
    context: CurrentBusinessContext,
    ruleVersionId: string
  ): {
    rule: CommercialRuleVersionView;
    events: CommercialGovernanceEventView[];
    versions: CommercialRuleVersionView[];
  } {
    const rule = this.requireRule(context.businessId, ruleVersionId);
    const events = this.store.listEvents(context.businessId, ruleVersionId);
    const versions = this.store
      .listRules(context.businessId)
      .filter((r) => r.ruleKey === rule.ruleKey)
      .sort((a, b) => a.versionNumber - b.versionNumber);
    return { rule, events, versions };
  }

  createDraft(
    context: CurrentBusinessContext,
    actor: CommercialGovernanceActor,
    input: CreateCommercialRuleDraftInput
  ): CommercialRuleVersionView {
    assertPermission(actor, COMMERCIAL_GOVERNANCE_PERMISSIONS.CREATE);
    const policy = this.store.getOrCreatePolicy(context.businessId);
    // IP-09 BRU-005 — validate configuration payload at save (fail closed).
    createCommercialValidationService().assertConfigurationSave(input);
    if (!input.ruleKey?.trim() || !input.label?.trim()) {
      throw new CommercialError(
        "INVALID_INPUT",
        "Rule key and label are required.",
        400,
        "ruleKey"
      );
    }

    let versionNumber = 1;
    const previousVersionId: string | null = input.previousVersionId ?? null;
    if (previousVersionId) {
      const previous = this.requireRule(context.businessId, previousVersionId);
      if (previous.ruleKey !== input.ruleKey.trim()) {
        throw new CommercialError(
          "INVALID_INPUT",
          "previousVersionId must belong to the same rule key.",
          400,
          "previousVersionId"
        );
      }
      versionNumber = this.store.nextVersionNumber(
        context.businessId,
        input.ruleKey.trim()
      );
    } else {
      versionNumber = this.store.nextVersionNumber(
        context.businessId,
        input.ruleKey.trim()
      );
    }

    const createdAt = nowIso();
    const rule: CommercialRuleVersionView = {
      ruleVersionId: randomUUID(),
      businessId: context.businessId,
      ruleKey: input.ruleKey.trim(),
      ruleType: input.ruleType,
      versionNumber,
      lifecycleStatus: COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES.DRAFT,
      label: input.label.trim(),
      description: input.description ?? null,
      payload: structuredClone(input.payload),
      currencyCode: input.currencyCode?.trim().toUpperCase() ?? null,
      effectiveFrom: input.effectiveFrom ?? null,
      effectiveTo: input.effectiveTo ?? null,
      previousVersionId,
      supersededByVersionId: null,
      approvalRequired: policy.approvalRequired,
      submittedBy: null,
      submittedAt: null,
      approvedBy: null,
      approvedAt: null,
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
      activatedBy: null,
      activatedAt: null,
      suspendedBy: null,
      suspendedAt: null,
      suspensionReason: null,
      retiredBy: null,
      retiredAt: null,
      retirementReason: null,
      createdBy: actor.userId,
      createdAt,
      updatedAt: createdAt,
    };

    const saved = this.store.insertRule(rule);
    this.recordEvent(context.businessId, saved, {
      eventType: COMMERCIAL_GOVERNANCE_EVENT_TYPES.RULE_CREATED,
      actorUserId: actor.userId,
      beforeStatus: null,
      afterStatus: saved.lifecycleStatus,
      beforePayload: null,
      afterPayload: saved.payload,
      reason: "Draft commercial configuration created.",
      approvalStatus: null,
    });
    void this.safeAudit({
      businessId: context.businessId,
      entityName: AUDIT_ENTITY_NAMES.COMMERCIAL_RULE_VERSION,
      entityId: saved.ruleVersionId,
      operation: AUDIT_OPERATIONS.CREATE,
      changedBy: actor.userId,
      sourceModule: AUDIT_SOURCE_MODULES.COMMERCIAL_GOVERNANCE,
      changes: createFieldChanges({ lifecycleStatus: "updated" }),
    });
    return saved;
  }

  updateDraft(
    context: CurrentBusinessContext,
    actor: CommercialGovernanceActor,
    input: UpdateCommercialRuleDraftInput
  ): CommercialRuleVersionView {
    assertPermission(actor, COMMERCIAL_GOVERNANCE_PERMISSIONS.EDIT);
    const rule = this.requireRule(context.businessId, input.ruleVersionId);
    const policy = this.store.getOrCreatePolicy(context.businessId);

    if (
      rule.lifecycleStatus !== COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES.DRAFT &&
      rule.lifecycleStatus !== COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES.REJECTED
    ) {
      // Material edit of approved/active must create a new version — not mutate.
      if (
        rule.lifecycleStatus ===
          COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES.ACTIVE ||
        rule.lifecycleStatus ===
          COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES.APPROVED
      ) {
        throw new CommercialError(
          "MATERIAL_CHANGE_REQUIRES_APPROVAL",
          "Cannot mutate an approved/active commercial configuration. Create a new version draft.",
          409,
          "ruleVersionId"
        );
      }
      throw new CommercialError(
        "INVALID_LIFECYCLE_TRANSITION",
        COMMERCIAL_USER_MESSAGES.INVALID_LIFECYCLE_TRANSITION,
        409
      );
    }

    const materiality = detectMaterialChange(
      rule,
      {
        label: input.label,
        description: input.description,
        payload: input.payload,
        currencyCode: input.currencyCode,
        effectiveFrom: input.effectiveFrom,
        effectiveTo: input.effectiveTo,
      },
      policy.materialFieldPaths
    );

    // IP-09 BRU-005 — validate merged payload before save.
    createCommercialValidationService().assertConfigurationSave({
      ruleKey: rule.ruleKey,
      ruleType: rule.ruleType,
      label: input.label ?? rule.label,
      description:
        input.description === undefined ? rule.description : input.description,
      payload: input.payload
        ? structuredClone(input.payload)
        : structuredClone(rule.payload),
      currencyCode:
        input.currencyCode === undefined
          ? rule.currencyCode
          : input.currencyCode,
      effectiveFrom:
        input.effectiveFrom === undefined
          ? rule.effectiveFrom
          : input.effectiveFrom,
      effectiveTo:
        input.effectiveTo === undefined ? rule.effectiveTo : input.effectiveTo,
    });

    const beforePayload = structuredClone(rule.payload);
    const updated = this.store.updateRule(
      context.businessId,
      rule.ruleVersionId,
      {
        label: input.label ?? rule.label,
        description:
          input.description === undefined ? rule.description : input.description,
        payload: input.payload
          ? structuredClone(input.payload)
          : rule.payload,
        currencyCode:
          input.currencyCode === undefined
            ? rule.currencyCode
            : input.currencyCode?.trim().toUpperCase() ?? null,
        effectiveFrom:
          input.effectiveFrom === undefined
            ? rule.effectiveFrom
            : input.effectiveFrom,
        effectiveTo:
          input.effectiveTo === undefined ? rule.effectiveTo : input.effectiveTo,
        lifecycleStatus: COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES.DRAFT,
        rejectionReason: null,
        rejectedBy: null,
        rejectedAt: null,
        updatedAt: nowIso(),
      }
    );
    if (!updated) {
      throw new CommercialError(
        "GOVERNANCE_RULE_NOT_FOUND",
        COMMERCIAL_USER_MESSAGES.GOVERNANCE_RULE_NOT_FOUND,
        404
      );
    }

    this.recordEvent(context.businessId, updated, {
      eventType: materiality.isMaterial
        ? COMMERCIAL_GOVERNANCE_EVENT_TYPES.RULE_AMENDED
        : COMMERCIAL_GOVERNANCE_EVENT_TYPES.NON_MATERIAL_UPDATED,
      actorUserId: actor.userId,
      beforeStatus: rule.lifecycleStatus,
      afterStatus: updated.lifecycleStatus,
      beforePayload,
      afterPayload: updated.payload,
      reason: materiality.isMaterial
        ? `Material change: ${materiality.changedMaterialPaths.join(", ")}`
        : `Non-material change: ${materiality.changedNonMaterialPaths.join(", ") || "metadata"}`,
      approvalStatus: null,
    });

    return updated;
  }

  /**
   * Create a new draft version from an existing approved/active version
   * without mutating the historical version.
   */
  createNewVersionDraft(
    context: CurrentBusinessContext,
    actor: CommercialGovernanceActor,
    sourceRuleVersionId: string,
    patch: Partial<CreateCommercialRuleDraftInput> = {}
  ): CommercialRuleVersionView {
    const source = this.requireRule(context.businessId, sourceRuleVersionId);
    return this.createDraft(context, actor, {
      ruleKey: source.ruleKey,
      ruleType: source.ruleType,
      label: patch.label ?? source.label,
      description: patch.description ?? source.description,
      payload: patch.payload
        ? structuredClone(patch.payload)
        : structuredClone(source.payload),
      currencyCode: patch.currencyCode ?? source.currencyCode,
      effectiveFrom: patch.effectiveFrom ?? source.effectiveFrom,
      effectiveTo: patch.effectiveTo ?? source.effectiveTo,
      previousVersionId: source.ruleVersionId,
    });
  }

  submitForApproval(
    context: CurrentBusinessContext,
    actor: CommercialGovernanceActor,
    ruleVersionId: string
  ): { rule: CommercialRuleVersionView; decision: CommercialGovernanceDecision } {
    assertPermission(actor, COMMERCIAL_GOVERNANCE_PERMISSIONS.SUBMIT);
    const rule = this.requireRule(context.businessId, ruleVersionId);
    const policy = this.store.getOrCreatePolicy(context.businessId);

    assertLifecycleTransition(
      rule.lifecycleStatus,
      COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES.PENDING_APPROVAL,
      { approvalRequired: policy.approvalRequired }
    );

    if (!policy.approvalRequired) {
      // Auto-approve path when policy does not require approval.
      const approved = this.store.updateRule(
        context.businessId,
        rule.ruleVersionId,
        {
          lifecycleStatus: COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES.APPROVED,
          approvedBy: actor.userId,
          approvedAt: nowIso(),
          submittedBy: actor.userId,
          submittedAt: nowIso(),
        }
      )!;
      const decision = buildGovernanceDecision({
        decision: COMMERCIAL_GOVERNANCE_DECISION_CODES.ALLOWED,
        reason: "Approval not required by governance policy.",
        governanceRule: "APPROVAL_NOT_REQUIRED",
        businessId: context.businessId,
        actorUserId: actor.userId,
        ruleVersionId: approved.ruleVersionId,
        approvalReference: approved.ruleVersionId,
      });
      this.recordEvent(context.businessId, approved, {
        eventType: COMMERCIAL_GOVERNANCE_EVENT_TYPES.RULE_APPROVED,
        actorUserId: actor.userId,
        beforeStatus: rule.lifecycleStatus,
        afterStatus: approved.lifecycleStatus,
        beforePayload: rule.payload,
        afterPayload: approved.payload,
        reason: decision.reason,
        approvalStatus: "APPROVED",
      });
      return { rule: approved, decision };
    }

    const submitted = this.store.updateRule(
      context.businessId,
      rule.ruleVersionId,
      {
        lifecycleStatus: COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES.PENDING_APPROVAL,
        submittedBy: actor.userId,
        submittedAt: nowIso(),
      }
    )!;

    const changeAmount =
      typeof submitted.payload.fixedAmount === "string" ||
      typeof submitted.payload.fixedAmount === "number"
        ? submitted.payload.fixedAmount
        : typeof submitted.payload.unitPrice === "string" ||
            typeof submitted.payload.unitPrice === "number"
          ? submitted.payload.unitPrice
          : null;
    const enhanced = exceedsApprovalThreshold(
      policy,
      changeAmount,
      submitted.currencyCode
    );

    const decision = buildGovernanceDecision({
      decision: COMMERCIAL_GOVERNANCE_DECISION_CODES.APPROVAL_REQUIRED,
      reason: enhanced
        ? "Material commercial change exceeds approval threshold — enhanced approval required."
        : "Material commercial configuration requires checker approval.",
      governanceRule: enhanced
        ? "THRESHOLD_ENHANCED_APPROVAL"
        : "STANDARD_APPROVAL",
      businessId: context.businessId,
      actorUserId: actor.userId,
      ruleVersionId: submitted.ruleVersionId,
      approvalReference: submitted.ruleVersionId,
      details: { enhanced },
    });

    this.recordEvent(context.businessId, submitted, {
      eventType: COMMERCIAL_GOVERNANCE_EVENT_TYPES.RULE_SUBMITTED,
      actorUserId: actor.userId,
      beforeStatus: rule.lifecycleStatus,
      afterStatus: submitted.lifecycleStatus,
      beforePayload: rule.payload,
      afterPayload: submitted.payload,
      reason: decision.reason,
      approvalStatus: "PENDING",
    });

    void this.safeAudit({
      businessId: context.businessId,
      entityName: AUDIT_ENTITY_NAMES.COMMERCIAL_RULE_VERSION,
      entityId: submitted.ruleVersionId,
      operation: AUDIT_OPERATIONS.UPDATE,
      changedBy: actor.userId,
      sourceModule: AUDIT_SOURCE_MODULES.COMMERCIAL_GOVERNANCE,
      changes: createFieldChanges({ lifecycleStatus: "updated" }),
    });

    return { rule: submitted, decision };
  }

  approve(
    context: CurrentBusinessContext,
    actor: CommercialGovernanceActor,
    ruleVersionId: string
  ): CommercialRuleVersionView {
    assertPermission(actor, COMMERCIAL_GOVERNANCE_PERMISSIONS.APPROVE);
    const rule = this.requireRule(context.businessId, ruleVersionId);
    const policy = this.store.getOrCreatePolicy(context.businessId);

    assertLifecycleTransition(
      rule.lifecycleStatus,
      COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES.APPROVED,
      { approvalRequired: policy.approvalRequired }
    );

    const makerId = rule.submittedBy ?? rule.createdBy;
    assertSegregationOfDuties(policy, makerId, actor.userId);

    const approved = this.store.updateRule(
      context.businessId,
      rule.ruleVersionId,
      {
        lifecycleStatus: COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES.APPROVED,
        approvedBy: actor.userId,
        approvedAt: nowIso(),
        rejectionReason: null,
        rejectedBy: null,
        rejectedAt: null,
      }
    )!;

    this.recordEvent(context.businessId, approved, {
      eventType: COMMERCIAL_GOVERNANCE_EVENT_TYPES.RULE_APPROVED,
      actorUserId: actor.userId,
      beforeStatus: rule.lifecycleStatus,
      afterStatus: approved.lifecycleStatus,
      beforePayload: rule.payload,
      afterPayload: approved.payload,
      reason: "Checker approved commercial configuration.",
      approvalStatus: "APPROVED",
    });

    void this.safeAudit({
      businessId: context.businessId,
      entityName: AUDIT_ENTITY_NAMES.COMMERCIAL_RULE_VERSION,
      entityId: approved.ruleVersionId,
      operation: AUDIT_OPERATIONS.UPDATE,
      changedBy: actor.userId,
      sourceModule: AUDIT_SOURCE_MODULES.COMMERCIAL_GOVERNANCE,
      changes: createFieldChanges({ lifecycleStatus: "updated" }),
    });

    return approved;
  }

  reject(
    context: CurrentBusinessContext,
    actor: CommercialGovernanceActor,
    ruleVersionId: string,
    reason: string
  ): CommercialRuleVersionView {
    assertPermission(actor, COMMERCIAL_GOVERNANCE_PERMISSIONS.REJECT);
    if (!reason?.trim()) {
      throw new CommercialError(
        "JUSTIFICATION_REQUIRED",
        COMMERCIAL_USER_MESSAGES.JUSTIFICATION_REQUIRED,
        400,
        "reason"
      );
    }
    const rule = this.requireRule(context.businessId, ruleVersionId);
    const policy = this.store.getOrCreatePolicy(context.businessId);

    assertLifecycleTransition(
      rule.lifecycleStatus,
      COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES.REJECTED,
      { approvalRequired: policy.approvalRequired }
    );

    const makerId = rule.submittedBy ?? rule.createdBy;
    assertSegregationOfDuties(policy, makerId, actor.userId);

    const rejected = this.store.updateRule(
      context.businessId,
      rule.ruleVersionId,
      {
        lifecycleStatus: COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES.REJECTED,
        rejectedBy: actor.userId,
        rejectedAt: nowIso(),
        rejectionReason: reason.trim(),
      }
    )!;

    this.recordEvent(context.businessId, rejected, {
      eventType: COMMERCIAL_GOVERNANCE_EVENT_TYPES.RULE_REJECTED,
      actorUserId: actor.userId,
      beforeStatus: rule.lifecycleStatus,
      afterStatus: rejected.lifecycleStatus,
      beforePayload: rule.payload,
      afterPayload: rejected.payload,
      reason: reason.trim(),
      approvalStatus: "REJECTED",
    });

    return rejected;
  }

  activate(
    context: CurrentBusinessContext,
    actor: CommercialGovernanceActor,
    ruleVersionId: string,
    asAt: Date = new Date()
  ): CommercialRuleVersionView {
    assertPermission(actor, COMMERCIAL_GOVERNANCE_PERMISSIONS.ACTIVATE);
    const rule = this.requireRule(context.businessId, ruleVersionId);
    const policy = this.store.getOrCreatePolicy(context.businessId);

    const decision = evaluateActivationDecision({
      policy,
      rule,
      actor,
      asAt,
    });

    if (decision.decision === COMMERCIAL_GOVERNANCE_DECISION_CODES.REVIEW_REQUIRED) {
      throw new CommercialError(
        "EFFECTIVE_DATE_NOT_REACHED",
        COMMERCIAL_USER_MESSAGES.EFFECTIVE_DATE_NOT_REACHED,
        409,
        "effectiveFrom",
        decision.details
      );
    }
    if (decision.decision !== COMMERCIAL_GOVERNANCE_DECISION_CODES.ALLOWED) {
      throw new CommercialError(
        "APPROVAL_REQUIRED",
        decision.reason,
        409
      );
    }

    assertLifecycleTransition(
      rule.lifecycleStatus,
      COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES.ACTIVE,
      { approvalRequired: policy.approvalRequired }
    );

    // Supersede prior ACTIVE versions of the same rule key.
    const siblings = this.store
      .listRules(context.businessId)
      .filter(
        (r) =>
          r.ruleKey === rule.ruleKey &&
          r.ruleVersionId !== rule.ruleVersionId &&
          r.lifecycleStatus === COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES.ACTIVE
      );
    for (const sibling of siblings) {
      this.store.updateRule(context.businessId, sibling.ruleVersionId, {
        lifecycleStatus: COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES.RETIRED,
        supersededByVersionId: rule.ruleVersionId,
        retiredBy: actor.userId,
        retiredAt: nowIso(),
        retirementReason: "Superseded by newer activated version.",
      });
    }

    const activated = this.store.updateRule(
      context.businessId,
      rule.ruleVersionId,
      {
        lifecycleStatus: COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES.ACTIVE,
        activatedBy: actor.userId,
        activatedAt: nowIso(),
      }
    )!;

    this.recordEvent(context.businessId, activated, {
      eventType: COMMERCIAL_GOVERNANCE_EVENT_TYPES.RULE_ACTIVATED,
      actorUserId: actor.userId,
      beforeStatus: rule.lifecycleStatus,
      afterStatus: activated.lifecycleStatus,
      beforePayload: rule.payload,
      afterPayload: activated.payload,
      reason: "Commercial rule activated.",
      approvalStatus: "APPROVED",
    });

    void this.safeAudit({
      businessId: context.businessId,
      entityName: AUDIT_ENTITY_NAMES.COMMERCIAL_RULE_VERSION,
      entityId: activated.ruleVersionId,
      operation: AUDIT_OPERATIONS.ACTIVATE,
      changedBy: actor.userId,
      sourceModule: AUDIT_SOURCE_MODULES.COMMERCIAL_GOVERNANCE,
      changes: createFieldChanges({ lifecycleStatus: "updated" }),
    });

    return activated;
  }

  suspend(
    context: CurrentBusinessContext,
    actor: CommercialGovernanceActor,
    ruleVersionId: string,
    reason: string
  ): CommercialRuleVersionView {
    assertPermission(actor, COMMERCIAL_GOVERNANCE_PERMISSIONS.SUSPEND);
    if (!reason?.trim()) {
      throw new CommercialError(
        "JUSTIFICATION_REQUIRED",
        COMMERCIAL_USER_MESSAGES.JUSTIFICATION_REQUIRED,
        400,
        "reason"
      );
    }
    const rule = this.requireRule(context.businessId, ruleVersionId);
    const policy = this.store.getOrCreatePolicy(context.businessId);

    assertLifecycleTransition(
      rule.lifecycleStatus,
      COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES.SUSPENDED,
      { approvalRequired: policy.approvalRequired }
    );

    const suspended = this.store.updateRule(
      context.businessId,
      rule.ruleVersionId,
      {
        lifecycleStatus: COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES.SUSPENDED,
        suspendedBy: actor.userId,
        suspendedAt: nowIso(),
        suspensionReason: reason.trim(),
      }
    )!;

    this.recordEvent(context.businessId, suspended, {
      eventType: COMMERCIAL_GOVERNANCE_EVENT_TYPES.RULE_SUSPENDED,
      actorUserId: actor.userId,
      beforeStatus: rule.lifecycleStatus,
      afterStatus: suspended.lifecycleStatus,
      beforePayload: rule.payload,
      afterPayload: suspended.payload,
      reason: reason.trim(),
      approvalStatus: null,
    });

    void this.safeAudit({
      businessId: context.businessId,
      entityName: AUDIT_ENTITY_NAMES.COMMERCIAL_RULE_VERSION,
      entityId: suspended.ruleVersionId,
      operation: AUDIT_OPERATIONS.DEACTIVATE,
      changedBy: actor.userId,
      sourceModule: AUDIT_SOURCE_MODULES.COMMERCIAL_GOVERNANCE,
      changes: createFieldChanges({ lifecycleStatus: "updated" }),
    });

    return suspended;
  }

  /**
   * Governance gate for using a rule in resolution — does not recalculate amounts.
   */
  evaluateRuleApplicability(
    context: CurrentBusinessContext,
    actor: CommercialGovernanceActor,
    ruleVersionId: string,
    asAt: Date = new Date()
  ): CommercialGovernanceDecision {
    const rule = this.requireRule(context.businessId, ruleVersionId);
    if (!isCommerciallyEffectiveAt(rule, asAt)) {
      return buildGovernanceDecision({
        decision: COMMERCIAL_GOVERNANCE_DECISION_CODES.REJECTED,
        reason:
          "Rule is not ACTIVE within its effective window for commercial resolution.",
        governanceRule: "EFFECTIVE_APPLICABILITY_GATE",
        businessId: context.businessId,
        actorUserId: actor.userId,
        ruleVersionId: rule.ruleVersionId,
      });
    }
    return buildGovernanceDecision({
      decision: COMMERCIAL_GOVERNANCE_DECISION_CODES.ALLOWED,
      reason: "Rule is governed, active, and effective.",
      governanceRule: "APPLICABILITY_ALLOWED",
      businessId: context.businessId,
      actorUserId: actor.userId,
      ruleVersionId: rule.ruleVersionId,
    });
  }

  /**
   * Validate a completed IP-06 snapshot against governance expectations.
   * Does not mutate the snapshot or recalculate payable.
   */
  validateSnapshotGovernance(
    context: CurrentBusinessContext,
    actor: CommercialGovernanceActor,
    snapshot: CommercialSnapshot
  ): CommercialGovernanceDecision {
    assertBusinessScope(context.businessId, snapshot.businessId);
    if (!snapshot.immutable || !snapshot.integrityHash) {
      return buildGovernanceDecision({
        decision: COMMERCIAL_GOVERNANCE_DECISION_CODES.REJECTED,
        reason: "Snapshot is not an immutable governed commercial result.",
        governanceRule: "SNAPSHOT_IMMUTABILITY_GATE",
        businessId: context.businessId,
        actorUserId: actor.userId,
        ruleVersionId: null,
      });
    }
    return buildGovernanceDecision({
      decision: COMMERCIAL_GOVERNANCE_DECISION_CODES.ALLOWED,
      reason:
        "Immutable commercial snapshot accepted. Historical payable is not rewritten by governance.",
      governanceRule: "SNAPSHOT_GOVERNANCE_OK",
      businessId: context.businessId,
      actorUserId: actor.userId,
      approvalReference: snapshot.snapshotId,
      ruleVersionId: null,
      details: {
        snapshotId: snapshot.snapshotId,
        payable: snapshot.resolution.payable,
      },
    });
  }

  requestOverride(
    context: CurrentBusinessContext,
    actor: CommercialGovernanceActor,
    input: RequestCommercialOverrideInput
  ): CommercialOverrideRequestView {
    assertPermission(actor, COMMERCIAL_GOVERNANCE_PERMISSIONS.OVERRIDE_REQUEST);
    const policy = this.store.getOrCreatePolicy(context.businessId);
    if (!policy.allowOverride) {
      throw new CommercialError(
        "OVERRIDE_NOT_PERMITTED",
        COMMERCIAL_USER_MESSAGES.OVERRIDE_NOT_PERMITTED,
        403
      );
    }
    if (!input.reason?.trim()) {
      throw new CommercialError(
        "JUSTIFICATION_REQUIRED",
        COMMERCIAL_USER_MESSAGES.JUSTIFICATION_REQUIRED,
        400,
        "reason"
      );
    }
    if (input.ruleVersionId) {
      this.requireRule(context.businessId, input.ruleVersionId);
    }

    const createdAt = nowIso();
    const override: CommercialOverrideRequestView = {
      overrideId: randomUUID(),
      businessId: context.businessId,
      ruleVersionId: input.ruleVersionId ?? null,
      snapshotId: input.snapshotId ?? null,
      resolutionId: input.resolutionId ?? null,
      status: policy.overrideRequiresApproval
        ? COMMERCIAL_OVERRIDE_STATUS_CODES.REQUESTED
        : COMMERCIAL_OVERRIDE_STATUS_CODES.APPROVED,
      reason: input.reason.trim(),
      originalValue: structuredClone(input.originalValue),
      overriddenValue: structuredClone(input.overriddenValue),
      applicableRuleKey: input.applicableRuleKey ?? null,
      requestedBy: actor.userId,
      requestedAt: createdAt,
      approvedBy: policy.overrideRequiresApproval ? null : actor.userId,
      approvedAt: policy.overrideRequiresApproval ? null : createdAt,
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
    };

    const saved = this.store.insertOverride(override);
    if (input.ruleVersionId) {
      const rule = this.requireRule(context.businessId, input.ruleVersionId);
      this.recordEvent(context.businessId, rule, {
        eventType: COMMERCIAL_GOVERNANCE_EVENT_TYPES.OVERRIDE_REQUESTED,
        actorUserId: actor.userId,
        beforeStatus: rule.lifecycleStatus,
        afterStatus: rule.lifecycleStatus,
        beforePayload: input.originalValue,
        afterPayload: input.overriddenValue,
        reason: input.reason.trim(),
        approvalStatus: saved.status,
      });
    }
    return saved;
  }

  approveOverride(
    context: CurrentBusinessContext,
    actor: CommercialGovernanceActor,
    overrideId: string
  ): CommercialOverrideRequestView {
    assertPermission(actor, COMMERCIAL_GOVERNANCE_PERMISSIONS.OVERRIDE_APPROVE);
    const policy = this.store.getOrCreatePolicy(context.businessId);
    const override = this.store.getOverride(context.businessId, overrideId);
    if (!override) {
      throw new CommercialError(
        "GOVERNANCE_RULE_NOT_FOUND",
        "Override request was not found.",
        404
      );
    }
    assertSegregationOfDuties(policy, override.requestedBy, actor.userId);

    const approved = this.store.updateOverride(
      context.businessId,
      overrideId,
      {
        status: COMMERCIAL_OVERRIDE_STATUS_CODES.APPROVED,
        approvedBy: actor.userId,
        approvedAt: nowIso(),
      }
    )!;

    if (approved.ruleVersionId) {
      const rule = this.requireRule(
        context.businessId,
        approved.ruleVersionId
      );
      this.recordEvent(context.businessId, rule, {
        eventType: COMMERCIAL_GOVERNANCE_EVENT_TYPES.OVERRIDE_APPROVED,
        actorUserId: actor.userId,
        beforeStatus: rule.lifecycleStatus,
        afterStatus: rule.lifecycleStatus,
        beforePayload: approved.originalValue,
        afterPayload: approved.overriddenValue,
        reason: approved.reason,
        approvalStatus: "APPROVED",
      });
    }
    return approved;
  }

  rejectOverride(
    context: CurrentBusinessContext,
    actor: CommercialGovernanceActor,
    overrideId: string,
    reason: string
  ): CommercialOverrideRequestView {
    assertPermission(actor, COMMERCIAL_GOVERNANCE_PERMISSIONS.OVERRIDE_APPROVE);
    if (!reason?.trim()) {
      throw new CommercialError(
        "JUSTIFICATION_REQUIRED",
        COMMERCIAL_USER_MESSAGES.JUSTIFICATION_REQUIRED,
        400,
        "reason"
      );
    }
    const override = this.store.getOverride(context.businessId, overrideId);
    if (!override) {
      throw new CommercialError(
        "GOVERNANCE_RULE_NOT_FOUND",
        "Override request was not found.",
        404
      );
    }
    const rejected = this.store.updateOverride(
      context.businessId,
      overrideId,
      {
        status: COMMERCIAL_OVERRIDE_STATUS_CODES.REJECTED,
        rejectedBy: actor.userId,
        rejectedAt: nowIso(),
        rejectionReason: reason.trim(),
      }
    )!;

    if (rejected.ruleVersionId) {
      const rule = this.requireRule(
        context.businessId,
        rejected.ruleVersionId
      );
      this.recordEvent(context.businessId, rule, {
        eventType: COMMERCIAL_GOVERNANCE_EVENT_TYPES.OVERRIDE_REJECTED,
        actorUserId: actor.userId,
        beforeStatus: rule.lifecycleStatus,
        afterStatus: rule.lifecycleStatus,
        beforePayload: rejected.originalValue,
        afterPayload: rejected.overriddenValue,
        reason: reason.trim(),
        approvalStatus: "REJECTED",
      });
    }
    return rejected;
  }

  /** Hard delete is forbidden for ACTIVE / historically referenced versions. */
  assertHardDeleteForbidden(rule: CommercialRuleVersionView): void {
    if (
      rule.lifecycleStatus === COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES.ACTIVE ||
      rule.lifecycleStatus === COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES.APPROVED ||
      rule.lifecycleStatus === COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES.RETIRED ||
      rule.lifecycleStatus === COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES.EXPIRED
    ) {
      throw new CommercialError(
        "HARD_DELETE_FORBIDDEN",
        COMMERCIAL_USER_MESSAGES.HARD_DELETE_FORBIDDEN,
        409
      );
    }
  }

  private requireRule(
    businessId: string,
    ruleVersionId: string
  ): CommercialRuleVersionView {
    const rule = this.store.getRule(businessId, ruleVersionId);
    if (!rule) {
      throw new CommercialError(
        "GOVERNANCE_RULE_NOT_FOUND",
        COMMERCIAL_USER_MESSAGES.GOVERNANCE_RULE_NOT_FOUND,
        404,
        "ruleVersionId"
      );
    }
    return rule;
  }

  private recordEvent(
    businessId: string,
    rule: CommercialRuleVersionView,
    input: {
      eventType: string;
      actorUserId: string;
      beforeStatus: string | null;
      afterStatus: string | null;
      beforePayload: Record<string, unknown> | null;
      afterPayload: Record<string, unknown> | null;
      reason: string | null;
      approvalStatus: string | null;
    }
  ): void {
    this.store.appendEvent({
      businessId,
      ruleVersionId: rule.ruleVersionId,
      eventType: input.eventType,
      actorUserId: input.actorUserId,
      beforeStatus: input.beforeStatus,
      afterStatus: input.afterStatus,
      beforePayload: input.beforePayload,
      afterPayload: input.afterPayload,
      reason: input.reason,
      approvalStatus: input.approvalStatus,
    });
  }
}

export function createCommercialGovernanceService(
  store?: CommercialGovernanceStore,
  options?: { disableAudit?: boolean }
) {
  return new CommercialGovernanceService(
    store ?? createInMemoryCommercialGovernanceStore(),
    options?.disableAudit ? { record: async () => undefined } : null
  );
}
