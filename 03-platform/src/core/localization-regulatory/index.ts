/**
 * Purpose:
 * Public exports for ENG-003b Localization & Regulatory Engine (document slice).
 */

export {
  createRegulatoryDocumentRequirementsService,
  RegulatoryDocumentRequirementsService,
} from "@/core/localization-regulatory/services/regulatory-document-requirements-service";
export {
  createRegulatoryIdentifierRequirementsService,
  RegulatoryIdentifierRequirementsService,
} from "@/core/localization-regulatory/services/regulatory-identifier-requirements-service";
export type {
  PartyRegulatoryContext,
  RegulatoryDocumentRequirementConfig,
  RegulatorySubjectContext,
  RequiredDocumentConfig,
  RequiredIdentifierConfig,
  ResolvedRegulatoryRuleSet,
  ResolvedIdentifierRuleSet,
} from "@/core/localization-regulatory/types";
