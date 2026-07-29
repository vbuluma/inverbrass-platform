/**
 * Purpose:
 * Zod structural validators for Party Group payloads.
 *
 * Implementation Package:
 * BP-002 / IP-008 – Party Groups & Membership
 */

import { z } from "zod";

const optionalNotes = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .or(z.literal(""));

const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");

export const createPartyGroupSchema = z.object({
  groupName: z
    .string()
    .trim()
    .min(1, "Enter a group name.")
    .max(200),
  groupCode: z
    .string()
    .trim()
    .min(1, "Enter a group code.")
    .max(50)
    .regex(
      /^[A-Za-z0-9_-]+$/,
      "Group code may only contain letters, numbers, hyphens, and underscores."
    ),
  groupTypeCode: z
    .string()
    .trim()
    .min(1, "Select a group type.")
    .max(50),
  description: optionalNotes,
  countryCode: z
    .string()
    .trim()
    .length(2, "Select a valid country.")
    .optional()
    .or(z.literal("")),
});

export const updatePartyGroupSchema = z.object({
  groupName: z
    .string()
    .trim()
    .min(1, "Enter a group name.")
    .max(200)
    .optional(),
  groupTypeCode: z
    .string()
    .trim()
    .min(1, "Select a group type.")
    .max(50)
    .optional(),
  description: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .nullable()
    .or(z.literal("")),
  countryCode: z
    .string()
    .trim()
    .length(2)
    .optional()
    .nullable()
    .or(z.literal("")),
});

export const addPartyGroupMemberSchema = z.object({
  partyId: z.string().trim().uuid("Select a party."),
  membershipRoleCode: z
    .string()
    .trim()
    .min(1, "Select a membership role.")
    .max(50),
  joinDate: isoDateSchema.optional(),
  isPrimaryContact: z.boolean().optional(),
  notes: optionalNotes,
});

export const addPartyToGroupSchema = z.object({
  partyGroupId: z.string().trim().uuid("Select a group."),
  membershipRoleCode: z
    .string()
    .trim()
    .min(1, "Select a membership role.")
    .max(50),
  joinDate: isoDateSchema.optional(),
  isPrimaryContact: z.boolean().optional(),
  notes: optionalNotes,
});

export const updatePartyGroupMemberSchema = z.object({
  membershipRoleCode: z
    .string()
    .trim()
    .min(1, "Select a membership role.")
    .max(50)
    .optional(),
  joinDate: isoDateSchema.optional(),
  exitDate: isoDateSchema.optional().nullable().or(z.literal("")),
  isPrimaryContact: z.boolean().optional(),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .nullable()
    .or(z.literal("")),
});

export const groupSearchQuerySchema = z.object({
  query: z.string().trim().min(2, "Enter at least 2 characters to search."),
  maxResults: z.number().int().min(1).max(50).optional(),
});
