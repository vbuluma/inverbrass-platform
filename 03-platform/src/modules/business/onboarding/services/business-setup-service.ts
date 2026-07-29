/**
 * ============================================================================
 * Service: BusinessSetupService
 * ============================================================================
 *
 * Purpose
 * --------
 * Orchestrates the Business Activation & Configuration Wizard: step progress,
 * profile and configuration persistence, branch/employee setup, and activation.
 *
 * WHY
 * ---
 * Newly registered businesses remain DRAFT until mandatory setup completes.
 * This service is the single owner of IP-006 / BP-001 setup business rules.
 *
 * RATIONALE
 * ---------
 * Configuration is stored as metadata settings (not one column per toggle) so
 * future settings do not require schema redesign. Progress audit fields and
 * wizard_version support resume and future catalogue versions.
 *
 * Architecture
 * ------------
 * AD-009 Authentication & Business Onboarding (A4)
 * UI → Server Actions → BusinessSetupService → Repositories → Drizzle
 *
 * Implementation Package
 * ----------------------
 * BP-001 / IP-006 – Business Activation & Configuration Wizard
 *
 * Responsibilities
 * ----------------
 * • Initialize and resume setup progress
 * • Save mandatory and optional wizard steps
 * • Enforce country-before-currency and single base currency rules
 * • Provision branches and optional employees
 * • Activate business when mandatory steps are complete
 *
 * Does NOT
 * --------
 * • Authenticate users (AuthService)
 * • Sign business context cookies (BusinessContextService)
 * • Duplicate first-login password-change (AuthService)
 *
 * ============================================================================
 */

import { randomBytes } from "node:crypto";

import { and, asc, eq, ne } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import {
  BUSINESS_MEMBERSHIP_STATUS,
  BUSINESS_STATUS,
} from "@/core/auth/constants";
import { createRoleAssignmentService } from "@/core/auth/services/role-assignment-service";
import type { CurrentBusinessContext } from "@/core/auth/types";
import { hashPassword } from "@/core/auth/utils/password-hasher";
import { normalizeMobileNumber } from "@/core/auth/utils/phone-normalizer";
import { generateTemporaryPassword } from "@/core/auth/utils/temporary-password";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { business } from "@/db/schema/business";
import { businessMembership } from "@/db/schema/business-membership";
import { businessOperatingCurrency } from "@/db/schema/business-operating-currency";
import { businessProfile } from "@/db/schema/business-profile";
import { businessType } from "@/db/schema/business-type";
import { country } from "@/db/schema/country";
import { currency } from "@/db/schema/currency";
import { industry } from "@/db/schema/industry";
import { platformUser } from "@/db/schema/platform-user";
import { userSecurityProfile } from "@/db/schema/user-security-profile";
import {
  EMPLOYEE_SETUP_ROLE_CODES,
  SETUP_ALLOW_BASE_CURRENCY_CHANGE,
  SETUP_STEP_ORDER,
  SETUP_STEPS,
  SETUP_WIZARD_VERSION,
  type SetupStep,
  OPTIONAL_SETUP_STEPS,
} from "@/modules/business/onboarding/constants";
import { BRANCH_TYPES } from "@/modules/business/onboarding/constants/branch-types";
import {
  SETUP_ERROR_CODES,
  SETUP_USER_MESSAGES,
  SetupError,
} from "@/modules/business/onboarding/errors";
import { DASHBOARD_CONFIGURATION_ITEMS } from "@/modules/business/onboarding/configuration-catalog";
import {
  ONBOARDING_PROFILES,
  getMandatoryStepsForProfile,
  getOnboardingProfileDefinition,
  getOptionalStepsForProfile,
  isOnboardingProfileCode,
  isStepOptionalForProfile,
  type OnboardingProfileCode,
} from "@/modules/business/onboarding/onboarding-profiles";
import {
  createBranchRepository,
  type BranchRepository,
} from "@/modules/business/onboarding/repositories/branch-repository";
import {
  createBusinessConfigurationRepository,
  type BusinessConfigurationRepository,
} from "@/modules/business/onboarding/repositories/business-configuration-repository";
import {
  createBusinessEmployeeRepository,
  type BusinessEmployeeRepository,
} from "@/modules/business/onboarding/repositories/business-employee-repository";
import {
  createBusinessSetupProgressRepository,
  type BusinessSetupProgressRepository,
} from "@/modules/business/onboarding/repositories/business-setup-progress-repository";
import {
  applyCompletedStep,
  areMandatoryStepsComplete,
  buildBranchCodeCandidate,
  calculateProgressPercent,
  createDefaultConfigurationSettings,
  hasDuplicateOperatingCurrency,
  isSetupStep,
  mergeConfigurationSettings,
  normalizeOnboardingProfile,
  resolveResumeStep,
  toConfigurationView,
  uniqueSteps,
} from "@/modules/business/onboarding/services/setup-rules";
import type {
  AdditionalCurrenciesPayload,
  BaseCurrencyPayload,
  BranchSetupPayload,
  BusinessClassificationPayload,
  BusinessConfigurationSettings,
  BusinessConfigurationView,
  BusinessDashboardView,
  BusinessDetailsPayload,
  BusinessOperationsPayload,
  CountryStepPayload,
  CreatedEmployeeCredential,
  EmployeeSetupPayload,
  FeatureTogglePayload,
  PaymentMethodsPayload,
  ReceiptConfigurationPayload,
  SetupProgressView,
  SetupReviewSummary,
} from "@/modules/business/onboarding/types";
import { withSetupStepTiming } from "@/modules/business/onboarding/utils/setup-step-timing";
import {
  additionalCurrenciesSchema,
  baseCurrencySchema,
  branchSetupSchema,
  businessClassificationSchema,
  businessDetailsSchema,
  businessOperationsSchema,
  countryStepSchema,
  employeeSetupSchema,
  featureToggleSchema,
  paymentMethodsSchema,
  receiptConfigurationSchema,
} from "@/modules/business/onboarding/validators/setup-validators";

type DbClient = PostgresJsDatabase<typeof schema>;

export class BusinessSetupService {
  constructor(
    private readonly configurationRepository: BusinessConfigurationRepository = createBusinessConfigurationRepository(),
    private readonly progressRepository: BusinessSetupProgressRepository = createBusinessSetupProgressRepository(),
    private readonly branchRepository: BranchRepository = createBranchRepository(),
    private readonly employeeRepository: BusinessEmployeeRepository = createBusinessEmployeeRepository()
  ) {}

  /**
   * WHAT: Return resume-oriented setup progress for the current business.
   * WHY: FR-005 / BR-009 — owners continue from the last incomplete step.
   */
  async getSetupProgress(
    context: CurrentBusinessContext
  ): Promise<SetupProgressView> {
    const businessRow = await this.requireDraftOrActiveBusiness(context.businessId);
    const profile = await this.getOnboardingProfile(context.businessId);

    if (businessRow.statusCode === BUSINESS_STATUS.ACTIVE) {
      return {
        businessId: businessRow.id,
        businessName: businessRow.name,
        businessStatusCode: businessRow.statusCode,
        currentStep: SETUP_STEPS.COMPLETED,
        lastCompletedStep: SETUP_STEPS.REVIEW,
        completedSteps: [...SETUP_STEP_ORDER],
        resumeStep: SETUP_STEPS.COMPLETED,
        progressPercent: 100,
        isActivated: true,
        wizardVersion: SETUP_WIZARD_VERSION,
        onboardingProfile: profile,
      };
    }

    const progress = await this.progressRepository.ensureProgress(
      context.businessId
    );
    const completedSteps = uniqueSteps(progress.completedSteps as string[]);
    const resumeStep = resolveResumeStep(completedSteps, profile);

    return {
      businessId: businessRow.id,
      businessName: businessRow.name,
      businessStatusCode: businessRow.statusCode,
      currentStep: isSetupStep(progress.currentStep)
        ? (uniqueSteps([progress.currentStep])[0] ?? resumeStep)
        : resumeStep,
      lastCompletedStep:
        progress.lastCompletedStep && isSetupStep(progress.lastCompletedStep)
          ? (uniqueSteps([progress.lastCompletedStep])[0] ?? null)
          : null,
      completedSteps,
      resumeStep,
      progressPercent: calculateProgressPercent(completedSteps, profile),
      isActivated: false,
      wizardVersion: progress.wizardVersion || SETUP_WIZARD_VERSION,
      onboardingProfile: profile,
    };
  }

  /**
   * WHAT: Resolve the business onboarding profile from configuration metadata.
   * WHY: One setup engine — profiles only change mandatory/optional step sets.
   */
  async getOnboardingProfile(
    businessId: string
  ): Promise<OnboardingProfileCode> {
    const settings =
      await this.configurationRepository.findSettingsByBusinessId(businessId);
    return normalizeOnboardingProfile(settings?.onboardingProfile);
  }

  /**
   * WHAT: Persist onboarding profile (Business Settings + create-time default).
   * WHY: Owners may change Express/Standard/Enterprise without re-onboarding.
   */
  async setOnboardingProfile(
    context: CurrentBusinessContext,
    profile: OnboardingProfileCode
  ): Promise<void> {
    await this.requireEditableBusiness(context.businessId);

    if (!isOnboardingProfileCode(profile)) {
      throw new SetupError(
        SETUP_ERROR_CODES.INVALID_INPUT,
        "Select a valid onboarding profile."
      );
    }

    await this.patchConfigurationSettings(context.businessId, {
      onboardingProfile: profile,
    });
  }

  async completeWelcome(
    context: CurrentBusinessContext
  ): Promise<SetupProgressView> {
    return withSetupStepTiming("Step 1 - Welcome", async () => {
      await this.requireDraftBusiness(context.businessId);
      return this.markStepComplete(context, SETUP_STEPS.WELCOME);
    });
  }

  /**
   * WHAT: Persist business profile fields and legal business name.
   * WHY: Completes trading identity before classification and country steps.
   */
  async saveBusinessDetails(
    context: CurrentBusinessContext,
    payload: BusinessDetailsPayload
  ): Promise<SetupProgressView> {
    return withSetupStepTiming("Step 2 - Save Business Profile", async () => {
      await this.requireEditableBusiness(context.businessId);

      const parsed = businessDetailsSchema.safeParse(payload);

      if (!parsed.success) {
        throw new SetupError(
          SETUP_ERROR_CODES.INVALID_INPUT,
          parsed.error.issues[0]?.message ?? SETUP_USER_MESSAGES.INVALID_INPUT
        );
      }

      const data = parsed.data;
      const db = getDb();
      const businessName = data.businessName.trim();

      await db
        .update(business)
        .set({
          name: businessName,
          updatedAt: new Date(),
        })
        .where(eq(business.id, context.businessId));

      // Trading name defaults to legal name when blank.
      const tradingName =
        data.tradingName && data.tradingName.trim().length > 0
          ? data.tradingName.trim()
          : businessName;

      const [existing] = await db
        .select({ id: businessProfile.id })
        .from(businessProfile)
        .where(eq(businessProfile.businessId, context.businessId))
        .limit(1);

      const values = {
        tradingName,
        logoUrl: data.logoUrl,
        email: data.email,
        physicalAddress: data.physicalAddress,
        county: data.county,
        city: data.city,
        website: data.website || null,
        description: data.description || null,
        gpsLatitude: data.gpsLatitude || null,
        gpsLongitude: data.gpsLongitude || null,
        updatedAt: new Date(),
      };

      if (existing) {
        await db
          .update(businessProfile)
          .set(values)
          .where(eq(businessProfile.id, existing.id));
      } else {
        await db.insert(businessProfile).values({
          businessId: context.businessId,
          ...values,
        });
      }

      return this.markStepComplete(context, SETUP_STEPS.BUSINESS_PROFILE);
    });
  }

  /**
   * WHAT: Persist Industry Type and Business Type (template).
   * WHY: Business Types are filtered by Industry; template = selected type.
   */
  async saveBusinessClassification(
    context: CurrentBusinessContext,
    payload: BusinessClassificationPayload
  ): Promise<SetupProgressView> {
    return withSetupStepTiming(
      "Step 3 - Save Business Classification",
      async () => {
        await this.requireEditableBusiness(context.businessId);

        const parsed = businessClassificationSchema.safeParse(payload);

        if (!parsed.success) {
          throw new SetupError(
            SETUP_ERROR_CODES.INVALID_INPUT,
            parsed.error.issues[0]?.message ?? SETUP_USER_MESSAGES.INVALID_INPUT
          );
        }

        await this.assertIndustryActive(parsed.data.industryId);
        await this.assertTemplateBelongsToIndustry(
          parsed.data.businessTypeId,
          parsed.data.industryId
        );

        const db = getDb();
        await db
          .update(business)
          .set({
            businessTypeId: parsed.data.businessTypeId,
            updatedAt: new Date(),
          })
          .where(eq(business.id, context.businessId));

        return this.markStepComplete(
          context,
          SETUP_STEPS.BUSINESS_CLASSIFICATION
        );
      }
    );
  }

  /**
   * WHAT: Persist editable country and seed default base currency.
   * WHY: BR-001/BR-002 — country precedes currency; country drives default currency.
   */
  async saveCountry(
    context: CurrentBusinessContext,
    payload: CountryStepPayload
  ): Promise<SetupProgressView> {
    return withSetupStepTiming("Step 4 - Save Country", async () => {
      const businessRow = await this.requireEditableBusiness(context.businessId);

      const parsed = countryStepSchema.safeParse(payload);

      if (!parsed.success) {
        throw new SetupError(
          SETUP_ERROR_CODES.INVALID_INPUT,
          parsed.error.issues[0]?.message ?? SETUP_USER_MESSAGES.INVALID_INPUT
        );
      }

      const countryRow = await this.loadActiveCountry(parsed.data.countryCode);

      // Validate currency BEFORE opening the transaction. With pool max:1,
      // querying via getDb() inside a held transaction deadlocks forever.
      await this.assertActiveCurrency(countryRow.currencyCode);

      const db = getDb();

      await db.transaction(async (tx) => {
        await tx
          .update(business)
          .set({
            countryCode: countryRow.code,
            timezone: countryRow.timezoneCode,
            updatedAt: new Date(),
          })
          .where(eq(business.id, context.businessId));

        // Currency selections are reset so the country default can re-apply.
        await tx
          .delete(businessOperatingCurrency)
          .where(eq(businessOperatingCurrency.businessId, context.businessId));

        await tx.insert(businessOperatingCurrency).values({
          businessId: context.businessId,
          currencyCode: countryRow.currencyCode,
          isBase: true,
        });
      });

      // Maintenance saves on ACTIVE businesses must not mutate wizard progress.
      if (businessRow.statusCode === BUSINESS_STATUS.ACTIVE) {
        return this.getSetupProgress(context);
      }

      const profile = await this.getOnboardingProfile(context.businessId);
      const progress = await this.progressRepository.ensureProgress(
        context.businessId
      );
      const priorSteps = uniqueSteps(
        (progress.completedSteps as string[]).filter(
          (step) =>
            step !== SETUP_STEPS.BASE_CURRENCY &&
            step !== SETUP_STEPS.ADDITIONAL_CURRENCIES &&
            step !== SETUP_STEPS.REVIEW
        )
      );

      if (!priorSteps.includes(SETUP_STEPS.COUNTRY)) {
        priorSteps.push(SETUP_STEPS.COUNTRY);
      }

      // Express: country seeds base currency — auto-complete currency step.
      if (
        profile === ONBOARDING_PROFILES.EXPRESS &&
        !priorSteps.includes(SETUP_STEPS.BASE_CURRENCY)
      ) {
        priorSteps.push(SETUP_STEPS.BASE_CURRENCY);
      }

      const completedAt = new Date();
      const resumeStep = resolveResumeStep(priorSteps, profile);

      await this.progressRepository.replaceProgress({
        businessId: context.businessId,
        currentStep: resumeStep,
        completedSteps: priorSteps,
        lastCompletedStep: SETUP_STEPS.COUNTRY,
        completedBy: context.platformUserId,
        completedAt,
      });

      return this.getSetupProgress(context);
    });
  }

  /**
   * WHAT: Persist exactly one base operating currency.
   * WHY: BR-004 — base currency is mandatory before activation.
   */
  async saveBaseCurrency(
    context: CurrentBusinessContext,
    payload: BaseCurrencyPayload
  ): Promise<SetupProgressView> {
    return withSetupStepTiming("Step 5 - Save Base Currency", async () => {
      await this.requireEditableBusiness(context.businessId);
      await this.assertCountrySelected(context.businessId);

      const parsed = baseCurrencySchema.safeParse(payload);

      if (!parsed.success) {
        throw new SetupError(
          SETUP_ERROR_CODES.INVALID_INPUT,
          parsed.error.issues[0]?.message ?? SETUP_USER_MESSAGES.INVALID_INPUT
        );
      }

      const defaultCurrency = await this.getDefaultCurrencyForBusiness(
        context.businessId
      );

      if (
        !SETUP_ALLOW_BASE_CURRENCY_CHANGE &&
        defaultCurrency &&
        parsed.data.currencyCode.toUpperCase() !==
          defaultCurrency.currencyCode.toUpperCase()
      ) {
        throw new SetupError(
          SETUP_ERROR_CODES.INVALID_INPUT,
          "Base currency is derived from the operating country and cannot be changed."
        );
      }

      await this.assertActiveCurrency(parsed.data.currencyCode);

      const db = getDb();

      await db.transaction(async (tx) => {
        await tx
          .delete(businessOperatingCurrency)
          .where(
            and(
              eq(businessOperatingCurrency.businessId, context.businessId),
              eq(businessOperatingCurrency.isBase, true)
            )
          );

        const [existing] = await tx
          .select({ id: businessOperatingCurrency.id })
          .from(businessOperatingCurrency)
          .where(
            and(
              eq(businessOperatingCurrency.businessId, context.businessId),
              eq(
                businessOperatingCurrency.currencyCode,
                parsed.data.currencyCode
              )
            )
          )
          .limit(1);

        if (existing) {
          await tx
            .update(businessOperatingCurrency)
            .set({ isBase: true, updatedAt: new Date() })
            .where(eq(businessOperatingCurrency.id, existing.id));
        } else {
          await tx.insert(businessOperatingCurrency).values({
            businessId: context.businessId,
            currencyCode: parsed.data.currencyCode,
            isBase: true,
          });
        }

        await tx
          .update(businessOperatingCurrency)
          .set({ isBase: false, updatedAt: new Date() })
          .where(
            and(
              eq(businessOperatingCurrency.businessId, context.businessId),
              ne(
                businessOperatingCurrency.currencyCode,
                parsed.data.currencyCode
              )
            )
          );
      });

      return this.markStepComplete(context, SETUP_STEPS.BASE_CURRENCY);
    });
  }

  /**
   * WHAT: Persist optional additional operating currencies.
   * WHY: BR-003/BR-005 — multiple currencies allowed; duplicates rejected.
   */
  async saveAdditionalCurrencies(
    context: CurrentBusinessContext,
    payload: AdditionalCurrenciesPayload
  ): Promise<SetupProgressView> {
    return withSetupStepTiming(
      "Step 6 - Save Additional Currencies",
      async () => {
        await this.requireEditableBusiness(context.businessId);
        await this.assertCountrySelected(context.businessId);

        const parsed = additionalCurrenciesSchema.safeParse(payload);

        if (!parsed.success) {
          throw new SetupError(
            SETUP_ERROR_CODES.INVALID_INPUT,
            parsed.error.issues[0]?.message ?? SETUP_USER_MESSAGES.INVALID_INPUT
          );
        }

        const codes = [
          ...new Set(
            parsed.data.currencyCodes.map((code) => code.toUpperCase())
          ),
        ];
        const db = getDb();

        const [base] = await db
          .select({ currencyCode: businessOperatingCurrency.currencyCode })
          .from(businessOperatingCurrency)
          .where(
            and(
              eq(businessOperatingCurrency.businessId, context.businessId),
              eq(businessOperatingCurrency.isBase, true)
            )
          )
          .limit(1);

        if (!base) {
          throw new SetupError(
            SETUP_ERROR_CODES.BASE_CURRENCY_REQUIRED,
            SETUP_USER_MESSAGES.BASE_CURRENCY_REQUIRED
          );
        }

        if (hasDuplicateOperatingCurrency(base.currencyCode, codes)) {
          throw new SetupError(
            SETUP_ERROR_CODES.DUPLICATE_CURRENCY,
            SETUP_USER_MESSAGES.DUPLICATE_CURRENCY
          );
        }

        for (const code of codes) {
          await this.assertActiveCurrency(code);
        }

        await db.transaction(async (tx) => {
          await tx
            .delete(businessOperatingCurrency)
            .where(
              and(
                eq(businessOperatingCurrency.businessId, context.businessId),
                eq(businessOperatingCurrency.isBase, false)
              )
            );

          for (const code of codes) {
            await tx.insert(businessOperatingCurrency).values({
              businessId: context.businessId,
              currencyCode: code,
              isBase: false,
            });
          }
        });

        return this.markStepComplete(
          context,
          SETUP_STEPS.ADDITIONAL_CURRENCIES
        );
      }
    );
  }

  async skipOptionalStep(
    context: CurrentBusinessContext,
    step: SetupStep
  ): Promise<SetupProgressView> {
    return withSetupStepTiming(`Skip optional - ${step}`, async () => {
      await this.requireDraftBusiness(context.businessId);

      const profile = await this.getOnboardingProfile(context.businessId);
      const optionalForProfile = new Set([
        ...OPTIONAL_SETUP_STEPS,
        ...getOptionalStepsForProfile(profile),
      ]);

      if (
        !optionalForProfile.has(step) ||
        !isStepOptionalForProfile(profile, step)
      ) {
        throw new SetupError(
          SETUP_ERROR_CODES.STEP_NOT_ALLOWED,
          "Only optional setup steps may be skipped."
        );
      }

      return this.markStepComplete(context, step);
    });
  }

  /**
   * WHAT: Persist payment, receipt, AI, and loyalty settings together.
   * WHY: Business Operations groups related configuration into one step.
   */
  async saveBusinessOperations(
    context: CurrentBusinessContext,
    payload: BusinessOperationsPayload
  ): Promise<SetupProgressView> {
    return withSetupStepTiming("Step 7 - Save Business Operations", async () => {
      await this.requireEditableBusiness(context.businessId);

      const parsed = businessOperationsSchema.safeParse(payload);

      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        const fieldPath = issue?.path?.map(String) ?? [];
        // Map nested zod paths onto form field names for UI highlighting.
        const field =
          fieldPath[0] === "receipt" && fieldPath[1]
            ? fieldPath[1]
            : fieldPath[0] === "paymentMethods"
              ? "paymentMethods"
              : fieldPath[fieldPath.length - 1];

        throw new SetupError(
          SETUP_ERROR_CODES.INVALID_INPUT,
          issue?.message ?? SETUP_USER_MESSAGES.INVALID_INPUT,
          400,
          field
        );
      }

      await this.patchConfigurationSettings(context.businessId, {
        paymentMethods: parsed.data.paymentMethods,
        receipt: {
          receiptPrefix: parsed.data.receipt.receiptPrefix,
          receiptFooter: parsed.data.receipt.receiptFooter,
          showLogoOnReceipt: parsed.data.receipt.showLogoOnReceipt,
        },
        tax: {
          taxEnabled: parsed.data.receipt.taxEnabled,
          defaultTaxName: parsed.data.receipt.defaultTaxName.trim() || "VAT",
          defaultTaxRate: parsed.data.receipt.taxEnabled
            ? parsed.data.receipt.defaultTaxRate
            : "0",
        },
        features: {
          aiAssistantEnabled: parsed.data.aiAssistantEnabled,
          loyaltyProgrammeEnabled: parsed.data.loyaltyProgrammeEnabled,
        },
      });

      return this.markStepComplete(context, SETUP_STEPS.BUSINESS_OPERATIONS);
    });
  }

  /** @deprecated Prefer saveBusinessOperations — retained for compatibility. */
  async savePaymentMethods(
    context: CurrentBusinessContext,
    payload: PaymentMethodsPayload
  ): Promise<SetupProgressView> {
    const parsed = paymentMethodsSchema.safeParse(payload);
    if (!parsed.success) {
      throw new SetupError(
        SETUP_ERROR_CODES.INVALID_INPUT,
        parsed.error.issues[0]?.message ?? SETUP_USER_MESSAGES.INVALID_INPUT
      );
    }
    await this.patchConfigurationSettings(context.businessId, {
      paymentMethods: parsed.data,
    });
    return this.markStepComplete(context, SETUP_STEPS.BUSINESS_OPERATIONS);
  }

  /** @deprecated Prefer saveBusinessOperations — retained for compatibility. */
  async saveReceiptConfiguration(
    context: CurrentBusinessContext,
    payload: ReceiptConfigurationPayload
  ): Promise<SetupProgressView> {
    const parsed = receiptConfigurationSchema.safeParse(payload);
    if (!parsed.success) {
      throw new SetupError(
        SETUP_ERROR_CODES.INVALID_INPUT,
        parsed.error.issues[0]?.message ?? SETUP_USER_MESSAGES.INVALID_INPUT
      );
    }
    await this.patchConfigurationSettings(context.businessId, {
      receipt: {
        receiptPrefix: parsed.data.receiptPrefix,
        receiptFooter: parsed.data.receiptFooter,
        showLogoOnReceipt: parsed.data.showLogoOnReceipt,
      },
      tax: {
        taxEnabled: parsed.data.taxEnabled,
        defaultTaxName: parsed.data.defaultTaxName.trim() || "VAT",
        defaultTaxRate: parsed.data.taxEnabled
          ? parsed.data.defaultTaxRate
          : "0",
      },
    });
    return this.markStepComplete(context, SETUP_STEPS.BUSINESS_OPERATIONS);
  }

  /** @deprecated Prefer saveBusinessOperations — retained for compatibility. */
  async saveAiToggle(
    context: CurrentBusinessContext,
    payload: FeatureTogglePayload
  ): Promise<SetupProgressView> {
    const parsed = featureToggleSchema.safeParse(payload);
    if (!parsed.success) {
      throw new SetupError(
        SETUP_ERROR_CODES.INVALID_INPUT,
        parsed.error.issues[0]?.message ?? SETUP_USER_MESSAGES.INVALID_INPUT
      );
    }
    const current =
      (await this.configurationRepository.findSettingsByBusinessId(
        context.businessId
      )) ?? createDefaultConfigurationSettings();
    await this.patchConfigurationSettings(context.businessId, {
      features: {
        aiAssistantEnabled: parsed.data.enabled,
        loyaltyProgrammeEnabled: current.features.loyaltyProgrammeEnabled,
      },
    });
    return this.markStepComplete(context, SETUP_STEPS.BUSINESS_OPERATIONS);
  }

  /** @deprecated Prefer saveBusinessOperations — retained for compatibility. */
  async saveLoyaltyToggle(
    context: CurrentBusinessContext,
    payload: FeatureTogglePayload
  ): Promise<SetupProgressView> {
    const parsed = featureToggleSchema.safeParse(payload);
    if (!parsed.success) {
      throw new SetupError(
        SETUP_ERROR_CODES.INVALID_INPUT,
        parsed.error.issues[0]?.message ?? SETUP_USER_MESSAGES.INVALID_INPUT
      );
    }
    const current =
      (await this.configurationRepository.findSettingsByBusinessId(
        context.businessId
      )) ?? createDefaultConfigurationSettings();
    await this.patchConfigurationSettings(context.businessId, {
      features: {
        aiAssistantEnabled: current.features.aiAssistantEnabled,
        loyaltyProgrammeEnabled: parsed.data.enabled,
      },
    });
    return this.markStepComplete(context, SETUP_STEPS.BUSINESS_OPERATIONS);
  }

  /**
   * WHAT: Persist branch structure (default Head Office or multiple branches).
   * WHY: FR-005 — every business needs at least one operating location.
   */
  async saveBranchSetup(
    context: CurrentBusinessContext,
    payload: BranchSetupPayload
  ): Promise<SetupProgressView> {
    return withSetupStepTiming("Step 8 - Save Branch Setup", async () => {
      const businessRow = await this.requireEditableBusiness(context.businessId);
      const parsed = branchSetupSchema.safeParse(payload);

      if (!parsed.success) {
        throw new SetupError(
          SETUP_ERROR_CODES.INVALID_INPUT,
          parsed.error.issues[0]?.message ?? SETUP_USER_MESSAGES.INVALID_INPUT
        );
      }

      const profile = await this.getProfile(context.businessId);
      const db = getDb();

      let branchRows = parsed.data.branches;

      if (!parsed.data.hasMultipleBranches) {
        const defaultName = "Head Office";
        branchRows = [
          {
            name: defaultName,
            code: buildBranchCodeCandidate(defaultName),
            branchType: BRANCH_TYPES.HEAD_OFFICE,
            physicalAddress:
              profile?.physicalAddress ?? `${businessRow.name} Head Office`,
            county: profile?.county ?? "Nairobi",
            city: profile?.city ?? "Nairobi",
            contactPhone: businessRow.phoneNumber,
            email: profile?.email ?? "",
            gpsLatitude: profile?.gpsLatitude
              ? String(profile.gpsLatitude)
              : "",
            gpsLongitude: profile?.gpsLongitude
              ? String(profile.gpsLongitude)
              : "",
            openingDate: "",
            isHeadOffice: true,
            isDefault: true,
          },
        ];
      }

      if (branchRows.length === 0) {
        throw new SetupError(
          SETUP_ERROR_CODES.BRANCH_REQUIRED,
          SETUP_USER_MESSAGES.BRANCH_REQUIRED
        );
      }

      const codes = new Set<string>();
      const normalized = [];

      for (let index = 0; index < branchRows.length; index += 1) {
        const item = branchRows[index];
        let code = item.code.trim().toUpperCase();

        if (!code) {
          code = buildBranchCodeCandidate(item.name);
        }

        if (codes.has(code)) {
          code = `${code.slice(0, 24)}-${randomBytes(2).toString("hex").toUpperCase()}`;
        }

        codes.add(code);

        let phoneE164: string;
        try {
          phoneE164 = normalizeMobileNumber(
            item.contactPhone,
            businessRow.countryCode
          );
        } catch {
          throw new SetupError(
            SETUP_ERROR_CODES.INVALID_INPUT,
            "Enter a valid branch contact phone for the operating country."
          );
        }

        normalized.push({
          businessId: context.businessId,
          code,
          name: item.name.trim(),
          branchType: item.branchType,
          physicalAddress: item.physicalAddress.trim(),
          county: item.county.trim(),
          city: item.city.trim(),
          contactPhone: phoneE164,
          email: item.email?.trim() || null,
          gpsLatitude: item.gpsLatitude || null,
          gpsLongitude: item.gpsLongitude || null,
          openingDate: item.openingDate || null,
          isActive: true,
          isHeadOffice:
            item.isHeadOffice === true ||
            (!parsed.data.hasMultipleBranches && index === 0) ||
            (parsed.data.hasMultipleBranches &&
              index === 0 &&
              !branchRows.some((row) => row.isHeadOffice)),
          isDefault:
            item.isDefault === true ||
            (!parsed.data.hasMultipleBranches && index === 0) ||
            (parsed.data.hasMultipleBranches &&
              index === 0 &&
              !branchRows.some((row) => row.isDefault)),
        });
      }

      // Ensure exactly one head office / default when multiple flags set.
      const headIndex = normalized.findIndex((row) => row.isHeadOffice);
      const defaultIndex = normalized.findIndex((row) => row.isDefault);
      normalized.forEach((row, index) => {
        row.isHeadOffice = index === (headIndex >= 0 ? headIndex : 0);
        row.isDefault = index === (defaultIndex >= 0 ? defaultIndex : 0);
      });

      await this.branchRepository.replaceBusinessBranches(
        context.businessId,
        normalized,
        db
      );

      return this.markStepComplete(context, SETUP_STEPS.BRANCH_SETUP);
    });
  }

  /**
   * WHAT: Optionally provision employees with roles and temporary passwords.
   * WHY: FR-006 — owners may hire during onboarding; first-login is reused.
   */
  async saveEmployeeSetup(
    context: CurrentBusinessContext,
    payload: EmployeeSetupPayload
  ): Promise<{
    progress: SetupProgressView;
    credentials: CreatedEmployeeCredential[];
  }> {
    return withSetupStepTiming("Step 9 - Save Employee Setup", async () => {
      const businessRow = await this.requireEditableBusiness(context.businessId);
      const parsed = employeeSetupSchema.safeParse(payload);

      if (!parsed.success) {
        throw new SetupError(
          SETUP_ERROR_CODES.INVALID_INPUT,
          parsed.error.issues[0]?.message ?? SETUP_USER_MESSAGES.INVALID_INPUT
        );
      }

      if (parsed.data.skip) {
        const progress = await this.markStepComplete(
          context,
          SETUP_STEPS.EMPLOYEE_SETUP
        );
        return { progress, credentials: [] };
      }

      const branches = await this.branchRepository.listByBusinessId(
        context.businessId
      );

      if (branches.length === 0) {
        throw new SetupError(
          SETUP_ERROR_CODES.BRANCH_REQUIRED,
          SETUP_USER_MESSAGES.BRANCH_REQUIRED
        );
      }

      const branchIds = new Set(branches.map((row) => row.id));
      const credentials: CreatedEmployeeCredential[] = [];
      const roleAssignmentService = createRoleAssignmentService();
      const db = getDb();

      for (const employee of parsed.data.employees) {
        if (!branchIds.has(employee.branchId)) {
          throw new SetupError(
            SETUP_ERROR_CODES.INVALID_INPUT,
            "Select a valid branch for each employee."
          );
        }

        if (
          !EMPLOYEE_SETUP_ROLE_CODES.includes(employee.platformRoleCode)
        ) {
          throw new SetupError(
            SETUP_ERROR_CODES.INVALID_INPUT,
            "Select a valid platform role."
          );
        }

        let phoneE164: string;
        try {
          phoneE164 = normalizeMobileNumber(
            employee.mobileNumber,
            businessRow.countryCode
          );
        } catch {
          throw new SetupError(
            SETUP_ERROR_CODES.INVALID_INPUT,
            "Enter a valid mobile number for each employee."
          );
        }

        await this.assertPhoneAvailable(phoneE164, db);

        const temporaryPassword = generateTemporaryPassword();
        const passwordHash = await hashPassword(temporaryPassword);

        const created = await db.transaction(async (tx) => {
          const [user] = await tx
            .insert(platformUser)
            .values({
              firstName: employee.firstName.trim(),
              lastName: employee.lastName.trim(),
              displayName: `${employee.firstName.trim()} ${employee.lastName.trim()}`,
              email: employee.email?.trim() || null,
              phoneNumber: phoneE164,
              isActive: true,
            })
            .returning({ id: platformUser.id });

          await tx.insert(userSecurityProfile).values({
            platformUserId: user.id,
            passwordHash,
            mustChangePassword: true,
          });

          const [membership] = await tx
            .insert(businessMembership)
            .values({
              businessId: context.businessId,
              platformUserId: user.id,
              status: BUSINESS_MEMBERSHIP_STATUS.ACTIVE,
              isPrimary: false,
            })
            .returning({ id: businessMembership.id });

          await roleAssignmentService.assignPlatformRole(
            membership.id,
            employee.platformRoleCode,
            context.platformUserId,
            "Business Setup — Employee provisioning",
            tx
          );

          const employeeId = await this.employeeRepository.insert(
            {
              businessId: context.businessId,
              platformUserId: user.id,
              businessMembershipId: membership.id,
              branchId: employee.branchId,
              jobTitle: employee.jobTitle.trim(),
              isActive: true,
            },
            tx
          );

          return {
            employeeId,
            fullName: `${employee.firstName.trim()} ${employee.lastName.trim()}`,
            mobileNumber: phoneE164,
            temporaryPassword,
          };
        });

        credentials.push(created);
      }

      const progress = await this.markStepComplete(
        context,
        SETUP_STEPS.EMPLOYEE_SETUP
      );

      return { progress, credentials };
    });
  }

  async completeReview(
    context: CurrentBusinessContext
  ): Promise<SetupProgressView> {
    return withSetupStepTiming("Step 10 - Complete Review", async () => {
      await this.requireDraftBusiness(context.businessId);

      const profile = await this.getOnboardingProfile(context.businessId);
      const progress = await this.progressRepository.ensureProgress(
        context.businessId
      );
      const completedSteps = uniqueSteps(progress.completedSteps as string[]);

      const mandatoryExceptReview = getMandatoryStepsForProfile(profile).filter(
        (step) => step !== SETUP_STEPS.REVIEW
      );
      const missing = mandatoryExceptReview.filter(
        (step) => !completedSteps.includes(step)
      );

      if (missing.length > 0) {
        throw new SetupError(
          SETUP_ERROR_CODES.MANDATORY_INCOMPLETE,
          SETUP_USER_MESSAGES.MANDATORY_INCOMPLETE
        );
      }

      return this.markStepComplete(context, SETUP_STEPS.REVIEW);
    });
  }

  /**
   * WHAT: Transition business DRAFT → ACTIVE after mandatory setup.
   * WHY: BR-008 / BR-012 — activation is the final IP-006 step.
   */
  async activateBusiness(
    context: CurrentBusinessContext
  ): Promise<{ businessName: string }> {
    return withSetupStepTiming("Step 10 - Activate Business", async () => {
      const businessRow = await this.requireDraftBusiness(context.businessId);
      const progress = await this.progressRepository.ensureProgress(
        context.businessId
      );
      const profile = await this.getOnboardingProfile(context.businessId);
      const completedSteps = uniqueSteps(progress.completedSteps as string[]);

      if (!areMandatoryStepsComplete(completedSteps, profile)) {
        throw new SetupError(
          SETUP_ERROR_CODES.MANDATORY_INCOMPLETE,
          SETUP_USER_MESSAGES.MANDATORY_INCOMPLETE
        );
      }

      // Enterprise/Standard require explicit base-currency completion;
      // Express seeds currency from country and may auto-mark the step.
      if (
        profile !== ONBOARDING_PROFILES.EXPRESS &&
        !completedSteps.includes(SETUP_STEPS.BASE_CURRENCY)
      ) {
        throw new SetupError(
          SETUP_ERROR_CODES.BASE_CURRENCY_REQUIRED,
          SETUP_USER_MESSAGES.BASE_CURRENCY_REQUIRED
        );
      }

      const branches = await this.branchRepository.listByBusinessId(
        context.businessId
      );

      if (branches.length === 0) {
        throw new SetupError(
          SETUP_ERROR_CODES.BRANCH_REQUIRED,
          SETUP_USER_MESSAGES.BRANCH_REQUIRED
        );
      }

      const db = getDb();
      const activatedAt = new Date();

      await db.transaction(async (tx) => {
        await tx
          .update(business)
          .set({
            statusCode: BUSINESS_STATUS.ACTIVE,
            updatedAt: new Date(),
          })
          .where(eq(business.id, context.businessId));
      });

      await this.progressRepository.markActivated({
        businessId: context.businessId,
        completedSteps: [...SETUP_STEP_ORDER],
        completedBy: context.platformUserId,
        activatedAt,
      });

      return { businessName: businessRow.name };
    });
  }

  /**
   * WHAT: Lightweight country read for setup catalog (every wizard step).
   * WHY: Avoid getReviewSummary joins on every step load — those failures bounced Open Business to /home.
   */
  async getBusinessCountryCode(businessId: string): Promise<string> {
    const row = await this.requireDraftOrActiveBusiness(businessId);
    return row.countryCode ?? "";
  }

  async getReviewSummary(
    context: CurrentBusinessContext
  ): Promise<SetupReviewSummary> {
    const db = getDb();

    const [businessRow] = await db
      .select({
        name: business.name,
        countryCode: business.countryCode,
        countryName: country.name,
        industryName: industry.name,
        businessTypeName: businessType.name,
      })
      .from(business)
      .innerJoin(country, eq(business.countryCode, country.code))
      .innerJoin(businessType, eq(business.businessTypeId, businessType.id))
      .innerJoin(industry, eq(businessType.industryId, industry.id))
      .where(eq(business.id, context.businessId))
      .limit(1);

    if (!businessRow) {
      throw new SetupError(
        SETUP_ERROR_CODES.BUSINESS_CONTEXT_REQUIRED,
        SETUP_USER_MESSAGES.BUSINESS_CONTEXT_REQUIRED,
        403
      );
    }

    const [profile] = await db
      .select()
      .from(businessProfile)
      .where(eq(businessProfile.businessId, context.businessId))
      .limit(1);

    const currencies = await db
      .select({
        currencyCode: businessOperatingCurrency.currencyCode,
        isBase: businessOperatingCurrency.isBase,
      })
      .from(businessOperatingCurrency)
      .where(eq(businessOperatingCurrency.businessId, context.businessId));

    const branches = await this.branchRepository.listByBusinessId(
      context.businessId
    );
    const employees = await this.employeeRepository.listReviewRows(
      context.businessId
    );

    const view = await this.getConfiguration(context.businessId);
    const base = currencies.find((row) => row.isBase);

    return {
      businessName: businessRow.name,
      tradingName: profile?.tradingName ?? businessRow.name,
      industryName: businessRow.industryName,
      businessTypeName: businessRow.businessTypeName,
      email: profile?.email ?? "",
      physicalAddress: profile?.physicalAddress ?? "",
      county: profile?.county ?? "",
      city: profile?.city ?? "",
      countryCode: businessRow.countryCode,
      countryName: businessRow.countryName,
      baseCurrencyCode: base?.currencyCode ?? "",
      additionalCurrencyCodes: currencies
        .filter((row) => !row.isBase)
        .map((row) => row.currencyCode),
      branches: branches.map((row) => ({
        name: row.name,
        code: row.code,
        branchType: row.branchType,
        city: row.city,
        isHeadOffice: row.isHeadOffice,
      })),
      employees: employees.map((row) => ({
        fullName: `${row.firstName} ${row.lastName}`,
        jobTitle: row.jobTitle,
        branchName: row.branchName,
        roleName: row.roleName,
      })),
      paymentMethods: {
        cashEnabled: view?.cashEnabled ?? true,
        mobileMoneyEnabled: view?.mobileMoneyEnabled ?? true,
        bankTransferEnabled: view?.bankTransferEnabled ?? false,
        cardEnabled: view?.cardEnabled ?? false,
        creditSalesEnabled: view?.creditSalesEnabled ?? false,
      },
      receipt: {
        receiptPrefix: view?.receiptPrefix ?? "RCPT",
        receiptFooter: view?.receiptFooter ?? "",
        showLogoOnReceipt: view?.showLogoOnReceipt ?? true,
        taxEnabled: view?.taxEnabled ?? false,
        defaultTaxName: view?.defaultTaxName ?? "VAT",
        defaultTaxRate: view?.defaultTaxRate ?? "0",
      },
      aiAssistantEnabled: view?.aiAssistantEnabled ?? false,
      loyaltyProgrammeEnabled: view?.loyaltyProgrammeEnabled ?? false,
    };
  }

  /**
   * WHAT: Assemble the operational Business Dashboard for an ACTIVE business.
   * WHY: /dashboard is where owners run the business — not the activation welcome.
   */
  async getBusinessDashboard(
    context: CurrentBusinessContext,
    options: {
      greetingName: string;
      businessName: string;
      roleLabel: string;
      canSwitchBusiness: boolean;
    }
  ): Promise<BusinessDashboardView> {
    const progress = await this.getSetupProgress(context);
    const review = await this.getReviewSummary(context);
    const onboardingProfile = await this.getOnboardingProfile(
      context.businessId
    );
    const profileDefinition = getOnboardingProfileDefinition(onboardingProfile);

    const hasReceiptBranding = Boolean(
      review.receipt.receiptFooter?.trim() ||
        (review.receipt.receiptPrefix &&
          review.receipt.receiptPrefix !== "RCPT")
    );

    const completionById: Record<string, boolean> = {
      profile: Boolean(review.tradingName?.trim() || review.businessName.trim()),
      classification: Boolean(review.industryName && review.businessTypeName),
      country: Boolean(review.countryName),
      currency: Boolean(review.baseCurrencyCode),
      branches: review.branches.length > 0,
      employees: review.employees.length > 0,
      tax: review.receipt.taxEnabled,
      receipts: hasReceiptBranding,
      ai: review.aiAssistantEnabled,
      loyalty: review.loyaltyProgrammeEnabled,
    };

    const configurationCompleted: BusinessDashboardView["configurationCompleted"] =
      [];
    const configurationRemaining: BusinessDashboardView["configurationRemaining"] =
      [];

    for (const item of DASHBOARD_CONFIGURATION_ITEMS) {
      const done = completionById[item.id] ?? false;
      if (done) {
        configurationCompleted.push(item);
      } else {
        configurationRemaining.push(item);
      }
    }

    const profileCompletionPercent = Math.round(
      (configurationCompleted.length /
        Math.max(DASHBOARD_CONFIGURATION_ITEMS.length, 1)) *
        100
    );

    const expressProductsHint =
      profileDefinition.postActivationCta === "products"
        ? " Add Products & Services next to start selling."
        : "";

    return {
      greetingName: options.greetingName,
      businessName: options.businessName || review.businessName || progress.businessName,
      roleLabel: options.roleLabel,
      businessStatusCode: progress.businessStatusCode,
      canSwitchBusiness: options.canSwitchBusiness,
      industryName: review.industryName,
      businessTypeName: review.businessTypeName,
      countryName: review.countryName,
      baseCurrencyCode: review.baseCurrencyCode || "—",
      branchCount: review.branches.length,
      employeeCount: review.employees.length,
      onboardingProfile,
      postActivationCta: profileDefinition.postActivationCta,
      profileCompletionPercent,
      configurationCompleted,
      configurationRemaining,
      notifications: [
        {
          id: "welcome",
          title: `Welcome to ${review.businessName || progress.businessName}`,
          body: `Your business is active. Use this dashboard to run day-to-day operations.${expressProductsHint} Manage your businesses from Platform Home.`,
        },
        {
          id: "future-notifications",
          title: "Platform notifications",
          body: "Operational alerts and announcements will appear here in future Build Packs.",
        },
      ],
    };
  }

  async getDefaultCurrencyForBusiness(
    businessId: string
  ): Promise<{
    currencyCode: string;
    currencyName: string;
    symbol: string;
    decimalPlaces: number;
  } | null> {
    const db = getDb();

    const [row] = await db
      .select({
        currencyCode: country.currencyCode,
        currencyName: currency.name,
        symbol: currency.symbol,
        decimalPlaces: currency.decimalPlaces,
      })
      .from(business)
      .innerJoin(country, eq(business.countryCode, country.code))
      .innerJoin(currency, eq(country.currencyCode, currency.code))
      .where(eq(business.id, businessId))
      .limit(1);

    return row ?? null;
  }

  async getBusinessCurrencies(businessId: string) {
    const db = getDb();

    return db
      .select({
        currencyCode: businessOperatingCurrency.currencyCode,
        isBase: businessOperatingCurrency.isBase,
        name: currency.name,
        symbol: currency.symbol,
        decimalPlaces: currency.decimalPlaces,
      })
      .from(businessOperatingCurrency)
      .innerJoin(
        currency,
        eq(businessOperatingCurrency.currencyCode, currency.code)
      )
      .where(eq(businessOperatingCurrency.businessId, businessId))
      .orderBy(asc(currency.displayOrder), asc(currency.name));
  }

  async getProfile(businessId: string) {
    const db = getDb();
    const [row] = await db
      .select()
      .from(businessProfile)
      .where(eq(businessProfile.businessId, businessId))
      .limit(1);

    return row ?? null;
  }

  async getClassification(businessId: string) {
    const db = getDb();
    const [row] = await db
      .select({
        industryId: industry.id,
        industryName: industry.name,
        businessTypeId: businessType.id,
        businessTypeName: businessType.name,
      })
      .from(business)
      .innerJoin(businessType, eq(business.businessTypeId, businessType.id))
      .innerJoin(industry, eq(businessType.industryId, industry.id))
      .where(eq(business.id, businessId))
      .limit(1);

    return row ?? null;
  }

  async listBranches(businessId: string) {
    return this.branchRepository.listByBusinessId(businessId);
  }

  /**
   * WHAT: Return flattened configuration for UI/review.
   * WHY: Presentation stays free of nested settings navigation.
   */
  async getConfiguration(
    businessId: string
  ): Promise<BusinessConfigurationView | null> {
    const settings =
      await this.configurationRepository.findSettingsByBusinessId(businessId);

    if (!settings) {
      return null;
    }

    return toConfigurationView(settings);
  }

  private async markStepComplete(
    context: CurrentBusinessContext,
    step: SetupStep
  ): Promise<SetupProgressView> {
    const businessStatus = await this.requireDraftOrActiveBusiness(
      context.businessId
    );

    // Maintenance saves on ACTIVE businesses must not mutate wizard progress.
    if (businessStatus.statusCode === BUSINESS_STATUS.ACTIVE) {
      return this.getSetupProgress(context);
    }

    const progress = await this.progressRepository.ensureProgress(
      context.businessId
    );
    console.info("[setup] progress.loaded", {
      businessId: context.businessId,
      step,
      completedSteps: progress.completedSteps,
      currentStep: progress.currentStep,
    });

    const profile = await this.getOnboardingProfile(context.businessId);
    const applied = applyCompletedStep(
      progress.completedSteps as string[],
      step,
      profile
    );
    const completedAt = new Date();

    console.info("[setup] transaction.start", {
      businessId: context.businessId,
      step,
      profile,
      nextResumeStep: applied.resumeStep,
      nextCompletedSteps: applied.completedSteps,
    });

    try {
      await this.progressRepository.saveStepProgress({
        businessId: context.businessId,
        currentStep: applied.resumeStep,
        lastCompletedStep: applied.lastCompletedStep,
        completedSteps: applied.completedSteps,
        completedBy: context.platformUserId,
        completedAt,
      });
    } catch (error) {
      console.error("[setup] transaction.failed", {
        businessId: context.businessId,
        step,
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        query:
          error && typeof error === "object" && "query" in error
            ? (error as { query?: unknown }).query
            : undefined,
      });
      throw error;
    }

    console.info("[setup] transaction.complete", {
      businessId: context.businessId,
      step,
      resumeStep: applied.resumeStep,
    });

    const [businessRow] = await getDb()
      .select({
        id: business.id,
        name: business.name,
        statusCode: business.statusCode,
      })
      .from(business)
      .where(eq(business.id, context.businessId))
      .limit(1);

    if (!businessRow) {
      throw new SetupError(
        SETUP_ERROR_CODES.BUSINESS_CONTEXT_REQUIRED,
        SETUP_USER_MESSAGES.BUSINESS_CONTEXT_REQUIRED,
        403
      );
    }

    return {
      businessId: businessRow.id,
      businessName: businessRow.name,
      businessStatusCode: businessRow.statusCode,
      currentStep: applied.resumeStep,
      lastCompletedStep: applied.lastCompletedStep,
      completedSteps: applied.completedSteps,
      resumeStep: applied.resumeStep,
      progressPercent: applied.progressPercent,
      isActivated: false,
      wizardVersion: SETUP_WIZARD_VERSION,
      onboardingProfile: profile,
    };
  }

  private async patchConfigurationSettings(
    businessId: string,
    patch: Partial<BusinessConfigurationSettings>
  ): Promise<void> {
    const current =
      (await this.configurationRepository.findSettingsByBusinessId(
        businessId
      )) ?? createDefaultConfigurationSettings();

    const merged = mergeConfigurationSettings(current, patch);
    await this.configurationRepository.upsertSettings(businessId, merged);
  }

  private async requireDraftBusiness(businessId: string) {
    const row = await this.requireDraftOrActiveBusiness(businessId);

    if (row.statusCode !== BUSINESS_STATUS.DRAFT) {
      throw new SetupError(
        SETUP_ERROR_CODES.BUSINESS_NOT_DRAFT,
        SETUP_USER_MESSAGES.BUSINESS_NOT_DRAFT
      );
    }

    return row;
  }

  /**
   * WHAT: Allow setup step saves during DRAFT onboarding or ACTIVE maintenance.
   * WHY: Business Settings reuses the same setup forms after activation.
   */
  private async requireEditableBusiness(businessId: string) {
    const row = await this.requireDraftOrActiveBusiness(businessId);

    if (
      row.statusCode !== BUSINESS_STATUS.DRAFT &&
      row.statusCode !== BUSINESS_STATUS.ACTIVE
    ) {
      throw new SetupError(
        SETUP_ERROR_CODES.BUSINESS_NOT_DRAFT,
        SETUP_USER_MESSAGES.BUSINESS_NOT_DRAFT
      );
    }

    return row;
  }

  private async requireDraftOrActiveBusiness(businessId: string) {
    const db = getDb();
    const [row] = await db
      .select({
        id: business.id,
        name: business.name,
        statusCode: business.statusCode,
        countryCode: business.countryCode,
        phoneNumber: business.phoneNumber,
      })
      .from(business)
      .where(eq(business.id, businessId))
      .limit(1);

    if (!row) {
      throw new SetupError(
        SETUP_ERROR_CODES.BUSINESS_CONTEXT_REQUIRED,
        SETUP_USER_MESSAGES.BUSINESS_CONTEXT_REQUIRED,
        403
      );
    }

    return row;
  }

  private async assertCountrySelected(businessId: string) {
    const db = getDb();
    const [row] = await db
      .select({ countryCode: business.countryCode })
      .from(business)
      .where(eq(business.id, businessId))
      .limit(1);

    if (!row?.countryCode) {
      throw new SetupError(
        SETUP_ERROR_CODES.COUNTRY_REQUIRED,
        SETUP_USER_MESSAGES.COUNTRY_REQUIRED
      );
    }
  }

  private async loadActiveCountry(countryCode: string) {
    const db = getDb();
    const [row] = await db
      .select({
        code: country.code,
        currencyCode: country.currencyCode,
        timezoneCode: country.timezoneCode,
      })
      .from(country)
      .where(and(eq(country.code, countryCode), eq(country.isActive, true)))
      .limit(1);

    if (!row) {
      throw new SetupError(
        SETUP_ERROR_CODES.INVALID_INPUT,
        "Select a valid country."
      );
    }

    return row;
  }

  /**
   * WHAT: Confirm a currency exists and is active.
   * WHY: Must never run nested getDb() queries inside an open max:1 transaction.
   */
  private async assertActiveCurrency(
    currencyCode: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select({ code: currency.code })
      .from(currency)
      .where(and(eq(currency.code, currencyCode), eq(currency.isActive, true)))
      .limit(1);

    if (!row) {
      throw new SetupError(
        SETUP_ERROR_CODES.INVALID_INPUT,
        "Select a valid currency."
      );
    }
  }

  private async assertIndustryActive(industryId: string) {
    const db = getDb();
    const [row] = await db
      .select({ id: industry.id })
      .from(industry)
      .where(and(eq(industry.id, industryId), eq(industry.isActive, true)))
      .limit(1);

    if (!row) {
      throw new SetupError(
        SETUP_ERROR_CODES.INVALID_INPUT,
        "Select a valid industry."
      );
    }
  }

  private async assertTemplateBelongsToIndustry(
    businessTypeId: string,
    industryId: string
  ) {
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
      throw new SetupError(
        SETUP_ERROR_CODES.INVALID_INPUT,
        "Select a business type that belongs to the selected industry."
      );
    }
  }

  private async assertPhoneAvailable(
    phoneNumberE164: string,
    dbClient: DbClient = getDb()
  ) {
    const [existing] = await dbClient
      .select({ id: platformUser.id })
      .from(platformUser)
      .where(eq(platformUser.phoneNumber, phoneNumberE164))
      .limit(1);

    if (existing) {
      throw new SetupError(
        SETUP_ERROR_CODES.DUPLICATE_PHONE,
        SETUP_USER_MESSAGES.DUPLICATE_PHONE
      );
    }
  }
}

export function createBusinessSetupService(): BusinessSetupService {
  return new BusinessSetupService();
}
