/**
 * Purpose:
 * Pure CRM governance rules — readiness scoring, checklist evaluation, status derivation.
 *
 * Implementation Package:
 * BP-004 / IP-013 – CRM Governance & Administration
 */

import {
  CRM_GOVERNANCE_ACTIVATION_THRESHOLD,
  CRM_GOVERNANCE_CHECKLIST_STATUSES,
  CRM_GOVERNANCE_STATUS_CODES,
  type CrmGovernanceChecklistStatus,
  type CrmGovernanceStatusCode,
} from "@/modules/crm-governance/constants";

export type CrmGovernanceEvaluationContext = {
  partyDisplayName: string | null;
  ownerUserId: string | null;
  relationshipManagerUserId: string | null;
  stewardUserId: string | null;
  activityCount: number;
  overdueOpenCaseCount: number;
  isArchived: boolean;
};

export type CrmChecklistEvaluationResult = {
  code: string;
  name: string;
  description: string | null;
  sourceModule: string;
  evaluatorKey: string;
  isMandatory: boolean;
  weight: number;
  displayOrder: number;
  status: CrmGovernanceChecklistStatus;
  statusLabel: string;
  detail: string | null;
  isPendingExternalModule: boolean;
};

const EXTERNAL_MODULE_EVALUATORS = new Set([
  "COMMUNICATION_CONSENT_PROFILE",
  "CRM_RECORD_LINKED",
]);

export function checklistStatusLabel(
  status: CrmGovernanceChecklistStatus
): string {
  switch (status) {
    case CRM_GOVERNANCE_CHECKLIST_STATUSES.COMPLETED:
      return "Completed";
    case CRM_GOVERNANCE_CHECKLIST_STATUSES.WARNING:
      return "Warning";
    default:
      return "Incomplete";
  }
}

export function governanceStatusLabel(code: string): string {
  switch (code) {
    case CRM_GOVERNANCE_STATUS_CODES.NOT_STARTED:
      return "Not Started";
    case CRM_GOVERNANCE_STATUS_CODES.IN_PROGRESS:
      return "In Progress";
    case CRM_GOVERNANCE_STATUS_CODES.READY:
      return "Ready";
    case CRM_GOVERNANCE_STATUS_CODES.ON_HOLD:
      return "On Hold";
    case CRM_GOVERNANCE_STATUS_CODES.NON_COMPLIANT:
      return "Non-Compliant";
    case CRM_GOVERNANCE_STATUS_CODES.ARCHIVED:
      return "Archived";
    default:
      return code;
  }
}

export function formatReadinessScore(score: number): string {
  return `${Math.round(score)}%`;
}

export function calculateReadinessScore(
  items: CrmChecklistEvaluationResult[]
): number {
  const activeItems = items.filter((item) => !item.isPendingExternalModule);
  const totalWeight = activeItems.reduce((sum, item) => sum + item.weight, 0);

  if (totalWeight === 0) {
    return 0;
  }

  const earned = activeItems
    .filter(
      (item) => item.status === CRM_GOVERNANCE_CHECKLIST_STATUSES.COMPLETED
    )
    .reduce((sum, item) => sum + item.weight, 0);

  return Math.round((earned / totalWeight) * 10000) / 100;
}

export function evaluateChecklistItem(
  evaluatorKey: string,
  definition: {
    code: string;
    name: string;
    description: string | null;
    sourceModule: string;
    isMandatory: boolean;
    weight: number;
    displayOrder: number;
  },
  context: CrmGovernanceEvaluationContext
): CrmChecklistEvaluationResult {
  if (EXTERNAL_MODULE_EVALUATORS.has(evaluatorKey)) {
    return {
      ...definition,
      evaluatorKey,
      status: CRM_GOVERNANCE_CHECKLIST_STATUSES.WARNING,
      statusLabel: checklistStatusLabel(
        CRM_GOVERNANCE_CHECKLIST_STATUSES.WARNING
      ),
      detail: `Awaiting ${definition.sourceModule} integration.`,
      isPendingExternalModule: true,
    };
  }

  let status: CrmGovernanceChecklistStatus =
    CRM_GOVERNANCE_CHECKLIST_STATUSES.INCOMPLETE;
  let detail: string | null = null;

  switch (evaluatorKey) {
    case "PARTY_IDENTITY_COMPLETE": {
      const complete = Boolean(context.partyDisplayName?.trim());
      status = complete
        ? CRM_GOVERNANCE_CHECKLIST_STATUSES.COMPLETED
        : CRM_GOVERNANCE_CHECKLIST_STATUSES.INCOMPLETE;
      detail = complete ? null : "Party display name is required.";
      break;
    }
    case "OWNER_ASSIGNED": {
      const complete = Boolean(context.ownerUserId);
      status = complete
        ? CRM_GOVERNANCE_CHECKLIST_STATUSES.COMPLETED
        : CRM_GOVERNANCE_CHECKLIST_STATUSES.INCOMPLETE;
      detail = complete ? null : "Assign a customer owner in Governance.";
      break;
    }
    case "RELATIONSHIP_MANAGER_ASSIGNED": {
      const complete = Boolean(context.relationshipManagerUserId);
      status = complete
        ? CRM_GOVERNANCE_CHECKLIST_STATUSES.COMPLETED
        : CRM_GOVERNANCE_CHECKLIST_STATUSES.INCOMPLETE;
      detail = complete ? null : "Optional: assign a relationship manager.";
      break;
    }
    case "STEWARD_ASSIGNED": {
      const complete = Boolean(context.stewardUserId);
      status = complete
        ? CRM_GOVERNANCE_CHECKLIST_STATUSES.COMPLETED
        : CRM_GOVERNANCE_CHECKLIST_STATUSES.INCOMPLETE;
      detail = complete ? null : "Optional: assign a data steward.";
      break;
    }
    case "ACTIVITY_ENGAGEMENT_PRESENT": {
      const complete = context.activityCount > 0;
      status = complete
        ? CRM_GOVERNANCE_CHECKLIST_STATUSES.COMPLETED
        : CRM_GOVERNANCE_CHECKLIST_STATUSES.INCOMPLETE;
      detail = complete ? null : "Log at least one CRM activity for this party.";
      break;
    }
    case "CASE_HYGIENE": {
      if (context.overdueOpenCaseCount > 0) {
        status = CRM_GOVERNANCE_CHECKLIST_STATUSES.WARNING;
        detail = `${context.overdueOpenCaseCount} overdue open case(s).`;
      } else {
        status = CRM_GOVERNANCE_CHECKLIST_STATUSES.COMPLETED;
        detail = null;
      }
      break;
    }
    default:
      status = CRM_GOVERNANCE_CHECKLIST_STATUSES.WARNING;
      detail = "Unknown checklist evaluator.";
  }

  return {
    ...definition,
    evaluatorKey,
    status,
    statusLabel: checklistStatusLabel(status),
    detail,
    isPendingExternalModule: false,
  };
}

export function deriveGovernanceStatus(
  isLocked: boolean,
  score: number,
  checklist: CrmChecklistEvaluationResult[],
  hasOwner: boolean,
  isArchived: boolean
): CrmGovernanceStatusCode {
  if (isArchived) {
    return CRM_GOVERNANCE_STATUS_CODES.ARCHIVED;
  }

  if (isLocked) {
    return CRM_GOVERNANCE_STATUS_CODES.ON_HOLD;
  }

  if (!hasOwner) {
    return CRM_GOVERNANCE_STATUS_CODES.NOT_STARTED;
  }

  const mandatoryIncomplete = checklist.filter(
    (item) =>
      item.isMandatory &&
      !item.isPendingExternalModule &&
      item.status !== CRM_GOVERNANCE_CHECKLIST_STATUSES.COMPLETED
  );

  if (mandatoryIncomplete.length > 0) {
    return CRM_GOVERNANCE_STATUS_CODES.NON_COMPLIANT;
  }

  if (score >= 100) {
    return CRM_GOVERNANCE_STATUS_CODES.READY;
  }

  if (score >= CRM_GOVERNANCE_ACTIVATION_THRESHOLD) {
    return CRM_GOVERNANCE_STATUS_CODES.READY;
  }

  if (score > 0) {
    return CRM_GOVERNANCE_STATUS_CODES.IN_PROGRESS;
  }

  return CRM_GOVERNANCE_STATUS_CODES.NOT_STARTED;
}

export function isActivationBlocked(
  score: number,
  checklist: CrmChecklistEvaluationResult[]
): boolean {
  const mandatoryIncomplete = checklist.some(
    (item) =>
      item.isMandatory &&
      !item.isPendingExternalModule &&
      item.status !== CRM_GOVERNANCE_CHECKLIST_STATUSES.COMPLETED
  );
  return mandatoryIncomplete || score < CRM_GOVERNANCE_ACTIVATION_THRESHOLD;
}

export function buildValidationResults(
  checklist: CrmChecklistEvaluationResult[]
): Array<{
  label: string;
  status: CrmGovernanceChecklistStatus;
  detail: string | null;
}> {
  return checklist.map((item) => ({
    label: item.name,
    status: item.status,
    detail: item.detail,
  }));
}

/** Normalize display name for simple duplicate matching. */
export function normalizePartyNameForMatch(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}
