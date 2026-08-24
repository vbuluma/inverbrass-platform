/**
 * Purpose:
 * Commercial governance workspace — progressive Configuration → Review →
 * Approval → Activation (UX §14).
 *
 * Implementation Package:
 * BP-005 / IP-08 – Commercial Governance
 */

"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import {
  PlatformEmptyState,
  PlatformFormActionFooter,
  PlatformProcessingButton,
} from "@/components/platform";
import { PageBackLink } from "@/components/platform/page-back-link";
import { SetBreadcrumbs } from "@/components/platform/breadcrumb-context";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  platformError,
  platformSuccess,
} from "@/core/platform/platform-action-helpers";
import type { PlatformActionResult } from "@/core/platform/types";
import {
  activateCommercialRuleAction,
  approveCommercialRuleAction,
  createCommercialRuleDraftAction,
  getCommercialRuleHistoryAction,
  loadCommercialGovernanceWorkspaceAction,
  rejectCommercialRuleAction,
  submitCommercialRuleAction,
  suspendCommercialRuleAction,
} from "@/modules/commercial/actions/commercial-governance-actions";
import {
  CommercialResolutionStepper,
  type CommercialStepDefinition,
  type CommercialStepStatus,
} from "@/modules/commercial/components/commercial-resolution-stepper";
import {
  COMMERCIAL_RULE_TYPE_CODES,
  type CommercialGovernanceEventView,
  type CommercialGovernanceWorkspaceView,
  type CommercialRuleVersionView,
} from "@/modules/commercial";

type GovernanceStepId = "base-price" | "components" | "tax" | "review";

const STEP_ORDER: GovernanceStepId[] = [
  "base-price",
  "components",
  "tax",
  "review",
];

const STEP_LABELS: Record<GovernanceStepId, { label: string; short: string }> =
  {
    "base-price": { label: "Configuration", short: "Config" },
    components: { label: "Review", short: "Review" },
    tax: { label: "Approval", short: "Approval" },
    review: { label: "Activation", short: "Activate" },
  };

function statusBadge(status: string) {
  const tone =
    status === "ACTIVE"
      ? "bg-emerald-100 text-emerald-900"
      : status === "PENDING_APPROVAL"
        ? "bg-amber-100 text-amber-900"
        : status === "REJECTED" || status === "SUSPENDED"
          ? "bg-destructive/10 text-destructive"
          : status === "APPROVED"
            ? "bg-sky-100 text-sky-900"
            : "bg-muted text-muted-foreground";
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${tone}`}
    >
      {status}
    </span>
  );
}

export function CommercialGovernanceWorkspace() {
  const [activeStep, setActiveStep] = useState<GovernanceStepId>("base-price");
  const [isPending, startTransition] = useTransition();
  const [actionResult, setActionResult] = useState<PlatformActionResult | null>(
    null
  );
  const [workspace, setWorkspace] =
    useState<CommercialGovernanceWorkspaceView | null>(null);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [historyEvents, setHistoryEvents] = useState<
    CommercialGovernanceEventView[]
  >([]);
  const [rejectReason, setRejectReason] = useState("");
  const [suspendReason, setSuspendReason] = useState("");

  const [ruleKey, setRuleKey] = useState("TAX-VAT-DEFAULT");
  const [label, setLabel] = useState("Standard VAT");
  const [description, setDescription] = useState("");
  const [ratePercent, setRatePercent] = useState("16");
  const [currencyCode, setCurrencyCode] = useState("KES");
  const [effectiveFrom, setEffectiveFrom] = useState("");

  useEffect(() => {
    startTransition(async () => {
      const result = await loadCommercialGovernanceWorkspaceAction();
      if (!result.success) {
        setActionResult(
          platformError("Could not load governance", result.error.message)
        );
        return;
      }
      setWorkspace(result.data);
    });
  }, []);

  const selectedRule: CommercialRuleVersionView | null = useMemo(() => {
    if (!workspace || !selectedRuleId) return null;
    const all = [
      ...workspace.drafts,
      ...workspace.pendingApproval,
      ...workspace.active,
      ...workspace.suspended,
    ];
    return all.find((r) => r.ruleVersionId === selectedRuleId) ?? null;
  }, [workspace, selectedRuleId]);

  const stepStatus = useMemo(() => {
    const map: Record<GovernanceStepId, CommercialStepStatus> = {
      "base-price": activeStep === "base-price" ? "current" : "complete",
      components: !selectedRule
        ? "locked"
        : activeStep === "components"
          ? "current"
          : selectedRule
            ? "complete"
            : "incomplete",
      tax: !selectedRule
        ? "locked"
        : activeStep === "tax"
          ? "current"
          : selectedRule.lifecycleStatus === "APPROVED" ||
              selectedRule.lifecycleStatus === "ACTIVE" ||
              selectedRule.lifecycleStatus === "PENDING_APPROVAL"
            ? "complete"
            : "incomplete",
      review:
        !selectedRule ||
        (selectedRule.lifecycleStatus !== "APPROVED" &&
          selectedRule.lifecycleStatus !== "ACTIVE" &&
          selectedRule.lifecycleStatus !== "SUSPENDED")
          ? "locked"
          : activeStep === "review"
            ? "current"
            : "incomplete",
    };
    return map;
  }, [activeStep, selectedRule]);

  const steps: CommercialStepDefinition[] = STEP_ORDER.map((id) => ({
    id,
    label: STEP_LABELS[id].label,
    shortLabel: STEP_LABELS[id].short,
    status: stepStatus[id],
  }));

  function refreshWorkspace(nextSelected?: string | null) {
    startTransition(async () => {
      const result = await loadCommercialGovernanceWorkspaceAction();
      if (!result.success) {
        setActionResult(
          platformError("Refresh failed", result.error.message)
        );
        return;
      }
      setWorkspace(result.data);
      if (nextSelected !== undefined) {
        setSelectedRuleId(nextSelected);
      }
    });
  }

  function loadHistory(ruleVersionId: string) {
    startTransition(async () => {
      const result = await getCommercialRuleHistoryAction(ruleVersionId);
      if (!result.success) {
        setActionResult(
          platformError("History unavailable", result.error.message)
        );
        return;
      }
      setHistoryEvents(result.data.events);
    });
  }

  function createDraft() {
    startTransition(async () => {
      const result = await createCommercialRuleDraftAction({
        ruleKey: ruleKey.trim(),
        ruleType: COMMERCIAL_RULE_TYPE_CODES.TAX_RULE,
        label: label.trim(),
        description: description.trim() || null,
        payload: {
          ratePercent: Number(ratePercent),
          taxTypeCode: "VAT",
          displayLabel: label.trim(),
        },
        currencyCode: currencyCode.trim().toUpperCase(),
        effectiveFrom: effectiveFrom
          ? new Date(effectiveFrom).toISOString()
          : null,
      });
      if (!result.success) {
        setActionResult(
          platformError("Could not create draft", result.error.message, result.error.field)
        );
        return;
      }
      setSelectedRuleId(result.data.ruleVersionId);
      setActionResult(
        platformSuccess(
          "Draft created",
          `${result.data.label} is in DRAFT. Submit for approval when ready.`
        )
      );
      refreshWorkspace(result.data.ruleVersionId);
      setActiveStep("components");
      loadHistory(result.data.ruleVersionId);
    });
  }

  function runAction(
    labelText: string,
    fn: () => Promise<{ success: boolean; error?: { message: string; field?: string }; data?: CommercialRuleVersionView }>
  ) {
    if (!selectedRuleId) return;
    startTransition(async () => {
      const result = await fn();
      if (!result.success) {
        setActionResult(
          platformError(labelText, result.error?.message ?? "Failed", result.error?.field)
        );
        return;
      }
      setActionResult(
        platformSuccess(
          labelText,
          result.data
            ? `Status is now ${result.data.lifecycleStatus}.`
            : "Done."
        )
      );
      refreshWorkspace(selectedRuleId);
      loadHistory(selectedRuleId);
    });
  }

  function goPrevious() {
    const idx = STEP_ORDER.indexOf(activeStep);
    if (idx > 0) setActiveStep(STEP_ORDER[idx - 1]!);
  }

  function goNext() {
    const idx = STEP_ORDER.indexOf(activeStep);
    if (idx < STEP_ORDER.length - 1) {
      const next = STEP_ORDER[idx + 1]!;
      if (stepStatus[next] !== "locked") {
        setActiveStep(next);
      }
    }
  }

  const allRules = workspace
    ? [
        ...workspace.drafts,
        ...workspace.pendingApproval,
        ...workspace.active,
        ...workspace.suspended,
      ]
    : [];

  return (
    <main className="platform-workspace-main mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <SetBreadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Commercial rules" },
        ]}
      />
      <PageBackLink href="/dashboard" label="Back to dashboard" />

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Commercial rules
        </h1>
        <p className="text-sm text-muted-foreground">
          Control commercial configuration lifecycle — draft, approve, activate,
          and suspend — without recalculating prices, tax, or expected amounts.
          Confirmed commercial results remain unchanged when rules change later.
        </p>
      </header>

      <CommercialResolutionStepper
        steps={steps}
        activeStep={activeStep}
        onStepSelect={(id) => {
          if (stepStatus[id] !== "locked") setActiveStep(id);
        }}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <section className="space-y-4 rounded-xl border bg-background p-4 sm:p-5">
          {!workspace ? (
            <PlatformEmptyState
              title="Loading governance…"
              description="Fetching commercial governance workspace."
            />
          ) : null}

          {workspace && activeStep === "base-price" ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">1. Configuration</h2>
                <p className="text-sm text-muted-foreground">
                  Create a governed commercial configuration draft. Material
                  fields (rate, currency, effective dates) require approval
                  before activation.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ruleKey">Rule key *</Label>
                  <Input
                    id="ruleKey"
                    value={ruleKey}
                    onChange={(e) => setRuleKey(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="label">Label *</Label>
                  <Input
                    id="label"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rate">Rate % *</Label>
                  <Input
                    id="rate"
                    type="number"
                    value={ratePercent}
                    onChange={(e) => setRatePercent(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={currencyCode}
                    onChange={(e) => setCurrencyCode(e.target.value)}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="effectiveFrom">Effective from</Label>
                  <Input
                    id="effectiveFrom"
                    type="datetime-local"
                    value={effectiveFrom}
                    onChange={(e) => setEffectiveFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional non-material notes"
                  />
                </div>
              </div>
              <PlatformProcessingButton
                type="button"
                isProcessing={isPending}
                processingLabel="Creating draft…"
                idleLabel="Create draft"
                onClick={createDraft}
              >
                Create draft
              </PlatformProcessingButton>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Existing configurations</h3>
                {allRules.length === 0 ? (
                  <PlatformEmptyState
                    title="No configurations yet"
                    description="Create a draft to begin governance."
                    compact
                  />
                ) : (
                  <ul className="divide-y rounded-lg border">
                    {allRules.map((rule) => (
                      <li key={rule.ruleVersionId}>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/40"
                          onClick={() => {
                            setSelectedRuleId(rule.ruleVersionId);
                            loadHistory(rule.ruleVersionId);
                            setActiveStep("components");
                          }}
                        >
                          <span>
                            <span className="block text-sm font-medium">
                              {rule.label} · v{rule.versionNumber}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {rule.ruleKey}
                            </span>
                          </span>
                          {statusBadge(rule.lifecycleStatus)}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}

          {workspace && activeStep === "components" ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">2. Review</h2>
                <p className="text-sm text-muted-foreground">
                  Confirm the commercial configuration before submission.
                </p>
              </div>
              {!selectedRule ? (
                <PlatformEmptyState
                  title="No configuration selected"
                  description="Create or select a draft from Configuration."
                  actionLabel="Back to Configuration"
                  onAction={() => setActiveStep("base-price")}
                  compact
                />
              ) : (
                <>
                  <RuleSummary rule={selectedRule} />
                  {(selectedRule.lifecycleStatus === "DRAFT" ||
                    selectedRule.lifecycleStatus === "REJECTED") && (
                    <PlatformProcessingButton
                      type="button"
                      isProcessing={isPending}
                      processingLabel="Submitting…"
                      idleLabel="Submit for approval"
                      onClick={() =>
                        runAction("Submitted for approval", () =>
                          submitCommercialRuleAction(selectedRule.ruleVersionId)
                        )
                      }
                    >
                      Submit for approval
                    </PlatformProcessingButton>
                  )}
                  {selectedRule.rejectionReason ? (
                    <Alert variant="destructive">
                      <AlertDescription>
                        <p className="font-medium">Rejection reason</p>
                        <p>{selectedRule.rejectionReason}</p>
                      </AlertDescription>
                    </Alert>
                  ) : null}
                </>
              )}
            </div>
          ) : null}

          {workspace && activeStep === "tax" ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">3. Approval</h2>
                <p className="text-sm text-muted-foreground">
                  Checker approval with segregation of duties. Rejection
                  requires a reason.
                </p>
              </div>
              {!selectedRule ? (
                <PlatformEmptyState
                  title="Nothing pending"
                  description="Select a submitted configuration."
                  compact
                />
              ) : (
                <>
                  <RuleSummary rule={selectedRule} />
                  {selectedRule.lifecycleStatus === "PENDING_APPROVAL" ? (
                    <div className="flex flex-wrap gap-2">
                      <PlatformProcessingButton
                        type="button"
                        isProcessing={isPending}
                        processingLabel="Approving…"
                        idleLabel="Approve"
                        onClick={() =>
                          runAction("Approved", () =>
                            approveCommercialRuleAction(
                              selectedRule.ruleVersionId
                            )
                          )
                        }
                      >
                        Approve
                      </PlatformProcessingButton>
                      <div className="flex min-w-[220px] flex-1 flex-col gap-2">
                        <Input
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Rejection reason (required)"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isPending || !rejectReason.trim()}
                          onClick={() =>
                            runAction("Rejected", () =>
                              rejectCommercialRuleAction(
                                selectedRule.ruleVersionId,
                                rejectReason
                              )
                            )
                          }
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Current status: {selectedRule.lifecycleStatus}. Approval
                      actions apply when status is PENDING_APPROVAL.
                    </p>
                  )}
                </>
              )}
            </div>
          ) : null}

          {workspace && activeStep === "review" ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">4. Activation</h2>
                <p className="text-sm text-muted-foreground">
                  Activate only after approval and when the effective date has
                  been reached. Suspend with justification when needed.
                </p>
              </div>
              {!selectedRule ? (
                <PlatformEmptyState
                  title="No approved configuration"
                  description="Complete approval first."
                  compact
                />
              ) : (
                <>
                  <RuleSummary rule={selectedRule} />
                  {selectedRule.lifecycleStatus === "APPROVED" ? (
                    <PlatformProcessingButton
                      type="button"
                      isProcessing={isPending}
                      processingLabel="Activating…"
                      idleLabel="Activate"
                      onClick={() =>
                        runAction("Activated", () =>
                          activateCommercialRuleAction(
                            selectedRule.ruleVersionId
                          )
                        )
                      }
                    >
                      Activate
                    </PlatformProcessingButton>
                  ) : null}
                  {selectedRule.lifecycleStatus === "ACTIVE" ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        value={suspendReason}
                        onChange={(e) => setSuspendReason(e.target.value)}
                        placeholder="Suspension reason (required)"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isPending || !suspendReason.trim()}
                        onClick={() =>
                          runAction("Suspended", () =>
                            suspendCommercialRuleAction(
                              selectedRule.ruleVersionId,
                              suspendReason
                            )
                          )
                        }
                      >
                        Suspend
                      </Button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ) : null}

          {historyEvents.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Governance history</h3>
              <div className="overflow-x-auto rounded-lg border">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="px-3 py-2">When</th>
                      <th className="px-3 py-2">Event</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyEvents.map((event) => (
                      <tr key={event.eventId} className="border-t">
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {event.performedAt}
                        </td>
                        <td className="px-3 py-2">{event.eventType}</td>
                        <td className="px-3 py-2">
                          {event.afterStatus ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {event.reason ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <PlatformFormActionFooter
            result={actionResult}
            isProcessing={isPending}
            processingLabel="Working…"
            onDismiss={() => setActionResult(null)}
          >
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={goPrevious}
                disabled={activeStep === "base-price" || isPending}
              >
                Previous
              </Button>
              <Button
                type="button"
                onClick={goNext}
                disabled={
                  isPending ||
                  STEP_ORDER.indexOf(activeStep) === STEP_ORDER.length - 1
                }
              >
                Next
              </Button>
            </div>
          </PlatformFormActionFooter>
        </section>

        <aside className="platform-workspace-guidance-column space-y-4 p-4">
          <h2 className="text-sm font-semibold">Where you are</h2>
          <p className="text-sm text-muted-foreground">
            {guidanceCopy(activeStep)}
          </p>
          <h2 className="text-sm font-semibold">Policy</h2>
          {workspace ? (
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>
                Approval required:{" "}
                {workspace.policy.approvalRequired ? "Yes" : "No"}
              </li>
              <li>
                Segregation of duties:{" "}
                {workspace.policy.requiresSegregationOfDuties ? "Yes" : "No"}
              </li>
              <li>
                Overrides allowed:{" "}
                {workspace.policy.allowOverride ? "Yes" : "No"}
              </li>
            </ul>
          ) : null}
          <h2 className="text-sm font-semibold">What to do next</h2>
          <p className="text-sm text-muted-foreground">
            {nextCopy(activeStep, selectedRule)}
          </p>
        </aside>
      </div>
    </main>
  );
}

function RuleSummary({ rule }: { rule: CommercialRuleVersionView }) {
  return (
    <dl className="grid gap-2 rounded-lg border p-3 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-muted-foreground">Label</dt>
        <dd className="font-medium">{rule.label}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Status</dt>
        <dd>{statusBadge(rule.lifecycleStatus)}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Version</dt>
        <dd className="font-medium">v{rule.versionNumber}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Currency</dt>
        <dd className="font-medium">{rule.currencyCode ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Effective from</dt>
        <dd className="font-medium">{rule.effectiveFrom ?? "Immediate"}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Rule key</dt>
        <dd className="font-mono text-xs">{rule.ruleKey}</dd>
      </div>
    </dl>
  );
}

function guidanceCopy(step: GovernanceStepId): string {
  switch (step) {
    case "base-price":
      return "Create or select a commercial configuration. Drafts are not used in production resolution.";
    case "components":
      return "Review the draft payload. Submit material configurations for checker approval.";
    case "tax":
      return "Maker/checker separation applies. Approvers cannot approve their own submissions when SoD is enabled.";
    case "review":
      return "Activation respects effective dating. Confirmed commercial results are not rewritten when rules change.";
  }
}

function nextCopy(
  step: GovernanceStepId,
  rule: CommercialRuleVersionView | null
): string {
  switch (step) {
    case "base-price":
      return "Create a draft, then continue to Review.";
    case "components":
      return rule
        ? "Submit for approval, or go back to amend the draft."
        : "Select a configuration first.";
    case "tax":
      return "Approve or reject with a reason, then continue to Activation.";
    case "review":
      return "Activate when effective, or suspend an active rule with justification.";
  }
}
