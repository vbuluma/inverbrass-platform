/**
 * Purpose:
 * Payment rail/network catalogue seed — configuration data only.
 *
 * Implementation Package:
 * BP-007 / IP-01 – Payment Obligation & Provider Integration Foundation
 */

export const paymentNetworks = [
  {
    paymentMethodCode: "MOBILE_MONEY",
    code: "MPESA",
    name: "M-Pesa",
    customerLabel: "M-Pesa",
    description: "Mobile-money rail (configuration example).",
    displayOrder: 1,
    isActive: true,
  },
  {
    paymentMethodCode: "MOBILE_MONEY",
    code: "AIRTEL_MONEY",
    name: "Airtel Money",
    customerLabel: "Airtel Money",
    description: "Mobile-money rail (configuration example).",
    displayOrder: 2,
    isActive: true,
  },
  {
    paymentMethodCode: "CARD",
    code: "VISA",
    name: "Visa",
    customerLabel: "Card",
    description: "Card network (configuration example).",
    displayOrder: 10,
    isActive: true,
  },
  {
    paymentMethodCode: "BANK_TRANSFER",
    code: "RTGS",
    name: "RTGS",
    customerLabel: "Bank",
    description: "Bank transfer rail (configuration example).",
    displayOrder: 20,
    isActive: true,
  },
];
