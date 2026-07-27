/**
 * Purpose:
 * Create a Tenant Business for an authenticated Platform User (Business Registration).
 *
 * Design rationale:
 * Business Registration starts only after Platform Registration. Industry Type
 * selection filters Business Templates (business_type). The Owner role is assigned
 * on the new membership — Single Owner capability preserved.
 *
 * Why this exists:
 * BP-001 foundation correction — businesses are no longer created at signup.
 *
 * Architecture:
 * UI → Server Actions → BusinessRegistrationService → Drizzle / RoleAssignment
 *
 * Responsibilities:
 * - Validate industry + template + country references
 * - Create DRAFT business, ACTIVE membership, OWNER role
 * - Set current business context for setup wizard entry
 *
 * Non-Responsibilities:
 * - Platform User signup (OnboardingService)
 * - Setup wizard steps (BusinessSetupService)
 */

import { and, eq } from "drizzle-orm";

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
import { createAuthService } from "@/core/auth/services/auth-service";
import type { AuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import type { BusinessContextService } from "@/core/auth/services/business-context-service";
import { createRoleAssignmentService } from "@/core/auth/services/role-assignment-service";
import type { RoleAssignmentService } from "@/core/auth/services/role-assignment-service";
import type {
  ClientContext,
  CreateBusinessPayload,
  CreateBusinessResult,
} from "@/core/auth/types";
import { generateUniqueBusinessCode } from "@/core/auth/utils/business-code";
import { normalizeMobileNumber } from "@/core/auth/utils/phone-normalizer";
import { createBusinessSchema } from "@/core/auth/validators/create-business-validators";
import { AUTHENTICATION_AUDIT_EVENT_TYPES } from "@/core/audit/types";
import { getAuthenticationAuditEmitter } from "@/core/audit/authentication-audit-emitter";
import { getDb } from "@/db/client";
import { business } from "@/db/schema/business";
import { businessConfiguration } from "@/db/schema/business-configuration";
import { businessMembership } from "@/db/schema/business-membership";
import { businessType } from "@/db/schema/business-type";
import { country } from "@/db/schema/country";
import { industry } from "@/db/schema/industry";
import { platformUser } from "@/db/schema/platform-user";
import { resolveDefaultOnboardingProfile } from "@/modules/business/onboarding/onboarding-profiles";
import { createDefaultConfigurationSettings } from "@/modules/business/onboarding/services/setup-rules";

export class BusinessRegistrationService {
  constructor(
    private readonly authService: AuthService = createAuthService(),
    private readonly businessContextService: BusinessContextService = createBusinessContextService(),
    private readonly roleAssignmentService: RoleAssignmentService = createRoleAssignmentService()
  ) {}

  /**
   * WHAT: Provision a DRAFT business for the authenticated Platform User.
   * WHY: Business Registration is the only path that creates Tenant Businesses.
   */
  async createBusiness(
    payload: CreateBusinessPayload,
    clientContext?: ClientContext
  ): Promise<CreateBusinessResult> {
    const parsed = createBusinessSchema.safeParse(payload);

    if (!parsed.success) {
      throw new AuthError(
        AUTH_ERROR_CODES.INVALID_INPUT,
        parsed.error.issues[0]?.message ?? AUTH_USER_MESSAGES.INVALID_INPUT
      );
    }

    const user = await this.authService.getAuthenticatedUser();

    if (!user) {
      throw new AuthError(
        AUTH_ERROR_CODES.SESSION_REQUIRED,
        AUTH_USER_MESSAGES.SESSION_REQUIRED,
        401
      );
    }

    const data = parsed.data;

    await this.assertIndustryActive(data.industryId);
    await this.assertTemplateBelongsToIndustry(
      data.businessTypeId,
      data.industryId
    );

    const businessTypeCode = await this.loadBusinessTypeCode(data.businessTypeId);
    const onboardingProfile = resolveDefaultOnboardingProfile(businessTypeCode);
    const countryRow = await this.loadCountry(data.countryCode);

    let businessPhoneE164: string;

    try {
      const phoneSource =
        data.mobileNumber?.trim() ||
        user.phoneNumber ||
        "";

      if (!phoneSource) {
        throw new Error("MISSING_PHONE");
      }

      businessPhoneE164 = normalizeMobileNumber(
        phoneSource,
        data.countryCode
      );
    } catch {
      throw new AuthError(
        AUTH_ERROR_CODES.INVALID_INPUT,
        "Enter a valid mobile number for the selected country."
      );
    }

    let businessId = "";
    let membershipId = "";
    let userRoleId = "";

    try {
      const db = getDb();

      await db.transaction(async (tx) => {
        const businessCode = await generateUniqueBusinessCode(
          data.businessName,
          tx
        );

        const [createdBusiness] = await tx
          .insert(business)
          .values({
            code: businessCode,
            name: data.businessName.trim(),
            phoneNumber: businessPhoneE164,
            businessTypeId: data.businessTypeId,
            // DRAFT until setup activation (IP-006 BR-011 / BR-007).
            statusCode: BUSINESS_STATUS.DRAFT,
            countryCode: data.countryCode,
            timezone: countryRow.timezoneCode,
          })
          .returning({ id: business.id });

        businessId = createdBusiness.id;

        const [createdMembership] = await tx
          .insert(businessMembership)
          .values({
            businessId,
            platformUserId: user.platformUserId,
            status: BUSINESS_MEMBERSHIP_STATUS.ACTIVE,
            isPrimary: true,
          })
          .returning({ id: businessMembership.id });

        membershipId = createdMembership.id;

        userRoleId = await this.roleAssignmentService.assignPlatformRole(
          membershipId,
          PLATFORM_ROLE_CODES.OWNER,
          user.platformUserId,
          "Business Registration — Owner",
          tx
        );

        // Clear proposed name once a real business has been created from it.
        await tx
          .update(platformUser)
          .set({
            proposedBusinessName: data.businessName.trim(),
            updatedAt: new Date(),
          })
          .where(eq(platformUser.id, user.platformUserId));

        // Seed configuration with inferred onboarding profile (metadata-driven).
        await tx.insert(businessConfiguration).values({
          businessId,
          settings: createDefaultConfigurationSettings(onboardingProfile),
        });
      });
    } catch (error) {
      console.error("[business-registration] Failed to create business.", {
        platformUserId: user.platformUserId,
        reason:
          error instanceof AuthError ? error.code : "BUSINESS_CREATE_FAILED",
      });

      throw error instanceof AuthError
        ? error
        : new AuthError(
            AUTH_ERROR_CODES.REGISTRATION_FAILED,
            "We could not create your business. Please try again.",
            500
          );
    }

    const businessContext = await this.businessContextService.setCurrentBusiness(
      membershipId,
      clientContext
    );

    const auditTimestamp = new Date();

    await getAuthenticationAuditEmitter().emit({
      eventType: AUTHENTICATION_AUDIT_EVENT_TYPES.BUSINESS_CREATED,
      outcome: "SUCCESS",
      timestamp: auditTimestamp,
      platformUserId: user.platformUserId,
      businessId,
      clientContext,
      metadata: {
        industryId: data.industryId,
        businessTypeId: data.businessTypeId,
      },
    });

    await getAuthenticationAuditEmitter().emit({
      eventType: AUTHENTICATION_AUDIT_EVENT_TYPES.MEMBERSHIP_CREATED,
      outcome: "SUCCESS",
      timestamp: auditTimestamp,
      platformUserId: user.platformUserId,
      businessId,
      clientContext,
      metadata: {
        businessMembershipId: membershipId,
      },
    });

    await getAuthenticationAuditEmitter().emit({
      eventType: AUTHENTICATION_AUDIT_EVENT_TYPES.ROLE_ASSIGNED,
      outcome: "SUCCESS",
      timestamp: auditTimestamp,
      platformUserId: user.platformUserId,
      businessId,
      clientContext,
      metadata: {
        businessMembershipId: membershipId,
        userRoleId,
        roleCode: PLATFORM_ROLE_CODES.OWNER,
      },
    });

    return {
      businessId,
      businessMembershipId: membershipId,
      businessContext,
    };
  }

  private async loadBusinessTypeCode(businessTypeId: string): Promise<string> {
    const db = getDb();
    const [row] = await db
      .select({ code: businessType.code })
      .from(businessType)
      .where(eq(businessType.id, businessTypeId))
      .limit(1);

    return row?.code ?? "";
  }

  private async assertIndustryActive(industryId: string): Promise<void> {
    const db = getDb();

    const [row] = await db
      .select({ id: industry.id })
      .from(industry)
      .where(and(eq(industry.id, industryId), eq(industry.isActive, true)))
      .limit(1);

    if (!row) {
      throw new AuthError(
        AUTH_ERROR_CODES.INVALID_INPUT,
        "Select a valid Industry Type."
      );
    }
  }

  /**
   * WHAT: Ensure the Business Template belongs to the selected Industry Type.
   * WHY: Templates must be filtered — never a global unscoped dropdown.
   */
  private async assertTemplateBelongsToIndustry(
    businessTypeId: string,
    industryId: string
  ): Promise<void> {
    const db = getDb();

    const [row] = await db
      .select({ id: businessType.id })
      .from(businessType)
      .where(
        and(
          eq(businessType.id, businessTypeId),
          eq(businessType.industryId, industryId),
          eq(businessType.isActive, true)
        )
      )
      .limit(1);

    if (!row) {
      throw new AuthError(
        AUTH_ERROR_CODES.INVALID_INPUT,
        "Select a valid business template for the chosen Industry Type."
      );
    }
  }

  private async loadCountry(countryCode: string): Promise<{
    timezoneCode: string;
  }> {
    const db = getDb();

    const [countryRow] = await db
      .select({ timezoneCode: country.timezoneCode })
      .from(country)
      .where(and(eq(country.code, countryCode), eq(country.isActive, true)))
      .limit(1);

    if (!countryRow) {
      throw new AuthError(
        AUTH_ERROR_CODES.INVALID_INPUT,
        "Select a valid country."
      );
    }

    return countryRow;
  }
}

export function createBusinessRegistrationService(): BusinessRegistrationService {
  return new BusinessRegistrationService();
}
