/**
 * Purpose:
 * Build variant timeline events from authenticated business context.
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import type { RecordVariantTimelineEventPayload } from "@/core/variant-timeline/types";

type BuildVariantTimelineInput = Omit<
  RecordVariantTimelineEventPayload,
  "businessId" | "performedByUserId" | "performedByName" | "createdBy"
>;

export function buildVariantTimelineEventFromContext(
  context: CurrentBusinessContext,
  input: BuildVariantTimelineInput
): RecordVariantTimelineEventPayload {
  return {
    ...input,
    businessId: context.businessId,
    performedByUserId: context.platformUserId,
    performedByName: null,
    createdBy: context.platformUserId,
    systemGenerated: input.systemGenerated ?? true,
  };
}
