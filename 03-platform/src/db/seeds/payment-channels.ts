/**
 * Purpose:
 * Payment channel catalogue seed — configuration data only.
 * Channel codes are unique in the existing locked schema.
 *
 * Implementation Package:
 * BP-007 / IP-01 – Payment Obligation & Provider Integration Foundation
 */

export const paymentChannels = [
  {
    paymentProviderCode: "SAFARICOM",
    code: "STK_PUSH",
    name: "STK Push",
    customerLabel: "M-Pesa",
    description: "Customer authorises payment on a mobile phone.",
    displayOrder: 1,
    isActive: true,
  },
  {
    paymentProviderCode: "SAFARICOM",
    code: "PAYBILL",
    name: "Paybill",
    customerLabel: "M-Pesa",
    description: "Customer pays via Paybill number.",
    displayOrder: 2,
    isActive: true,
  },
  {
    paymentProviderCode: "SAFARICOM",
    code: "BUY_GOODS",
    name: "Buy Goods",
    customerLabel: "M-Pesa",
    description: "Customer pays via till number.",
    displayOrder: 3,
    isActive: true,
  },
  {
    paymentProviderCode: "AIRTEL",
    code: "USSD",
    name: "USSD",
    customerLabel: "Airtel Money",
    description: "Customer initiates payment via USSD.",
    displayOrder: 4,
    isActive: true,
  },
  {
    paymentProviderCode: "EQUITY_BANK",
    code: "MOBILE_APP",
    name: "Mobile Banking",
    customerLabel: "Card",
    description: "Payment initiated via mobile banking app.",
    displayOrder: 10,
    isActive: true,
  },
  {
    paymentProviderCode: "EQUITY_BANK",
    code: "INTERNET_BANKING",
    name: "Internet Banking",
    customerLabel: "Bank",
    description: "Payment initiated via web banking.",
    displayOrder: 11,
    isActive: true,
  },
  {
    paymentProviderCode: "EQUITY_BANK",
    code: "BRANCH",
    name: "Branch",
    customerLabel: "Bank",
    description: "Payment initiated at a branch.",
    displayOrder: 12,
    isActive: true,
  },
  {
    paymentProviderCode: "EQUITY_BANK",
    code: "POS",
    name: "POS Terminal",
    customerLabel: "Card",
    description: "Payment initiated from a POS terminal.",
    displayOrder: 13,
    isActive: true,
  },
];
