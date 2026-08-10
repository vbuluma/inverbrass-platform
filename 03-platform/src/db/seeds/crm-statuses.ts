/**
 * Purpose:
 * Static CRM Status reference catalogue seed data.
 *
 * Implementation Package:
 * BP-004 / IP-001 – CRM Foundation & Customer 360
 */

export const crmStatuses = [
  {
    code: "PROSPECT",
    name: "Prospect",
    description: "Initial CRM relationship — not yet qualified as lead.",
    displayOrder: 10,
    isActive: true,
  },
  {
    code: "LEAD",
    name: "Lead",
    description: "Active sales lead in qualification pipeline.",
    displayOrder: 20,
    isActive: true,
  },
  {
    code: "ACTIVE",
    name: "Active Customer",
    description: "Established active customer relationship.",
    displayOrder: 30,
    isActive: true,
  },
  {
    code: "DORMANT",
    name: "Dormant",
    description: "No recent engagement — relationship preserved.",
    displayOrder: 40,
    isActive: true,
  },
  {
    code: "SUSPENDED",
    name: "Suspended",
    description: "Temporarily suspended customer relationship.",
    displayOrder: 50,
    isActive: true,
  },
  {
    code: "CLOSED",
    name: "Closed",
    description: "Closed customer relationship.",
    displayOrder: 60,
    isActive: true,
  },
  {
    code: "ARCHIVED",
    name: "Archived",
    description: "Archived read-only customer record.",
    displayOrder: 70,
    isActive: true,
  },
] as const;
