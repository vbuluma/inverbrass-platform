/**
 * Purpose:
 * Product Workspace Variants tab — list variants for the parent offering.
 *
 * Implementation Package:
 * BP-003 / IP-005 – Product Variants Engine
 */

"use client";

import { PlusIcon } from "lucide-react";
import Link from "next/link";

import {
  PlatformEmptyState,
} from "@/components/platform";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ProductVariantsPanelView } from "@/modules/product/types";
import { VARIANT_UI_LABELS } from "@/modules/product/variant-ui-labels";

type ProductVariantsPanelProps = {
  initialData: ProductVariantsPanelView;
  disabled?: boolean;
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

export function ProductVariantsPanel({
  initialData,
  disabled = false,
}: ProductVariantsPanelProps) {
  const registerHref = `/products/variants/new?productId=${initialData.productId}`;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>{initialData.variantLabel}</CardTitle>
          <CardDescription>{VARIANT_UI_LABELS.productPanelDescription}</CardDescription>
        </div>
        {!disabled ? (
          <Link
            href={registerHref}
            prefetch={false}
            className={cn(buttonVariants({ variant: "default", size: "sm" }), "gap-2")}
          >
            <PlusIcon className="size-4" aria-hidden />
            {VARIANT_UI_LABELS.quickActionRegister}
          </Link>
        ) : null}
      </CardHeader>
      <CardContent>
        {initialData.variants.length === 0 ? (
          <PlatformEmptyState
            title={`No ${initialData.variantLabel.toLowerCase()} yet`}
            description="Simple offerings may have no variants. Register one when you need a distinguishable sellable version."
            actionLabel={disabled ? undefined : VARIANT_UI_LABELS.quickActionRegister}
            actionHref={disabled ? undefined : registerHref}
          />
        ) : (
          <ul className="divide-y rounded-lg border border-border/60">
            {initialData.variants.map((variant) => (
              <li key={variant.id}>
                <Link
                  href={`/products/variants/${variant.id}`}
                  prefetch={false}
                  className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{variant.variantName}</p>
                    <p className="text-sm text-muted-foreground">
                      {variant.variantCode}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {variant.statusLabel} · {formatDate(variant.updatedAt)}
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
