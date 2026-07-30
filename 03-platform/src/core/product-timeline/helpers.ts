/**
 * Purpose:
 * Build product timeline event payloads from authenticated business context.
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  PRODUCT_TIMELINE_SOURCE_MODULES,
  type ProductTimelineEventCategory,
  type ProductTimelineEventType,
  type ProductTimelineSourceModule,
} from "@/core/product-timeline/constants";
import type { RecordProductTimelineEventPayload } from "@/core/product-timeline/types";

type TimelineEventInput = {
  productId: string;
  eventType: ProductTimelineEventType | string;
  eventCategory: ProductTimelineEventCategory | string;
  summary: string;
  sourceModule?: ProductTimelineSourceModule | string;
  eventDateTime?: Date;
  referenceEntity?: string | null;
  referenceId?: string | null;
  description?: string | null;
  performedByName?: string | null;
  metadata?: Record<string, unknown> | null;
};

export function buildProductTimelineEventFromContext(
  context: CurrentBusinessContext,
  input: TimelineEventInput
): RecordProductTimelineEventPayload {
  return {
    businessId: context.businessId,
    productId: input.productId,
    eventType: input.eventType,
    eventCategory: input.eventCategory,
    sourceModule:
      input.sourceModule ?? PRODUCT_TIMELINE_SOURCE_MODULES.PRODUCT_MANAGEMENT,
    summary: input.summary,
    eventDateTime: input.eventDateTime,
    referenceEntity: input.referenceEntity,
    referenceId: input.referenceId,
    description: input.description,
    performedByUserId: context.platformUserId,
    performedByName: input.performedByName,
    metadata: input.metadata,
    createdBy: context.platformUserId,
    systemGenerated: true,
  };
}
