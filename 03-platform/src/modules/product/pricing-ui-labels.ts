/**
 * @deprecated Display labels: `buildPricingUiLabels()` / `useProductUiLabels().pricing`
 * in product-terminology-labels.ts.
 *
 * Retained temporarily for external references; do not use in new UI code.
 */

import { resolveBusinessTerminology } from "@/core/industry-experience/business-terminology";
import { buildPricingUiLabels } from "@/modules/product/product-terminology-labels";

/** @deprecated Use `useProductUiLabels().pricing` in client components. */
export const PRICING_UI_LABELS = buildPricingUiLabels(
  resolveBusinessTerminology(null)
);
