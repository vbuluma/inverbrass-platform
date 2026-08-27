/**
 * Purpose:
 * Kenya-first *reference configuration* for IP-11 (capability + sample rules).
 *
 * IMPORTANT:
 * This is configuration capability with illustrative Kenya calendar defaults.
 * It does NOT certify legal/statutory compliance. Operators must validate
 * due-day and registration rules against current KRA notices before production.
 *
 * Source note: Architecture docs reference Kenya/KRA/eTIMS as first jurisdiction.
 * Specific due days below are common operational defaults represented as data —
 * not hard-coded engine branches.
 *
 * Implementation Package:
 * BP-005 / IP-11
 */

import {
  TAX_COMPLIANCE_RULE_LIFECYCLE,
  TAX_DUE_DATE_RULE_TYPES,
  TAX_EVIDENCE_TYPES,
  TAX_FILING_FREQUENCIES,
} from "@/modules/commercial/tax-compliance/tax-compliance-constants";
import type { TaxComplianceRuleTemplate } from "@/modules/commercial/tax-compliance/tax-compliance-types";

export const KENYA_JURISDICTION = {
  countryCode: "KE",
  jurisdictionCode: "KE-NATIONAL",
  authorityCode: "KRA",
  authorityName: "Kenya Revenue Authority",
  currencyCode: "KES",
  /**
   * eTIMS / electronic tax invoice evidence is a Kenya configuration concern
   * (integration boundary) — not implemented as an IP-03 calculation change.
   */
  notes:
    "Kenya-first jurisdiction template. Validate filing/remittance due days against current KRA guidance before production use. Platform capability ≠ guaranteed statutory compliance.",
} as const;

/**
 * Platform templates copied into a business when a KE compliance profile is created.
 * Another country would add a similar template pack — engines stay unchanged.
 */
export const KENYA_COMPLIANCE_RULE_TEMPLATES: TaxComplianceRuleTemplate[] = [
  {
    ruleKey: "KE-VAT-MONTHLY",
    taxTypeCode: "VAT",
    taxRegimeCode: "VAT",
    label: "Kenya VAT monthly filing & remittance",
    description:
      "Illustrative monthly VAT compliance calendar (due day configurable). Not a legal certification.",
    countryCode: KENYA_JURISDICTION.countryCode,
    jurisdictionCode: KENYA_JURISDICTION.jurisdictionCode,
    authorityCode: KENYA_JURISDICTION.authorityCode,
    filingFrequency: TAX_FILING_FREQUENCIES.MONTHLY,
    remittanceFrequency: TAX_FILING_FREQUENCIES.MONTHLY,
    dueDateRule: {
      type: TAX_DUE_DATE_RULE_TYPES.FIXED_DAY_FOLLOWING_MONTH,
      day: 20,
      adjustWeekends: true,
      sourceReference:
        "Configurable default commonly associated with KRA VAT return timing — verify against current official notices.",
    },
    requiresRegistration: true,
    registrationType: "VAT",
    filingRequired: true,
    remittanceRequired: true,
    requiredEvidenceTypes: [
      TAX_EVIDENCE_TYPES.TAX_RETURN,
      TAX_EVIDENCE_TYPES.PAYMENT_CONFIRMATION,
      TAX_EVIDENCE_TYPES.FILING_ACKNOWLEDGEMENT,
    ],
    lifecycleStatus: TAX_COMPLIANCE_RULE_LIFECYCLE.ACTIVE,
    effectiveFrom: "2020-01-01T00:00:00.000Z",
    effectiveTo: null,
  },
  {
    ruleKey: "KE-WHT-MONTHLY",
    taxTypeCode: "WHT",
    taxRegimeCode: "WITHHOLDING",
    label: "Kenya withholding tax monthly obligation",
    description:
      "Illustrative WHT compliance obligation type. Applicability is configuration-driven per business registration.",
    countryCode: KENYA_JURISDICTION.countryCode,
    jurisdictionCode: KENYA_JURISDICTION.jurisdictionCode,
    authorityCode: KENYA_JURISDICTION.authorityCode,
    filingFrequency: TAX_FILING_FREQUENCIES.MONTHLY,
    remittanceFrequency: TAX_FILING_FREQUENCIES.MONTHLY,
    dueDateRule: {
      type: TAX_DUE_DATE_RULE_TYPES.FIXED_DAY_FOLLOWING_MONTH,
      day: 5,
      adjustWeekends: true,
      sourceReference:
        "Configurable WHT remittance timing placeholder — verify against current KRA guidance before production.",
    },
    requiresRegistration: true,
    registrationType: "PIN",
    filingRequired: true,
    remittanceRequired: true,
    requiredEvidenceTypes: [
      TAX_EVIDENCE_TYPES.WITHHOLDING_CERTIFICATE,
      TAX_EVIDENCE_TYPES.PAYMENT_CONFIRMATION,
    ],
    lifecycleStatus: TAX_COMPLIANCE_RULE_LIFECYCLE.ACTIVE,
    effectiveFrom: "2020-01-01T00:00:00.000Z",
    effectiveTo: null,
  },
];

/** Demonstrates multi-jurisdiction readiness without rewriting engines. */
export const UGANDA_JURISDICTION_STUB = {
  countryCode: "UG",
  jurisdictionCode: "UG-NATIONAL",
  authorityCode: "URA",
  notes:
    "Stub only — no Uganda statutory rules configured. Adding UG templates should not require engine rewrite.",
} as const;
