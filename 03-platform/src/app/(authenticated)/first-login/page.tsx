import { redirect } from "next/navigation";

import { FirstLoginForm } from "@/app/(authenticated)/first-login/first-login-form";
import { getSecurityQuestionsAction } from "@/core/auth/actions/onboarding-actions";
import { getFirstLoginContextAction } from "@/core/auth/actions/first-login-actions";

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
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Set your new password
          </h1>
          <p className="text-sm text-muted-foreground">
            Welcome, {user.firstName}. Change your temporary password to continue
            using InverBrass.
          </p>
        </div>

        <FirstLoginForm
          requiresSecurityQuestion={requiresSecurityQuestion}
          securityQuestions={securityQuestions}
        />
      </div>
    </main>
  );
}
