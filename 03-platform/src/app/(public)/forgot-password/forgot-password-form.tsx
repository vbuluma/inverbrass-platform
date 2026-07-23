/**
 * Purpose:
 * Collect forgot-password recovery inputs across initiation and completion steps.
 *
 * Business Context:
 * Phase 1 recovery uses mobile number and configured security Q&A only, without email,
 * SMS, or OTP channels per ADR-013.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding (§3.7)
 *
 * Implementation Package:
 * IP-005 – Authentication UI
 *
 * Responsibilities:
 * - Step through recovery initiation and completion server actions
 * - Surface friendly validation and recovery errors
 *
 * Non-Responsibilities:
 * - Security answer verification (PasswordRecoveryService)
 * - Password update orchestration (PasswordRecoveryService)
 *
 * Dependencies:
 * - recovery-actions, shadcn/ui form controls
 *
 * Business Rules Implemented:
 * - AD-009 §3.7 — mobile + security Q&A recovery
 *
 * Extension Points:
 * - React Hook Form integration deferred to future UI packages
 */

"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  completeRecoveryAction,
  initiateRecoveryAction,
} from "@/core/auth/actions/recovery-actions";
import type { CountryOption, RecoveryInitiationResult } from "@/core/auth/types";
import { cn } from "@/lib/utils";

type ForgotPasswordFormProps = {
  countries: CountryOption[];
};

const selectClassName = cn(
  "flex h-9 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
);

export function ForgotPasswordForm({ countries }: ForgotPasswordFormProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recoveryContext, setRecoveryContext] =
    useState<RecoveryInitiationResult | null>(null);
  const [countryCode, setCountryCode] = useState(countries[0]?.code ?? "KE");
  const [mobileNumber, setMobileNumber] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleInitiate(formData: FormData) {
    setErrorMessage(null);

    const nextCountryCode = String(formData.get("countryCode") ?? countryCode);
    const nextMobileNumber = String(formData.get("mobileNumber") ?? "");

    startTransition(async () => {
      const result = await initiateRecoveryAction({
        countryCode: nextCountryCode,
        mobileNumber: nextMobileNumber,
      });

      if (!result.success) {
        setErrorMessage(result.error.message);
        return;
      }

      setCountryCode(nextCountryCode);
      setMobileNumber(nextMobileNumber);
      setRecoveryContext(result.data);
    });
  }

  function handleComplete(formData: FormData) {
    setErrorMessage(null);

    startTransition(async () => {
      const result = await completeRecoveryAction({
        countryCode,
        mobileNumber,
        securityAnswer: String(formData.get("securityAnswer") ?? ""),
        newPassword: String(formData.get("newPassword") ?? ""),
        confirmPassword: String(formData.get("confirmPassword") ?? ""),
      });

      if (result && !result.success) {
        setErrorMessage(result.error.message);
        return;
      }

      router.push("/login?recovered=1");
    });
  }

  if (!recoveryContext) {
    return (
      <form action={handleInitiate} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="countryCode">Country</Label>
          <select
            id="countryCode"
            name="countryCode"
            required
            defaultValue={countryCode}
            className={selectClassName}
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
          />
        </div>

        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "Verifying..." : "Continue"}
        </Button>
      </form>
    );
  }

  return (
    <form action={handleComplete} className="space-y-4">
      <Alert>
        <AlertDescription>
          Answer your security question to set a new password for {mobileNumber}.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="securityQuestion">Security question</Label>
        <Input
          id="securityQuestion"
          value={recoveryContext.securityQuestionText}
          readOnly
          aria-readonly
        />
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
            aria-label={showNewPassword ? "Hide password" : "Show password"}
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

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => {
            setRecoveryContext(null);
            setErrorMessage(null);
          }}
        >
          Back
        </Button>
        <Button type="submit" disabled={isPending} className="flex-1">
          {isPending ? "Resetting..." : "Reset password"}
        </Button>
      </div>
    </form>
  );
}
