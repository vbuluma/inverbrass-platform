/**
 * Purpose:
 * In-process ENG-009 adapter. Records delivery requests without SMTP,
 * WhatsApp, or provider HTTP.
 *
 * Engine:
 * ENG-009 – Notification Engine
 */

import { RECEIPT_DELIVERY_STATUSES } from "@/core/notification-engine/constants";
import type { NotificationEnginePort } from "@/core/notification-engine/ports";
import type {
  DocumentDeliveryResult,
  RequestDocumentDeliveryInput,
} from "@/core/notification-engine/types";

export class InProcessNotificationAdapter implements NotificationEnginePort {
  readonly deliveryCalls: RequestDocumentDeliveryInput[] = [];
  failNext = false;
  failureReason = "Delivery could not be completed.";

  async requestDocumentDelivery(
    input: RequestDocumentDeliveryInput
  ): Promise<DocumentDeliveryResult> {
    this.deliveryCalls.push(input);
    const failed = this.failNext;
    this.failNext = false;
    return {
      deliveryId: `eng009-${input.channel}-${input.referenceId}-${this.deliveryCalls.length}`,
      channel: input.channel,
      status: failed
        ? RECEIPT_DELIVERY_STATUSES.FAILED
        : RECEIPT_DELIVERY_STATUSES.DELIVERED,
      failureReason: failed ? this.failureReason : null,
      requestedAt: new Date().toISOString(),
    };
  }
}

export function createInProcessNotificationAdapter() {
  return new InProcessNotificationAdapter();
}
