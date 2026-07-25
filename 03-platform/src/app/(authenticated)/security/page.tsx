/**
 * Purpose:
 * Security Settings entry point from Platform Home (users without businesses).
 *
 * Why this exists:
 * BP-001 Platform Home requires Security Settings when no businesses exist.
 */

import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { buttonVariants } from "@/components/ui/button";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createSecurityQuestionService } from "@/core/auth/services/security-question-service";
import { cn } from "@/lib/utils";

export default async function SecuritySettingsPage() {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const securityQuestionService = createSecurityQuestionService();
  const hasSecurityAnswer = await securityQuestionService.hasStoredAnswer(
    user.platformUserId
  );

  return (
    <AuthPageShell
      title="Security Settings"
      description="Review authentication and recovery settings for your Platform User."
      className="max-w-lg"
    >
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Password change required</dt>
          <dd className="font-medium">
            {user.mustChangePassword ? "Yes" : "No"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Security question</dt>
          <dd className="font-medium">
            {hasSecurityAnswer
              ? "Configured (answer stored as bcrypt hash only)"
              : "Not configured"}
          </dd>
        </div>
      </dl>

      <div className="mt-6 space-y-3">
        <Link
          href="/forgot-password"
          className={cn(buttonVariants({ variant: "outline" }), "w-full")}
        >
          Password recovery
        </Link>
        <Link
          href="/home"
          className={cn(buttonVariants({ variant: "outline" }), "w-full")}
        >
          Back to Platform Home
        </Link>
      </div>
    </AuthPageShell>
  );
}
