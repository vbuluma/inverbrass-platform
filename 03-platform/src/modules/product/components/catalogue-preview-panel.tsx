/**
 * Purpose:
 * Mock channel preview panels for catalogue workspace.
 */

"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CATALOGUE_PREVIEW_CHANNELS,
  CATALOGUE_UI_LABELS,
} from "@/modules/product/catalogue-ui-labels";
import type { CatalogueWorkspaceView } from "@/modules/product/types";

type CataloguePreviewPanelProps = {
  workspace: CatalogueWorkspaceView;
  previewChannel: string;
};

export function CataloguePreviewPanel({
  workspace,
  previewChannel,
}: CataloguePreviewPanelProps) {
  const channel = CATALOGUE_PREVIEW_CHANNELS.find((item) => item.id === previewChannel);
  const published = workspace.publications.filter((item) => item.published);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {CATALOGUE_UI_LABELS.previewHeading} — {channel?.label ?? previewChannel}
        </CardTitle>
        <CardDescription>{CATALOGUE_UI_LABELS.previewDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-dashed bg-muted/30 p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Mock {channel?.label ?? previewChannel} layout
          </p>
          <h3 className="mt-3 text-xl font-semibold">{workspace.productName}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{workspace.productCode}</p>
          {workspace.productDescription ? (
            <p className="mt-4 text-sm">{workspace.productDescription}</p>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No description configured.</p>
          )}
          <div className="mt-6 space-y-2">
            <p className="text-sm font-medium">Published channels</p>
            {published.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing published yet.</p>
            ) : (
              published.map((item) => (
                <div
                  key={item.channelId}
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                >
                  {item.channelName} · {item.visibilityLabel}
                  {item.featured ? " · Featured" : ""}
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
