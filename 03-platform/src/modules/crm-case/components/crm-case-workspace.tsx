"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  assignCrmCaseAction,
  closeCrmCaseAction,
  escalateCrmCaseAction,
  reopenCrmCaseAction,
  resolveCrmCaseAction,
  resumeCrmCaseAction,
  setPendingCustomerCrmCaseAction,
} from "@/modules/crm-case/actions/crm-case-actions";
import { CRM_CASE_STATUS_CODES } from "@/modules/crm-case/constants";
import type { CrmCaseDetailView } from "@/modules/crm-case/types";

type Props = {
  caseDetail: CrmCaseDetailView;
  owners: Array<{ id: string; displayName: string }>;
  resolutionCodes: Array<{ code: string; name: string }>;
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

export function CrmCaseWorkspace({ caseDetail, owners, resolutionCodes }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [assignOwnerId, setAssignOwnerId] = useState(
    caseDetail.ownerUserId ?? owners[0]?.id ?? ""
  );
  const [resolutionSummary, setResolutionSummary] = useState("");
  const [resolutionCode, setResolutionCode] = useState(
    resolutionCodes[0]?.code ?? ""
  );
  const [satisfactionRating, setSatisfactionRating] = useState("");

  function refresh() {
    router.refresh();
  }

  function runAction(
    action: () => Promise<{ success: boolean; error?: { message: string } }>
  ) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(result.error?.message ?? "Action failed");
        return;
      }
      refresh();
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/crm/cases" label="Back to Cases" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{caseDetail.caseNumber}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{caseDetail.subject}</h1>
          <p className="text-sm text-muted-foreground">
            {caseDetail.caseTypeLabel} · {caseDetail.primaryPartyDisplayName} ·{" "}
            {caseDetail.statusLabel}
            {caseDetail.isOverdue ? " · Overdue" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/parties/${caseDetail.primaryPartyId}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Open Party
          </Link>
          {caseDetail.linkedCommunicationId ? (
            <Link
              href={`/crm/communications/${caseDetail.linkedCommunicationId}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Communication
            </Link>
          ) : null}
        </div>
      </div>

      <section className="grid gap-4 rounded-lg border bg-card p-6 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Priority</p>
          <p>{caseDetail.priorityLabel}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Severity</p>
          <p>{caseDetail.severityLabel}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Owner</p>
          <p>{caseDetail.ownerDisplayName ?? "Unassigned"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Opened</p>
          <p>{formatDate(caseDetail.openedAt)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            SLA resolution due
          </p>
          <p>{formatDate(caseDetail.slaResolutionDueAt)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">SLA breached</p>
          <p>{formatDate(caseDetail.slaBreachedAt)}</p>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-6">
        <h2 className="text-sm font-medium">Description</h2>
        <p className="mt-2 text-sm text-muted-foreground">{caseDetail.description}</p>
      </section>

      {caseDetail.resolutionSummary ? (
        <section className="rounded-lg border bg-card p-6">
          <h2 className="text-sm font-medium">Resolution</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {caseDetail.resolutionCode}: {caseDetail.resolutionSummary}
          </p>
        </section>
      ) : null}

      {caseDetail.escalations.length > 0 ? (
        <section className="rounded-lg border bg-card p-6">
          <h2 className="text-sm font-medium">Escalation history</h2>
          <ul className="mt-2 divide-y text-sm">
            {caseDetail.escalations.map((item) => (
              <li key={item.id} className="py-2">
                {formatDate(item.createdAt)} · {item.triggeredBy}: {item.reason}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {caseDetail.isEditable ? (
        <section className="space-y-4 rounded-lg border bg-card p-6">
          <h2 className="text-sm font-medium">Actions</h2>
          <div className="flex flex-wrap gap-2">
            {caseDetail.statusCode !== CRM_CASE_STATUS_CODES.PENDING_CUSTOMER ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() =>
                  runAction(() => setPendingCustomerCrmCaseAction(caseDetail.id))
                }
              >
                Pending Customer
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => runAction(() => resumeCrmCaseAction(caseDetail.id))}
              >
                Resume
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => {
                const reason = window.prompt("Escalation reason:");
                if (!reason?.trim()) return;
                runAction(() =>
                  escalateCrmCaseAction(caseDetail.id, { reason: reason.trim() })
                );
              }}
            >
              Escalate
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="assignOwner">Assign owner</Label>
              <select
                id="assignOwner"
                className={fieldClassName}
                value={assignOwnerId}
                onChange={(e) => setAssignOwnerId(e.target.value)}
              >
                {owners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.displayName}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              size="sm"
              disabled={isPending || !assignOwnerId}
              onClick={() =>
                runAction(() =>
                  assignCrmCaseAction(caseDetail.id, { ownerUserId: assignOwnerId })
                )
              }
            >
              Assign
            </Button>
          </div>

          {caseDetail.statusCode !== CRM_CASE_STATUS_CODES.RESOLVED &&
          caseDetail.statusCode !== CRM_CASE_STATUS_CODES.CLOSED ? (
            <div className="space-y-3 border-t pt-4">
              <h3 className="text-sm font-medium">Resolve</h3>
              <div className="space-y-2">
                <Label htmlFor="resolutionCode">Resolution code</Label>
                <select
                  id="resolutionCode"
                  className={fieldClassName}
                  value={resolutionCode}
                  onChange={(e) => setResolutionCode(e.target.value)}
                >
                  {resolutionCodes.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="resolutionSummary">Resolution summary</Label>
                <textarea
                  id="resolutionSummary"
                  className={`${fieldClassName} min-h-20 py-2`}
                  value={resolutionSummary}
                  onChange={(e) => setResolutionSummary(e.target.value)}
                />
              </div>
              <Button
                type="button"
                size="sm"
                disabled={isPending || !resolutionSummary.trim()}
                onClick={() =>
                  runAction(() =>
                    resolveCrmCaseAction(caseDetail.id, {
                      resolutionSummary: resolutionSummary.trim(),
                      resolutionCode,
                    })
                  )
                }
              >
                Resolve Case
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}

      {caseDetail.statusCode === CRM_CASE_STATUS_CODES.RESOLVED ? (
        <section className="space-y-3 rounded-lg border bg-card p-6">
          <h2 className="text-sm font-medium">Close case</h2>
          <div className="space-y-2">
            <Label htmlFor="satisfaction">Satisfaction (1–5, optional)</Label>
            <Input
              id="satisfaction"
              type="number"
              min={1}
              max={5}
              value={satisfactionRating}
              onChange={(e) => setSatisfactionRating(e.target.value)}
            />
          </div>
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={() =>
              runAction(() =>
                closeCrmCaseAction(caseDetail.id, {
                  satisfactionRating: satisfactionRating
                    ? Number(satisfactionRating)
                    : null,
                })
              )
            }
          >
            Close Case
          </Button>
        </section>
      ) : null}

      {caseDetail.statusCode === CRM_CASE_STATUS_CODES.CLOSED ? (
        <section className="rounded-lg border bg-card p-6">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => {
              const reason = window.prompt("Reopen reason (required):");
              if (!reason?.trim()) return;
              runAction(() =>
                reopenCrmCaseAction(caseDetail.id, { reopenReason: reason.trim() })
              );
            }}
          >
            Reopen Case
          </Button>
        </section>
      ) : null}
    </main>
  );
}
