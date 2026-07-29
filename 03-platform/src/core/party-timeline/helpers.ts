/**
 * Purpose:
 * Build timeline event payloads from authenticated business context.
 *
 * Implementation Package:
 * BP-002 / IP-010 – Party Timeline & Activity History
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  PARTY_TIMELINE_SOURCE_MODULES,
  type PartyTimelineEventCategory,
  type PartyTimelineEventType,
  type PartyTimelineSourceModule,
} from "@/core/party-timeline/constants";
import type { RecordPartyTimelineEventPayload } from "@/core/party-timeline/types";

type TimelineEventInput = {
  partyId: string;
  eventType: PartyTimelineEventType | string;
  eventCategory: PartyTimelineEventCategory | string;
  summary: string;
  sourceModule?: PartyTimelineSourceModule | string;
  eventDateTime?: Date;
  referenceEntity?: string | null;
  referenceId?: string | null;
  description?: string | null;
  performedByName?: string | null;
  metadata?: Record<string, unknown> | null;
};

export function buildTimelineEventFromContext(
  context: CurrentBusinessContext,
  input: TimelineEventInput
): RecordPartyTimelineEventPayload {
  return {
    businessId: context.businessId,
    partyId: input.partyId,
    eventType: input.eventType,
    eventCategory: input.eventCategory,
    sourceModule: input.sourceModule ?? PARTY_TIMELINE_SOURCE_MODULES.PARTY_MANAGEMENT,
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
