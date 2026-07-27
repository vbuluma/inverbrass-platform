/**
 * Purpose:
 * Persist extensible business operating configuration as metadata settings.
 *
 * WHY:
 * IP-006 stores payment, receipt, tax, and feature toggles. Future Build Packs
 * will add more settings; a dedicated column per setting would force repeated
 * schema redesign.
 *
 * RATIONALE:
 * One row per business with a JSON settings document keeps the model simple
 * while allowing new configuration groups without ALTER TABLE churn.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding
 *
 * Implementation Package:
 * IP-006 – Business Activation & Configuration Wizard
 */

import {
  pgTable,
  uuid,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

import { business } from "./business";

/**
 * JSON document shape stored in business_configuration.settings.
 * Kept in the schema module so `src/db` does not depend on `src/modules`.
 */
export type BusinessConfigurationSettingsJson = {
  /**
   * Onboarding profile for the single setup engine (express | standard | enterprise).
   * Optional for legacy rows — defaults to enterprise behaviour when absent.
   */
  onboardingProfile?: "express" | "standard" | "enterprise";
  paymentMethods: {
    cashEnabled: boolean;
    mobileMoneyEnabled: boolean;
    bankTransferEnabled: boolean;
    cardEnabled: boolean;
    creditSalesEnabled: boolean;
  };
  receipt: {
    receiptPrefix: string;
    receiptFooter: string;
    showLogoOnReceipt: boolean;
  };
  tax: {
    taxEnabled: boolean;
    /** Simple BP-001 default tax label — not a tax-type catalogue. */
    defaultTaxName: string;
    defaultTaxRate: string;
  };
  features: {
    aiAssistantEnabled: boolean;
    loyaltyProgrammeEnabled: boolean;
  };
};

export const businessConfiguration = pgTable("business_configuration", {
  id: uuid("id").defaultRandom().primaryKey(),

  businessId: uuid("business_id")
    .references(() => business.id)
    .notNull()
    .unique(),

  settings: jsonb("settings")
    .$type<BusinessConfigurationSettingsJson>()
    .notNull(),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
});
