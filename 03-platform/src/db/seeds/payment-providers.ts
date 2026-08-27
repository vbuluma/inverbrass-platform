/**
 * Purpose:
 * Payment provider catalogue seed — configuration data only.
 * Same legal organisation on different rails uses distinct rows.
 *
 * Implementation Package:
 * BP-007 / IP-01 – Payment Obligation & Provider Integration Foundation
 */

export const paymentProviders = [
  {
    paymentNetworkCode: "MPESA",
    code: "SAFARICOM",
    name: "Safaricom PLC",
    description: "M-Pesa service provider (configuration example).",
    integrationRef: "eng-003e:mobile-money",
    displayOrder: 1,
    isActive: true,
  },
  {
    paymentNetworkCode: "AIRTEL_MONEY",
    code: "AIRTEL",
    name: "Airtel",
    description: "Airtel Money provider (configuration example).",
    integrationRef: "eng-003e:mobile-money",
    displayOrder: 2,
    isActive: true,
  },
  {
    paymentNetworkCode: "VISA",
    code: "EQUITY_BANK",
    name: "Equity Bank",
    description: "Card issuer participation (configuration example).",
    integrationRef: "eng-003e:card",
    displayOrder: 10,
    isActive: true,
  },
  {
    paymentNetworkCode: "VISA",
    code: "KCB_BANK",
    name: "KCB Bank",
    description: "Card issuer participation (configuration example).",
    integrationRef: "eng-003e:card",
    displayOrder: 11,
    isActive: true,
  },
  {
    paymentNetworkCode: "RTGS",
    code: "EQUITY_BANK_RTGS",
    name: "Equity Bank",
    description: "RTGS participant (configuration example).",
    integrationRef: "eng-003e:bank-transfer",
    displayOrder: 20,
    isActive: true,
  },
  {
    paymentNetworkCode: "RTGS",
    code: "KCB_BANK_RTGS",
    name: "KCB Bank",
    description: "RTGS participant (configuration example).",
    integrationRef: "eng-003e:bank-transfer",
    displayOrder: 21,
    isActive: true,
  },
];
