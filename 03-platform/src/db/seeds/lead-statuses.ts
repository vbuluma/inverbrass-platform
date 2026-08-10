/**
 * Purpose:
 * Static Lead Status reference catalogue seed data.
 *
 * Implementation Package:
 * BP-004 / IP-02 – Lead Management
 */

export const leadStatuses = [
  {
    code: "NEW",
    name: "New",
    description: "Newly captured lead awaiting first contact.",
    displayOrder: 10,
    isActive: true,
  },
  {
    code: "CONTACTED",
    name: "Contacted",
    description: "Initial contact has been made.",
    displayOrder: 20,
    isActive: true,
  },
  {
    code: "QUALIFIED",
    name: "Qualified",
    description: "Lead meets qualification criteria and is ready for conversion.",
    displayOrder: 30,
    isActive: true,
  },
  {
    code: "UNQUALIFIED",
    name: "Unqualified",
    description: "Lead does not meet fit criteria.",
    displayOrder: 40,
    isActive: true,
  },
  {
    code: "CONVERTED",
    name: "Converted",
    description: "Lead converted to customer — read-only historical record.",
    displayOrder: 50,
    isActive: true,
  },
  {
    code: "RECYCLED",
    name: "Recycled",
    description: "Previously disqualified lead returned to pipeline.",
    displayOrder: 60,
    isActive: true,
  },
] as const;
