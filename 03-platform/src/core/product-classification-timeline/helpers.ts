/**
 * Purpose:
 * Build classification timeline payloads from business context.
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  CLASSIFICATION_TIMELINE_SOURCE_MODULES,
  type ClassificationTimelineEventCategory,
} from "@/core/product-classification-timeline/constants";
import type { RecordClassificationTimelineEventPayload } from "@/core/product-classification-timeline/types";

type TimelineEventInput = {
  classificationId: string;
  eventType: string;
  eventCategory: ClassificationTimelineEventCategory | string;
  summary: string;
  referenceEntity?: string | null;
  referenceId?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
};

export function buildClassificationTimelineEventFromContext(
  context: CurrentBusinessContext,
  input: TimelineEventInput
): RecordClassificationTimelineEventPayload {
  return {
    businessId: context.businessId,
    classificationId: input.classificationId,
    eventType: input.eventType,
    eventCategory: input.eventCategory,
    sourceModule: CLASSIFICATION_TIMELINE_SOURCE_MODULES.CATALOGUE_STRUCTURE,
    summary: input.summary,
    referenceEntity: input.referenceEntity,
    referenceId: input.referenceId,
    description: input.description,
    performedByUserId: context.platformUserId,
    metadata: input.metadata,
    createdBy: context.platformUserId,
    systemGenerated: true,
  };
}
