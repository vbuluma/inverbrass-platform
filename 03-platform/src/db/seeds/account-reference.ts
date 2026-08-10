/**
 * Purpose:
 * Static account type, status, and CRM contact role seed data.
 *
 * Implementation Package:
 * BP-004 / IP-04 – Customer & Contact Management
 */

export const accountTypes = [
  {
    code: "ENTERPRISE",
    name: "Enterprise",
    description: "Large enterprise account.",
    displayOrder: 10,
    isActive: true,
  },
  {
    code: "SME",
    name: "SME",
    description: "Small or medium enterprise.",
    displayOrder: 20,
    isActive: true,
  },
  {
    code: "HOUSEHOLD",
    name: "Household",
    description: "Household or family account.",
    displayOrder: 30,
    isActive: true,
  },
  {
    code: "GOVERNMENT",
    name: "Government",
    description: "Government or public sector account.",
    displayOrder: 40,
    isActive: true,
  },
  {
    code: "PARTNER",
    name: "Partner",
    description: "Channel or strategic partner account.",
    displayOrder: 50,
    isActive: true,
  },
  {
    code: "OTHER",
    name: "Other",
    description: "Other account type.",
    displayOrder: 60,
    isActive: true,
  },
] as const;

export const accountStatuses = [
  {
    code: "PROSPECT",
    name: "Prospect",
    description: "Account in prospect stage.",
    displayOrder: 10,
    isActive: true,
  },
  {
    code: "ACTIVE",
    name: "Active",
    description: "Active selling or service relationship.",
    displayOrder: 20,
    isActive: true,
  },
  {
    code: "INACTIVE",
    name: "Inactive",
    description: "Temporarily inactive account.",
    displayOrder: 30,
    isActive: true,
  },
  {
    code: "CLOSED",
    name: "Closed",
    description: "Closed account relationship.",
    displayOrder: 40,
    isActive: true,
  },
] as const;

export const crmContactRoles = [
  {
    code: "DECISION_MAKER",
    name: "Decision Maker",
    description: "Primary decision authority.",
    displayOrder: 10,
    isActive: true,
  },
  {
    code: "INFLUENCER",
    name: "Influencer",
    description: "Influences buying decisions.",
    displayOrder: 20,
    isActive: true,
  },
  {
    code: "USER",
    name: "User",
    description: "End user of the offering.",
    displayOrder: 30,
    isActive: true,
  },
  {
    code: "BILLING",
    name: "Billing",
    description: "Billing and accounts payable contact.",
    displayOrder: 40,
    isActive: true,
  },
  {
    code: "TECHNICAL",
    name: "Technical",
    description: "Technical liaison.",
    displayOrder: 50,
    isActive: true,
  },
  {
    code: "OTHER",
    name: "Other",
    description: "Other CRM contact role.",
    displayOrder: 60,
    isActive: true,
  },
] as const;
