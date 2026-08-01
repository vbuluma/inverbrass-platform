/**
 * Purpose:
 * Default governance status and checklist definition seeds.
 *
 * Implementation Package:
 * BP-003 / IP-013 – Offering Governance
 */

import { OFFERING_GOVERNANCE_STATUS_CODES } from "@/modules/product/constants";

export type OfferingGovernanceStatusSeed = {
  code: string;
  name: string;
  description: string;
  displayOrder: number;
};

export const defaultOfferingGovernanceStatuses: OfferingGovernanceStatusSeed[] = [
  {
    code: OFFERING_GOVERNANCE_STATUS_CODES.NOT_STARTED,
    name: "Not Started",
    description: "Governance has not been initiated.",
    displayOrder: 10,
  },
  {
    code: OFFERING_GOVERNANCE_STATUS_CODES.IN_PROGRESS,
    name: "In Progress",
    description: "Governance validation is in progress.",
    displayOrder: 20,
  },
  {
    code: OFFERING_GOVERNANCE_STATUS_CODES.READY,
    name: "Ready",
    description: "Offering meets governance readiness requirements.",
    displayOrder: 30,
  },
  {
    code: OFFERING_GOVERNANCE_STATUS_CODES.ON_HOLD,
    name: "On Hold",
    description: "Governance changes are locked pending review.",
    displayOrder: 40,
  },
  {
    code: OFFERING_GOVERNANCE_STATUS_CODES.NON_COMPLIANT,
    name: "Non-Compliant",
    description: "Mandatory governance requirements are not met.",
    displayOrder: 50,
  },
  {
    code: OFFERING_GOVERNANCE_STATUS_CODES.ARCHIVED,
    name: "Archived",
    description: "Governance is archived with the offering.",
    displayOrder: 60,
  },
];

export type OfferingGovernanceChecklistSeed = {
  code: string;
  name: string;
  description: string;
  sourceModule: string;
  evaluatorKey: string;
  isMandatory: boolean;
  weight: number;
  displayOrder: number;
};

export const defaultOfferingGovernanceChecklist: OfferingGovernanceChecklistSeed[] =
  [
    {
      code: "IDENTITY_COMPLETE",
      name: "Identity complete",
      description: "Offering has code, name, and type.",
      sourceModule: "BP-003/IP-001",
      evaluatorKey: "IDENTITY_COMPLETE",
      isMandatory: true,
      weight: 10,
      displayOrder: 10,
    },
    {
      code: "BUSINESS_OWNER_ASSIGNED",
      name: "Responsible Business Owner assigned",
      description: "A responsible business owner is assigned.",
      sourceModule: "BP-003/IP-013",
      evaluatorKey: "BUSINESS_OWNER_ASSIGNED",
      isMandatory: true,
      weight: 10,
      displayOrder: 20,
    },
    {
      code: "CLASSIFICATION_ASSIGNED",
      name: "Classification assigned",
      description: "Offering is assigned to at least one catalogue node.",
      sourceModule: "BP-003/IP-002",
      evaluatorKey: "CLASSIFICATION_ASSIGNED",
      isMandatory: true,
      weight: 10,
      displayOrder: 30,
    },
    {
      code: "PRICING_CONFIGURED",
      name: "Pricing configured",
      description: "At least one price record exists for the offering.",
      sourceModule: "BP-003/IP-011",
      evaluatorKey: "PRICING_CONFIGURED",
      isMandatory: true,
      weight: 15,
      displayOrder: 40,
    },
    {
      code: "DOCUMENTS_UPLOADED",
      name: "Required documents uploaded",
      description: "Mandatory documents are present.",
      sourceModule: "BP-003/IP-009",
      evaluatorKey: "DOCUMENTS_UPLOADED",
      isMandatory: true,
      weight: 15,
      displayOrder: 50,
    },
    {
      code: "COMPLIANCE_REQUIREMENTS_MET",
      name: "Compliance requirements met",
      description: "Regulatory compliance requirements are satisfied.",
      sourceModule: "BP-003/IP-009",
      evaluatorKey: "COMPLIANCE_REQUIREMENTS_MET",
      isMandatory: true,
      weight: 15,
      displayOrder: 60,
    },
    {
      code: "RELATIONSHIPS_CONFIGURED",
      name: "Relationships configured",
      description: "Required offering relationships are defined.",
      sourceModule: "BP-003/IP-010",
      evaluatorKey: "RELATIONSHIPS_CONFIGURED",
      isMandatory: false,
      weight: 10,
      displayOrder: 70,
    },
    {
      code: "ANALYTICS_ENABLED",
      name: "Analytics enabled",
      description: "Analytics snapshots exist for the offering.",
      sourceModule: "BP-003/IP-012",
      evaluatorKey: "ANALYTICS_ENABLED",
      isMandatory: false,
      weight: 10,
      displayOrder: 80,
    },
    {
      code: "LIFECYCLE_COMPLETE",
      name: "Lifecycle complete",
      description: "Offering lifecycle status is active or approved for release.",
      sourceModule: "BP-003/IP-008",
      evaluatorKey: "LIFECYCLE_COMPLETE",
      isMandatory: false,
      weight: 5,
      displayOrder: 90,
    },
  ];
