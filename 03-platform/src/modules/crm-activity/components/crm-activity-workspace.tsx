/**
 * Purpose:
 * Activity workspace — overview and completion actions.
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  cancelCrmActivityAction,
  completeCrmActivityAction,
} from "@/modules/crm-activity/actions/crm-activity-actions";
import { CRM_ACTIVITY_OUTCOME_CODES } from "@/modules/crm-activity/constants";
import type { CrmActivityDetailView } from "@/modules/crm-activity/types";

type CrmActivityWorkspaceProps = {
  activity: CrmActivityDetailView;
};

const fieldClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function CrmActivityWorkspace({ activity }: CrmActivityWorkspaceProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [outcomeCode, setOutcomeCode] = useState<string>(
    CRM_ACTIVITY_OUTCOME_CODES.COMPLETED
  );
  const [outcomeNotes, setOutcomeNotes] = useState("");

  function handleComplete(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const result = await completeCrmActivityAction(activity.id, {
        outcomeCode,
        outcomeNotes: outcomeNotes || null,
      });
      if (result.success) {
        router.refresh();
      }
    });
  }

  function handleCancel() {
    const cancelReason = window.prompt("Reason for cancellation:");
    if (!cancelReason?.trim()) return;

    startTransition(async () => {
      const result = await cancelCrmActivityAction(activity.id, {
        cancelReason: cancelReason.trim(),
      });
      if (result.success) {
        router.refresh();
      }
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/crm/activities" label="Back to Activities" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{activity.activityNumber}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{activity.subject}</h1>
          <p className="text-sm text-muted-foreground">
            {activity.activityTypeLabel} · {activity.primaryPartyDisplayName}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/parties/${activity.primaryPartyId}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Open Party
          </Link>
          {activity.editable ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={handleCancel}
            >
              Cancel
            </Button>
          ) : null}
        </div>
      </div>

      <section className="grid gap-4 rounded-lg border bg-card p-6 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
          <p className={cn("font-medium", activity.isOverdue && "text-destructive")}>
            {activity.statusLabel}
            {activity.isOverdue ? " (Overdue)" : ""}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Priority</p>
          <p className="font-medium">{activity.priorityLabel}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Owner</p>
          <p className="font-medium">{activity.ownerDisplayName}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Due</p>
          <p className="font-medium">{formatDate(activity.dueDate)}</p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Description</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">
            {activity.description || "—"}
          </p>
        </div>
      </section>

      {activity.editable ? (
        <section className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-medium">Complete Activity</h2>
          <form onSubmit={handleComplete} className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="outcomeCode">Outcome</Label>
              <select
                id="outcomeCode"
                className={fieldClassName}
                value={outcomeCode}
                onChange={(event) => setOutcomeCode(event.target.value)}
              >
                {Object.entries(CRM_ACTIVITY_OUTCOME_CODES).map(([code]) => (
                  <option key={code} value={code}>
                    {code.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="outcomeNotes">Outcome Notes</Label>
              <textarea
                id="outcomeNotes"
                className={cn(fieldClassName, "min-h-20 py-2")}
                value={outcomeNotes}
                onChange={(event) => setOutcomeNotes(event.target.value)}
                rows={3}
              />
            </div>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Completing…" : "Mark Complete"}
            </Button>
          </form>
        </section>
      ) : (
        <section className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-medium">Outcome</h2>
          <p className="mt-2 text-sm">
            {activity.outcomeLabel ?? "—"}
            {activity.outcomeNotes ? ` — ${activity.outcomeNotes}` : ""}
          </p>
        </section>
      )}

      {activity.entityLinks.length > 0 ? (
        <section className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-medium">Linked Entities</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {activity.entityLinks.map((link) => (
              <li key={link.id}>
                {link.entityTypeLabel}: {link.entityId}
                {link.isPrimary ? " (primary)" : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
