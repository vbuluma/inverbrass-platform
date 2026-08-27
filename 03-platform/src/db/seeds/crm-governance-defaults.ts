/**
 * Purpose:
 * Default CRM governance statuses, checklist, SLA policies, and business hours.
 *
 * Implementation Package:
 * BP-004 / IP-013 – CRM Governance & Administration
 */

import { CRM_GOVERNANCE_STATUS_CODES } from "@/modules/crm-governance/constants";

export type CrmGovernanceStatusSeed = {
  code: string;
  name: string;
  description: string;
  displayOrder: number;
};

export const defaultCrmGovernanceStatuses: CrmGovernanceStatusSeed[] = [
  {
    code: CRM_GOVERNANCE_STATUS_CODES.NOT_STARTED,
    name: "Not Started",
    description: "Governance has not been initiated.",
    displayOrder: 10,
  },
  {
    code: CRM_GOVERNANCE_STATUS_CODES.IN_PROGRESS,
    name: "In Progress",
    description: "Governance validation is in progress.",
    displayOrder: 20,
  },
  {
    code: CRM_GOVERNANCE_STATUS_CODES.READY,
    name: "Ready",
    description: "Customer profile meets governance readiness requirements.",
    displayOrder: 30,
  },
  {
    code: CRM_GOVERNANCE_STATUS_CODES.ON_HOLD,
    name: "On Hold",
    description: "Governance changes are locked pending review.",
    displayOrder: 40,
  },
  {
    code: CRM_GOVERNANCE_STATUS_CODES.NON_COMPLIANT,
    name: "Non-Compliant",
    description: "Mandatory governance requirements are not met.",
    displayOrder: 50,
  },
  {
    code: CRM_GOVERNANCE_STATUS_CODES.ARCHIVED,
    name: "Archived",
    description: "Governance is archived with the customer profile.",
    displayOrder: 60,
  },
];

export type CrmGovernanceChecklistSeed = {
  code: string;
  name: string;
  description: string;
  sourceModule: string;
  evaluatorKey: string;
  isMandatory: boolean;
  weight: number;
  displayOrder: number;
};

export const defaultCrmGovernanceChecklist: CrmGovernanceChecklistSeed[] = [
  {
    code: "PARTY_IDENTITY_COMPLETE",
    name: "Party identity complete",
    description: "Party has a display name.",
    sourceModule: "BP-002",
    evaluatorKey: "PARTY_IDENTITY_COMPLETE",
    isMandatory: true,
    weight: 15,
    displayOrder: 10,
  },
  {
    code: "OWNER_ASSIGNED",
    name: "Owner assigned",
    description: "A customer owner (platform user) is assigned.",
    sourceModule: "BP-004/IP-013",
    evaluatorKey: "OWNER_ASSIGNED",
    isMandatory: true,
    weight: 20,
    displayOrder: 20,
  },
  {
    code: "RELATIONSHIP_MANAGER_ASSIGNED",
    name: "Relationship manager assigned",
    description: "Optional relationship manager is assigned.",
    sourceModule: "BP-004/IP-013",
    evaluatorKey: "RELATIONSHIP_MANAGER_ASSIGNED",
    isMandatory: false,
    weight: 10,
    displayOrder: 30,
  },
  {
    code: "STEWARD_ASSIGNED",
    name: "Steward assigned",
    description: "Optional data steward is assigned.",
    sourceModule: "BP-004/IP-013",
    evaluatorKey: "STEWARD_ASSIGNED",
    isMandatory: false,
    weight: 10,
    displayOrder: 40,
  },
  {
    code: "ACTIVITY_ENGAGEMENT_PRESENT",
    name: "Activity engagement present",
    description: "At least one CRM activity exists for the party.",
    sourceModule: "BP-004/IP-05",
    evaluatorKey: "ACTIVITY_ENGAGEMENT_PRESENT",
    isMandatory: false,
    weight: 15,
    displayOrder: 50,
  },
  {
    code: "CASE_HYGIENE",
    name: "Case hygiene",
    description: "No overdue open cases, or warning if present.",
    sourceModule: "BP-004/IP-09",
    evaluatorKey: "CASE_HYGIENE",
    isMandatory: false,
    weight: 15,
    displayOrder: 60,
  },
  {
    code: "COMMUNICATION_CONSENT_PROFILE",
    name: "Communication consent profile",
    description: "Consent profile integration pending external module.",
    sourceModule: "BP-002/ENG-003i",
    evaluatorKey: "COMMUNICATION_CONSENT_PROFILE",
    isMandatory: false,
    weight: 10,
    displayOrder: 70,
  },
  {
    code: "CRM_RECORD_LINKED",
    name: "CRM record linked",
    description: "Pending IP-01 CRM Core crm_record linkage.",
    sourceModule: "BP-004/IP-01",
    evaluatorKey: "CRM_RECORD_LINKED",
    isMandatory: false,
    weight: 5,
    displayOrder: 80,
  },
];

export type CrmSlaPolicySeed = {
  entityTypeCode: string;
  priorityCode: string | null;
  name: string;
  firstResponseTargetHours: number | null;
  resolutionTargetHours: number;
  pauseReasonCodes: string[];
  escalationEnabled: boolean;
};

export const defaultCrmSlaPolicies: CrmSlaPolicySeed[] = [
  {
    entityTypeCode: "CASE",
    priorityCode: "LOW",
    name: "Case — Low",
    firstResponseTargetHours: 48,
    resolutionTargetHours: 168,
    pauseReasonCodes: ["PENDING_CUSTOMER", "LEGAL_HOLD", "AWAITING_THIRD_PARTY"],
    escalationEnabled: true,
  },
  {
    entityTypeCode: "CASE",
    priorityCode: "NORMAL",
    name: "Case — Normal",
    firstResponseTargetHours: 24,
    resolutionTargetHours: 72,
    pauseReasonCodes: ["PENDING_CUSTOMER", "LEGAL_HOLD", "AWAITING_THIRD_PARTY"],
    escalationEnabled: true,
  },
  {
    entityTypeCode: "CASE",
    priorityCode: "HIGH",
    name: "Case — High",
    firstResponseTargetHours: 8,
    resolutionTargetHours: 24,
    pauseReasonCodes: ["PENDING_CUSTOMER", "LEGAL_HOLD", "AWAITING_THIRD_PARTY"],
    escalationEnabled: true,
  },
  {
    entityTypeCode: "CASE",
    priorityCode: "CRITICAL",
    name: "Case — Critical",
    firstResponseTargetHours: 2,
    resolutionTargetHours: 8,
    pauseReasonCodes: ["PENDING_CUSTOMER", "LEGAL_HOLD", "AWAITING_THIRD_PARTY"],
    escalationEnabled: true,
  },
  {
    entityTypeCode: "VISIT_REPORT",
    priorityCode: null,
    name: "Visit report — default",
    firstResponseTargetHours: null,
    resolutionTargetHours: 24,
    pauseReasonCodes: [],
    escalationEnabled: false,
  },
  {
    entityTypeCode: "ACTIVITY",
    priorityCode: null,
    name: "Activity — optional default",
    firstResponseTargetHours: null,
    resolutionTargetHours: 72,
    pauseReasonCodes: [],
    escalationEnabled: false,
  },
];

export type CrmBusinessHoursSeed = {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
  timezone: string;
};

/** Monday–Friday 09:00–17:00; weekend closed. day_of_week 0=Sunday … 6=Saturday. */
export const defaultCrmBusinessHours: CrmBusinessHoursSeed[] = [
  { dayOfWeek: 0, openTime: "09:00", closeTime: "17:00", isClosed: true, timezone: "UTC" },
  { dayOfWeek: 1, openTime: "09:00", closeTime: "17:00", isClosed: false, timezone: "UTC" },
  { dayOfWeek: 2, openTime: "09:00", closeTime: "17:00", isClosed: false, timezone: "UTC" },
  { dayOfWeek: 3, openTime: "09:00", closeTime: "17:00", isClosed: false, timezone: "UTC" },
  { dayOfWeek: 4, openTime: "09:00", closeTime: "17:00", isClosed: false, timezone: "UTC" },
  { dayOfWeek: 5, openTime: "09:00", closeTime: "17:00", isClosed: false, timezone: "UTC" },
  { dayOfWeek: 6, openTime: "09:00", closeTime: "17:00", isClosed: true, timezone: "UTC" },
];

export type CrmApprovalMatrixSeed = {
  actionCode: string;
  minRoleCode: string;
  requiresDualApproval: boolean;
};

export const defaultCrmApprovalMatrix: CrmApprovalMatrixSeed[] = [
  { actionCode: "MERGE", minRoleCode: "CRM_STEWARD", requiresDualApproval: true },
  { actionCode: "ACTIVATION", minRoleCode: "CRM_ADMIN", requiresDualApproval: false },
  { actionCode: "REOPEN_CASE", minRoleCode: "CRM_SUPERVISOR", requiresDualApproval: false },
  { actionCode: "ARCHIVE", minRoleCode: "CRM_ADMIN", requiresDualApproval: false },
];
