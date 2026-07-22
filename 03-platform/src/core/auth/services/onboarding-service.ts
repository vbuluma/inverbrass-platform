import { and, eq } from "drizzle-orm";

import { createIdentityProviderAdapter } from "@/core/auth/adapters/supabase-identity-provider-adapter";
import type { IdentityProviderAdapter } from "@/core/auth/adapters/identity-provider-adapter";
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
import { createSecurityQuestionService } from "@/core/auth/services/security-question-service";
import type { SecurityQuestionService } from "@/core/auth/services/security-question-service";
import type {
  ClientContext,
  OwnerRegistrationPayload,
  OwnerRegistrationResult,
} from "@/core/auth/types";
import { generateUniqueBusinessCode } from "@/core/auth/utils/business-code";
import {
  normalizeMobileNumber,
  toAuthEmailAlias,
} from "@/core/auth/utils/phone-normalizer";
import { ownerRegistrationSchema } from "@/core/auth/validators/registration-validators";
import {
  AUTHENTICATION_AUDIT_EVENT_TYPES,
} from "@/core/audit/types";
import { getAuthenticationAuditEmitter } from "@/core/audit/authentication-audit-emitter";
import { getDb } from "@/db/client";
import { business } from "@/db/schema/business";
import { businessMembership } from "@/db/schema/business-membership";
import { businessType } from "@/db/schema/business-type";
import { country } from "@/db/schema/country";
import { platformUser } from "@/db/schema/platform-user";
import { userSecurityProfile } from "@/db/schema/user-security-profile";

export class OnboardingService {
  constructor(
    private readonly identityProvider: IdentityProviderAdapter = createIdentityProviderAdapter(),
    private readonly authService: AuthService = createAuthService(),
    private readonly businessContextService: BusinessContextService = createBusinessContextService(),
    private readonly securityQuestionService: SecurityQuestionService = createSecurityQuestionService(),
    private readonly roleAssignmentService: RoleAssignmentService = createRoleAssignmentService()
  ) {}

  async registerOwner(
    payload: OwnerRegistrationPayload,
    clientContext?: ClientContext
  ): Promise<OwnerRegistrationResult> {
    const parsed = ownerRegistrationSchema.safeParse(payload);

    if (!parsed.success) {
      throw new AuthError(
        AUTH_ERROR_CODES.INVALID_INPUT,
        parsed.error.issues[0]?.message ?? AUTH_USER_MESSAGES.INVALID_INPUT
      );
    }

    const data = parsed.data;

    let ownerPhoneE164: string;
    let businessPhoneE164: string;

    try {
      ownerPhoneE164 = normalizeMobileNumber(
        data.mobileNumber,
        data.countryCode
      );
      businessPhoneE164 = normalizeMobileNumber(
        data.businessMobileNumber,
        data.businessCountryCode
      );
    } catch {
      throw new AuthError(
        AUTH_ERROR_CODES.INVALID_INPUT,
        "Enter valid mobile numbers for the selected countries."
      );
    }

    await this.assertPhoneAvailable(ownerPhoneE164);
    await this.assertBusinessReferences(data.businessTypeId, data.businessCountryCode);
    await this.securityQuestionService.assertActiveQuestion(
      data.securityQuestionId
    );

    const authEmailAlias = toAuthEmailAlias(ownerPhoneE164);
    const contactEmail =
      data.email && data.email.length > 0 ? data.email : authEmailAlias;

    const signUpResult = await this.identityProvider.signUp({
      authEmailAlias,
      password: data.password,
      metadata: {
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: ownerPhoneE164,
      },
    });

    let platformUserId = "";
    let businessId = "";
    let membershipId = "";
    let userRoleId = "";

    try {
      const db = getDb();
      const countryRow = await this.loadCountry(data.businessCountryCode);

      await db.transaction(async (tx) => {
        const [createdUser] = await tx
          .insert(platformUser)
          .values({
            authUserId: signUpResult.authUserId,
            firstName: data.firstName,
            lastName: data.lastName,
            displayName: `${data.firstName} ${data.lastName}`.trim(),
            email: contactEmail,
            phoneNumber: ownerPhoneE164,
            isActive: true,
          })
          .returning({ id: platformUser.id });

        platformUserId = createdUser.id;

        await tx.insert(userSecurityProfile).values({
          platformUserId,
          mustChangePassword: false,
          failedLoginAttempts: 0,
        });

        await this.securityQuestionService.hashAndStoreAnswer(
          platformUserId,
          data.securityQuestionId,
          data.securityAnswer,
          tx
        );

        const businessCode = await generateUniqueBusinessCode(
          data.businessName,
          tx
        );

        const [createdBusiness] = await tx
          .insert(business)
          .values({
            code: businessCode,
            name: data.businessName,
            phoneNumber: businessPhoneE164,
            businessTypeId: data.businessTypeId,
            statusCode: BUSINESS_STATUS.ACTIVE,
            countryCode: data.businessCountryCode,
            timezone: countryRow.timezoneCode,
          })
          .returning({ id: business.id });

        businessId = createdBusiness.id;

        const [createdMembership] = await tx
          .insert(businessMembership)
          .values({
            businessId,
            platformUserId,
            status: BUSINESS_MEMBERSHIP_STATUS.ACTIVE,
            isPrimary: true,
          })
          .returning({ id: businessMembership.id });

        membershipId = createdMembership.id;

        userRoleId = await this.roleAssignmentService.assignPlatformRole(
          membershipId,
          PLATFORM_ROLE_CODES.OWNER,
          platformUserId,
          "Owner self-registration",
          tx
        );
      });
    } catch (error) {
      await getAuthenticationAuditEmitter().emit({
        eventType: AUTHENTICATION_AUDIT_EVENT_TYPES.USER_REGISTERED,
        outcome: "FAILURE",
        timestamp: new Date(),
        clientContext,
        metadata: {
          reason:
            error instanceof AuthError ? error.code : "PROVISIONING_FAILED",
          phoneNumber: ownerPhoneE164,
        },
      });

      throw error instanceof AuthError
        ? error
        : new AuthError(
            AUTH_ERROR_CODES.REGISTRATION_FAILED,
            AUTH_USER_MESSAGES.REGISTRATION_FAILED,
            500
          );
    }

    if (!signUpResult.session) {
      await this.identityProvider.signInWithPassword({
        authEmailAlias,
        password: data.password,
      });
    }

    const businessContext = await this.businessContextService.setCurrentBusiness(
      membershipId,
      clientContext
    );

    const user = await this.authService.getAuthenticatedUser();

    if (!user) {
      throw new AuthError(
        AUTH_ERROR_CODES.REGISTRATION_FAILED,
        AUTH_USER_MESSAGES.REGISTRATION_FAILED,
        500
      );
    }

    const auditTimestamp = new Date();

    await getAuthenticationAuditEmitter().emit({
      eventType: AUTHENTICATION_AUDIT_EVENT_TYPES.USER_REGISTERED,
      outcome: "SUCCESS",
      timestamp: auditTimestamp,
      platformUserId,
      clientContext,
      metadata: {
        phoneNumber: ownerPhoneE164,
      },
    });

    await getAuthenticationAuditEmitter().emit({
      eventType: AUTHENTICATION_AUDIT_EVENT_TYPES.BUSINESS_CREATED,
      outcome: "SUCCESS",
      timestamp: auditTimestamp,
      platformUserId,
      businessId,
      clientContext,
      metadata: {
        businessPhoneNumber: businessPhoneE164,
        businessEmail: data.businessEmail ?? null,
      },
    });

    await getAuthenticationAuditEmitter().emit({
      eventType: AUTHENTICATION_AUDIT_EVENT_TYPES.MEMBERSHIP_CREATED,
      outcome: "SUCCESS",
      timestamp: auditTimestamp,
      platformUserId,
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
      platformUserId,
      businessId,
      clientContext,
      metadata: {
        businessMembershipId: membershipId,
        userRoleId,
        roleCode: PLATFORM_ROLE_CODES.OWNER,
      },
    });

    return {
      user,
      businessContext,
      businessId,
      platformUserId,
    };
  }

  private async assertPhoneAvailable(phoneNumberE164: string): Promise<void> {
    const db = getDb();

    const [existing] = await db
      .select({ id: platformUser.id })
      .from(platformUser)
      .where(eq(platformUser.phoneNumber, phoneNumberE164))
      .limit(1);

    if (existing) {
      throw new AuthError(
        AUTH_ERROR_CODES.PHONE_ALREADY_REGISTERED,
        AUTH_USER_MESSAGES.PHONE_ALREADY_REGISTERED,
        409
      );
    }
  }

  private async assertBusinessReferences(
    businessTypeId: string,
    countryCode: string
  ): Promise<void> {
    const db = getDb();

    const [typeRow] = await db
      .select({ id: businessType.id })
      .from(businessType)
      .where(
        and(eq(businessType.id, businessTypeId), eq(businessType.isActive, true))
      )
      .limit(1);

    if (!typeRow) {
      throw new AuthError(
        AUTH_ERROR_CODES.INVALID_INPUT,
        "Select a valid business type."
      );
    }

    const [countryRow] = await db
      .select({ code: country.code })
      .from(country)
      .where(and(eq(country.code, countryCode), eq(country.isActive, true)))
      .limit(1);

    if (!countryRow) {
      throw new AuthError(
        AUTH_ERROR_CODES.INVALID_INPUT,
        "Select a valid country."
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
      .where(eq(country.code, countryCode))
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

export function createOnboardingService(): OnboardingService {
  return new OnboardingService();
}
