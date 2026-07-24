/**
 * ============================================================================
 * Service: BusinessSetupService
 * ============================================================================
 *
 * Purpose
 * --------
 * Orchestrates the Business Activation & Configuration Wizard: step progress,
 * profile and configuration persistence, and DRAFT → ACTIVE activation.
 *
 * WHY
 * ---
 * Newly registered businesses remain DRAFT until mandatory setup completes.
 * This service is the single owner of IP-006 business rules.
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
 * IP-006 – Business Activation & Configuration Wizard
 *
 * Responsibilities
 * ----------------
 * • Initialize and resume setup progress
 * • Save mandatory and optional wizard steps
 * • Enforce country-before-currency and single base currency rules
 * • Activate business when mandatory steps are complete
 *
 * Does NOT
 * --------
 * • Authenticate users (AuthService)
 * • Sign business context cookies (BusinessContextService)
 * • Implement detailed tax catalogues
 *
 * ============================================================================
 */

import { and, asc, eq, ne } from "drizzle-orm";

import { BUSINESS_STATUS } from "@/core/auth/constants";
import type { CurrentBusinessContext } from "@/core/auth/types";
import { getDb } from "@/db/client";
import { business } from "@/db/schema/business";
import { businessOperatingCurrency } from "@/db/schema/business-operating-currency";
import { businessProfile } from "@/db/schema/business-profile";
import { country } from "@/db/schema/country";
import { currency } from "@/db/schema/currency";
import {
  MANDATORY_SETUP_STEPS,
  OPTIONAL_SETUP_STEPS,
  SETUP_STEP_ORDER,
  SETUP_STEPS,
  SETUP_WIZARD_VERSION,
  type SetupStep,
} from "@/modules/business/onboarding/constants";
import {
  SETUP_ERROR_CODES,
  SETUP_USER_MESSAGES,
  SetupError,
} from "@/modules/business/onboarding/errors";
import {
  createBusinessConfigurationRepository,
  type BusinessConfigurationRepository,
} from "@/modules/business/onboarding/repositories/business-configuration-repository";
import {
  createBusinessSetupProgressRepository,
  type BusinessSetupProgressRepository,
} from "@/modules/business/onboarding/repositories/business-setup-progress-repository";
import {
  applyCompletedStep,
  areMandatoryStepsComplete,
  calculateProgressPercent,
  createDefaultConfigurationSettings,
  hasDuplicateOperatingCurrency,
  isSetupStep,
  mergeConfigurationSettings,
  resolveResumeStep,
  toConfigurationView,
  uniqueSteps,
} from "@/modules/business/onboarding/services/setup-rules";
import type {
  AdditionalCurrenciesPayload,
  BaseCurrencyPayload,
  BusinessConfigurationSettings,
  BusinessConfigurationView,
  BusinessDetailsPayload,
  CountryStepPayload,
  FeatureTogglePayload,
  PaymentMethodsPayload,
  ReceiptConfigurationPayload,
  SetupProgressView,
  SetupReviewSummary,
} from "@/modules/business/onboarding/types";
import {
  additionalCurrenciesSchema,
  baseCurrencySchema,
  businessDetailsSchema,
  countryStepSchema,
  featureToggleSchema,
  paymentMethodsSchema,
  receiptConfigurationSchema,
} from "@/modules/business/onboarding/validators/setup-validators";

export class BusinessSetupService {
  constructor(
    private readonly configurationRepository: BusinessConfigurationRepository = createBusinessConfigurationRepository(),
    private readonly progressRepository: BusinessSetupProgressRepository = createBusinessSetupProgressRepository()
  ) {}

  /**
   * WHAT: Return resume-oriented setup progress for the current business.
   * WHY: FR-005 / BR-009 — owners continue from the last incomplete step.
   */
  async getSetupProgress(
    context: CurrentBusinessContext
  ): Promise<SetupProgressView> {
    const businessRow = await this.requireDraftOrActiveBusiness(context.businessId);

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
      };
    }

    const progress = await this.progressRepository.ensureProgress(
      context.businessId
    );
    const completedSteps = uniqueSteps(progress.completedSteps as string[]);
    const resumeStep = resolveResumeStep(completedSteps);

    return {
      businessId: businessRow.id,
      businessName: businessRow.name,
      businessStatusCode: businessRow.statusCode,
      currentStep: isSetupStep(progress.currentStep)
        ? progress.currentStep
        : resumeStep,
      lastCompletedStep:
        progress.lastCompletedStep && isSetupStep(progress.lastCompletedStep)
          ? progress.lastCompletedStep
          : null,
      completedSteps,
      resumeStep,
      progressPercent: calculateProgressPercent(completedSteps),
      isActivated: false,
      wizardVersion: progress.wizardVersion || SETUP_WIZARD_VERSION,
    };
  }

  async completeWelcome(
    context: CurrentBusinessContext
  ): Promise<SetupProgressView> {
    await this.requireDraftBusiness(context.businessId);
    return this.markStepComplete(context, SETUP_STEPS.WELCOME);
  }

  /**
   * WHAT: Persist remaining business profile fields.
   * WHY: Registration already captured identity essentials; this completes profile.
   */
  async saveBusinessDetails(
    context: CurrentBusinessContext,
    payload: BusinessDetailsPayload
  ): Promise<SetupProgressView> {
    await this.requireDraftBusiness(context.businessId);

    const parsed = businessDetailsSchema.safeParse(payload);

    if (!parsed.success) {
      throw new SetupError(
        SETUP_ERROR_CODES.INVALID_INPUT,
        parsed.error.issues[0]?.message ?? SETUP_USER_MESSAGES.INVALID_INPUT
      );
    }

    const data = parsed.data;
    const db = getDb();
    const [businessRow] = await db
      .select({ name: business.name })
      .from(business)
      .where(eq(business.id, context.businessId))
      .limit(1);

    // Trading name defaults to legal name when blank (IP-006 clarification).
    const tradingName =
      data.tradingName && data.tradingName.trim().length > 0
        ? data.tradingName.trim()
        : businessRow.name;

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

    return this.markStepComplete(context, SETUP_STEPS.BUSINESS_DETAILS);
  }

  /**
   * WHAT: Persist editable country and seed default base currency.
   * WHY: BR-001/BR-002 — country precedes currency; country drives default currency.
   */
  async saveCountry(
    context: CurrentBusinessContext,
    payload: CountryStepPayload
  ): Promise<SetupProgressView> {
    await this.requireDraftBusiness(context.businessId);

    const parsed = countryStepSchema.safeParse(payload);

    if (!parsed.success) {
      throw new SetupError(
        SETUP_ERROR_CODES.INVALID_INPUT,
        parsed.error.issues[0]?.message ?? SETUP_USER_MESSAGES.INVALID_INPUT
      );
    }

    const countryRow = await this.loadActiveCountry(parsed.data.countryCode);
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

      await this.assertActiveCurrency(countryRow.currencyCode);

      await tx.insert(businessOperatingCurrency).values({
        businessId: context.businessId,
        currencyCode: countryRow.currencyCode,
        isBase: true,
      });
    });

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

    const completedAt = new Date();

    await this.progressRepository.replaceProgress({
      businessId: context.businessId,
      currentStep: SETUP_STEPS.BASE_CURRENCY,
      completedSteps: priorSteps,
      lastCompletedStep: SETUP_STEPS.COUNTRY,
      completedBy: context.platformUserId,
      completedAt,
    });

    return this.getSetupProgress(context);
  }

  /**
   * WHAT: Persist exactly one base operating currency.
   * WHY: BR-004 — base currency is mandatory before activation.
   */
  async saveBaseCurrency(
    context: CurrentBusinessContext,
    payload: BaseCurrencyPayload
  ): Promise<SetupProgressView> {
    await this.requireDraftBusiness(context.businessId);
    await this.assertCountrySelected(context.businessId);

    const parsed = baseCurrencySchema.safeParse(payload);

    if (!parsed.success) {
      throw new SetupError(
        SETUP_ERROR_CODES.INVALID_INPUT,
        parsed.error.issues[0]?.message ?? SETUP_USER_MESSAGES.INVALID_INPUT
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
  }

  /**
   * WHAT: Persist optional additional operating currencies.
   * WHY: BR-003/BR-005 — multiple currencies allowed; duplicates rejected.
   */
  async saveAdditionalCurrencies(
    context: CurrentBusinessContext,
    payload: AdditionalCurrenciesPayload
  ): Promise<SetupProgressView> {
    await this.requireDraftBusiness(context.businessId);
    await this.assertCountrySelected(context.businessId);

    const parsed = additionalCurrenciesSchema.safeParse(payload);

    if (!parsed.success) {
      throw new SetupError(
        SETUP_ERROR_CODES.INVALID_INPUT,
        parsed.error.issues[0]?.message ?? SETUP_USER_MESSAGES.INVALID_INPUT
      );
    }

    const codes = [
      ...new Set(parsed.data.currencyCodes.map((code) => code.toUpperCase())),
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

    return this.markStepComplete(context, SETUP_STEPS.ADDITIONAL_CURRENCIES);
  }

  async skipOptionalStep(
    context: CurrentBusinessContext,
    step: SetupStep
  ): Promise<SetupProgressView> {
    await this.requireDraftBusiness(context.businessId);

    if (!OPTIONAL_SETUP_STEPS.includes(step)) {
      throw new SetupError(
        SETUP_ERROR_CODES.STEP_NOT_ALLOWED,
        "Only optional setup steps may be skipped."
      );
    }

    // BR-007 — optional steps may be skipped and completed later.
    return this.markStepComplete(context, step);
  }

  async savePaymentMethods(
    context: CurrentBusinessContext,
    payload: PaymentMethodsPayload
  ): Promise<SetupProgressView> {
    await this.requireDraftBusiness(context.businessId);

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

    return this.markStepComplete(context, SETUP_STEPS.PAYMENT_METHODS);
  }

  async saveReceiptConfiguration(
    context: CurrentBusinessContext,
    payload: ReceiptConfigurationPayload
  ): Promise<SetupProgressView> {
    await this.requireDraftBusiness(context.businessId);

    const parsed = receiptConfigurationSchema.safeParse(payload);

    if (!parsed.success) {
      throw new SetupError(
        SETUP_ERROR_CODES.INVALID_INPUT,
        parsed.error.issues[0]?.message ?? SETUP_USER_MESSAGES.INVALID_INPUT
      );
    }

    if (parsed.data.taxEnabled && Number(parsed.data.defaultTaxRate) <= 0) {
      throw new SetupError(
        SETUP_ERROR_CODES.INVALID_INPUT,
        "Enter a default tax rate greater than zero when tax is enabled."
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
        defaultTaxRate: parsed.data.defaultTaxRate,
      },
    });

    return this.markStepComplete(context, SETUP_STEPS.RECEIPT_CONFIGURATION);
  }

  async saveAiToggle(
    context: CurrentBusinessContext,
    payload: FeatureTogglePayload
  ): Promise<SetupProgressView> {
    await this.requireDraftBusiness(context.businessId);

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

    return this.markStepComplete(context, SETUP_STEPS.AI_TOGGLE);
  }

  async saveLoyaltyToggle(
    context: CurrentBusinessContext,
    payload: FeatureTogglePayload
  ): Promise<SetupProgressView> {
    await this.requireDraftBusiness(context.businessId);

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

    return this.markStepComplete(context, SETUP_STEPS.LOYALTY_TOGGLE);
  }

  async completeReview(
    context: CurrentBusinessContext
  ): Promise<SetupProgressView> {
    await this.requireDraftBusiness(context.businessId);

    const progress = await this.progressRepository.ensureProgress(
      context.businessId
    );
    const completedSteps = uniqueSteps(progress.completedSteps as string[]);

    const mandatoryExceptReview = MANDATORY_SETUP_STEPS.filter(
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
  }

  /**
   * WHAT: Transition business DRAFT → ACTIVE after mandatory setup.
   * WHY: BR-008 / BR-012 — activation is the final IP-006 step.
   */
  async activateBusiness(
    context: CurrentBusinessContext
  ): Promise<{ businessName: string }> {
    const businessRow = await this.requireDraftBusiness(context.businessId);
    const progress = await this.progressRepository.ensureProgress(
      context.businessId
    );
    const completedSteps = uniqueSteps(progress.completedSteps as string[]);

    if (!areMandatoryStepsComplete(completedSteps)) {
      throw new SetupError(
        SETUP_ERROR_CODES.MANDATORY_INCOMPLETE,
        SETUP_USER_MESSAGES.MANDATORY_INCOMPLETE
      );
    }

    if (!completedSteps.includes(SETUP_STEPS.BASE_CURRENCY)) {
      throw new SetupError(
        SETUP_ERROR_CODES.BASE_CURRENCY_REQUIRED,
        SETUP_USER_MESSAGES.BASE_CURRENCY_REQUIRED
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
      })
      .from(business)
      .innerJoin(country, eq(business.countryCode, country.code))
      .where(eq(business.id, context.businessId))
      .limit(1);

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

    const view = await this.getConfiguration(context.businessId);
    const base = currencies.find((row) => row.isBase);

    return {
      businessName: businessRow.name,
      tradingName: profile?.tradingName ?? businessRow.name,
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
        defaultTaxRate: view?.defaultTaxRate ?? "0",
      },
      aiAssistantEnabled: view?.aiAssistantEnabled ?? false,
      loyaltyProgrammeEnabled: view?.loyaltyProgrammeEnabled ?? false,
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

    // Country owns the default currency pointer; currency catalogue owns ISO attrs.
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
    const progress = await this.progressRepository.ensureProgress(
      context.businessId
    );
    const applied = applyCompletedStep(
      progress.completedSteps as string[],
      step
    );
    const completedAt = new Date();

    await this.progressRepository.saveStepProgress({
      businessId: context.businessId,
      currentStep: applied.resumeStep,
      lastCompletedStep: applied.lastCompletedStep,
      completedSteps: applied.completedSteps,
      completedBy: context.platformUserId,
      completedAt,
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
    };
  }

  /**
   * WHAT: Merge a settings group patch into the metadata document.
   * WHY: Each wizard step updates only its group without wiping siblings.
   */
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

  private async requireDraftOrActiveBusiness(businessId: string) {
    const db = getDb();
    const [row] = await db
      .select({
        id: business.id,
        name: business.name,
        statusCode: business.statusCode,
        countryCode: business.countryCode,
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

  private async assertActiveCurrency(currencyCode: string) {
    const db = getDb();
    const [row] = await db
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
}

export function createBusinessSetupService(): BusinessSetupService {
  return new BusinessSetupService();
}
