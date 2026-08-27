/**
 * Purpose:
 * ENG-009 Notification Engine identifiers. Delivery only; not payment capture.
 *
 * Engine:
 * ENG-009 – Notification Engine
 */

export const NOTIFICATION_ENGINE_ID = "ENG-009";

export const RECEIPT_DELIVERY_CHANNELS = {
  EMAIL: "EMAIL",
  WHATSAPP: "WHATSAPP",
  PRINT: "PRINT",
  SCREEN: "SCREEN",
  DOCUMENT: "DOCUMENT",
} as const;

export type ReceiptDeliveryChannel =
  (typeof RECEIPT_DELIVERY_CHANNELS)[keyof typeof RECEIPT_DELIVERY_CHANNELS];

export const RECEIPT_DELIVERY_STATUSES = {
  REQUESTED: "REQUESTED",
  DELIVERED: "DELIVERED",
  FAILED: "FAILED",
} as const;
