/**
 * Purpose:
 * Seed data for Group Type reference catalogue.
 *
 * Implementation Package:
 * BP-002 / IP-008 – Party Groups & Membership
 */

export const groupTypes = [
  {
    code: "CHAMA",
    name: "Chama",
    description: "Informal savings and investment group.",
    displayOrder: 1,
    isActive: true,
  },
  {
    code: "SACCO",
    name: "SACCO",
    description: "Savings and Credit Cooperative Organization.",
    displayOrder: 2,
    isActive: true,
  },
  {
    code: "SAVINGS_GROUP",
    name: "Savings Group",
    description: "Community savings group.",
    displayOrder: 3,
    isActive: true,
  },
  {
    code: "INVESTMENT_CLUB",
    name: "Investment Club",
    description: "Group pooling funds for investment.",
    displayOrder: 4,
    isActive: true,
  },
  {
    code: "FARMER_GROUP",
    name: "Farmer Group",
    description: "Collective of farmers for coordination and support.",
    displayOrder: 5,
    isActive: true,
  },
  {
    code: "SELF_HELP_GROUP",
    name: "Self Help Group",
    description: "Peer support and micro-finance group.",
    displayOrder: 6,
    isActive: true,
  },
  {
    code: "COOPERATIVE",
    name: "Cooperative Society",
    description: "Registered cooperative entity.",
    displayOrder: 7,
    isActive: true,
  },
  {
    code: "COMMUNITY_GROUP",
    name: "Community Group",
    description: "Local community association.",
    displayOrder: 8,
    isActive: true,
  },
  {
    code: "CHURCH_GROUP",
    name: "Church Group",
    description: "Religious congregation or cell group.",
    displayOrder: 9,
    isActive: true,
  },
  {
    code: "NGO_GROUP",
    name: "NGO Group",
    description: "NGO beneficiary or programme group.",
    displayOrder: 10,
    isActive: true,
  },
  {
    code: "ASSOCIATION",
    name: "Association",
    description: "Professional or trade association.",
    displayOrder: 11,
    isActive: true,
  },
  {
    code: "PROJECT_TEAM",
    name: "Project Team",
    description: "Temporary team for a project or initiative.",
    displayOrder: 12,
    isActive: true,
  },
  {
    code: "BOARD",
    name: "Board",
    description: "Governing board or council.",
    displayOrder: 13,
    isActive: true,
  },
  {
    code: "COMMITTEE",
    name: "Committee",
    description: "Standing or ad-hoc committee.",
    displayOrder: 14,
    isActive: true,
  },
  {
    code: "CUSTOMER_SEGMENT",
    name: "Customer Segment",
    description: "Marketing or CRM customer grouping.",
    displayOrder: 15,
    isActive: true,
  },
  {
    code: "SUPPLIER_NETWORK",
    name: "Supplier Network",
    description: "Network of suppliers or vendors.",
    displayOrder: 16,
    isActive: true,
  },
] as const;
