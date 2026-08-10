/**
 * Purpose:
 * Resolve lead conversion defaults from business configuration.
 *
 * Configuration path:
 *   business_configuration.settings.crm.lead.conversion
 *
 * Request payload fields on convert may override these defaults when provided.
 *
 * Implementation Package:
 * BP-004 / IP-02 – Lead Management
 */

import { CRM_STATUS_CODES, type CrmStatusCode } from "@/modules/crm/constants";
import { isCrmStatusCode } from "@/modules/crm/services/crm-rules";

export type LeadConversionConfig = {
  /** Default for createOpportunity when omitted from convert payload. */
  createOpportunityDefault: boolean;
  /** Default for createCrmIfMissing when omitted from convert payload. */
  createCrmIfMissingDefault: boolean;
  /**
   * CRM status applied when conversion creates a missing CRM record.
   * v1 default: LEAD (customer ACTIVE promotion happens on opportunity win).
   */
  crmStatusOnConvert: CrmStatusCode;
  /**
   * When an opportunity is won, promote linked CRM record to ACTIVE
   * if the current status allows the transition.
   */
  promoteCrmToActiveOnWin: boolean;
};

type BusinessSettingsDocument = {
  crm?: {
    lead?: {
      conversion?: Partial<{
        createOpportunityDefault: boolean;
        createCrmIfMissingDefault: boolean;
        crmStatusOnConvert: string;
        promoteCrmToActiveOnWin: boolean;
      }>;
    };
  };
};

export const DEFAULT_LEAD_CONVERSION_CONFIG: LeadConversionConfig = {
  createOpportunityDefault: true,
  createCrmIfMissingDefault: true,
  crmStatusOnConvert: CRM_STATUS_CODES.LEAD,
  promoteCrmToActiveOnWin: true,
};

export function resolveLeadConversionConfig(
  settings: unknown
): LeadConversionConfig {
  if (!settings || typeof settings !== "object") {
    return DEFAULT_LEAD_CONVERSION_CONFIG;
  }

  const document = settings as BusinessSettingsDocument;
  const overrides = document.crm?.lead?.conversion ?? {};

  const crmStatusOnConvert =
    typeof overrides.crmStatusOnConvert === "string" &&
    isCrmStatusCode(overrides.crmStatusOnConvert)
      ? overrides.crmStatusOnConvert
      : DEFAULT_LEAD_CONVERSION_CONFIG.crmStatusOnConvert;

  return {
    createOpportunityDefault:
      typeof overrides.createOpportunityDefault === "boolean"
        ? overrides.createOpportunityDefault
        : DEFAULT_LEAD_CONVERSION_CONFIG.createOpportunityDefault,
    createCrmIfMissingDefault:
      typeof overrides.createCrmIfMissingDefault === "boolean"
        ? overrides.createCrmIfMissingDefault
        : DEFAULT_LEAD_CONVERSION_CONFIG.createCrmIfMissingDefault,
    crmStatusOnConvert,
    promoteCrmToActiveOnWin:
      typeof overrides.promoteCrmToActiveOnWin === "boolean"
        ? overrides.promoteCrmToActiveOnWin
        : DEFAULT_LEAD_CONVERSION_CONFIG.promoteCrmToActiveOnWin,
  };
}
