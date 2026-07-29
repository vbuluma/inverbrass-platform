/**
 * Purpose:
 * Resolve applicable regulatory document requirements for a Party context.
 *
 * Architecture:
 * Consumer modules → RegulatoryDocumentRequirementsService → RegulatoryConfigRepository
 *
 * Engine:
 * ENG-003b – Localization & Regulatory Engine
 */

import { createRegulatoryConfigRepository } from "@/core/localization-regulatory/repositories/regulatory-config-repository";
import type {
  PartyRegulatoryContext,
  ResolvedRegulatoryRuleSet,
} from "@/core/localization-regulatory/types";

export class RegulatoryDocumentRequirementsService {
  constructor(
    private readonly regulatoryConfigRepository = createRegulatoryConfigRepository()
  ) {}

  async resolveDocumentRequirements(
    context: PartyRegulatoryContext
  ): Promise<ResolvedRegulatoryRuleSet | null> {
    const ruleSet = await this.regulatoryConfigRepository.findBestMatchingRuleSet(
      context.countryCode,
      context.partyTypeCode,
      context.industryCode
    );

    if (!ruleSet) {
      return null;
    }

    const requirements =
      await this.regulatoryConfigRepository.listRequiredDocumentsByRuleSetCode(
        ruleSet.code
      );

    return {
      code: ruleSet.code,
      name: ruleSet.name,
      countryCode: ruleSet.countryCode,
      partyTypeCode: ruleSet.partyTypeCode,
      industryCode: ruleSet.industryCode,
      requirements: requirements.map((row) => ({
        documentTypeCode: row.documentTypeCode,
        requirementLevel:
          row.requirementLevel === "REQUIRED" ? "REQUIRED" : "OPTIONAL",
        displayOrder: row.displayOrder,
      })),
    };
  }
}

export function createRegulatoryDocumentRequirementsService(): RegulatoryDocumentRequirementsService {
  return new RegulatoryDocumentRequirementsService();
}
