/**
 * Purpose:
 * Ports for BP-009 IP-01. Party identity stays in BP-002.
 */

import type { DocumentNumberingPort } from "@/core/localization-regulatory/document-numbering";
import type {
  CatalogueRef,
  ProcurementAuditRecord,
  ProcurementDocumentRef,
  ProcurementPartyRef,
  ProcurementProfileInsert,
  ProcurementProfilePatch,
  ProcurementProfileRecord,
  PurchaseRequestControlRecord,
  PurchaseRequestDocumentRecord,
  PurchaseRequestInsert,
  PurchaseRequestLineDraft,
  PurchaseRequestLineRecord,
  PurchaseRequestPatch,
  PurchaseRequestRecord,
  ReorderOriginSnapshot,
  ApprovedRequestBudget,
  SuggestedSupplierSnapshot,
  SupplierQualificationRecord,
  PurchaseOrderControlRecord,
  PurchaseOrderRecord,
  PurchaseOrderInsert,
  PurchaseOrderPatch,
  PurchaseOrderVersionRecord,
  PoLineRecord,
  PoPaymentTermRecord,
  PoSupplierTokenRecord,
  PoSupplierResponseRecord,
} from "@/modules/procurement/types";

export type ProcurementPartyPort = {
  findParty(businessId: string, partyId: string): Promise<ProcurementPartyRef | null>;
  searchParties(businessId: string, query: string): Promise<ProcurementPartyRef[]>;
  assignSupplierRole(businessId: string, partyId: string, actorUserId: string): Promise<void>;
};

export type ProcurementDocumentPort = {
  findPartyDocument(
    businessId: string,
    partyId: string,
    documentId: string
  ): Promise<ProcurementDocumentRef | null>;
  listPartyDocuments(
    businessId: string,
    partyId: string
  ): Promise<ProcurementDocumentRef[]>;
};

export type ProcurementCataloguePort = {
  listCategories(): Promise<CatalogueRef[]>;
  listCapabilities(): Promise<CatalogueRef[]>;
  listStatuses(): Promise<CatalogueRef[]>;
  listQualificationStatuses(): Promise<CatalogueRef[]>;
  listQualificationTypes(): Promise<CatalogueRef[]>;
};

export type ProcurementProfileRepositoryPort = {
  insert(values: ProcurementProfileInsert): Promise<ProcurementProfileRecord>;
  update(
    businessId: string,
    profileId: string,
    patch: ProcurementProfilePatch
  ): Promise<ProcurementProfileRecord>;
  findById(businessId: string, profileId: string): Promise<ProcurementProfileRecord | null>;
  findByPartyId(
    businessId: string,
    partyId: string
  ): Promise<ProcurementProfileRecord | null>;
  listByBusiness(businessId: string): Promise<ProcurementProfileRecord[]>;
  replaceCategories(
    businessId: string,
    profileId: string,
    codes: string[],
    actorUserId: string | null
  ): Promise<string[]>;
  replaceCapabilities(
    businessId: string,
    profileId: string,
    codes: string[],
    actorUserId: string | null
  ): Promise<string[]>;
  listCategoryCodes(profileId: string): Promise<string[]>;
  listCapabilityCodes(profileId: string): Promise<string[]>;
};

export type SupplierQualificationRepositoryPort = {
  insert(
    values: Omit<SupplierQualificationRecord, "createdAt" | "updatedAt" | "deletedAt">
  ): Promise<SupplierQualificationRecord>;
  update(
    businessId: string,
    qualificationId: string,
    patch: Partial<SupplierQualificationRecord>
  ): Promise<SupplierQualificationRecord>;
  listByProfile(
    businessId: string,
    profileId: string
  ): Promise<SupplierQualificationRecord[]>;
  findById(
    businessId: string,
    qualificationId: string
  ): Promise<SupplierQualificationRecord | null>;
};

export type ProcurementAuditPort = {
  record(entry: ProcurementAuditRecord): Promise<void>;
};

export type PurchaseRequestRepositoryPort = {
  insert(values: PurchaseRequestInsert): Promise<PurchaseRequestRecord>;
  update(
    businessId: string,
    requestId: string,
    patch: PurchaseRequestPatch
  ): Promise<PurchaseRequestRecord>;
  findById(businessId: string, requestId: string): Promise<PurchaseRequestRecord | null>;
  findByIdempotencyKey(
    businessId: string,
    idempotencyKey: string
  ): Promise<PurchaseRequestRecord | null>;
  listByBusiness(businessId: string): Promise<PurchaseRequestRecord[]>;
  replaceLines(
    businessId: string,
    requestId: string,
    lines: PurchaseRequestLineDraft[]
  ): Promise<PurchaseRequestLineRecord[]>;
  listLines(businessId: string, requestId: string): Promise<PurchaseRequestLineRecord[]>;
  addDocument(
    businessId: string,
    requestId: string,
    document: Omit<PurchaseRequestDocumentRecord, "id" | "requestId" | "businessId"> & {
      createdBy: string | null;
    }
  ): Promise<PurchaseRequestDocumentRecord>;
  listDocuments(
    businessId: string,
    requestId: string
  ): Promise<PurchaseRequestDocumentRecord[]>;
};

export type PurchaseRequestControlPort = {
  getControl(businessId: string): Promise<PurchaseRequestControlRecord | null>;
};

export type InventoryReorderOriginPort = {
  find(businessId: string, reference: string): Promise<ReorderOriginSnapshot | null>;
};

export type SuggestedSupplierPort = {
  resolve(businessId: string, profileId: string): Promise<SuggestedSupplierSnapshot | null>;
};

export type ApprovedRequestBudgetPort = {
  getApproved(businessId: string, requestId: string): Promise<ApprovedRequestBudget | null>;
  getLinked(businessId: string, requestId: string): Promise<ApprovedRequestBudget | null>;
};

export type SourcingStorePort = {
  insertEvent(values: {
    id: string;
    businessId: string;
    eventNumber: string;
    rfxType: string;
    title: string;
    status: string;
    currencyCode: string;
    closesAt: Date;
    originalClosesAt: Date;
    riskLevel: string;
    categoryCode: string | null;
    openingPolicy: string;
    openingPolicySource: string;
    evaluationMethod: string;
    technicalWeight: string;
    financialWeight: string;
    financialBasis: string;
    evaluationStage?: string;
    createdBy: string | null;
  }): Promise<void>;
  addPurchaseRequest(businessId: string, eventId: string, purchaseRequestId: string): Promise<void>;
  addInvitation(values: {
    id: string;
    businessId: string;
    eventId: string;
    profileId: string;
    accessToken: string;
    tokenExpiresAt: Date | null;
    createdBy: string | null;
  }): Promise<void>;
  markInvitationOpened(eventId: string, profileId: string, openedAt: Date): Promise<void>;
  updateInvitationResponseStatus(
    eventId: string,
    profileId: string,
    responseStatus: string
  ): Promise<void>;
  insertQuote(values: {
    id: string;
    businessId: string;
    eventId: string;
    profileId: string;
    version: number;
    amount: string;
    currencyCode: string;
    status: string;
    comments: string | null;
    deliveryLeadDays: number | null;
    warrantyNotes: string | null;
    year1Amount: string | null;
    tcvAmount: string | null;
    tcoAmount: string | null;
    capturedOnBehalf: boolean;
    idempotencyKey: string | null;
    submittedBy: string | null;
  }): Promise<void>;
  insertQuoteLines(
    businessId: string,
    quoteId: string,
    lines: Array<{
      sequence: number;
      description: string;
      quantity: string;
      unitPrice: string;
      taxRate: string;
      lineTotal: string;
    }>
  ): Promise<void>;
  insertPaymentTerms(
    businessId: string,
    quoteId: string,
    terms: Array<{
      sequence: number;
      milestoneName: string;
      percentage: string;
      amount: string | null;
      triggerEvent: string | null;
      duePeriodDays: number | null;
      comments: string | null;
    }>
  ): Promise<void>;
  findQuoteByIdempotencyKey(
    eventId: string,
    profileId: string,
    idempotencyKey: string
  ): Promise<{ id: string } | null>;
  updateQuoteStatus(quoteId: string, status: string): Promise<void>;
  listQuoteLines(quoteId: string): Promise<Array<{
    id: string;
    sequence: number;
    description: string;
    quantity: string;
    unitPrice: string;
    taxRate: string;
    lineTotal: string;
  }>>;
  listPaymentTerms(quoteId: string): Promise<Array<{
    sequence: number;
    milestoneName: string;
    percentage: string;
    amount: string | null;
    triggerEvent: string | null;
    duePeriodDays: number | null;
    comments: string | null;
  }>>;
  insertClarification(values: {
    id: string;
    businessId: string;
    eventId: string;
    profileId: string | null;
    question: string;
    askedBy: string | null;
    isBroadcast: boolean;
  }): Promise<void>;
  answerClarification(
    businessId: string,
    clarificationId: string,
    answer: string,
    answeredBy: string | null,
    isBroadcast: boolean
  ): Promise<void>;
  listClarifications(eventId: string, profileId?: string | null): Promise<Array<{
    id: string;
    profileId: string | null;
    question: string;
    answer: string | null;
    isBroadcast: boolean;
    createdAt: Date;
    answeredAt: Date | null;
  }>>;
  insertAward(values: {
    id: string;
    businessId: string;
    eventId: string;
    profileId: string;
    awardedAmount: string;
    allocatedBudgetAmount: string;
    currencyCode: string;
    winningQuoteId: string | null;
    overrideReason: string | null;
    createdBy: string | null;
  }): Promise<void>;
  insertAwardLines(
    lines: Array<{
      id: string;
      businessId: string;
      awardId: string;
      winningQuoteId: string;
      winningQuoteLineId: string | null;
      sequence: number;
      description: string;
      quantity: string;
      uom: string;
      unitPrice: string;
      taxRate: string;
      lineTotal: string;
      currencyCode: string;
      createdBy: string | null;
    }>
  ): Promise<void>;
  findAwardById(
    businessId: string,
    awardId: string
  ): Promise<{
    id: string;
    eventId: string;
    profileId: string;
    awardedAmount: string;
    allocatedBudgetAmount: string;
    currencyCode: string;
    winningQuoteId: string | null;
    overrideReason: string | null;
  } | null>;
  listAwardLines(awardId: string): Promise<Array<{
    id: string;
    awardId: string;
    winningQuoteId: string;
    winningQuoteLineId: string | null;
    sequence: number;
    description: string;
    quantity: string;
    uom: string;
    unitPrice: string;
    taxRate: string;
    lineTotal: string;
    currencyCode: string;
  }>>;
  updateEventStatus(
    businessId: string,
    eventId: string,
    status: string,
    recommendation: string | null,
    updatedBy: string | null
  ): Promise<void>;
  updateClosesAt(
    businessId: string,
    eventId: string,
    closesAt: Date,
    updatedBy: string | null
  ): Promise<void>;
  replacePhases(
    businessId: string,
    eventId: string,
    phases: Array<{
      phaseCode: string;
      included: boolean;
      sequence: number;
      weight: string;
      passmark: string;
      required: boolean;
    }>
  ): Promise<void>;
  getOrCreateControl(businessId: string): Promise<{
    defaultOpeningPolicy: string;
    extensionRequiresApproval: boolean;
    awardRequiresApproval: boolean;
    bidSubmissionCountVisible: boolean;
    makerCheckerMinAmount: string | null;
  }>;
  listOpeningRules(businessId: string): Promise<
    Array<{ dimension: string; matchValue: string; requiredPolicy: string }>
  >;
  findEvent(businessId: string, eventId: string): Promise<{
    id: string;
    businessId: string;
    eventNumber: string;
    rfxType: string;
    title: string;
    status: string;
    currencyCode: string;
    recommendation: string | null;
    closesAt: Date;
    originalClosesAt: Date;
    riskLevel: string;
    categoryCode: string | null;
    openingPolicy: string;
    openingPolicySource: string;
    evaluationMethod: string;
    technicalWeight: string;
    financialWeight: string;
    financialBasis: string;
    evaluationStage: string;
    committeeConstitutedAt: Date | null;
    committeeConstitutedBy: string | null;
    criteriaLockedAt: Date | null;
    criteriaLockedBy: string | null;
    criteriaSnapshotHash: string | null;
    criteriaSnapshotJson: string | null;
    awardApprovalStatus: string | null;
    awardSubmittedAt: Date | null;
    awardSubmittedBy: string | null;
    awardApprovedAt: Date | null;
    awardApprovedBy: string | null;
    closedAt: Date | null;
    evaluationStartedAt: Date | null;
    dueDiligenceRequired: boolean | null;
    dueDiligenceLocationVerified: boolean;
    dueDiligenceStaffVerified: boolean;
    dueDiligenceLegalVerified: boolean;
    dueDiligenceOtherNotes: string | null;
    dueDiligenceRecordedAt: Date | null;
    bidsOpenedAt: Date | null;
    bidsOpenedBy: string | null;
    bidsOpeningApprovedBy: string | null;
    recommendedProfileIds: string | null;
    awardOverrideReason: string | null;
  } | null>;
  listEvents(businessId: string): Promise<Array<{
    id: string;
    eventNumber: string;
    title: string;
    status: string;
    rfxType: string;
    closesAt: Date;
  }>>;
  listEventPrIds(eventId: string): Promise<string[]>;
  listInvitations(eventId: string): Promise<Array<{
    profileId: string;
    accessToken: string;
    responseStatus: string;
    openedAt: Date | null;
    revokedAt: Date | null;
    tokenExpiresAt: Date | null;
  }>>;
  findInvitationByToken(token: string): Promise<{
    businessId: string;
    eventId: string;
    profileId: string;
    revokedAt: Date | null;
    tokenExpiresAt: Date | null;
  } | null>;
  listQuotes(eventId: string, profileId?: string): Promise<Array<{
    id: string;
    profileId: string;
    version: number;
    amount: string;
    currencyCode: string;
    status: string;
    comments: string | null;
    deliveryLeadDays: number | null;
    warrantyNotes: string | null;
    year1Amount: string | null;
    tcvAmount: string | null;
    tcoAmount: string | null;
    capturedOnBehalf: boolean;
    submittedAt: Date;
  }>>;
  listAwards(eventId: string): Promise<Array<{
    id: string;
    profileId: string;
    awardedAmount: string;
    allocatedBudgetAmount: string;
    winningQuoteId: string | null;
    overrideReason: string | null;
  }>>;
  listPhases(eventId: string): Promise<Array<{
    phaseCode: string;
    included: boolean;
    sequence: number;
    weight: string;
    passmark: string;
    required: boolean;
  }>>;
  closeTender(
    businessId: string,
    eventId: string,
    closedAt: Date,
    updatedBy: string | null
  ): Promise<void>;
  replaceCommitteeMembers(
    businessId: string,
    eventId: string,
    members: Array<{
      id: string;
      sequence: number;
      memberName: string;
      roleLabel: string | null;
      userId: string | null;
      createdBy: string | null;
    }>
  ): Promise<void>;
  listCommitteeMembers(eventId: string): Promise<Array<{
    id: string;
    sequence: number;
    memberName: string;
    roleLabel: string | null;
    userId: string | null;
  }>>;
  updateEvaluationCriteria(
    businessId: string,
    eventId: string,
    values: {
      evaluationMethod: string;
      technicalWeight: string;
      financialWeight: string;
      financialBasis: string;
      evaluationStage: string;
      updatedBy: string | null;
    }
  ): Promise<void>;
  startEvaluation(
    businessId: string,
    eventId: string,
    startedAt: Date,
    updatedBy: string | null
  ): Promise<void>;
  updateDueDiligence(
    businessId: string,
    eventId: string,
    values: {
      dueDiligenceRequired: boolean;
      dueDiligenceLocationVerified: boolean;
      dueDiligenceStaffVerified: boolean;
      dueDiligenceLegalVerified: boolean;
      dueDiligenceOtherNotes: string | null;
      dueDiligenceRecordedAt: Date;
      updatedBy: string | null;
    }
  ): Promise<void>;
  openBids(
    businessId: string,
    eventId: string,
    values: {
      openedAt: Date;
      openedBy: string | null;
      openingApprovedBy: string | null;
      recommendedProfileIds: string;
      updatedBy: string | null;
    }
  ): Promise<void>;
  upsertPhaseScores(
    businessId: string,
    eventId: string,
    profileId: string,
    scores: Array<{
      id: string;
      phaseCode: string;
      score: string;
      scoredBy: string | null;
    }>
  ): Promise<void>;
  listPhaseScores(eventId: string): Promise<Array<{
    profileId: string;
    phaseCode: string;
    score: string;
  }>>;
  lockEvaluationCriteria(
    businessId: string,
    eventId: string,
    values: {
      lockedAt: Date;
      lockedBy: string | null;
      snapshotHash: string;
      snapshotJson: string;
      evaluationStage: string;
      updatedBy: string | null;
    }
  ): Promise<void>;
  recordBidAccess(input: {
    businessId: string;
    eventId: string;
    profileId?: string | null;
    actorUserId: string | null;
    action: string;
  }): Promise<void>;
  updateAwardApproval(
    businessId: string,
    eventId: string,
    values: {
      awardApprovalStatus: string | null;
      awardSubmittedAt?: Date | null;
      awardSubmittedBy?: string | null;
      awardApprovedAt?: Date | null;
      awardApprovedBy?: string | null;
      recommendation?: string | null;
      updatedBy: string | null;
    }
  ): Promise<void>;
};

export type PurchaseOrderStorePort = {
  insert(values: PurchaseOrderInsert): Promise<PurchaseOrderRecord>;
  update(
    businessId: string,
    purchaseOrderId: string,
    patch: PurchaseOrderPatch
  ): Promise<PurchaseOrderRecord>;
  findById(businessId: string, purchaseOrderId: string): Promise<PurchaseOrderRecord | null>;
  findByAwardId(businessId: string, awardId: string): Promise<PurchaseOrderRecord | null>;
  listByContractId(businessId: string, contractId: string): Promise<PurchaseOrderRecord[]>;
  findByIssueIdempotencyKey(
    businessId: string,
    idempotencyKey: string
  ): Promise<PurchaseOrderRecord | null>;
  listByBusiness(businessId: string): Promise<PurchaseOrderRecord[]>;
  insertVersion(
    values: Omit<PurchaseOrderVersionRecord, "createdAt"> & { createdAt?: Date }
  ): Promise<PurchaseOrderVersionRecord>;
  updateVersion(
    businessId: string,
    versionId: string,
    patch: Partial<Omit<PurchaseOrderVersionRecord, "id" | "businessId" | "purchaseOrderId">>
  ): Promise<PurchaseOrderVersionRecord>;
  findVersionById(
    businessId: string,
    versionId: string
  ): Promise<PurchaseOrderVersionRecord | null>;
  listVersions(purchaseOrderId: string): Promise<PurchaseOrderVersionRecord[]>;
  insertLines(
    businessId: string,
    versionId: string,
    lines: Array<Omit<PoLineRecord, "id" | "businessId" | "versionId">>
  ): Promise<PoLineRecord[]>;
  listLines(versionId: string): Promise<PoLineRecord[]>;
  insertPaymentTerms(
    businessId: string,
    versionId: string,
    terms: Array<Omit<PoPaymentTermRecord, "id" | "businessId" | "versionId">>
  ): Promise<void>;
  listPaymentTerms(versionId: string): Promise<PoPaymentTermRecord[]>;
  insertSupplierToken(
    values: Omit<PoSupplierTokenRecord, "createdAt"> & { createdAt?: Date }
  ): Promise<PoSupplierTokenRecord>;
  findTokenByAccessToken(token: string): Promise<PoSupplierTokenRecord | null>;
  revokeTokensForVersion(businessId: string, versionId: string, revokedAt: Date): Promise<void>;
  insertSupplierResponse(
    values: Omit<PoSupplierResponseRecord, "createdAt"> & { createdAt?: Date }
  ): Promise<PoSupplierResponseRecord>;
  findSupplierResponseByIdempotencyKey(
    businessId: string,
    idempotencyKey: string
  ): Promise<PoSupplierResponseRecord | null>;
};

export type PurchaseOrderControlPort = {
  getControl(businessId: string): Promise<PurchaseOrderControlRecord | null>;
  getOrCreateControl(businessId: string): Promise<PurchaseOrderControlRecord>;
};

export type ContractStorePort = {
  insert(values: import("@/modules/procurement/types").ContractInsert): Promise<import("@/modules/procurement/types").ContractRecord>;
  update(
    businessId: string,
    contractId: string,
    patch: import("@/modules/procurement/types").ContractPatch
  ): Promise<import("@/modules/procurement/types").ContractRecord>;
  findById(businessId: string, contractId: string): Promise<import("@/modules/procurement/types").ContractRecord | null>;
  findByAwardId(businessId: string, awardId: string): Promise<import("@/modules/procurement/types").ContractRecord | null>;
  listByBusiness(businessId: string): Promise<import("@/modules/procurement/types").ContractRecord[]>;
  insertVersion(
    values: Omit<import("@/modules/procurement/types").ContractVersionRecord, "createdAt"> & {
      createdAt?: Date;
    }
  ): Promise<import("@/modules/procurement/types").ContractVersionRecord>;
  updateVersion(
    businessId: string,
    versionId: string,
    patch: Partial<
      Omit<
        import("@/modules/procurement/types").ContractVersionRecord,
        "id" | "businessId" | "contractId"
      >
    >
  ): Promise<import("@/modules/procurement/types").ContractVersionRecord>;
  findVersionById(
    businessId: string,
    versionId: string
  ): Promise<import("@/modules/procurement/types").ContractVersionRecord | null>;
  listVersions(contractId: string): Promise<import("@/modules/procurement/types").ContractVersionRecord[]>;
  insertPeriodValues(
    businessId: string,
    versionId: string,
    rows: Array<Omit<import("@/modules/procurement/types").ContractPeriodValueRecord, "id" | "businessId" | "versionId">>
  ): Promise<void>;
  listPeriodValues(versionId: string): Promise<import("@/modules/procurement/types").ContractPeriodValueRecord[]>;
  insertPaymentTerms(
    businessId: string,
    versionId: string,
    terms: Array<Omit<import("@/modules/procurement/types").ContractPaymentTermRecord, "id" | "businessId" | "versionId">>
  ): Promise<void>;
  listPaymentTerms(versionId: string): Promise<import("@/modules/procurement/types").ContractPaymentTermRecord[]>;
};

export type ContractControlPort = {
  getControl(businessId: string): Promise<import("@/modules/procurement/types").ContractControlRecord | null>;
  getOrCreateControl(businessId: string): Promise<import("@/modules/procurement/types").ContractControlRecord>;
};

export type ReceivingStorePort = {
  insertReceipt(
    values: Omit<import("@/modules/procurement/types").ReceiptRecord, "createdAt" | "updatedAt" | "deletedAt"> & {
      deletedAt?: Date | null;
    }
  ): Promise<import("@/modules/procurement/types").ReceiptRecord>;
  updateReceipt(
    businessId: string,
    receiptId: string,
    patch: Partial<
      Omit<
        import("@/modules/procurement/types").ReceiptRecord,
        "id" | "businessId" | "createdAt" | "createdBy"
      >
    >
  ): Promise<import("@/modules/procurement/types").ReceiptRecord>;
  findReceiptById(
    businessId: string,
    receiptId: string
  ): Promise<import("@/modules/procurement/types").ReceiptRecord | null>;
  listReceiptsByBusiness(
    businessId: string
  ): Promise<import("@/modules/procurement/types").ReceiptRecord[]>;
  listReceiptsByPurchaseOrder(
    businessId: string,
    purchaseOrderId: string
  ): Promise<import("@/modules/procurement/types").ReceiptRecord[]>;
  insertReceiptLines(
    lines: import("@/modules/procurement/types").ReceiptLineRecord[]
  ): Promise<void>;
  listReceiptLines(receiptId: string): Promise<import("@/modules/procurement/types").ReceiptLineRecord[]>;
  listReceiptLinesByPoLine(poLineId: string): Promise<import("@/modules/procurement/types").ReceiptLineRecord[]>;
  listConfirmedReceiptLinesByPoLine(
    businessId: string,
    poLineId: string
  ): Promise<import("@/modules/procurement/types").ReceiptLineRecord[]>;
  insertHandoff(
    values: Omit<import("@/modules/procurement/types").ReceiptHandoffRecord, "createdAt" | "updatedAt"> & {
      createdAt?: Date;
      updatedAt?: Date;
    }
  ): Promise<import("@/modules/procurement/types").ReceiptHandoffRecord>;
  updateHandoff(
    businessId: string,
    handoffId: string,
    patch: Partial<
      Omit<
        import("@/modules/procurement/types").ReceiptHandoffRecord,
        "id" | "businessId" | "createdAt"
      >
    >
  ): Promise<import("@/modules/procurement/types").ReceiptHandoffRecord>;
  findHandoffByIdempotencyKey(
    businessId: string,
    idempotencyKey: string
  ): Promise<import("@/modules/procurement/types").ReceiptHandoffRecord | null>;
  listHandoffsByReceipt(receiptId: string): Promise<import("@/modules/procurement/types").ReceiptHandoffRecord[]>;
  updateReceiptLine(
    businessId: string,
    line: import("@/modules/procurement/types").ReceiptLineRecord
  ): Promise<void>;
};

export type ReceivingControlPort = {
  getControl(businessId: string): Promise<import("@/modules/procurement/types").ReceivingControlRecord | null>;
  getOrCreateControl(businessId: string): Promise<import("@/modules/procurement/types").ReceivingControlRecord>;
};

export type ProcurementInventoryHandoffPort = {
  processHandoff(
    request: import("@/modules/procurement/types").ProcurementInventoryHandoffRequest
  ): Promise<import("@/modules/procurement/types").ProcurementInventoryHandoffResult>;
};

export type ProcurementAssetHandoffPort = {
  processHandoff(
    request: import("@/modules/procurement/types").ProcurementAssetHandoffRequest
  ): Promise<import("@/modules/procurement/types").ProcurementAssetHandoffResult>;
};

export type InvoiceStorePort = {
  insertInvoice(
    values: Omit<import("@/modules/procurement/types").SupplierInvoiceRecord, "createdAt" | "updatedAt" | "deletedAt"> & {
      deletedAt?: Date | null;
    }
  ): Promise<import("@/modules/procurement/types").SupplierInvoiceRecord>;
  updateInvoice(
    businessId: string,
    invoiceId: string,
    patch: Partial<
      Omit<
        import("@/modules/procurement/types").SupplierInvoiceRecord,
        "id" | "businessId" | "createdAt" | "createdBy"
      >
    >
  ): Promise<import("@/modules/procurement/types").SupplierInvoiceRecord>;
  findInvoiceById(
    businessId: string,
    invoiceId: string
  ): Promise<import("@/modules/procurement/types").SupplierInvoiceRecord | null>;
  listInvoicesByBusiness(
    businessId: string
  ): Promise<import("@/modules/procurement/types").SupplierInvoiceRecord[]>;
  listInvoicesByPurchaseOrder(
    businessId: string,
    purchaseOrderId: string
  ): Promise<import("@/modules/procurement/types").SupplierInvoiceRecord[]>;
  findDuplicateInvoice(
    businessId: string,
    profileId: string,
    supplierInvoiceNumber: string,
    excludeInvoiceId?: string | null
  ): Promise<import("@/modules/procurement/types").SupplierInvoiceRecord | null>;
  insertInvoiceLines(
    lines: import("@/modules/procurement/types").SupplierInvoiceLineRecord[]
  ): Promise<void>;
  listInvoiceLines(invoiceId: string): Promise<import("@/modules/procurement/types").SupplierInvoiceLineRecord[]>;
  replaceInvoiceLines(
    businessId: string,
    invoiceId: string,
    lines: import("@/modules/procurement/types").SupplierInvoiceLineRecord[]
  ): Promise<void>;
  insertMatch(
    values: Omit<import("@/modules/procurement/types").InvoiceMatchRecord, "createdAt"> & {
      createdAt?: Date;
    }
  ): Promise<import("@/modules/procurement/types").InvoiceMatchRecord>;
  findMatchByIdempotencyKey(
    businessId: string,
    idempotencyKey: string
  ): Promise<import("@/modules/procurement/types").InvoiceMatchRecord | null>;
  listMatchesByInvoice(invoiceId: string): Promise<import("@/modules/procurement/types").InvoiceMatchRecord[]>;
  insertMatchLines(
    lines: import("@/modules/procurement/types").InvoiceMatchLineRecord[]
  ): Promise<void>;
  listMatchLines(matchId: string): Promise<import("@/modules/procurement/types").InvoiceMatchLineRecord[]>;
  insertApHandoff(
    values: Omit<import("@/modules/procurement/types").ApHandoffRecord, "createdAt" | "updatedAt"> & {
      createdAt?: Date;
      updatedAt?: Date;
    }
  ): Promise<import("@/modules/procurement/types").ApHandoffRecord>;
  updateApHandoff(
    businessId: string,
    handoffId: string,
    patch: Partial<
      Omit<import("@/modules/procurement/types").ApHandoffRecord, "id" | "businessId" | "createdAt">
    >
  ): Promise<import("@/modules/procurement/types").ApHandoffRecord>;
  findApHandoffByIdempotencyKey(
    businessId: string,
    idempotencyKey: string
  ): Promise<import("@/modules/procurement/types").ApHandoffRecord | null>;
  findApHandoffByInvoice(
    businessId: string,
    invoiceId: string
  ): Promise<import("@/modules/procurement/types").ApHandoffRecord | null>;
  listPaymentReadyInvoices(
    businessId: string
  ): Promise<import("@/modules/procurement/types").SupplierInvoiceRecord[]>;
};

export type InvoiceControlPort = {
  getControl(businessId: string): Promise<import("@/modules/procurement/types").InvoiceControlRecord | null>;
  getOrCreateControl(
    businessId: string
  ): Promise<import("@/modules/procurement/types").InvoiceControlRecord>;
};

export type ProcurementApHandoffPort = {
  processHandoff(
    request: import("@/modules/procurement/types").ProcurementApHandoffRequest
  ): Promise<import("@/modules/procurement/types").ProcurementApHandoffResult>;
};

export type ExceptionStorePort = {
  insertException(
    values: Omit<import("@/modules/procurement/types").ExceptionRecord, "createdAt" | "updatedAt" | "deletedAt"> & {
      deletedAt?: Date | null;
    }
  ): Promise<import("@/modules/procurement/types").ExceptionRecord>;
  updateException(
    businessId: string,
    exceptionId: string,
    patch: Partial<
      Omit<
        import("@/modules/procurement/types").ExceptionRecord,
        "id" | "businessId" | "createdAt" | "createdBy"
      >
    >
  ): Promise<import("@/modules/procurement/types").ExceptionRecord>;
  findExceptionById(
    businessId: string,
    exceptionId: string
  ): Promise<import("@/modules/procurement/types").ExceptionRecord | null>;
  findExceptionBySourceKey(
    businessId: string,
    sourceKey: string
  ): Promise<import("@/modules/procurement/types").ExceptionRecord | null>;
  listExceptionsByBusiness(
    businessId: string
  ): Promise<import("@/modules/procurement/types").ExceptionRecord[]>;
  listExceptionsByObject(
    businessId: string,
    objectType: string,
    objectId: string
  ): Promise<import("@/modules/procurement/types").ExceptionRecord[]>;
  countOpenExceptions(businessId: string): Promise<number>;
  insertLinks(
    rows: import("@/modules/procurement/types").ExceptionLinkRecord[]
  ): Promise<void>;
  listLinks(exceptionId: string): Promise<import("@/modules/procurement/types").ExceptionLinkRecord[]>;
  insertAction(
    values: Omit<import("@/modules/procurement/types").ExceptionActionRecord, "createdAt"> & {
      createdAt?: Date;
    }
  ): Promise<import("@/modules/procurement/types").ExceptionActionRecord>;
  listActions(exceptionId: string): Promise<import("@/modules/procurement/types").ExceptionActionRecord[]>;
  listTypes(businessId: string): Promise<import("@/modules/procurement/types").ExceptionTypeRecord[]>;
  insertType(
    values: Omit<import("@/modules/procurement/types").ExceptionTypeRecord, "id">
  ): Promise<import("@/modules/procurement/types").ExceptionTypeRecord>;
};

export type ExceptionControlPort = {
  getControl(businessId: string): Promise<import("@/modules/procurement/types").ExceptionControlRecord | null>;
  getOrCreateControl(
    businessId: string
  ): Promise<import("@/modules/procurement/types").ExceptionControlRecord>;
};

export type ProcurementExceptionBridgePort = {
  raiseSystem(
    input: import("@/modules/procurement/types").RaiseSystemExceptionCommand
  ): Promise<{ exceptionId: string } | null>;
};

export type PerformanceControlPort = {
  getControl(businessId: string): Promise<import("@/modules/procurement/types").PerformanceControlRecord | null>;
  getOrCreateControl(
    businessId: string
  ): Promise<import("@/modules/procurement/types").PerformanceControlRecord>;
  updateControl(
    businessId: string,
    patch: import("@/modules/procurement/types").UpdatePerformanceControlCommand
  ): Promise<import("@/modules/procurement/types").PerformanceControlRecord>;
};

export type PerformanceStorePort = {
  insertEvent(
    values: Omit<import("@/modules/procurement/types").PerformanceEventRecord, "id" | "createdAt">
  ): Promise<import("@/modules/procurement/types").PerformanceEventRecord>;
  listEventsByProfile(
    businessId: string,
    profileId: string,
    from: Date,
    to: Date
  ): Promise<import("@/modules/procurement/types").PerformanceEventRecord[]>;
  listMeasures(businessId: string): Promise<import("@/modules/procurement/types").PerformanceMeasureRecord[]>;
  upsertScorecard(values: {
    id?: string;
    businessId: string;
    profileId: string;
    periodStart: string;
    periodEnd: string;
    compositeScore: string;
    status: string;
    computedAt?: string;
    measures: import("@/modules/procurement/types").ScorecardMeasureView[];
  }): Promise<import("@/modules/procurement/types").SupplierScorecardView>;
  findLatestScorecard(
    businessId: string,
    profileId: string
  ): Promise<import("@/modules/procurement/types").SupplierScorecardView | null>;
  findScorecardById(
    businessId: string,
    scorecardId: string
  ): Promise<import("@/modules/procurement/types").SupplierScorecardView | null>;
  insertProposal(
    values: Omit<
      import("@/modules/procurement/types").GovernanceProposalRecord,
      "id" | "createdAt" | "updatedAt" | "approvedBy" | "approvedAt" | "rejectedAt" | "rejectionReason"
    >
  ): Promise<import("@/modules/procurement/types").GovernanceProposalRecord>;
  updateProposal(
    businessId: string,
    proposalId: string,
    patch: Partial<import("@/modules/procurement/types").GovernanceProposalRecord>
  ): Promise<import("@/modules/procurement/types").GovernanceProposalRecord>;
  findProposalById(
    businessId: string,
    proposalId: string
  ): Promise<import("@/modules/procurement/types").GovernanceProposalRecord | null>;
  listPendingProposals(
    businessId: string,
    profileId: string
  ): Promise<import("@/modules/procurement/types").GovernanceProposalRecord[]>;
  listEvaluationsByProfile(
    businessId: string,
    profileId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<import("@/modules/procurement/types").PerformanceEvaluationRecord[]>;
  upsertEvaluationDraft(
    values: {
      businessId: string;
      profileId: string;
      periodStart: string;
      periodEnd: string;
      evaluatorType: string;
      evaluatorUserId: string | null;
      evaluatorLabel: string | null;
    }
  ): Promise<import("@/modules/procurement/types").PerformanceEvaluationRecord>;
  submitEvaluation(
    businessId: string,
    evaluationId: string,
    ratings: import("@/modules/procurement/types").PerformanceEvaluationRatingInput[],
    compositeScore: string
  ): Promise<import("@/modules/procurement/types").PerformanceEvaluationRecord>;
  findEvaluationById(
    businessId: string,
    evaluationId: string
  ): Promise<import("@/modules/procurement/types").PerformanceEvaluationRecord | null>;
};

export type ProcurementPerformanceBridgePort = {
  recordEvent(
    input: import("@/modules/procurement/types").RecordPerformanceEventCommand
  ): Promise<void>;
};

export type { DocumentNumberingPort };
