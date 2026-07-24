/**
 * Purpose:
 * Display the named welcome screen after successful business activation.
 *
 * Business Context:
 * FR-010 — activated businesses see "Welcome to {Business Name}".
 *
 * Implementation Package:
 * IP-006 – Business Setup Wizard, Configuration & Activation
 */

import Link from "next/link";

import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ActivatedPageProps = {
  searchParams: Promise<{ businessName?: string }>;
};

export default async function SetupActivatedPage({
  searchParams,
}: ActivatedPageProps) {
  const params = await searchParams;
  const businessName = params.businessName?.trim() || "your business";

  return (
    <AuthPageShell
      title={`Welcome to ${businessName}`}
      description="Your business is active. You can start using the platform."
      className="max-w-lg"
    >
      <Link
        href="/dashboard"
        className={cn(buttonVariants({ size: "lg" }), "w-full")}
      >
        Go to dashboard
      </Link>
    </AuthPageShell>
  );
}
