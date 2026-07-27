/**
 * Purpose:
 * Zod structural validators for Party Role payloads.
 *
 * Implementation Package:
 * BP-002 / IP-002 – Party Roles
 */

import { z } from "zod";

export const assignPartyRoleSchema = z.object({
  roleTypeCode: z
    .string()
    .trim()
    .min(1, "Select a role type.")
    .max(50),
  effectiveDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid effective date.")
    .optional()
    .or(z.literal("")),
  isPrimary: z.boolean().optional(),
});

export const updatePartyRoleSchema = z.object({
  isPrimary: z.boolean().optional(),
  effectiveDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid effective date.")
    .optional()
    .or(z.literal("")),
  endDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid end date.")
    .optional()
    .nullable()
    .or(z.literal("")),
  reactivate: z.boolean().optional(),
});
