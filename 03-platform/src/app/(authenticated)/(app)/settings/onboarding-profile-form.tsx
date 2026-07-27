/**
 * Purpose:
 * Let owners change Express / Standard / Enterprise without re-onboarding.
 */

"use client";

import { useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { setOnboardingProfileAction } from "@/modules/business/onboarding/actions/setup-actions";
import {
  ONBOARDING_PROFILE_LABELS,
  ONBOARDING_PROFILES,
  type OnboardingProfileCode,
} from "@/modules/business/onboarding/onboarding-profiles";

const selectClassName = cn(
  "flex h-9 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
);

const PROFILE_OPTIONS: OnboardingProfileCode[] = [
  ONBOARDING_PROFILES.EXPRESS,
  ONBOARDING_PROFILES.STANDARD,
  ONBOARDING_PROFILES.ENTERPRISE,
];

type OnboardingProfileFormProps = {
  currentProfile: OnboardingProfileCode;
};

export function OnboardingProfileForm({
  currentProfile,
}: OnboardingProfileFormProps) {
  const [profile, setProfile] = useState(currentProfile);
  const [savedProfile, setSavedProfile] = useState(currentProfile);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage(null);
        setError(null);
        startTransition(async () => {
          const result = await setOnboardingProfileAction(profile);
          if (!result.success) {
            setError(result.error.message);
            return;
          }
          setSavedProfile(profile);
          setMessage("Onboarding profile saved.");
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="onboardingProfile">Profile</Label>
        <select
          id="onboardingProfile"
          className={selectClassName}
          value={profile}
          onChange={(event) =>
            setProfile(event.target.value as OnboardingProfileCode)
          }
        >
          {PROFILE_OPTIONS.map((code) => (
            <option key={code} value={code}>
              {ONBOARDING_PROFILE_LABELS[code]}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {message ? (
        <p className="text-sm text-emerald-800">{message}</p>
      ) : null}

      <Button type="submit" disabled={pending || profile === savedProfile}>
        {pending ? "Saving..." : "Save profile"}
      </Button>
    </form>
  );
}
