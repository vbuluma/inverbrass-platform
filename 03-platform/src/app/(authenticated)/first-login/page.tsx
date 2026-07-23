/**
 * Purpose:
 * Render the first-login password change page for provisioned users.
 *
 * Business Context:
 * Employees and other provisioned users with mustChangePassword=true must update their
 * temporary password before accessing business modules.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding (§3.4)
 *
 * Implementation Package:
 * IP-004 – First Login & Password Management
 *
 * Responsibilities:
 * - Load first-login context and security question catalog when required
 * - Render first-login form within the shared auth shell
 *
 * Non-Responsibilities:
 * - Password change orchestration (AuthService.completeFirstLogin)
 * - Route guard enforcement (authenticated-route-guard)
 *
 * Dependencies:
 * - getFirstLoginContextAction, getSecurityQuestionsAction, FirstLoginForm
 *
 * Business Rules Implemented:
 * - AD-009 §3.4 — forced first-login password change
 *
 * Extension Points:
 * - Additional onboarding steps may be added in future packages
 */

import { redirect } from "next/navigation";

import { FirstLoginForm } from "@/app/(authenticated)/first-login/first-login-form";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { getFirstLoginContextAction } from "@/core/auth/actions/first-login-actions";
import { getSecurityQuestionsAction } from "@/core/auth/actions/onboarding-actions";

export default async function FirstLoginPage() {
  const contextResult = await getFirstLoginContextAction();

  if (!contextResult.success) {
    if (contextResult.error.code === "FIRST_LOGIN_NOT_REQUIRED") {
      redirect("/dashboard");
    }

    redirect("/login");
  }

  const { user, requiresSecurityQuestion } = contextResult.data;
  const questionsResult = requiresSecurityQuestion
    ? await getSecurityQuestionsAction()
    : null;

  const securityQuestions =
    questionsResult?.success === true ? questionsResult.data : [];

  return (
    <AuthPageShell
      title="Set your new password"
      description={`Welcome, ${user.firstName}. Change your temporary password to continue using InverBrass.`}
    >
      <FirstLoginForm
        requiresSecurityQuestion={requiresSecurityQuestion}
        securityQuestions={securityQuestions}
      />
    </AuthPageShell>
  );
}
