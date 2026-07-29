/**
 * Purpose:
 * Party Workspace Timeline tab — list and filter timeline events.
 *
 * Architecture:
 * UI → Server Actions → PartyTimelineQueryService → PartyTimelineService
 *
 * Implementation Package:
 * BP-002 / IP-010 – Party Timeline & Activity History
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  createPartyTimelineService,
  PARTY_TIMELINE_CATEGORY_LABELS,
  PARTY_TIMELINE_DEFAULT_PAGE_SIZE,
  PARTY_TIMELINE_SOURCE_MODULE_LABELS,
} from "@/core/party-timeline";
import { PartyError, PARTY_USER_MESSAGES } from "@/modules/party/errors";
import { createPartyRepository } from "@/modules/party/repositories/party-repository";
import type { PartyTimelinePanelView } from "@/modules/party/types";
import {
  partyTimelineListFiltersSchema,
  type PartyTimelineListFiltersInput,
} from "@/modules/party/validators/party-timeline-validators";

export class PartyTimelineQueryService {
  constructor(
    private readonly partyRepository = createPartyRepository(),
    private readonly timelineService = createPartyTimelineService()
  ) {}

  async getTimelinePanel(
    context: CurrentBusinessContext,
    partyId: string,
    filters: PartyTimelineListFiltersInput = {
      limit: PARTY_TIMELINE_DEFAULT_PAGE_SIZE,
      offset: 0,
    }
  ): Promise<PartyTimelinePanelView> {
    const parsed = partyTimelineListFiltersSchema.safeParse(filters);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new PartyError(
        "INVALID_INPUT",
        first?.message ?? PARTY_USER_MESSAGES.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    await this.requireParty(context, partyId);

    const [listResult, filterOptions] = await Promise.all([
      this.timelineService.listEvents(context.businessId, partyId, parsed.data),
      this.timelineService.getFilterOptions(context.businessId, partyId),
    ]);

    const allCategories = Object.entries(PARTY_TIMELINE_CATEGORY_LABELS).map(
      ([code, label]) => ({ code, label })
    );
    const allSourceModules = Object.entries(
      PARTY_TIMELINE_SOURCE_MODULE_LABELS
    ).map(([code, label]) => ({ code, label }));

    return {
      events: listResult.events,
      totalCount: listResult.totalCount,
      hasMore: listResult.hasMore,
      pageSize: listResult.pageSize,
      offset: listResult.offset,
      filterOptions: {
        categories:
          filterOptions.categories.length > 0
            ? filterOptions.categories
            : allCategories,
        sourceModules:
          filterOptions.sourceModules.length > 0
            ? filterOptions.sourceModules
            : allSourceModules,
      },
    };
  }

  private async requireParty(
    context: CurrentBusinessContext,
    partyId: string
  ) {
    const party = await this.partyRepository.findByIdIncludingArchived(
      context.businessId,
      partyId
    );
    if (!party) {
      throw new PartyError(
        "PARTY_NOT_FOUND",
        PARTY_USER_MESSAGES.PARTY_NOT_FOUND,
        404
      );
    }
    return party;
  }
}

export function createPartyTimelineQueryService(): PartyTimelineQueryService {
  return new PartyTimelineQueryService();
}
