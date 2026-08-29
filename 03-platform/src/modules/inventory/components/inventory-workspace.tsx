"use client";

/**
 * Purpose:
 * Inventory foundation workspace — stock items, locations, and opening stock.
 *
 * Implementation Package:
 * BP-008 / IP-01 – Inventory Foundation & Stock Item Master
 */

import { useState, useTransition } from "react";
import { WarehouseIcon } from "lucide-react";
import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformEmptyState, PlatformKpiCard } from "@/components/platform";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createLocationAction } from "@/modules/inventory/actions/inventory-actions";
import type { InventoryDashboardView, InventoryTransferSummary } from "@/modules/inventory/types";

type InventoryStockTotals = {
  onHand: string;
  available: string;
  reserved: string;
};

type InventoryWorkspaceProps = {
  data: InventoryDashboardView;
  transferSummary?: InventoryTransferSummary;
  stockTotals?: InventoryStockTotals;
};

export function InventoryWorkspace({
  data,
  transferSummary,
  stockTotals,
}: InventoryWorkspaceProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [locationTypeCode, setLocationTypeCode] = useState(
    data.locationTypes[0]?.code ?? ""
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onCreateLocation() {
    setError(null);
    startTransition(async () => {
      const result = await createLocationAction({
        code,
        name,
        locationTypeCode,
      });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      window.location.assign("/inventory");
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <PageBackLink href="/dashboard" label="Dashboard" />
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-lg bg-amber-50 text-amber-800 ring-1 ring-amber-200">
            <WarehouseIcon className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-semibold">Inventory</h1>
            <p className="text-sm text-muted-foreground">
              Set up what you stock, where it is held, and opening quantities.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PlatformKpiCard label="Stock items" value={String(data.stockItemCount)} />
        <PlatformKpiCard label="Locations" value={String(data.locationCount)} />
        <PlatformKpiCard label="Low stock" value={String(data.lowStockCount)} />
        <PlatformKpiCard label="Out of stock" value={String(data.outOfStockCount)} />
        {stockTotals ? (
          <>
            <PlatformKpiCard label="Total Stock" value={stockTotals.onHand} />
            <PlatformKpiCard label="Available" value={stockTotals.available} />
            <PlatformKpiCard label="Reserved" value={stockTotals.reserved} />
          </>
        ) : null}
        {transferSummary ? (
          <>
            <PlatformKpiCard label="In Transit" value={transferSummary.inTransitQuantity} />
            <PlatformKpiCard label="Open Transfers" value={String(transferSummary.openTransferCount)} />
          </>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/inventory/items/new" className={cn(buttonVariants(), "h-10")}>
          Add stock item
        </Link>
        <Link
          href="/inventory/locations"
          className={cn(buttonVariants({ variant: "outline" }), "h-10")}
        >
          Manage locations
        </Link>
        <Link
          href="/inventory/receive"
          className={cn(buttonVariants({ variant: "outline" }), "h-10")}
        >
          Receive stock
        </Link>
        <Link
          href="/inventory/opening-balances"
          className={cn(buttonVariants({ variant: "outline" }), "h-10")}
        >
          Opening balances
        </Link>
        <Link
          href="/inventory/availability"
          className={cn(buttonVariants({ variant: "outline" }), "h-10")}
        >
          Availability
        </Link>
        <Link
          href="/inventory/reservations"
          className={cn(buttonVariants({ variant: "outline" }), "h-10")}
        >
          Reservations
        </Link>
        <Link
          href="/inventory/adjustments"
          className={cn(buttonVariants({ variant: "outline" }), "h-10")}
        >
          Adjustments
        </Link>
        <Link
          href="/inventory/stocktakes"
          className={cn(buttonVariants({ variant: "outline" }), "h-10")}
        >
          Stocktakes
        </Link>
        <Link
          href="/inventory/traceability"
          className={cn(buttonVariants({ variant: "outline" }), "h-10")}
        >
          Traceability
        </Link>
        <Link
          href="/inventory/controls"
          className={cn(buttonVariants({ variant: "outline" }), "h-10")}
        >
          Inventory controls
        </Link>
        <Link
          href="/inventory/exceptions"
          className={cn(buttonVariants({ variant: "outline" }), "h-10")}
        >
          Exceptions
        </Link>
        <Link
          href="/inventory/transfers"
          className={cn(buttonVariants({ variant: "outline" }), "h-10")}
        >
          Transfers
        </Link>
      </div>

      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-base font-semibold">Add a location</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Locations are stores or warehouses where stock is held.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            Code
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="h-10 rounded-md border px-3"
              placeholder="MAIN"
              autoComplete="off"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-10 rounded-md border px-3"
              placeholder="Main store"
              autoComplete="off"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Type
            <select
              value={locationTypeCode}
              onChange={(event) => setLocationTypeCode(event.target.value)}
              className="h-10 rounded-md border px-3"
            >
              {data.locationTypes.map((row) => (
                <option key={row.code} value={row.code}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          className={cn(buttonVariants(), "mt-4 h-10")}
          onClick={onCreateLocation}
          disabled={isPending || !code.trim() || !name.trim()}
        >
          {isPending ? "Saving…" : "Save location"}
        </button>
        {error ? (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Stock items</h2>
        {data.recentStockItems.length === 0 ? (
          <PlatformEmptyState
            title="No stock items yet"
            description="Add a product from the catalogue as a stock item to get started."
          />
        ) : (
          <ul className="divide-y rounded-xl border bg-white">
            <li className="hidden grid-cols-5 gap-2 px-4 py-2 text-xs font-medium text-muted-foreground sm:grid">
              <span>SKU</span>
              <span>Product</span>
              <span>Unit</span>
              <span>Tracking</span>
              <span>Status</span>
            </li>
            {data.recentStockItems.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/inventory/items/${row.id}`}
                  className="grid gap-1 px-4 py-3 hover:bg-slate-50 sm:grid-cols-5 sm:items-center"
                >
                  <p className="font-medium">{row.sku}</p>
                  <p className="text-sm">{row.productName}</p>
                  <p className="text-sm text-muted-foreground">{row.baseUomCode || "—"}</p>
                  <p className="text-sm">{row.stockTrackingEnabled ? "Yes" : "No"}</p>
                  <p className="text-sm text-muted-foreground">
                    {row.isActive ? "Active" : "Inactive"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
