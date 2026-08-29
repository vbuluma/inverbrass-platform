"use client";

/**
 * Purpose:
 * Inventory exception investigation and resolution workspace.
 *
 * Implementation Package:
 * BP-008 / IP-09 – Inventory Operations, Exceptions & Controls
 */

import { useState, useTransition } from "react";
import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  INVENTORY_OPS_INCIDENT_STATUS_LABELS,
  INVENTORY_OPS_RESOLUTION_ACTION_LABELS,
  INVENTORY_OPS_RESOLUTION_ACTIONS,
  INVENTORY_OPS_SEVERITY_LABELS,
  type InventoryOpsIncidentStatus,
} from "@/modules/inventory/constants";
import {
  approveExceptionResolutionAction,
  closeInventoryExceptionAction,
  rejectExceptionResolutionAction,
  rejectInventoryExceptionAction,
  requestExceptionResolutionAction,
  startExceptionInvestigationAction,
} from "@/modules/inventory/actions/inventory-ops-incident-actions";
import type { InventoryOpsIncidentView } from "@/modules/inventory/types";

type InventoryExceptionDetailProps = {
  exception: InventoryOpsIncidentView;
};

function statusLabel(status: string): string {
  return (
    INVENTORY_OPS_INCIDENT_STATUS_LABELS[status as InventoryOpsIncidentStatus] ?? status
  );
}

function severityLabel(severity: string): string {
  return (
    INVENTORY_OPS_SEVERITY_LABELS[
      severity as keyof typeof INVENTORY_OPS_SEVERITY_LABELS
    ] ?? severity
  );
}

export function InventoryExceptionDetail({ exception }: InventoryExceptionDetailProps) {
  const [detail, setDetail] = useState(exception);
  const [resolutionAction, setResolutionAction] = useState<string>(
    INVENTORY_OPS_RESOLUTION_ACTIONS.MANUAL_REVIEW_COMPLETED
  );
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function apply(
    result:
      | { success: true; data: InventoryOpsIncidentView }
      | { success: false; error: { message: string } },
    successMessage: string
  ) {
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setDetail(result.data);
    setError(null);
    setMessage(successMessage);
  }

  const open = detail.status === "OPEN";
  const investigating = detail.status === "INVESTIGATING";
  const pending = detail.status === "APPROVAL_PENDING";
  const canClose = open || investigating;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/inventory/exceptions" label="Exceptions" />
      <div>
        <h1 className="text-2xl font-semibold">{detail.incidentNumber}</h1>
        <p className="text-sm text-muted-foreground">
          Review the problem, record the investigation, and decide what happens next.
        </p>
      </div>

      <section className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2">
        <p>
          <span className="text-xs text-muted-foreground">Type</span>
          <br />
          {detail.incidentTypeLabel}
        </p>
        <p>
          <span className="text-xs text-muted-foreground">Severity</span>
          <br />
          {severityLabel(detail.severity)}
        </p>
        <p>
          <span className="text-xs text-muted-foreground">Status</span>
          <br />
          {statusLabel(detail.status)}
        </p>
        <p>
          <span className="text-xs text-muted-foreground">Detected</span>
          <br />
          {new Date(detail.detectedAt).toLocaleString()}
        </p>
        <p>
          <span className="text-xs text-muted-foreground">Item</span>
          <br />
          {detail.sku || "—"}
        </p>
        <p>
          <span className="text-xs text-muted-foreground">Location</span>
          <br />
          {detail.locationName || "—"}
        </p>
        <p className="sm:col-span-2">
          <span className="text-xs text-muted-foreground">Source operation</span>
          <br />
          {detail.sourceType} · {detail.sourceId}
        </p>
        <p className="sm:col-span-2">
          <span className="text-xs text-muted-foreground">Description</span>
          <br />
          {detail.description}
        </p>
        {detail.resolutionAction ? (
          <p>
            <span className="text-xs text-muted-foreground">Resolution</span>
            <br />
            {INVENTORY_OPS_RESOLUTION_ACTION_LABELS[
              detail.resolutionAction as keyof typeof INVENTORY_OPS_RESOLUTION_ACTION_LABELS
            ] ?? detail.resolutionAction}
          </p>
        ) : null}
        {detail.resolutionReason ? (
          <p>
            <span className="text-xs text-muted-foreground">Reason</span>
            <br />
            {detail.resolutionReason}
          </p>
        ) : null}
        {detail.linkedAdjustmentId ? (
          <p className="sm:col-span-2">
            <span className="text-xs text-muted-foreground">Linked adjustment</span>
            <br />
            <Link
              href={`/inventory/adjustments/${detail.linkedAdjustmentId}`}
              className="text-sm underline"
            >
              Open adjustment
            </Link>
          </p>
        ) : null}
      </section>

      <section className="space-y-3 rounded-xl border bg-white p-4">
        <h2 className="text-base font-semibold">Investigation history</h2>
        {detail.events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No investigation notes yet.</p>
        ) : (
          <ul className="space-y-2">
            {detail.events.map((event) => (
              <li key={event.id} className="text-sm">
                <span className="font-medium">{event.eventType.replaceAll("_", " ")}</span>
                {event.note ? ` — ${event.note}` : ""}
                <span className="block text-xs text-muted-foreground">
                  {new Date(event.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-xl border bg-white p-4">
        <h2 className="text-base font-semibold">Actions</h2>
        <p className="text-sm text-muted-foreground">
          Stock only changes if you create a separate adjustment through the normal stock
          adjustment process.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Resolution
            <select
              value={resolutionAction}
              onChange={(event) => setResolutionAction(event.target.value)}
              className="h-10 rounded-md border px-3"
            >
              {Object.entries(INVENTORY_OPS_RESOLUTION_ACTION_LABELS).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            Reason
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="h-10 rounded-md border px-3"
              placeholder="Why this decision is being made"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            Notes
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-20 rounded-md border px-3 py-2"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {open ? (
            <button
              type="button"
              className={cn(buttonVariants({ variant: "outline" }), "h-10")}
              disabled={isPending}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  apply(
                    await startExceptionInvestigationAction(detail.id),
                    "Investigation started."
                  );
                });
              }}
            >
              Investigate
            </button>
          ) : null}
          {open || investigating ? (
            <button
              type="button"
              className={cn(buttonVariants(), "h-10")}
              disabled={isPending || !reason.trim()}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  apply(
                    await requestExceptionResolutionAction({
                      exceptionId: detail.id,
                      resolutionAction,
                      reason,
                      notes,
                    }),
                    "Resolution recorded."
                  );
                });
              }}
            >
              Resolve
            </button>
          ) : null}
          {pending ? (
            <>
              <button
                type="button"
                className={cn(buttonVariants(), "h-10")}
                disabled={isPending}
                onClick={() => {
                  setError(null);
                  startTransition(async () => {
                    apply(
                      await approveExceptionResolutionAction(detail.id),
                      "Resolution approved."
                    );
                  });
                }}
              >
                Approve
              </button>
              <button
                type="button"
                className={cn(buttonVariants({ variant: "outline" }), "h-10")}
                disabled={isPending || !reason.trim()}
                onClick={() => {
                  setError(null);
                  startTransition(async () => {
                    apply(
                      await rejectExceptionResolutionAction(detail.id, reason),
                      "Resolution rejected. Stock was not changed."
                    );
                  });
                }}
              >
                Reject resolution
              </button>
            </>
          ) : null}
          {open ? (
            <button
              type="button"
              className={cn(buttonVariants({ variant: "outline" }), "h-10")}
              disabled={isPending || !reason.trim()}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  apply(
                    await rejectInventoryExceptionAction(detail.id, reason),
                    "Exception rejected."
                  );
                });
              }}
            >
              Reject
            </button>
          ) : null}
          {canClose ? (
            <button
              type="button"
              className={cn(buttonVariants({ variant: "outline" }), "h-10")}
              disabled={isPending || !reason.trim()}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  apply(await closeInventoryExceptionAction(detail.id, reason), "Exception closed.");
                });
              }}
            >
              Close
            </button>
          ) : null}
        </div>
        {error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      </section>
    </main>
  );
}
