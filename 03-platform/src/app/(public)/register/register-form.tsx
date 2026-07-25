/**
 * Purpose:
 * Collect Platform Registration inputs and submit through registerOwnerUiAction.
 *
 * Design rationale:
 * Creates a Platform User only. Email and proposed business name are optional.
 * Live password validation disables Register until policy and match checks pass.
 * Country remains for E.164 mobile normalization (username = mobile number).
 *
 * Why this exists:
 * BP-001 Stage 1 platform-owned authentication registration UX.
 */

"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { CatalogEmptyNotice } from "@/components/auth/catalog-empty-notice";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
  // Show/Hide for answers is UI-only — persistence always stores bcrypt hashes.
  const [showSecurityAnswer, setShowSecurityAnswer] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  const defaultCountryCode = countries[0]?.code ?? "KE";
  const catalogsReady =
    countries.length > 0 && securityQuestions.length > 0;

  const passwordRules = useMemo(
    () => evaluatePasswordStrength(password),
    [password]
  );
  const passwordPolicyMet = useMemo(
    () => isPasswordPolicySatisfied(password),
    [password]
  );
  const matchState = useMemo(
    () => getPasswordMatchState(password, confirmPassword),
    [password, confirmPassword]
  );

  const canSubmit =
    catalogsReady &&
    passwordPolicyMet &&
    matchState === "match" &&
    !isPending;

  function handleSubmit(formData: FormData) {
    setErrorMessage(null);

    startTransition(async () => {
      const result = await registerOwnerUiAction({
        businessName: String(formData.get("businessName") ?? ""),
        countryCode: String(formData.get("countryCode") ?? defaultCountryCode),
        mobileNumber: String(formData.get("mobileNumber") ?? ""),
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        confirmPassword: String(formData.get("confirmPassword") ?? ""),
        securityQuestionId: String(formData.get("securityQuestionId") ?? ""),
        securityAnswer: String(formData.get("securityAnswer") ?? ""),
      });

      if (result && !result.success) {
        setErrorMessage(result.error.message);
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
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
        <Label htmlFor="mobileNumber">Mobile number</Label>
        <Input
          id="mobileNumber"
          name="mobileNumber"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          required
          placeholder="712345678"
        />
        <p className="text-xs text-muted-foreground">
          Your mobile number is your username.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="countryCode">Country</Label>
        <select
          id="countryCode"
          name="countryCode"
          required
          defaultValue={defaultCountryCode}
          className={selectClassName}
        >
          {countries.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name} ({country.phoneCode})
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Used to normalize your mobile number to international format.
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
            className="pr-10"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
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
            className="pr-10"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
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
        <div className="relative">
          <Input
            id="securityAnswer"
            name="securityAnswer"
            type={showSecurityAnswer ? "text" : "password"}
            autoComplete="off"
            required
            className="pr-10"
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
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="businessName">Proposed business name (optional)</Label>
        <Input id="businessName" name="businessName" />
        <p className="text-xs text-muted-foreground">
          Prefills Business Creation later. No business is created at registration.
        </p>
      </div>

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" disabled={!canSubmit} className="w-full">
        {isPending ? "Creating account..." : "Register"}
      </Button>
    </form>
  );
}
