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

export {
  DOCUMENT_NUMBERING_DOCUMENT_TYPES,
  DOCUMENT_NUMBERING_ERROR_CODES,
  DocumentNumberingError,
} from "@/core/localization-regulatory/document-numbering";
export type {
  AllocatedDocumentNumber,
  DocumentNumberingPort,
  DocumentNumberingPolicy,
} from "@/core/localization-regulatory/document-numbering";
export {
  ConfigurableDocumentNumberingService,
  InMemoryDocumentNumberingStore,
  ScriptedDocumentNumberingAdapter,
  createScriptedDocumentNumberingAdapter,
} from "@/core/localization-regulatory/services/document-numbering-service";
