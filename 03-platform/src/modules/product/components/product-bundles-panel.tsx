/**
 * Purpose:
 * Product Workspace Bundles tab — bundles containing this product.
 */

"use client";

import Link from "next/link";

import { PlatformEmptyState } from "@/components/platform";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ProductBundlesPanelView } from "@/modules/product/types";
import { BUNDLE_UI_LABELS } from "@/modules/product/bundle-ui-labels";

type ProductBundlesPanelProps = {
  initialData: ProductBundlesPanelView;
};

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
      new Date(iso)
    );
  } catch {
    return iso;
  }
}

export function ProductBundlesPanel({ initialData }: ProductBundlesPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData.bundleLabel}</CardTitle>
        <CardDescription>{BUNDLE_UI_LABELS.productPanelDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        {initialData.bundles.length === 0 ? (
          <PlatformEmptyState
            title={`Not included in any ${initialData.bundleLabel.toLowerCase()} yet`}
            description="When this offering is added to a bundle or package, it will appear here."
            actionLabel="Browse bundles"
            actionHref="/products/bundles"
          />
        ) : (
          <ul className="divide-y rounded-lg border border-border/60">
            {initialData.bundles.map((bundle) => (
              <li key={bundle.id}>
                <Link
                  href={`/products/bundles/${bundle.id}`}
                  prefetch={false}
                  className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{bundle.bundleName}</p>
                    <p className="text-sm text-muted-foreground">
                      {bundle.bundleCode} · {bundle.bundleTypeLabel} ·{" "}
                      {bundle.itemCount} items
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {bundle.statusLabel} · {formatDate(bundle.updatedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
