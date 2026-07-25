/**
 * Purpose:
 * Manage Profile hub — Platform User information only.
 *
 * Design rationale:
 * Profile owns personal, security, preferences, platform account, and
 * membership list navigation. Business configuration belongs under the
 * active business (setup / dashboard), not here.
 *
 * Why this exists:
 * BP-001 UX correction — separate Platform User profile from business settings.
 */

import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { buttonVariants } from "@/components/ui/button";
import { createAuthService } from "@/core/auth/services/auth-service";
import { cn } from "@/lib/utils";

const PROFILE_SECTIONS = [
  {
    href: "/profile/personal",
    label: "Personal Information",
    description: "Name, email, and mobile number",
  },
  {
    href: "/security",
    label: "Security",
    description: "Password recovery and security question status",
  },
  {
    href: "/profile/preferences",
    label: "Preferences",
    description: "Platform display and notification preferences",
  },
  {
    href: "/account",
    label: "Platform Account",
    description: "Account status and platform identity",
  },
  {
    href: "/profile/businesses",
    label: "My Businesses",
    description: "Businesses you own or belong to",
  },
] as const;

export default async function ProfilePage() {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AuthPageShell
      title="Manage Profile"
      description="Platform User settings only. Business configuration is managed inside each business."
      className="max-w-lg"
    >
      <div className="space-y-3">
        {PROFILE_SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-auto w-full flex-col items-start gap-0.5 px-4 py-3 whitespace-normal"
            )}
          >
            <span className="font-medium">{section.label}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {section.description}
            </span>
          </Link>
        ))}

        <Link
          href="/home"
          className={cn(buttonVariants({ variant: "ghost" }), "w-full")}
        >
          Back to Platform Home
        </Link>
      </div>
    </AuthPageShell>
  );
}
