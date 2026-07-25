/**
 * Purpose:
 * Preferences section of Manage Profile (platform-level only).
 *
 * Why this exists:
 * BP-001 — preferences belong to the Platform User, not an active business.
 */

import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { buttonVariants } from "@/components/ui/button";
import { createAuthService } from "@/core/auth/services/auth-service";
import { cn } from "@/lib/utils";

export default async function PreferencesPage() {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AuthPageShell
      title="Preferences"
      description="Platform display and notification preferences for your account."
      className="max-w-lg"
    >
      <p className="text-sm text-muted-foreground">
        Preference controls will appear here as platform configuration options
        become available. Business-specific settings remain inside each business.
      </p>

      <Link
        href="/profile"
        className={cn(
          buttonVariants({ variant: "outline" }),
          "mt-6 w-full"
        )}
      >
        Back to Manage Profile
      </Link>
    </AuthPageShell>
  );
}
