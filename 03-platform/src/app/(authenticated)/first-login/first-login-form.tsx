"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { completeFirstLoginAction } from "@/core/auth/actions/first-login-actions";

type SecurityQuestionOption = {
  id: string;
  code: string;
  questionText: string;
};

type FirstLoginFormProps = {
  requiresSecurityQuestion: boolean;
  securityQuestions: SecurityQuestionOption[];
};

export function FirstLoginForm({
  requiresSecurityQuestion,
  securityQuestions,
}: FirstLoginFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
    <form action={handleSubmit} className="space-y-4 rounded-xl border p-6">
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="currentPassword">
          Current password
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="newPassword">
          New password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="confirmPassword">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />
      </div>

      {requiresSecurityQuestion ? (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="securityQuestionId">
              Security question
            </label>
            <select
              id="securityQuestionId"
              name="securityQuestionId"
              required
              defaultValue=""
              className="w-full rounded-lg border px-3 py-2 text-sm"
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
            <label className="text-sm font-medium" htmlFor="securityAnswer">
              Security answer
            </label>
            <input
              id="securityAnswer"
              name="securityAnswer"
              type="password"
              autoComplete="off"
              required
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
        </>
      ) : null}

      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Saving..." : "Continue"}
      </Button>
    </form>
  );
}
