"use client";

/**
 * Purpose:
 * Operational list of stock adjustments, damage, loss, and returns.
 *
 * Implementation Package:
 * BP-008 / IP-05 – Stock Adjustments, Damage, Loss & Returns
 */

import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformEmptyState } from "@/components/platform";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { InventoryAdjustmentView } from "@/modules/inventory/types";

type AdjustmentListProps = {
  adjustments: InventoryAdjustmentView[];
};

function statusLabel(status: string, approvalRequired: boolean): string {
  if (status === "DRAFT") {
    return "Draft";
  }
  if (status === "SUBMITTED") {
    return approvalRequired ? "Pending approval" : "Submitted";
  }
  if (status === "APPROVED") {
    return "Approved";
  }
  if (status === "POSTED") {
    return "Posted";
  }
  if (status === "REJECTED") {
    return "Rejected";
  }
  if (status === "CANCELLED") {
    return "Cancelled";
  }
  return status;
}

export function AdjustmentList({ adjustments }: AdjustmentListProps) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/inventory" label="Inventory" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Adjustments</h1>
          <p className="text-sm text-muted-foreground">
            Record damaged, lost, returned, or corrected stock. Posted changes update the stock ledger.
          </p>
        </div>
        <Link href="/inventory/adjustments/new" className={cn(buttonVariants(), "h-10")}>
          New adjustment
        </Link>
      </div>
      {adjustments.length === 0 ? (
        <PlatformEmptyState
          title="No adjustments yet"
          description="Create an adjustment to record damaged, lost, returned, or corrected stock."
        />
      ) : (
        <ul className="divide-y rounded-xl border bg-white">
          <li className="hidden grid-cols-8 gap-2 px-4 py-2 text-xs font-medium text-muted-foreground sm:grid">
            <span>Adjustment #</span>
            <span>Item</span>
            <span>Location</span>
            <span>Type</span>
            <span>Quantity</span>
            <span>Reason</span>
            <span>Status</span>
            <span>Created</span>
          </li>
          {adjustments.map((row) => (
            <li key={row.id}>
              <Link
                href={`/inventory/adjustments/${row.id}`}
                className="grid gap-1 px-4 py-3 hover:bg-slate-50 sm:grid-cols-8 sm:items-center"
              >
                <p className="font-medium">{row.documentNumber}</p>
                <p className="text-sm">{row.lines[0]?.sku ?? "—"}</p>
                <p className="text-sm">{row.locationName}</p>
                <p className="text-sm">{row.adjustmentTypeLabel}</p>
                <p className="text-sm">
                  {row.totalQuantity} {row.lines[0]?.baseUomCode ?? ""}
                </p>
                <p className="text-sm">{row.reason}</p>
                <p className="text-sm">{statusLabel(row.status, row.approvalRequired)}</p>
                <p className="text-sm text-muted-foreground">
                  {row.createdBy ?? "—"}
                  <br />
                  {new Date(row.createdAt).toLocaleDateString()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
