/**
 * Purpose:
 * Render the platform login page and load country reference data for the form.
 *
 * Business Context:
 * Primary sign-in entry point for BP-001 Phase 1 routes users to first-login,
 * business selection, or dashboard based on AuthService.login outcomes.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding (§3.2)
 *
 * Implementation Package:
 * IP-005 – Authentication UI
 *
 * Responsibilities:
 * - Fetch active countries for the login country selector
 * - Render login form and post-recovery success alert
 *
 * Non-Responsibilities:
 * - Credential verification (AuthService via loginUiAction)
 * - Post-login routing policy (loginUiAction redirects)
 *
 * Dependencies:
 * - getCountriesAction, LoginForm, LoginRecoveryAlert
 *
 * Business Rules Implemented:
 * - AD-009 §3.2 — mobile + password login
 *
 * Extension Points:
 * - Additional login factors deferred to progressive authentication phases
 */

import Link from "next/link";

import { LoginForm } from "@/app/(public)/login/login-form";
import { LoginRecoveryAlert } from "@/app/(public)/login/login-recovery-alert";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { getCountriesAction } from "@/core/auth/actions/catalog-actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ recovered?: string }>;
}) {
  const params = await searchParams;
  const countriesResult = await getCountriesAction();
  const countries = countriesResult.success ? countriesResult.data : [];

  return (
    <AuthPageShell
      title="Sign in"
      description="Enter your mobile number and password to access InverBrass."
      footer={
        <p>
          New business owner?{" "}
          <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
            Create an account
          </Link>
        </p>
      }
    >
      {params.recovered === "1" ? <LoginRecoveryAlert /> : null}
      <LoginForm countries={countries} />
    </AuthPageShell>
  );
}
