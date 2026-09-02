"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  approveExceptionAction,
  assignExceptionAction,
  cancelExceptionAction,
  resolveExceptionAction,
  startExceptionAction,
} from "@/modules/procurement/actions/exception-actions";
import type { ExceptionView } from "@/modules/procurement/types";

type ExceptionWorkspaceProps = {
  exception: ExceptionView;
  currentUserId: string;
};

export function ExceptionWorkspace({ exception, currentUserId }: ExceptionWorkspaceProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolutionDecision, setResolutionDecision] = useState("");
  const [varianceAccepted, setVarianceAccepted] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const run = (action: () => Promise<{ success: boolean; error?: { message: string } }>) => {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(result.error?.message ?? "Action failed.");
        return;
      }
      setError(null);
      router.refresh();
    });
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/procurement/exceptions" label="Exceptions" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{exception.exceptionNumber}</h1>
          <p className="text-sm text-muted-foreground">{exception.title}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {exception.canStart ? (
            <Button disabled={isPending} onClick={() => run(() => startExceptionAction(exception.id))}>
              Start work
            </Button>
          ) : null}
          {exception.canApprove ? (
            <Button disabled={isPending} onClick={() => run(() => approveExceptionAction(exception.id))}>
              Approve closure
            </Button>
          ) : null}
        </div>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <section className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Type</dt>
            <dd>{exception.exceptionTypeName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Severity</dt>
            <dd>{exception.severity}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd>{exception.statusLabel}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Raised from</dt>
            <dd>{exception.raisedFrom}</dd>
          </div>
        </dl>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Owner</dt>
            <dd>{exception.ownerUserId ?? "Unassigned"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Due</dt>
            <dd>
              {exception.dueAt?.slice(0, 10) ?? "—"}
              {exception.isOverdue ? " (overdue)" : ""}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Requires approval</dt>
            <dd>{exception.requiresApproval ? "Yes" : "No"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Description</dt>
            <dd>{exception.description ?? "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="font-semibold">Linked records</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {exception.links.length === 0 ? (
            <li className="text-muted-foreground">No links recorded.</li>
          ) : (
            exception.links.map((link) => (
              <li key={link.id}>
                <Link className="text-primary hover:underline" href={link.href}>
                  {link.label}
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>

      {exception.canAssign ? (
        <section className="rounded-lg border p-4">
          <h2 className="font-semibold">Assign owner</h2>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <Button
              disabled={isPending}
              onClick={() =>
                run(() =>
                  assignExceptionAction(exception.id, { ownerUserId: currentUserId })
                )
              }
            >
              Assign to me
            </Button>
          </div>
        </section>
      ) : null}

      {exception.canResolve ? (
        <section className="rounded-lg border p-4">
          <h2 className="font-semibold">Resolve</h2>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resolutionNotes">Resolution notes</Label>
              <Input
                id="resolutionNotes"
                value={resolutionNotes}
                onChange={(event) => setResolutionNotes(event.target.value)}
              />
            </div>
            {exception.exceptionTypeCode === "DUPLICATE_INVOICE" ? (
              <div className="space-y-2">
                <Label htmlFor="resolutionDecision">Recorded decision</Label>
                <Input
                  id="resolutionDecision"
                  value={resolutionDecision}
                  onChange={(event) => setResolutionDecision(event.target.value)}
                  placeholder="e.g. Void duplicate, keep original"
                />
              </div>
            ) : null}
            <label className="flex items-center gap-2 text-sm">
              <input
                checked={varianceAccepted}
                type="checkbox"
                onChange={(event) => setVarianceAccepted(event.target.checked)}
              />
              Variance accepted within tolerance
            </label>
            <Button
              disabled={isPending || !resolutionNotes.trim()}
              onClick={() =>
                run(() =>
                  resolveExceptionAction(exception.id, {
                    resolutionNotes,
                    resolutionDecision: resolutionDecision || null,
                    varianceAccepted,
                  })
                )
              }
            >
              Record resolution
            </Button>
          </div>
        </section>
      ) : null}

      {exception.resolutionNotes ? (
        <section className="rounded-lg border p-4">
          <h2 className="font-semibold">Resolution</h2>
          <p className="mt-2 text-sm">{exception.resolutionNotes}</p>
          {exception.resolutionDecision ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Decision: {exception.resolutionDecision}
            </p>
          ) : null}
        </section>
      ) : null}

      {exception.canCancel ? (
        <section className="rounded-lg border p-4">
          <h2 className="font-semibold">Cancel</h2>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="min-w-[240px] flex-1 space-y-2">
              <Label htmlFor="cancelReason">Reason</Label>
              <Input
                id="cancelReason"
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
              />
            </div>
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() =>
                run(() => cancelExceptionAction(exception.id, { reason: cancelReason }))
              }
            >
              Cancel exception
            </Button>
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border p-4">
        <h2 className="font-semibold">Action history</h2>
        <ul className="mt-3 space-y-3 text-sm">
          {exception.actions.length === 0 ? (
            <li className="text-muted-foreground">No actions recorded yet.</li>
          ) : (
            exception.actions.map((action) => (
              <li key={action.id} className="border-t pt-2 first:border-t-0 first:pt-0">
                <p className="font-medium">{action.actionType}</p>
                <p className="text-muted-foreground">{action.notes ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{action.createdAt}</p>
              </li>
            ))
          )}
        </ul>
      </section>
    </main>
  );
}
