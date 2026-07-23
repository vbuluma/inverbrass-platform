import { and, asc, eq, isNull } from "drizzle-orm";

import {
  AUTHENTICATION_AUDIT_EVENT_TYPES,
} from "@/core/audit/types";
import { getAuthenticationAuditEmitter } from "@/core/audit/authentication-audit-emitter";
import {
  BUSINESS_MEMBERSHIP_STATUS,
  BUSINESS_STATUS,
  PLATFORM_ROLE_CODES,
} from "@/core/auth/constants";
import {
  AUTH_ERROR_CODES,
  AUTH_USER_MESSAGES,
  AuthError,
} from "@/core/auth/errors";
import type {
  ClientContext,
  CurrentBusinessContext,
  SelectableBusiness,
} from "@/core/auth/types";
import {
  clearBusinessContextCookie,
  getBusinessContextFromCookie,
  setBusinessContextCookie,
} from "@/core/auth/session/business-context-cookie";
import { getDb } from "@/db/client";
import { business } from "@/db/schema/business";
import { businessMembership } from "@/db/schema/business-membership";
import { businessType } from "@/db/schema/business-type";
import { country } from "@/db/schema/country";
import { platformUser } from "@/db/schema/platform-user";
import { role } from "@/db/schema/role";
import { userRole } from "@/db/schema/user-role";

export type ActiveMembershipRecord = {
  membershipId: string;
  businessId: string;
  isPrimary: boolean;
  businessStatusCode: string;
};

export class BusinessContextService {
  async getCurrentContext(): Promise<CurrentBusinessContext | null> {
    return getBusinessContextFromCookie();
  }

  async setCurrentBusiness(
    membershipId: string,
    clientContext?: ClientContext
  ): Promise<CurrentBusinessContext> {
    const db = getDb();

    const [membership] = await db
      .select({
        membershipId: businessMembership.id,
        platformUserId: businessMembership.platformUserId,
        businessId: businessMembership.businessId,
        membershipStatus: businessMembership.status,
        businessStatusCode: business.statusCode,
        userIsActive: platformUser.isActive,
      })
      .from(businessMembership)
      .innerJoin(business, eq(businessMembership.businessId, business.id))
      .innerJoin(
        platformUser,
        eq(businessMembership.platformUserId, platformUser.id)
      )
      .where(eq(businessMembership.id, membershipId))
      .limit(1);

    if (!membership) {
      throw new AuthError(
        AUTH_ERROR_CODES.NO_BUSINESS_ACCESS,
        AUTH_USER_MESSAGES.NO_BUSINESS_ACCESS,
        403
      );
    }

    this.assertMembershipAccess(membership);

    await db.transaction(async (tx) => {
      await tx
        .update(businessMembership)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(
          eq(businessMembership.platformUserId, membership.platformUserId)
        );

      await tx
        .update(businessMembership)
        .set({ isPrimary: true, updatedAt: new Date() })
        .where(eq(businessMembership.id, membershipId));
    });

    const context: CurrentBusinessContext = {
      platformUserId: membership.platformUserId,
      businessId: membership.businessId,
      businessMembershipId: membership.membershipId,
    };

    await setBusinessContextCookie(context);

    await getAuthenticationAuditEmitter().emit({
      eventType: AUTHENTICATION_AUDIT_EVENT_TYPES.BUSINESS_SWITCH,
      outcome: "SUCCESS",
      timestamp: new Date(),
      platformUserId: membership.platformUserId,
      businessId: membership.businessId,
      clientContext,
    });

    return context;
  }

  async initializeContextForUser(
    platformUserId: string,
    clientContext?: ClientContext
  ): Promise<{
    context: CurrentBusinessContext | null;
    requiresBusinessSelection: boolean;
  }> {
    const memberships = await this.getActiveMemberships(platformUserId);

    if (memberships.length === 0) {
      throw new AuthError(
        AUTH_ERROR_CODES.NO_BUSINESS_ACCESS,
        AUTH_USER_MESSAGES.NO_BUSINESS_ACCESS,
        403
      );
    }

    if (memberships.length === 1) {
      const context = await this.setCurrentBusiness(
        memberships[0].membershipId,
        clientContext
      );

      return {
        context,
        requiresBusinessSelection: false,
      };
    }

    const primaryMembership =
      memberships.find((membership) => membership.isPrimary) ?? memberships[0];

    const context = await this.setCurrentBusiness(
      primaryMembership.membershipId,
      clientContext
    );

    return {
      context,
      requiresBusinessSelection: true,
    };
  }

  async clearContext(): Promise<void> {
    await clearBusinessContextCookie();
  }

  async getActiveMemberships(
    platformUserId: string
  ): Promise<ActiveMembershipRecord[]> {
    const db = getDb();

    const rows = await db
      .select({
        membershipId: businessMembership.id,
        businessId: businessMembership.businessId,
        isPrimary: businessMembership.isPrimary,
        membershipStatus: businessMembership.status,
        businessStatusCode: business.statusCode,
      })
      .from(businessMembership)
      .innerJoin(business, eq(businessMembership.businessId, business.id))
      .where(
        and(
          eq(businessMembership.platformUserId, platformUserId),
          eq(businessMembership.status, BUSINESS_MEMBERSHIP_STATUS.ACTIVE),
          eq(business.statusCode, BUSINESS_STATUS.ACTIVE)
        )
      );

    return rows.map((row) => ({
      membershipId: row.membershipId,
      businessId: row.businessId,
      isPrimary: row.isPrimary,
      businessStatusCode: row.businessStatusCode,
    }));
  }

  /**
   * Purpose:
   * Load enriched business options for the select-business screen.
   *
   * Business Context:
   * Users with multiple memberships choose which business context to activate next.
   *
   * Inputs:
   * - platformUserId — authenticated platform user identifier
   *
   * Outputs:
   * - SelectableBusiness entries including owner and primary badges
   *
   * Business Rules Implemented:
   * - ADR-012 — only active memberships on active businesses are selectable
   */
  async getSelectableBusinesses(
    platformUserId: string
  ): Promise<SelectableBusiness[]> {
    const db = getDb();

    const rows = await db
      .select({
        membershipId: businessMembership.id,
        businessId: business.id,
        businessName: business.name,
        businessTypeName: businessType.name,
        countryName: country.name,
        isPrimary: businessMembership.isPrimary,
        roleCode: role.code,
      })
      .from(businessMembership)
      .innerJoin(business, eq(businessMembership.businessId, business.id))
      .innerJoin(businessType, eq(business.businessTypeId, businessType.id))
      .innerJoin(country, eq(business.countryCode, country.code))
      .leftJoin(
        userRole,
        and(
          eq(userRole.businessMembershipId, businessMembership.id),
          isNull(userRole.effectiveTo)
        )
      )
      .leftJoin(role, eq(userRole.roleId, role.id))
      .where(
        and(
          eq(businessMembership.platformUserId, platformUserId),
          eq(businessMembership.status, BUSINESS_MEMBERSHIP_STATUS.ACTIVE),
          eq(business.statusCode, BUSINESS_STATUS.ACTIVE)
        )
      )
      .orderBy(asc(business.name));

    const businesses = new Map<string, SelectableBusiness>();

    for (const row of rows) {
      const existing = businesses.get(row.membershipId) ?? {
        membershipId: row.membershipId,
        businessId: row.businessId,
        businessName: row.businessName,
        businessTypeName: row.businessTypeName,
        countryName: row.countryName,
        isOwner: false,
        isPrimary: row.isPrimary,
      };

      if (row.roleCode === PLATFORM_ROLE_CODES.OWNER) {
        existing.isOwner = true;
      }

      businesses.set(row.membershipId, existing);
    }

    return Array.from(businesses.values());
  }

  private assertMembershipAccess(membership: {
    membershipStatus: string;
    businessStatusCode: string;
    userIsActive: boolean;
  }): void {
    if (!membership.userIsActive) {
      throw new AuthError(
        AUTH_ERROR_CODES.ACCOUNT_DEACTIVATED,
        AUTH_USER_MESSAGES.ACCOUNT_DEACTIVATED,
        403
      );
    }

    if (membership.membershipStatus !== BUSINESS_MEMBERSHIP_STATUS.ACTIVE) {
      throw new AuthError(
        AUTH_ERROR_CODES.NO_BUSINESS_ACCESS,
        AUTH_USER_MESSAGES.NO_BUSINESS_ACCESS,
        403
      );
    }

    if (membership.businessStatusCode !== BUSINESS_STATUS.ACTIVE) {
      throw new AuthError(
        AUTH_ERROR_CODES.BUSINESS_UNAVAILABLE,
        AUTH_USER_MESSAGES.BUSINESS_UNAVAILABLE,
        403
      );
    }
  }
}

export function createBusinessContextService(): BusinessContextService {
  return new BusinessContextService();
}
