"use client";

/**
 * Purpose:
 * Operational list of stock reservations.
 *
 * Implementation Package:
 * BP-008 / IP-03 – Stock Reservation & Sales Deduction
 */

import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformEmptyState } from "@/components/platform";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { InventoryReservationView } from "@/modules/inventory/types";

type ReservationListProps = {
  reservations: InventoryReservationView[];
};

function statusLabel(status: string): string {
  if (status === "PARTIALLY_FULFILLED") {
    return "Partially fulfilled";
  }
  if (status === "FULFILLED") {
    return "Fulfilled";
  }
  if (status === "RELEASED") {
    return "Reservation released";
  }
  if (status === "REQUESTED") {
    return "Pending approval";
  }
  if (status === "RESERVED") {
    return "Reserved";
  }
  if (status === "REJECTED") {
    return "Rejected";
  }
  if (status === "EXPIRED") {
    return "Expired";
  }
  return status;
}

export function ReservationList({ reservations }: ReservationListProps) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/inventory" label="Inventory" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Reservations</h1>
          <p className="text-sm text-muted-foreground">
            Hold available stock for a sale. Stock is deducted only when fulfilled.
          </p>
        </div>
        <Link href="/inventory/reservations/new" className={cn(buttonVariants(), "h-10")}>
          New reservation
        </Link>
      </div>
      {reservations.length === 0 ? (
        <PlatformEmptyState
          title="No reservations yet"
          description="Create a reservation to hold available stock for a sale."
        />
      ) : (
        <ul className="divide-y rounded-xl border bg-white">
          {reservations.map((row) => (
            <li key={row.id}>
              <Link
                href={`/inventory/reservations/${row.id}`}
                className="grid gap-1 px-4 py-3 hover:bg-slate-50 sm:grid-cols-5 sm:items-center"
              >
                <p className="font-medium">{row.documentNumber}</p>
                <p className="text-sm">{row.salesOrderNumber ?? "No sale"}</p>
                <p className="text-sm">{row.sku}</p>
                <p className="text-sm">{statusLabel(row.status)}</p>
                <p className="text-sm text-muted-foreground">
                  Remaining {row.remainingQuantity} {row.baseUomCode || row.uomCode}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
