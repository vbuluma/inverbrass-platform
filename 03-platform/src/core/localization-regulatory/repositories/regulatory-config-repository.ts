/**
 * Purpose:
 * Persistence for ENG-003b regulatory configuration (persistence only).
 *
 * Engine:
 * ENG-003b – Localization & Regulatory Engine
 */

import { and, asc, eq, isNull, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { requiredDocument } from "@/db/schema/required-document";
import { requiredIdentifier } from "@/db/schema/required-identifier";
import { regulatoryRuleSet } from "@/db/schema/regulatory-rule-set";

type DbClient = PostgresJsDatabase<typeof schema>;

export class RegulatoryConfigRepository {
  async findBestMatchingRuleSet(
    countryCode: string,
    partyTypeCode: string,
    industryCode: string | null,
    dbClient: DbClient = getDb()
  ) {
    const normalizedCountry = countryCode.trim().toUpperCase();
    const normalizedPartyType = partyTypeCode.trim().toUpperCase();
    const normalizedIndustry = industryCode?.trim().toUpperCase() ?? null;

    const candidates = await dbClient
      .select({
        code: regulatoryRuleSet.code,
        name: regulatoryRuleSet.name,
        countryCode: regulatoryRuleSet.countryCode,
        partyTypeCode: regulatoryRuleSet.partyTypeCode,
        industryCode: regulatoryRuleSet.industryCode,
      })
      .from(regulatoryRuleSet)
      .where(
        and(
          eq(regulatoryRuleSet.countryCode, normalizedCountry),
          eq(regulatoryRuleSet.partyTypeCode, normalizedPartyType),
          eq(regulatoryRuleSet.isActive, true),
          normalizedIndustry
            ? or(
                eq(regulatoryRuleSet.industryCode, normalizedIndustry),
                isNull(regulatoryRuleSet.industryCode)
              )
            : isNull(regulatoryRuleSet.industryCode)
        )
      )
      .orderBy(asc(regulatoryRuleSet.displayOrder), asc(regulatoryRuleSet.name));

    if (candidates.length === 0) {
      return null;
    }

    if (normalizedIndustry) {
      const industrySpecific = candidates.find(
        (row) => row.industryCode === normalizedIndustry
      );
      if (industrySpecific) {
        return industrySpecific;
      }
    }

    return candidates.find((row) => row.industryCode === null) ?? candidates[0];
  }

  async listRequiredDocumentsByRuleSetCode(
    ruleSetCode: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select({
        documentTypeCode: requiredDocument.documentTypeCode,
        requirementLevel: requiredDocument.requirementLevel,
        displayOrder: requiredDocument.displayOrder,
      })
      .from(requiredDocument)
      .where(
        and(
          eq(requiredDocument.ruleSetCode, ruleSetCode),
          eq(requiredDocument.isActive, true)
        )
      )
      .orderBy(asc(requiredDocument.displayOrder), asc(requiredDocument.documentTypeCode));
  }

  async listRequiredIdentifiersByRuleSetCode(
    ruleSetCode: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select({
        identifierTypeCode: requiredIdentifier.identifierTypeCode,
        requirementLevel: requiredIdentifier.requirementLevel,
        displayOrder: requiredIdentifier.displayOrder,
      })
      .from(requiredIdentifier)
      .where(
        and(
          eq(requiredIdentifier.ruleSetCode, ruleSetCode),
          eq(requiredIdentifier.isActive, true)
        )
      )
      .orderBy(
        asc(requiredIdentifier.displayOrder),
        asc(requiredIdentifier.identifierTypeCode)
      );
  }
}

export function createRegulatoryConfigRepository(): RegulatoryConfigRepository {
  return new RegulatoryConfigRepository();
}
