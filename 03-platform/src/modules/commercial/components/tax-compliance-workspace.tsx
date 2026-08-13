/**
 * Purpose:
 * Tax compliance workspace (IP-11) — dashboard, registrations, obligations, evidence.
 */

"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import {
  PlatformEmptyState,
  PlatformInlineFormFeedback,
  PlatformProcessingButton,
} from "@/components/platform";
import { PageBackLink } from "@/components/platform/page-back-link";
import { SetBreadcrumbs } from "@/components/platform/breadcrumb-context";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  platformError,
  platformSuccess,
} from "@/core/platform/platform-action-helpers";
import type { PlatformActionResult } from "@/core/platform/types";
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
import type { TaxComplianceDashboardView } from "@/modules/commercial";

type Panel = "dashboard" | "registration" | "obligation" | "evidence" | "calendar";

export function TaxComplianceWorkspace() {
  const [isPending, startTransition] = useTransition();
  const [actionResult, setActionResult] = useState<PlatformActionResult | null>(
    null
  );
  const [panel, setPanel] = useState<Panel>("dashboard");
  const [dashboard, setDashboard] = useState<TaxComplianceDashboardView | null>(
    null
  );
  const [statusFilter, setStatusFilter] = useState("");
  const [taxTypeFilter, setTaxTypeFilter] = useState("");

  const [countryCode, setCountryCode] = useState("KE");
  const [regType, setRegType] = useState("VAT");
  const [regNumber, setRegNumber] = useState("");
  const [authority, setAuthority] = useState("KRA");

  const [snapshotId, setSnapshotId] = useState("");
  const [resolutionId, setResolutionId] = useState("");
  const [taxComponentId, setTaxComponentId] = useState("tax-comp-1");
  const [taxTypeCode, setTaxTypeCode] = useState("VAT");
  const [taxableAmount, setTaxableAmount] = useState("1000.00");
  const [taxAmount, setTaxAmount] = useState("160.00");
  const [currencyCode, setCurrencyCode] = useState("KES");
  const [obligationDate, setObligationDate] = useState("2026-06-15");
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
          platformError("Could not load tax compliance", result.error.message)
        );
        return;
      }
      setDashboard(result.data);
    });
  }

  useEffect(() => {
    refresh();
  }, []);

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
          { label: "Commercial", href: "/commercial/resolve" },
          { label: "Tax compliance" },
        ]}
      />
      <PageBackLink href="/commercial/resolve" label="Commercial resolve" />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Tax compliance
        </h1>
        <p className="text-sm text-muted-foreground">
          IP-11 manages tax obligations, calendars, filings, remittance records
          and evidence. IP-03 remains the tax calculator — this workspace does
          not recalculate tax. Capability is configurable; it is not a legal
          compliance certificate.
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
                        "Next: generate calendar or create an obligation from a commercial snapshot."
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
          <p className="text-sm text-muted-foreground">
            Enter amounts from an IP-06 snapshot / IP-03 tax component. Do not
            invent tax here.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              id="snapshotId"
              label="Snapshot ID"
              value={snapshotId}
              onChange={setSnapshotId}
            />
            <Field
              id="resolutionId"
              label="Resolution ID"
              value={resolutionId}
              onChange={setResolutionId}
            />
            <Field
              id="taxComponentId"
              label="Tax component ID"
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
              label="Taxable amount (from snapshot)"
              value={taxableAmount}
              onChange={setTaxableAmount}
            />
            <Field
              id="taxAmount"
              label="Tax amount (from IP-03)"
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
            idleLabel="Create obligation from snapshot"
            onClick={() => {
              startTransition(async () => {
                const result = await createTaxObligationFromSnapshotAction({
                  snapshotId,
                  resolutionId,
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
                      "Obligation failed",
                      result.error.message,
                      result.error.field
                    )
                  );
                  return;
                }
                setSelectedObligationId(result.data.obligationId);
                setActionResult(
                  platformSuccess(
                    "Obligation created",
                    `Status ${result.data.complianceStatus}. Next: filing / remittance / evidence.`
                  )
                );
                refresh();
              });
            }}
          >
            Create obligation
          </PlatformProcessingButton>

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
              description="Create an obligation from a commercial snapshot tax component."
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
                    <p className="font-mono text-xs text-muted-foreground">
                      snapshot {o.snapshotId} · rule {o.ruleKey}
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
        <a
          href="/commercial/resolve"
          className="inline-flex h-9 items-center rounded-md border px-3 text-sm"
        >
          Open commercial resolve
        </a>
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
