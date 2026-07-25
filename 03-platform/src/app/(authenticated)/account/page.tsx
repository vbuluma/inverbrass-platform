/**
 * Purpose:
 * Account Settings entry point from Platform Home (users with businesses).
 *
 * Why this exists:
 * BP-001 Platform Home requires Account Settings when businesses exist.
 */

import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { buttonVariants } from "@/components/ui/button";
import { createAuthService } from "@/core/auth/services/auth-service";
import { cn } from "@/lib/utils";

export default async function AccountSettingsPage() {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AuthPageShell
      title="Account Settings"
      description="Manage your Platform User account and related security options."
      className="max-w-lg"
    >
      <div className="space-y-3">
        <Link href="/profile" className={cn(buttonVariants(), "w-full")}>
          Manage Profile
        </Link>
        <Link
          href="/security"
          className={cn(buttonVariants({ variant: "outline" }), "w-full")}
        >
          Security Settings
        </Link>
        <Link
          href="/home"
          className={cn(buttonVariants({ variant: "outline" }), "w-full")}
        >
          Back to Platform Home
        </Link>
      </div>
    </AuthPageShell>
  );
}
