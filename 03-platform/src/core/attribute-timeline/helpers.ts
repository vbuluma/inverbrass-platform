/**
 * Purpose:
 * Build attribute timeline events from authenticated business context.
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import type { RecordAttributeTimelineEventPayload } from "@/core/attribute-timeline/types";

type BuildAttributeTimelineInput = Omit<
  RecordAttributeTimelineEventPayload,
  "businessId" | "performedByUserId" | "performedByName" | "createdBy"
>;

export function buildAttributeTimelineEventFromContext(
  context: CurrentBusinessContext,
  input: BuildAttributeTimelineInput
): RecordAttributeTimelineEventPayload {
  return {
    ...input,
    businessId: context.businessId,
    performedByUserId: context.platformUserId,
    performedByName: null,
    createdBy: context.platformUserId,
    systemGenerated: input.systemGenerated ?? true,
  };
}
