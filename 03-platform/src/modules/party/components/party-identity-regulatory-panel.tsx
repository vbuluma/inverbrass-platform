/**
 * Purpose:
 * Party Workspace Identity & Regulatory tab — profile summary, requirements,
 * captured identifiers, and verification.
 *
 * Implementation Package:
 * BP-002 / IP-013 – Identity & Regulatory Information
 */

"use client";

import { useState } from "react";

import {
  PlatformEmptyState,
  PROCESSING_LABELS,
  usePanelFeedback,
} from "@/components/platform";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dateFieldValue, useControlledForm } from "@/lib/forms";
import {
  capturePartyIdentifierAction,
  linkPartyIdentifierDocumentAction,
  removePartyIdentifierAction,
  updatePartyIdentifierAction,
  verifyPartyIdentifierAction,
} from "@/modules/party/actions/party-identity-regulatory-actions";
import { IDENTIFIER_REQUIREMENT_DISPLAY_STATUSES } from "@/core/identity-regulatory/constants";
import type { PartyIdentityRegulatoryPanelView } from "@/modules/party/types";

type PartyIdentityRegulatoryPanelProps = {
  partyId: string;
  initialData: PartyIdentityRegulatoryPanelView;
};

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
      new Date(value)
    );
  } catch {
    return value;
  }
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case IDENTIFIER_REQUIREMENT_DISPLAY_STATUSES.VERIFIED:
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
    case IDENTIFIER_REQUIREMENT_DISPLAY_STATUSES.CAPTURED:
      return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200";
    case IDENTIFIER_REQUIREMENT_DISPLAY_STATUSES.EXPIRED:
      return "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function SummaryMetric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: "amber" | "danger";
}) {
  const valueClass =
    highlight === "amber"
      ? "text-amber-600 dark:text-amber-400"
      : highlight === "danger"
        ? "text-destructive"
        : undefined;

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold ${valueClass ?? ""}`}>{value}</p>
    </div>
  );
}

export function PartyIdentityRegulatoryPanel({
  partyId,
  initialData,
}: PartyIdentityRegulatoryPanelProps) {
  const [panel, setPanel] = useState(initialData);
  const [syncedInitial, setSyncedInitial] = useState(initialData);
  const [captureTypeCode, setCaptureTypeCode] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const {
    isPending,
    runPanelAction,
    FormFeedback,
    ConfirmDialogHost,
    requestConfirm,
  } = usePanelFeedback<PartyIdentityRegulatoryPanelView>();

  const captureForm = useControlledForm({
    initial: {
      identifierValue: "",
      issuingCountryCode: "",
      issuingAuthority: "",
      issueDate: "",
      expiryDate: "",
      notes: "",
    },
  });

  const editForm = useControlledForm({
    initial: {
      identifierValue: "",
      expiryDate: "",
      notes: "",
      version: "1",
    },
  });

  if (initialData !== syncedInitial) {
    setSyncedInitial(initialData);
    setPanel(initialData);
  }

  function refreshPanel(result: PartyIdentityRegulatoryPanelView) {
    setPanel(result);
    setEditingId(null);
    setCaptureTypeCode("");
    captureForm.reset({
      identifierValue: "",
      issuingCountryCode: "",
      issuingAuthority: "",
      issueDate: "",
      expiryDate: "",
      notes: "",
    });
  }

  async function handleCapture() {
    if (!captureTypeCode) {
      return;
    }

    await runPanelAction(
      () =>
        capturePartyIdentifierAction(partyId, {
          identifierTypeCode: captureTypeCode,
          identifierValue: captureForm.textValue("identifierValue"),
          issuingCountryCode: captureForm.textValue("issuingCountryCode") || null,
          issuingAuthority: captureForm.textValue("issuingAuthority") || null,
          issueDate: captureForm.textValue("issueDate") || undefined,
          expiryDate: captureForm.textValue("expiryDate") || undefined,
          notes: captureForm.textValue("notes") || null,
        }),
      {
        successTitle: "Identifier captured",
        successMessage: "Regulatory identifier saved.",
        onSuccess: refreshPanel,
      }
    );
  }

  function startEdit(identifierId: string) {
    const row = panel.capturedIdentifiers.find((item) => item.id === identifierId);
    if (!row) {
      return;
    }
    setEditingId(identifierId);
    editForm.reset({
      identifierValue: "",
      expiryDate: dateFieldValue(row.expiryDate),
      notes: "",
      version: String(row.version),
    });
  }

  async function handleUpdate(identifierId: string) {
    await runPanelAction(
      () =>
        updatePartyIdentifierAction(partyId, identifierId, {
          expiryDate: editForm.textValue("expiryDate") || null,
          notes: editForm.textValue("notes") || null,
          version: Number(editForm.textValue("version")),
          ...(editForm.textValue("identifierValue")
            ? { identifierValue: editForm.textValue("identifierValue") }
            : {}),
        }),
      {
        successTitle: "Identifier updated",
        successMessage: "Changes saved.",
        onSuccess: refreshPanel,
      }
    );
  }

  async function handleVerify(identifierId: string, version: number) {
    await runPanelAction(
      () =>
        verifyPartyIdentifierAction(partyId, identifierId, {
          verificationMethod: "MANUAL",
          version,
        }),
      {
        successTitle: "Identifier verified",
        successMessage: "Verification recorded.",
        onSuccess: refreshPanel,
      }
    );
  }

  async function handleLinkDocument(identifierId: string, documentId: string, version: number) {
    await runPanelAction(
      () =>
        linkPartyIdentifierDocumentAction(partyId, identifierId, {
          documentId,
          version,
        }),
      {
        successTitle: "Evidence linked",
        successMessage: "Document linked as evidence.",
        onSuccess: refreshPanel,
      }
    );
  }

  async function handleRemove(identifierId: string, version: number) {
    requestConfirm({
      title: "Remove identifier?",
      description: "This identifier will be removed from the regulatory profile.",
      confirmLabel: "Remove",
      onConfirm: async () => {
        await runPanelAction(
          () => removePartyIdentifierAction(partyId, identifierId, { version }),
          {
            successTitle: "Identifier removed",
            successMessage: "Identifier removed from profile.",
            onSuccess: refreshPanel,
          }
        );
      },
    });
  }

  return (
    <div className="space-y-6">
      <FormFeedback />
      <ConfirmDialogHost />

      {panel.loadError ? (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardHeader>
            <CardTitle className="text-base">Identity & Regulatory unavailable</CardTitle>
            <CardDescription>{panel.loadError}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Regulatory Profile Summary</CardTitle>
          <CardDescription>
            Applicable identifiers are resolved from ENG-003b configuration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryMetric label="Country" value={panel.summary.countryName} />
            <SummaryMetric label="Rule Set" value={panel.summary.ruleSetName} />
            <SummaryMetric
              label="Verification %"
              value={`${panel.summary.verificationPercent}%`}
            />
            <SummaryMetric label="Required" value={panel.summary.requiredCount} />
            <SummaryMetric label="Captured" value={panel.summary.capturedCount} />
            <SummaryMetric label="Verified" value={panel.summary.verifiedCount} />
            <SummaryMetric
              label="Missing"
              value={panel.summary.missingCount}
              highlight={panel.summary.missingCount > 0 ? "danger" : undefined}
            />
            <SummaryMetric
              label="Expired"
              value={panel.summary.expiredCount}
              highlight={panel.summary.expiredCount > 0 ? "amber" : undefined}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Required Identifiers</CardTitle>
          <CardDescription>
            Required and optional identifiers for this party context.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {panel.requiredIdentifiers.length === 0 ? (
            <PlatformEmptyState
              title="No identifier requirements configured"
              description="Configure ENG-003b rule sets to define applicable identifiers."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Identifier</th>
                    <th className="py-2 pr-3 font-medium">Required</th>
                    <th className="py-2 pr-3 font-medium">Captured</th>
                    <th className="py-2 pr-3 font-medium">Verified</th>
                    <th className="py-2 pr-3 font-medium">Expiry</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {panel.requiredIdentifiers.map((row) => (
                    <tr key={row.identifierTypeCode} className="border-b">
                      <td className="py-3 pr-3">{row.identifierTypeName}</td>
                      <td className="py-3 pr-3">{row.isRequired ? "Yes" : "No"}</td>
                      <td className="py-3 pr-3">{row.maskedValue ?? "—"}</td>
                      <td className="py-3 pr-3">
                        {row.verificationStatus === "VERIFIED" ? "Yes" : "No"}
                      </td>
                      <td className="py-3 pr-3">{formatDate(row.expiryDate)}</td>
                      <td className="py-3 pr-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(row.displayStatus)}`}
                        >
                          {row.displayStatus}
                        </span>
                      </td>
                      <td className="py-3">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => setCaptureTypeCode(row.identifierTypeCode)}
                        >
                          {row.capturedIdentifierId ? "Edit" : "Capture"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {captureTypeCode ? (
        <Card>
          <CardHeader>
            <CardTitle>Capture Identifier</CardTitle>
            <CardDescription>
              {panel.availableIdentifierTypes.find((t) => t.code === captureTypeCode)?.name ??
                captureTypeCode}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="identifierValue">Identifier Value</Label>
              <Input
                id="identifierValue"
                value={captureForm.textValue("identifierValue")}
                onChange={(event) =>
                  captureForm.setField("identifierValue", event.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issueDate">Issue Date</Label>
              <Input
                id="issueDate"
                type="date"
                value={captureForm.textValue("issueDate")}
                onChange={(event) =>
                  captureForm.setField("issueDate", event.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiryDate">Expiry Date</Label>
              <Input
                id="expiryDate"
                type="date"
                value={captureForm.textValue("expiryDate")}
                onChange={(event) =>
                  captureForm.setField("expiryDate", event.target.value)
                }
              />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="button" disabled={isPending} onClick={handleCapture}>
                {isPending ? PROCESSING_LABELS.saving : "Save Identifier"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => setCaptureTypeCode("")}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Captured Identifiers</CardTitle>
          <CardDescription>
            Sensitive values are masked unless you hold the view-full permission.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {panel.capturedIdentifiers.length === 0 ? (
            <PlatformEmptyState
              title="No identifiers captured"
              description="Capture required identifiers to build the regulatory profile."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Identifier</th>
                    <th className="py-2 pr-3 font-medium">Value</th>
                    <th className="py-2 pr-3 font-medium">Verification</th>
                    <th className="py-2 pr-3 font-medium">Evidence</th>
                    <th className="py-2 pr-3 font-medium">Expiry</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {panel.capturedIdentifiers.map((row) => (
                    <tr key={row.id} className="border-b align-top">
                      <td className="py-3 pr-3">{row.identifierTypeName}</td>
                      <td className="py-3 pr-3 font-mono">{row.maskedValue}</td>
                      <td className="py-3 pr-3">{row.verificationStatus}</td>
                      <td className="py-3 pr-3">{row.linkedDocumentName ?? "—"}</td>
                      <td className="py-3 pr-3">{formatDate(row.expiryDate)}</td>
                      <td className="py-3 pr-3">{row.statusCode}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => startEdit(row.id)}
                          >
                            Edit
                          </Button>
                          {row.verificationStatus !== "VERIFIED" ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={isPending}
                              onClick={() => handleVerify(row.id, row.version)}
                            >
                              Verify
                            </Button>
                          ) : null}
                          {panel.availableDocuments[0] ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={isPending}
                              onClick={() =>
                                handleLinkDocument(
                                  row.id,
                                  panel.availableDocuments[0].id,
                                  row.version
                                )
                              }
                            >
                              Link Evidence
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={isPending}
                            onClick={() => handleRemove(row.id, row.version)}
                          >
                            Remove
                          </Button>
                        </div>
                        {editingId === row.id ? (
                          <div className="mt-3 grid gap-2 rounded-lg border p-3">
                            <Input
                              placeholder="New value (optional)"
                              value={editForm.textValue("identifierValue")}
                              onChange={(event) =>
                                editForm.setField("identifierValue", event.target.value)
                              }
                            />
                            <Input
                              type="date"
                              value={editForm.textValue("expiryDate")}
                              onChange={(event) =>
                                editForm.setField("expiryDate", event.target.value)
                              }
                            />
                            <Button
                              type="button"
                              size="sm"
                              disabled={isPending}
                              onClick={() => handleUpdate(row.id)}
                            >
                              Save Changes
                            </Button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Verification</CardTitle>
          <CardDescription>
            Manual verification today. Architecture ready for government and partner APIs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {panel.verifications.length === 0 ? (
            <PlatformEmptyState
              title="No verification records"
              description="Verify captured identifiers to complete the regulatory profile."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Identifier</th>
                    <th className="py-2 pr-3 font-medium">Value</th>
                    <th className="py-2 pr-3 font-medium">Method</th>
                    <th className="py-2 pr-3 font-medium">Verified By</th>
                    <th className="py-2 pr-3 font-medium">Date</th>
                    <th className="py-2 font-medium">Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {panel.verifications.map((row) => (
                    <tr key={row.identifierId} className="border-b">
                      <td className="py-3 pr-3">{row.identifierTypeName}</td>
                      <td className="py-3 pr-3 font-mono">{row.maskedValue}</td>
                      <td className="py-3 pr-3">{row.verificationMethod}</td>
                      <td className="py-3 pr-3">{row.verifiedByDisplay ?? "—"}</td>
                      <td className="py-3 pr-3">{formatDate(row.verifiedAt)}</td>
                      <td className="py-3">{row.linkedDocumentName ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
