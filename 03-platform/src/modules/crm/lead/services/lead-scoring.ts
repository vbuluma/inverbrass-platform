/**
 * Purpose:
 * Lead scoring capability contract — score storage and ENG-004 reservation.
 *
 * Current IP-02:
 * - `crm_lead.qualification_score` (0–100 integer)
 * - `crm_lead.metadata` JSON for score breakdown and model version
 *
 * Future ENG-004 scoring rules consume business_configuration.settings.crm.lead.scoring
 *
 * Implementation Package:
 * BP-004 / IP-02 – Lead Management
 */

export const LEAD_SCORING_METADATA_KEYS = {
  SCORE_BREAKDOWN: "scoreBreakdown",
  SCORING_MODEL_VERSION: "scoringModelVersion",
  SCORING_SOURCE: "scoringSource",
  LAST_SCORED_AT: "lastScoredAt",
} as const;

export type LeadScoreBreakdownEntry = {
  criterionCode: string;
  label: string;
  weight: number;
  points: number;
};

export type LeadScoringMetadata = {
  scoreBreakdown?: LeadScoreBreakdownEntry[];
  scoringModelVersion?: string;
  scoringSource?: "MANUAL" | "ENG-004" | "IMPORT";
  lastScoredAt?: string;
};

export type LeadScoringConfig = {
  /** Reserved — ENG-004 model identifier */
  modelCode?: string;
  /** Reserved — auto-qualify when score exceeds threshold */
  autoQualifyThreshold?: number;
};

type BusinessSettingsDocument = {
  crm?: {
    lead?: {
      scoring?: LeadScoringConfig;
    };
  };
};

export function resolveLeadScoringConfig(settings: unknown): LeadScoringConfig {
  if (!settings || typeof settings !== "object") {
    return {};
  }

  const document = settings as BusinessSettingsDocument;
  return document.crm?.lead?.scoring ?? {};
}

export function parseLeadScoringMetadata(
  metadata: Record<string, unknown> | null | undefined
): LeadScoringMetadata {
  if (!metadata) {
    return {};
  }

  return {
    scoreBreakdown: Array.isArray(metadata[LEAD_SCORING_METADATA_KEYS.SCORE_BREAKDOWN])
      ? (metadata[LEAD_SCORING_METADATA_KEYS.SCORE_BREAKDOWN] as LeadScoreBreakdownEntry[])
      : undefined,
    scoringModelVersion:
      typeof metadata[LEAD_SCORING_METADATA_KEYS.SCORING_MODEL_VERSION] === "string"
        ? (metadata[LEAD_SCORING_METADATA_KEYS.SCORING_MODEL_VERSION] as string)
        : undefined,
    scoringSource:
      metadata[LEAD_SCORING_METADATA_KEYS.SCORING_SOURCE] === "MANUAL" ||
      metadata[LEAD_SCORING_METADATA_KEYS.SCORING_SOURCE] === "ENG-004" ||
      metadata[LEAD_SCORING_METADATA_KEYS.SCORING_SOURCE] === "IMPORT"
        ? (metadata[LEAD_SCORING_METADATA_KEYS.SCORING_SOURCE] as LeadScoringMetadata["scoringSource"])
        : undefined,
    lastScoredAt:
      typeof metadata[LEAD_SCORING_METADATA_KEYS.LAST_SCORED_AT] === "string"
        ? (metadata[LEAD_SCORING_METADATA_KEYS.LAST_SCORED_AT] as string)
        : undefined,
  };
}
