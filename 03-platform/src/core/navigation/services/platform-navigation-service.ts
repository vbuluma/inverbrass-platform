/**
 * Purpose:
 * Load platform chrome context for global navigation (IP-007).
 *
 * Architecture:
 * UI → Server (layout) → PlatformNavigationService → AuthService / BusinessContextService → Drizzle
 */

import { eq } from "drizzle-orm";

import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import type { PlatformChromeContext, PlatformChromeMode } from "@/lib/navigation/types";
import { getDb } from "@/db/client";
import { business } from "@/db/schema/business";

function buildInitials(firstName: string, lastName: string, email: string | null): string {
  const first = firstName.trim().charAt(0);
  const last = lastName.trim().charAt(0);
  if (first && last) {
    return `${first}${last}`.toUpperCase();
  }
  if (first) {
    return first.toUpperCase();
  }
  if (email) {
    return email.charAt(0).toUpperCase();
  }
  return "U";
}

function buildDisplayName(
  firstName: string,
  lastName: string,
  email: string | null
): string {
  const full = `${firstName} ${lastName}`.trim();
  return full || email || "User";
}

export class PlatformNavigationService {
  async getChromeContext(mode: PlatformChromeMode): Promise<PlatformChromeContext | null> {
    const authService = createAuthService();
    const user = await authService.getAuthenticatedUser();

    if (!user) {
      return null;
    }

    const businessContextService = createBusinessContextService();
    const businesses = await businessContextService.getSelectableBusinesses(
      user.platformUserId
    );
    const businessCount = businesses.length;
    const canSwitchBusiness = businessCount >= 2;

    const currentContext = await businessContextService.getCurrentContext();
    let businessName: string | null = null;
    let businessStatusCode: string | null = null;

    if (currentContext) {
      const db = getDb();
      const [row] = await db
        .select({
          name: business.name,
          statusCode: business.statusCode,
        })
        .from(business)
        .where(eq(business.id, currentContext.businessId))
        .limit(1);

      businessName = row?.name ?? null;
      businessStatusCode = row?.statusCode ?? null;
    }

    return {
      mode,
      userDisplayName: buildDisplayName(user.firstName, user.lastName, user.email),
      userInitials: buildInitials(user.firstName, user.lastName, user.email),
      businessName,
      businessStatusCode,
      canSwitchBusiness,
      businessCount,
      showSidebar: mode === "business-app",
    };
  }
}

export function createPlatformNavigationService(): PlatformNavigationService {
  return new PlatformNavigationService();
}
