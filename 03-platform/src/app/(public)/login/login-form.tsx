/**
 * Purpose:
 * Collect login credentials and submit them through the authentication server action.
 *
 * Business Context:
 * Primary sign-in entry point for BP-001 Phase 1 routes users to first-login,
 * business selection, or dashboard based on AuthService.login outcomes.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding (§3.2)
 *
 * Implementation Package:
 * IP-005 – Authentication UI
 *
 * Responsibilities:
 * - Render mobile, password, remember-me, and navigation fields
 * - Invoke loginUiAction and surface friendly validation errors
 *
 * Non-Responsibilities:
 * - Credential verification (AuthService)
 * - Post-login routing policy beyond action redirects
 *
 * Dependencies:
 * - loginUiAction, shadcn/ui form controls
 *
 * Business Rules Implemented:
 * - AD-009 §3.2 — mobile + password login
 *
 * Extension Points:
 * - Remember-me persistence deferred until session policy is approved
 */

"use client";

import Link from "next/link";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginUiAction } from "@/core/auth/actions/auth-actions";
import type { CountryOption } from "@/core/auth/types";
import { cn } from "@/lib/utils";

type LoginFormProps = {
  countries: CountryOption[];
};

const selectClassName = cn(
  "flex h-9 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
);

export function LoginForm({ countries }: LoginFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isPending, startTransition] = useTransition();

  const defaultCountryCode = countries[0]?.code ?? "KE";

  function handleSubmit(formData: FormData) {
    setErrorMessage(null);

    startTransition(async () => {
      const result = await loginUiAction({
        countryCode: String(formData.get("countryCode") ?? defaultCountryCode),
        mobileNumber: String(formData.get("mobileNumber") ?? ""),
        password: String(formData.get("password") ?? ""),
      });

      if (result && !result.success) {
        setErrorMessage(result.error.message);
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
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
            autoComplete="current-password"
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

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="rememberMe"
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(checked === true)}
          />
          <Label htmlFor="rememberMe" className="font-normal">
            Remember me
          </Label>
        </div>
        <Link
          href="/forgot-password"
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          Forgot password?
        </Link>
      </div>

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
