/**
 * Purpose:
 * Static Product Status reference catalogue seed data.
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation
 */

export const productStatuses = [
  {
    code: "DRAFT",
    name: "Draft",
    description: "Product is being prepared and is not yet available.",
    displayOrder: 10,
    isActive: true,
  },
  {
    code: "ACTIVE",
    name: "Active",
    description: "Product is available for use or sale.",
    displayOrder: 20,
    isActive: true,
  },
  {
    code: "SUSPENDED",
    name: "Suspended",
    description: "Product is temporarily unavailable.",
    displayOrder: 30,
    isActive: true,
  },
  {
    code: "DISCONTINUED",
    name: "Discontinued",
    description: "Product is no longer offered but retained for history.",
    displayOrder: 40,
    isActive: true,
  },
  {
    code: "ARCHIVED",
    name: "Archived",
    description: "Historical product record — cannot be modified.",
    displayOrder: 50,
    isActive: true,
  },
] as const;
