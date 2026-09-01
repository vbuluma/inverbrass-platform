"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformEmptyState } from "@/components/platform";
import { Input } from "@/components/ui/input";
import type { ContractListView } from "@/modules/procurement/types";

type ContractListProps = {
  initialRows: ContractListView[];
};

export function ContractList({ initialRows }: ContractListProps) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return initialRows;
    }
    return initialRows.filter(
      (row) =>
        row.contractNumber.toLowerCase().includes(needle) ||
        row.title.toLowerCase().includes(needle) ||
        row.supplierName.toLowerCase().includes(needle)
    );
  }, [initialRows, query]);

  const dashboard = useMemo(
    () => ({
      active: initialRows.filter((row) => row.status === "ACTIVE" || row.status === "EXPIRING").length,
      pendingApproval: initialRows.filter((row) => row.status === "PENDING_APPROVAL").length,
      pendingExecution: initialRows.filter((row) => row.status === "PENDING_EXECUTION").length,
      expiring: initialRows.filter((row) => row.status === "EXPIRING").length,
      expired: initialRows.filter((row) => row.status === "EXPIRED").length,
    }),
    [initialRows]
  );

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/procurement" label="Procurement" />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Contracts</h1>
          <p className="text-sm text-muted-foreground">
            Manage supplier agreements, versions, and call-off purchase orders.
          </p>
        </div>
        <Link
          href="/procurement/contracts/new"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Register contract
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Active", dashboard.active],
          ["Pending approval", dashboard.pendingApproval],
          ["Pending execution", dashboard.pendingExecution],
          ["Expiring soon", dashboard.expiring],
          ["Expired", dashboard.expired],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search contracts"
      />
      {filtered.length === 0 ? (
        <PlatformEmptyState title="No contracts" description="Register a contract to get started." />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Number</th>
                <th className="px-3 py-2 font-medium">Title</th>
                <th className="px-3 py-2 font-medium">Supplier</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Value</th>
                <th className="px-3 py-2 font-medium">POs</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2">
                    <Link href={`/procurement/contracts/${row.id}`} className="font-medium hover:underline">
                      {row.contractNumber}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{row.title}</td>
                  <td className="px-3 py-2">{row.supplierName}</td>
                  <td className="px-3 py-2">{row.statusLabel}</td>
                  <td className="px-3 py-2">{row.totalValueLabel ?? "—"}</td>
                  <td className="px-3 py-2">{row.relatedPoCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
