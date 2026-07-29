/**
 * Purpose:
 * Fallback view when Identity & Regulatory panel data cannot be loaded.
 *
 * Implementation Package:
 * BP-002 / IP-013 – Identity & Regulatory Information
 */

import { IDENTIFIER_VIEW_FULL_PERMISSION } from "@/core/identity-regulatory";
import type { PartyIdentityRegulatoryPanelView } from "@/modules/party/types";

export function buildEmptyIdentityRegulatoryPanelView(
  loadError?: string
): PartyIdentityRegulatoryPanelView {
  return {
    summary: {
      countryCode: "—",
      countryName: "—",
      ruleSetCode: "—",
      ruleSetName: "Unavailable",
      verificationPercent: 0,
      requiredCount: 0,
      capturedCount: 0,
      verifiedCount: 0,
      missingCount: 0,
      expiredCount: 0,
    },
    requiredIdentifiers: [],
    capturedIdentifiers: [],
    verifications: [],
    availableIdentifierTypes: [],
    availableDocuments: [],
    canViewFullValues: false,
    viewFullPermissionCode: IDENTIFIER_VIEW_FULL_PERMISSION,
    loadError:
      loadError ??
      "Identity & Regulatory data is temporarily unavailable. Please try again.",
  };
}
