"use client";

/**
 * Purpose:
 * RFX / evaluation / award list under Procurement > Sourcing.
 */

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformEmptyState } from "@/components/platform";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { listSourcingEventsAction } from "@/modules/procurement/actions/sourcing-actions";
import type {
  SourcingEventListFilter,
  SourcingEventListView,
} from "@/modules/procurement/types";

type SourcingEventListProps = {
  initialRows: SourcingEventListView[];
  view: NonNullable<SourcingEventListFilter["view"]> | "rfx";
};

const TITLES: Record<string, { heading: string; description: string }> = {
  rfx: {
    heading: "RFX",
    description: "Invite suppliers and collect quotations for approved purchase requests.",
  },
  evaluations: {
    heading: "Evaluations",
    description: "Compare quotes, budgeted savings, and negotiated savings before award.",
  },
  awards: {
    heading: "Awards",
    description: "Review awarded suppliers and awarded amounts.",
  },
};

export function SourcingEventList({ initialRows, view }: SourcingEventListProps) {
  const [rows, setRows] = useState(initialRows);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const copy = TITLES[view] ?? TITLES.rfx;

  const counts = useMemo(
    () => ({
      open: initialRows.filter((row) => row.status === "ISSUED").length,
      awarded: initialRows.filter((row) => row.status === "AWARDED").length,
    }),
    [initialRows]
  );

  function refresh(nextQuery: string) {
    startTransition(async () => {
      const result = await listSourcingEventsAction({
        query: nextQuery,
        view: view === "rfx" ? undefined : view,
      });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      setError(null);
      setRows(result.data);
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <PageBackLink href="/procurement" label="Procurement" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{copy.heading}</h1>
            <p className="text-sm text-muted-foreground">{copy.description}</p>
          </div>
          <Link href="/procurement/sourcing/new" className={cn(buttonVariants(), "h-10")}>
            New RFX
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={query}
          onChange={(event) => {
            const next = event.target.value;
            setQuery(next);
            refresh(next);
          }}
          placeholder="Search RFX number or title"
          className="max-w-sm"
        />
        <p className="text-sm text-muted-foreground">
          {counts.open} open · {counts.awarded} awarded
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {rows.length === 0 ? (
        <PlatformEmptyState
          title="No sourcing events yet"
          description="Start from an approved purchase request."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">RFX</th>
                <th className="px-3 py-2 font-medium">Title</th>
                <th className="px-3 py-2 font-medium">Budget</th>
                <th className="px-3 py-2 font-medium">Closes</th>
                <th className="px-3 py-2 font-medium">Quotes</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2">
                    <Link
                      href={`/procurement/sourcing/${row.id}`}
                      className="font-medium text-sky-800 hover:underline"
                    >
                      {row.eventNumber}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{row.title}</td>
                  <td className="px-3 py-2">{row.budgetedAmountLabel}</td>
                  <td className="px-3 py-2">
                    {new Date(row.closesAt).toLocaleDateString()}
                    {row.biddingOpen ? "" : " (closed)"}
                  </td>
                  <td className="px-3 py-2">{row.quoteCount}</td>
                  <td className="px-3 py-2">{row.statusLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {isPending ? <p className="text-xs text-muted-foreground">Updating…</p> : null}
    </main>
  );
}
