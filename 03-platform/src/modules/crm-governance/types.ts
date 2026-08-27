/**
 * View and payload types for BP-004 / IP-13 CRM Governance.
 */

import type { CrmGovernanceChecklistStatus } from "@/modules/crm-governance/constants";

export type CrmGovernanceChecklistItemView = {
  code: string;
  name: string;
  description: string | null;
  sourceModule: string;
  isMandatory: boolean;
  weight: number;
  displayOrder: number;
  status: CrmGovernanceChecklistStatus;
  statusLabel: string;
  detail: string | null;
  isPendingExternalModule: boolean;
};

export type CrmGovernanceHistoryItemView = {
  id: string;
  changeType: string;
  changeTypeLabel: string;
  oldValue: string | null;
  newValue: string | null;
  changedBy: string | null;
  changeDate: string;
};

export type CrmGovernanceOwnershipHistoryItemView = {
  id: string;
  roleCode: string;
  userId: string;
  userName: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
};

export type CrmGovernanceValidationResultView = {
  label: string;
  status: CrmGovernanceChecklistStatus;
  statusLabel: string;
  detail: string | null;
};

export type CrmOwnerOptionView = {
  id: string;
  label: string;
};

export type CrmPartyGovernancePanelView = {
  partyId: string;
  partyDisplayName: string;
  governanceId: string;
  governanceStatus: string;
  governanceStatusLabel: string;
  readinessScore: number;
  readinessScoreLabel: string;
  lastValidationDate: string | null;
  isLocked: boolean;
  activationBlocked: boolean;
  notes: string | null;
  ownerUserId: string | null;
  ownerName: string | null;
  relationshipManagerUserId: string | null;
  relationshipManagerName: string | null;
  stewardUserId: string | null;
  stewardName: string | null;
  ownerOptions: CrmOwnerOptionView[];
  statusOptions: Array<{ code: string; name: string }>;
  checklist: CrmGovernanceChecklistItemView[];
  validationResults: CrmGovernanceValidationResultView[];
  history: CrmGovernanceHistoryItemView[];
  ownershipHistory: CrmGovernanceOwnershipHistoryItemView[];
  editable: boolean;
  architectureNote: string;
};

export type CrmMergeProposalView = {
  id: string;
  survivorPartyId: string;
  survivorPartyName: string | null;
  duplicatePartyId: string;
  duplicatePartyName: string | null;
  status: string;
  matchReason: string | null;
  proposedBy: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  executedAt: string | null;
  notes: string | null;
  createdAt: string;
};

export type CrmSlaPolicyView = {
  id: string;
  entityTypeCode: string;
  priorityCode: string | null;
  name: string;
  firstResponseTargetHours: number | null;
  resolutionTargetHours: number;
  pauseReasonCodes: string[];
  escalationEnabled: boolean;
  isActive: boolean;
};

export type CrmBusinessHoursView = {
  id: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
  timezone: string;
};

export type CrmHolidayView = {
  id: string;
  holidayDate: string;
  name: string;
  isRecurring: boolean;
};

export type CrmApprovalMatrixView = {
  id: string;
  actionCode: string;
  minRoleCode: string;
  requiresDualApproval: boolean;
  isActive: boolean;
};

export type CrmGovernanceDashboardView = {
  governanceCount: number;
  missingOwnersCount: number;
  lowScoresCount: number;
  pendingMergesCount: number;
  averageReadiness: number;
  slaPolicyCount: number;
  statusSummary: Array<{ status: string; statusLabel: string; count: number }>;
  missingOwners: Array<{
    partyId: string;
    partyDisplayName: string;
    governanceStatus: string;
    readinessScore: number;
  }>;
  lowScores: Array<{
    partyId: string;
    partyDisplayName: string;
    governanceStatus: string;
    readinessScore: number;
  }>;
  pendingMerges: CrmMergeProposalView[];
  recentGovernance: Array<{
    partyId: string;
    partyDisplayName: string;
    governanceStatus: string;
    governanceStatusLabel: string;
    readinessScore: number;
    ownerName: string | null;
  }>;
  slaPolicies: CrmSlaPolicyView[];
  businessHours: CrmBusinessHoursView[];
  holidays: CrmHolidayView[];
  approvalMatrix: CrmApprovalMatrixView[];
};

export type CrmGovernanceFiltersPayload = {
  query?: string;
  governanceStatus?: string;
  readinessMin?: number;
  readinessMax?: number;
};

export type UpdateCrmGovernanceOwnershipPayload = {
  partyId: string;
  ownerUserId?: string;
  relationshipManagerUserId?: string;
  stewardUserId?: string;
};

export type UpdateCrmGovernanceNotesPayload = {
  partyId: string;
  notes?: string;
};

export type RunCrmGovernanceValidationPayload = {
  partyId: string;
};

export type ToggleCrmGovernanceLockPayload = {
  partyId: string;
  isLocked: boolean;
};

export type DetectCrmDuplicatesPayload = {
  partyId: string;
};

export type MergeProposalActionPayload = {
  proposalId: string;
  notes?: string;
};

export type UpsertCrmSlaPolicyPayload = {
  id?: string;
  entityTypeCode: string;
  priorityCode?: string | null;
  name: string;
  firstResponseTargetHours?: number | null;
  resolutionTargetHours: number;
  pauseReasonCodes?: string[];
  escalationEnabled?: boolean;
  isActive?: boolean;
};

export type UpsertCrmBusinessHoursPayload = {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed?: boolean;
  timezone?: string;
};

export type UpsertCrmHolidayPayload = {
  id?: string;
  holidayDate: string;
  name: string;
  isRecurring?: boolean;
};

export type UpsertCrmApprovalMatrixPayload = {
  id?: string;
  actionCode: string;
  minRoleCode: string;
  requiresDualApproval?: boolean;
  isActive?: boolean;
};

export type CrmGovernanceCustomer360SettingsContribution = {
  settingsContributionIds: string[];
  note: string;
};
