/**
 * Purpose:
 * Zod validators for CRM analytics filters and export.
 *
 * Implementation Package:
 * BP-004 / IP-12 – CRM Analytics & Dashboards
 */

import { z } from "zod";

const optionalUuid = z.string().uuid().optional();
const optionalDate = z
  .string()
  .datetime({ offset: true })
  .or(z.string().date())
  .optional();

export const crmAnalyticsFiltersSchema = z.object({
  dateFrom: optionalDate,
  dateTo: optionalDate,
  partyId: optionalUuid,
  ownerUserId: optionalUuid,
});

export const exportCrmAnalyticsSchema = crmAnalyticsFiltersSchema;

export type CrmAnalyticsFiltersInput = z.infer<typeof crmAnalyticsFiltersSchema>;
