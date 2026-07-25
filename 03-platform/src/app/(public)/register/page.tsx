/**
 * Purpose:
 * Render Platform Registration and load country / security-question catalogues.
 *
 * Design rationale:
 * Platform Registration creates a Platform User only. Industry Solutions and
 * Business Templates are collected later during Business Registration.
 *
 * Why this exists:
 * BP-001 foundation correction — signup must not ask for industry or template.
 */

import Link from "next/link";

import { RegisterForm } from "@/app/(public)/register/register-form";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { getCountriesAction } from "@/core/auth/actions/catalog-actions";
import { getSecurityQuestionsAction } from "@/core/auth/actions/onboarding-actions";

export default async function RegisterPage() {
  const [countriesResult, questionsResult] = await Promise.all([
    getCountriesAction(),
    getSecurityQuestionsAction(),
  ]);

  const countries = countriesResult.success ? countriesResult.data : [];
  const securityQuestions = questionsResult.success
    ? questionsResult.data
    : [];

  return (
    <AuthPageShell
      title="Create your account"
      description="Register with your mobile number and password. Create a business after you sign in."
      className="max-w-lg"
      footer={
        <p>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <RegisterForm
        countries={countries}
        securityQuestions={securityQuestions}
      />
    </AuthPageShell>
  );
}
