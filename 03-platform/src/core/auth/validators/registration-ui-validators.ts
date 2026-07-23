/**
 * Purpose:
 * Validate the IP-005 owner registration UI payload before mapping to OnboardingService.
 *
 * Business Context:
 * The registration screen captures business and credential fields required for BP-001
 * owner self-registration while keeping the existing OwnerRegistrationPayload contract.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding (§3.1)
 *
 * Implementation Package:
 * IP-005 – Authentication UI
 *
 * Responsibilities:
 * - Validate IP-005 registration form fields with Zod
 *
 * Non-Responsibilities:
 * - Owner registration orchestration (OnboardingService)
 * - Reference data loading
 *
 * Dependencies:
 * - Zod, passwordPolicySchema
 *
 * Business Rules Implemented:
 * - AD-009 §2.10 — BP-001 password policy
 *
 * Extension Points:
 * - Additional owner profile fields may be added when registration UI expands
 */

import { z } from "zod";

import { passwordPolicySchema } from "@/core/auth/utils/password-policy";

export const ownerRegistrationUiSchema = z
  .object({
    businessName: z
      .string()
      .trim()
      .min(1, "Business name is required.")
      .max(200, "Business name is too long."),
    businessTypeId: z.string().uuid("Select a business type."),
    countryCode: z
      .string()
      .length(2, "Country code must be a 2-letter ISO code."),
    mobileNumber: z.string().min(1, "Mobile number is required."),
    password: passwordPolicySchema,
    confirmPassword: z.string().min(1, "Confirm your password."),
    securityQuestionId: z.string().uuid("Select a security question."),
    securityAnswer: z
      .string()
      .trim()
      .min(2, "Security answer must be at least 2 characters.")
      .max(200, "Security answer is too long."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
