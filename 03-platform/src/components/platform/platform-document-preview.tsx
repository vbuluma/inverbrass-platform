/**
 * UX-001.2 — In-App Document Preview
 *
 * Slide-over panel for PDF, images, video, audio, and office documents.
 * Does not open a new browser tab.
 */

"use client";

import { DownloadIcon, FileTextIcon, ReplaceIcon, ShieldCheckIcon, XIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type PlatformDocumentPreviewItem = {
  id: string;
  fileName: string;
  mimeType: string;
  url: string;
};

type PlatformDocumentPreviewProps = {
  document: PlatformDocumentPreviewItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload?: (document: PlatformDocumentPreviewItem) => void;
  onReplace?: (document: PlatformDocumentPreviewItem) => void;
  onVerify?: (document: PlatformDocumentPreviewItem) => void;
  isLoading?: boolean;
  loadError?: string | null;
};

function previewKind(mimeType: string): "pdf" | "image" | "video" | "audio" | "office" | "other" {
  const type = mimeType.toLowerCase();
  if (type.includes("pdf")) {
    return "pdf";
  }
  if (type.startsWith("image/")) {
    return "image";
  }
  if (type.startsWith("video/")) {
    return "video";
  }
  if (type.startsWith("audio/")) {
    return "audio";
  }
  if (
    type.includes("word") ||
    type.includes("excel") ||
    type.includes("spreadsheet") ||
    type.includes("presentation") ||
    type.includes("officedocument")
  ) {
    return "office";
  }
  return "other";
}

export function PlatformDocumentPreview({
  document,
  open,
  onOpenChange,
  onDownload,
  onReplace,
  onVerify,
  isLoading = false,
  loadError = null,
}: PlatformDocumentPreviewProps) {
  const kind = useMemo(
    () => (document ? previewKind(document.mimeType) : "other"),
    [document]
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl"
      >
        <SheetHeader className="border-b border-border px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <SheetTitle className="truncate text-base">
                {document?.fileName ?? "Document Preview"}
              </SheetTitle>
              <SheetDescription>
                Preview inside the application — no new tab required.
              </SheetDescription>
            </div>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              aria-label="Close preview"
            >
              <XIcon className="size-4" />
            </Button>
          </div>
          {document ? (
            <div className="flex flex-wrap gap-2 pt-2">
              {onDownload ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onDownload(document)}
                >
                  <DownloadIcon className="size-4" aria-hidden />
                  Download
                </Button>
              ) : null}
              {onReplace ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onReplace(document)}
                >
                  <ReplaceIcon className="size-4" aria-hidden />
                  Replace
                </Button>
              ) : null}
              {onVerify ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onVerify(document)}
                >
                  <ShieldCheckIcon className="size-4" aria-hidden />
                  Verify
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </div>
          ) : null}
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/20">
          {isLoading ? (
            <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
              Loading preview…
            </div>
          ) : loadError ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <p className="text-sm text-destructive">{loadError}</p>
              {onDownload && document ? (
                <Button type="button" size="sm" onClick={() => onDownload(document)}>
                  Download instead
                </Button>
              ) : null}
            </div>
          ) : document ? (
            <PreviewBody
              key={document.id + document.url}
              document={document}
              kind={kind}
              onDownload={onDownload}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
              Select a document to preview.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PreviewBody({
  document,
  kind,
  onDownload,
}: {
  document: PlatformDocumentPreviewItem;
  kind: ReturnType<typeof previewKind>;
  onDownload?: (document: PlatformDocumentPreviewItem) => void;
}) {
  const [iframeError, setIframeError] = useState(false);

  if (kind === "image") {
    return (
      <div className="flex flex-1 items-center justify-center overflow-auto p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={document.url}
          alt={document.fileName}
          className="max-h-full max-w-full object-contain"
        />
      </div>
    );
  }

  if (kind === "video") {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <video
          src={document.url}
          controls
          className="max-h-full max-w-full"
          aria-label={document.fileName}
        />
      </div>
    );
  }

  if (kind === "audio") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <FileTextIcon className="size-12 text-muted-foreground" aria-hidden />
        <audio src={document.url} controls className="w-full max-w-md" />
      </div>
    );
  }

  if ((kind === "pdf" || kind === "office") && !iframeError) {
    return (
      <iframe
        src={document.url}
        title={document.fileName}
        className="h-full min-h-[60vh] w-full flex-1 border-0 bg-background"
        onError={() => setIframeError(true)}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <FileTextIcon className="size-12 text-muted-foreground" aria-hidden />
      <p className="text-sm text-muted-foreground">
        Inline preview is not available for this file type.
      </p>
      {onDownload ? (
        <Button type="button" onClick={() => onDownload(document)}>
          <DownloadIcon className="size-4" aria-hidden />
          Download
        </Button>
      ) : null}
    </div>
  );
}
