"use client";

/**
 * Purpose:
 * Record arrival, inspect goods, and complete sold services on a confirmed sale.
 *
 * Implementation Package:
 * BP-006 / IP-03 – Delivery, Inspection & Service Completion
 */

import { useState } from "react";

import { PlatformProcessingButton } from "@/components/platform";
import {
  completeServiceDeliveryAction,
  inspectDeliveryAction,
  recordPhysicalDeliveryAction,
  startServiceDeliveryAction,
} from "@/modules/sales/actions/sales-order-actions";
import {
  SALES_DELIVERY_EVENT_STATUS_CODES,
  SALES_ORDER_LINE_TYPES,
  SALES_QUALITY_FINDING_CODES,
  SALES_REJECTION_REASON_CODES,
  SALES_REJECTION_REASON_LABELS,
} from "@/modules/sales/constants";
import { canCheckerApprove } from "@/modules/sales/services/handoff-rules";
import type {
  SalesDeliveryEventView,
  SalesOrderDetailView,
  SalesOrderLineView,
} from "@/modules/sales/types";

type SalesDeliveryPanelProps = {
  order: SalesOrderDetailView;
  isPending: boolean;
  viewerUserId?: string | null;
  onRun: (
    action: () => ReturnType<typeof recordPhysicalDeliveryAction>,
    successTitle: string
  ) => void;
};

const REASON_OPTIONS = Object.values(SALES_REJECTION_REASON_CODES);
const FINDING_OPTIONS = Object.values(SALES_QUALITY_FINDING_CODES);

function deliveriesForLine(order: SalesOrderDetailView, lineId: string) {
  return (order.deliveries ?? []).filter((row) => row.orderLineId === lineId);
}

function PhysicalLineDelivery({
  order,
  line,
  events,
  isPending,
  viewerUserId,
  onRun,
}: {
  order: SalesOrderDetailView;
  line: SalesOrderLineView;
  events: SalesDeliveryEventView[];
  isPending: boolean;
  viewerUserId?: string | null;
  onRun: SalesDeliveryPanelProps["onRun"];
}) {
  const [claimed, setClaimed] = useState(line.outstandingQuantity);
  const waiting = events.filter(
    (event) => event.status === SALES_DELIVERY_EVENT_STATUS_CODES.RECORDED
  );

  return (
    <div className="rounded-md border p-3">
      <p className="font-medium">
        {line.description ?? line.offeringName ?? "Goods"}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Ordered {line.orderedQuantity}. Delivered {line.deliveredQuantity}.
        Accepted {line.acceptedQuantity}. Rejected {line.rejectedQuantity}.
        Missing {line.missingQuantity}. Outstanding {line.outstandingQuantity}.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          Quantity arrived
          <input
            className="w-28 rounded-md border px-3 py-2"
            inputMode="decimal"
            value={claimed}
            onChange={(event) => setClaimed(event.target.value)}
          />
        </label>
        <PlatformProcessingButton
          type="button"
          isProcessing={isPending}
          processingLabel="Recording…"
          idleLabel="Record arrival"
          onClick={() =>
            onRun(
              () =>
                recordPhysicalDeliveryAction({
                  orderId: order.id,
                  orderLineId: line.id,
                  claimedQuantity: Number(claimed),
                }),
              "Arrival recorded"
            )
          }
        />
      </div>
      {waiting.map((event) => (
        <InspectForm
          key={event.id}
          orderId={order.id}
          event={event}
          isPending={isPending}
          viewerUserId={viewerUserId}
          onRun={onRun}
        />
      ))}
    </div>
  );
}

function InspectForm({
  orderId,
  event,
  isPending,
  viewerUserId,
  onRun,
}: {
  orderId: string;
  event: SalesDeliveryEventView;
  isPending: boolean;
  viewerUserId?: string | null;
  onRun: SalesDeliveryPanelProps["onRun"];
}) {
  const [accepted, setAccepted] = useState(event.claimedQuantity);
  const [rejected, setRejected] = useState("0");
  const [comments, setComments] = useState("");
  const [reason, setReason] = useState("");
  const [finding, setFinding] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");

  return (
    <div className="mt-3 rounded-md bg-muted/40 p-3">
      <p className="text-sm font-medium">
        Inspect arrival of {event.claimedQuantity} — {event.statusLabel}
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Accepted
          <input
            className="rounded-md border px-3 py-2"
            inputMode="decimal"
            value={accepted}
            onChange={(item) => setAccepted(item.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Rejected
          <input
            className="rounded-md border px-3 py-2"
            inputMode="decimal"
            value={rejected}
            onChange={(item) => setRejected(item.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          Comments
          <textarea
            className="min-h-16 rounded-md border px-3 py-2"
            value={comments}
            onChange={(item) => setComments(item.target.value)}
            placeholder="Required when you accept only part or reject any quantity"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Rejection reason
          <select
            className="rounded-md border px-3 py-2"
            value={reason}
            onChange={(item) => setReason(item.target.value)}
          >
            <option value="">Select a reason if any were rejected</option>
            {REASON_OPTIONS.map((code) => (
              <option key={code} value={code}>
                {SALES_REJECTION_REASON_LABELS[code] ?? code}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Condition
          <select
            className="rounded-md border px-3 py-2"
            value={finding}
            onChange={(item) => setFinding(item.target.value)}
          >
            <option value="">None recorded</option>
            {FINDING_OPTIONS.map((code) => (
              <option key={code} value={code}>
                {SALES_REJECTION_REASON_LABELS[code] ?? code}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          Inspection note
          <input
            className="rounded-md border px-3 py-2"
            value={evidenceNote}
            onChange={(item) => setEvidenceNote(item.target.value)}
            placeholder="Optional proof or inspection note"
          />
        </label>
      </div>
      <div className="mt-3">
        {canCheckerApprove({
          sodRequired: true,
          submittedBy: event.recordedBy,
          viewerUserId,
        }) ? (
          <PlatformProcessingButton
            type="button"
            isProcessing={isPending}
            processingLabel="Inspecting…"
            idleLabel="Inspect"
            onClick={() =>
              onRun(
                () =>
                  inspectDeliveryAction({
                    orderId,
                    deliveryEventId: event.id,
                    acceptedQuantity: Number(accepted),
                    rejectedQuantity: Number(rejected),
                    comments: comments || null,
                    rejectionReasonCode: reason || null,
                    qualityFindingCode: finding || null,
                    evidenceNote: evidenceNote || null,
                  }),
                "Inspection recorded"
              )
            }
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Another authorised person must inspect this arrival.
          </p>
        )}
      </div>
    </div>
  );
}

function ServiceLineDelivery({
  order,
  line,
  events,
  isPending,
  viewerUserId,
  onRun,
}: {
  order: SalesOrderDetailView;
  line: SalesOrderLineView;
  events: SalesDeliveryEventView[];
  isPending: boolean;
  viewerUserId?: string | null;
  onRun: SalesDeliveryPanelProps["onRun"];
}) {
  const [evidenceNote, setEvidenceNote] = useState("");
  const inProgress = events.find(
    (event) => event.status === SALES_DELIVERY_EVENT_STATUS_CODES.SERVICE_IN_PROGRESS
  );
  const completed = events.some(
    (event) => event.status === SALES_DELIVERY_EVENT_STATUS_CODES.SERVICE_COMPLETED
  );

  return (
    <div className="rounded-md border p-3">
      <p className="font-medium">
        {line.description ?? line.offeringName ?? "Service"}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Ordered {line.orderedQuantity}. Remaining to deliver {line.outstandingQuantity}.
      </p>
      {!inProgress && !completed ? (
        <div className="mt-3">
          <PlatformProcessingButton
            type="button"
            isProcessing={isPending}
            processingLabel="Starting…"
            idleLabel="Start service"
            onClick={() =>
              onRun(
                () =>
                  startServiceDeliveryAction({
                    orderId: order.id,
                    orderLineId: line.id,
                  }),
                "Service started"
              )
            }
          />
        </div>
      ) : null}
      {inProgress ? (
        <div className="mt-3 flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-sm">
            Completion note
            <textarea
              className="min-h-16 rounded-md border px-3 py-2"
              value={evidenceNote}
              onChange={(event) => setEvidenceNote(event.target.value)}
              placeholder="Describe the completed work"
            />
          </label>
          {canCheckerApprove({
            sodRequired: true,
            submittedBy: inProgress.recordedBy,
            viewerUserId,
          }) ? (
            <PlatformProcessingButton
              type="button"
              isProcessing={isPending}
              processingLabel="Completing…"
              idleLabel="Complete service"
              onClick={() =>
                onRun(
                  () =>
                    completeServiceDeliveryAction({
                      orderId: order.id,
                      deliveryEventId: inProgress.id,
                      orderLineId: line.id,
                      evidenceNote: evidenceNote || null,
                    }),
                  "Service completed"
                )
              }
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Another authorised person must complete this service.
            </p>
          )}
        </div>
      ) : null}
      {completed ? (
        <p className="mt-2 text-sm text-muted-foreground">Service completed.</p>
      ) : null}
    </div>
  );
}

export function SalesDeliveryPanel({
  order,
  isPending,
  viewerUserId,
  onRun,
}: SalesDeliveryPanelProps) {
  const inspected = (order.deliveries ?? []).filter(
    (event) => event.status !== SALES_DELIVERY_EVENT_STATUS_CODES.RECORDED
  );

  return (
    <section className="flex flex-col gap-4 rounded-lg border p-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Delivery and inspection
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Record what arrived, inspect goods, or complete a sold service. This does
          not collect payment or move stock.
        </p>
      </div>
      {order.lines.map((line) => {
        const events = deliveriesForLine(order, line.id);
        if (line.lineType === SALES_ORDER_LINE_TYPES.PHYSICAL) {
          return (
            <PhysicalLineDelivery
              key={line.id}
              order={order}
              line={line}
              events={events}
              isPending={isPending}
              viewerUserId={viewerUserId}
              onRun={onRun}
            />
          );
        }
        if (line.lineType === SALES_ORDER_LINE_TYPES.SERVICE) {
          return (
            <ServiceLineDelivery
              key={line.id}
              order={order}
              line={line}
              events={events}
              isPending={isPending}
              viewerUserId={viewerUserId}
              onRun={onRun}
            />
          );
        }
        return null;
      })}
      {inspected.length > 0 ? (
        <div>
          <p className="text-sm font-medium">Recorded activity</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {inspected.map((event) => (
              <li key={event.id}>
                {event.statusLabel}: arrived {event.claimedQuantity}, accepted{" "}
                {event.acceptedQuantity}, rejected {event.rejectedQuantity}
                {event.rejectionReasonCode
                  ? ` (${SALES_REJECTION_REASON_LABELS[event.rejectionReasonCode] ?? event.rejectionReasonCode})`
                  : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
