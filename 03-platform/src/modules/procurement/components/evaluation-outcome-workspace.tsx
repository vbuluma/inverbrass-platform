"use client";

/**
 * Purpose:
 * Evaluation outcome workspace — commercial journey from budget to award.
 */

import { useState, useTransition, type FormEvent } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  answerClarificationAction,
  awardSourcingAction,
  closeTenderAction,
  configureEvaluationCriteriaAction,
  extendTenderAction,
  inviteSupplierAction,
  lockEvaluationCriteriaAction,
  approveAwardAction,
  openBidsAction,
  recordDueDiligenceAction,
  recordPhaseScoresAction,
  recordSupplierQuoteAction,
  setupEvaluationCommitteeAction,
  startEvaluationAction,
} from "@/modules/procurement/actions/sourcing-actions";
import type {
  EvaluationWorkspaceView,
  SupplierListView,
} from "@/modules/procurement/types";

type EvaluationOutcomeWorkspaceProps = {
  initial: EvaluationWorkspaceView;
  suppliers: SupplierListView[];
  invitationRanks?: Record<string, number>;
};

const PHASE_LABELS: Record<string, string> = {
  DESKTOP: "Desktop",
  DEMO: "Demo",
  POC: "Proof of concept",
  REFERENCE: "Reference call",
  SITE_VISIT: "Site visit",
};

const DEFAULT_PHASES = [
  { phaseCode: "DESKTOP", included: true, sequence: 1, weight: "100", passmark: "0", required: true },
  { phaseCode: "DEMO", included: false, sequence: 2, weight: "0", passmark: "0", required: false },
  { phaseCode: "POC", included: false, sequence: 3, weight: "0", passmark: "0", required: false },
  { phaseCode: "REFERENCE", included: false, sequence: 4, weight: "0", passmark: "0", required: false },
  { phaseCode: "SITE_VISIT", included: false, sequence: 5, weight: "0", passmark: "0", required: false },
];

function OutcomeBlock({
  title,
  partyName,
  labels,
  overBudget,
}: {
  title: string;
  partyName: string;
  labels: EvaluationWorkspaceView["comparison"][number]["labels"];
  overBudget: boolean;
}) {
  return (
    <section className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {overBudget ? (
          <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-800 ring-1 ring-red-200">
            Over Budget
          </span>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground">Supplier: {partyName}</p>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div className="flex justify-between gap-4 sm:block">
          <dt className="text-muted-foreground">Budgeted Amount</dt>
          <dd className="font-medium">{labels.budgetedAmount}</dd>
        </div>
        <div className="flex justify-between gap-4 sm:block">
          <dt className="text-muted-foreground">Initial Quote</dt>
          <dd className="font-medium">{labels.initialQuote}</dd>
        </div>
        <div className="flex justify-between gap-4 sm:block">
          <dt className="text-muted-foreground">Final Quote</dt>
          <dd className="font-medium">{labels.finalQuote}</dd>
        </div>
        <div className="flex justify-between gap-4 sm:block">
          <dt className="text-muted-foreground">Budgeted Savings</dt>
          <dd className="font-medium">{labels.budgetedSavings}</dd>
        </div>
        <div className="flex justify-between gap-4 sm:block">
          <dt className="text-muted-foreground">Negotiated Savings</dt>
          <dd className="font-medium">{labels.negotiatedSavings}</dd>
        </div>
        <div className="flex justify-between gap-4 sm:block">
          <dt className="text-muted-foreground">Awarded Amount</dt>
          <dd className="font-medium">{labels.awardedAmount}</dd>
        </div>
        <div className="flex justify-between gap-4 sm:block">
          <dt className="text-muted-foreground">Savings</dt>
          <dd className="font-medium">{labels.savingsPercentage}</dd>
        </div>
      </dl>
    </section>
  );
}

export function EvaluationOutcomeWorkspace({
  initial,
  suppliers,
  invitationRanks = {},
}: EvaluationOutcomeWorkspaceProps) {
  const [event, setEvent] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [profileId, setProfileId] = useState(suppliers[0]?.id ?? "");
  const [quoteProfileId, setQuoteProfileId] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [recommendation, setRecommendation] = useState(initial.recommendation ?? "");
  const [extendClosesAt, setExtendClosesAt] = useState("");
  const [extendReason, setExtendReason] = useState("");
  const [awardProfileIds, setAwardProfileIds] = useState<string[]>([]);
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [committeeMemberName, setCommitteeMemberName] = useState("");
  const [committeeRole, setCommitteeRole] = useState("Evaluator");
  const [evaluationMethod, setEvaluationMethod] = useState(initial.evaluationMethod);
  const [technicalWeight, setTechnicalWeight] = useState(initial.technicalWeight);
  const [financialWeight, setFinancialWeight] = useState(initial.financialWeight);
  const [financialBasis, setFinancialBasis] = useState(initial.financialBasis);
  const [criteriaPhases, setCriteriaPhases] = useState(
    initial.phases.length > 0
      ? initial.phases.map((row) => ({
          phaseCode: row.phaseCode,
          included: row.included,
          sequence: row.sequence,
          weight: row.weight,
          passmark: row.passmark,
          required: row.required,
        }))
      : DEFAULT_PHASES.map((row) => ({ ...row }))
  );
  const [dueDiligenceRequired, setDueDiligenceRequired] = useState<boolean | null>(
    initial.dueDiligenceRequired
  );
  const [locationVerified, setLocationVerified] = useState(initial.dueDiligenceLocationVerified);
  const [staffVerified, setStaffVerified] = useState(initial.dueDiligenceStaffVerified);
  const [legalVerified, setLegalVerified] = useState(initial.dueDiligenceLegalVerified);
  const [dueDiligenceOther, setDueDiligenceOther] = useState(initial.dueDiligenceOtherNotes ?? "");
  const [clarificationAnswer, setClarificationAnswer] = useState<Record<string, string>>({});
  const [openingApprovedBy, setOpeningApprovedBy] = useState("");
  const [phaseScoreProfileId, setPhaseScoreProfileId] = useState("");
  const [phaseScores, setPhaseScores] = useState<Record<string, string>>({});
  const [overrideReason, setOverrideReason] = useState("");
  const showWeights = evaluationMethod === "BEST_OVERALL";
  const recommendedIds = new Set(event.recommendedProfileIds);

  function apply(next: EvaluationWorkspaceView) {
    setEvent(next);
    setError(null);
    setRecommendation(next.recommendation ?? "");
  }

  function run(action: () => Promise<{ success: boolean; data?: EvaluationWorkspaceView; error?: { message: string } }>) {
    startTransition(async () => {
      const result = await action();
      if (!result.success || !result.data) {
        setError(result.error?.message ?? "The action could not be completed.");
        return;
      }
      apply(result.data);
    });
  }

  const invitedIds = new Set(event.invitations.map((row) => row.profileId));
  const availableSuppliers = suppliers.filter((row) => !invitedIds.has(row.id));
  const outcomeSupplier = event.awards[0] ?? event.comparison[0] ?? null;

  function toggleAward(id: string) {
    setAwardProfileIds((current) =>
      current.includes(id) ? current.filter((row) => row !== id) : [...current, id]
    );
  }

  function onAward(formEvent: FormEvent) {
    formEvent.preventDefault();
    const deviates =
      event.recommendedProfileIds.length > 0 &&
      (awardProfileIds.length !== event.recommendedProfileIds.length ||
        awardProfileIds.some((id) => !recommendedIds.has(id)));
    run(() =>
      awardSourcingAction(event.id, {
        recommendation,
        overrideReason: deviates ? overrideReason || null : null,
        awards: awardProfileIds.map((id) => ({
          profileId: id,
          allocatedBudgetAmount: allocations[id] || null,
        })),
      })
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/procurement/sourcing" label="RFX" />
      <div>
        <p className="text-sm text-muted-foreground">{event.eventNumber}</p>
        <h1 className="text-2xl font-semibold">{event.title}</h1>
        <p className="text-sm text-muted-foreground">
          {event.rfxType} · Budget {event.budgetedAmountLabel}
          {event.purchaseRequestNumbers.length
            ? ` · ${event.purchaseRequestNumbers.join(", ")}`
            : ""}
        </p>
        <p className="text-sm text-muted-foreground">
          Closes {new Date(event.closesAt).toLocaleString()}
          {event.biddingOpen ? " · Bidding open" : " · Bidding closed"}
          {" · "}
          {event.statusLabel} — {event.evaluationStageLabel}
        </p>
      </div>

      <section className="rounded-lg border p-4 text-sm">
        <h2 className="mb-2 font-semibold">Evaluation progress</h2>
        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>Tender closed (bids received)</li>
          <li>Set up evaluation committee</li>
          <li>Set evaluation criteria</li>
          <li>Start evaluation</li>
          <li>Open bids</li>
          <li>Score technical phases</li>
          <li>Due diligence (before award recommendation)</li>
          <li>Award recommendation</li>
          {event.awardRequiresApproval ? <li>Award approval (when configured)</li> : null}
        </ol>
      </section>

      {event.awardApprovalStatus === "PENDING" ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
          <h2 className="font-semibold text-amber-900">Award approval required</h2>
          <p className="text-amber-800">
            The award recommendation has been submitted and is awaiting approval before purchase
            orders can be created.
          </p>
        </section>
      ) : null}

      {event.status === "AWARDED" && event.awardApprovalStatus === "APPROVED" ? (
        <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm">
          <h2 className="font-semibold text-emerald-900">Award approved</h2>
          <p className="text-emerald-800">
            The award decision is approved. Purchase orders may now be generated from this award.
          </p>
        </section>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <section className="space-y-2 rounded-lg border p-4 text-sm">
        <h2 className="font-semibold">RFX controls</h2>
        <dl className="grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Opening policy</dt>
            <dd className="font-medium">{event.openingPolicyLabel}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Evaluation method</dt>
            <dd className="font-medium">{event.evaluationMethodLabel}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Financial basis</dt>
            <dd className="font-medium">{event.financialBasis}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Risk level</dt>
            <dd className="font-medium">{event.riskLevel}</dd>
          </div>
          {event.awardRequiresApproval ? (
            <div>
              <dt className="text-muted-foreground">Award approval</dt>
              <dd className="font-medium">Maker-checker required before PO generation</dd>
            </div>
          ) : null}
        </dl>
        {event.phases.some((row) => row.included) ? (
          <ul className="space-y-1 text-muted-foreground">
            {event.phases
              .filter((row) => row.included)
              .map((row) => (
                <li key={row.phaseCode}>
                  {row.phaseLabel}
                  {row.required ? " (required)" : ""}
                </li>
              ))}
          </ul>
        ) : null}
      </section>

      {event.canExtend ? (
        <section className="space-y-3 rounded-lg border p-4">
          <h2 className="font-semibold">Extend tender</h2>
          <p className="text-sm text-muted-foreground">
            {event.extensionRequiresApproval
              ? "An approver must extend the closing date."
              : "Move the closing date later while the RFX is still open."}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="extendClosesAt">New closing date</Label>
              <Input
                id="extendClosesAt"
                type="datetime-local"
                value={extendClosesAt}
                onChange={(change) => setExtendClosesAt(change.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="extendReason">Reason (optional)</Label>
              <Input
                id="extendReason"
                value={extendReason}
                onChange={(change) => setExtendReason(change.target.value)}
              />
            </div>
          </div>
          <Button
            type="button"
            disabled={isPending || !extendClosesAt}
            onClick={() =>
              run(() =>
                extendTenderAction(event.id, {
                  closesAt: new Date(extendClosesAt).toISOString(),
                  reason: extendReason || undefined,
                })
              )
            }
          >
            Extend tender
          </Button>
        </section>
      ) : null}

      {event.canInvite ? (
        <section className="space-y-3 rounded-lg border p-4">
          <h2 className="font-semibold">Invite supplier</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={profileId}
              onChange={(change) => setProfileId(change.target.value)}
              className="h-10 flex-1 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Select supplier</option>
              {availableSuppliers.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.partyName}
                  {invitationRanks[row.id] === 1 ? " (recommended)" : ""}
                  {invitationRanks[row.id] && invitationRanks[row.id] > 1
                    ? ` (#${invitationRanks[row.id]})`
                    : ""}
                </option>
              ))}
            </select>
            <Button
              type="button"
              disabled={isPending || !profileId}
              onClick={() => run(() => inviteSupplierAction(event.id, { profileId }))}
            >
              Invite
            </Button>
          </div>
          {event.invitations.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {event.invitations.map((row) => (
                <li key={row.profileId}>
                  {row.partyName} — {row.responseStatusLabel}
                  {row.openedAt ? " · opened" : ""}
                  {row.hasSubmitted ? " · submitted" : ""}
                  {row.withdrawn ? " · withdrawn" : ""}
                  {" — "}
                  <code className="break-all text-xs">/sourcing/respond/{row.accessToken}</code>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : event.invitations.length > 0 || (event.commercialSealed && event.bidsReceivedCount > 0) ? (
        <section className="space-y-2 rounded-lg border p-4">
          <h2 className="font-semibold">Supplier invitations</h2>
          {event.commercialSealed ? (
            <p className="text-sm text-muted-foreground">
              Commercial responses are sealed until bids are opened under the configured opening
              policy.
            </p>
          ) : null}
          {event.commercialSealed && event.bidSubmissionCountVisible ? (
            <p className="text-sm font-medium">
              Bids received: {event.bidsReceivedCount}
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {event.invitations.map((row) => (
                <li key={row.profileId}>
                  {row.partyName} — {row.responseStatusLabel}
                  {row.openedAt ? " · opened" : ""}
                  {row.hasSubmitted ? " · submitted" : ""}
                  {row.withdrawn ? " · withdrawn" : ""}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {event.canCloseTender ? (
        <section className="space-y-3 rounded-lg border p-4">
          <h2 className="font-semibold">1. Close tender</h2>
          <p className="text-sm text-muted-foreground">
            Confirm bids are received and lock the tender before evaluation setup.
          </p>
          <Button type="button" disabled={isPending} onClick={() => run(() => closeTenderAction(event.id))}>
            Close tender
          </Button>
        </section>
      ) : null}

      {event.canSetupCommittee ? (
        <section className="space-y-3 rounded-lg border p-4">
          <h2 className="font-semibold">2. Evaluation committee</h2>
          <p className="text-sm text-muted-foreground">Add at least one committee member.</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <Input
              value={committeeMemberName}
              onChange={(change) => setCommitteeMemberName(change.target.value)}
              placeholder="Member name"
            />
            <Input
              value={committeeRole}
              onChange={(change) => setCommitteeRole(change.target.value)}
              placeholder="Role"
            />
            <Button
              type="button"
              disabled={isPending || !committeeMemberName.trim()}
              onClick={() =>
                run(() =>
                  setupEvaluationCommitteeAction(event.id, {
                    members: [{ memberName: committeeMemberName.trim(), roleLabel: committeeRole }],
                  })
                )
              }
            >
              Save committee
            </Button>
          </div>
        </section>
      ) : event.committeeMembers.length > 0 ? (
        <section className="space-y-2 rounded-lg border p-4">
          <h2 className="font-semibold">Evaluation committee</h2>
          <ul className="text-sm">
            {event.committeeMembers.map((row) => (
              <li key={row.id}>
                {row.memberName}
                {row.roleLabel ? ` — ${row.roleLabel}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {event.canConfigureCriteria ? (
        <section className="space-y-3 rounded-lg border p-4">
          <h2 className="font-semibold">3. Evaluation criteria</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="evaluationMethod">Method</Label>
              <select
                id="evaluationMethod"
                value={evaluationMethod}
                onChange={(change) => setEvaluationMethod(change.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="LOWEST_COMPLIANT">Lowest compliant quote</option>
                <option value="BEST_OVERALL">Best overall score</option>
                <option value="MANUAL">Manual evaluation</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="financialBasis">Financial basis</Label>
              <select
                id="financialBasis"
                value={financialBasis}
                onChange={(change) => setFinancialBasis(change.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="YEAR_1">Year 1</option>
                <option value="TCV">Total contract value</option>
                <option value="TCO">Total cost of ownership</option>
              </select>
            </div>
          </div>
          {showWeights ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                value={technicalWeight}
                onChange={(change) => setTechnicalWeight(change.target.value)}
                placeholder="Technical weight %"
              />
              <Input
                value={financialWeight}
                onChange={(change) => setFinancialWeight(change.target.value)}
                placeholder="Financial weight %"
              />
            </div>
          ) : null}
          {evaluationMethod !== "MANUAL" ? (
            <div className="space-y-2">
              {criteriaPhases.map((row) => (
                <label key={row.phaseCode} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={row.included}
                    onChange={() =>
                      setCriteriaPhases((current) =>
                        current.map((phase) =>
                          phase.phaseCode === row.phaseCode
                            ? { ...phase, included: !phase.included }
                            : phase
                        )
                      )
                    }
                  />
                  {PHASE_LABELS[row.phaseCode] ?? row.phaseCode}
                </label>
              ))}
            </div>
          ) : null}
          <Button
            type="button"
            disabled={isPending}
            onClick={() =>
              run(() =>
                configureEvaluationCriteriaAction(event.id, {
                  evaluationMethod,
                  technicalWeight,
                  financialWeight,
                  financialBasis,
                  phases: criteriaPhases,
                })
              )
            }
          >
            Save evaluation criteria
          </Button>
        </section>
      ) : event.methodologyExplanation ? (
        <section className="space-y-2 rounded-lg border p-4">
          <h2 className="font-semibold">Evaluation criteria (locked)</h2>
          <p className="text-sm text-muted-foreground">{event.methodologyExplanation}</p>
          {event.criteriaSnapshotHash ? (
            <p className="text-xs text-muted-foreground">
              Criteria reference: {event.criteriaSnapshotHash.slice(0, 12)}…
            </p>
          ) : null}
        </section>
      ) : null}

      {event.canLockCriteria ? (
        <section className="space-y-3 rounded-lg border p-4">
          <h2 className="font-semibold">4. Lock evaluation criteria</h2>
          <p className="text-sm text-muted-foreground">
            Lock the committee-approved criteria before bids can be opened. Locked criteria cannot be
            changed for this RFX.
          </p>
          <Button
            type="button"
            disabled={isPending}
            onClick={() => run(() => lockEvaluationCriteriaAction(event.id))}
          >
            Lock criteria
          </Button>
        </section>
      ) : null}

      {event.canStartEvaluation ? (
        <section className="space-y-3 rounded-lg border p-4">
          <h2 className="font-semibold">5. Start evaluation</h2>
          <p className="text-sm text-muted-foreground">
            Begin the evaluation phase. Commercial comparison unlocks after bids are opened.
          </p>
          <Button type="button" disabled={isPending} onClick={() => run(() => startEvaluationAction(event.id))}>
            Start evaluation
          </Button>
        </section>
      ) : null}

      {event.canOpenBids ? (
        <section className="space-y-3 rounded-lg border p-4">
          <h2 className="font-semibold">6. Open bids</h2>
          <p className="text-sm text-muted-foreground">
            {event.openingRequiresChecker
              ? "Maker-checker opening: a different approver must confirm before commercial details are visible."
              : "Open bids to view commercial comparison and scoring."}
          </p>
          {event.openingRequiresChecker ? (
            <div className="space-y-2">
              <Label htmlFor="openingApprovedBy">Opening approver user ID</Label>
              <Input
                id="openingApprovedBy"
                value={openingApprovedBy}
                onChange={(change) => setOpeningApprovedBy(change.target.value)}
                placeholder="Approver platform user ID"
              />
            </div>
          ) : null}
          <Button
            type="button"
            disabled={isPending || (event.openingRequiresChecker && !openingApprovedBy.trim())}
            onClick={() =>
              run(() =>
                openBidsAction(event.id, {
                  openingApprovedBy: openingApprovedBy.trim() || null,
                })
              )
            }
          >
            Open bids
          </Button>
        </section>
      ) : event.bidsOpenedAt ? (
        <section className="space-y-2 rounded-lg border p-4 text-sm">
          <h2 className="font-semibold">Bids opened</h2>
          <p className="text-muted-foreground">
            Opened {new Date(event.bidsOpenedAt).toLocaleString()} under {event.openingPolicyLabel}.
          </p>
        </section>
      ) : null}

      {event.canRecordPhaseScores && event.phases.some((row) => row.included) ? (
        <section className="space-y-3 rounded-lg border p-4">
          <h2 className="font-semibold">7. Technical phase scores</h2>
          <p className="text-sm text-muted-foreground">
            Record evaluator scores for each supplier against the locked technical phases.
          </p>
          <select
            value={phaseScoreProfileId}
            onChange={(change) => {
              setPhaseScoreProfileId(change.target.value);
              setPhaseScores({});
            }}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm sm:max-w-xs"
          >
            <option value="">Select supplier</option>
            {event.comparison.map((row) => (
              <option key={row.profileId} value={row.profileId}>
                {row.partyName}
              </option>
            ))}
          </select>
          {phaseScoreProfileId ? (
            <div className="space-y-2">
              {event.phases
                .filter((row) => row.included)
                .map((row) => (
                  <div key={row.phaseCode} className="flex items-center gap-2 text-sm">
                    <span className="w-40">{row.phaseLabel}</span>
                    <Input
                      value={phaseScores[row.phaseCode] ?? ""}
                      onChange={(change) =>
                        setPhaseScores((current) => ({
                          ...current,
                          [row.phaseCode]: change.target.value,
                        }))
                      }
                      placeholder="Score"
                      className="max-w-28"
                    />
                  </div>
                ))}
            </div>
          ) : null}
          <Button
            type="button"
            disabled={isPending || !phaseScoreProfileId}
            onClick={() =>
              run(() =>
                recordPhaseScoresAction(event.id, {
                  profileId: phaseScoreProfileId,
                  scores: event.phases
                    .filter((row) => row.included)
                    .map((row) => ({
                      phaseCode: row.phaseCode,
                      score: phaseScores[row.phaseCode] ?? "0",
                    })),
                })
              )
            }
          >
            Save phase scores
          </Button>
        </section>
      ) : null}

      {event.canRecordQuote && event.invitations.length > 0 ? (
        <section className="space-y-3 rounded-lg border p-4">
          <h2 className="font-semibold">Capture response for supplier</h2>
          <p className="text-sm text-muted-foreground">
            Recorded on behalf of the supplier. Version 1 is the initial quote.
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            <select
              value={quoteProfileId}
              onChange={(change) => setQuoteProfileId(change.target.value)}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Supplier</option>
              {event.invitations.map((row) => (
                <option key={row.profileId} value={row.profileId}>
                  {row.partyName}
                </option>
              ))}
            </select>
            <Input
              value={quoteAmount}
              onChange={(change) => setQuoteAmount(change.target.value)}
              placeholder="Amount"
            />
            <Button
              type="button"
              disabled={isPending || !quoteProfileId || !quoteAmount}
              onClick={() =>
                run(() =>
                  recordSupplierQuoteAction(event.id, {
                    profileId: quoteProfileId,
                    amount: quoteAmount,
                  })
                )
              }
            >
              Save quote
            </Button>
          </div>
        </section>
      ) : null}

      {event.clarifications.length > 0 ? (
        <section className="space-y-2 rounded-lg border p-4">
          <h2 className="font-semibold">RFX clarifications</h2>
          <p className="text-sm text-muted-foreground">
            Questions and answers are published to all invited suppliers on this RFX.
          </p>
          <ul className="space-y-3 text-sm">
            {event.clarifications.map((row) => (
              <li key={row.id} className="rounded-md border p-3">
                {row.partyName ? (
                  <p className="text-xs text-muted-foreground">{row.partyName}</p>
                ) : null}
                <p className="font-medium">Q: {row.question}</p>
                {row.answer ? (
                  <p className="mt-1 text-muted-foreground">A: {row.answer}</p>
                ) : event.canConfigureCriteria || event.canStartEvaluation || !event.commercialSealed ? (
                  <form
                    className="mt-2 flex gap-2"
                    onSubmit={(formEvent) => {
                      formEvent.preventDefault();
                      const answer = clarificationAnswer[row.id]?.trim() ?? "";
                      if (!answer) {
                        return;
                      }
                      run(() =>
                        answerClarificationAction(event.id, {
                          clarificationId: row.id,
                          answer,
                        })
                      );
                    }}
                  >
                    <Input
                      value={clarificationAnswer[row.id] ?? ""}
                      onChange={(change) =>
                        setClarificationAnswer((current) => ({
                          ...current,
                          [row.id]: change.target.value,
                        }))
                      }
                      placeholder="Buyer answer (published to all suppliers)"
                    />
                    <Button type="submit" disabled={isPending}>
                      Answer
                    </Button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!event.commercialSealed && event.comparison.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Evaluation Comparison</h2>
          {event.recommendedProfileIds.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              System recommendation:{" "}
              {event.comparison
                .filter((row) => recommendedIds.has(row.profileId))
                .map((row) => row.partyName)
                .join(", ") || "None"}
            </p>
          ) : null}
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium"> </th>
                  {event.comparison.map((row) => (
                    <th key={row.profileId} className="px-3 py-2 font-medium">
                      {row.partyName}
                      {row.recommended ? (
                        <span className="ml-2 text-xs text-emerald-800">Recommended</span>
                      ) : null}
                      {row.finalExceedsInitial ? (
                        <span className="ml-2 text-xs text-amber-800">Final above initial</span>
                      ) : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["Budgeted Amount", "budgetedAmount"],
                  ["Initial Quote", "initialQuote"],
                  ["Final Quote", "finalQuote"],
                  ["Budgeted Savings", "budgetedSavings"],
                  ["Negotiated Savings", "negotiatedSavings"],
                  ["Savings %", "savingsPercentage"],
                ].map(([label, key]) => (
                  <tr key={key} className="border-t">
                    <th className="px-3 py-2 font-medium">{label}</th>
                    {event.comparison.map((row) => (
                      <td key={`${row.profileId}-${key}`} className="px-3 py-2">
                        {row.labels[key as keyof typeof row.labels]}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-t">
                  <th className="px-3 py-2 font-medium">Technical score</th>
                  {event.comparison.map((row) => (
                    <td key={`${row.profileId}-tech`} className="px-3 py-2">
                      {row.technicalScore ?? "—"}
                    </td>
                  ))}
                </tr>
                <tr className="border-t">
                  <th className="px-3 py-2 font-medium">Financial score</th>
                  {event.comparison.map((row) => (
                    <td key={`${row.profileId}-fin`} className="px-3 py-2">
                      {row.financialScore ?? "—"}
                    </td>
                  ))}
                </tr>
                <tr className="border-t">
                  <th className="px-3 py-2 font-medium">Overall score</th>
                  {event.comparison.map((row) => (
                    <td key={`${row.profileId}-overall`} className="px-3 py-2">
                      {row.overallScore ?? "—"}
                    </td>
                  ))}
                </tr>
                <tr className="border-t">
                  <th className="px-3 py-2 font-medium">Rank</th>
                  {event.comparison.map((row) => (
                    <td key={`${row.profileId}-rank`} className="px-3 py-2">
                      {row.rank ?? "—"}
                    </td>
                  ))}
                </tr>
                <tr className="border-t">
                  <th className="px-3 py-2 font-medium">Award</th>
                  {event.comparison.map((row) => (
                    <td key={`${row.profileId}-award`} className="px-3 py-2">
                      {row.awarded ? "YES" : "NO"}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {event.awards.length > 0
        ? event.awards.map((award) => (
            <OutcomeBlock
              key={award.profileId}
              title={event.awards.length > 1 ? "Award" : "Evaluation Outcome"}
              partyName={award.partyName}
              labels={award.labels}
              overBudget={award.outcome.overBudget}
            />
          ))
        : outcomeSupplier ? (
            <OutcomeBlock
              title="Evaluation Outcome"
              partyName={outcomeSupplier.partyName}
              labels={outcomeSupplier.labels}
              overBudget={outcomeSupplier.outcome.overBudget}
            />
          ) : null}

      {event.canRecordDueDiligence ? (
        <section className="space-y-3 rounded-lg border p-4">
          <h2 className="font-semibold">7. Due diligence</h2>
          <p className="text-sm text-muted-foreground">
            Record whether due diligence is required before the award recommendation.
          </p>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="dueDiligence"
                checked={dueDiligenceRequired === true}
                onChange={() => setDueDiligenceRequired(true)}
              />
              Yes
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="dueDiligence"
                checked={dueDiligenceRequired === false}
                onChange={() => setDueDiligenceRequired(false)}
              />
              No
            </label>
          </div>
          {dueDiligenceRequired ? (
            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={locationVerified}
                  onChange={(change) => setLocationVerified(change.target.checked)}
                />
                Location verified
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={staffVerified}
                  onChange={(change) => setStaffVerified(change.target.checked)}
                />
                Staff verified
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={legalVerified}
                  onChange={(change) => setLegalVerified(change.target.checked)}
                />
                Legal requirements verified
              </label>
              <div className="space-y-2">
                <Label htmlFor="dueDiligenceOther">Others</Label>
                <Input
                  id="dueDiligenceOther"
                  value={dueDiligenceOther}
                  onChange={(change) => setDueDiligenceOther(change.target.value)}
                  placeholder="Other due diligence notes"
                />
              </div>
            </div>
          ) : null}
          <Button
            type="button"
            disabled={isPending || dueDiligenceRequired === null}
            onClick={() =>
              run(() =>
                recordDueDiligenceAction(event.id, {
                  required: Boolean(dueDiligenceRequired),
                  locationVerified,
                  staffVerified,
                  legalVerified,
                  otherNotes: dueDiligenceOther || null,
                })
              )
            }
          >
            Save due diligence
          </Button>
        </section>
      ) : event.dueDiligenceComplete ? (
        <section className="space-y-2 rounded-lg border p-4 text-sm">
          <h2 className="font-semibold">Due diligence</h2>
          <p>
            {event.dueDiligenceRequired
              ? "Required — location, staff, and legal checks recorded."
              : "Not required for this award."}
          </p>
          {event.dueDiligenceOtherNotes ? (
            <p className="text-muted-foreground">Others: {event.dueDiligenceOtherNotes}</p>
          ) : null}
        </section>
      ) : null}

      {event.canApproveAward ? (
        <section className="space-y-3 rounded-lg border p-4">
          <h2 className="font-semibold">9. Approve award</h2>
          <p className="text-sm text-muted-foreground">
            Maker-checker: a different authorised approver must confirm the award recommendation
            before purchase orders can be created.
          </p>
          <Button
            type="button"
            disabled={isPending}
            onClick={() => run(() => approveAwardAction(event.id))}
          >
            Approve award
          </Button>
        </section>
      ) : null}

      {event.canAward && event.comparison.length > 0 ? (
        <form onSubmit={onAward} className="space-y-3 rounded-lg border p-4">
          <h2 className="font-semibold">8. Award recommendation</h2>
          <div className="space-y-2">
            <Label htmlFor="recommendation">Recommendation</Label>
            <textarea
              id="recommendation"
              value={recommendation}
              onChange={(change) => setRecommendation(change.target.value)}
              className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          {event.comparison.map((row) => (
            <label key={row.profileId} className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center">
              <span className="flex items-center gap-2 sm:w-56">
                <input
                  type="checkbox"
                  checked={awardProfileIds.includes(row.profileId)}
                  onChange={() => toggleAward(row.profileId)}
                />
                {row.partyName}
              </span>
              {awardProfileIds.length > 1 ? (
                <Input
                  value={allocations[row.profileId] ?? ""}
                  onChange={(change) =>
                    setAllocations((current) => ({
                      ...current,
                      [row.profileId]: change.target.value,
                    }))
                  }
                  placeholder="Allocated budget"
                  className="max-w-xs"
                />
              ) : null}
            </label>
          ))}
          {event.recommendedProfileIds.length > 0 &&
          (awardProfileIds.length !== event.recommendedProfileIds.length ||
            awardProfileIds.some((id) => !recommendedIds.has(id))) ? (
            <div className="space-y-2">
              <Label htmlFor="overrideReason">Override reason</Label>
              <textarea
                id="overrideReason"
                value={overrideReason}
                onChange={(change) => setOverrideReason(change.target.value)}
                className="min-h-16 w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Explain why the award differs from the system recommendation"
              />
            </div>
          ) : null}
          <Button type="submit" disabled={isPending || awardProfileIds.length === 0}>
            {isPending ? "Recording…" : "Record award"}
          </Button>
        </form>
      ) : null}

      {event.status === "AWARDED" && event.recommendation ? (
        <p className="text-sm text-muted-foreground">Recommendation: {event.recommendation}</p>
      ) : null}
    </main>
  );
}
