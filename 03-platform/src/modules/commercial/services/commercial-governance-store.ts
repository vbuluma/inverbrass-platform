/**
 * Purpose:
 * In-memory commercial governance persistence for IP-08.
 * Production factory can wrap the same interface with Drizzle repositories.
 *
 * Implementation Package:
 * BP-005 / IP-08 – Commercial Governance
 */

import { randomUUID } from "node:crypto";

import {
  COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES,
  COMMERCIAL_OVERRIDE_STATUS_CODES,
  type CommercialGovernanceLifecycleCode,
  type CommercialOverrideStatusCode,
} from "@/modules/commercial/constants";
import { defaultGovernancePolicy } from "@/modules/commercial/services/commercial-governance-rules";
import type {
  CommercialGovernanceEventView,
  CommercialGovernancePolicyView,
  CommercialOverrideRequestView,
  CommercialRuleVersionView,
  UpsertCommercialGovernancePolicyInput,
} from "@/modules/commercial/types";

export type CommercialGovernanceStore = {
  getOrCreatePolicy(businessId: string): CommercialGovernancePolicyView;
  upsertPolicy(
    businessId: string,
    input: UpsertCommercialGovernancePolicyInput,
    actorUserId: string
  ): CommercialGovernancePolicyView;
  listRules(
    businessId: string,
    status?: CommercialGovernanceLifecycleCode
  ): CommercialRuleVersionView[];
  getRule(
    businessId: string,
    ruleVersionId: string
  ): CommercialRuleVersionView | null;
  getRuleByKeyVersion(
    businessId: string,
    ruleKey: string,
    versionNumber: number
  ): CommercialRuleVersionView | null;
  nextVersionNumber(businessId: string, ruleKey: string): number;
  insertRule(rule: CommercialRuleVersionView): CommercialRuleVersionView;
  updateRule(
    businessId: string,
    ruleVersionId: string,
    patch: Partial<CommercialRuleVersionView>
  ): CommercialRuleVersionView | null;
  listEvents(
    businessId: string,
    ruleVersionId?: string
  ): CommercialGovernanceEventView[];
  appendEvent(
    event: Omit<CommercialGovernanceEventView, "eventId" | "performedAt"> & {
      eventId?: string;
      performedAt?: string;
    }
  ): CommercialGovernanceEventView;
  listOverrides(
    businessId: string,
    status?: CommercialOverrideStatusCode
  ): CommercialOverrideRequestView[];
  getOverride(
    businessId: string,
    overrideId: string
  ): CommercialOverrideRequestView | null;
  insertOverride(
    override: CommercialOverrideRequestView
  ): CommercialOverrideRequestView;
  updateOverride(
    businessId: string,
    overrideId: string,
    patch: Partial<CommercialOverrideRequestView>
  ): CommercialOverrideRequestView | null;
};

export class InMemoryCommercialGovernanceStore
  implements CommercialGovernanceStore
{
  private policies = new Map<string, CommercialGovernancePolicyView>();
  private rules = new Map<string, CommercialRuleVersionView>();
  private events: CommercialGovernanceEventView[] = [];
  private overrides = new Map<string, CommercialOverrideRequestView>();

  getOrCreatePolicy(businessId: string): CommercialGovernancePolicyView {
    const existing = this.policies.get(businessId);
    if (existing) {
      return structuredClone(existing);
    }
    const created = defaultGovernancePolicy(businessId, randomUUID());
    this.policies.set(businessId, created);
    return structuredClone(created);
  }

  upsertPolicy(
    businessId: string,
    input: UpsertCommercialGovernancePolicyInput,
    actorUserId: string
  ): CommercialGovernancePolicyView {
    void actorUserId;
    const current = this.getOrCreatePolicy(businessId);
    const next: CommercialGovernancePolicyView = {
      ...current,
      approvalRequired:
        input.approvalRequired ?? current.approvalRequired,
      requiresSegregationOfDuties:
        input.requiresSegregationOfDuties ??
        current.requiresSegregationOfDuties,
      requiredApproverCount:
        input.requiredApproverCount ?? current.requiredApproverCount,
      approvalThresholdAmount:
        input.approvalThresholdAmount === undefined
          ? current.approvalThresholdAmount
          : input.approvalThresholdAmount,
      approvalThresholdCurrency:
        input.approvalThresholdCurrency === undefined
          ? current.approvalThresholdCurrency
          : input.approvalThresholdCurrency,
      allowOverride: input.allowOverride ?? current.allowOverride,
      overrideRequiresApproval:
        input.overrideRequiresApproval ?? current.overrideRequiresApproval,
      mandatoryJustification:
        input.mandatoryJustification ?? current.mandatoryJustification,
      materialFieldPaths:
        input.materialFieldPaths ?? current.materialFieldPaths,
    };
    this.policies.set(businessId, next);
    return structuredClone(next);
  }

  listRules(
    businessId: string,
    status?: CommercialGovernanceLifecycleCode
  ): CommercialRuleVersionView[] {
    return [...this.rules.values()]
      .filter(
        (r) =>
          r.businessId === businessId &&
          (status == null || r.lifecycleStatus === status)
      )
      .map((r) => structuredClone(r))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  getRule(
    businessId: string,
    ruleVersionId: string
  ): CommercialRuleVersionView | null {
    const row = this.rules.get(ruleVersionId);
    if (!row || row.businessId !== businessId) {
      return null;
    }
    return structuredClone(row);
  }

  getRuleByKeyVersion(
    businessId: string,
    ruleKey: string,
    versionNumber: number
  ): CommercialRuleVersionView | null {
    const row = [...this.rules.values()].find(
      (r) =>
        r.businessId === businessId &&
        r.ruleKey === ruleKey &&
        r.versionNumber === versionNumber
    );
    return row ? structuredClone(row) : null;
  }

  nextVersionNumber(businessId: string, ruleKey: string): number {
    const versions = [...this.rules.values()]
      .filter((r) => r.businessId === businessId && r.ruleKey === ruleKey)
      .map((r) => r.versionNumber);
    return versions.length === 0 ? 1 : Math.max(...versions) + 1;
  }

  insertRule(rule: CommercialRuleVersionView): CommercialRuleVersionView {
    this.rules.set(rule.ruleVersionId, structuredClone(rule));
    return structuredClone(rule);
  }

  updateRule(
    businessId: string,
    ruleVersionId: string,
    patch: Partial<CommercialRuleVersionView>
  ): CommercialRuleVersionView | null {
    const current = this.getRule(businessId, ruleVersionId);
    if (!current) {
      return null;
    }
    const next = {
      ...current,
      ...patch,
      ruleVersionId: current.ruleVersionId,
      businessId: current.businessId,
      updatedAt: new Date().toISOString(),
    };
    this.rules.set(ruleVersionId, next);
    return structuredClone(next);
  }

  listEvents(
    businessId: string,
    ruleVersionId?: string
  ): CommercialGovernanceEventView[] {
    return this.events
      .filter(
        (e) =>
          e.businessId === businessId &&
          (ruleVersionId == null || e.ruleVersionId === ruleVersionId)
      )
      .map((e) => structuredClone(e))
      .sort((a, b) => b.performedAt.localeCompare(a.performedAt));
  }

  appendEvent(
    event: Omit<CommercialGovernanceEventView, "eventId" | "performedAt"> & {
      eventId?: string;
      performedAt?: string;
    }
  ): CommercialGovernanceEventView {
    const row: CommercialGovernanceEventView = {
      ...event,
      eventId: event.eventId ?? randomUUID(),
      performedAt: event.performedAt ?? new Date().toISOString(),
    };
    this.events.push(row);
    return structuredClone(row);
  }

  listOverrides(
    businessId: string,
    status?: CommercialOverrideStatusCode
  ): CommercialOverrideRequestView[] {
    return [...this.overrides.values()]
      .filter(
        (o) =>
          o.businessId === businessId &&
          (status == null || o.status === status)
      )
      .map((o) => structuredClone(o));
  }

  getOverride(
    businessId: string,
    overrideId: string
  ): CommercialOverrideRequestView | null {
    const row = this.overrides.get(overrideId);
    if (!row || row.businessId !== businessId) {
      return null;
    }
    return structuredClone(row);
  }

  insertOverride(
    override: CommercialOverrideRequestView
  ): CommercialOverrideRequestView {
    this.overrides.set(override.overrideId, structuredClone(override));
    return structuredClone(override);
  }

  updateOverride(
    businessId: string,
    overrideId: string,
    patch: Partial<CommercialOverrideRequestView>
  ): CommercialOverrideRequestView | null {
    const current = this.getOverride(businessId, overrideId);
    if (!current) {
      return null;
    }
    const next = { ...current, ...patch, overrideId: current.overrideId };
    this.overrides.set(overrideId, next);
    return structuredClone(next);
  }
}

export function createInMemoryCommercialGovernanceStore() {
  return new InMemoryCommercialGovernanceStore();
}

/** Re-export lifecycle constants used by store consumers. */
export {
  COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES,
  COMMERCIAL_OVERRIDE_STATUS_CODES,
};
