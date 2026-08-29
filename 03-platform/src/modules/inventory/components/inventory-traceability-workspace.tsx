"use client";

/**
 * Purpose:
 * Search and list batch and serial positions derived from the stock ledger.
 *
 * Implementation Package:
 * BP-008 / IP-07 – Batch, Expiry & Serial Resource Tracking
 */

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformEmptyState } from "@/components/platform";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  InventoryLocationView,
  InventoryLotView,
  InventoryTrackedUnitView,
  StockItemListView,
} from "@/modules/inventory/types";

type InventoryTraceabilityWorkspaceProps = {
  lots: InventoryLotView[];
  units: InventoryTrackedUnitView[];
  stockItems: StockItemListView[];
  locations: InventoryLocationView[];
  query: {
    stockItemId: string;
    lotCode: string;
    unitCode: string;
    locationId: string;
    expiryStatus: string;
  };
};

function expiryLabel(status: string): string {
  if (status === "EXPIRED") {
    return "Expired";
  }
  if (status === "EXPIRING_SOON") {
    return "Expiring soon";
  }
  return "Not expired";
}

export function InventoryTraceabilityWorkspace({
  lots,
  units,
  stockItems,
  locations,
  query,
}: InventoryTraceabilityWorkspaceProps) {
  const router = useRouter();
  const [stockItemId, setStockItemId] = useState(query.stockItemId);
  const [lotCode, setLotCode] = useState(query.lotCode);
  const [unitCode, setUnitCode] = useState(query.unitCode);
  const [locationId, setLocationId] = useState(query.locationId);
  const [expiryStatus, setExpiryStatus] = useState(query.expiryStatus);
  const [isPending, startTransition] = useTransition();

  function onSearch() {
    const params = new URLSearchParams();
    if (stockItemId) params.set("item", stockItemId);
    if (lotCode.trim()) params.set("lot", lotCode.trim());
    if (unitCode.trim()) params.set("serial", unitCode.trim());
    if (locationId) params.set("location", locationId);
    if (expiryStatus) params.set("expiry", expiryStatus);
    startTransition(() => {
      router.push(`/inventory/traceability?${params.toString()}`);
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/inventory" label="Inventory" />
      <div>
        <h1 className="text-2xl font-semibold">Traceability</h1>
        <p className="text-sm text-muted-foreground">
          Look up batches and serials from recorded stock movements.
        </p>
      </div>

      <section className="rounded-xl border bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            Item
            <select
              value={stockItemId}
              onChange={(event) => setStockItemId(event.target.value)}
              className="h-10 rounded-md border px-3"
            >
              <option value="">All items</option>
              {stockItems.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.sku} · {row.productName}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Batch
            <input
              value={lotCode}
              onChange={(event) => setLotCode(event.target.value)}
              className="h-10 rounded-md border px-3"
              autoComplete="off"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Serial
            <input
              value={unitCode}
              onChange={(event) => setUnitCode(event.target.value)}
              className="h-10 rounded-md border px-3"
              autoComplete="off"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Location
            <select
              value={locationId}
              onChange={(event) => setLocationId(event.target.value)}
              className="h-10 rounded-md border px-3"
            >
              <option value="">All locations</option>
              {locations.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Expiry
            <select
              value={expiryStatus}
              onChange={(event) => setExpiryStatus(event.target.value)}
              className="h-10 rounded-md border px-3"
            >
              <option value="">Any</option>
              <option value="NOT_EXPIRED">Not expired</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </label>
        </div>
        <button
          type="button"
          className={cn(buttonVariants(), "mt-4 h-10")}
          disabled={isPending}
          onClick={onSearch}
        >
          Search
        </button>
      </section>

      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-base font-semibold">Batches</h2>
        {lots.length === 0 ? (
          <PlatformEmptyState title="No batches" description="No batch records match this search." />
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Batch</th>
                  <th className="py-2 pr-3 font-medium">Item</th>
                  <th className="py-2 pr-3 font-medium">Location</th>
                  <th className="py-2 pr-3 text-right font-medium">Quantity</th>
                  <th className="py-2 pr-3 font-medium">Expiry</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {lots.map((row) => (
                  <tr key={`${row.id}:${row.locationId ?? ""}`} className="border-b last:border-0">
                    <td className="py-2 pr-3">
                      <Link href={`/inventory/traceability/batches/${row.id}`} className="underline">
                        {row.lotCode}
                      </Link>
                    </td>
                    <td className="py-2 pr-3">{row.sku}</td>
                    <td className="py-2 pr-3">{row.locationName ?? "—"}</td>
                    <td className="py-2 pr-3 text-right">{row.quantity}</td>
                    <td className="py-2 pr-3">
                      {row.expiresOn ?? "—"}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {expiryLabel(row.expiryStatus)}
                      </span>
                    </td>
                    <td className="py-2">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-base font-semibold">Serials</h2>
        {units.length === 0 ? (
          <PlatformEmptyState title="No serials" description="No serial records match this search." />
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Serial</th>
                  <th className="py-2 pr-3 font-medium">Item</th>
                  <th className="py-2 pr-3 font-medium">Location</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 font-medium">Expiry</th>
                </tr>
              </thead>
              <tbody>
                {units.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="py-2 pr-3">
                      <Link href={`/inventory/traceability/serials/${row.id}`} className="underline">
                        {row.unitCode}
                      </Link>
                    </td>
                    <td className="py-2 pr-3">{row.sku}</td>
                    <td className="py-2 pr-3">{row.locationName ?? "—"}</td>
                    <td className="py-2 pr-3">{row.status}</td>
                    <td className="py-2">
                      {row.expiresOn ?? "—"}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {expiryLabel(row.expiryStatus)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
