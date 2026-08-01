/**
 * Purpose:
 * Pure governance rules — readiness scoring, checklist evaluation, status derivation.
 *
 * Implementation Package:
 * BP-003 / IP-013 – Offering Governance
 */

import {
  OFFERING_GOVERNANCE_CHECKLIST_STATUSES,
  OFFERING_GOVERNANCE_STATUS_CODES,
  PRODUCT_STATUS_CODES,
  type OfferingGovernanceChecklistStatus,
  type OfferingGovernanceStatusCode,
  type ProductStatusCode,
} from "@/modules/product/constants";

export type GovernanceEvaluationContext = {
  productCode: string;
  productName: string;
  productType: string;
  productStatusCode: ProductStatusCode;
  responsibleBusinessOwnerPartyId: string | null;
  classificationCount: number;
  pricingCount: number;
  analyticsSnapshotCount: number;
};

export type ChecklistEvaluationResult = {
  code: string;
  name: string;
  description: string | null;
  sourceModule: string;
  evaluatorKey: string;
  isMandatory: boolean;
  weight: number;
  displayOrder: number;
  status: OfferingGovernanceChecklistStatus;
  statusLabel: string;
  detail: string | null;
  isPendingExternalModule: boolean;
};

const EXTERNAL_MODULE_EVALUATORS = new Set([
  "DOCUMENTS_UPLOADED",
  "COMPLIANCE_REQUIREMENTS_MET",
  "RELATIONSHIPS_CONFIGURED",
]);

export function checklistStatusLabel(
  status: OfferingGovernanceChecklistStatus
): string {
  switch (status) {
    case OFFERING_GOVERNANCE_CHECKLIST_STATUSES.COMPLETED:
      return "Completed";
    case OFFERING_GOVERNANCE_CHECKLIST_STATUSES.WARNING:
      return "Warning";
    default:
      return "Incomplete";
  }
}

export function governanceStatusLabel(code: string): string {
  switch (code) {
    case OFFERING_GOVERNANCE_STATUS_CODES.NOT_STARTED:
      return "Not Started";
    case OFFERING_GOVERNANCE_STATUS_CODES.IN_PROGRESS:
      return "In Progress";
    case OFFERING_GOVERNANCE_STATUS_CODES.READY:
      return "Ready";
    case OFFERING_GOVERNANCE_STATUS_CODES.ON_HOLD:
      return "On Hold";
    case OFFERING_GOVERNANCE_STATUS_CODES.NON_COMPLIANT:
      return "Non-Compliant";
    case OFFERING_GOVERNANCE_STATUS_CODES.ARCHIVED:
      return "Archived";
    default:
      return code;
  }
}

export function formatReadinessScore(score: number): string {
  return `${Math.round(score)}%`;
}

export function calculateReadinessScore(items: ChecklistEvaluationResult[]): number {
  const activeItems = items.filter((item) => !item.isPendingExternalModule);
  const totalWeight = activeItems.reduce((sum, item) => sum + item.weight, 0);

  if (totalWeight === 0) {
    return 0;
  }

  const earned = activeItems
    .filter(
      (item) => item.status === OFFERING_GOVERNANCE_CHECKLIST_STATUSES.COMPLETED
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
  context: GovernanceEvaluationContext
): ChecklistEvaluationResult {
  if (EXTERNAL_MODULE_EVALUATORS.has(evaluatorKey)) {
    return {
      ...definition,
      evaluatorKey,
      status: OFFERING_GOVERNANCE_CHECKLIST_STATUSES.WARNING,
      statusLabel: checklistStatusLabel(
        OFFERING_GOVERNANCE_CHECKLIST_STATUSES.WARNING
      ),
      detail: `Awaiting ${definition.sourceModule} integration.`,
      isPendingExternalModule: true,
    };
  }

  let status: OfferingGovernanceChecklistStatus =
    OFFERING_GOVERNANCE_CHECKLIST_STATUSES.INCOMPLETE;
  let detail: string | null = null;

  switch (evaluatorKey) {
    case "IDENTITY_COMPLETE": {
      const complete = Boolean(
        context.productCode.trim() &&
          context.productName.trim() &&
          context.productType.trim()
      );
      status = complete
        ? OFFERING_GOVERNANCE_CHECKLIST_STATUSES.COMPLETED
        : OFFERING_GOVERNANCE_CHECKLIST_STATUSES.INCOMPLETE;
      detail = complete ? null : "Code, name, and type are required.";
      break;
    }
    case "BUSINESS_OWNER_ASSIGNED": {
      const complete = Boolean(context.responsibleBusinessOwnerPartyId);
      status = complete
        ? OFFERING_GOVERNANCE_CHECKLIST_STATUSES.COMPLETED
        : OFFERING_GOVERNANCE_CHECKLIST_STATUSES.INCOMPLETE;
      detail = complete
        ? null
        : "Assign a Responsible Business Owner in Governance.";
      break;
    }
    case "CLASSIFICATION_ASSIGNED": {
      const complete = context.classificationCount > 0;
      status = complete
        ? OFFERING_GOVERNANCE_CHECKLIST_STATUSES.COMPLETED
        : OFFERING_GOVERNANCE_CHECKLIST_STATUSES.INCOMPLETE;
      detail = complete ? null : "Assign at least one catalogue classification.";
      break;
    }
    case "PRICING_CONFIGURED": {
      const complete = context.pricingCount > 0;
      status = complete
        ? OFFERING_GOVERNANCE_CHECKLIST_STATUSES.COMPLETED
        : OFFERING_GOVERNANCE_CHECKLIST_STATUSES.INCOMPLETE;
      detail = complete ? null : "Configure at least one price record.";
      break;
    }
    case "ANALYTICS_ENABLED": {
      const complete = context.analyticsSnapshotCount > 0;
      status = complete
        ? OFFERING_GOVERNANCE_CHECKLIST_STATUSES.COMPLETED
        : OFFERING_GOVERNANCE_CHECKLIST_STATUSES.INCOMPLETE;
      detail = complete ? null : "Refresh analytics to generate snapshots.";
      break;
    }
    case "LIFECYCLE_COMPLETE": {
      const complete =
        context.productStatusCode === PRODUCT_STATUS_CODES.ACTIVE;
      status = complete
        ? OFFERING_GOVERNANCE_CHECKLIST_STATUSES.COMPLETED
        : OFFERING_GOVERNANCE_CHECKLIST_STATUSES.WARNING;
      detail = complete
        ? null
        : "Offering lifecycle status is not yet active.";
      break;
    }
    default:
      status = OFFERING_GOVERNANCE_CHECKLIST_STATUSES.WARNING;
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
  productStatusCode: ProductStatusCode,
  isLocked: boolean,
  score: number,
  checklist: ChecklistEvaluationResult[],
  hasBusinessOwner: boolean
): OfferingGovernanceStatusCode {
  if (productStatusCode === PRODUCT_STATUS_CODES.ARCHIVED) {
    return OFFERING_GOVERNANCE_STATUS_CODES.ARCHIVED;
  }

  if (isLocked) {
    return OFFERING_GOVERNANCE_STATUS_CODES.ON_HOLD;
  }

  if (!hasBusinessOwner) {
    return OFFERING_GOVERNANCE_STATUS_CODES.NOT_STARTED;
  }

  const mandatoryIncomplete = checklist.filter(
    (item) =>
      item.isMandatory &&
      !item.isPendingExternalModule &&
      item.status !== OFFERING_GOVERNANCE_CHECKLIST_STATUSES.COMPLETED
  );

  if (mandatoryIncomplete.length > 0) {
    return OFFERING_GOVERNANCE_STATUS_CODES.NON_COMPLIANT;
  }

  if (score >= 100) {
    return OFFERING_GOVERNANCE_STATUS_CODES.READY;
  }

  if (score > 0) {
    return OFFERING_GOVERNANCE_STATUS_CODES.IN_PROGRESS;
  }

  return OFFERING_GOVERNANCE_STATUS_CODES.NOT_STARTED;
}

export function buildValidationResults(
  checklist: ChecklistEvaluationResult[]
): Array<{ label: string; status: OfferingGovernanceChecklistStatus; detail: string | null }> {
  return checklist.map((item) => ({
    label: item.name,
    status: item.status,
    detail: item.detail,
  }));
}
