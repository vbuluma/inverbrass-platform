/**
 * Purpose:
 * Pure tax-compliance rules — due dates, periods, status, lifecycles.
 * Fail closed when due-date configuration is missing.
 * Does not recalculate tax amounts.
 */

import {
  TAX_COMPLIANCE_STATUSES,
  TAX_DUE_DATE_RULE_TYPES,
  TAX_EVIDENCE_STATUSES,
  TAX_FILING_FREQUENCIES,
  TAX_FILING_STATUSES,
  TAX_REMITTANCE_STATUSES,
} from "@/modules/commercial/tax-compliance/tax-compliance-constants";
import { CommercialError } from "@/modules/commercial/errors";
import type { TaxDueDateRule } from "@/modules/commercial/tax-compliance/tax-compliance-types";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function toIsoDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export function parseIsoDate(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!m) {
    throw new CommercialError(
      "TAX_COMPLIANCE_CONFIG_MISSING",
      "Invalid date for tax compliance calendar.",
      400,
      "date"
    );
  }
  return new Date(
    Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0)
  );
}

function adjustWeekend(date: Date, adjust: boolean): Date {
  if (!adjust) return date;
  const day = date.getUTCDay();
  const out = new Date(date.getTime());
  if (day === 0) out.setUTCDate(out.getUTCDate() + 1);
  if (day === 6) out.setUTCDate(out.getUTCDate() + 2);
  return out;
}

export function computeDueDate(
  periodEnd: string,
  rule: TaxDueDateRule | null | undefined
): string {
  if (!rule?.type) {
    throw new CommercialError(
      "DUE_DATE_RULE_MISSING",
      "Tax due-date rule is missing. Fail closed — no due date invented.",
      400,
      "dueDateRule"
    );
  }
  const end = parseIsoDate(periodEnd);
  let due: Date;
  switch (rule.type) {
    case TAX_DUE_DATE_RULE_TYPES.FIXED_DAY_FOLLOWING_MONTH: {
      const day = rule.day;
      if (!day || day < 1 || day > 31) {
        throw new CommercialError(
          "DUE_DATE_RULE_MISSING",
          "FIXED_DAY_FOLLOWING_MONTH requires a valid day.",
          400,
          "dueDateRule.day"
        );
      }
      due = new Date(
        Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, day)
      );
      break;
    }
    case TAX_DUE_DATE_RULE_TYPES.FIXED_DAY_AFTER_PERIOD_END: {
      const days = rule.daysAfterPeriodEnd;
      if (days == null || days < 0) {
        throw new CommercialError(
          "DUE_DATE_RULE_MISSING",
          "FIXED_DAY_AFTER_PERIOD_END requires daysAfterPeriodEnd.",
          400,
          "dueDateRule.daysAfterPeriodEnd"
        );
      }
      due = new Date(end.getTime());
      due.setUTCDate(due.getUTCDate() + days);
      break;
    }
    case TAX_DUE_DATE_RULE_TYPES.EVENT_RELATIVE_DAYS: {
      const days = rule.daysAfterEvent;
      if (days == null || days < 0) {
        throw new CommercialError(
          "DUE_DATE_RULE_MISSING",
          "EVENT_RELATIVE_DAYS requires daysAfterEvent.",
          400,
          "dueDateRule.daysAfterEvent"
        );
      }
      due = new Date(end.getTime());
      due.setUTCDate(due.getUTCDate() + days);
      break;
    }
    default:
      throw new CommercialError(
        "TAX_RULE_INVALID",
        `Unknown due-date rule type: ${rule.type}`,
        400,
        "dueDateRule.type"
      );
  }
  return toIsoDate(adjustWeekend(due, Boolean(rule.adjustWeekends)));
}

export function monthlyPeriodForDate(asOf: string): {
  periodKey: string;
  periodStart: string;
  periodEnd: string;
} {
  const d = parseIsoDate(asOf);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1));
  const end = new Date(Date.UTC(y, m + 1, 0));
  return {
    periodKey: `${y}-${pad2(m + 1)}`,
    periodStart: toIsoDate(start),
    periodEnd: toIsoDate(end),
  };
}

export function generateFilingPeriod(
  frequency: string,
  asOf: string,
  dueDateRule: TaxDueDateRule
): {
  periodKey: string;
  periodStart: string;
  periodEnd: string;
  filingDueDate: string;
  remittanceDueDate: string;
} {
  if (frequency === TAX_FILING_FREQUENCIES.MONTHLY) {
    const period = monthlyPeriodForDate(asOf);
    const due = computeDueDate(period.periodEnd, dueDateRule);
    return { ...period, filingDueDate: due, remittanceDueDate: due };
  }
  if (frequency === TAX_FILING_FREQUENCIES.QUARTERLY) {
    const d = parseIsoDate(asOf);
    const q = Math.floor(d.getUTCMonth() / 3);
    const start = new Date(Date.UTC(d.getUTCFullYear(), q * 3, 1));
    const end = new Date(Date.UTC(d.getUTCFullYear(), q * 3 + 3, 0));
    const periodKey = `${d.getUTCFullYear()}-Q${q + 1}`;
    const due = computeDueDate(toIsoDate(end), dueDateRule);
    return {
      periodKey,
      periodStart: toIsoDate(start),
      periodEnd: toIsoDate(end),
      filingDueDate: due,
      remittanceDueDate: due,
    };
  }
  if (frequency === TAX_FILING_FREQUENCIES.ANNUAL) {
    const d = parseIsoDate(asOf);
    const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const end = new Date(Date.UTC(d.getUTCFullYear(), 11, 31));
    const due = computeDueDate(toIsoDate(end), dueDateRule);
    return {
      periodKey: `${d.getUTCFullYear()}`,
      periodStart: toIsoDate(start),
      periodEnd: toIsoDate(end),
      filingDueDate: due,
      remittanceDueDate: due,
    };
  }
  if (frequency === TAX_FILING_FREQUENCIES.EVENT) {
    const due = computeDueDate(asOf, {
      ...dueDateRule,
      type:
        dueDateRule.type || TAX_DUE_DATE_RULE_TYPES.EVENT_RELATIVE_DAYS,
      daysAfterEvent: dueDateRule.daysAfterEvent ?? 0,
    });
    return {
      periodKey: `EVT-${asOf}`,
      periodStart: asOf,
      periodEnd: asOf,
      filingDueDate: due,
      remittanceDueDate: due,
    };
  }
  throw new CommercialError(
    "FILING_CALENDAR_MISSING",
    `Unsupported or missing filing frequency: ${frequency || "(empty)"}`,
    400,
    "filingFrequency"
  );
}

export function isRuleEffectiveAt(
  rule: { effectiveFrom: string | null; effectiveTo: string | null },
  at: string
): boolean {
  const t = parseIsoDate(at).getTime();
  if (rule.effectiveFrom) {
    if (t < parseIsoDate(rule.effectiveFrom).getTime()) return false;
  }
  if (rule.effectiveTo) {
    if (t > parseIsoDate(rule.effectiveTo).getTime()) return false;
  }
  return true;
}

export function deriveComplianceStatus(input: {
  filingStatus: string;
  remittanceStatus: string;
  evidenceStatus: string;
  filingDueDate: string;
  remittanceDueDate: string;
  asOf: string;
}): string {
  const asOf = parseIsoDate(input.asOf).getTime();
  const filingDue = parseIsoDate(input.filingDueDate).getTime();
  const remitDue = parseIsoDate(input.remittanceDueDate).getTime();

  if (
    input.filingStatus === TAX_FILING_STATUSES.ACCEPTED &&
    input.remittanceStatus === TAX_REMITTANCE_STATUSES.PAID &&
    (input.evidenceStatus === TAX_EVIDENCE_STATUSES.VERIFIED ||
      input.evidenceStatus === TAX_EVIDENCE_STATUSES.NOT_REQUIRED ||
      input.evidenceStatus === TAX_EVIDENCE_STATUSES.UPLOADED)
  ) {
    return TAX_COMPLIANCE_STATUSES.COMPLIANT;
  }

  if (
    input.remittanceStatus === TAX_REMITTANCE_STATUSES.PAID &&
    (input.evidenceStatus === TAX_EVIDENCE_STATUSES.MISSING ||
      input.evidenceStatus === TAX_EVIDENCE_STATUSES.REQUIRED)
  ) {
    return TAX_COMPLIANCE_STATUSES.EVIDENCE_MISSING;
  }

  if (
    input.filingStatus === TAX_FILING_STATUSES.OVERDUE ||
    input.remittanceStatus === TAX_REMITTANCE_STATUSES.OVERDUE ||
    (asOf > filingDue &&
      input.filingStatus !== TAX_FILING_STATUSES.ACCEPTED &&
      input.filingStatus !== TAX_FILING_STATUSES.SUBMITTED) ||
    (asOf > remitDue &&
      input.remittanceStatus !== TAX_REMITTANCE_STATUSES.PAID &&
      input.remittanceStatus !== TAX_REMITTANCE_STATUSES.WAIVED)
  ) {
    return TAX_COMPLIANCE_STATUSES.OVERDUE;
  }

  if (input.filingStatus === TAX_FILING_STATUSES.REJECTED) {
    return TAX_COMPLIANCE_STATUSES.EXCEPTION;
  }

  if (input.remittanceStatus === TAX_REMITTANCE_STATUSES.PARTIALLY_PAID) {
    return TAX_COMPLIANCE_STATUSES.PARTIALLY_COMPLIANT;
  }

  if (
    input.evidenceStatus === TAX_EVIDENCE_STATUSES.MISSING ||
    input.evidenceStatus === TAX_EVIDENCE_STATUSES.REQUIRED
  ) {
    return TAX_COMPLIANCE_STATUSES.EVIDENCE_MISSING;
  }

  if (
    input.filingStatus === TAX_FILING_STATUSES.DUE ||
    input.remittanceStatus === TAX_REMITTANCE_STATUSES.DUE
  ) {
    return TAX_COMPLIANCE_STATUSES.DUE;
  }

  if (input.filingStatus === TAX_FILING_STATUSES.NOT_DUE) {
    return TAX_COMPLIANCE_STATUSES.AT_RISK;
  }

  return TAX_COMPLIANCE_STATUSES.PARTIALLY_COMPLIANT;
}

export function assertFilingTransition(
  from: string,
  to: string
): void {
  const allowed: Record<string, string[]> = {
    [TAX_FILING_STATUSES.NOT_DUE]: [TAX_FILING_STATUSES.DUE],
    [TAX_FILING_STATUSES.DUE]: [
      TAX_FILING_STATUSES.PREPARED,
      TAX_FILING_STATUSES.OVERDUE,
    ],
    [TAX_FILING_STATUSES.PREPARED]: [
      TAX_FILING_STATUSES.SUBMITTED,
      TAX_FILING_STATUSES.DUE,
    ],
    [TAX_FILING_STATUSES.SUBMITTED]: [
      TAX_FILING_STATUSES.ACCEPTED,
      TAX_FILING_STATUSES.REJECTED,
    ],
    [TAX_FILING_STATUSES.REJECTED]: [
      TAX_FILING_STATUSES.PREPARED,
      TAX_FILING_STATUSES.AMENDED,
    ],
    [TAX_FILING_STATUSES.AMENDED]: [TAX_FILING_STATUSES.SUBMITTED],
    [TAX_FILING_STATUSES.OVERDUE]: [
      TAX_FILING_STATUSES.PREPARED,
      TAX_FILING_STATUSES.SUBMITTED,
    ],
    [TAX_FILING_STATUSES.ACCEPTED]: [TAX_FILING_STATUSES.AMENDED],
  };
  if (!(allowed[from] ?? []).includes(to)) {
    throw new CommercialError(
      "INVALID_LIFECYCLE_TRANSITION",
      `Filing transition ${from} → ${to} is not allowed.`,
      409
    );
  }
}

export function outstandingAmount(
  expected: string,
  remitted: string
): string {
  const e = Number(expected);
  const r = Number(remitted);
  if (!Number.isFinite(e) || !Number.isFinite(r)) {
    throw new CommercialError(
      "INVALID_INPUT",
      "Remittance amounts must be numeric strings.",
      400
    );
  }
  return (e - r).toFixed(6);
}
