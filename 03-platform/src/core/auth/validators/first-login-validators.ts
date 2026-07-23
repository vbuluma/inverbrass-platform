/**
 * Purpose:
 * Validate first-login password change payloads.
 *
 * Business Context:
 * Employees and invited users must set a new password that satisfies BP-001 policy
 * before accessing business modules.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding (§2.10, §3.4)
 *
 * Implementation Package:
 * IP-004 – First Login & Password Management
 *
 * Responsibilities:
 * - Structural validation for password change fields
 * - BP-001 password policy enforcement via shared schema
 *
 * Non-Responsibilities:
 * - Current password verification against Supabase Auth
 * - Conditional security question enforcement (AuthService)
 *
 * Dependencies:
 * - Zod
 * - passwordPolicySchema
 *
 * Business Rules Implemented:
 * - AD-009 §2.10 — BP-001 password policy
 * - AD-009 §3.4.2 — new password must differ from current password
 *
 * Extension Points:
 * - Additional first-login fields may be added when onboarding expands
 */

import { z } from "zod";

import { passwordPolicySchema } from "@/core/auth/utils/password-policy";

export const firstLoginSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: passwordPolicySchema,
    confirmPassword: z.string().min(1, "Confirm your new password."),
    securityQuestionId: z
      .string()
      .uuid("Select a security question.")
      .optional(),
    securityAnswer: z
      .string()
      .trim()
      .min(2, "Security answer must be at least 2 characters.")
      .max(200, "Security answer is too long.")
      .optional(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "Your new password must be different from your current password.",
    path: ["newPassword"],
  });

export type FirstLoginInput = z.infer<typeof firstLoginSchema>;
