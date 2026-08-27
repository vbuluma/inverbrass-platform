/**
 * Purpose:
 * Variant workspace audit history panel.
 *
 * Implementation Package:
 * BP-003 / IP-005 – Product Variants Engine
 */

"use client";

import { PlatformEmptyState } from "@/components/platform";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { VariantAuditHistoryPanelView } from "@/modules/product/types";
import { useProductUiLabels } from "@/modules/product/product-terminology-labels";

type VariantAuditHistoryPanelProps = {
  initialData: VariantAuditHistoryPanelView;
};

function formatDateTime(value: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function VariantAuditHistoryPanel({
  initialData,
}: VariantAuditHistoryPanelProps) {
  const labels = useProductUiLabels();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.variant.auditHeading}</CardTitle>
        <CardDescription>
          Immutable record of variant changes (ENG-013).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {initialData.entries.length === 0 ? (
          <PlatformEmptyState
            title="No audit entries yet"
            description="Changes to this variant are recorded on create, update, and lifecycle actions."
          />
        ) : (
          <ul className="space-y-3">
            {initialData.entries.map((entry) => (
              <li
                key={entry.id}
                className="rounded-lg border border-border/60 px-4 py-3 text-sm"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-medium">
                    {entry.operationLabel}
                    {entry.fieldName ? ` · ${entry.fieldName}` : ""}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(entry.changedDateTime)}
                  </span>
                </div>
                {(entry.oldValue || entry.newValue) && (
                  <p className="mt-1 text-muted-foreground">
                    {entry.oldValue ? `${entry.oldValue} → ` : ""}
                    {entry.newValue ?? ""}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
