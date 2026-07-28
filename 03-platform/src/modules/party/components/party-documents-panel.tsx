/**
 * Purpose:
 * Party Workspace Documents tab — upload, preview, download, verify, manage.
 *
 * Implementation Package:
 * BP-002 / IP-007 – Party Documents
 */

"use client";

import { useRef, useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { PARTY_DOCUMENT_STATUS_CODES } from "@/modules/party/constants";
import type {
  PartyDocumentsPanelView,
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

export function PartyDocumentsPanel({
  partyId,
  initialData,
}: PartyDocumentsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [panel, setPanel] = useState(initialData);
  const [syncedInitial, setSyncedInitial] = useState(initialData);
  const [documentTypeCode, setDocumentTypeCode] = useState(
    initialData.availableDocumentTypes[0]?.code ?? ""
  );
  const [filterTypeCode, setFilterTypeCode] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (initialData !== syncedInitial) {
    setSyncedInitial(initialData);
    setPanel(initialData);
    setDocumentTypeCode(initialData.availableDocumentTypes[0]?.code ?? "");
  }

  function applyPanelResult(
    result:
      | { success: true; data: PartyDocumentsPanelView }
      | { success: false; error: { message: string } },
    successMessage: string
  ) {
    if (!result.success) {
      setError(result.error.message);
      setUploadProgress(null);
      return;
    }
    setError(null);
    setMessage(successMessage);
    setPanel(result.data);
    setIssueDate("");
    setExpiryDate("");
    setNotes("");
    setUploadProgress(null);
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
    setError(null);
    setMessage(null);
    setUploadProgress("Uploading…");
    startTransition(async () => {
      const result = await uploadPartyDocumentAction(
        partyId,
        buildFormData(file)
      );
      applyPanelResult(result, "Document uploaded.");
    });
  }

  function onReplaceSelected(partyDocumentId: string, file: File | undefined) {
    if (!file) {
      return;
    }
    setError(null);
    setMessage(null);
    setUploadProgress("Replacing version…");
    startTransition(async () => {
      const formData = buildFormData(file);
      const result = await replacePartyDocumentAction(
        partyId,
        partyDocumentId,
        formData
      );
      applyPanelResult(result, "Document version replaced.");
    });
  }

  function onFilterChange(typeCode: string) {
    setFilterTypeCode(typeCode);
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await listPartyDocumentsAction(
        partyId,
        typeCode || undefined
      );
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      setPanel(result.data);
    });
  }

  function onVerify(doc: PartyDocumentView) {
    startTransition(async () => {
      const result = await verifyPartyDocumentAction(partyId, doc.id, {});
      applyPanelResult(result, "Document verified.");
    });
  }

  function onDeactivate(doc: PartyDocumentView) {
    startTransition(async () => {
      const result = await deactivatePartyDocumentAction(partyId, doc.id);
      applyPanelResult(result, "Document deactivated.");
    });
  }

  function onReactivate(doc: PartyDocumentView) {
    startTransition(async () => {
      const result = await reactivatePartyDocumentAction(partyId, doc.id);
      applyPanelResult(result, "Document reactivated.");
    });
  }

  function onRemove(doc: PartyDocumentView) {
    startTransition(async () => {
      const result = await removePartyDocumentAction(partyId, doc.id);
      applyPanelResult(result, "Document removed.");
    });
  }

  function onDownload(doc: PartyDocumentView) {
    startTransition(async () => {
      const result = await getPartyDocumentDownloadUrlAction(partyId, doc.id);
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      window.open(result.data.url, "_blank", "noopener,noreferrer");
    });
  }

  function onPreview(doc: PartyDocumentView) {
    startTransition(async () => {
      const result = await getPartyDocumentPreviewUrlAction(partyId, doc.id);
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      window.open(result.data.url, "_blank", "noopener,noreferrer");
    });
  }

  const allowedTypesLabel = panel.allowedMimeTypes
    .map((t) => t.replace("image/", "").replace("application/", "").toUpperCase())
    .join(", ");

  return (
    <div className="space-y-6">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {message ? (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload Document</CardTitle>
          <CardDescription>
            PDF, JPG, JPEG, PNG — max {formatMaxSize(panel.maxUploadSizeBytes)}.
            Files are stored in secure object storage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
            Allowed formats: {allowedTypesLabel}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">Documents</CardTitle>
            <CardDescription>
              {panel.documents.length} document
              {panel.documents.length === 1 ? "" : "s"}
            </CardDescription>
          </div>
          <div className="w-48">
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
        </CardHeader>
        <CardContent>
          {panel.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No documents yet. Upload a file above.
            </p>
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
    </div>
  );
}
