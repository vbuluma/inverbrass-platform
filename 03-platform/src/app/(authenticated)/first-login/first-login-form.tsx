/**
 * Purpose:
 * Collect first-login password change and optional security question inputs.
 *
 * Business Context:
 * Employees completing first login submit credentials here; validation and orchestration
 * remain in AuthService server actions to avoid duplicating business rules in the UI.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding (§3.4)
 *
 * Implementation Package:
 * IP-004 – First Login & Password Management
 *
 * Responsibilities:
 * - Render password and security question fields
 * - Submit payload to completeFirstLoginAction
 *
 * Non-Responsibilities:
 * - Password policy enforcement (first-login-validators / AuthService)
 * - Security answer hashing (SecurityQuestionService)
 *
 * Dependencies:
 * - completeFirstLoginAction, shadcn/ui form controls
 *
 * Business Rules Implemented:
 * - AD-009 §3.4 — security Q&A fields shown only when no stored answer exists
 *
 * Extension Points:
 * - React Hook Form integration deferred to future UI packages
 */

"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completeFirstLoginAction } from "@/core/auth/actions/first-login-actions";
import { cn } from "@/lib/utils";

type SecurityQuestionOption = {
  id: string;
  code: string;
  questionText: string;
};

type FirstLoginFormProps = {
  requiresSecurityQuestion: boolean;
  securityQuestions: SecurityQuestionOption[];
};

const selectClassName = cn(
  "flex h-9 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
);

export function FirstLoginForm({
  requiresSecurityQuestion,
  securityQuestions,
}: FirstLoginFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setErrorMessage(null);

    startTransition(async () => {
      const result = await completeFirstLoginAction({
        currentPassword: String(formData.get("currentPassword") ?? ""),
        newPassword: String(formData.get("newPassword") ?? ""),
        confirmPassword: String(formData.get("confirmPassword") ?? ""),
        securityQuestionId: requiresSecurityQuestion
          ? String(formData.get("securityQuestionId") ?? "") || undefined
          : undefined,
        securityAnswer: requiresSecurityQuestion
          ? String(formData.get("securityAnswer") ?? "") || undefined
          : undefined,
      });

      if (result && !result.success) {
        setErrorMessage(result.error.message);
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current password</Label>
        <div className="relative">
          <Input
            id="currentPassword"
            name="currentPassword"
            type={showCurrentPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-1/2 right-1 -translate-y-1/2"
            onClick={() => setShowCurrentPassword((current) => !current)}
            aria-label={
              showCurrentPassword ? "Hide current password" : "Show current password"
            }
          >
            {showCurrentPassword ? <EyeOffIcon /> : <EyeIcon />}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword">New password</Label>
        <div className="relative">
          <Input
            id="newPassword"
            name="newPassword"
            type={showNewPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-1/2 right-1 -translate-y-1/2"
            onClick={() => setShowNewPassword((current) => !current)}
            aria-label={showNewPassword ? "Hide new password" : "Show new password"}
          >
            {showNewPassword ? <EyeOffIcon /> : <EyeIcon />}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-1/2 right-1 -translate-y-1/2"
            onClick={() => setShowConfirmPassword((current) => !current)}
            aria-label={
              showConfirmPassword ? "Hide confirm password" : "Show confirm password"
            }
          >
            {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
          </Button>
        </div>
      </div>

      {requiresSecurityQuestion ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="securityQuestionId">Security question</Label>
            <select
              id="securityQuestionId"
              name="securityQuestionId"
              required
              defaultValue=""
              className={selectClassName}
            >
              <option value="" disabled>
                Select a question
              </option>
              {securityQuestions.map((question) => (
                <option key={question.id} value={question.id}>
                  {question.questionText}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="securityAnswer">Security answer</Label>
            <Input
              id="securityAnswer"
              name="securityAnswer"
              type="password"
              autoComplete="off"
              required
            />
          </div>
        </>
      ) : null}

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Saving..." : "Continue"}
      </Button>
    </form>
  );
}
