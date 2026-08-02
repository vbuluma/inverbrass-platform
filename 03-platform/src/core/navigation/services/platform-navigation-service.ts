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
import { resolveUserDisplayName } from "@/core/auth/utils/resolve-user-display-name";
import { createIndustryExperienceService } from "@/core/industry-experience";
import { resolveOfferingNavLabel } from "@/core/industry-experience/offering-terminology";
import type { PlatformChromeContext } from "@/lib/navigation/types";
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
  email: string | null,
  displayName: string | null,
  staffCode: string | null,
  phoneNumber: string | null
): string {
  return resolveUserDisplayName({
    firstName,
    lastName,
    displayName,
    username: staffCode,
    email,
    phoneNumber,
  });
}

export class PlatformNavigationService {
  async getChromeContext(): Promise<PlatformChromeContext | null> {
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

    let navLabelOverrides: PlatformChromeContext["navLabelOverrides"];
    let terminology: PlatformChromeContext["terminology"];
    if (currentContext) {
      const industryExperience = createIndustryExperienceService();
      const industryContext =
        await industryExperience.getBusinessIndustryContext(
          currentContext.businessId
        );
      navLabelOverrides = {
        products: resolveOfferingNavLabel(),
      };
      terminology = industryContext.terminology;
    }

    return {
      mode: "platform",
      userDisplayName: buildDisplayName(
        user.firstName,
        user.lastName,
        user.email,
        user.displayName,
        user.staffCode,
        user.phoneNumber
      ),
      userInitials: buildInitials(user.firstName, user.lastName, user.email),
      businessName,
      businessStatusCode,
      canSwitchBusiness,
      businessCount,
      showSidebar: false,
      navLabelOverrides,
      terminology,
    };
  }
}

export function createPlatformNavigationService(): PlatformNavigationService {
  return new PlatformNavigationService();
}
