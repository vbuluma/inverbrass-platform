/**
 * Purpose:
 * Notifications section of My Account (platform-level only).
 *
 * Why this exists:
 * BP-001 Final UX Alignment — My Account lists Notifications separately from
 * Preferences. Controls remain placeholders until notification options exist.
 */

import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { buttonVariants } from "@/components/ui/button";
import { createAuthService } from "@/core/auth/services/auth-service";
import { cn } from "@/lib/utils";

export default async function NotificationsPage() {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AuthPageShell
      title="Notifications"
      description="Platform notification preferences for your account."
      className="max-w-lg"
    >
      <p className="text-sm text-muted-foreground">
        Notification controls will appear here as platform options become
        available. Business-specific alerts remain inside each business.
      </p>

      <Link
        href="/profile"
        className={cn(
          buttonVariants({ variant: "outline" }),
          "mt-6 w-full"
        )}
      >
        Back to My Account
      </Link>
    </AuthPageShell>
  );
}
