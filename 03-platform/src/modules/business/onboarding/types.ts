/**
 * Purpose:
 * Shared types for the Business Activation & Configuration Wizard module.
 *
 * Implementation Package:
 * BP-001 / IP-006 – Business Activation & Configuration Wizard
 */

import type {
  EmployeeSetupRoleCode,
  SetupStep,
} from "@/modules/business/onboarding/constants";

export type BusinessDetailsPayload = {
  businessName: string;
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

export type BusinessClassificationPayload = {
  industryId: string;
  businessTypeId: string;
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

export type BusinessOperationsPayload = {
  paymentMethods: PaymentMethodsPayload;
  receipt: ReceiptConfigurationPayload;
  aiAssistantEnabled: boolean;
  loyaltyProgrammeEnabled: boolean;
};

export type BranchSetupItemPayload = {
  name: string;
  code: string;
  branchType: string;
  physicalAddress: string;
  county: string;
  city: string;
  contactPhone: string;
  email?: string;
  gpsLatitude?: string;
  gpsLongitude?: string;
  openingDate?: string;
  isHeadOffice?: boolean;
  isDefault?: boolean;
};

export type BranchSetupPayload = {
  hasMultipleBranches: boolean;
  branches: BranchSetupItemPayload[];
};

export type EmployeeSetupItemPayload = {
  firstName: string;
  lastName: string;
  mobileNumber: string;
  email?: string;
  branchId: string;
  jobTitle: string;
  platformRoleCode: EmployeeSetupRoleCode;
};

export type EmployeeSetupPayload = {
  skip: boolean;
  employees: EmployeeSetupItemPayload[];
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

export type SetupBranchReviewItem = {
  name: string;
  code: string;
  branchType: string;
  city: string;
  isHeadOffice: boolean;
};

export type SetupEmployeeReviewItem = {
  fullName: string;
  jobTitle: string;
  branchName: string;
  roleName: string;
};

export type SetupReviewSummary = {
  businessName: string;
  tradingName: string;
  industryName: string;
  businessTypeName: string;
  email: string;
  physicalAddress: string;
  county: string;
  city: string;
  countryCode: string;
  countryName: string;
  baseCurrencyCode: string;
  additionalCurrencyCodes: string[];
  branches: SetupBranchReviewItem[];
  employees: SetupEmployeeReviewItem[];
  paymentMethods: PaymentMethodsPayload;
  receipt: ReceiptConfigurationPayload;
  aiAssistantEnabled: boolean;
  loyaltyProgrammeEnabled: boolean;
};

export type CreatedEmployeeCredential = {
  employeeId: string;
  fullName: string;
  mobileNumber: string;
  temporaryPassword: string;
};
