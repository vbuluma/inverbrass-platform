/**
 * Purpose:
 * ENG-006 Payment Engine constants. Provider names and limits are not encoded here.
 *
 * Implementation Package:
 * BP-007 / IP-01 – Payment Obligation & Provider Integration Foundation
 */

export const PAYMENT_ENGINE_ID = "ENG-006";

export const PAYMENT_ENGINE_OPERATIONS = {
  GET_ELIGIBLE_CHANNELS: "GET_ELIGIBLE_CHANNELS",
  GET_LIMITS: "GET_LIMITS",
  GET_CAPABILITIES: "GET_CAPABILITIES",
  INITIATE_PAYMENT: "INITIATE_PAYMENT",
  QUERY_PAYMENT: "QUERY_PAYMENT",
  REFUND_PAYMENT: "REFUND_PAYMENT",
} as const;

export type PaymentEngineOperation =
  (typeof PAYMENT_ENGINE_OPERATIONS)[keyof typeof PAYMENT_ENGINE_OPERATIONS];
