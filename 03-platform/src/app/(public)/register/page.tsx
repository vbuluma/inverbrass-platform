/**
 * Purpose:
 * Render Platform Registration and load country / security-question catalogues.
 *
 * Design rationale:
 * Catalogue reads use services directly during render. Cookie-setting session
 * creation runs only inside registerOwnerUiAction after submit.
 *
 * Why this exists:
 * BP-001 foundation correction — signup must not ask for industry or template.
 */

import Link from "next/link";

import { RegisterForm } from "@/app/(public)/register/register-form";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { createReferenceDataService } from "@/core/auth/services/reference-data-service";
import { createSecurityQuestionService } from "@/core/auth/services/security-question-service";

export default async function RegisterPage() {
  const referenceDataService = createReferenceDataService();
  const securityQuestionService = createSecurityQuestionService();

  // Sequential reads — session pooler max:1 must not fan out concurrent queries.
  const countries = await referenceDataService.getActiveCountries();
  const securityQuestions = await securityQuestionService.getActiveCatalog();

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
