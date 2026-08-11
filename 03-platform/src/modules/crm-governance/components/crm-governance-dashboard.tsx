/**
 * CRM Governance dashboard — portfolio health + admin sections.
 */

"use client";

import { ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformEmptyState, PlatformKpiCard } from "@/components/platform";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  approveCrmMergeProposalAction,
  getCrmGovernanceDashboardAction,
  rejectCrmMergeProposalAction,
} from "@/modules/crm-governance/actions/crm-governance-actions";
import { CrmSlaPolicyPanel } from "@/modules/crm-governance/components/crm-sla-policy-panel";
import type { CrmGovernanceDashboardView } from "@/modules/crm-governance/types";

type Props = {
  data: CrmGovernanceDashboardView;
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CrmGovernanceDashboard({ data: initial }: Props) {
  const [data, setData] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function refreshFromServer() {
    startTransition(async () => {
      const result = await getCrmGovernanceDashboardAction();
      if (result.success) {
        setData(result.data);
      }
    });
  }

  function onApprove(proposalId: string) {
    startTransition(async () => {
      const result = await approveCrmMergeProposalAction({ proposalId });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      setError(null);
      setMessage("Merge proposal approved.");
      refreshFromServer();
    });
  }

  function onReject(proposalId: string) {
    startTransition(async () => {
      const result = await rejectCrmMergeProposalAction({ proposalId });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      setError(null);
      setMessage("Merge proposal rejected.");
      refreshFromServer();
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <PageBackLink href="/crm/cases" label="Back to CRM" />
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-lg bg-sky-50 text-sky-800 ring-1 ring-sky-200">
            <ShieldCheckIcon className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              CRM Governance
            </h1>
            <p className="text-sm text-muted-foreground">
              Ownership, readiness, duplicates, and SLA administration. Keyed by
              party until IP-01 adds crm_record_id.
            </p>
          </div>
        </div>
      </div>

      {(message || error) && (
        <p
          className={`text-sm ${error ? "text-destructive" : "text-emerald-700"}`}
          role="status"
        >
          {error ?? message}
        </p>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <PlatformKpiCard label="Governed parties" value={data.governanceCount} />
        <PlatformKpiCard label="Missing owners" value={data.missingOwnersCount} />
        <PlatformKpiCard label="Low scores" value={data.lowScoresCount} />
        <PlatformKpiCard label="Pending merges" value={data.pendingMergesCount} />
        <PlatformKpiCard
          label="Average readiness"
          value={`${data.averageReadiness}%`}
        />
        <PlatformKpiCard label="SLA policies" value={data.slaPolicyCount} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Status summary</CardTitle>
        </CardHeader>
        <CardContent>
          {data.statusSummary.length === 0 ? (
            <PlatformEmptyState
              title="No governance records yet"
              description="Open a party governance panel to create the first record."
            />
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {data.statusSummary.map((row) => (
                <li
                  key={row.status}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <span>{row.statusLabel}</span>
                  <span className="font-medium">{row.count}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Missing owners</CardTitle>
          <CardDescription>Parties without an assigned owner.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.missingOwners.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ownership gaps.</p>
          ) : (
            <ul className="space-y-2">
              {data.missingOwners.map((row) => (
                <li key={row.partyId} className="text-sm">
                  <Link
                    className="font-medium text-sky-800 underline-offset-2 hover:underline"
                    href={`/crm/governance/parties/${row.partyId}`}
                  >
                    {row.partyDisplayName}
                  </Link>
                  <span className="text-muted-foreground">
                    {" "}
                    · {row.readinessScore}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Low scores</CardTitle>
          <CardDescription>Readiness below 50%.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.lowScores.length === 0 ? (
            <p className="text-sm text-muted-foreground">No low-score records.</p>
          ) : (
            <ul className="space-y-2">
              {data.lowScores.map((row) => (
                <li key={row.partyId} className="text-sm">
                  <Link
                    className="font-medium text-sky-800 underline-offset-2 hover:underline"
                    href={`/crm/governance/parties/${row.partyId}`}
                  >
                    {row.partyDisplayName}
                  </Link>
                  <span className="text-muted-foreground">
                    {" "}
                    · {row.readinessScore}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Merge queue</CardTitle>
          <CardDescription>
            ENG-005 local stub — execute does not delete parties.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.pendingMerges.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No pending merge proposals.
            </p>
          ) : (
            <ul className="space-y-3">
              {data.pendingMerges.map((row) => (
                <li
                  key={row.id}
                  className="space-y-2 rounded-md border px-3 py-3 text-sm"
                >
                  <div>
                    <span className="font-medium">
                      {row.survivorPartyName ?? row.survivorPartyId}
                    </span>
                    <span className="text-muted-foreground"> ← </span>
                    <span>{row.duplicatePartyName ?? row.duplicatePartyId}</span>
                  </div>
                  <p className="text-muted-foreground">{row.matchReason}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={isPending}
                      onClick={() => onApprove(row.id)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => onReject(row.id)}
                    >
                      Reject
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <CrmSlaPolicyPanel
        initialPolicies={data.slaPolicies}
        onChanged={refreshFromServer}
      />

      <Card>
        <CardHeader>
          <CardTitle>Business hours</CardTitle>
          <CardDescription>ENG-003n calendar stub (Mon–Fri default).</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2">
            {data.businessHours.map((row) => (
              <li
                key={row.id}
                className="flex justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span>{DAY_LABELS[row.dayOfWeek] ?? row.dayOfWeek}</span>
                <span className="text-muted-foreground">
                  {row.isClosed
                    ? "Closed"
                    : `${row.openTime}–${row.closeTime} (${row.timezone})`}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Holiday calendar</CardTitle>
        </CardHeader>
        <CardContent>
          {data.holidays.length === 0 ? (
            <p className="text-sm text-muted-foreground">No holidays configured.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.holidays.map((row) => (
                <li key={row.id} className="flex justify-between border-b py-1">
                  <span>{row.name}</span>
                  <span className="text-muted-foreground">
                    {row.holidayDate}
                    {row.isRecurring ? " · recurring" : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Approval matrix</CardTitle>
          <CardDescription>ENG-005 stub configuration.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {data.approvalMatrix.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
              >
                <span className="font-medium">{row.actionCode}</span>
                <span className="text-muted-foreground">
                  min role {row.minRoleCode}
                  {row.requiresDualApproval ? " · dual approval" : ""}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent governance</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentGovernance.length === 0 ? (
            <PlatformEmptyState
              title="No recent records"
              description="Governance records appear here after party panels are opened."
            />
          ) : (
            <ul className="space-y-2">
              {data.recentGovernance.map((row) => (
                <li key={row.partyId} className="text-sm">
                  <Link
                    className="font-medium text-sky-800 underline-offset-2 hover:underline"
                    href={`/crm/governance/parties/${row.partyId}`}
                  >
                    {row.partyDisplayName}
                  </Link>
                  <span className="text-muted-foreground">
                    {" "}
                    · {row.governanceStatusLabel} · {row.readinessScore}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

