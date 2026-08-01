/**
 * Purpose:
 * User-facing labels for Offering Governance UI.
 *
 * Implementation Package:
 * BP-003 / IP-013 – Offering Governance
 */

export const OFFERING_GOVERNANCE_UI_LABELS = {
  dashboardTitle: "Offering Governance",
  dashboardDescription:
    "Enterprise governance, ownership, and readiness across the offering catalogue.",
  panelTitle: "Governance",
  panelDescription:
    "Ownership, readiness score, and validation results for this offering.",
  sectionOwnership: "Ownership",
  sectionGovernanceStatus: "Governance Status",
  sectionReadinessScore: "Readiness Score",
  sectionReadinessChecklist: "Readiness Checklist",
  sectionValidationResults: "Validation Results",
  sectionGovernanceHistory: "Governance History",
  businessOwner: "Responsible Business Owner",
  technicalOwner: "Technical Owner",
  productSteward: "Product Steward",
  governanceStatus: "Governance Status",
  readinessScore: "Readiness Score",
  lastValidation: "Last Validation",
  locked: "Governance Locked",
  notes: "Notes",
  runValidation: "Run Validation",
  saveOwnership: "Save Ownership",
  saveNotes: "Save Notes",
  lockGovernance: "Lock Governance",
  unlockGovernance: "Unlock Governance",
  noHistory: "No governance changes recorded yet.",
  noChecklist: "No checklist definitions configured.",
  searchPlaceholder: "Search offerings, owners, or status…",
  offeringsGoverned: "Offerings Governed",
  readyCount: "Ready for Release",
  nonCompliantCount: "Non-Compliant",
  averageReadiness: "Average Readiness",
  mandatoryMissing: "Mandatory requirements missing",
  pendingModule: "Pending module integration",
} as const;
