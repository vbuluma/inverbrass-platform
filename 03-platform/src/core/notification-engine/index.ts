/**
 * Purpose:
 * Public exports for ENG-009 Notification Engine (delivery slice).
 *
 * Engine:
 * ENG-009 – Notification Engine
 */

export {
  NOTIFICATION_ENGINE_ID,
  RECEIPT_DELIVERY_CHANNELS,
  RECEIPT_DELIVERY_STATUSES,
} from "@/core/notification-engine/constants";
export type { ReceiptDeliveryChannel } from "@/core/notification-engine/constants";
export type { NotificationEnginePort } from "@/core/notification-engine/ports";
export type {
  DocumentDeliveryResult,
  RequestDocumentDeliveryInput,
} from "@/core/notification-engine/types";
export {
  InProcessNotificationAdapter,
  createInProcessNotificationAdapter,
} from "@/core/notification-engine/adapters/in-process-notification-adapter";
