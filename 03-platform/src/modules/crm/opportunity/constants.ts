/**
 * Purpose:
 * Opportunity Management constants.
 *
 * Implementation Package:
 * BP-004 / IP-03 – Opportunity Management
 */

export const OPPORTUNITY_STATUS_CODES = {
  OPEN: "OPEN",
  WON: "WON",
  LOST: "LOST",
} as const;

export type OpportunityStatusCode =
  (typeof OPPORTUNITY_STATUS_CODES)[keyof typeof OPPORTUNITY_STATUS_CODES];

export const OPPORTUNITY_NUMBER_PREFIX = "OPP";

export const OPPORTUNITY_DEFAULT_PAGE_SIZE = 25;

export const DEFAULT_PIPELINE_CODE = "STANDARD_SALES";

export const DEFAULT_OPEN_STAGE_CODE = "PROSPECTING";

export const OPPORTUNITY_CLOSED_STATUS_CODES: OpportunityStatusCode[] = [
  OPPORTUNITY_STATUS_CODES.WON,
  OPPORTUNITY_STATUS_CODES.LOST,
];

/**
 * Opportunity metadata keys written on lead conversion (Lead Conversion Contract).
 * Used for attribution analytics — not duplicated as first-class columns.
 */
export const OPPORTUNITY_CONVERSION_METADATA_KEYS = {
  LEAD_CONVERSION: "leadConversion",
} as const;

export type OpportunityLeadConversionMetadata = {
  sourceCode: string;
  qualificationScore: number | null;
  companyName?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
};

export function buildLeadConversionMetadata(input: {
  sourceCode: string;
  qualificationScore: number | null;
  companyName?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
}): Record<string, OpportunityLeadConversionMetadata> {
  return {
    [OPPORTUNITY_CONVERSION_METADATA_KEYS.LEAD_CONVERSION]: {
      sourceCode: input.sourceCode,
      qualificationScore: input.qualificationScore,
      companyName: input.companyName ?? null,
      contactName: input.contactName ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
    },
  };
}

export function readLeadConversionMetadata(
  metadata: Record<string, unknown> | null | undefined
): OpportunityLeadConversionMetadata | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const block = metadata[OPPORTUNITY_CONVERSION_METADATA_KEYS.LEAD_CONVERSION];
  if (!block || typeof block !== "object") {
    return null;
  }

  const record = block as Partial<OpportunityLeadConversionMetadata>;
  if (typeof record.sourceCode !== "string") {
    return null;
  }

  return {
    sourceCode: record.sourceCode,
    qualificationScore:
      typeof record.qualificationScore === "number"
        ? record.qualificationScore
        : record.qualificationScore === null
          ? null
          : null,
    companyName: record.companyName ?? null,
    contactName: record.contactName ?? null,
    email: record.email ?? null,
    phone: record.phone ?? null,
  };
}
