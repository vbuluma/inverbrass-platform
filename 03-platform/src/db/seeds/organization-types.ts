/**
 * Purpose:
 * Seed data for Organization Type reference catalogue.
 *
 * Implementation Package:
 * BP-002 / IP-001 – Party Foundation
 */

export const organizationTypes = [
  {
    code: "COMPANY",
    name: "Company",
    description: "Registered company or commercial entity.",
    displayOrder: 1,
    isActive: true,
  },
  {
    code: "NGO",
    name: "NGO",
    description: "Non-governmental organization.",
    displayOrder: 2,
    isActive: true,
  },
  {
    code: "SACCO",
    name: "SACCO",
    description: "Savings and credit cooperative.",
    displayOrder: 3,
    isActive: true,
  },
  {
    code: "COOPERATIVE",
    name: "Cooperative",
    description: "Cooperative society.",
    displayOrder: 4,
    isActive: true,
  },
  {
    code: "GOVERNMENT",
    name: "Government Agency",
    description: "Government department or agency.",
    displayOrder: 5,
    isActive: true,
  },
  {
    code: "SCHOOL",
    name: "School",
    description: "Educational institution.",
    displayOrder: 6,
    isActive: true,
  },
  {
    code: "OTHER",
    name: "Other",
    description: "Other organization type.",
    displayOrder: 7,
    isActive: true,
  },
] as const;
