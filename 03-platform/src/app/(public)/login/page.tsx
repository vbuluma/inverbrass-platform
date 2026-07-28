/**
 * Purpose:
 * Render the platform login page and load country reference data for the form.
 *
 * Design rationale:
 * Catalogue reads use ReferenceDataService directly. Server Actions are reserved
 * for mutations (login) so cookie writes never run during page render.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding (§3.2)
 */

import Link from "next/link";

import { LoginForm } from "@/app/(public)/login/login-form";
import { LoginRecoveryAlert } from "@/app/(public)/login/login-recovery-alert";
import { AuthPageLinks } from "@/components/auth/auth-page-links";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { createReferenceDataService } from "@/core/auth/services/reference-data-service";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ recovered?: string }>;
}) {
  const params = await searchParams;
  const referenceDataService = createReferenceDataService();
  const countries = await referenceDataService.getActiveCountries();

  return (
    <AuthPageShell
      title="Sign in"
      description="Enter your mobile number and password to access InverBrass."
      footer={<AuthPageLinks />}
      className="max-w-md"
    >
      {params.recovered === "1" ? <LoginRecoveryAlert /> : null}
      <LoginForm countries={countries} />
      <p className="pt-2 text-center text-sm text-muted-foreground">
        New business owner?{" "}
        <Link
          href="/register"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </AuthPageShell>
  );
}
