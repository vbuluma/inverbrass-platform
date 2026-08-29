"use client";

/**
 * Purpose:
 * Operational inventory exception queue.
 *
 * Implementation Package:
 * BP-008 / IP-09 – Inventory Operations, Exceptions & Controls
 */

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformEmptyState, PlatformKpiCard } from "@/components/platform";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  INVENTORY_OPS_INCIDENT_STATUS_LABELS,
  INVENTORY_OPS_SEVERITY_LABELS,
  type InventoryOpsIncidentStatus,
} from "@/modules/inventory/constants";
import type {
  InventoryLocationView,
  InventoryOpsIncidentTypeRef,
  InventoryOpsIncidentView,
  StockItemListView,
} from "@/modules/inventory/types";

type InventoryExceptionWorkspaceProps = {
  rows: InventoryOpsIncidentView[];
  types: InventoryOpsIncidentTypeRef[];
  stockItems: StockItemListView[];
  locations: InventoryLocationView[];
  query: {
    status: string;
    incidentType: string;
    severity: string;
    stockItemId: string;
    locationId: string;
  };
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

export function InventoryExceptionWorkspace({
  rows,
  types,
  stockItems,
  locations,
  query,
}: InventoryExceptionWorkspaceProps) {
  const router = useRouter();
  const [status, setStatus] = useState(query.status);
  const [incidentType, setIncidentType] = useState(query.incidentType);
  const [severity, setSeverity] = useState(query.severity);
  const [stockItemId, setStockItemId] = useState(query.stockItemId);
  const [locationId, setLocationId] = useState(query.locationId);
  const [isPending, startTransition] = useTransition();

  function applyFilters() {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (incidentType) params.set("type", incidentType);
    if (severity) params.set("severity", severity);
    if (stockItemId) params.set("item", stockItemId);
    if (locationId) params.set("location", locationId);
    startTransition(() => {
      router.push(`/inventory/exceptions?${params.toString()}`);
    });
  }

  const openCount = rows.filter((row) => row.status === "OPEN").length;
  const investigatingCount = rows.filter((row) => row.status === "INVESTIGATING").length;
  const pendingCount = rows.filter((row) => row.status === "APPROVAL_PENDING").length;
  const highRiskCount = rows.filter(
    (row) => row.severity === "HIGH" || row.severity === "CRITICAL"
  ).length;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/inventory" label="Inventory" />
      <div>
        <h1 className="text-2xl font-semibold">Exceptions</h1>
        <p className="text-sm text-muted-foreground">
          Investigate inventory problems that need a decision. Resolving an exception does not
          change stock by itself.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PlatformKpiCard label="Open" value={String(openCount)} />
        <PlatformKpiCard label="Investigating" value={String(investigatingCount)} />
        <PlatformKpiCard label="Approval pending" value={String(pendingCount)} />
        <PlatformKpiCard label="High / Critical" value={String(highRiskCount)} />
      </div>

      <section className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="flex flex-col gap-1 text-sm">
          Status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-10 rounded-md border px-3"
          >
            <option value="">All</option>
            {Object.entries(INVENTORY_OPS_INCIDENT_STATUS_LABELS).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Type
          <select
            value={incidentType}
            onChange={(event) => setIncidentType(event.target.value)}
            className="h-10 rounded-md border px-3"
          >
            <option value="">All</option>
            {types.map((row) => (
              <option key={row.code} value={row.code}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Severity
          <select
            value={severity}
            onChange={(event) => setSeverity(event.target.value)}
            className="h-10 rounded-md border px-3"
          >
            <option value="">All</option>
            {Object.entries(INVENTORY_OPS_SEVERITY_LABELS).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Item
          <select
            value={stockItemId}
            onChange={(event) => setStockItemId(event.target.value)}
            className="h-10 rounded-md border px-3"
          >
            <option value="">All</option>
            {stockItems.map((row) => (
              <option key={row.id} value={row.id}>
                {row.sku}
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
            <option value="">All</option>
            {locations.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
        <div className="lg:col-span-5">
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline" }), "h-10")}
            onClick={applyFilters}
            disabled={isPending}
          >
            Apply filters
          </button>
        </div>
      </section>

      {rows.length === 0 ? (
        <PlatformEmptyState
          title="No exceptions"
          description="Exceptions appear here when an inventory operation needs investigation."
        />
      ) : (
        <ul className="divide-y rounded-xl border bg-white">
          <li className="hidden grid-cols-8 gap-2 px-4 py-2 text-xs font-medium text-muted-foreground sm:grid">
            <span>Exception #</span>
            <span>Type</span>
            <span>Severity</span>
            <span>Status</span>
            <span>Item</span>
            <span>Location</span>
            <span>Source</span>
            <span>Detected</span>
          </li>
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={`/inventory/exceptions/${row.id}`}
                className="grid gap-1 px-4 py-3 hover:bg-slate-50 sm:grid-cols-8 sm:items-center"
              >
                <p className="font-medium">{row.incidentNumber}</p>
                <p className="text-sm">{row.incidentTypeLabel}</p>
                <p className="text-sm">{severityLabel(row.severity)}</p>
                <p className="text-sm">{statusLabel(row.status)}</p>
                <p className="text-sm text-muted-foreground">{row.sku || "—"}</p>
                <p className="text-sm text-muted-foreground">{row.locationName || "—"}</p>
                <p className="text-sm text-muted-foreground">
                  {row.sourceType} {row.sourceId}
                </p>
                <p className="text-sm text-muted-foreground">
                    {new Date(row.detectedAt).toLocaleDateString()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
