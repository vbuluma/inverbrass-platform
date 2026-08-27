/**
 * Purpose:
 * ENG-009 delivery boundary. Callers request delivery; they do not send.
 *
 * Engine:
 * ENG-009 – Notification Engine
 */

import type {
  DocumentDeliveryResult,
  RequestDocumentDeliveryInput,
} from "@/core/notification-engine/types";

export type NotificationEnginePort = {
  requestDocumentDelivery(
    input: RequestDocumentDeliveryInput
  ): Promise<DocumentDeliveryResult>;
};
