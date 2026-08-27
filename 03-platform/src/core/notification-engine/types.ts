/**
 * Purpose:
 * ENG-009 delivery request types. No WhatsApp/email infrastructure here.
 *
 * Engine:
 * ENG-009 – Notification Engine
 */

export type RequestDocumentDeliveryInput = {
  businessId: string;
  documentType: string;
  referenceId: string;
  channel: string;
  recipientHint?: string | null;
  payload: Record<string, unknown>;
};

export type DocumentDeliveryResult = {
  deliveryId: string;
  channel: string;
  status: "REQUESTED" | "DELIVERED" | "FAILED";
  failureReason: string | null;
  requestedAt: string;
};
