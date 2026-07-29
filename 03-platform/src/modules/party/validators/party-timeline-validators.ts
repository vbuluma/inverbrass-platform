/**
 * Purpose:
 * Zod schemas for Party Timeline list filters.
 *
 * Implementation Package:
 * BP-002 / IP-010 – Party Timeline & Activity History
 */

import { z } from "zod";

import { PARTY_TIMELINE_DEFAULT_PAGE_SIZE } from "@/core/party-timeline/constants";

export const partyTimelineListFiltersSchema = z.object({
  category: z.string().trim().optional(),
  sourceModule: z.string().trim().optional(),
  search: z.string().trim().max(200).optional(),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(PARTY_TIMELINE_DEFAULT_PAGE_SIZE),
  offset: z.number().int().min(0).optional().default(0),
});

export type PartyTimelineListFiltersInput = z.infer<
  typeof partyTimelineListFiltersSchema
>;
