/**
 * Purpose:
 * Render the forgot-password page and load country reference data for recovery.
 *
 * Business Context:
 * Phase 1 password recovery uses mobile number and configured security Q&A only,
 * without email, SMS, or OTP channels per ADR-013.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding (§3.7)
 *
 * Implementation Package:
 * IP-005 – Authentication UI
 *
 * Responsibilities:
 * - Fetch active countries for the recovery form
 * - Render two-step recovery form within the shared auth shell
 *
 * Non-Responsibilities:
 * - Recovery orchestration (PasswordRecoveryService)
 * - Password policy enforcement beyond server action validation
 *
 * Dependencies:
 * - getCountriesAction, ForgotPasswordForm
 *
 * Business Rules Implemented:
 * - AD-009 §3.7 — mobile + security Q&A recovery
 *
 * Extension Points:
 * - Additional recovery channels deferred to progressive authentication phases
 */

import Link from "next/link";

import { ForgotPasswordForm } from "@/app/(public)/forgot-password/forgot-password-form";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { getCountriesAction } from "@/core/auth/actions/catalog-actions";

export default async function ForgotPasswordPage() {
  const countriesResult = await getCountriesAction();
  const countries = countriesResult.success ? countriesResult.data : [];

  return (
    <AuthPageShell
      title="Reset your password"
      description="Verify your identity with your mobile number and security answer."
      footer={
        <p>
          Remember your password?{" "}
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </p>
      }
    >
      <ForgotPasswordForm countries={countries} />
    </AuthPageShell>
  );
}
