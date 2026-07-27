/**
 * Purpose:
 * Seed data for Party Type reference catalogue.
 *
 * Implementation Package:
 * BP-002 / IP-001 – Party Foundation
 */

export const partyTypes = [
  {
    code: "INDIVIDUAL",
    name: "Individual",
    description: "A person registered as a Party.",
    displayOrder: 1,
    isActive: true,
  },
  {
    code: "ORGANIZATION",
    name: "Organization",
    description: "A company, NGO, school, or other legal entity.",
    displayOrder: 2,
    isActive: true,
  },
] as const;
