"use client";

/**
 * Purpose:
 * Sales operational workspace — journeys, status views, and next actions.
 *
 * Implementation Package:
 * BP-006 / IP-05 – Downstream Handoff & Sales Workspace
 */

import { useMemo, useState } from "react";
import { CalculatorIcon, FileTextIcon, PlusIcon, ShoppingCartIcon } from "lucide-react";
import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformEmptyState, PlatformKpiCard } from "@/components/platform";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  SALES_ORDER_STATUS_CODES,
  SALES_WORKSPACE_VIEW_CODES,
  type SalesWorkspaceViewCode,
} from "@/modules/sales/constants";
import type { SalesDashboardView, SalesOrderSummaryView } from "@/modules/sales/types";

type SalesDashboardProps = {
  data: SalesDashboardView;
};

const VIEWS: Array<{ id: SalesWorkspaceViewCode; label: string }> = [
  { id: SALES_WORKSPACE_VIEW_CODES.ALL, label: "All sales" },
  { id: SALES_WORKSPACE_VIEW_CODES.OUTSTANDING, label: "Outstanding fulfilment" },
  { id: SALES_WORKSPACE_VIEW_CODES.PARTIAL, label: "Partial fulfilment" },
  { id: SALES_WORKSPACE_VIEW_CODES.INSPECTION_PENDING, label: "Waiting for inspection" },
  { id: SALES_WORKSPACE_VIEW_CODES.SERVICE_REMAINING, label: "Service remaining" },
  { id: SALES_WORKSPACE_VIEW_CODES.CANCELLED, label: "Cancelled" },
  { id: SALES_WORKSPACE_VIEW_CODES.CONVERTED, label: "Converted from quote" },
];

function matchesView(order: SalesOrderSummaryView, view: SalesWorkspaceViewCode): boolean {
  switch (view) {
    case SALES_WORKSPACE_VIEW_CODES.OUTSTANDING:
      return (
        Number(order.outstandingQuantity) > 0 &&
        order.status !== SALES_ORDER_STATUS_CODES.CANCELLED &&
        order.status !== SALES_ORDER_STATUS_CODES.DRAFT &&
        order.status !== SALES_ORDER_STATUS_CODES.SUBMITTED_FOR_CONFIRMATION
      );
    case SALES_WORKSPACE_VIEW_CODES.PARTIAL:
      return order.status === SALES_ORDER_STATUS_CODES.PARTIALLY_FULFILLED;
    case SALES_WORKSPACE_VIEW_CODES.INSPECTION_PENDING:
      return order.inspectionPending;
    case SALES_WORKSPACE_VIEW_CODES.SERVICE_REMAINING:
      return order.serviceRemaining;
    case SALES_WORKSPACE_VIEW_CODES.CANCELLED:
      return order.status === SALES_ORDER_STATUS_CODES.CANCELLED;
    case SALES_WORKSPACE_VIEW_CODES.CONVERTED:
      return order.convertedFromQuote;
    default:
      return true;
  }
}

export function SalesDashboard({ data }: SalesDashboardProps) {
  const [view, setView] = useState<SalesWorkspaceViewCode>(SALES_WORKSPACE_VIEW_CODES.ALL);
  const rows = useMemo(
    () => data.recentOrders.filter((order) => matchesView(order, view)),
    [data.recentOrders, view]
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <PageBackLink href="/dashboard" label="Dashboard" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200">
              <ShoppingCartIcon className="size-5" aria-hidden />
            </span>
            <div>
              <h1 className="text-2xl font-semibold">Sales</h1>
              <p className="text-sm text-muted-foreground">
                Sell, convert a quote, then fulfil and inspect. Payment not yet recorded — collection is not available yet.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/sales/new" className={cn(buttonVariants(), "gap-2")}>
              <PlusIcon className="size-4" aria-hidden />
              Sell
            </Link>
            <Link
              href="/commercial/resolve"
              className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
            >
              <CalculatorIcon className="size-4" aria-hidden />
              Price a sale
            </Link>
            <Link
              href="/sales/convert-quote"
              className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
            >
              <FileTextIcon className="size-4" aria-hidden />
              Convert quote
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <PlatformKpiCard label="Drafts" value={String(data.draftCount)} />
        <PlatformKpiCard label="Waiting for confirmation" value={String(data.submittedCount)} />
        <PlatformKpiCard label="Confirmed" value={String(data.confirmedCount)} />
        <PlatformKpiCard label="In progress" value={String(data.inProgressCount)} />
        <PlatformKpiCard label="Completed" value={String(data.completedCount)} />
        <PlatformKpiCard label="Cancelled" value={String(data.cancelledCount)} />
        <PlatformKpiCard
          label="Outstanding fulfilment"
          value={String(data.outstandingFulfilmentCount)}
        />
        <PlatformKpiCard label="Expected sales value" value={data.expectedSalesValue} />
      </div>

      <div className="flex flex-wrap gap-2">
        {VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn(
              buttonVariants({ variant: view === item.id ? "default" : "outline" }),
              "text-sm"
            )}
            onClick={() => setView(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <PlatformEmptyState
          title="No sales in this view"
          description="Start with Sell, Price a sale, or Convert quote. Empty views mean there is nothing waiting."
          actionLabel="Sell"
          actionHref="/sales/new"
        />
      ) : (
        <section className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Order</th>
                <th className="px-3 py-2 font-medium">Customer</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Next action</th>
                <th className="px-3 py-2 font-medium">Expected total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((order) => (
                <tr key={order.id} className="border-t">
                  <td className="px-3 py-2">
                    <Link href={`/sales/${order.id}`} className="font-medium hover:underline">
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{order.customerName ?? "—"}</td>
                  <td className="px-3 py-2">{order.statusLabel}</td>
                  <td className="px-3 py-2 text-muted-foreground">{order.nextAction}</td>
                  <td className="px-3 py-2">
                    {order.currencyCode} {order.expectedAmount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
