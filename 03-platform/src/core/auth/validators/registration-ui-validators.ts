/**
 * Purpose:
 * Validate Platform Registration UI payload before mapping to OnboardingService.
 *
 * Design rationale:
 * Required: mobile, password, confirm password, security Q&A, country (for E.164).
 * Optional: email, proposed business name.
 */

import { z } from "zod";

import { passwordPolicySchema } from "@/core/auth/utils/password-policy";

export const ownerRegistrationUiSchema = z
  .object({
    businessName: z
      .string()
      .trim()
      .max(200, "Business name is too long.")
      .optional()
      .or(z.literal("")),
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
