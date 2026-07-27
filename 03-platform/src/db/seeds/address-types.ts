/**
 * Purpose:
 * Seed data for Party Address Type reference catalogue.
 *
 * Implementation Package:
 * BP-002 / IP-004 – Address Management
 */

export const addressTypes = [
  {
    code: "PHYSICAL",
    name: "Physical",
    description: "Physical location address.",
    displayOrder: 1,
    isActive: true,
  },
  {
    code: "POSTAL",
    name: "Postal",
    description: "Postal or P.O. Box address.",
    displayOrder: 2,
    isActive: true,
  },
  {
    code: "BILLING",
    name: "Billing",
    description: "Billing correspondence address.",
    displayOrder: 3,
    isActive: true,
  },
  {
    code: "DELIVERY",
    name: "Delivery",
    description: "Delivery or shipping address.",
    displayOrder: 4,
    isActive: true,
  },
  {
    code: "HEAD_OFFICE",
    name: "Head Office",
    description: "Organization head office address.",
    displayOrder: 5,
    isActive: true,
  },
  {
    code: "BRANCH",
    name: "Branch",
    description: "Branch or outlet address.",
    displayOrder: 6,
    isActive: true,
  },
  {
    code: "RESIDENTIAL",
    name: "Residential",
    description: "Residential home address.",
    displayOrder: 7,
    isActive: true,
  },
  {
    code: "OFFICE",
    name: "Office",
    description: "Office or workplace address.",
    displayOrder: 8,
    isActive: true,
  },
  {
    code: "GPS",
    name: "GPS",
    description: "GPS coordinate-based location.",
    displayOrder: 9,
    isActive: true,
  },
] as const;
