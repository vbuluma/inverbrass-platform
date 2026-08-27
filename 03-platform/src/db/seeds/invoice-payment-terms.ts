/**
 * Purpose:
 * Configurable invoice payment terms used by BP-007 IP-04.
 * Net-day counts belong to this catalogue, not a hard-coded billing rule.
 *
 * Implementation Package:
 * BP-007 / IP-04 – Billing, Invoicing & Credit Sales
 */

export const invoicePaymentTerms = [
  { code: "IMMEDIATE", name: "Due immediately", netDays: 0, displayOrder: 1, isActive: true },
  { code: "NET_7", name: "Net 7 days", netDays: 7, displayOrder: 2, isActive: true },
  { code: "NET_14", name: "Net 14 days", netDays: 14, displayOrder: 3, isActive: true },
  { code: "NET_30", name: "Net 30 days", netDays: 30, displayOrder: 4, isActive: true },
] as const;
