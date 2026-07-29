/**
 * Purpose:
 * Party Workspace Documents & Compliance tab — compliance summary, requirements,
 * repository, verification, and AI placeholder.
 *
 * Implementation Package:
 * BP-002 / IP-007 – Documents & Compliance
 */

"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";

import {
  PlatformDocumentPreview,
  type PlatformDocumentPreviewItem,
  PlatformEmptyState,
  PROCESSING_LABELS,
  documentUploadedNextActions,
  useFormDraft,
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
import {
  deactivatePartyDocumentAction,
  getPartyDocumentDownloadUrlAction,
  getPartyDocumentPreviewUrlAction,
  listPartyDocumentsAction,
  reactivatePartyDocumentAction,
  removePartyDocumentAction,
  replacePartyDocumentAction,
  uploadPartyDocumentAction,
  verifyPartyDocumentAction,
} from "@/modules/party/actions/party-document-actions";
import {
  COMPLIANCE_REQUIREMENT_STATUSES,
  type ComplianceRequirementStatus,
} from "@/modules/party/services/party-document-compliance-rules";
import { PARTY_DOCUMENT_STATUS_CODES } from "@/modules/party/constants";
import type {
  PartyDocumentsPanelView,
  PartyDocumentRequirementView,
  PartyDocumentView,
} from "@/modules/party/types";

type PartyDocumentsPanelProps = {
  partyId: string;
  initialData: PartyDocumentsPanelView;
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

function formatMaxSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

function statusBadgeClass(status: ComplianceRequirementStatus): string {
  switch (status) {
    case COMPLIANCE_REQUIREMENT_STATUSES.VERIFIED:
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
    case COMPLIANCE_REQUIREMENT_STATUSES.UPLOADED:
      return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200";
    case COMPLIANCE_REQUIREMENT_STATUSES.EXPIRED:
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

export function PartyDocumentsPanel({
  partyId,
  initialData,
}: PartyDocumentsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetTypeRef = useRef<string | null>(null);
  const [panel, setPanel] = useState(initialData);
  const [syncedInitial, setSyncedInitial] = useState(initialData);
  const [filterTypeCode, setFilterTypeCode] = useState("");
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [aiExpanded, setAiExpanded] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<PlatformDocumentPreviewItem | null>(
    null
  );
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const {
    isPending,
    runPanelAction,
    clearResult,
    requestConfirm,
    FormFeedback,
    ConfirmDialogHost,
  } = usePanelFeedback<PartyDocumentsPanelView>();
  const {
    draftValues,
    saveDraft,
    clearDraft,
    draftSavedAt,
  } = useFormDraft<{
    documentTypeCode: string;
    issueDate: string;
    expiryDate: string;
    notes: string;
  }>(`party-${partyId}-documents-create-draft`);
  const [documentTypeCode, setDocumentTypeCode] = useState(
    () =>
      draftValues?.documentTypeCode ??
      initialData.availableDocumentTypes[0]?.code ??
      ""
  );
  const [issueDate, setIssueDate] = useState(
    () => draftValues?.issueDate ?? ""
  );
  const [expiryDate, setExpiryDate] = useState(
    () => draftValues?.expiryDate ?? ""
  );
  const [notes, setNotes] = useState(() => draftValues?.notes ?? "");

  if (initialData !== syncedInitial) {
    setSyncedInitial(initialData);
    setPanel(initialData);
    setDocumentTypeCode(initialData.availableDocumentTypes[0]?.code ?? "");
  }

  function applySuccess(data: PartyDocumentsPanelView) {
    setPanel(data);
    setIssueDate("");
    setExpiryDate("");
    setNotes("");
    setUploadProgress(null);
    setReplacingId(null);
    setShowUploadForm(false);
    uploadTargetTypeRef.current = null;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (replaceInputRef.current) {
      replaceInputRef.current.value = "";
    }
  }

  function buildFormData(file: File, typeCode?: string): FormData {
    const formData = new FormData();
    formData.set("file", file);
    formData.set("documentTypeCode", typeCode ?? documentTypeCode);
    if (issueDate) {
      formData.set("issueDate", issueDate);
    }
    if (expiryDate) {
      formData.set("expiryDate", expiryDate);
    }
    if (notes.trim()) {
      formData.set("notes", notes.trim());
    }
    return formData;
  }

  function onUploadSelected(file: File | undefined, typeCode?: string) {
    if (!file) {
      return;
    }
    setUploadProgress("Uploading…");
    runPanelAction(
      () =>
        uploadPartyDocumentAction(partyId, buildFormData(file, typeCode)),
      {
        successTitle: "Document uploaded successfully.",
        successMessage: "The document is now available in the repository.",
        nextActions: documentUploadedNextActions(partyId),
        onSuccess: (data) => {
          applySuccess(data);
          clearDraft();
        },
      }
    );
  }

  function onSaveDraft() {
    saveDraft({
      documentTypeCode,
      issueDate,
      expiryDate,
      notes,
    });
  }

  function onReplaceSelected(partyDocumentId: string, file: File | undefined) {
    if (!file) {
      return;
    }
    setUploadProgress("Replacing version…");
    runPanelAction(
      () =>
        replacePartyDocumentAction(
          partyId,
          partyDocumentId,
          buildFormData(file)
        ),
      {
        successTitle: "Document version replaced.",
        successMessage: "The new version is now active.",
        onSuccess: applySuccess,
      }
    );
  }

  function onFilterChange(typeCode: string) {
    setFilterTypeCode(typeCode);
    runPanelAction(
      () => listPartyDocumentsAction(partyId, typeCode || undefined),
      {
        successTitle: "Documents filtered.",
        successMessage: "The document list was updated.",
        onSuccess: (data) => setPanel(data),
      }
    );
  }

  function onVerify(doc: PartyDocumentView) {
    runPanelAction(() => verifyPartyDocumentAction(partyId, doc.id, {}), {
      successTitle: "Document verified.",
      successMessage: "This document is now marked as verified.",
      onSuccess: applySuccess,
    });
  }

  function onDeactivate(doc: PartyDocumentView) {
    requestConfirm({
      title: "Deactivate Document?",
      description:
        "This document will remain in history but cannot be used while inactive.",
      confirmLabel: "Deactivate",
      onConfirm: () => {
        runPanelAction(() => deactivatePartyDocumentAction(partyId, doc.id), {
          successTitle: "Document deactivated.",
          successMessage: "The document is no longer active.",
          onSuccess: applySuccess,
        });
      },
    });
  }

  function onReactivate(doc: PartyDocumentView) {
    runPanelAction(() => reactivatePartyDocumentAction(partyId, doc.id), {
      successTitle: "Document reactivated.",
      successMessage: "The document is active again.",
      onSuccess: applySuccess,
    });
  }

  function onRemove(doc: PartyDocumentView) {
    requestConfirm({
      title: "Remove Document?",
      description:
        "This document will be removed from the active list. Historical records may remain in audit history.",
      confirmLabel: "Remove",
      onConfirm: () => {
        runPanelAction(() => removePartyDocumentAction(partyId, doc.id), {
          successTitle: "Document removed.",
          successMessage: "The document was removed from this party.",
          onSuccess: applySuccess,
        });
      },
    });
  }

  function onDownload(doc: PartyDocumentView) {
    runPanelAction(
      async () => {
        const result = await getPartyDocumentDownloadUrlAction(partyId, doc.id);
        if (result.success) {
          window.open(result.data.url, "_blank", "noopener,noreferrer");
          return { success: true, data: panel };
        }
        return result;
      },
      {
        successTitle: "Download started.",
        successMessage: "The document opened in a new tab.",
        onSuccess: () => clearResult(),
      }
    );
  }

  function onPreview(doc: PartyDocumentView) {
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewItem({
      id: doc.id,
      fileName: doc.originalFileName,
      mimeType: doc.mimeType,
      url: "",
    });

    runPanelAction(
      async () => {
        const result = await getPartyDocumentPreviewUrlAction(partyId, doc.id);
        if (!result.success) {
          setPreviewError(result.error.message);
          setPreviewLoading(false);
          return result;
        }
        setPreviewItem({
          id: doc.id,
          fileName: doc.originalFileName,
          mimeType: doc.mimeType,
          url: result.data.url,
        });
        setPreviewLoading(false);
        return { success: true, data: panel };
      },
      {
        successTitle: "Preview ready.",
        successMessage: "Document loaded in the preview panel.",
        onSuccess: () => clearResult(),
      }
    );
  }

  function onUploadRequirement(requirement: PartyDocumentRequirementView) {
    setDocumentTypeCode(requirement.documentTypeCode);
    uploadTargetTypeRef.current = requirement.documentTypeCode;
    setShowUploadForm(true);
    fileInputRef.current?.click();
  }

  function onViewRequirement(requirement: PartyDocumentRequirementView) {
    const doc = panel.documents.find(
      (row) => row.id === requirement.partyDocumentId
    );
    if (doc) {
      onPreview(doc);
    }
  }

  function onReplaceRequirement(requirement: PartyDocumentRequirementView) {
    if (!requirement.partyDocumentId) {
      return;
    }
    setDocumentTypeCode(requirement.documentTypeCode);
    setReplacingId(requirement.partyDocumentId);
    replaceInputRef.current?.click();
  }

  function onVerifyRequirement(requirement: PartyDocumentRequirementView) {
    const doc = panel.documents.find(
      (row) => row.id === requirement.partyDocumentId
    );
    if (doc) {
      onVerify(doc);
    }
  }

  const allowedTypesLabel = panel.allowedMimeTypes
    .map((t) => t.replace("image/", "").replace("application/", "").toUpperCase())
    .join(", ");

  const summary = panel.complianceSummary;

  return (
    <div className="space-y-6">

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compliance Summary</CardTitle>
          <CardDescription>
            Is this Party compliant? Evidence is evaluated against ENG-003b
            regulatory configuration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryMetric label="Country" value={summary.countryName} />
            <SummaryMetric label="Applicable Rule Set" value={summary.ruleSetName} />
            <SummaryMetric
              label="Compliance"
              value={`${summary.compliancePercent}%`}
            />
            <SummaryMetric label="Required Documents" value={summary.requiredCount} />
            <SummaryMetric label="Uploaded" value={summary.uploadedCount} />
            <SummaryMetric label="Verified" value={summary.verifiedCount} />
            <SummaryMetric
              label="Expired"
              value={summary.expiredCount}
              highlight={summary.expiredCount > 0 ? "amber" : undefined}
            />
            <SummaryMetric
              label="Missing"
              value={summary.missingCount}
              highlight={summary.missingCount > 0 ? "danger" : undefined}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Required Documents</CardTitle>
          <CardDescription>
            All applicable requirements from the rule set — including missing
            items.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {panel.requiredDocuments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No regulatory document requirements configured for this Party
              context.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">Document Type</th>
                    <th className="pb-2 pr-3 font-medium">Required</th>
                    <th className="pb-2 pr-3 font-medium">Status</th>
                    <th className="pb-2 pr-3 font-medium">Issue Date</th>
                    <th className="pb-2 pr-3 font-medium">Expiry Date</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {panel.requiredDocuments.map((requirement) => (
                    <tr
                      key={requirement.documentTypeCode}
                      className="border-b last:border-0"
                    >
                      <td className="py-3 pr-3 font-medium">
                        {requirement.documentTypeName}
                      </td>
                      <td className="py-3 pr-3">
                        {requirement.isRequired ? "Yes" : "Optional"}
                      </td>
                      <td className="py-3 pr-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(requirement.status)}`}
                        >
                          {requirement.status}
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        {formatDate(requirement.issueDate)}
                      </td>
                      <td className="py-3 pr-3">
                        {formatDate(requirement.expiryDate)}
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          {requirement.status ===
                          COMPLIANCE_REQUIREMENT_STATUSES.MISSING ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={isPending}
                              onClick={() => onUploadRequirement(requirement)}
                            >
                              Upload Document
                            </Button>
                          ) : null}
                          {requirement.partyDocumentId ? (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={isPending}
                                onClick={() => onViewRequirement(requirement)}
                              >
                                View
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={isPending}
                                onClick={() => onReplaceRequirement(requirement)}
                              >
                                Replace
                              </Button>
                              {requirement.status !==
                                COMPLIANCE_REQUIREMENT_STATUSES.VERIFIED ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={isPending}
                                  onClick={() => onVerifyRequirement(requirement)}
                                >
                                  Verify
                                </Button>
                              ) : null}
                            </>
                          ) : null}
                        </div>
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
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">Uploaded Documents</CardTitle>
            <CardDescription>
              Document repository — {panel.documents.length} file
              {panel.documents.length === 1 ? "" : "s"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => setShowUploadForm((value) => !value)}
            >
              {showUploadForm ? "Hide Upload" : "Upload Document"}
            </Button>
            <div className="w-44">
              <Label htmlFor="filterType" className="sr-only">
                Filter by type
              </Label>
              <select
                id="filterType"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={filterTypeCode}
                onChange={(e) => onFilterChange(e.target.value)}
                disabled={isPending}
              >
                <option value="">All types</option>
                {panel.availableDocumentTypes.map((type) => (
                  <option key={type.code} value={type.code}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showUploadForm ? (
            <div className="rounded-lg border p-4 space-y-4">
              <p className="text-sm font-medium">Upload Document</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="documentTypeCode">Document Type</Label>
                  <select
                    id="documentTypeCode"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    value={documentTypeCode}
                    onChange={(e) => setDocumentTypeCode(e.target.value)}
                    disabled={isPending}
                  >
                    {panel.availableDocumentTypes.map((type) => (
                      <option key={type.code} value={type.code}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="docFile">File</Label>
                  <Input
                    ref={fileInputRef}
                    id="docFile"
                    type="file"
                    accept={panel.allowedMimeTypes.join(",")}
                    disabled={isPending}
                    onChange={(e) =>
                      onUploadSelected(
                        e.target.files?.[0],
                        uploadTargetTypeRef.current ?? documentTypeCode
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="issueDate">Issue Date</Label>
                  <Input
                    id="issueDate"
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiryDate">Expiry Date</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    disabled={isPending}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="docNotes">Notes</Label>
                <Input
                  id="docNotes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isPending}
                  placeholder="Optional notes"
                />
              </div>
              {uploadProgress ? (
                <p className="text-sm text-muted-foreground">{uploadProgress}</p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                PDF, JPG, JPEG, PNG — max {formatMaxSize(panel.maxUploadSizeBytes)}.
                Allowed: {allowedTypesLabel}
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={onSaveDraft}
              >
                Save Draft
              </Button>
              <FormFeedback
                processingLabel={PROCESSING_LABELS.uploadingDocument}
                draftSavedAt={draftSavedAt}
              />
            </div>
          ) : null}

          {panel.documents.length === 0 ? (
            <PlatformEmptyState
              title="No Documents Yet"
              description="Upload your first document to begin building the compliance repository."
              actionLabel="Upload Document"
              onAction={() => setShowUploadForm(true)}
              compact
            />
          ) : (
            <ul className="divide-y divide-border">
              {panel.documents.map((doc) => (
                <li key={doc.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{doc.documentTypeName}</p>
                      <p className="text-sm text-muted-foreground">
                        {doc.originalFileName} · {doc.fileSizeDisplay}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Issue: {formatDate(doc.issueDate)} · Expiry:{" "}
                        {formatDate(doc.expiryDate)} · Status: {doc.statusCode}
                        {doc.isVerified ? " · Verified" : ""}
                      </p>
                      {doc.fileHash ? (
                        <p className="text-xs font-mono text-muted-foreground break-all">
                          SHA-256: {doc.fileHash}
                        </p>
                      ) : null}
                      {doc.supersedesDocumentId ? (
                        <p className="text-xs text-muted-foreground">
                          Replaces document {doc.supersedesDocumentId.slice(0, 8)}…
                          (audit trail)
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {doc.statusCode === PARTY_DOCUMENT_STATUS_CODES.ACTIVE ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => onPreview(doc)}
                          >
                            Preview
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => onDownload(doc)}
                          >
                            Download
                          </Button>
                          {!doc.isVerified ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={isPending}
                              onClick={() => onVerify(doc)}
                            >
                              Verify
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => {
                              setReplacingId(doc.id);
                              setDocumentTypeCode(doc.documentTypeCode);
                              replaceInputRef.current?.click();
                            }}
                          >
                            Replace
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => onDeactivate(doc)}
                          >
                            Deactivate
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => onReactivate(doc)}
                        >
                          Reactivate
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={isPending}
                        onClick={() => onRemove(doc)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <input
            ref={replaceInputRef}
            type="file"
            className="hidden"
            accept={panel.allowedMimeTypes.join(",")}
            onChange={(e) => {
              if (replacingId) {
                onReplaceSelected(replacingId, e.target.files?.[0]);
              }
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Verification</CardTitle>
          <CardDescription>
            Manual verification today — architecture ready for regulator API
            checks later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {panel.verifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No uploaded documents to verify.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">Document</th>
                    <th className="pb-2 pr-3 font-medium">Status</th>
                    <th className="pb-2 pr-3 font-medium">Verified By</th>
                    <th className="pb-2 pr-3 font-medium">Verification Date</th>
                    <th className="pb-2 pr-3 font-medium">Method</th>
                    <th className="pb-2 font-medium">Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {panel.verifications.map((row) => (
                    <tr key={row.partyDocumentId} className="border-b last:border-0">
                      <td className="py-3 pr-3">
                        <p className="font-medium">{row.documentTypeName}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.originalFileName}
                        </p>
                      </td>
                      <td className="py-3 pr-3">{row.verificationStatus}</td>
                      <td className="py-3 pr-3">
                        {row.verifiedByDisplay ?? "—"}
                      </td>
                      <td className="py-3 pr-3">
                        {formatDate(row.verifiedAt)}
                      </td>
                      <td className="py-3 pr-3">{row.verificationMethod}</td>
                      <td className="py-3">{row.comments ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <button
          type="button"
          className="flex w-full items-center justify-between px-6 py-4 text-left"
          onClick={() => setAiExpanded((value) => !value)}
        >
          <div>
            <p className="text-base font-semibold">AI Compliance Insights</p>
            <p className="text-sm text-muted-foreground">
              Available in a future Implementation Package.
            </p>
          </div>
          {aiExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {aiExpanded ? (
          <CardContent className="border-t pt-4">
            <p className="text-sm text-muted-foreground">
              OCR, RAG, and automated compliance recommendations will appear
              here. No AI processing is performed in this Implementation Package.
            </p>
          </CardContent>
        ) : null}
      </Card>
      <PlatformDocumentPreview
        document={previewItem}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        isLoading={previewLoading}
        loadError={previewError}
        onDownload={(item) => {
          const doc = panel.documents.find((row) => row.id === item.id);
          if (doc) {
            onDownload(doc);
          }
        }}
        onReplace={(item) => {
          setReplacingId(item.id);
          replaceInputRef.current?.click();
        }}
        onVerify={(item) => {
          const doc = panel.documents.find((row) => row.id === item.id);
          if (doc) {
            onVerify(doc);
          }
        }}
      />
      <ConfirmDialogHost />
    </div>
  );
}
