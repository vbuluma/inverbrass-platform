/**
 * Purpose:
 * Validate Platform Registration UI payload before mapping to OnboardingService.
 *
 * Design rationale:
 * Required (BP-001 journey): business name (proposed), country, mobile, password,
 * confirm password, security Q&A. Optional: email. No Business row is created here.
 */

import { z } from "zod";

import { passwordPolicySchema } from "@/core/auth/utils/password-policy";

export const ownerRegistrationUiSchema = z
  .object({
    businessName: z
      .string()
      .trim()
      .min(2, "Business name is required.")
      .max(200, "Business name is too long."),
    countryCode: z
      .string()
      .length(2, "Country code must be a 2-letter ISO code."),
    mobileNumber: z.string().min(1, "Mobile number is required."),
    email: z
      .string()
      .trim()
      .email("Enter a valid email address.")
      .max(255, "Email address is too long.")
      .optional()
      .or(z.literal("")),
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
