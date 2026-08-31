"use client";

/**
 * Purpose:
 * Inventory hub workspace — stock position, primary operations, and nested capabilities.
 *
 * Implementation Package:
 * BP-008 / IP-01 – Inventory Foundation & Stock Item Master
 * NAV-001 hub landing (IPs remain nested under Inventory).
 */

import { WarehouseIcon } from "lucide-react";
import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import {
  PlatformEmptyState,
  PlatformHubSections,
  PlatformKpiCard,
} from "@/components/platform";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
              Hold, move, and control stock across locations.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PlatformKpiCard label="Stock items" value={String(data.stockItemCount)} />
        <PlatformKpiCard label="Locations" value={String(data.locationCount)} />
        <PlatformKpiCard label="On Hand" value={stockTotals?.onHand ?? "—"} />
        <PlatformKpiCard label="Available" value={stockTotals?.available ?? "—"} />
        <PlatformKpiCard label="Reserved" value={stockTotals?.reserved ?? "—"} />
        <PlatformKpiCard
          label="In Transit"
          value={transferSummary?.inTransitQuantity ?? "0"}
        />
        <PlatformKpiCard label="Low stock" value={String(data.lowStockCount)} />
        <PlatformKpiCard label="Open Transfers" value={String(transferSummary?.openTransferCount ?? 0)} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/inventory/receive" className={cn(buttonVariants(), "h-10")}>
          Receive stock
        </Link>
        <Link
          href="/inventory/transfers"
          className={cn(buttonVariants({ variant: "outline" }), "h-10")}
        >
          Transfer stock
        </Link>
        <Link
          href="/inventory/adjustments"
          className={cn(buttonVariants({ variant: "outline" }), "h-10")}
        >
          Adjust stock
        </Link>
        <Link
          href="/inventory/stocktakes"
          className={cn(buttonVariants({ variant: "outline" }), "h-10")}
        >
          Stocktake
        </Link>
      </div>

      <PlatformHubSections
        sections={[
          {
            title: "Stock",
            links: [
              {
                href: "/inventory/locations",
                label: "Locations",
                description: "Stores and warehouses where stock is held.",
              },
              {
                href: "/inventory/items/new",
                label: "Add stock item",
                description: "Track a catalogue offering as stock.",
              },
              {
                href: "/inventory/availability",
                label: "Availability",
                description: "On hand, reserved, and available quantities.",
              },
              {
                href: "/inventory/opening-balances",
                label: "Opening balances",
                description: "Record opening stock for a location.",
              },
            ],
          },
          {
            title: "Operations",
            links: [
              {
                href: "/inventory/receive",
                label: "Receiving",
                description: "Receive stock into a location.",
              },
              {
                href: "/inventory/transfers",
                label: "Transfers",
                description: "Move stock between locations.",
              },
              {
                href: "/inventory/reservations",
                label: "Reservations",
                description: "Hold stock for confirmed sales.",
              },
              {
                href: "/inventory/adjustments",
                label: "Adjustments",
                description: "Damage, loss, and returns.",
              },
              {
                href: "/inventory/stocktakes",
                label: "Stocktakes",
                description: "Count, variance, and reconciliation.",
              },
            ],
          },
          {
            title: "Controls",
            links: [
              {
                href: "/inventory/traceability",
                label: "Traceability",
                description: "Batch, expiry, and serial tracking.",
              },
              {
                href: "/inventory/controls",
                label: "Inventory controls",
                description: "Reorder signals and control settings.",
              },
              {
                href: "/inventory/exceptions",
                label: "Exceptions",
                description: "Operational issues that need attention.",
              },
            ],
          },
        ]}
      />

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Stock items</h2>
        {data.recentStockItems.length === 0 ? (
          <PlatformEmptyState
            title="No stock items yet"
            description="Add a product from the catalogue as a stock item to get started."
            actionLabel="Add stock item"
            actionHref="/inventory/items/new"
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
