/**
 * Purpose:
 * Build unit timeline payloads from business context.
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  UNIT_TIMELINE_SOURCE_MODULES,
  type UnitTimelineEventCategory,
} from "@/core/unit-timeline/constants";
import type { RecordUnitTimelineEventPayload } from "@/core/unit-timeline/types";

type TimelineEventInput = {
  unitId: string;
  eventType: string;
  eventCategory: UnitTimelineEventCategory | string;
  summary: string;
  referenceEntity?: string | null;
  referenceId?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
};

export function buildUnitTimelineEventFromContext(
  context: CurrentBusinessContext,
  input: TimelineEventInput
): RecordUnitTimelineEventPayload {
  return {
    businessId: context.businessId,
    unitId: input.unitId,
    eventType: input.eventType,
    eventCategory: input.eventCategory,
    sourceModule: UNIT_TIMELINE_SOURCE_MODULES.UNITS_OF_MEASURE,
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
