/**
 * Purpose:
 * Resolve applicable regulatory identifier requirements for a subject context.
 *
 * Architecture:
 * Consumer modules → RegulatoryIdentifierRequirementsService → RegulatoryConfigRepository
 *
 * Engine:
 * ENG-003b – Localization & Regulatory Engine
 */

import { createRegulatoryConfigRepository } from "@/core/localization-regulatory/repositories/regulatory-config-repository";
import type {
  RegulatorySubjectContext,
  ResolvedIdentifierRuleSet,
} from "@/core/localization-regulatory/types";

export class RegulatoryIdentifierRequirementsService {
  constructor(
    private readonly regulatoryConfigRepository = createRegulatoryConfigRepository()
  ) {}

  async resolveIdentifierRequirements(
    context: RegulatorySubjectContext
  ): Promise<ResolvedIdentifierRuleSet | null> {
    const ruleSet = await this.regulatoryConfigRepository.findBestMatchingRuleSet(
      context.countryCode,
      context.partyTypeCode,
      context.industryCode
    );

    if (!ruleSet) {
      return null;
    }

    const requirements =
      await this.regulatoryConfigRepository.listRequiredIdentifiersByRuleSetCode(
        ruleSet.code
      );

    return {
      code: ruleSet.code,
      name: ruleSet.name,
      countryCode: ruleSet.countryCode,
      partyTypeCode: ruleSet.partyTypeCode,
      industryCode: ruleSet.industryCode,
      requirements: requirements.map((row) => ({
        identifierTypeCode: row.identifierTypeCode,
        requirementLevel:
          row.requirementLevel === "REQUIRED" ? "REQUIRED" : "OPTIONAL",
        displayOrder: row.displayOrder,
      })),
    };
  }
}

export function createRegulatoryIdentifierRequirementsService(): RegulatoryIdentifierRequirementsService {
  return new RegulatoryIdentifierRequirementsService();
}
