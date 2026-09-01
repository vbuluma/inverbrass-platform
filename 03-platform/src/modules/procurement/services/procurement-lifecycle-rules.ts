/**
 * Purpose:
 * Build BP-009 lifecycle chains for IP-12 navigation views.
 */

import { EXCEPTION_OBJECT_TYPES, LIFECYCLE_ANCHOR_TYPES } from "@/modules/procurement/constants";
import { buildExceptionLinkHref } from "@/modules/procurement/services/exception-rules";
import type { ProcurementLifecycleNodeView } from "@/modules/procurement/types";

export type LifecycleSnapshot = {
  purchaseRequest?: {
    id: string;
    number: string;
    status: string;
    submittedAt: string | null;
    approvedAt: string | null;
  } | null;
  sourcingEvent?: {
    id: string;
    number: string;
    status: string;
    createdAt: string | null;
    closedAt: string | null;
  } | null;
  award?: {
    id: string;
    status: string;
    createdAt: string | null;
  } | null;
  contract?: {
    id: string;
    number: string;
    status: string;
    activatedAt: string | null;
  } | null;
  purchaseOrder?: {
    id: string;
    number: string;
    status: string;
    issuedAt: string | null;
    acceptedAt: string | null;
  } | null;
  receipt?: {
    id: string;
    number: string;
    status: string;
    confirmedAt: string | null;
  } | null;
  invoice?: {
    id: string;
    number: string;
    status: string;
    matchedAt: string | null;
    paymentReadyAt: string | null;
  } | null;
};

function node(
  anchorType: string,
  id: string,
  label: string,
  status: string,
  timestamp: string | null
): ProcurementLifecycleNodeView {
  const href =
    anchorType === EXCEPTION_OBJECT_TYPES.PURCHASE_REQUEST
      ? buildExceptionLinkHref(EXCEPTION_OBJECT_TYPES.PURCHASE_REQUEST, id)
      : anchorType === LIFECYCLE_ANCHOR_TYPES.SOURCING_EVENT
        ? `/procurement/sourcing/${id}`
        : anchorType === LIFECYCLE_ANCHOR_TYPES.PURCHASE_ORDER
          ? `/procurement/orders/${id}`
          : anchorType === LIFECYCLE_ANCHOR_TYPES.CONTRACT
            ? `/procurement/contracts/${id}`
            : anchorType === LIFECYCLE_ANCHOR_TYPES.RECEIPT
              ? `/procurement/receiving/${id}`
              : anchorType === LIFECYCLE_ANCHOR_TYPES.INVOICE
                ? `/procurement/invoices/${id}`
                : `/procurement/requests/${id}`;
  return { id, anchorType, label, status, href, timestamp };
}

export function buildLifecycleNodes(snapshot: LifecycleSnapshot): ProcurementLifecycleNodeView[] {
  const rows: ProcurementLifecycleNodeView[] = [];
  if (snapshot.purchaseRequest) {
    rows.push(
      node(
        LIFECYCLE_ANCHOR_TYPES.PURCHASE_REQUEST,
        snapshot.purchaseRequest.id,
        `Request ${snapshot.purchaseRequest.number}`,
        snapshot.purchaseRequest.status,
        snapshot.purchaseRequest.approvedAt ?? snapshot.purchaseRequest.submittedAt
      )
    );
  }
  if (snapshot.sourcingEvent) {
    rows.push(
      node(
        LIFECYCLE_ANCHOR_TYPES.SOURCING_EVENT,
        snapshot.sourcingEvent.id,
        `RFX ${snapshot.sourcingEvent.number}`,
        snapshot.sourcingEvent.status,
        snapshot.sourcingEvent.closedAt ?? snapshot.sourcingEvent.createdAt
      )
    );
  }
  if (snapshot.award) {
    rows.push(
      node(
        LIFECYCLE_ANCHOR_TYPES.SOURCING_EVENT,
        snapshot.award.id,
        "Award",
        snapshot.award.status,
        snapshot.award.createdAt
      )
    );
  }
  if (snapshot.contract) {
    rows.push(
      node(
        LIFECYCLE_ANCHOR_TYPES.CONTRACT,
        snapshot.contract.id,
        `Contract ${snapshot.contract.number}`,
        snapshot.contract.status,
        snapshot.contract.activatedAt
      )
    );
  }
  if (snapshot.purchaseOrder) {
    rows.push(
      node(
        LIFECYCLE_ANCHOR_TYPES.PURCHASE_ORDER,
        snapshot.purchaseOrder.id,
        `PO ${snapshot.purchaseOrder.number}`,
        snapshot.purchaseOrder.status,
        snapshot.purchaseOrder.issuedAt ?? snapshot.purchaseOrder.acceptedAt
      )
    );
  }
  if (snapshot.receipt) {
    rows.push(
      node(
        LIFECYCLE_ANCHOR_TYPES.RECEIPT,
        snapshot.receipt.id,
        `Receipt ${snapshot.receipt.number}`,
        snapshot.receipt.status,
        snapshot.receipt.confirmedAt
      )
    );
  }
  if (snapshot.invoice) {
    rows.push(
      node(
        LIFECYCLE_ANCHOR_TYPES.INVOICE,
        snapshot.invoice.id,
        `Invoice ${snapshot.invoice.number}`,
        snapshot.invoice.status,
        snapshot.invoice.paymentReadyAt ?? snapshot.invoice.matchedAt
      )
    );
  }
  return rows;
}
