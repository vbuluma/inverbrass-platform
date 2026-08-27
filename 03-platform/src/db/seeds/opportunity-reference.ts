/**
 * Purpose:
 * Default opportunity pipeline and stage seed data.
 *
 * Implementation Package:
 * BP-004 / IP-03 – Opportunity Management
 */

export const opportunityPipelines = [
  {
    code: "STANDARD_SALES",
    name: "Standard Sales Pipeline",
    description: "Default B2B/B2C sales pipeline.",
    displayOrder: 10,
    isActive: true,
  },
] as const;

export const opportunityStagesByPipeline: Record<
  string,
  Array<{
    code: string;
    name: string;
    description?: string;
    displayOrder: number;
    defaultProbability: number;
    isClosedWon?: boolean;
    isClosedLost?: boolean;
    isActive: boolean;
  }>
> = {
  STANDARD_SALES: [
    {
      code: "PROSPECTING",
      name: "Prospecting",
      displayOrder: 10,
      defaultProbability: 10,
      isActive: true,
    },
    {
      code: "QUALIFICATION",
      name: "Qualification",
      displayOrder: 20,
      defaultProbability: 25,
      isActive: true,
    },
    {
      code: "PROPOSAL",
      name: "Proposal",
      displayOrder: 30,
      defaultProbability: 50,
      isActive: true,
    },
    {
      code: "NEGOTIATION",
      name: "Negotiation",
      displayOrder: 40,
      defaultProbability: 75,
      isActive: true,
    },
    {
      code: "CLOSED_WON",
      name: "Closed Won",
      displayOrder: 50,
      defaultProbability: 100,
      isClosedWon: true,
      isActive: true,
    },
    {
      code: "CLOSED_LOST",
      name: "Closed Lost",
      displayOrder: 60,
      defaultProbability: 0,
      isClosedLost: true,
      isActive: true,
    },
  ],
};

export const opportunityLossReasons = [
  {
    code: "PRICE",
    name: "Price",
    description: "Lost on price or discount.",
    displayOrder: 10,
    isActive: true,
  },
  {
    code: "COMPETITOR",
    name: "Competitor",
    description: "Lost to a competitor.",
    displayOrder: 20,
    isActive: true,
  },
  {
    code: "NO_BUDGET",
    name: "No Budget",
    description: "Prospect lacks budget.",
    displayOrder: 30,
    isActive: true,
  },
  {
    code: "NO_DECISION",
    name: "No Decision",
    description: "Deal stalled with no decision.",
    displayOrder: 40,
    isActive: true,
  },
  {
    code: "OTHER",
    name: "Other",
    description: "Other loss reason.",
    displayOrder: 50,
    isActive: true,
  },
] as const;
