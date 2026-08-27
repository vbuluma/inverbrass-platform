/**
 * Purpose:
 * Product Workspace Documents tab — upload, preview, list, and manage files.
 *
 * Implementation Package:
 * BP-003 / IP-009 – Offering Documents & Compliance
 */

"use client";

import { useRef, useState } from "react";

import {
  PlatformDocumentPreview,
  type PlatformDocumentPreviewItem,
  PlatformEmptyState,
  PROCESSING_LABELS,
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
  deactivateOfferingDocumentAction,
  getOfferingDocumentDownloadUrlAction,
  getOfferingDocumentPreviewUrlAction,
  getOfferingDocumentsPanelAction,
  reactivateOfferingDocumentAction,
  removeOfferingDocumentAction,
  replaceOfferingDocumentAction,
  uploadOfferingDocumentAction,
  verifyOfferingDocumentAction,
} from "@/modules/product/actions/offering-document-actions";
import {
  OFFERING_DOCUMENT_ALLOWED_MIME_TYPES,
  OFFERING_DOCUMENT_MAX_SIZE_BYTES,
  OFFERING_DOCUMENT_STATUS_CODES,
} from "@/modules/product/constants";
import type {
  OfferingDocumentsPanelView,
  OfferingDocumentView,
} from "@/modules/product/types";

type OfferingDocumentsPanelProps = {
  productId: string;
  initialData: OfferingDocumentsPanelView;
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

export function OfferingDocumentsPanel({
  productId,
  initialData,
}: OfferingDocumentsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [panel, setPanel] = useState(initialData);
  const [syncedInitial, setSyncedInitial] = useState(initialData);
  const [filterTypeCode, setFilterTypeCode] = useState("");
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [replacingId, setReplacingId] = useState<string | null>(null);
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
  } = usePanelFeedback<OfferingDocumentsPanelView>();
  const { draftValues, saveDraft, clearDraft, draftSavedAt } = useFormDraft<{
    documentTypeCode: string;
    issueDate: string;
    expiryDate: string;
    notes: string;
  }>(`product-${productId}-documents-create-draft`);
  const [documentTypeCode, setDocumentTypeCode] = useState(
    () =>
      draftValues?.documentTypeCode ?? initialData.documentTypes[0]?.code ?? ""
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
    setDocumentTypeCode(initialData.documentTypes[0]?.code ?? "");
  }

  function applySuccess(data: OfferingDocumentsPanelView) {
    setPanel(data);
    setIssueDate("");
    setExpiryDate("");
    setNotes("");
    setUploadProgress(null);
    setShowUploadForm(false);
    setReplacingId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (replaceInputRef.current) {
      replaceInputRef.current.value = "";
    }
  }

  function buildFormData(file: File): FormData {
    const formData = new FormData();
    formData.set("file", file);
    formData.set("documentTypeCode", documentTypeCode);
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

  function onUploadSelected(file: File | undefined) {
    if (!file) {
      return;
    }
    setUploadProgress("Uploading…");
    runPanelAction(
      () => uploadOfferingDocumentAction(productId, buildFormData(file)),
      {
        successTitle: "Document uploaded successfully.",
        successMessage: "The document is now available in the repository.",
        onSuccess: (data) => {
          applySuccess(data);
          clearDraft();
        },
      }
    );
  }

  function onReplaceSelected(offeringDocumentId: string, file: File | undefined) {
    if (!file) {
      return;
    }
    setUploadProgress("Replacing version…");
    runPanelAction(
      () =>
        replaceOfferingDocumentAction(
          productId,
          offeringDocumentId,
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
      () => getOfferingDocumentsPanelAction(productId, typeCode || undefined),
      {
        successTitle: "Documents filtered.",
        successMessage: "The document list was updated.",
        onSuccess: (data) => setPanel(data),
      }
    );
  }

  function onVerify(doc: OfferingDocumentView) {
    runPanelAction(
      () => verifyOfferingDocumentAction(productId, doc.id, {}),
      {
        successTitle: "Document verified.",
        successMessage: "This document is now marked as verified.",
        onSuccess: applySuccess,
      }
    );
  }

  function onDeactivate(doc: OfferingDocumentView) {
    requestConfirm({
      title: "Deactivate Document?",
      description:
        "This document will remain in history but cannot be used while inactive.",
      confirmLabel: "Deactivate",
      onConfirm: () => {
        runPanelAction(
          () => deactivateOfferingDocumentAction(productId, doc.id),
          {
            successTitle: "Document deactivated.",
            successMessage: "The document is no longer active.",
            onSuccess: applySuccess,
          }
        );
      },
    });
  }

  function onReactivate(doc: OfferingDocumentView) {
    runPanelAction(() => reactivateOfferingDocumentAction(productId, doc.id), {
      successTitle: "Document reactivated.",
      successMessage: "The document is active again.",
      onSuccess: applySuccess,
    });
  }

  function onRemove(doc: OfferingDocumentView) {
    requestConfirm({
      title: "Remove Document?",
      description:
        "This document will be removed from the active list. Historical records may remain in audit history.",
      confirmLabel: "Remove",
      onConfirm: () => {
        runPanelAction(() => removeOfferingDocumentAction(productId, doc.id), {
          successTitle: "Document removed.",
          successMessage: "The document was removed from this product.",
          onSuccess: applySuccess,
        });
      },
    });
  }

  function onDownload(doc: OfferingDocumentView) {
    runPanelAction(
      async () => {
        const result = await getOfferingDocumentDownloadUrlAction(
          productId,
          doc.id
        );
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

  function onPreview(doc: OfferingDocumentView) {
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
        const result = await getOfferingDocumentPreviewUrlAction(
          productId,
          doc.id
        );
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

  const allowedTypesLabel = OFFERING_DOCUMENT_ALLOWED_MIME_TYPES.map((type) =>
    type.replace("image/", "").replace("application/", "").toUpperCase()
  ).join(", ");

  return (
    <div className="space-y-6">
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
                {panel.documentTypes.map((type) => (
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
            <div className="space-y-4 rounded-lg border p-4">
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
                    {panel.documentTypes.map((type) => (
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
                    accept={OFFERING_DOCUMENT_ALLOWED_MIME_TYPES.join(",")}
                    disabled={isPending}
                    onChange={(e) => onUploadSelected(e.target.files?.[0])}
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
                Max {formatMaxSize(OFFERING_DOCUMENT_MAX_SIZE_BYTES)}. Allowed:{" "}
                {allowedTypesLabel}
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() =>
                  saveDraft({
                    documentTypeCode,
                    issueDate,
                    expiryDate,
                    notes,
                  })
                }
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
              description="Upload your first document to begin building the offering document repository."
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
                        Uploaded: {formatDate(doc.uploadedAt)} · Issue:{" "}
                        {formatDate(doc.issueDate)} · Expiry:{" "}
                        {formatDate(doc.expiryDate)} · Status: {doc.statusCode}
                        {doc.isVerified ? " · Verified" : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {doc.statusCode === OFFERING_DOCUMENT_STATUS_CODES.ACTIVE ? (
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

          <Input
            ref={replaceInputRef}
            type="file"
            className="hidden"
            accept={OFFERING_DOCUMENT_ALLOWED_MIME_TYPES.join(",")}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && replacingId) {
                onReplaceSelected(replacingId, file);
              }
            }}
          />
        </CardContent>
      </Card>

      <PlatformDocumentPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        document={previewItem}
        isLoading={previewLoading}
        loadError={previewError}
        onDownload={
          previewItem
            ? () => {
                const doc = panel.documents.find(
                  (row) => row.id === previewItem.id
                );
                if (doc) {
                  onDownload(doc);
                }
              }
            : undefined
        }
      />

      <ConfirmDialogHost />
    </div>
  );
}
