/**
 * Purpose:
 * Render the business owner self-registration page and load reference catalogs.
 *
 * Business Context:
 * BP-001 owner registration captures personal, business, and security question
 * details before provisioning the initial business through OnboardingService.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding (§3.1)
 *
 * Implementation Package:
 * IP-005 – Authentication UI
 *
 * Responsibilities:
 * - Fetch countries, business types, and security questions for the form
 * - Render owner registration form within the shared auth shell
 *
 * Non-Responsibilities:
 * - Registration orchestration (OnboardingService via registerOwnerUiAction)
 * - Role assignment or business context initialization
 *
 * Dependencies:
 * - catalog-actions, onboarding-actions, RegisterForm
 *
 * Business Rules Implemented:
 * - AD-009 §3.1 — owner self-registration entry point
 *
 * Extension Points:
 * - Additional owner profile fields may be added when IP-002 UI expands
 */

import Link from "next/link";

import { RegisterForm } from "@/app/(public)/register/register-form";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import {
  getBusinessTypesAction,
  getCountriesAction,
} from "@/core/auth/actions/catalog-actions";
import { getSecurityQuestionsAction } from "@/core/auth/actions/onboarding-actions";

export default async function RegisterPage() {
  const [countriesResult, businessTypesResult, questionsResult] =
    await Promise.all([
      getCountriesAction(),
      getBusinessTypesAction(),
      getSecurityQuestionsAction(),
    ]);

  const countries = countriesResult.success ? countriesResult.data : [];
  const businessTypes = businessTypesResult.success
    ? businessTypesResult.data
    : [];
  const securityQuestions = questionsResult.success
    ? questionsResult.data
    : [];

  return (
    <AuthPageShell
      title="Create your business"
      description="Register as a business owner to start using InverBrass."
      className="max-w-lg"
      footer={
        <p>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <RegisterForm
        countries={countries}
        businessTypes={businessTypes}
        securityQuestions={securityQuestions}
      />
    </AuthPageShell>
  );
}
