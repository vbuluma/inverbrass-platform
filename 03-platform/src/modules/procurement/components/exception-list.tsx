"use client";

import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ExceptionListView } from "@/modules/procurement/types";

type ExceptionListProps = {
  initialRows: ExceptionListView[];
  filter?: string;
};

export function ExceptionList({ initialRows, filter }: ExceptionListProps) {
  const filterLabel =
    filter === "mine"
      ? "My exceptions"
      : filter === "overdue"
        ? "Overdue exceptions"
        : filter === "pending-approval"
          ? "Pending approval"
          : "Open exceptions";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/procurement" label="Procurement" />
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Exceptions</h1>
          <p className="text-sm text-muted-foreground">
            Track variances, disputes, and control breaches through resolution.
          </p>
        </div>
        <Link href="/procurement/exceptions/new" className={cn(buttonVariants(), "h-10")}>
          Raise exception
        </Link>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        <Link
          href="/procurement/exceptions"
          className={cn(
            buttonVariants({ variant: filter ? "outline" : "default", size: "sm" }),
            "h-8"
          )}
        >
          Open
        </Link>
        <Link
          href="/procurement/exceptions?status=mine"
          className={cn(
            buttonVariants({ variant: filter === "mine" ? "default" : "outline", size: "sm" }),
            "h-8"
          )}
        >
          My items
        </Link>
        <Link
          href="/procurement/exceptions?status=overdue"
          className={cn(
            buttonVariants({ variant: filter === "overdue" ? "default" : "outline", size: "sm" }),
            "h-8"
          )}
        >
          Overdue
        </Link>
        <Link
          href="/procurement/exceptions?status=pending-approval"
          className={cn(
            buttonVariants({
              variant: filter === "pending-approval" ? "default" : "outline",
              size: "sm",
            }),
            "h-8"
          )}
        >
          Pending approval
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">{filterLabel}</p>
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3">Exception</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Raised</th>
            </tr>
          </thead>
          <tbody>
            {initialRows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={6}>
                  No exceptions in this queue.
                </td>
              </tr>
            ) : (
              initialRows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-4 py-3">
                    <Link
                      className="font-medium text-primary hover:underline"
                      href={`/procurement/exceptions/${row.id}`}
                    >
                      {row.exceptionNumber}
                    </Link>
                    <p className="text-xs text-muted-foreground">{row.title}</p>
                    {row.isOverdue ? (
                      <span className="text-xs text-destructive">Overdue</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{row.exceptionTypeName}</td>
                  <td className="px-4 py-3">{row.severity}</td>
                  <td className="px-4 py-3">{row.statusLabel}</td>
                  <td className="px-4 py-3">{row.dueAt?.slice(0, 10) ?? "—"}</td>
                  <td className="px-4 py-3">{row.createdAt.slice(0, 10)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
