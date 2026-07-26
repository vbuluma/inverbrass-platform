/**
 * Purpose:
 * My Account hub — Platform User settings only.
 *
 * Design rationale:
 * Keeps platform account management (identity, security, preferences,
 * notifications, account information) completely separate from business
 * management on Platform Home.
 *
 * Why this exists:
 * BP-001 Final UX Alignment — rename Manage Profile → My Account.
 */

import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { buttonVariants } from "@/components/ui/button";
import { createAuthService } from "@/core/auth/services/auth-service";
import { cn } from "@/lib/utils";

const ACCOUNT_SECTIONS = [
  {
    href: "/profile/personal",
    label: "Personal Information",
    description: "Name, email, and mobile number",
  },
  {
    href: "/security",
    label: "Security",
    description: "Password and security question status",
  },
  {
    href: "/profile/preferences",
    label: "Preferences",
    description: "Language, theme, date format, and time zone",
  },
  {
    href: "/profile/notifications",
    label: "Notifications",
    description: "Platform notification preferences",
  },
  {
    href: "/account",
    label: "Account Information",
    description: "Member since, last login, and account status",
  },
] as const;

export default async function MyAccountPage() {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AuthPageShell
      title="My Account"
      description="Platform User settings only. Business configuration is managed inside each business."
      className="max-w-lg"
    >
      <div className="space-y-3">
        {ACCOUNT_SECTIONS.map((section) => (
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
