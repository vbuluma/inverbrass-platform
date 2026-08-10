/**
 * Customer 360 Settings contribution IDs only (not hub widgets).
 *
 * Implementation Package:
 * BP-004 / IP-013 – CRM Governance & Administration
 */

export const CRM_GOVERNANCE_CUSTOMER_360_SETTINGS = [
  {
    id: "governance-ownership",
    label: "Governance Ownership",
    description: "Owner, relationship manager, and steward assignment",
    hrefSuffix: "/crm/governance/parties",
  },
  {
    id: "governance-readiness",
    label: "Governance Readiness",
    description: "Checklist score and activation blockers",
    hrefSuffix: "/crm/governance/parties",
  },
  {
    id: "merge-rules",
    label: "Merge Rules",
    description: "Duplicate detection and merge proposal actions",
    hrefSuffix: "/crm/governance",
  },
  {
    id: "sla-policies",
    label: "SLA Policies",
    description: "Entity-type SLA administration (ENG-003n stub)",
    hrefSuffix: "/crm/governance",
  },
] as const;

/** Governance admin does not register Customer 360 hub widgets. */
export const CRM_GOVERNANCE_CUSTOMER_360_WIDGETS = [] as const;

export const CRM_GOVERNANCE_CUSTOMER_360_TIMELINE_EVENTS = [
  "GOVERNANCE_VALIDATED",
  "GOVERNANCE_OWNER_CHANGED",
  "GOVERNANCE_LOCKED",
  "MERGE_PROPOSED",
] as const;
