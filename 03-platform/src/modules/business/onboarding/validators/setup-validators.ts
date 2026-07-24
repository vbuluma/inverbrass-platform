/**
 * Purpose:
 * Zod structural validators for Business Setup Wizard step payloads.
 *
 * Business Context:
 * Structural validation belongs in Zod; business rules belong in the service.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding
 *
 * Implementation Package:
 * IP-006 – Business Setup Wizard, Configuration & Activation
 */

import { z } from "zod";

export const businessDetailsSchema = z.object({
  tradingName: z.string().trim().max(200).optional(),
  logoUrl: z
    .string()
    .trim()
    .min(1, "Business logo is required.")
    .max(500_000, "Logo data is too large."),
  email: z
    .string()
    .trim()
    .email("Enter a valid business email.")
    .max(255),
  physicalAddress: z
    .string()
    .trim()
    .min(3, "Enter the physical address.")
    .max(500),
  county: z
    .string()
    .trim()
    .min(2, "Enter the county, state, or province.")
    .max(150),
  city: z.string().trim().min(2, "Enter the city or town.").max(150),
  website: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  gpsLatitude: z
    .string()
    .trim()
    .regex(/^-?\d+(\.\d+)?$/, "Enter a valid latitude.")
    .optional()
    .or(z.literal("")),
  gpsLongitude: z
    .string()
    .trim()
    .regex(/^-?\d+(\.\d+)?$/, "Enter a valid longitude.")
    .optional()
    .or(z.literal("")),
});

export const countryStepSchema = z.object({
  countryCode: z
    .string()
    .trim()
    .length(2, "Select a valid country."),
});

export const baseCurrencySchema = z.object({
  currencyCode: z
    .string()
    .trim()
    .length(3, "Select a valid currency."),
});

export const additionalCurrenciesSchema = z.object({
  currencyCodes: z.array(z.string().trim().length(3)).default([]),
});

export const paymentMethodsSchema = z
  .object({
    cashEnabled: z.boolean(),
    mobileMoneyEnabled: z.boolean(),
    bankTransferEnabled: z.boolean(),
    cardEnabled: z.boolean(),
    creditSalesEnabled: z.boolean(),
  })
  .refine(
    (value) =>
      value.cashEnabled ||
      value.mobileMoneyEnabled ||
      value.bankTransferEnabled ||
      value.cardEnabled ||
      value.creditSalesEnabled,
    {
      message: "Enable at least one payment method.",
    }
  );

export const receiptConfigurationSchema = z.object({
  receiptPrefix: z
    .string()
    .trim()
    .min(1, "Receipt prefix is required.")
    .max(20),
  receiptFooter: z.string().trim().max(500),
  showLogoOnReceipt: z.boolean(),
  taxEnabled: z.boolean(),
  defaultTaxRate: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter a valid tax rate."),
});

export const featureToggleSchema = z.object({
  enabled: z.boolean(),
});
