"use client";

/**
 * Purpose:
 * Operational availability view — on hand, reserved, and available stock.
 *
 * Implementation Package:
 * BP-008 / IP-03 – Stock Reservation & Sales Deduction
 */

import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformEmptyState } from "@/components/platform";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { InventoryAvailabilityView } from "@/modules/inventory/types";

type InventoryAvailabilityListProps = {
  rows: InventoryAvailabilityView[];
};

export function InventoryAvailabilityList({ rows }: InventoryAvailabilityListProps) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/inventory" label="Inventory" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Availability</h1>
          <p className="text-sm text-muted-foreground">
            On-hand stock, reserved quantities, and what is still available to sell.
          </p>
        </div>
        <Link href="/inventory/reservations/new" className={cn(buttonVariants(), "h-10")}>
          New reservation
        </Link>
      </div>
      {rows.length === 0 ? (
        <PlatformEmptyState
          title="No stock balances yet"
          description="Record opening stock or receive goods before checking availability."
        />
      ) : (
        <ul className="divide-y rounded-xl border bg-white">
          <li className="hidden grid-cols-7 gap-2 px-4 py-2 text-xs font-medium text-muted-foreground sm:grid">
            <span>Item</span>
            <span>Location</span>
            <span>On Hand</span>
            <span>Reserved</span>
            <span>Available</span>
            <span>In Transit</span>
            <span>Unit</span>
          </li>
          {rows.map((row) => (
            <li
              key={`${row.stockItemId}:${row.locationId}`}
              className="grid gap-1 px-4 py-3 sm:grid-cols-7 sm:items-center"
            >
              <p className="font-medium">{row.sku}</p>
              <p className="text-sm">{row.locationName}</p>
              <p className="text-sm">{row.onHand}</p>
              <p className="text-sm">{row.reserved}</p>
              <p className="text-sm font-medium">{row.available}</p>
              <p className="text-sm">{row.inTransit ?? "0"}</p>
              <p className="text-sm text-muted-foreground">
                {row.uomCode || "—"} · {row.availabilityLabel}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
