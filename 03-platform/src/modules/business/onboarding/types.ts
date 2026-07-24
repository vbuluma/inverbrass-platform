/**
 * Purpose:
 * Shared types for the Business Activation & Configuration Wizard module.
 *
 * Implementation Package:
 * IP-006 – Business Activation & Configuration Wizard
 */

import type { SetupStep } from "@/modules/business/onboarding/constants";

export type BusinessDetailsPayload = {
  tradingName?: string;
  logoUrl: string;
  email: string;
  physicalAddress: string;
  county: string;
  city: string;
  website?: string;
  description?: string;
  gpsLatitude?: string;
  gpsLongitude?: string;
};

export type CountryStepPayload = {
  countryCode: string;
};

export type BaseCurrencyPayload = {
  currencyCode: string;
};

export type AdditionalCurrenciesPayload = {
  currencyCodes: string[];
};

export type PaymentMethodsPayload = {
  cashEnabled: boolean;
  mobileMoneyEnabled: boolean;
  bankTransferEnabled: boolean;
  cardEnabled: boolean;
  creditSalesEnabled: boolean;
};

export type ReceiptConfigurationPayload = {
  receiptPrefix: string;
  receiptFooter: string;
  showLogoOnReceipt: boolean;
  taxEnabled: boolean;
  defaultTaxRate: string;
};

export type FeatureTogglePayload = {
  enabled: boolean;
};

/**
 * Metadata document stored in business_configuration.settings.
 * WHY: groups settings so future items can be added without new columns.
 */
export type BusinessConfigurationSettings =
  import("@/db/schema/business-configuration").BusinessConfigurationSettingsJson;

/**
 * Flattened configuration view for UI/review consumption.
 * WHY: keeps presentation components free of nested settings navigation.
 */
export type BusinessConfigurationView = {
  cashEnabled: boolean;
  mobileMoneyEnabled: boolean;
  bankTransferEnabled: boolean;
  cardEnabled: boolean;
  creditSalesEnabled: boolean;
  receiptPrefix: string;
  receiptFooter: string;
  showLogoOnReceipt: boolean;
  taxEnabled: boolean;
  defaultTaxRate: string;
  aiAssistantEnabled: boolean;
  loyaltyProgrammeEnabled: boolean;
};

export type SetupProgressView = {
  businessId: string;
  businessName: string;
  businessStatusCode: string;
  currentStep: SetupStep;
  lastCompletedStep: SetupStep | null;
  completedSteps: SetupStep[];
  resumeStep: SetupStep;
  progressPercent: number;
  isActivated: boolean;
  wizardVersion: string;
};

export type SetupReviewSummary = {
  businessName: string;
  tradingName: string;
  email: string;
  physicalAddress: string;
  county: string;
  city: string;
  countryCode: string;
  countryName: string;
  baseCurrencyCode: string;
  additionalCurrencyCodes: string[];
  paymentMethods: PaymentMethodsPayload;
  receipt: ReceiptConfigurationPayload;
  aiAssistantEnabled: boolean;
  loyaltyProgrammeEnabled: boolean;
};
