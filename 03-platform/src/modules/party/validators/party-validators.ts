/**
 * Purpose:
 * Zod structural validators for Party Foundation payloads.
 *
 * Business rules belong in Party services — validators enforce shape only.
 *
 * Implementation Package:
 * BP-002 / IP-001 – Party Foundation
 */

import { z } from "zod";

import {
  GENDER_OPTIONS,
  PARTY_TYPE_CODES,
} from "@/modules/party/constants";

const optionalTrimmed = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .or(z.literal(""));

export const registerIndividualSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter the full name.")
    .max(300),
  dateOfBirth: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date of birth."),
  gender: z
    .string()
    .trim()
    .refine(
      (value) => GENDER_OPTIONS.some((option) => option.code === value),
      "Select a gender."
    ),
  preferredLanguageCode: z
    .string()
    .trim()
    .min(2, "Select a preferred language.")
    .max(10),
  mobile: z
    .string()
    .trim()
    .min(7, "Enter a mobile number.")
    .max(30)
    .regex(/^[+]?[\d\s()-]{7,30}$/, "Enter a valid mobile number."),
  notes: optionalTrimmed,
});

export const registerOrganizationSchema = z.object({
  organizationName: z
    .string()
    .trim()
    .min(2, "Enter the organization name.")
    .max(300),
  registrationNumber: z.string().trim().max(100).optional().or(z.literal("")),
  taxNumber: z.string().trim().max(100).optional().or(z.literal("")),
  industryCode: z.string().trim().min(1, "Select an industry.").max(50),
  organizationTypeCode: z
    .string()
    .trim()
    .min(1, "Select an organization type.")
    .max(50),
  website: z.string().trim().max(500).optional().or(z.literal("")),
  mobile: z
    .string()
    .trim()
    .max(30)
    .regex(/^[+]?[\d\s()-]{7,30}$/, "Enter a valid mobile number.")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .max(255)
    .optional()
    .or(z.literal("")),
  notes: optionalTrimmed,
});

export const updatePartyOverviewSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Enter a display name.")
    .max(300),
  notes: optionalTrimmed,
  dateOfBirth: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date of birth.")
    .optional()
    .or(z.literal("")),
  gender: z.string().trim().max(50).optional().or(z.literal("")),
  preferredLanguageCode: z
    .string()
    .trim()
    .max(10)
    .optional()
    .or(z.literal("")),
  registrationNumber: z.string().trim().max(100).optional().or(z.literal("")),
  taxNumber: z.string().trim().max(100).optional().or(z.literal("")),
  industryCode: z.string().trim().max(50).optional().or(z.literal("")),
  organizationTypeCode: z
    .string()
    .trim()
    .max(50)
    .optional()
    .or(z.literal("")),
  website: z.string().trim().max(500).optional().or(z.literal("")),
});

export const partyTypeQuerySchema = z.enum([
  PARTY_TYPE_CODES.INDIVIDUAL,
  PARTY_TYPE_CODES.ORGANIZATION,
]);
