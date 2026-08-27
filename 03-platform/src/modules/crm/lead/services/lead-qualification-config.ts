/**
 * Purpose:
 * Resolve configurable lead qualification criteria from business settings.
 *
 * Configuration path:
 *   business_configuration.settings.crm.lead.qualification
 *
 * Checklist integration (ENG-003l) is reserved — not hardcoded in IP-02.
 *
 * Implementation Package:
 * BP-004 / IP-02 – Lead Management
 */

export type LeadQualificationConfig = {
  /** Minimum qualificationScore (0–100) required before manual qualify. Default 0. */
  minScoreToQualify: number;
  /** When true, owner must be assigned before transition to QUALIFIED. */
  requireOwnerBeforeQualify: boolean;
  /** Reserved for ENG-003l checklist gating — when true, checklist must pass. */
  checklistMode: boolean;
};

type BusinessSettingsDocument = {
  crm?: {
    lead?: {
      qualification?: Partial<LeadQualificationConfig>;
    };
  };
};

export const DEFAULT_LEAD_QUALIFICATION_CONFIG: LeadQualificationConfig = {
  minScoreToQualify: 0,
  requireOwnerBeforeQualify: false,
  checklistMode: false,
};

export function resolveLeadQualificationConfig(
  settings: unknown
): LeadQualificationConfig {
  if (!settings || typeof settings !== "object") {
    return DEFAULT_LEAD_QUALIFICATION_CONFIG;
  }

  const document = settings as BusinessSettingsDocument;
  const overrides = document.crm?.lead?.qualification ?? {};

  return {
    minScoreToQualify:
      typeof overrides.minScoreToQualify === "number"
        ? overrides.minScoreToQualify
        : DEFAULT_LEAD_QUALIFICATION_CONFIG.minScoreToQualify,
    requireOwnerBeforeQualify:
      typeof overrides.requireOwnerBeforeQualify === "boolean"
        ? overrides.requireOwnerBeforeQualify
        : DEFAULT_LEAD_QUALIFICATION_CONFIG.requireOwnerBeforeQualify,
    checklistMode:
      typeof overrides.checklistMode === "boolean"
        ? overrides.checklistMode
        : DEFAULT_LEAD_QUALIFICATION_CONFIG.checklistMode,
  };
}

export function validateQualificationTransition(input: {
  config: LeadQualificationConfig;
  toStatus: string;
  ownerPartyId: string | null;
  qualificationScore: number | null;
}): string | null {
  if (input.toStatus !== "QUALIFIED") {
    return null;
  }

  if (
    input.config.requireOwnerBeforeQualify &&
    !input.ownerPartyId
  ) {
    return "Assign an owner before qualifying this lead.";
  }

  const score = input.qualificationScore ?? 0;
  if (score < input.config.minScoreToQualify) {
    return `Qualification score must be at least ${input.config.minScoreToQualify}.`;
  }

  if (input.config.checklistMode) {
    return "Qualification checklist (ENG-003l) is enabled but not yet integrated.";
  }

  return null;
}
