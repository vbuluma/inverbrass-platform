/**
 * Purpose:
 * Product Workspace Catalogue tab — publication summary and workspace link.
 */

"use client";

import Link from "next/link";

import { PlatformEmptyState } from "@/components/platform";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CATALOGUE_UI_LABELS } from "@/modules/product/catalogue-ui-labels";
import type { ProductCataloguePanelView } from "@/modules/product/types";

type ProductCataloguePanelProps = {
  initialData: ProductCataloguePanelView;
};

export function ProductCataloguePanel({ initialData }: ProductCataloguePanelProps) {
  const publishedCount = initialData.publications.filter((item) => item.published).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{CATALOGUE_UI_LABELS.productPanelHeading}</h2>
          <p className="text-sm text-muted-foreground">
            {CATALOGUE_UI_LABELS.productPanelDescription}
          </p>
        </div>
        <Link
          href={initialData.workspaceHref}
          prefetch={false}
          className={cn(buttonVariants({ variant: "default", size: "sm" }))}
        >
          {CATALOGUE_UI_LABELS.openWorkspace}
        </Link>
      </div>

      {!initialData.publishable ? (
        <PlatformEmptyState
          title="Product not publishable"
          description="Only active products can be published to digital channels."
        />
      ) : publishedCount === 0 ? (
        <PlatformEmptyState
          title="Not published yet"
          description="Configure channel visibility in the catalogue workspace."
          actionLabel={CATALOGUE_UI_LABELS.openWorkspace}
          actionHref={initialData.workspaceHref}
        />
      ) : (
        <ul className="divide-y rounded-lg border border-border/60">
          {initialData.publications
            .filter((item) => item.published)
            .map((item) => (
              <li key={item.channelId} className="px-4 py-3 text-sm">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{item.channelName}</p>
                    <p className="text-muted-foreground">
                      {item.visibilityLabel}
                      {item.featured ? " · Featured" : ""}
                      {item.isLive ? " · Live" : " · Scheduled/Inactive"}
                    </p>
                  </div>
                  {item.qrEnabled && item.qrSlug ? (
                    <span className="text-xs text-muted-foreground">QR: {item.qrSlug}</span>
                  ) : null}
                </div>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
