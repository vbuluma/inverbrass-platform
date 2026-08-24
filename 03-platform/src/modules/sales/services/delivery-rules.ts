/**
 * Purpose:
 * Pure BP-006 IP-03 delivery, inspection, and service completion rules.
 * No inventory movement, payment, or IP-04 return initiation.
 *
 * Implementation Package:
 * BP-006 / IP-03 – Delivery, Inspection & Service Completion
 */

import {
  SALES_DELIVERY_EVENT_STATUS_CODES,
  SALES_DELIVERY_EVENT_TYPES,
  SALES_DELIVERY_POLICY,
  SALES_INSPECTION_STATUS_CODES,
  SALES_ORDER_LINE_TYPES,
  SALES_REJECTION_REASON_CODES,
  SALES_SERVICE_COMPLETION_STATUS_CODES,
} from "@/modules/sales/constants";
import { SalesOrderError, SALES_ERROR_CODES, SALES_USER_MESSAGES } from "@/modules/sales/errors";
import type { SalesDeliveryPolicy } from "@/modules/sales/ports";
import { parseQuantity, roundQuantity } from "@/modules/sales/services/order-lifecycle-rules";

export function deliveryPolicy(
  overrides?: Partial<SalesDeliveryPolicy>
): SalesDeliveryPolicy {
  return { ...SALES_DELIVERY_POLICY, ...overrides };
}

export function isPhysicalLine(lineType: string): boolean {
  return lineType === SALES_ORDER_LINE_TYPES.PHYSICAL;
}

export function isServiceLine(lineType: string): boolean {
  return lineType === SALES_ORDER_LINE_TYPES.SERVICE;
}

export function assertNonNegativeQuantity(value: number, field: string): number {
  const qty = parseQuantity(value);
  if (qty < 0) {
    throw new SalesOrderError(
      SALES_ERROR_CODES.INVALID_QUANTITY,
      SALES_USER_MESSAGES.INVALID_QUANTITY,
      400,
      { field, entity: "quantity" }
    );
  }
  return qty;
}

export function assertDeliveredWithinOrdered(input: {
  ordered: number;
  alreadyDelivered: number;
  additionalDelivered: number;
}): void {
  const next = roundQuantity(input.alreadyDelivered + input.additionalDelivered);
  if (next > input.ordered) {
    throw new SalesOrderError(
      SALES_ERROR_CODES.DELIVERED_EXCEEDS_ORDERED,
      SALES_USER_MESSAGES.DELIVERED_EXCEEDS_ORDERED,
      409,
      {
        field: "claimedQuantity",
        entity: "delivery",
        nextAction: "Record a quantity that stays within the ordered amount.",
      }
    );
  }
}

export function assertInspectionQuantities(input: {
  claimed: number;
  accepted: number;
  rejected: number;
}): { accepted: number; rejected: number; delivered: number } {
  const accepted = assertNonNegativeQuantity(input.accepted, "acceptedQuantity");
  const rejected = assertNonNegativeQuantity(input.rejected, "rejectedQuantity");
  const delivered = roundQuantity(accepted + rejected);
  if (delivered > input.claimed) {
    throw new SalesOrderError(
      SALES_ERROR_CODES.INVALID_FULFILMENT_OUTCOME,
      "Accepted plus rejected cannot be greater than the quantity that arrived.",
      409,
      {
        field: "acceptedQuantity",
        entity: "inspection",
        nextAction: "Accepted and rejected together must stay within the arrived quantity.",
      }
    );
  }
  return { accepted, rejected, delivered };
}

export function assertInspectionComments(input: {
  policy: SalesDeliveryPolicy;
  claimed: number;
  accepted: number;
  rejected: number;
  comments?: string | null;
  rejectionReasonCode?: string | null;
}): void {
  const partial = input.accepted > 0 && input.rejected > 0;
  const shortOfClaimed = roundQuantity(input.accepted + input.rejected) < input.claimed;
  const anyReject = input.rejected > 0;
  if (
    input.policy.commentsRequiredOnPartialOrReject &&
    (partial || anyReject || shortOfClaimed) &&
    !input.comments?.trim()
  ) {
    throw new SalesOrderError(
      SALES_ERROR_CODES.COMMENTS_REQUIRED,
      SALES_USER_MESSAGES.COMMENTS_REQUIRED,
      400,
      { field: "comments", entity: "inspection" }
    );
  }
  if (anyReject) {
    if (!input.rejectionReasonCode?.trim()) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.REJECTION_REASON_REQUIRED,
        SALES_USER_MESSAGES.REJECTION_REASON_REQUIRED,
        400,
        { field: "rejectionReasonCode", entity: "inspection" }
      );
    }
    const allowed = new Set(Object.values(SALES_REJECTION_REASON_CODES));
    if (!allowed.has(input.rejectionReasonCode as (typeof SALES_REJECTION_REASON_CODES)[keyof typeof SALES_REJECTION_REASON_CODES])) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.REJECTION_REASON_REQUIRED,
        SALES_USER_MESSAGES.REJECTION_REASON_REQUIRED,
        400,
        { field: "rejectionReasonCode", entity: "inspection" }
      );
    }
  }
}

export function assertEvidencePresent(input: {
  required: boolean;
  evidenceNote?: string | null;
  evidenceRef?: string | null;
}): void {
  if (!input.required) {
    return;
  }
  if (!input.evidenceNote?.trim() && !input.evidenceRef?.trim()) {
    throw new SalesOrderError(
      SALES_ERROR_CODES.EVIDENCE_REQUIRED,
      SALES_USER_MESSAGES.EVIDENCE_REQUIRED,
      400,
      { field: "evidenceNote", entity: "evidence" }
    );
  }
}

export function deliveryEventStatusLabel(status: string): string {
  switch (status) {
    case SALES_DELIVERY_EVENT_STATUS_CODES.RECORDED:
      return "Arrived — waiting for inspection";
    case SALES_DELIVERY_EVENT_STATUS_CODES.INSPECTED:
      return "Inspected";
    case SALES_DELIVERY_EVENT_STATUS_CODES.SERVICE_IN_PROGRESS:
      return "Service in progress";
    case SALES_DELIVERY_EVENT_STATUS_CODES.SERVICE_COMPLETED:
      return "Service completed";
    default:
      return status;
  }
}

export function rollupLineFulfilmentOutcome(input: {
  businessId: string;
  orderId: string;
  orderLineId: string;
  lineType: string;
  events: Array<{
    id: string;
    eventType: string;
    status: string;
    claimedQuantity: number;
    evidenceNote: string | null;
    evidenceRef: string | null;
  }>;
  inspections: Array<{
    deliveryEventId: string;
    acceptedQuantity: number;
    rejectedQuantity: number;
    evidenceNote: string | null;
    evidenceRef: string | null;
  }>;
  policy: SalesDeliveryPolicy;
}) {
  const inspectionByEvent = new Map(
    input.inspections.map((row) => [row.deliveryEventId, row])
  );
  let accepted = 0;
  let rejected = 0;
  let pendingInspection = false;
  let evidenceMissing = false;
  const hasActivity = input.events.length > 0;

  for (const event of input.events) {
    const inspection = inspectionByEvent.get(event.id);
    if (event.eventType === SALES_DELIVERY_EVENT_TYPES.PHYSICAL) {
      if (!inspection) {
        pendingInspection = true;
      } else {
        accepted = roundQuantity(accepted + inspection.acceptedQuantity);
        rejected = roundQuantity(rejected + inspection.rejectedQuantity);
      }
    } else if (event.eventType === SALES_DELIVERY_EVENT_TYPES.SERVICE) {
      if (event.status === SALES_DELIVERY_EVENT_STATUS_CODES.SERVICE_COMPLETED) {
        accepted = roundQuantity(accepted + event.claimedQuantity);
        if (
          input.policy.serviceEvidenceRequired &&
          !event.evidenceNote?.trim() &&
          !event.evidenceRef?.trim()
        ) {
          evidenceMissing = true;
        }
      }
    }
  }

  const physicalEvents = input.events.filter(
    (event) => event.eventType === SALES_DELIVERY_EVENT_TYPES.PHYSICAL
  );
  const serviceEvents = input.events.filter(
    (event) => event.eventType === SALES_DELIVERY_EVENT_TYPES.SERVICE
  );

  let inspectionStatus: string = SALES_INSPECTION_STATUS_CODES.NOT_REQUIRED;
  if (isPhysicalLine(input.lineType) && input.policy.inspectionRequiredForPhysical) {
    if (physicalEvents.length === 0) {
      inspectionStatus = SALES_INSPECTION_STATUS_CODES.NOT_REQUIRED;
    } else if (pendingInspection) {
      inspectionStatus = SALES_INSPECTION_STATUS_CODES.PENDING;
    } else {
      inspectionStatus = SALES_INSPECTION_STATUS_CODES.PASSED;
    }
  }

  let serviceCompletionStatus: string = SALES_SERVICE_COMPLETION_STATUS_CODES.NOT_REQUIRED;
  if (isServiceLine(input.lineType)) {
    const completed = serviceEvents.some(
      (event) => event.status === SALES_DELIVERY_EVENT_STATUS_CODES.SERVICE_COMPLETED
    );
    if (completed) {
      serviceCompletionStatus = SALES_SERVICE_COMPLETION_STATUS_CODES.COMPLETE;
    } else if (serviceEvents.length > 0) {
      serviceCompletionStatus = SALES_SERVICE_COMPLETION_STATUS_CODES.PENDING;
    } else {
      serviceCompletionStatus = SALES_SERVICE_COMPLETION_STATUS_CODES.PENDING;
    }
  }

  return {
    businessId: input.businessId,
    orderId: input.orderId,
    orderLineId: input.orderLineId,
    acceptedQuantity: accepted,
    rejectedQuantity: rejected,
    inspectionStatus,
    serviceCompletionStatus,
    hasActivity,
    mandatoryEvidenceMissing: evidenceMissing,
  };
}
