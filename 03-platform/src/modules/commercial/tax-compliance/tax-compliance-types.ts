/**
 * Purpose:
 * BP-005 IP-11 tax compliance view/contracts.
 */

import type {
  TaxComplianceRuleLifecycle,
  TaxComplianceStatus,
  TaxEvidenceStatus,
  TaxFilingFrequency,
  TaxFilingStatus,
  TaxRemittanceStatus,
} from "@/modules/commercial/tax-compliance/tax-compliance-constants";

export type TaxDueDateRule = {
  type: string;
  day?: number;
  daysAfterPeriodEnd?: number;
  daysAfterEvent?: number;
  adjustWeekends?: boolean;
  sourceReference?: string;
};

export type TaxComplianceRuleTemplate = {
  ruleKey: string;
  taxTypeCode: string;
  taxRegimeCode: string;
  label: string;
  description?: string;
  countryCode: string;
  jurisdictionCode: string;
  authorityCode: string;
  filingFrequency: TaxFilingFrequency | string;
  remittanceFrequency: TaxFilingFrequency | string;
  dueDateRule: TaxDueDateRule;
  requiresRegistration: boolean;
  registrationType?: string | null;
  filingRequired: boolean;
  remittanceRequired: boolean;
  requiredEvidenceTypes: string[];
  lifecycleStatus: TaxComplianceRuleLifecycle | string;
  effectiveFrom: string;
  effectiveTo: string | null;
};

export type TaxComplianceProfileView = {
  profileId: string;
  businessId: string;
  countryCode: string;
  defaultJurisdictionCode: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TaxRegistrationView = {
  registrationId: string;
  businessId: string;
  profileId: string;
  countryCode: string;
  jurisdictionCode: string;
  taxAuthorityCode: string;
  registrationType: string;
  registrationNumber: string;
  taxTypeCode: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  isActive: boolean;
};

export type TaxComplianceRuleView = {
  ruleVersionId: string;
  businessId: string;
  ruleKey: string;
  versionNumber: number;
  lifecycleStatus: TaxComplianceRuleLifecycle | string;
  label: string;
  description: string | null;
  countryCode: string;
  jurisdictionCode: string;
  taxTypeCode: string;
  taxRegimeCode: string | null;
  authorityCode: string | null;
  filingFrequency: string;
  remittanceFrequency: string;
  dueDateRule: TaxDueDateRule;
  requiresRegistration: boolean;
  registrationType: string | null;
  filingRequired: boolean;
  remittanceRequired: boolean;
  requiredEvidenceTypes: string[];
  effectiveFrom: string | null;
  effectiveTo: string | null;
  previousVersionId: string | null;
};

export type TaxFilingPeriodView = {
  periodId: string;
  businessId: string;
  jurisdictionCode: string;
  taxTypeCode: string;
  periodKey: string;
  periodStart: string;
  periodEnd: string;
  filingDueDate: string;
  remittanceDueDate: string;
  ruleVersionId: string;
  status: string;
};

export type TaxObligationView = {
  obligationId: string;
  businessId: string;
  countryCode: string;
  jurisdictionCode: string;
  taxRegimeCode: string | null;
  taxTypeCode: string;
  periodKey: string;
  periodStart: string;
  periodEnd: string;
  snapshotId: string | null;
  resolutionId: string | null;
  commercialContractId: string | null;
  taxComponentId: string | null;
  taxableAmount: string;
  taxAmount: string;
  currencyCode: string;
  obligationDate: string;
  filingDueDate: string;
  remittanceDueDate: string;
  filingStatus: TaxFilingStatus | string;
  remittanceStatus: TaxRemittanceStatus | string;
  evidenceStatus: TaxEvidenceStatus | string;
  complianceStatus: TaxComplianceStatus | string;
  ruleVersionId: string;
  ruleKey: string;
  createdAt: string;
  updatedAt: string;
};

export type TaxFilingView = {
  filingId: string;
  businessId: string;
  obligationId: string;
  filingReference: string | null;
  taxTypeCode: string;
  periodKey: string;
  amountDeclared: string | null;
  amountExpected: string | null;
  filingDate: string | null;
  dueDate: string;
  status: TaxFilingStatus | string;
  authorityCode: string | null;
  acknowledgementRef: string | null;
  notes: string | null;
  ruleVersionId: string | null;
};

export type TaxRemittanceView = {
  remittanceId: string;
  businessId: string;
  obligationId: string;
  expectedAmount: string;
  amountRemitted: string;
  outstandingAmount: string;
  remittanceDate: string | null;
  dueDate: string;
  paymentReference: string | null;
  authorityCode: string | null;
  status: TaxRemittanceStatus | string;
  notes: string | null;
};

export type TaxEvidenceView = {
  evidenceId: string;
  businessId: string;
  obligationId: string;
  evidenceType: string;
  documentRef: string;
  uploadedBy: string | null;
  uploadedAt: string;
  description: string | null;
  periodKey: string | null;
  status: TaxEvidenceStatus | string;
};

export type TaxComplianceEventView = {
  eventId: string;
  businessId: string;
  obligationId: string | null;
  entityType: string;
  entityId: string;
  eventType: string;
  actorUserId: string | null;
  beforeStatus: string | null;
  afterStatus: string | null;
  reason: string | null;
  performedAt: string;
};

export type TaxComplianceDashboardView = {
  profile: TaxComplianceProfileView | null;
  registrations: TaxRegistrationView[];
  upcomingFilings: TaxObligationView[];
  upcomingRemittances: TaxObligationView[];
  overdue: TaxObligationView[];
  missingEvidence: TaxObligationView[];
  exceptions: TaxObligationView[];
  periods: TaxFilingPeriodView[];
  recentEvents: TaxComplianceEventView[];
};

export type CreateTaxComplianceProfileInput = {
  countryCode: string;
  defaultJurisdictionCode?: string | null;
  /** When true, copy jurisdiction templates (e.g. Kenya) into the business. */
  seedJurisdictionTemplates?: boolean;
};

export type AddTaxRegistrationInput = {
  registrationType: string;
  registrationNumber: string;
  taxAuthorityCode: string;
  taxTypeCode?: string | null;
  jurisdictionCode?: string | null;
  countryCode?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
};

export type CreateTaxObligationFromSnapshotInput = {
  snapshotId: string;
  resolutionId: string;
  commercialContractId?: string | null;
  taxComponentId: string;
  taxTypeCode: string;
  taxableAmount: string;
  taxAmount: string;
  currencyCode: string;
  obligationDate: string;
  countryCode?: string | null;
  jurisdictionCode?: string | null;
};

export type TaxComplianceActor = {
  userId: string;
  permissions: string[];
};
