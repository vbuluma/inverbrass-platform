/**
 * Purpose:
 * Default pricing method catalogue entries (platform reference).
 *
 * Implementation Package:
 * BP-003 / IP-011 – Offering Pricing & Pricing Rules
 */

export type PricingMethodSeed = {
  code: string;
  name: string;
  description: string;
  displayOrder: number;
};

export const defaultPricingMethods: PricingMethodSeed[] = [
  {
    code: "FIXED",
    name: "Fixed Price",
    description: "A single fixed unit price.",
    displayOrder: 10,
  },
  {
    code: "VARIABLE",
    name: "Variable Price",
    description: "Price varies by market or external factors.",
    displayOrder: 20,
  },
  {
    code: "TIERED",
    name: "Tiered Price",
    description: "Price varies by quantity tier.",
    displayOrder: 30,
  },
  {
    code: "SUBSCRIPTION",
    name: "Subscription",
    description: "Recurring subscription pricing.",
    displayOrder: 40,
  },
  {
    code: "USAGE",
    name: "Usage Based",
    description: "Price per unit of consumption.",
    displayOrder: 50,
  },
  {
    code: "TIME_BASED",
    name: "Time Based",
    description: "Price per time period.",
    displayOrder: 60,
  },
  {
    code: "RENTAL",
    name: "Rental",
    description: "Rental or hire pricing.",
    displayOrder: 70,
  },
  {
    code: "INTEREST_RATE",
    name: "Interest Rate",
    description: "Interest rate pricing for financial products.",
    displayOrder: 80,
  },
  {
    code: "PREMIUM",
    name: "Premium",
    description: "Insurance premium pricing.",
    displayOrder: 90,
  },
  {
    code: "CONSULTATION",
    name: "Consultation Fee",
    description: "Consultation or professional service fee.",
    displayOrder: 100,
  },
];
