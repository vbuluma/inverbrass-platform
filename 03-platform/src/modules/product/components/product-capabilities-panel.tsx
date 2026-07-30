/**
 * Purpose:
 * Grouped capability checkboxes for the Product Workspace overview.
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation
 */

"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { PRODUCT_TYPE_CODES } from "@/modules/product/constants";
import {
  PRODUCT_CAPABILITY_LABELS,
} from "@/modules/product/ui-labels";

type ProductCapabilitiesPanelProps = {
  productTypeCode: string;
  values: {
    isSellable: boolean;
    isPurchasable: boolean;
    isBookable: boolean;
    isRentable: boolean;
    isSubscription: boolean;
    isDigital: boolean;
  };
  disabled?: boolean;
  onChange: (
    field:
      | "isSellable"
      | "isPurchasable"
      | "isBookable"
      | "isRentable"
      | "isSubscription"
      | "isDigital",
    checked: boolean
  ) => void;
};

function isCapabilityChecked(
  field: (typeof PRODUCT_CAPABILITY_LABELS)[number]["field"],
  productTypeCode: string,
  values: ProductCapabilitiesPanelProps["values"]
): boolean {
  if (field === "isInsurable") {
    return productTypeCode === PRODUCT_TYPE_CODES.INSURANCE;
  }
  if (field === "isLoanProduct") {
    return productTypeCode === PRODUCT_TYPE_CODES.LOAN_PRODUCT;
  }
  return values[field as keyof ProductCapabilitiesPanelProps["values"]];
}

function isDerivedCapability(
  field: (typeof PRODUCT_CAPABILITY_LABELS)[number]["field"]
): boolean {
  return field === "isInsurable" || field === "isLoanProduct";
}

export function ProductCapabilitiesPanel({
  productTypeCode,
  values,
  disabled = false,
  onChange,
}: ProductCapabilitiesPanelProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {PRODUCT_CAPABILITY_LABELS.map((capability) => {
          const derived = isDerivedCapability(capability.field);
          const checked = isCapabilityChecked(
            capability.field,
            productTypeCode,
            values
          );

          return (
            <label
              key={capability.field}
              className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <Checkbox
                checked={checked}
                disabled={disabled || derived}
                onCheckedChange={(next) => {
                  if (derived) return;
                  onChange(
                    capability.field as keyof ProductCapabilitiesPanelProps["values"],
                    next === true
                  );
                }}
              />
              <span>{capability.label}</span>
              {derived ? (
                <span className="ml-auto text-xs text-muted-foreground">
                  From type
                </span>
              ) : null}
            </label>
          );
        })}
    </div>
  );
}
