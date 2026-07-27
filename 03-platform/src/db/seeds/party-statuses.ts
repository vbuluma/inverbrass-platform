/**
 * Purpose:
 * Seed data for Party Status reference catalogue.
 *
 * Implementation Package:
 * BP-002 / IP-001 – Party Foundation
 */

export const partyStatuses = [
  {
    code: "ACTIVE",
    name: "Active",
    description: "Party is active and available across the platform.",
    displayOrder: 1,
    isActive: true,
  },
  {
    code: "SUSPENDED",
    name: "Suspended",
    description: "Party is temporarily suspended.",
    displayOrder: 2,
    isActive: true,
  },
  {
    code: "ARCHIVED",
    name: "Archived",
    description: "Party is archived and no longer operational.",
    displayOrder: 3,
    isActive: true,
  },
] as const;
