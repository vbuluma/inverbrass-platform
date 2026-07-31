/**
 * Purpose:
 * Hierarchy breadcrumb path for Catalogue Structure nodes.
 */

"use client";

import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";

import type { ProductClassificationBreadcrumbItem } from "@/modules/product/types";
import { CATALOGUE_STRUCTURE_UI_LABELS } from "@/modules/product/catalogue-structure-ui-labels";

type ClassificationBreadcrumbPathProps = {
  items: ProductClassificationBreadcrumbItem[];
};

export function ClassificationBreadcrumbPath({
  items,
}: ClassificationBreadcrumbPathProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Catalogue hierarchy" className="text-sm">
      <ol className="flex flex-wrap items-center gap-1 text-muted-foreground">
        <li>
          <Link
            href="/products/classifications"
            className="hover:text-foreground hover:underline"
          >
            {CATALOGUE_STRUCTURE_UI_LABELS.breadcrumbRoot}
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={item.id} className="flex items-center gap-1">
            <ChevronRightIcon className="size-3.5" aria-hidden />
            {index === items.length - 1 ? (
              <span className="font-medium text-foreground">
                {item.icon ? `${item.icon} ` : ""}
                {item.name}
              </span>
            ) : (
              <Link
                href={`/products/classifications/${item.id}`}
                className="hover:text-foreground hover:underline"
              >
                {item.icon ? `${item.icon} ` : ""}
                {item.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
