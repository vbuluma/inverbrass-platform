/**
 * Purpose:
 * In-memory tax compliance store (IP-11). Tables migrated for durable readiness.
 */

import { randomUUID } from "node:crypto";

import type {
  TaxComplianceEventView,
  TaxComplianceProfileView,
  TaxComplianceRuleView,
  TaxEvidenceView,
  TaxFilingPeriodView,
  TaxFilingView,
  TaxObligationView,
  TaxRegistrationView,
  TaxRemittanceView,
} from "@/modules/commercial/tax-compliance/tax-compliance-types";

export class InMemoryTaxComplianceStore {
  profiles = new Map<string, TaxComplianceProfileView>();
  registrations = new Map<string, TaxRegistrationView>();
  rules = new Map<string, TaxComplianceRuleView>();
  periods = new Map<string, TaxFilingPeriodView>();
  obligations = new Map<string, TaxObligationView>();
  filings = new Map<string, TaxFilingView>();
  remittances = new Map<string, TaxRemittanceView>();
  evidence = new Map<string, TaxEvidenceView>();
  events: TaxComplianceEventView[] = [];

  getProfile(businessId: string): TaxComplianceProfileView | null {
    return (
      [...this.profiles.values()].find((p) => p.businessId === businessId) ??
      null
    );
  }

  saveProfile(profile: TaxComplianceProfileView): TaxComplianceProfileView {
    this.profiles.set(profile.profileId, profile);
    return profile;
  }

  listRegistrations(businessId: string): TaxRegistrationView[] {
    return [...this.registrations.values()].filter(
      (r) => r.businessId === businessId
    );
  }

  saveRegistration(reg: TaxRegistrationView): TaxRegistrationView {
    this.registrations.set(reg.registrationId, reg);
    return reg;
  }

  listRules(businessId: string): TaxComplianceRuleView[] {
    return [...this.rules.values()].filter((r) => r.businessId === businessId);
  }

  saveRule(rule: TaxComplianceRuleView): TaxComplianceRuleView {
    this.rules.set(rule.ruleVersionId, rule);
    return rule;
  }

  getRule(businessId: string, ruleVersionId: string): TaxComplianceRuleView | null {
    const rule = this.rules.get(ruleVersionId) ?? null;
    if (!rule || rule.businessId !== businessId) return null;
    return rule;
  }

  listPeriods(businessId: string): TaxFilingPeriodView[] {
    return [...this.periods.values()].filter((p) => p.businessId === businessId);
  }

  savePeriod(period: TaxFilingPeriodView): TaxFilingPeriodView {
    this.periods.set(period.periodId, period);
    return period;
  }

  listObligations(businessId: string): TaxObligationView[] {
    return [...this.obligations.values()].filter(
      (o) => o.businessId === businessId
    );
  }

  getObligation(
    businessId: string,
    obligationId: string
  ): TaxObligationView | null {
    const o = this.obligations.get(obligationId) ?? null;
    if (!o || o.businessId !== businessId) return null;
    return o;
  }

  saveObligation(o: TaxObligationView): TaxObligationView {
    this.obligations.set(o.obligationId, o);
    return o;
  }

  listFilings(businessId: string, obligationId?: string): TaxFilingView[] {
    return [...this.filings.values()].filter(
      (f) =>
        f.businessId === businessId &&
        (obligationId ? f.obligationId === obligationId : true)
    );
  }

  saveFiling(f: TaxFilingView): TaxFilingView {
    this.filings.set(f.filingId, f);
    return f;
  }

  listRemittances(
    businessId: string,
    obligationId?: string
  ): TaxRemittanceView[] {
    return [...this.remittances.values()].filter(
      (r) =>
        r.businessId === businessId &&
        (obligationId ? r.obligationId === obligationId : true)
    );
  }

  saveRemittance(r: TaxRemittanceView): TaxRemittanceView {
    this.remittances.set(r.remittanceId, r);
    return r;
  }

  listEvidence(businessId: string, obligationId?: string): TaxEvidenceView[] {
    return [...this.evidence.values()].filter(
      (e) =>
        e.businessId === businessId &&
        (obligationId ? e.obligationId === obligationId : true)
    );
  }

  saveEvidence(e: TaxEvidenceView): TaxEvidenceView {
    this.evidence.set(e.evidenceId, e);
    return e;
  }

  addEvent(event: Omit<TaxComplianceEventView, "eventId">): TaxComplianceEventView {
    const row: TaxComplianceEventView = {
      eventId: randomUUID(),
      ...event,
    };
    this.events.push(row);
    return row;
  }

  listEvents(businessId: string, limit = 50): TaxComplianceEventView[] {
    return this.events
      .filter((e) => e.businessId === businessId)
      .sort((a, b) => b.performedAt.localeCompare(a.performedAt))
      .slice(0, limit);
  }
}

export function createInMemoryTaxComplianceStore() {
  return new InMemoryTaxComplianceStore();
}

export type TaxComplianceStore = InMemoryTaxComplianceStore;
