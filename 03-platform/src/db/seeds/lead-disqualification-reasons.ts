/**
 * Purpose:
 * Static Lead Disqualification Reason reference catalogue seed data.
 *
 * Implementation Package:
 * BP-004 / IP-02 – Lead Management
 */

export const leadDisqualificationReasons = [
  {
    code: "NO_BUDGET",
    name: "No Budget",
    description: "Prospect lacks budget for the offering.",
    displayOrder: 10,
    isActive: true,
  },
  {
    code: "NO_FIT",
    name: "Poor Fit",
    description: "Offering does not match prospect needs.",
    displayOrder: 20,
    isActive: true,
  },
  {
    code: "NO_RESPONSE",
    name: "No Response",
    description: "Prospect stopped responding after outreach.",
    displayOrder: 30,
    isActive: true,
  },
  {
    code: "COMPETITOR",
    name: "Chose Competitor",
    description: "Prospect selected a competing solution.",
    displayOrder: 40,
    isActive: true,
  },
  {
    code: "DUPLICATE",
    name: "Duplicate",
    description: "Duplicate of an existing lead or customer.",
    displayOrder: 50,
    isActive: true,
  },
  {
    code: "OTHER",
    name: "Other",
    description: "Other disqualification reason.",
    displayOrder: 60,
    isActive: true,
  },
] as const;
