/**
 * Purpose:
 * Business Settings — permanent home for onboarding configuration.
 *
 * Design rationale:
 * Every setup step remains editable after activation via manage mode.
 * Forms are not duplicated — sections deep-link into `/setup/[step]?manage=1`.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRightIcon,
  Settings2Icon,
} from "lucide-react";

import { PageBackLink } from "@/components/platform/page-back-link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getSetupProgressAction,
  getSetupReviewAction,
} from "@/modules/business/onboarding/actions/setup-actions";
import { BUSINESS_SETTINGS_SECTIONS } from "@/modules/business/onboarding/configuration-catalog";
import { ONBOARDING_PROFILE_LABELS } from "@/modules/business/onboarding/onboarding-profiles";
import { OnboardingProfileForm } from "./onboarding-profile-form";

const SECTION_DESCRIPTIONS: Record<string, string> = {
  profile: "Legal name, trading name, contact, and address.",
  classification: "Industry Type and Business Type.",
  "country-currency": "Operating country and base currency.",
  operations: "Payments and related operating preferences.",
  branches: "Head office and additional locations.",
  employees: "Team members and roles.",
  tax: "Enable tax, default tax name, and rate.",
  receipts: "Receipt prefix, footer, and logo display.",
  ai: "AI Assistant preference for this business.",
  loyalty: "Loyalty programme preference.",
  integrations: "External integrations arrive in later Build Packs.",
  security: "Security controls arrive in later Build Packs.",
  "onboarding-profile": "Express, Standard, or Enterprise setup path.",
};

export default async function BusinessSettingsPage() {
  const [review, progress] = await Promise.all([
    getSetupReviewAction(),
    getSetupProgressAction(),
  ]);

  if (!review.success || !progress.success) {
    redirect("/dashboard");
  }

  const data = review.data;
  const onboardingProfile = progress.data.onboardingProfile ?? "enterprise";

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <PageBackLink href="/dashboard" label="Back to dashboard" />
        <div className="flex items-start gap-3">
          <span className="flex size-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200">
            <Settings2Icon className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Business Settings
            </h1>
            <p className="text-sm text-muted-foreground">
              Permanent configuration for {data.businessName}. Edits reuse the
              same forms as Business Setup.
            </p>
          </div>
        </div>
      </div>

      <Card id="onboarding-profile">
        <CardHeader>
          <CardTitle className="text-base">Onboarding Profile</CardTitle>
          <CardDescription>
            Current profile: {ONBOARDING_PROFILE_LABELS[onboardingProfile]}.
            Changing the profile updates mandatory vs optional configuration
            guidance — it does not restart onboarding.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingProfileForm currentProfile={onboardingProfile} />
        </CardContent>
      </Card>

      <section aria-labelledby="settings-governance-heading" className="space-y-3">
        <h2 id="settings-governance-heading" className="text-lg font-semibold">
          Rules and governance
        </h2>
        <div className="grid gap-3">
          {[
            {
              href: "/commercial/governance",
              title: "Commercial rules",
              description: "Approve and activate pricing, tax, and commercial policies.",
            },
            {
              href: "/commercial/tax-compliance",
              title: "Tax obligations",
              description: "Tax configuration, remittance, and evidence.",
            },
            {
              href: "/crm/governance",
              title: "CRM Governance",
              description: "Ownership, duplicates, and relationship administration.",
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="transition-colors hover:bg-muted/30">
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                  <div>
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </div>
                  <ArrowRightIcon
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="settings-sections-heading" className="space-y-3">
        <h2 id="settings-sections-heading" className="text-lg font-semibold">
          Configuration
        </h2>
        <div className="grid gap-3">
          {BUSINESS_SETTINGS_SECTIONS.filter(
            (section) => section.id !== "onboarding-profile"
          ).map((section) => {
            const isPlaceholder =
              section.id === "integrations" || section.id === "security";

            if (isPlaceholder) {
              return (
                <Card
                  key={section.id}
                  id={section.id}
                  className="opacity-90"
                >
                  <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                    <div>
                      <CardTitle className="text-base">{section.label}</CardTitle>
                      <CardDescription>
                        {SECTION_DESCRIPTIONS[section.id]}
                      </CardDescription>
                    </div>
                    <span className="text-xs text-muted-foreground">Soon</span>
                  </CardHeader>
                </Card>
              );
            }

            return (
              <Link
                key={section.id}
                href={section.href}
                prefetch={false}
                className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="transition-colors hover:bg-muted/30">
                  <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                    <div>
                      <CardTitle className="text-base">{section.label}</CardTitle>
                      <CardDescription>
                        {SECTION_DESCRIPTIONS[section.id]}
                      </CardDescription>
                    </div>
                    <ArrowRightIcon
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
