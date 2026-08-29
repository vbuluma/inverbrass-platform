"use client";

/**
 * Purpose:
 * Batch history derived from posted inventory movements.
 *
 * Implementation Package:
 * BP-008 / IP-07 – Batch, Expiry & Serial Resource Tracking
 */

import { PageBackLink } from "@/components/platform/page-back-link";
import type { InventoryLotView, InventoryTraceEventView } from "@/modules/inventory/types";

type LotTraceDetailProps = {
  lot: InventoryLotView;
  history: InventoryTraceEventView[];
};

export function LotTraceDetail({ lot, history }: LotTraceDetailProps) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/inventory/traceability" label="Traceability" />
      <div>
        <h1 className="text-2xl font-semibold">{lot.lotCode}</h1>
        <p className="text-sm text-muted-foreground">
          {lot.sku} · {lot.locationName ?? "No current location"} · Qty {lot.quantity}
        </p>
        <p className="text-sm text-muted-foreground">
          Expiry {lot.expiresOn ?? "not recorded"} · {lot.expiryStatus}
        </p>
      </div>
      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-base font-semibold">History</h2>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No movements recorded for this batch.</p>
        ) : (
          <ol className="mt-3 space-y-2 text-sm">
            {history.map((event, index) => (
              <li key={`${event.sourceId}:${index}`} className="rounded-md border px-3 py-2">
                <p className="font-medium">
                  {event.movementType} · {event.direction} {event.quantity}
                </p>
                <p className="text-muted-foreground">
                  {event.locationName} · {new Date(event.occurredAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
