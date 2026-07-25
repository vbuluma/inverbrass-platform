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
 * BP-001 / IP-006 – Business Setup Wizard, Configuration & Activation
 */

import { z } from "zod";

import { EMPLOYEE_SETUP_ROLE_CODES } from "@/modules/business/onboarding/constants";
import { BRANCH_TYPES } from "@/modules/business/onboarding/constants/branch-types";

export const businessDetailsSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(2, "Business name is required.")
    .max(200),
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

export const businessClassificationSchema = z.object({
  industryId: z.string().uuid("Select an industry."),
  businessTypeId: z.string().uuid("Select a business type."),
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

export const businessOperationsSchema = z.object({
  paymentMethods: paymentMethodsSchema,
  receipt: receiptConfigurationSchema,
  aiAssistantEnabled: z.boolean(),
  loyaltyProgrammeEnabled: z.boolean(),
});

const branchItemSchema = z.object({
  name: z.string().trim().min(2, "Branch name is required.").max(200),
  code: z.string().trim().min(2, "Branch code is required.").max(30),
  branchType: z.enum([
    BRANCH_TYPES.HEAD_OFFICE,
    BRANCH_TYPES.OUTLET,
    BRANCH_TYPES.WAREHOUSE,
    BRANCH_TYPES.OTHER,
  ]),
  physicalAddress: z
    .string()
    .trim()
    .min(3, "Enter the branch physical address.")
    .max(500),
  county: z.string().trim().min(2, "Enter the county.").max(150),
  city: z.string().trim().min(2, "Enter the city.").max(150),
  contactPhone: z.string().trim().min(5, "Enter a contact phone.").max(30),
  email: z
    .string()
    .trim()
    .email("Enter a valid branch email.")
    .max(255)
    .optional()
    .or(z.literal("")),
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
  openingDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid opening date.")
    .optional()
    .or(z.literal("")),
  isHeadOffice: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

export const branchSetupSchema = z
  .object({
    hasMultipleBranches: z.boolean(),
    branches: z.array(branchItemSchema),
  })
  .superRefine((value, ctx) => {
    if (value.hasMultipleBranches && value.branches.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Add at least one branch.",
        path: ["branches"],
      });
    }
  });

export const employeeSetupItemSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(100),
  lastName: z.string().trim().min(1, "Last name is required.").max(100),
  mobileNumber: z.string().trim().min(5, "Mobile number is required.").max(30),
  email: z
    .string()
    .trim()
    .email("Enter a valid email.")
    .max(255)
    .optional()
    .or(z.literal("")),
  branchId: z.string().uuid("Select a branch."),
  jobTitle: z.string().trim().min(2, "Job title is required.").max(150),
  platformRoleCode: z.enum(EMPLOYEE_SETUP_ROLE_CODES),
});

export const employeeSetupSchema = z
  .object({
    skip: z.boolean(),
    employees: z.array(employeeSetupItemSchema),
  })
  .superRefine((value, ctx) => {
    if (!value.skip && value.employees.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Add at least one employee or choose Skip.",
        path: ["employees"],
      });
    }
  });
