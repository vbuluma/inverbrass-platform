/**
 * Purpose:
 * Collect Platform Registration inputs and submit through registerOwnerUiAction.
 *
 * Design rationale:
 * Creates a Platform User only. Business name (proposed) is required per BP-001
 * journey; email is optional. Live password validation enables Register when
 * policy and confirm-password checks pass.
 * Failed validation preserves all entered values (platform UX standard).
 *
 * Why this exists:
 * BP-001 Stage 1 platform-owned authentication registration UX.
 */

"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { CatalogEmptyNotice } from "@/components/auth/catalog-empty-notice";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CATALOG_EMPTY_MESSAGES } from "@/core/auth/catalog-messages";
import { registerOwnerUiAction } from "@/core/auth/actions/onboarding-actions";
import type { CountryOption } from "@/core/auth/types";
import {
  evaluatePasswordStrength,
  getPasswordMatchState,
  isPasswordPolicySatisfied,
} from "@/core/auth/utils/password-strength";
import { useControlledForm } from "@/lib/forms";
import { cn } from "@/lib/utils";

type SecurityQuestionOption = {
  id: string;
  code: string;
  questionText: string;
};

type RegisterFormProps = {
  countries: CountryOption[];
  securityQuestions: SecurityQuestionOption[];
};

const selectClassName = cn(
  "flex h-9 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
);

export function RegisterForm({
  countries,
  securityQuestions,
}: RegisterFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSecurityAnswer, setShowSecurityAnswer] = useState(false);
  const [isPending, startTransition] = useTransition();

  const defaultCountryCode = countries[0]?.code ?? "KE";
  const catalogsReady =
    countries.length > 0 && securityQuestions.length > 0;

  const form = useControlledForm({
    initial: {
      businessName: "",
      countryCode: defaultCountryCode,
      mobileNumber: "",
      email: "",
      password: "",
      confirmPassword: "",
      securityQuestionId: "",
      securityAnswer: "",
    },
  });

  const password = form.textValue("password");
  const confirmPassword = form.textValue("confirmPassword");

  const passwordRules = useMemo(
    () => evaluatePasswordStrength(password),
    [password]
  );
  const passwordPolicyMet = isPasswordPolicySatisfied(password);
  const matchState = getPasswordMatchState(password, confirmPassword);
  const passwordsReady = passwordPolicyMet && matchState === "match";

  const canSubmit = catalogsReady && passwordsReady && !isPending;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    form.setInvalidField(null);

    if (!catalogsReady) {
      setErrorMessage(
        countries.length === 0
          ? CATALOG_EMPTY_MESSAGES.countries
          : CATALOG_EMPTY_MESSAGES.securityQuestions
      );
      return;
    }

    if (!passwordsReady) {
      form.setInvalidField(
        matchState === "mismatch" ? "confirmPassword" : "password"
      );
      setErrorMessage(
        matchState === "mismatch"
          ? "Passwords do not match."
          : "Password does not meet the required strength rules."
      );
      return;
    }

    startTransition(async () => {
      const result = await registerOwnerUiAction({
        businessName: form.textValue("businessName"),
        countryCode: form.textValue("countryCode") || defaultCountryCode,
        mobileNumber: form.textValue("mobileNumber"),
        email: form.textValue("email"),
        password: form.textValue("password"),
        confirmPassword: form.textValue("confirmPassword"),
        securityQuestionId: form.textValue("securityQuestionId"),
        securityAnswer: form.textValue("securityAnswer"),
      });

      if (result && !result.success) {
        form.setInvalidField(result.error.field ?? null);
        setErrorMessage(result.error.message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!catalogsReady ? (
        <CatalogEmptyNotice
          message={
            countries.length === 0
              ? CATALOG_EMPTY_MESSAGES.countries
              : securityQuestions.length === 0
                ? CATALOG_EMPTY_MESSAGES.securityQuestions
                : CATALOG_EMPTY_MESSAGES.generic
          }
        />
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="businessName">Business name</Label>
        <Input
          id="businessName"
          name="businessName"
          required
          autoComplete="organization"
          placeholder="Proposed business name"
          value={form.textValue("businessName")}
          onChange={(event) => form.setField("businessName", event.target.value)}
          className={form.fieldClassName("businessName")}
          aria-invalid={form.invalidField === "businessName"}
        />
        <p className="text-xs text-muted-foreground">
          Temporary / proposed name. No business is created at registration.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="countryCode">Country</Label>
        <select
          id="countryCode"
          name="countryCode"
          required
          value={form.textValue("countryCode")}
          onChange={(event) => form.setField("countryCode", event.target.value)}
          className={cn(
            selectClassName,
            form.invalidField === "countryCode" &&
              "border-destructive ring-2 ring-destructive/30"
          )}
          aria-invalid={form.invalidField === "countryCode"}
        >
          {countries.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name} ({country.phoneCode})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mobileNumber">Mobile number</Label>
        <Input
          id="mobileNumber"
          name="mobileNumber"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          required
          placeholder="712345678"
          value={form.textValue("mobileNumber")}
          onChange={(event) => form.setField("mobileNumber", event.target.value)}
          className={form.fieldClassName("mobileNumber")}
          aria-invalid={form.invalidField === "mobileNumber"}
        />
        <p className="text-xs text-muted-foreground">
          Your mobile number is your username.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            className={cn(
              "pr-10",
              form.invalidField === "password" &&
                "border-destructive ring-2 ring-destructive/30"
            )}
            value={password}
            onChange={(event) => form.setField("password", event.target.value)}
            aria-invalid={form.invalidField === "password"}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-1/2 right-1 -translate-y-1/2"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </Button>
        </div>
        <ul className="space-y-1 text-xs" aria-live="polite">
          {passwordRules.map((rule) => (
            <li
              key={rule.id}
              className={
                rule.met ? "text-emerald-700" : "text-muted-foreground"
              }
            >
              {rule.met ? "✓" : "○"} {rule.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            className={cn(
              "pr-10",
              form.invalidField === "confirmPassword" &&
                "border-destructive ring-2 ring-destructive/30"
            )}
            value={confirmPassword}
            onChange={(event) =>
              form.setField("confirmPassword", event.target.value)
            }
            aria-invalid={form.invalidField === "confirmPassword"}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-1/2 right-1 -translate-y-1/2"
            onClick={() => setShowConfirmPassword((current) => !current)}
            aria-label={
              showConfirmPassword
                ? "Hide confirm password"
                : "Show confirm password"
            }
          >
            {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
          </Button>
        </div>
        {matchState === "match" ? (
          <p className="text-xs text-emerald-700" aria-live="polite">
            ✓ Passwords Match
          </p>
        ) : null}
        {matchState === "mismatch" ? (
          <p className="text-xs text-destructive" aria-live="polite">
            Passwords do not match
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="securityQuestionId">Security question</Label>
        <select
          id="securityQuestionId"
          name="securityQuestionId"
          required
          value={form.textValue("securityQuestionId")}
          onChange={(event) =>
            form.setField("securityQuestionId", event.target.value)
          }
          className={cn(
            selectClassName,
            form.invalidField === "securityQuestionId" &&
              "border-destructive ring-2 ring-destructive/30"
          )}
          aria-invalid={form.invalidField === "securityQuestionId"}
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
        <div className="relative">
          <Input
            id="securityAnswer"
            name="securityAnswer"
            type={showSecurityAnswer ? "text" : "password"}
            autoComplete="off"
            required
            className={cn("pr-10", form.fieldClassName("securityAnswer"))}
            value={form.textValue("securityAnswer")}
            onChange={(event) =>
              form.setField("securityAnswer", event.target.value)
            }
            aria-invalid={form.invalidField === "securityAnswer"}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-1/2 right-1 -translate-y-1/2"
            onClick={() => setShowSecurityAnswer((current) => !current)}
            aria-label={
              showSecurityAnswer ? "Hide security answer" : "Show security answer"
            }
          >
            {showSecurityAnswer ? <EyeOffIcon /> : <EyeIcon />}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email address (optional)</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={form.textValue("email")}
          onChange={(event) => form.setField("email", event.target.value)}
          className={form.fieldClassName("email")}
          aria-invalid={form.invalidField === "email"}
        />
      </div>

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      {/* Native submit button — avoids Base UI disabled-state regressions. */}
      <button
        type="submit"
        disabled={!canSubmit}
        className={cn(buttonVariants(), "w-full")}
      >
        {isPending ? "Creating account..." : "Create Your Account"}
      </button>

      {!canSubmit && catalogsReady && !isPending ? (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {!passwordPolicyMet
            ? "Meet all password rules to enable Create Your Account."
            : matchState === "empty"
              ? "Confirm your password to enable Create Your Account."
              : matchState === "mismatch"
                ? "Passwords must match before you can continue."
                : null}
        </p>
      ) : null}
    </form>
  );
}
