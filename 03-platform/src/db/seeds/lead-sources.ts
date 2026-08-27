/**
 * Purpose:
 * Static Lead Source reference catalogue seed data.
 *
 * Implementation Package:
 * BP-004 / IP-02 – Lead Management
 */

export const leadSources = [
  {
    code: "WEB",
    name: "Website",
    description: "Inbound web form or digital capture.",
    displayOrder: 10,
    isActive: true,
  },
  {
    code: "WALK_IN",
    name: "Walk-in",
    description: "In-person walk-in enquiry.",
    displayOrder: 20,
    isActive: true,
  },
  {
    code: "REFERRAL",
    name: "Referral",
    description: "Referred by an existing customer or partner.",
    displayOrder: 30,
    isActive: true,
  },
  {
    code: "CAMPAIGN",
    name: "Campaign",
    description: "Marketing campaign response.",
    displayOrder: 40,
    isActive: true,
  },
  {
    code: "PARTNER",
    name: "Partner",
    description: "Partner or channel referral.",
    displayOrder: 50,
    isActive: true,
  },
  {
    code: "IMPORT",
    name: "Import",
    description: "Bulk import or migration.",
    displayOrder: 60,
    isActive: true,
  },
  {
    code: "API",
    name: "API",
    description: "External system integration.",
    displayOrder: 70,
    isActive: true,
  },
  {
    code: "INSTITUTION",
    name: "Institution",
    description: "Institutional or corporate channel partner intake.",
    displayOrder: 75,
    isActive: true,
  },
  {
    code: "OTHER",
    name: "Other",
    description: "Other lead source.",
    displayOrder: 80,
    isActive: true,
  },
] as const;
