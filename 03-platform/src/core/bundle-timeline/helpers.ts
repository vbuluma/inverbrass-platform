/**
 * Purpose:
 * Build bundle timeline events from authenticated business context.
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import type { RecordBundleTimelineEventPayload } from "@/core/bundle-timeline/types";

type BuildBundleTimelineInput = Omit<
  RecordBundleTimelineEventPayload,
  "businessId" | "performedByUserId" | "performedByName" | "createdBy"
>;

export function buildBundleTimelineEventFromContext(
  context: CurrentBusinessContext,
  input: BuildBundleTimelineInput
): RecordBundleTimelineEventPayload {
  return {
    ...input,
    businessId: context.businessId,
    performedByUserId: context.platformUserId,
    performedByName: null,
    createdBy: context.platformUserId,
    systemGenerated: input.systemGenerated ?? true,
  };
}
