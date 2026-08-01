/**
 * Purpose:
 * Digital Catalogue Workspace — channel publications and mock previews.
 */

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { SetBreadcrumbs } from "@/components/platform/breadcrumb-context";
import {
  PlatformEmptyState,
  PlatformFormActionFooter,
  PlatformProcessingButton,
  PlatformTabs,
  PlatformWorkspaceHeader,
  PROCESSING_LABELS,
  useAsyncAction,
} from "@/components/platform";
import { platformError, platformSuccess } from "@/core/platform/platform-action-helpers";
import type { PlatformActionResult } from "@/core/platform/types";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  getCatalogueVisibilityOptionsAction,
  upsertPublicationAction,
} from "@/modules/product/actions/product-catalogue-actions";
import {
  CATALOGUE_PREVIEW_CHANNELS,
  CATALOGUE_UI_LABELS,
  CATALOGUE_WORKSPACE_TABS,
} from "@/modules/product/catalogue-ui-labels";
import { CataloguePreviewPanel } from "@/modules/product/components/catalogue-preview-panel";
import { CATALOGUE_VISIBILITY_CODES } from "@/modules/product/constants";
import { visibilityOptions as defaultVisibilityOptions } from "@/modules/product/services/product-catalogue-rules";
import type {
  CataloguePublicationView,
  CatalogueWorkspaceView,
} from "@/modules/product/types";

type CatalogueWorkspaceProps = {
  initialData: CatalogueWorkspaceView;
  initialTab?: string;
};

type VisibilityOption = { code: string; label: string };

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string): string | null {
  if (!value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function publicationForChannel(
  publications: CataloguePublicationView[],
  channelId: string
): CataloguePublicationView | undefined {
  return publications.find((item) => item.channelId === channelId);
}

type ChannelPublicationFormProps = {
  workspace: CatalogueWorkspaceView;
  channelId: string;
  channelCode: string;
  channelName: string;
  publication: CataloguePublicationView | undefined;
  visibilityOptions: VisibilityOption[];
  disabled: boolean;
  onSaved: (next: CatalogueWorkspaceView) => void;
};

function ChannelPublicationForm({
  workspace,
  channelId,
  channelCode,
  channelName,
  publication,
  visibilityOptions,
  disabled,
  onSaved,
}: ChannelPublicationFormProps) {
  const [published, setPublished] = useState(publication?.published ?? false);
  const [visibility, setVisibility] = useState(
    publication?.visibility ?? CATALOGUE_VISIBILITY_CODES.PUBLIC
  );
  const [publishFrom, setPublishFrom] = useState(
    toDatetimeLocalValue(publication?.publishFrom ?? null)
  );
  const [publishTo, setPublishTo] = useState(
    toDatetimeLocalValue(publication?.publishTo ?? null)
  );
  const [featured, setFeatured] = useState(publication?.featured ?? false);
  const [recommended, setRecommended] = useState(publication?.recommended ?? false);
  const [qrEnabled, setQrEnabled] = useState(publication?.qrEnabled ?? false);
  const [qrSlug, setQrSlug] = useState(publication?.qrSlug ?? "");
  const [result, setResult] = useState<PlatformActionResult | null>(null);
  const { isProcessing, run } = useAsyncAction();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setResult(null);

    await run(async () => {
      const response = await upsertPublicationAction(workspace.productId, {
        channelCode,
        published,
        visibility,
        publishFrom: fromDatetimeLocalValue(publishFrom),
        publishTo: fromDatetimeLocalValue(publishTo),
        featured,
        recommended,
        qrEnabled,
        qrSlug: qrSlug.trim() || null,
      });

      if (!response.success) {
        setResult(platformError("Could not save publication", response.error.message));
        return;
      }

      onSaved(response.data);
      setResult(platformSuccess("Publication saved", "Channel settings updated."));
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{channelName}</CardTitle>
        <CardDescription>{channelCode}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={published}
              onChange={(event) => setPublished(event.target.checked)}
              disabled={disabled}
            />
            Published to this channel
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`visibility-${channelId}`}>Visibility</Label>
              <select
                id={`visibility-${channelId}`}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                value={visibility}
                onChange={(event) => setVisibility(event.target.value)}
                disabled={disabled || !published}
              >
                {visibilityOptions.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`qr-slug-${channelId}`}>QR slug (metadata)</Label>
              <Input
                id={`qr-slug-${channelId}`}
                value={qrSlug}
                onChange={(event) => setQrSlug(event.target.value)}
                disabled={disabled || !published || !qrEnabled}
                placeholder="auto-generated if empty"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`publish-from-${channelId}`}>Publish from</Label>
              <Input
                id={`publish-from-${channelId}`}
                type="datetime-local"
                value={publishFrom}
                onChange={(event) => setPublishFrom(event.target.value)}
                disabled={disabled || !published}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`publish-to-${channelId}`}>Publish to</Label>
              <Input
                id={`publish-to-${channelId}`}
                type="datetime-local"
                value={publishTo}
                onChange={(event) => setPublishTo(event.target.value)}
                disabled={disabled || !published}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={featured}
                onChange={(event) => setFeatured(event.target.checked)}
                disabled={disabled || !published}
              />
              Featured
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={recommended}
                onChange={(event) => setRecommended(event.target.checked)}
                disabled={disabled || !published}
              />
              Recommended
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={qrEnabled}
                onChange={(event) => setQrEnabled(event.target.checked)}
                disabled={disabled || !published}
              />
              QR metadata enabled
            </label>
          </div>

          {publication?.isLive ? (
            <p className="text-xs text-emerald-700">Currently live on this channel.</p>
          ) : publication?.published ? (
            <p className="text-xs text-muted-foreground">
              Published but not currently live (schedule or visibility).
            </p>
          ) : null}

          {result ? (
            <p
              className={cn(
                "text-sm",
                result.success ? "text-emerald-700" : "text-destructive"
              )}
            >
              {result.message}
            </p>
          ) : null}

          <PlatformFormActionFooter>
            <PlatformProcessingButton
              type="submit"
              isProcessing={isProcessing}
              processingLabel={PROCESSING_LABELS.saving}
              idleLabel={`Save ${channelName}`}
              disabled={disabled}
            >
              Save {channelName}
            </PlatformProcessingButton>
          </PlatformFormActionFooter>
        </form>
      </CardContent>
    </Card>
  );
}

export function CatalogueWorkspace({
  initialData,
  initialTab = "publications",
}: CatalogueWorkspaceProps) {
  const [workspace, setWorkspace] = useState(initialData);
  const [syncedInitial, setSyncedInitial] = useState(initialData);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [previewChannel, setPreviewChannel] = useState<string>(
    CATALOGUE_PREVIEW_CHANNELS[0].id
  );
  const [visibilityOptions, setVisibilityOptions] = useState<VisibilityOption[]>([]);

  if (initialData !== syncedInitial) {
    setSyncedInitial(initialData);
    setWorkspace(initialData);
  }

  useEffect(() => {
    void getCatalogueVisibilityOptionsAction().then((result) => {
      if (result.success) {
        setVisibilityOptions(result.data);
      }
    });
  }, []);

  const disabled = !workspace.publishable;
  const tabs = CATALOGUE_WORKSPACE_TABS.filter((tab) => tab.available);
  const effectiveVisibilityOptions =
    visibilityOptions.length > 0 ? visibilityOptions : defaultVisibilityOptions();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <SetBreadcrumbs
        items={[
          { label: "Products", href: "/products" },
          { label: CATALOGUE_UI_LABELS.moduleName, href: "/products/catalogue" },
          { label: workspace.productName },
        ]}
      />

      <PlatformWorkspaceHeader
        workspaceLabel={CATALOGUE_UI_LABELS.workspaceTitle}
        title={workspace.productName}
        subtitle={`${workspace.productCode} · ${workspace.statusLabel}`}
        statusLabel={workspace.statusLabel}
        backHref="/products/catalogue"
        backLabel="Back to catalogue"
        primaryActions={
          <Link
            href={`/products/${workspace.productId}`}
            prefetch={false}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Product workspace
          </Link>
        }
      />

      {!workspace.publishable ? (
        <PlatformEmptyState
          title="Product not publishable"
          description="Only active products can be published. Activate the product first."
          actionLabel="Open product workspace"
          actionHref={`/products/${workspace.productId}`}
        />
      ) : null}

      <PlatformTabs
        tabs={tabs.map((tab) => ({ id: tab.id, label: tab.label }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        ariaLabel="Catalogue workspace sections"
      />

      {activeTab === "publications" ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">{CATALOGUE_UI_LABELS.publicationHeading}</h2>
            <p className="text-sm text-muted-foreground">
              {CATALOGUE_UI_LABELS.publicationDescription}
            </p>
          </div>
          <div className="space-y-4">
            {workspace.channels.map((channel) => {
              const publication = publicationForChannel(workspace.publications, channel.id);
              return (
              <ChannelPublicationForm
                key={`${channel.id}-${publication?.version ?? 0}`}
                workspace={workspace}
                channelId={channel.id}
                channelCode={channel.code}
                channelName={channel.name}
                publication={publication}
                visibilityOptions={effectiveVisibilityOptions}
                disabled={disabled}
                onSaved={setWorkspace}
              />
            );
            })}
          </div>
        </section>
      ) : null}

      {activeTab === "preview" ? (
        <section className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {CATALOGUE_PREVIEW_CHANNELS.map((channel) => (
              <Button
                key={channel.id}
                type="button"
                size="sm"
                variant={previewChannel === channel.id ? "default" : "outline"}
                onClick={() => setPreviewChannel(channel.id)}
              >
                {channel.label}
              </Button>
            ))}
          </div>
          <CataloguePreviewPanel workspace={workspace} previewChannel={previewChannel} />
        </section>
      ) : null}
    </main>
  );
}
