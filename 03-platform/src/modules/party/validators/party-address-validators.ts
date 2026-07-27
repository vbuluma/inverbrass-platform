/**
 * Purpose:
 * Zod structural validators for Party Address payloads.
 *
 * Implementation Package:
 * BP-002 / IP-004 – Address Management
 */

import { z } from "zod";

const optionalTrimmed = z
  .string()
  .trim()
  .max(500)
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

const optionalNotes = z
  .string()
  .trim()
  .max(2000)
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

export const addPartyAddressSchema = z.object({
  addressTypeCode: z
    .string()
    .trim()
    .min(1, "Select an address type.")
    .max(50),
  countryCode: z
    .string()
    .trim()
    .length(2, "Select a country.")
    .transform((value) => value.toUpperCase()),
  stateProvince: optionalShort,
  countyDistrict: optionalShort,
  cityTown: optionalShort,
  wardLocality: optionalShort,
  postalCode: optionalPostal,
  addressLine1: optionalTrimmed,
  addressLine2: optionalTrimmed,
  landmark: optionalTrimmed,
  gpsLatitude: gpsCoordinateSchema,
  gpsLongitude: gpsCoordinateSchema,
  isDefault: z.boolean().optional(),
  notes: optionalNotes,
});

export const updatePartyAddressSchema = z.object({
  countryCode: z
    .string()
    .trim()
    .length(2, "Select a country.")
    .transform((value) => value.toUpperCase())
    .optional(),
  stateProvince: z.string().trim().max(200).optional().nullable().or(z.literal("")),
  countyDistrict: z.string().trim().max(200).optional().nullable().or(z.literal("")),
  cityTown: z.string().trim().max(200).optional().nullable().or(z.literal("")),
  wardLocality: z.string().trim().max(200).optional().nullable().or(z.literal("")),
  postalCode: z.string().trim().max(20).optional().nullable().or(z.literal("")),
  addressLine1: z.string().trim().max(500).optional().nullable().or(z.literal("")),
  addressLine2: z.string().trim().max(500).optional().nullable().or(z.literal("")),
  landmark: z.string().trim().max(500).optional().nullable().or(z.literal("")),
  gpsLatitude: gpsCoordinateSchema,
  gpsLongitude: gpsCoordinateSchema,
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .nullable()
    .or(z.literal("")),
});

/**
 * WHAT: Validate optional GPS pair after structural parse.
 */
export function validateGpsCoordinates(
  latitude: number | null | undefined,
  longitude: number | null | undefined
): { ok: true } | { ok: false; message: string; field?: string } {
  const hasLat = latitude !== null && latitude !== undefined && !Number.isNaN(latitude);
  const hasLng =
    longitude !== null && longitude !== undefined && !Number.isNaN(longitude);

  if (!hasLat && !hasLng) {
    return { ok: true };
  }

  if (hasLat !== hasLng) {
    return {
      ok: false,
      message: "Enter both GPS latitude and longitude, or leave both empty.",
      field: hasLat ? "gpsLongitude" : "gpsLatitude",
    };
  }

  if (latitude! < -90 || latitude! > 90) {
    return {
      ok: false,
      message: "GPS latitude must be between -90 and 90.",
      field: "gpsLatitude",
    };
  }

  if (longitude! < -180 || longitude! > 180) {
    return {
      ok: false,
      message: "GPS longitude must be between -180 and 180.",
      field: "gpsLongitude",
    };
  }

  return { ok: true };
}

export function nullableTrimmed(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
