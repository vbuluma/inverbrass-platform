/**
 * Purpose:
 * User-facing labels for the Product/Offering catalogue — no database terminology.
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation
 */

export const PRODUCT_UI_LABELS = {
  responsibleBusinessOwner: "Responsible Business Owner",
  responsibleBusinessOwnerHint:
    "Executive accountability for this offering. Delivery, reporting, and operational owners arrive in IP-013.",
  capabilitiesHeading: "Capabilities",
  capabilitiesDescription:
    "Describe how this offering may be used across channels. This is not inventory or pricing.",
  identityHeading: "Identity",
  lifecycleHeading: "Lifecycle",
  ownershipHeading: "Ownership",
  migrationHeading: "Migration",
} as const;

export const PRODUCT_CAPABILITY_LABELS = [
  { field: "isSellable", label: "Sellable" },
  { field: "isPurchasable", label: "Purchasable" },
  { field: "isBookable", label: "Bookable" },
  { field: "isRentable", label: "Rentable" },
  { field: "isInsurable", label: "Insurable", derivedFromType: "INSURANCE" },
  { field: "isLoanProduct", label: "Loan Product", derivedFromType: "LOAN_PRODUCT" },
  { field: "isSubscription", label: "Subscription" },
  { field: "isDigital", label: "Digital" },
] as const;

export const PRODUCT_CODE_MODES = {
  AUTO: "AUTO",
  MANUAL: "MANUAL",
  IMPORTED: "IMPORTED",
  CONFIGURED: "CONFIGURED",
} as const;

export type ProductCodeMode =
  (typeof PRODUCT_CODE_MODES)[keyof typeof PRODUCT_CODE_MODES];
