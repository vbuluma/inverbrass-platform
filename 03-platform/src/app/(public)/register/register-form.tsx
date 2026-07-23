/**
 * Purpose:
 * Collect owner registration inputs and submit them through the onboarding UI action.
 *
 * Business Context:
 * Phase 1 registration captures a reduced field set mapped to the IP-002
 * OwnerRegistrationPayload before atomic business provisioning.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding (§3.1)
 *
 * Implementation Package:
 * IP-005 – Authentication UI
 *
 * Responsibilities:
 * - Render business, mobile, password, and security question fields
 * - Invoke registerOwnerUiAction and surface validation errors
 *
 * Non-Responsibilities:
 * - Payload mapping and validation rules (registration-ui-validators)
 * - Business provisioning (OnboardingService)
 *
 * Dependencies:
 * - registerOwnerUiAction, shadcn/ui form controls
 *
 * Business Rules Implemented:
 * - AD-009 §3.1 — owner mobile doubles as initial business contact
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
import { registerOwnerUiAction } from "@/core/auth/actions/onboarding-actions";
import type {
  BusinessTypeOption,
  CountryOption,
} from "@/core/auth/types";
import { cn } from "@/lib/utils";

type SecurityQuestionOption = {
  id: string;
  code: string;
  questionText: string;
};

type RegisterFormProps = {
  countries: CountryOption[];
  businessTypes: BusinessTypeOption[];
  securityQuestions: SecurityQuestionOption[];
};

const selectClassName = cn(
  "flex h-9 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
);

export function RegisterForm({
  countries,
  businessTypes,
  securityQuestions,
}: RegisterFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  const defaultCountryCode = countries[0]?.code ?? "KE";

  function handleSubmit(formData: FormData) {
    setErrorMessage(null);

    startTransition(async () => {
      const result = await registerOwnerUiAction({
        businessName: String(formData.get("businessName") ?? ""),
        businessTypeId: String(formData.get("businessTypeId") ?? ""),
        countryCode: String(formData.get("countryCode") ?? defaultCountryCode),
        mobileNumber: String(formData.get("mobileNumber") ?? ""),
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
      <div className="space-y-2">
        <Label htmlFor="businessName">Business name</Label>
        <Input id="businessName" name="businessName" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="businessTypeId">Business type</Label>
        <select
          id="businessTypeId"
          name="businessTypeId"
          required
          defaultValue=""
          className={selectClassName}
        >
          <option value="" disabled>
            Select a business type
          </option>
          {businessTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
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

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}
