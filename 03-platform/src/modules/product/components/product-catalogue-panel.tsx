/**
 * Purpose:
 * Product Workspace Catalogue tab — publication summary and workspace link.
 */

"use client";

import Link from "next/link";

import { PlatformEmptyState } from "@/components/platform";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useProductUiLabels } from "@/modules/product/product-terminology-labels";
import type { ProductCataloguePanelView } from "@/modules/product/types";

type ProductCataloguePanelProps = {
  initialData: ProductCataloguePanelView;
};

export function ProductCataloguePanel({ initialData }: ProductCataloguePanelProps) {
  const labels = useProductUiLabels();
  const publishedCount = initialData.publications.filter((item) => item.published).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{labels.catalogue.productPanelHeading}</h2>
          <p className="text-sm text-muted-foreground">
            {labels.catalogue.productPanelDescription}
          </p>
        </div>
        <Link
          href={initialData.workspaceHref}
          prefetch={false}
          className={cn(buttonVariants({ variant: "default", size: "sm" }))}
        >
          {labels.catalogue.openWorkspace}
        </Link>
      </div>

      {!initialData.publishable ? (
        <PlatformEmptyState
          title={labels.catalogue.notPublishableTitle}
          description={labels.catalogue.notPublishableDescription}
        />
      ) : publishedCount === 0 ? (
        <PlatformEmptyState
          title="Not published yet"
          description="Configure channel visibility in the catalogue workspace."
          actionLabel={labels.catalogue.openWorkspace}
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
                    <p className="text-muted-foreground">{item.visibilityLabel}</p>
                  </div>
                  {item.featured ? (
                    <span className="text-xs font-medium text-amber-700">Featured</span>
                  ) : null}
                </div>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
