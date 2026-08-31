/**
 * Purpose:
 * Tax obligations workspace — filings, remittance, evidence.
 * Consumes validated commercial handoff; does not recalculate tax.
 */

"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import {
  PlatformEmptyState,
  PlatformInlineFormFeedback,
  PlatformProcessingButton,
} from "@/components/platform";
import { PageBackLink } from "@/components/platform/page-back-link";
import { SetBreadcrumbs } from "@/components/platform/breadcrumb-context";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  platformError,
  platformSuccess,
} from "@/core/platform/platform-action-helpers";
import type { PlatformActionResult } from "@/core/platform/types";
import { cn } from "@/lib/utils";
import {
  addTaxRegistrationAction,
  createTaxComplianceProfileAction,
  createTaxObligationFromSnapshotAction,
  generateTaxCalendarPeriodAction,
  loadTaxComplianceDashboardAction,
  recordTaxRemittanceAction,
  transitionTaxFilingAction,
  uploadTaxEvidenceAction,
} from "@/modules/commercial/actions/tax-compliance-actions";
import {
  clearCommercialTaxHandoff,
  readCommercialTaxHandoff,
  type CommercialTaxHandoffPayload,
} from "@/modules/commercial/commercial-journey-handoff";
import type { TaxComplianceDashboardView } from "@/modules/commercial/tax-compliance/tax-compliance-types";

type Panel = "dashboard" | "registration" | "obligation" | "evidence" | "calendar";

export function TaxComplianceWorkspace() {
  const searchParams = useSearchParams();
  const fromQuery = searchParams.get("handoff") === "1";
  const initialHandoff = useMemo(() => readCommercialTaxHandoff(), []);

  const [isPending, startTransition] = useTransition();
  const [actionResult, setActionResult] = useState<PlatformActionResult | null>(
    () => {
      if (initialHandoff && fromQuery) {
        return platformSuccess(
          "Commercial result loaded",
          "Amounts came from Price a sale. Create the tax obligation when ready — no retyping required."
        );
      }
      if (fromQuery && !initialHandoff) {
        return platformError(
          "No commercial result waiting",
          "Return to Price a sale, complete Review, then open Tax obligations again."
        );
      }
      return null;
    }
  );
  const [panel, setPanel] = useState<Panel>(() =>
    initialHandoff || fromQuery ? "obligation" : "dashboard"
  );
  const [dashboard, setDashboard] = useState<TaxComplianceDashboardView | null>(
    null
  );
  const [statusFilter, setStatusFilter] = useState("");
  const [taxTypeFilter, setTaxTypeFilter] = useState("");
  const [handoff, setHandoff] = useState<CommercialTaxHandoffPayload | null>(
    () => initialHandoff
  );
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [countryCode, setCountryCode] = useState("KE");
  const [regType, setRegType] = useState("VAT");
  const [regNumber, setRegNumber] = useState("");
  const [authority, setAuthority] = useState("KRA");

  const [snapshotId, setSnapshotId] = useState(
    () => initialHandoff?.snapshotId ?? ""
  );
  const [resolutionId, setResolutionId] = useState(
    () => initialHandoff?.resolutionId ?? ""
  );
  const [commercialContractId] = useState(
    () => initialHandoff?.commercialContractId ?? ""
  );
  const [taxComponentId, setTaxComponentId] = useState(
    () => initialHandoff?.taxComponentId ?? "tax-comp-1"
  );
  const [taxTypeCode, setTaxTypeCode] = useState(
    () => initialHandoff?.taxTypeCode ?? "VAT"
  );
  const [taxableAmount, setTaxableAmount] = useState(
    () => initialHandoff?.taxableAmount ?? "1000.00"
  );
  const [taxAmount, setTaxAmount] = useState(
    () => initialHandoff?.taxAmount ?? "160.00"
  );
  const [currencyCode, setCurrencyCode] = useState(
    () => initialHandoff?.currencyCode ?? "KES"
  );
  const [obligationDate, setObligationDate] = useState(
    () =>
      initialHandoff?.obligationDate ?? new Date().toISOString().slice(0, 10)
  );
  const [selectedObligationId, setSelectedObligationId] = useState<string | null>(
    null
  );
  const [documentRef, setDocumentRef] = useState("");
  const [evidenceType, setEvidenceType] = useState("PAYMENT_CONFIRMATION");
  const [remitAmount, setRemitAmount] = useState("");

  function refresh() {
    startTransition(async () => {
      const result = await loadTaxComplianceDashboardAction();
      if (!result.success) {
        setActionResult(
          platformError("Could not load tax obligations", result.error.message)
        );
        return;
      }
      setDashboard(result.data);
    });
  }

  useEffect(() => {
    refresh();
  }, []);

  function createObligationFromContext() {
    startTransition(async () => {
      if (!dashboard?.profile) {
        setActionResult(
          platformError(
            "Tax profile required",
            "Create a country profile under Registrations first, then add a tax registration."
          )
        );
        setPanel("registration");
        return;
      }
      if ((dashboard.registrations ?? []).length === 0) {
        setActionResult(
          platformError(
            "Tax registration required",
            "Add a VAT (or matching) registration under Registrations, then create the obligation."
          )
        );
        setPanel("registration");
        return;
      }

      const result = await createTaxObligationFromSnapshotAction({
        snapshotId,
        resolutionId,
        commercialContractId: commercialContractId || null,
        taxComponentId,
        taxTypeCode,
        taxableAmount,
        taxAmount,
        currencyCode,
        obligationDate,
      });
      if (!result.success) {
        setActionResult(
          platformError(
            "Could not create obligation",
            result.error.message,
            result.error.field
          )
        );
        return;
      }
      setSelectedObligationId(result.data.obligationId);
      clearCommercialTaxHandoff();
      setHandoff(null);
      setActionResult(
        platformSuccess(
          "Tax obligation created",
          `Status ${result.data.complianceStatus}. Continue with filing, remittance, or evidence.`
        )
      );
      refresh();
    });
  }

  const filteredObligations = useMemo(() => {
    const all = [
      ...(dashboard?.upcomingFilings ?? []),
      ...(dashboard?.overdue ?? []),
      ...(dashboard?.missingEvidence ?? []),
    ];
    const map = new Map(all.map((o) => [o.obligationId, o]));
    return [...map.values()].filter((o) => {
      if (statusFilter && o.complianceStatus !== statusFilter) return false;
      if (taxTypeFilter && o.taxTypeCode !== taxTypeFilter) return false;
      return true;
    });
  }, [dashboard, statusFilter, taxTypeFilter]);

  return (
    <main className="space-y-4 p-4 sm:p-6">
      <SetBreadcrumbs
        items={[
          { label: "Price a sale", href: "/commercial/resolve" },
          { label: "Tax obligations" },
        ]}
      />
      <PageBackLink href="/commercial/resolve" label="Back to Price a sale" />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Tax obligations
        </h1>
        <p className="text-sm text-muted-foreground">
          Track tax registrations, filing periods, remittance records, and
          evidence for commercial results already calculated. Due dates shown
          here are configurable defaults — not a legal certification.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["dashboard", "Dashboard"],
            ["registration", "Registrations"],
            ["calendar", "Calendar"],
            ["obligation", "Obligations"],
            ["evidence", "Evidence"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`rounded-md border px-3 py-1.5 text-sm ${
              panel === id ? "bg-muted font-medium" : ""
            }`}
            onClick={() => setPanel(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <PlatformInlineFormFeedback result={actionResult} />

      {handoff ? (
        <Alert>
          <AlertDescription>
            <p className="font-medium">Commercial result ready</p>
            <p>
              {handoff.customerName ? `${handoff.customerName} · ` : ""}
              {handoff.offeringName ?? "Offering"} · Expected{" "}
              {handoff.currencyCode} {handoff.expectedAmount} · Tax{" "}
              {handoff.currencyCode} {handoff.taxAmount}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create the obligation under Obligations — you do not need to copy
              amounts.
            </p>
          </AlertDescription>
        </Alert>
      ) : null}

      {panel === "dashboard" ? (
        <section className="space-y-4 rounded-xl border p-4">
          <h2 className="text-lg font-semibold">Compliance dashboard</h2>
          {!dashboard?.profile ? (
            <PlatformEmptyState
              title="No tax compliance profile"
              description="Create a country profile (Kenya first) to load jurisdiction templates."
              actionLabel="Go to registrations"
              onAction={() => setPanel("registration")}
              compact
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Upcoming filings"
                value={String(dashboard.upcomingFilings.length)}
              />
              <Stat
                label="Upcoming remittances"
                value={String(dashboard.upcomingRemittances.length)}
              />
              <Stat label="Overdue" value={String(dashboard.overdue.length)} />
              <Stat
                label="Missing evidence"
                value={String(dashboard.missingEvidence.length)}
              />
            </div>
          )}
          <PlatformProcessingButton
            type="button"
            variant="secondary"
            isProcessing={isPending}
            processingLabel="Refreshing…"
            idleLabel="Refresh"
            onClick={refresh}
          >
            Refresh
          </PlatformProcessingButton>
        </section>
      ) : null}

      {panel === "registration" ? (
        <section className="space-y-4 rounded-xl border p-4">
          <h2 className="text-lg font-semibold">Tax registration</h2>
          {!dashboard?.profile ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="countryCode">Country code</Label>
                <Input
                  id="countryCode"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
                />
              </div>
              <PlatformProcessingButton
                type="button"
                isProcessing={isPending}
                processingLabel="Creating…"
                idleLabel="Create KE profile + templates"
                onClick={() => {
                  startTransition(async () => {
                    const result = await createTaxComplianceProfileAction({
                      countryCode,
                    });
                    if (!result.success) {
                      setActionResult(
                        platformError(
                          "Profile failed",
                          result.error.message,
                          result.error.field
                        )
                      );
                      return;
                    }
                    setActionResult(
                      platformSuccess(
                        "Profile created",
                        "Kenya templates seeded where applicable. Next: add tax registration."
                      )
                    );
                    refresh();
                  });
                }}
              >
                Create profile
              </PlatformProcessingButton>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Profile: {dashboard.profile.countryCode} /{" "}
                {dashboard.profile.defaultJurisdictionCode}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="regType">Registration type</Label>
                  <Input
                    id="regType"
                    value={regType}
                    onChange={(e) => setRegType(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regNumber">Registration number</Label>
                  <Input
                    id="regNumber"
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="authority">Tax authority</Label>
                  <Input
                    id="authority"
                    value={authority}
                    onChange={(e) => setAuthority(e.target.value)}
                  />
                </div>
              </div>
              <PlatformProcessingButton
                type="button"
                isProcessing={isPending}
                processingLabel="Saving…"
                idleLabel="Add registration"
                onClick={() => {
                  startTransition(async () => {
                    const result = await addTaxRegistrationAction({
                      registrationType: regType,
                      registrationNumber: regNumber,
                      taxAuthorityCode: authority,
                      taxTypeCode: regType,
                    });
                    if (!result.success) {
                      setActionResult(
                        platformError(
                          "Registration failed",
                          result.error.message,
                          result.error.field
                        )
                      );
                      return;
                    }
                    setActionResult(
                      platformSuccess(
                        "Registration added",
                        "Next: create the tax obligation from your commercial result (if waiting), or generate a calendar period."
                      )
                    );
                    refresh();
                    setPanel("obligation");
                  });
                }}
              >
                Add registration
              </PlatformProcessingButton>
              <ul className="space-y-2 text-sm">
                {(dashboard.registrations ?? []).map((r) => (
                  <li key={r.registrationId} className="rounded border p-2">
                    {r.registrationType} · {r.registrationNumber} ·{" "}
                    {r.taxAuthorityCode}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ) : null}

      {panel === "calendar" ? (
        <section className="space-y-4 rounded-xl border p-4">
          <h2 className="text-lg font-semibold">Compliance calendar</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="calTaxType">Tax type</Label>
              <Input
                id="calTaxType"
                value={taxTypeCode}
                onChange={(e) => setTaxTypeCode(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="calAsOf">As of date</Label>
              <Input
                id="calAsOf"
                value={obligationDate}
                onChange={(e) => setObligationDate(e.target.value)}
              />
            </div>
          </div>
          <PlatformProcessingButton
            type="button"
            isProcessing={isPending}
            processingLabel="Generating…"
            idleLabel="Generate filing period"
            onClick={() => {
              startTransition(async () => {
                const result = await generateTaxCalendarPeriodAction({
                  taxTypeCode,
                  asOf: obligationDate,
                });
                if (!result.success) {
                  setActionResult(
                    platformError(
                      "Calendar failed",
                      result.error.message,
                      result.error.field
                    )
                  );
                  return;
                }
                setActionResult(
                  platformSuccess(
                    "Period generated",
                    `${result.data.periodKey} filing due ${result.data.filingDueDate}`
                  )
                );
                refresh();
              });
            }}
          >
            Generate period
          </PlatformProcessingButton>
          <ul className="space-y-2 text-sm">
            {(dashboard?.periods ?? []).map((p) => (
              <li key={p.periodId} className="rounded border p-2">
                {p.taxTypeCode} {p.periodKey}: filing {p.filingDueDate}, remit{" "}
                {p.remittanceDueDate}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {panel === "obligation" ? (
        <section className="space-y-4 rounded-xl border p-4">
          <h2 className="text-lg font-semibold">Tax obligation</h2>
          {handoff ? (
            <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
              <p className="text-sm font-medium">
                From Price a sale — create without retyping
              </p>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Customer</dt>
                  <dd>{handoff.customerName ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Offering</dt>
                  <dd>{handoff.offeringName ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Tax type</dt>
                  <dd>{handoff.taxTypeCode}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Tax amount</dt>
                  <dd>
                    {handoff.currencyCode} {handoff.taxAmount}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Taxable amount</dt>
                  <dd>
                    {handoff.currencyCode} {handoff.taxableAmount}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Expected amount</dt>
                  <dd>
                    {handoff.currencyCode} {handoff.expectedAmount}
                  </dd>
                </div>
              </dl>
              <PlatformProcessingButton
                type="button"
                isProcessing={isPending}
                processingLabel="Creating…"
                idleLabel="Create tax obligation"
                onClick={createObligationFromContext}
              >
                Create tax obligation
              </PlatformProcessingButton>
            </div>
          ) : (
            <PlatformEmptyState
              title="No commercial result waiting"
              description="Complete Price a sale through Review, then choose View tax obligations. A tax profile and registration are still required once."
              actionLabel="Go to Price a sale"
              onAction={() => {
                window.location.href = "/commercial/resolve";
              }}
              compact
            />
          )}

          <button
            type="button"
            className="text-sm text-muted-foreground underline"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            {showAdvanced ? "Hide advanced entry" : "Show advanced entry"}
          </button>

          {showAdvanced ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  id="snapshotId"
                  label="Commercial reference (advanced)"
                  value={snapshotId}
                  onChange={setSnapshotId}
                />
                <Field
                  id="resolutionId"
                  label="Resolution reference (advanced)"
                  value={resolutionId}
                  onChange={setResolutionId}
                />
                <Field
                  id="taxComponentId"
                  label="Tax line reference (advanced)"
                  value={taxComponentId}
                  onChange={setTaxComponentId}
                />
                <Field
                  id="taxTypeCode"
                  label="Tax type"
                  value={taxTypeCode}
                  onChange={setTaxTypeCode}
                />
                <Field
                  id="taxableAmount"
                  label="Taxable amount"
                  value={taxableAmount}
                  onChange={setTaxableAmount}
                />
                <Field
                  id="taxAmount"
                  label="Tax amount"
                  value={taxAmount}
                  onChange={setTaxAmount}
                />
                <Field
                  id="currencyCode"
                  label="Currency"
                  value={currencyCode}
                  onChange={setCurrencyCode}
                />
                <Field
                  id="obligationDate"
                  label="Obligation date"
                  value={obligationDate}
                  onChange={setObligationDate}
                />
              </div>
              <PlatformProcessingButton
                type="button"
                isProcessing={isPending}
                processingLabel="Creating…"
                idleLabel="Create from advanced fields"
                onClick={createObligationFromContext}
              >
                Create from advanced fields
              </PlatformProcessingButton>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Filter compliance status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="max-w-xs"
            />
            <Input
              placeholder="Filter tax type"
              value={taxTypeFilter}
              onChange={(e) => setTaxTypeFilter(e.target.value)}
              className="max-w-xs"
            />
          </div>

          {filteredObligations.length === 0 ? (
            <PlatformEmptyState
              title="No obligations yet"
              description="Create an obligation from a completed commercial result on Price a sale."
              compact
            />
          ) : (
            <ul className="space-y-2">
              {filteredObligations.map((o) => (
                <li key={o.obligationId} className="rounded border p-3 text-sm">
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => setSelectedObligationId(o.obligationId)}
                  >
                    <p className="font-medium">
                      {o.taxTypeCode} {o.periodKey} · {o.currencyCode}{" "}
                      {o.taxAmount}
                    </p>
                    <p className="text-muted-foreground">
                      Filing {o.filingStatus} · Remit {o.remittanceStatus} ·
                      Evidence {o.evidenceStatus} · {o.complianceStatus}
                    </p>
                  </button>
                  {selectedObligationId === o.obligationId ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <PlatformProcessingButton
                        type="button"
                        isProcessing={isPending}
                        processingLabel="…"
                        idleLabel="Mark filing DUE"
                        onClick={() =>
                          runFiling(o.obligationId, "DUE", setActionResult, refresh)
                        }
                      >
                        Due
                      </PlatformProcessingButton>
                      <PlatformProcessingButton
                        type="button"
                        isProcessing={isPending}
                        processingLabel="…"
                        idleLabel="Prepare"
                        onClick={() =>
                          runFiling(
                            o.obligationId,
                            "PREPARED",
                            setActionResult,
                            refresh
                          )
                        }
                      >
                        Prepare
                      </PlatformProcessingButton>
                      <PlatformProcessingButton
                        type="button"
                        isProcessing={isPending}
                        processingLabel="…"
                        idleLabel="Submit"
                        onClick={() =>
                          runFiling(
                            o.obligationId,
                            "SUBMITTED",
                            setActionResult,
                            refresh
                          )
                        }
                      >
                        Submit
                      </PlatformProcessingButton>
                      <PlatformProcessingButton
                        type="button"
                        isProcessing={isPending}
                        processingLabel="…"
                        idleLabel="Accept"
                        onClick={() =>
                          runFiling(
                            o.obligationId,
                            "ACCEPTED",
                            setActionResult,
                            refresh
                          )
                        }
                      >
                        Accept
                      </PlatformProcessingButton>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {panel === "evidence" ? (
        <section className="space-y-4 rounded-xl border p-4">
          <h2 className="text-lg font-semibold">Evidence & remittance</h2>
          {!selectedObligationId ? (
            <Alert>
              <AlertDescription>
                Select an obligation on the Obligations panel first.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Obligation: {selectedObligationId}
              </p>
              <Field
                id="documentRef"
                label="Document reference"
                value={documentRef}
                onChange={setDocumentRef}
              />
              <Field
                id="evidenceType"
                label="Evidence type"
                value={evidenceType}
                onChange={setEvidenceType}
              />
              <PlatformProcessingButton
                type="button"
                isProcessing={isPending}
                processingLabel="Uploading…"
                idleLabel="Upload evidence reference"
                onClick={() => {
                  startTransition(async () => {
                    const result = await uploadTaxEvidenceAction({
                      obligationId: selectedObligationId,
                      evidenceType,
                      documentRef,
                    });
                    if (!result.success) {
                      setActionResult(
                        platformError(
                          "Evidence failed",
                          result.error.message,
                          result.error.field
                        )
                      );
                      return;
                    }
                    setActionResult(
                      platformSuccess(
                        "Evidence uploaded",
                        "Status UPLOADED. Verify when reviewed."
                      )
                    );
                    refresh();
                  });
                }}
              >
                Upload evidence
              </PlatformProcessingButton>
              <Field
                id="remitAmount"
                label="Remittance amount to record"
                value={remitAmount}
                onChange={setRemitAmount}
              />
              <PlatformProcessingButton
                type="button"
                isProcessing={isPending}
                processingLabel="Recording…"
                idleLabel="Record remittance"
                onClick={() => {
                  startTransition(async () => {
                    const result = await recordTaxRemittanceAction({
                      obligationId: selectedObligationId,
                      amountRemitted: remitAmount,
                      paymentReference: "MANUAL-REF",
                    });
                    if (!result.success) {
                      setActionResult(
                        platformError(
                          "Remittance failed",
                          result.error.message,
                          result.error.field
                        )
                      );
                      return;
                    }
                    setActionResult(
                      platformSuccess(
                        "Remittance recorded",
                        `Outstanding ${result.data.outstandingAmount} · ${result.data.status}`
                      )
                    );
                    refresh();
                  });
                }}
              >
                Record remittance
              </PlatformProcessingButton>
            </div>
          )}
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <PlatformProcessingButton
          type="button"
          variant="secondary"
          isProcessing={isPending}
          processingLabel="Refreshing…"
          idleLabel="Refresh dashboard"
          onClick={refresh}
        >
          Refresh dashboard
        </PlatformProcessingButton>
        <Link
          href="/commercial/resolve"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Price a sale
        </Link>
        <Link
          href="/commercial/governance"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Commercial rules
        </Link>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function runFiling(
  obligationId: string,
  toStatus: string,
  setActionResult: (r: PlatformActionResult) => void,
  refresh: () => void
) {
  void (async () => {
    const result = await transitionTaxFilingAction({
      obligationId,
      toStatus,
    });
    if (!result.success) {
      setActionResult(
        platformError("Filing transition failed", result.error.message)
      );
      return;
    }
    setActionResult(
      platformSuccess("Filing updated", `Status ${result.data.status}`)
    );
    refresh();
  })();
}
