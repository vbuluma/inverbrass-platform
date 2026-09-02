"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformTabs } from "@/components/platform";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  changeProcurementStatusAction,
  recordProcurementQualificationAction,
  setProcurementPreferredAction,
  updateProcurementProfileAction,
} from "@/modules/procurement/actions/procurement-actions";
import { SupplierPerformanceReviewPanel } from "@/modules/procurement/components/supplier-performance-review-panel";
import { SupplierGovernancePanel } from "@/modules/procurement/components/supplier-governance-panel";
import { SupplierScorecardPanel } from "@/modules/procurement/components/supplier-scorecard-panel";
import { PROCUREMENT_STATUS_CODES } from "@/modules/procurement/constants";
import type {
  ProcurementCataloguesView,
  SupplierProfilePerformanceView,
  SupplierProfileView,
  SupplierScorecardView,
} from "@/modules/procurement/types";

type SupplierProfileWorkspaceProps = {
  initial: SupplierProfileView;
  catalogues: ProcurementCataloguesView;
  performance: SupplierProfilePerformanceView;
};

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "performance", label: "Performance" },
  { id: "qualification", label: "Qualification" },
  { id: "classification", label: "Categories & Capabilities" },
  { id: "documents", label: "Documents" },
  { id: "activity", label: "Activity" },
];

export function SupplierProfileWorkspace({
  initial,
  catalogues,
  performance: initialPerformance,
}: SupplierProfileWorkspaceProps) {
  const [profile, setProfile] = useState(initial);
  const [performance, setPerformance] = useState(initialPerformance);
  const [tab, setTab] = useState("overview");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [statusCode, setStatusCode] = useState(profile.statusCode);
  const [statusReason, setStatusReason] = useState("");
  const [qualificationType, setQualificationType] = useState(
    catalogues.qualificationTypes[0]?.code ?? "GENERAL"
  );
  const [qualificationOutcome, setQualificationOutcome] = useState("QUALIFIED");
  const [effectiveDate, setEffectiveDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [expiryDate, setExpiryDate] = useState("");
  const [reviewDate, setReviewDate] = useState("");
  const [notes, setNotes] = useState("");
  const [categoryCodes, setCategoryCodes] = useState(
    profile.categories.map((row) => row.code)
  );
  const [capabilityCodes, setCapabilityCodes] = useState(
    profile.capabilities.map((row) => row.code)
  );

  function apply(next: SupplierProfileView, success: string) {
    setProfile(next);
    setMessage(success);
    setError(null);
    setStatusCode(next.statusCode);
    setCategoryCodes(next.categories.map((row) => row.code));
    setCapabilityCodes(next.capabilities.map((row) => row.code));
  }

  function toggle(list: string[], value: string) {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <PageBackLink href="/procurement/suppliers" label="Suppliers" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{profile.partyName}</h1>
            <p className="text-sm text-muted-foreground">
              {profile.profileNumber} · {profile.displayStatusLabel} ·{" "}
              {profile.qualificationLabel}
            </p>
          </div>
          <Link
            href={profile.partyHref}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            View party
          </Link>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

      <PlatformTabs
        tabs={TABS}
        activeTab={tab}
        onTabChange={setTab}
        ariaLabel="Supplier profile"
      />

      {tab === "overview" ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-lg border p-4">
            <h2 className="font-medium">Party information</h2>
            <p className="text-sm">{profile.partyName}</p>
            <p className="text-sm text-muted-foreground">{profile.partyNumber}</p>
            <Link href={profile.partyHref} className="text-sm underline">
              View party
            </Link>
          </div>
          <div className="space-y-3 rounded-lg border p-4">
            <h2 className="font-medium">Procurement</h2>
            <p className="text-sm">Status: {profile.displayStatusLabel}</p>
            <p className="text-sm">Qualification: {profile.qualificationLabel}</p>
            <p className="text-sm">
              Preferred: {profile.isPreferred ? "Yes" : "No"}
            </p>
            <p className="text-sm">
              Eligibility: {profile.eligibility.eligible ? "Eligible" : "Not eligible"}
            </p>
            {!profile.eligibility.eligible ? (
              <ul className="text-sm text-muted-foreground">
                {profile.eligibility.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            ) : null}
            {profile.eligibility.actionRequired ? (
              <p className="text-sm">{profile.eligibility.actionRequired}</p>
            ) : null}
            <p className="text-sm">
              Categories: {profile.categories.map((row) => row.name).join(", ") || "—"}
            </p>
            <p className="text-sm">
              Capabilities: {profile.capabilities.map((row) => row.name).join(", ") || "—"}
            </p>
          </div>
          {profile.canSetPreferred ? (
            <div className="rounded-lg border p-4">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await setProcurementPreferredAction(profile.id, {
                      isPreferred: !profile.isPreferred,
                    });
                    if (!result.success) {
                      setError(result.error.message);
                      return;
                    }
                    apply(result.data, "Preferred status updated.");
                  })
                }
              >
                {profile.isPreferred ? "Clear preferred" : "Set preferred"}
              </Button>
            </div>
          ) : null}
          {profile.canChangeStatus || profile.canBlacklist ? (
            <form
              className="space-y-3 rounded-lg border p-4"
              onSubmit={(event) => {
                event.preventDefault();
                startTransition(async () => {
                  const result = await changeProcurementStatusAction(profile.id, {
                    statusCode: statusCode as typeof PROCUREMENT_STATUS_CODES.ACTIVE,
                    reason: statusReason,
                  });
                  if (!result.success) {
                    setError(result.error.message);
                    return;
                  }
                  apply(result.data, "Status updated.");
                  setStatusReason("");
                });
              }}
            >
              <h2 className="font-medium">Change status</h2>
              <select
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={statusCode}
                onChange={(event) => setStatusCode(event.target.value)}
              >
                {catalogues.statuses.map((row) => (
                  <option key={row.code} value={row.code}>
                    {row.name}
                  </option>
                ))}
              </select>
              <Label htmlFor="status-reason">Reason</Label>
              <Input
                id="status-reason"
                value={statusReason}
                onChange={(event) => setStatusReason(event.target.value)}
              />
              <Button type="submit" disabled={isPending}>
                Update status
              </Button>
            </form>
          ) : null}
        </section>
      ) : null}

      {tab === "performance" ? (
        <section className="space-y-6">
          <SupplierScorecardPanel
            profileId={profile.id}
            scorecard={performance.scorecard}
            onUpdated={(scorecard) =>
              setPerformance((current) => ({ ...current, scorecard }))
            }
          />
          <SupplierPerformanceReviewPanel
            profileId={profile.id}
            performance={performance}
            onUpdated={(next) => setPerformance(next)}
          />
          <SupplierGovernancePanel
            profileId={profile.id}
            pendingProposals={performance.pendingProposals}
            canPropose={performance.canProposeGovernance}
            canApprove={performance.canApproveGovernance}
            onChanged={() => window.location.reload()}
          />
        </section>
      ) : null}

      {tab === "qualification" ? (
        <section className="space-y-6">
          {profile.canQualify ? (
            <form
              className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                startTransition(async () => {
                  const result = await recordProcurementQualificationAction(profile.id, {
                    qualificationTypeCode: qualificationType,
                    outcomeCode: qualificationOutcome as "QUALIFIED",
                    effectiveDate,
                    expiryDate: expiryDate || null,
                    reviewDate: reviewDate || null,
                    notes,
                  });
                  if (!result.success) {
                    setError(result.error.message);
                    return;
                  }
                  apply(result.data, "Qualification recorded.");
                });
              }}
            >
              <h2 className="font-medium sm:col-span-2">Record qualification</h2>
              <select
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={qualificationType}
                onChange={(event) => setQualificationType(event.target.value)}
              >
                {catalogues.qualificationTypes.map((row) => (
                  <option key={row.code} value={row.code}>
                    {row.name}
                  </option>
                ))}
              </select>
              <select
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={qualificationOutcome}
                onChange={(event) => setQualificationOutcome(event.target.value)}
              >
                {catalogues.qualificationStatuses.map((row) => (
                  <option key={row.code} value={row.code}>
                    {row.name}
                  </option>
                ))}
              </select>
              <div>
                <Label htmlFor="effective-date">Effective date</Label>
                <Input
                  id="effective-date"
                  type="date"
                  value={effectiveDate}
                  onChange={(event) => setEffectiveDate(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="expiry-date">Expiry date</Label>
                <Input
                  id="expiry-date"
                  type="date"
                  value={expiryDate}
                  onChange={(event) => setExpiryDate(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="review-date">Review date</Label>
                <Input
                  id="review-date"
                  type="date"
                  value={reviewDate}
                  onChange={(event) => setReviewDate(event.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="qualification-notes">Notes</Label>
                <Input
                  id="qualification-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </div>
              <Button type="submit" disabled={isPending} className="sm:col-span-2">
                Save qualification
              </Button>
            </form>
          ) : null}
          <div className="space-y-3">
            {profile.qualifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No qualification recorded yet.</p>
            ) : (
              profile.qualifications.map((row) => (
                <article key={row.id} className="rounded-lg border p-4 text-sm">
                  <p className="font-medium">
                    {row.qualificationTypeName} · {row.outcomeLabel}
                  </p>
                  <p className="text-muted-foreground">
                    Effective {row.effectiveDate}
                    {row.expiryDate ? ` · Expires ${row.expiryDate}` : ""}
                    {row.reviewDate ? ` · Review ${row.reviewDate}` : ""}
                  </p>
                  {row.notes ? <p className="mt-1">{row.notes}</p> : null}
                  {row.evidence.length > 0 ? (
                    <p className="mt-1 text-muted-foreground">
                      Evidence: {row.evidence.map((doc) => doc.originalFileName).join(", ")}
                    </p>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </section>
      ) : null}

      {tab === "classification" ? (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const result = await updateProcurementProfileAction(profile.id, {
                categoryCodes,
                capabilityCodes,
              });
              if (!result.success) {
                setError(result.error.message);
                return;
              }
              apply(result.data, "Categories and capabilities updated.");
            });
          }}
        >
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Categories</legend>
            {catalogues.categories.map((row) => (
              <label key={row.code} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={categoryCodes.includes(row.code)}
                  disabled={!profile.canEdit}
                  onChange={() => setCategoryCodes(toggle(categoryCodes, row.code))}
                />
                {row.name}
              </label>
            ))}
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Capabilities</legend>
            {catalogues.capabilities.map((row) => (
              <label key={row.code} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={capabilityCodes.includes(row.code)}
                  disabled={!profile.canEdit}
                  onChange={() => setCapabilityCodes(toggle(capabilityCodes, row.code))}
                />
                {row.name}
              </label>
            ))}
          </fieldset>
          {profile.canEdit ? (
            <Button type="submit" disabled={isPending}>
              Save classification
            </Button>
          ) : null}
        </form>
      ) : null}

      {tab === "documents" ? (
        <section className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Qualification evidence uses documents already stored on the party. Open the party
            record to upload files.
          </p>
          <Link href={`${profile.partyHref}?tab=documents`} className="text-sm underline">
            View party documents
          </Link>
          <ul className="space-y-2 text-sm">
            {profile.qualifications.flatMap((row) =>
              row.evidence.map((doc) => (
                <li key={doc.id} className="rounded-lg border px-4 py-2">
                  {doc.originalFileName} · {doc.documentTypeCode}
                </li>
              ))
            )}
          </ul>
        </section>
      ) : null}

      {tab === "activity" ? (
        <section>
          {profile.statusReason ? (
            <p className="text-sm">Latest status reason: {profile.statusReason}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Status and qualification changes are recorded in audit history.
            </p>
          )}
        </section>
      ) : null}
    </main>
  );
}
