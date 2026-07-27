/**
 * Purpose:
 * Validate Business Registration create payloads (industry + template + name).
 *
 * Design rationale:
 * Business Templates are business_type rows filtered by Industry Solution.
 * Validation enforces UUID references; catalogue membership is checked in service.
 *
 * Why this exists:
 * BP-001 foundation correction — Business Registration starts only after Platform
 * Registration and must not use a global unfiltered business-type dropdown.
 */

import { z } from "zod";

export const createBusinessSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(1, "Business name is required.")
    .max(200, "Business name is too long."),
  industryId: z.string().uuid("Select an Industry Type."),
  businessTypeId: z.string().uuid("Select a business template."),
  countryCode: z
    .string()
    .length(2, "Country code must be a 2-letter ISO code."),
  mobileNumber: z.string().min(1).optional(),
});

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;
