/**
 * Purpose:
 * Validate password recovery payloads for the forgot-password UI flow.
 *
 * Business Context:
 * BP-001 Phase 1 recovery uses mobile number, security answer, and a new password only.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding (§3.7)
 *
 * Implementation Package:
 * IP-005 – Authentication UI
 *
 * Responsibilities:
 * - Structural validation for recovery initiation and completion payloads
 *
 * Non-Responsibilities:
 * - Security answer verification (PasswordRecoveryService)
 * - Password update orchestration (AuthService)
 *
 * Dependencies:
 * - Zod, passwordPolicySchema, login country/mobile patterns
 *
 * Business Rules Implemented:
 * - AD-009 §2.10 — BP-001 password policy on recovery
 * - ADR-013 — mobile-only recovery initiation
 *
 * Extension Points:
 * - Additional recovery steps may extend these schemas in future phases
 */

import { z } from "zod";

import { passwordPolicySchema } from "@/core/auth/utils/password-policy";

export const recoveryInitiationSchema = z.object({
  mobileNumber: z.string().min(1, "Mobile number is required."),
  countryCode: z
    .string()
    .length(2, "Country code must be a 2-letter ISO code."),
});

export const recoveryCompletionSchema = z
  .object({
    mobileNumber: z.string().min(1, "Mobile number is required."),
    countryCode: z
      .string()
      .length(2, "Country code must be a 2-letter ISO code."),
    securityAnswer: z
      .string()
      .trim()
      .min(2, "Security answer must be at least 2 characters.")
      .max(200, "Security answer is too long."),
    newPassword: passwordPolicySchema,
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
