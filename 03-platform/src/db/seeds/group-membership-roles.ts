/**
 * Purpose:
 * Seed data for Group Membership Role reference catalogue.
 *
 * Implementation Package:
 * BP-002 / IP-008 – Party Groups & Membership
 */

export const groupMembershipRoles = [
  {
    code: "CHAIRPERSON",
    name: "Chairperson",
    description: "Group chairperson or leader.",
    displayOrder: 1,
    isActive: true,
  },
  {
    code: "VICE_CHAIRPERSON",
    name: "Vice Chairperson",
    description: "Deputy chairperson.",
    displayOrder: 2,
    isActive: true,
  },
  {
    code: "SECRETARY",
    name: "Secretary",
    description: "Group secretary.",
    displayOrder: 3,
    isActive: true,
  },
  {
    code: "TREASURER",
    name: "Treasurer",
    description: "Group treasurer.",
    displayOrder: 4,
    isActive: true,
  },
  {
    code: "COORDINATOR",
    name: "Coordinator",
    description: "Group coordinator or facilitator.",
    displayOrder: 5,
    isActive: true,
  },
  {
    code: "MEMBER",
    name: "Member",
    description: "Regular group member.",
    displayOrder: 6,
    isActive: true,
  },
  {
    code: "PATRON",
    name: "Patron",
    description: "Patron or honorary member.",
    displayOrder: 7,
    isActive: true,
  },
  {
    code: "ADVISOR",
    name: "Advisor",
    description: "Advisory role.",
    displayOrder: 8,
    isActive: true,
  },
] as const;
