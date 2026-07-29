/**
 * Purpose:
 * Zod schemas for Party Audit History list filters.
 *
 * Implementation Package:
 * BP-002 / IP-011 – Enterprise Audit History
 */

import { z } from "zod";

import { AUDIT_DEFAULT_PAGE_SIZE } from "@/core/audit/constants";

export const partyAuditListFiltersSchema = z.object({
  operation: z.string().trim().optional(),
  entityName: z.string().trim().optional(),
  changedBy: z.string().trim().optional(),
  search: z.string().trim().max(200).optional(),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(AUDIT_DEFAULT_PAGE_SIZE),
  offset: z.number().int().min(0).optional().default(0),
});

export type PartyAuditListFiltersInput = z.infer<
  typeof partyAuditListFiltersSchema
>;
