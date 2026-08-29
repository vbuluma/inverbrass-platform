"use client";

/**
 * Purpose:
 * Operational inventory-control dashboard and replenishment advice list.
 *
 * Implementation Package:
 * BP-008 / IP-08 – Reorder & Inventory Controls
 */

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformEmptyState, PlatformKpiCard } from "@/components/platform";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  INVENTORY_CONTROL_STATUS_LABELS,
  type InventoryControlStatus,
} from "@/modules/inventory/constants";
import {
  acknowledgeAdviceAction,
  closeAdviceAction,
  syncReplenishmentAdviceAction,
} from "@/modules/inventory/actions/inventory-control-actions";
import type {
  InventoryControlDashboardView,
  InventoryLocationView,
  StockItemListView,
} from "@/modules/inventory/types";

type InventoryControlWorkspaceProps = {
  data: InventoryControlDashboardView;
  stockItems: StockItemListView[];
  locations: InventoryLocationView[];
  query: {
    stockItemId: string;
    locationId: string;
    status: string;
  };
};

function statusLabel(status: string): string {
  return (
    INVENTORY_CONTROL_STATUS_LABELS[status as InventoryControlStatus] ?? status
  );
}

export function InventoryControlWorkspace({
  data,
  stockItems,
  locations,
  query,
}: InventoryControlWorkspaceProps) {
  const router = useRouter();
  const [stockItemId, setStockItemId] = useState(query.stockItemId);
  const [locationId, setLocationId] = useState(query.locationId);
  const [status, setStatus] = useState(query.status);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function applyFilters() {
    const params = new URLSearchParams();
    if (stockItemId) params.set("item", stockItemId);
    if (locationId) params.set("location", locationId);
    if (status) params.set("status", status);
    startTransition(() => {
      router.push(`/inventory/controls?${params.toString()}`);
    });
  }

  function runSync() {
    setError(null);
    startTransition(async () => {
      const result = await syncReplenishmentAdviceAction();
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      router.refresh();
    });
  }

  function onAcknowledge(adviceId: string) {
    setError(null);
    startTransition(async () => {
      const result = await acknowledgeAdviceAction(adviceId);
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      router.refresh();
    });
  }

  function onClose(adviceId: string) {
    setError(null);
    startTransition(async () => {
      const result = await closeAdviceAction(adviceId);
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/inventory" label="Inventory" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Inventory controls</h1>
          <p className="text-sm text-muted-foreground">
            Review stock levels against configured thresholds and decide what to replenish.
          </p>
        </div>
        <button
          type="button"
          className={cn(buttonVariants(), "h-10")}
          onClick={runSync}
          disabled={isPending}
        >
          {isPending ? "Updating…" : "Refresh recommendations"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PlatformKpiCard label="Positions" value={String(data.totalItems)} />
        <PlatformKpiCard label="Healthy" value={String(data.healthy)} />
        <PlatformKpiCard label="Low stock" value={String(data.lowStock)} />
        <PlatformKpiCard label="Reorder required" value={String(data.reorderRequired)} />
        <PlatformKpiCard label="Out of stock" value={String(data.outOfStock)} />
        <PlatformKpiCard label="Overstock" value={String(data.overstock)} />
        <PlatformKpiCard label="Configuration missing" value={String(data.configurationMissing)} />
      </div>

      <section className="rounded-xl border bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm">
            Item
            <select
              value={stockItemId}
              onChange={(event) => setStockItemId(event.target.value)}
              className="h-10 rounded-md border px-3"
            >
              <option value="">All items</option>
              {stockItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.sku} — {item.productName}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Location
            <select
              value={locationId}
              onChange={(event) => setLocationId(event.target.value)}
              className="h-10 rounded-md border px-3"
            >
              <option value="">All locations</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-10 rounded-md border px-3"
            >
              <option value="">All statuses</option>
              {Object.entries(INVENTORY_CONTROL_STATUS_LABELS).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="button"
              className={cn(buttonVariants({ variant: "outline" }), "h-10 w-full")}
              onClick={applyFilters}
              disabled={isPending}
            >
              Apply filters
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Stock positions</h2>
        {data.rows.length === 0 ? (
          <PlatformEmptyState
            title="No stock positions"
            description="Enable stock items at locations and set control levels to see replenishment status."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Location</th>
                  <th className="px-3 py-2 text-right">Available</th>
                  <th className="px-3 py-2 text-right">Reorder level</th>
                  <th className="px-3 py-2 text-right">Minimum</th>
                  <th className="px-3 py-2 text-right">Maximum</th>
                  <th className="px-3 py-2 text-right">Recommended</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Tracking</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.rows.map((row) => (
                  <tr key={`${row.stockItemId}-${row.locationId}`}>
                    <td className="px-3 py-2">
                      <Link
                        href={`/inventory/controls/${row.stockItemId}`}
                        className="font-medium hover:underline"
                      >
                        {row.sku}
                      </Link>
                      <p className="text-xs text-muted-foreground">{row.productName}</p>
                    </td>
                    <td className="px-3 py-2">{row.locationName}</td>
                    <td className="px-3 py-2 text-right">{row.saleableAvailable}</td>
                    <td className="px-3 py-2 text-right">{row.reorderLevel ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{row.minimumStock ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{row.maximumStock ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{row.recommendedQuantity}</td>
                    <td className="px-3 py-2">{statusLabel(row.status)}</td>
                    <td className="px-3 py-2">{row.trackingMode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Open recommendations</h2>
        {data.openAdvice.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open replenishment recommendations.</p>
        ) : (
          <ul className="divide-y rounded-xl border bg-white">
            {data.openAdvice.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium">{row.adviceNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    Recommend {row.recommendedQuantity} · Available {row.saleableAvailable} ·{" "}
                    {row.status === "ACKNOWLEDGED" ? "Acknowledged" : "Open"}
                  </p>
                </div>
                <div className="flex gap-2">
                  {row.status === "OPEN" ? (
                    <button
                      type="button"
                      className={cn(buttonVariants({ variant: "outline" }), "h-9")}
                      onClick={() => onAcknowledge(row.id)}
                      disabled={isPending}
                    >
                      Acknowledge
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={cn(buttonVariants({ variant: "outline" }), "h-9")}
                    onClick={() => onClose(row.id)}
                    disabled={isPending}
                  >
                    Close
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
