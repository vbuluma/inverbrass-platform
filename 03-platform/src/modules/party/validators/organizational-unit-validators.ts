/**
 * Purpose:
 * Zod structural validators for Organizational Unit payloads.
 *
 * Engine:
 * ENG-003c – Organization Structure Engine
 */

import { z } from "zod";

import { validateGpsCoordinates } from "@/modules/party/validators/party-address-validators";

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

const optionalEmail = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .max(255)
  .optional()
  .or(z.literal(""));

const optionalShort = z
  .string()
  .trim()
  .max(200)
  .optional()
  .or(z.literal(""));

const optionalPostal = z
  .string()
  .trim()
  .max(20)
  .optional()
  .or(z.literal(""));

const optionalTrimmed = z
  .string()
  .trim()
  .max(500)
  .optional()
  .or(z.literal(""));

const gpsCoordinateSchema = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((value) => {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    const parsed = typeof value === "number" ? value : Number(String(value).trim());
    return Number.isFinite(parsed) ? parsed : NaN;
  });

export const inlinePhysicalAddressSchema = z.object({
  countryCode: z
    .string()
    .trim()
    .length(2, "Select a country.")
    .transform((value) => value.toUpperCase()),
  addressLine1: z.string().trim().min(1, "Enter address line 1.").max(500),
  cityTown: optionalShort,
  countyDistrict: optionalShort,
  stateProvince: optionalShort,
  wardLocality: optionalShort,
  postalCode: optionalPostal,
  landmark: optionalTrimmed,
  gpsLatitude: gpsCoordinateSchema,
  gpsLongitude: gpsCoordinateSchema,
});

const unitCodeSchema = z
  .string()
  .trim()
  .min(1, "Enter a unit code.")
  .max(30)
  .regex(
    /^[A-Za-z0-9_-]+$/,
    "Unit code may only contain letters, numbers, hyphens, and underscores."
  );

export const addOrganizationalUnitSchema = z.object({
  unitCode: unitCodeSchema,
  unitName: z.string().trim().min(1, "Enter a unit name.").max(200),
  organizationalUnitTypeCode: z
    .string()
    .trim()
    .min(1, "Select an organizational unit type.")
    .max(50),
  parentOrganizationalUnitId: z
    .string()
    .trim()
    .uuid()
    .optional()
    .nullable()
    .or(z.literal("")),
  isHeadOffice: z.boolean().optional(),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: optionalEmail,
  partyAddressId: z.string().trim().uuid().optional().nullable().or(z.literal("")),
  newPhysicalAddress: inlinePhysicalAddressSchema.optional().nullable(),
  latitude: z.union([z.string(), z.number()]).optional().nullable(),
  longitude: z.union([z.string(), z.number()]).optional().nullable(),
  openingDate: isoDateSchema.optional(),
  closingDate: isoDateSchema.optional().nullable().or(z.literal("")),
  notes: optionalNotes,
});

export const updateOrganizationalUnitSchema = z.object({
  unitName: z.string().trim().min(1).max(200).optional(),
  organizationalUnitTypeCode: z.string().trim().min(1).max(50).optional(),
  parentOrganizationalUnitId: z
    .string()
    .trim()
    .uuid()
    .optional()
    .nullable()
    .or(z.literal("")),
  phone: z.string().trim().max(30).optional().nullable().or(z.literal("")),
  email: optionalEmail,
  partyAddressId: z.string().trim().uuid().optional().nullable().or(z.literal("")),
  newPhysicalAddress: inlinePhysicalAddressSchema.optional().nullable(),
  latitude: z.union([z.string(), z.number()]).optional().nullable(),
  longitude: z.union([z.string(), z.number()]).optional().nullable(),
  openingDate: isoDateSchema.optional(),
  closingDate: isoDateSchema.optional().nullable().or(z.literal("")),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .nullable()
    .or(z.literal("")),
});

export const searchOrganizationalUnitsSchema = z.object({
  query: z.string().trim().optional(),
  organizationalUnitTypeCode: z.string().trim().optional(),
  statusCode: z.string().trim().optional(),
});

export function nullableTrimmed(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseOptionalGps(
  latitude: string | number | null | undefined,
  longitude: string | number | null | undefined
): { latitude: string | null; longitude: string | null } {
  const lat =
    latitude === null || latitude === undefined || latitude === ""
      ? null
      : String(latitude).trim();
  const lng =
    longitude === null || longitude === undefined || longitude === ""
      ? null
      : String(longitude).trim();

  if (!lat && !lng) {
    return { latitude: null, longitude: null };
  }

  const result = validateGpsCoordinates(
    lat ? Number(lat) : null,
    lng ? Number(lng) : null
  );
  if (!result.ok) {
    throw new Error(result.message);
  }

  return {
    latitude: lat,
    longitude: lng,
  };
}
