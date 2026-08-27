/**
 * Purpose:
 * Payment method catalogue seed — configuration data only.
 * Codes are not business-rule switch values.
 *
 * Implementation Package:
 * BP-007 / IP-01 – Payment Obligation & Provider Integration Foundation
 */

export const paymentMethods = [
  {
    code: "CASH",
    name: "Cash",
    customerLabel: "Cash",
    description: "Manual cash capture. No electronic rail required.",
    displayOrder: 1,
    isActive: true,
    requiresRail: false,
    requiresProvider: false,
    requiresChannel: false,
    enablementFlag: "cashEnabled",
  },
  {
    code: "MOBILE_MONEY",
    name: "Mobile Money",
    customerLabel: "M-Pesa",
    description: "Mobile money tender. Requires a configured rail/provider/channel.",
    displayOrder: 2,
    isActive: true,
    requiresRail: true,
    requiresProvider: true,
    requiresChannel: true,
    enablementFlag: "mobileMoneyEnabled",
  },
  {
    code: "CARD",
    name: "Card",
    customerLabel: "Card",
    description: "Card tender. Requires a configured rail/provider/channel.",
    displayOrder: 3,
    isActive: true,
    requiresRail: true,
    requiresProvider: true,
    requiresChannel: true,
    enablementFlag: "cardEnabled",
  },
  {
    code: "BANK_TRANSFER",
    name: "Bank Transfer",
    customerLabel: "Bank",
    description: "Bank transfer tender. Requires a configured rail/provider/channel.",
    displayOrder: 4,
    isActive: true,
    requiresRail: true,
    requiresProvider: true,
    requiresChannel: true,
    enablementFlag: "bankTransferEnabled",
  },
];
