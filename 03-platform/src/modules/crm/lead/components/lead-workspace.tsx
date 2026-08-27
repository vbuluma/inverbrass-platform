/**
 * Purpose:
 * Lead workspace — status transitions, assignment/SLA, conversion.
 *
 * Implementation Package:
 * BP-004 / IP-02 – Lead Management
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { SetBreadcrumbs } from "@/components/platform/breadcrumb-context";
import { PlatformProcessingButton, PROCESSING_LABELS } from "@/components/platform";
import { PlatformWorkspaceHeader } from "@/components/platform";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LEAD_STATUS_CODES } from "@/modules/crm/lead/constants";
import {
  convertLeadAction,
  disqualifyLeadAction,
  transitionLeadStatusAction,
} from "@/modules/crm/lead/actions/lead-actions";
import type {
  LeadDetailView,
  LeadRegistrationCatalogues,
} from "@/modules/crm/lead/types";

type LeadWorkspaceProps = {
  lead: LeadDetailView;
  catalogues: LeadRegistrationCatalogues;
};

function formatDuration(seconds: number): string {
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export function LeadWorkspace({ lead, catalogues }: LeadWorkspaceProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reasonCode, setReasonCode] = useState(
    catalogues.disqualificationReasons[0]?.code ?? ""
  );
  const [isPending, startTransition] = useTransition();

  const isReadOnly = lead.statusCode === LEAD_STATUS_CODES.CONVERTED;

  function runTransition(statusCode: string) {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await transitionLeadStatusAction(lead.leadId, {
        statusCode,
        version: lead.version,
        disqualificationReasonCode:
          statusCode === LEAD_STATUS_CODES.UNQUALIFIED ? reasonCode : null,
      });

      if (!result.success) {
        setErrorMessage(result.error.message);
        return;
      }

      router.refresh();
    });
  }

  function runDisqualify() {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await disqualifyLeadAction(lead.leadId, {
        reasonCode,
        version: lead.version,
      });

      if (!result.success) {
        setErrorMessage(result.error.message);
        return;
      }

      router.refresh();
    });
  }

  function runConvert() {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await convertLeadAction(lead.leadId, {
        version: lead.version,
        createCrmIfMissing: true,
      });

      if (!result.success) {
        setErrorMessage(result.error.message);
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <SetBreadcrumbs
        items={[
          { label: "Leads", href: "/leads" },
          { label: lead.leadNumber },
        ]}
      />

      <PlatformWorkspaceHeader
        backHref="/leads"
        backLabel="Back to leads"
        workspaceLabel="Lead"
        title={lead.displayName}
        subtitle={`${lead.leadNumber} · ${lead.statusName}`}
        primaryActions={
          lead.convertedCrmId ? (
            <Link
              href={`/customers/${lead.convertedCrmId}`}
              className={buttonVariants({ variant: "outline" })}
            >
              Open customer
            </Link>
          ) : (
            <Link
              href={`/parties/${lead.partyId}`}
              className={buttonVariants({ variant: "outline" })}
            >
              Open party
            </Link>
          )
        }
      />

      {lead.duplicateWarnings.length > 0 ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-base">Duplicate warnings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {lead.duplicateWarnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Lead details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
            <DetailField label="Party" value={lead.partyNumber} />
            <DetailField label="Source" value={lead.sourceName} />
            <DetailField label="Owner" value={lead.ownerDisplayName ?? "—"} />
            <DetailField label="Branch" value={lead.branchName ?? "—"} />
            <DetailField label="Email" value={lead.email ?? "—"} />
            <DetailField label="Phone" value={lead.phone ?? "—"} />
            <DetailField
              label="Qualification score"
              value={
                lead.qualificationScore != null
                  ? String(lead.qualificationScore)
                  : "—"
              }
            />
            <DetailField label="Notes" value={lead.notes ?? "—"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assignment & SLA</CardTitle>
            <CardDescription>ENG-003n consumption contract</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {lead.assignmentSummary ? (
              <>
                <DetailField
                  label="Current owner"
                  value={lead.assignmentSummary.ownerDisplayName ?? "Assigned"}
                />
                <DetailField
                  label="Segment elapsed"
                  value={formatDuration(
                    lead.assignmentSummary.currentSegmentElapsedSeconds
                  )}
                />
                <DetailField
                  label="Total elapsed"
                  value={formatDuration(lead.assignmentSummary.totalElapsedSeconds)}
                />
                <DetailField
                  label="SLA status"
                  value={
                    lead.assignmentSummary.isBreached ? "Breached" : "Within target"
                  }
                />
              </>
            ) : (
              <p className="text-muted-foreground">No owner assignment recorded yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {!isReadOnly ? (
        <Card>
          <CardHeader>
            <CardTitle>Pipeline actions</CardTitle>
            <CardDescription>Qualify, disqualify, recycle, or convert this lead.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {lead.statusCode === LEAD_STATUS_CODES.NEW ? (
              <PlatformProcessingButton
                type="button"
                isProcessing={isPending}
                idleLabel="Mark contacted"
                processingLabel={PROCESSING_LABELS.saving}
                onClick={() => runTransition(LEAD_STATUS_CODES.CONTACTED)}
              />
            ) : null}
            {lead.statusCode === LEAD_STATUS_CODES.CONTACTED ||
            lead.statusCode === LEAD_STATUS_CODES.RECYCLED ? (
              <PlatformProcessingButton
                type="button"
                isProcessing={isPending}
                idleLabel="Mark qualified"
                processingLabel={PROCESSING_LABELS.saving}
                onClick={() => runTransition(LEAD_STATUS_CODES.QUALIFIED)}
              />
            ) : null}
            {lead.statusCode === LEAD_STATUS_CODES.QUALIFIED ? (
              <PlatformProcessingButton
                type="button"
                isProcessing={isPending}
                idleLabel="Convert to customer"
                processingLabel={PROCESSING_LABELS.saving}
                onClick={runConvert}
              />
            ) : null}
            {lead.statusCode === LEAD_STATUS_CODES.UNQUALIFIED ? (
              <PlatformProcessingButton
                type="button"
                isProcessing={isPending}
                idleLabel="Recycle to pipeline"
                processingLabel={PROCESSING_LABELS.saving}
                onClick={() => runTransition(LEAD_STATUS_CODES.RECYCLED)}
              />
            ) : null}
            {lead.statusCode !== LEAD_STATUS_CODES.UNQUALIFIED &&
            lead.statusCode !== LEAD_STATUS_CODES.CONVERTED ? (
              <>
                <select
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={reasonCode}
                  onChange={(event) => setReasonCode(event.target.value)}
                >
                  {catalogues.disqualificationReasons.map((reason) => (
                    <option key={reason.code} value={reason.code}>
                      {reason.name}
                    </option>
                  ))}
                </select>
                <PlatformProcessingButton
                  type="button"
                  variant="outline"
                  isProcessing={isPending}
                  idleLabel="Disqualify"
                  processingLabel={PROCESSING_LABELS.saving}
                  onClick={runDisqualify}
                />
              </>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
