/**
 * Purpose:
 * Opportunity workspace — stage progression, line items, SLA.
 *
 * Implementation Package:
 * BP-004 / IP-03 – Opportunity Management
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
import { transitionOpportunityStageAction } from "@/modules/crm/opportunity/actions/opportunity-actions";
import type {
  OpportunityDetailView,
  OpportunityRegistrationCatalogues,
} from "@/modules/crm/opportunity/types";

type OpportunityWorkspaceProps = {
  opportunity: OpportunityDetailView;
  catalogues: OpportunityRegistrationCatalogues;
};

export function OpportunityWorkspace({
  opportunity,
  catalogues,
}: OpportunityWorkspaceProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lossReasonCode, setLossReasonCode] = useState(
    catalogues.lossReasons[0]?.code ?? ""
  );
  const [isPending, startTransition] = useTransition();

  const pipelineStages = catalogues.stages.filter(
    (stage) => stage.pipelineCode === opportunity.pipelineCode
  );

  const isClosed =
    opportunity.statusCode === "WON" || opportunity.statusCode === "LOST";

  function runStageTransition(stageCode: string, extra?: { finalAmount?: string }) {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await transitionOpportunityStageAction(opportunity.opportunityId, {
        stageCode,
        version: opportunity.version,
        lossReasonCode: stageCode === "CLOSED_LOST" ? lossReasonCode : null,
        finalAmount: extra?.finalAmount ?? null,
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
          { label: "Opportunities", href: "/opportunities" },
          { label: opportunity.opportunityNumber },
        ]}
      />

      <PlatformWorkspaceHeader
        backHref="/opportunities"
        backLabel="Back to opportunities"
        workspaceLabel="Opportunity"
        title={opportunity.name}
        subtitle={`${opportunity.opportunityNumber} · ${opportunity.stageName}`}
        primaryActions={
          <Link
            href={`/customers/${opportunity.crmRecordId}`}
            className={buttonVariants({ variant: "outline" })}
          >
            Open customer
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Deal details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
            <Field label="Customer" value={opportunity.displayName} />
            <Field label="Pipeline" value={opportunity.pipelineName} />
            <Field label="Stage" value={opportunity.stageName} />
            <Field label="Owner" value={opportunity.ownerDisplayName ?? "—"} />
            <Field label="Amount" value={opportunity.amount ?? "—"} />
            <Field label="Probability" value={`${opportunity.probability}%`} />
            <Field label="Weighted" value={opportunity.weightedAmount ?? "—"} />
            <Field
              label="Expected close"
              value={opportunity.expectedCloseDate ?? "—"}
            />
            {opportunity.sourceLeadNumber ? (
              <Field label="Source lead" value={opportunity.sourceLeadNumber} />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assignment & SLA</CardTitle>
            <CardDescription>ENG-003n consumption contract</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            {opportunity.assignmentSummary ? (
              <div className="space-y-2">
                <Field
                  label="Owner"
                  value={
                    opportunity.assignmentSummary.ownerDisplayName ?? "Assigned"
                  }
                />
                <Field
                  label="SLA"
                  value={
                    opportunity.assignmentSummary.isBreached
                      ? "Breached"
                      : "Within target"
                  }
                />
              </div>
            ) : (
              <p className="text-muted-foreground">No owner assignment recorded.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {!isClosed ? (
        <Card>
          <CardHeader>
            <CardTitle>Pipeline progression</CardTitle>
            <CardDescription>Advance through configured pipeline stages.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {pipelineStages
              .filter((stage) => !stage.isClosedWon && !stage.isClosedLost)
              .map((stage) => (
                <PlatformProcessingButton
                  key={stage.code}
                  type="button"
                  variant="outline"
                  isProcessing={isPending}
                  idleLabel={stage.name}
                  processingLabel={PROCESSING_LABELS.saving}
                  onClick={() => runStageTransition(stage.code)}
                />
              ))}
            <PlatformProcessingButton
              type="button"
              isProcessing={isPending}
              idleLabel="Mark won"
              processingLabel={PROCESSING_LABELS.saving}
              onClick={() =>
                runStageTransition("CLOSED_WON", {
                  finalAmount: opportunity.amount ?? undefined,
                })
              }
            />
            <select
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={lossReasonCode}
              onChange={(event) => setLossReasonCode(event.target.value)}
            >
              {catalogues.lossReasons.map((reason) => (
                <option key={reason.code} value={reason.code}>
                  {reason.name}
                </option>
              ))}
            </select>
            <PlatformProcessingButton
              type="button"
              variant="outline"
              isProcessing={isPending}
              idleLabel="Mark lost"
              processingLabel={PROCESSING_LABELS.saving}
              onClick={() => runStageTransition("CLOSED_LOST")}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Offering line items</CardTitle>
          <CardDescription>References BP-003 products — no catalogue duplication.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {opportunity.lineItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No offerings linked yet.</p>
          ) : (
            opportunity.lineItems.map((item) => (
              <div
                key={item.lineItemId}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <div>
                  <div className="font-medium">{item.productName}</div>
                  <div className="text-muted-foreground">{item.productCode}</div>
                </div>
                <span>
                  {item.quantity} × {item.unitPrice ?? "—"}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
