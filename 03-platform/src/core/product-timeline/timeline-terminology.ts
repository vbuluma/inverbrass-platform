/**
 * ENG-003k — Terminology-aware product timeline labels.
 */

import type { BusinessTerminology } from "@/core/industry-experience/business-terminology";
import {
  PRODUCT_TIMELINE_SOURCE_MODULE_LABELS,
  type ProductTimelineSourceModule,
} from "@/core/product-timeline/constants";

export function resolveProductTimelineSourceModuleLabels(
  terminology: BusinessTerminology
): Record<ProductTimelineSourceModule, string> {
  return {
    ...PRODUCT_TIMELINE_SOURCE_MODULE_LABELS,
    PRODUCT_MANAGEMENT: `${terminology.offerings.plural} Management`,
  };
}

export function localizeTimelinePanelView<
  T extends {
    events: Array<{ sourceModuleLabel?: string; sourceModule?: string }>;
    filterOptions?: {
      sourceModules?: Array<{ code: string; label: string }>;
    };
  },
>(panel: T, terminology: BusinessTerminology): T {
  const labels = resolveProductTimelineSourceModuleLabels(terminology);

  return {
    ...panel,
    events: panel.events.map((event) => ({
      ...event,
      sourceModuleLabel:
        event.sourceModule &&
        labels[event.sourceModule as ProductTimelineSourceModule]
          ? labels[event.sourceModule as ProductTimelineSourceModule]
          : event.sourceModuleLabel,
    })),
    filterOptions: panel.filterOptions
      ? {
          ...panel.filterOptions,
          sourceModules: panel.filterOptions.sourceModules?.map((item) => ({
            ...item,
            label:
              labels[item.code as ProductTimelineSourceModule] ?? item.label,
          })),
        }
      : panel.filterOptions,
  };
}
