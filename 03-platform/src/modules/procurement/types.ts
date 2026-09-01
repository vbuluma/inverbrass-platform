/**
 * Purpose:
 * Domain types for BP-009 IP-01 procurement relationship.
 */

import type {
  ProcurementPermission,
  ProcurementStatusCode,
  QualificationStatusCode,
} from "@/modules/procurement/constants";

export type ProcurementActor = {
  userId: string;
  permissions: readonly string[];
};

export type CatalogueRef = {
  code: string;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
};

export type ProcurementPartyRef = {
  id: string;
  businessId: string;
  displayName: string;
  partyNumber: string;
  partyTypeCode: string;
  hasActiveSupplierRole: boolean;
};

export type ProcurementDocumentRef = {
  id: string;
  partyId: string;
  businessId: string;
  documentTypeCode: string;
  originalFileName: string;
  statusCode: string;
};

export type ProcurementProfileRecord = {
  id: string;
  businessId: string;
  partyId: string;
  profileNumber: string;
  statusCode: string;
  qualificationStatusCode: string;
  isPreferred: boolean;
  isApproved: boolean;
  defaultDeliveryTerms: string | null;
  defaultPaymentTerms: string | null;
  expectedLeadTimeDays: number | null;
  statusReason: string | null;
  statusEffectiveDate: string | null;
  statusReviewDate: string | null;
  statusAuthority: string | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  deletedAt: Date | null;
  version: number;
};

export type ProcurementProfileInsert = Omit<
  ProcurementProfileRecord,
  "createdAt" | "updatedAt" | "deletedAt"
> & {
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
};

export type ProcurementProfilePatch = Partial<
  Omit<ProcurementProfileRecord, "id" | "businessId" | "partyId" | "createdAt" | "createdBy">
>;

export type SupplierQualificationRecord = {
  id: string;
  businessId: string;
  profileId: string;
  qualificationTypeCode: string;
  outcomeCode: string;
  effectiveDate: string;
  expiryDate: string | null;
  reviewDate: string | null;
  reviewerUserId: string | null;
  notes: string | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  deletedAt: Date | null;
  version: number;
  evidenceDocumentIds: string[];
};

export type CreateProcurementProfileCommand = {
  partyId: string;
  assignSupplierRole?: boolean;
  categoryCodes: string[];
  capabilityCodes: string[];
  statusCode?: ProcurementStatusCode;
  isPreferred?: boolean;
  defaultDeliveryTerms?: string | null;
  defaultPaymentTerms?: string | null;
  expectedLeadTimeDays?: number | null;
};

export type UpdateProcurementProfileCommand = {
  categoryCodes?: string[];
  capabilityCodes?: string[];
  defaultDeliveryTerms?: string | null;
  defaultPaymentTerms?: string | null;
  expectedLeadTimeDays?: number | null;
  isApproved?: boolean;
};

export type ChangeProcurementStatusCommand = {
  statusCode: ProcurementStatusCode;
  reason?: string;
  effectiveDate?: string;
  reviewDate?: string;
  authority?: string;
};

export type SetPreferredCommand = {
  isPreferred: boolean;
};

export type RecordQualificationCommand = {
  qualificationTypeCode: string;
  outcomeCode: QualificationStatusCode;
  effectiveDate: string;
  expiryDate?: string | null;
  reviewDate?: string | null;
  notes?: string | null;
  evidenceDocumentIds?: string[];
};

export type SupplierListFilter = {
  query?: string;
  status?: "active" | "preferred" | "pending" | "restricted" | "all";
};

export type SupplierListView = {
  id: string;
  partyId: string;
  partyName: string;
  partyNumber: string;
  profileNumber: string;
  statusCode: string;
  statusLabel: string;
  qualificationStatusCode: string;
  qualificationLabel: string;
  isPreferred: boolean;
  displayStatusLabel: string;
  categories: string[];
  capabilities: string[];
};

export type QualificationView = {
  id: string;
  qualificationTypeCode: string;
  qualificationTypeName: string;
  outcomeCode: string;
  outcomeLabel: string;
  effectiveDate: string;
  expiryDate: string | null;
  reviewDate: string | null;
  reviewerUserId: string | null;
  notes: string | null;
  evidence: ProcurementDocumentRef[];
};

export type EligibilityView = {
  eligible: boolean;
  partyId: string;
  profileId: string | null;
  statusCode: string | null;
  statusLabel: string | null;
  qualificationStatusCode: string | null;
  qualificationLabel: string | null;
  isPreferred: boolean;
  restrictions: string[];
  reasons: string[];
  actionRequired: string | null;
};

export type SupplierProfileView = {
  id: string;
  partyId: string;
  partyName: string;
  partyNumber: string;
  partyHref: string;
  profileNumber: string;
  statusCode: string;
  statusLabel: string;
  displayStatusLabel: string;
  qualificationStatusCode: string;
  qualificationLabel: string;
  isPreferred: boolean;
  isApproved: boolean;
  defaultDeliveryTerms: string | null;
  defaultPaymentTerms: string | null;
  expectedLeadTimeDays: number | null;
  statusReason: string | null;
  statusEffectiveDate: string | null;
  statusReviewDate: string | null;
  statusAuthority: string | null;
  categories: CatalogueRef[];
  capabilities: CatalogueRef[];
  qualifications: QualificationView[];
  eligibility: EligibilityView;
  activity: ProcurementActivityView[];
  canEdit: boolean;
  canQualify: boolean;
  canChangeStatus: boolean;
  canSetPreferred: boolean;
  canBlacklist: boolean;
};

export type ProcurementActivityView = {
  id: string;
  action: string;
  summary: string;
  occurredAt: string;
};

export type ProcurementDashboardView = {
  activeCount: number;
  preferredCount: number;
  pendingQualificationCount: number;
  restrictedCount: number;
  recent: SupplierListView[];
  requestDraftCount: number;
  requestPendingApprovalCount: number;
  requestApprovedCount: number;
  recentRequests: PurchaseRequestListView[];
  openExceptionCount: number;
};

export type ProcurementCataloguesView = {
  categories: CatalogueRef[];
  capabilities: CatalogueRef[];
  statuses: CatalogueRef[];
  qualificationStatuses: CatalogueRef[];
  qualificationTypes: CatalogueRef[];
};

export type ProcurementAuditRecord = {
  businessId: string;
  actorUserId: string | null;
  entityId: string;
  action: string;
  outcome: string;
  reason?: string;
  references?: Record<string, string | null | undefined>;
  timestamp?: string;
};

export type { ProcurementPermission };

export type PurchaseRequestLineDraft = {
  catalogueItemId?: string | null;
  description: string;
  specification?: string | null;
  quantity: string;
  uom: string;
  estimatedValue: string;
  requiredDate?: string | null;
};

export type PurchaseRequestLineRecord = PurchaseRequestLineDraft & {
  id: string;
  requestId: string;
  businessId: string;
  lineNumber: number;
};

export type PurchaseRequestDocumentRecord = {
  id: string;
  requestId: string;
  businessId: string;
  documentTypeCode: string;
  originalFileName: string;
  storageReference: string;
};

export type PurchaseRequestRecord = {
  id: string;
  businessId: string;
  requestNumber: string;
  status: string;
  originType: string;
  originReference: string | null;
  requesterUserId: string | null;
  businessUnitCode: string | null;
  procurementType: string;
  justification: string | null;
  requiredDate: string | null;
  deliveryLocation: string | null;
  estimatedValue: string;
  currencyCode: string;
  budgetSource: string;
  budgetReference: string | null;
  budgetLine: string | null;
  budgetPeriod: string | null;
  budgetApprovedAmount: string | null;
  budgetAvailableAmount: string | null;
  budgetCheckStatus: string;
  budgetApprovalReference: string | null;
  budgetApprovalDate: string | null;
  budgetApprover: string | null;
  suggestedProfileId: string | null;
  submittedAt: Date | null;
  submittedBy: string | null;
  approvedAt: Date | null;
  approvedBy: string | null;
  rejectedAt: Date | null;
  rejectedBy: string | null;
  returnedAt: Date | null;
  returnedBy: string | null;
  cancelledAt: Date | null;
  cancelledBy: string | null;
  decisionReason: string | null;
  idempotencyKey: string | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  deletedAt: Date | null;
  version: number;
};

export type PurchaseRequestInsert = Omit<
  PurchaseRequestRecord,
  "createdAt" | "updatedAt" | "deletedAt"
> & {
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
};

export type PurchaseRequestPatch = Partial<
  Omit<PurchaseRequestRecord, "id" | "businessId" | "requestNumber" | "createdAt" | "createdBy">
>;

export type CreatePurchaseRequestCommand = {
  originType?: string;
  originReference?: string | null;
  businessUnitCode?: string | null;
  procurementType: string;
  justification?: string | null;
  requiredDate?: string | null;
  deliveryLocation?: string | null;
  currencyCode: string;
  budgetSource: string;
  budgetReference?: string | null;
  budgetLine?: string | null;
  budgetPeriod?: string | null;
  budgetApprovedAmount?: string | null;
  budgetAvailableAmount?: string | null;
  budgetApprovalReference?: string | null;
  budgetApprovalDate?: string | null;
  budgetApprover?: string | null;
  suggestedProfileId?: string | null;
  idempotencyKey?: string | null;
  lines: PurchaseRequestLineDraft[];
};

export type UpdatePurchaseRequestCommand = Partial<
  Omit<CreatePurchaseRequestCommand, "idempotencyKey">
>;

export type AttachPurchaseRequestDocumentCommand = {
  documentTypeCode: string;
  originalFileName: string;
  storageReference: string;
};

export type PurchaseRequestDecisionCommand = {
  reason?: string;
};

export type PurchaseRequestListFilter = {
  query?: string;
  status?:
    | "all"
    | "draft"
    | "pending-approval"
    | "approved"
    | "returned"
    | "rejected"
    | "cancelled"
    | "mine";
};

export type PurchaseRequestListView = {
  id: string;
  requestNumber: string;
  need: string;
  estimatedValue: string;
  currencyCode: string;
  status: string;
  statusLabel: string;
  originType: string;
  originLabel: string;
  requesterUserId: string | null;
  createdAt: string;
};

export type PurchaseRequestView = {
  id: string;
  requestNumber: string;
  status: string;
  statusLabel: string;
  originType: string;
  originLabel: string;
  originReference: string | null;
  requesterUserId: string | null;
  businessUnitCode: string | null;
  procurementType: string;
  procurementTypeLabel: string;
  justification: string | null;
  requiredDate: string | null;
  deliveryLocation: string | null;
  estimatedValue: string;
  currencyCode: string;
  budgetSource: string;
  budgetSourceLabel: string;
  budgetReference: string | null;
  budgetLine: string | null;
  budgetPeriod: string | null;
  budgetApprovedAmount: string | null;
  budgetAvailableAmount: string | null;
  budgetCheckStatus: string;
  budgetCheckLabel: string;
  budgetApprovalReference: string | null;
  budgetApprovalDate: string | null;
  budgetApprover: string | null;
  suggestedProfileId: string | null;
  suggestedSupplierEligible: boolean | null;
  suggestedSupplierReason: string | null;
  decisionReason: string | null;
  submittedAt: string | null;
  submittedBy: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  rejectedAt: string | null;
  rejectedBy: string | null;
  returnedAt: string | null;
  returnedBy: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  lines: PurchaseRequestLineRecord[];
  documents: PurchaseRequestDocumentRecord[];
  readyForSourcing: boolean;
  canEdit: boolean;
  canSubmit: boolean;
  canApprove: boolean;
  canCancel: boolean;
  activity: ProcurementActivityView[];
};

export type PurchaseRequestControlRecord = {
  businessId: string;
  requiresApproval: boolean;
  overBudgetMode: string;
};

export type ReorderOriginSnapshot = {
  reference: string;
  description: string;
  recommendedQuantity: string;
};

export type SuggestedSupplierSnapshot = {
  profileId: string;
  partyId: string;
  party: ProcurementPartyRef;
  profile: ProcurementProfileRecord;
  latestQualification: SupplierQualificationRecord | null;
};

export type ApprovedRequestBudget = {
  id: string;
  requestNumber: string;
  status: string;
  estimatedValue: string;
  currencyCode: string;
};

export type CommercialOutcome = import("@/modules/procurement/services/evaluation-outcome-rules").CommercialOutcome;
export type CommercialLabels = import("@/modules/procurement/services/evaluation-outcome-rules").CommercialLabels;

export type SourcingEventListFilter = {
  query?: string;
  view?: "rfx" | "evaluations" | "awards";
};

export type SourcingEventListView = {
  id: string;
  eventNumber: string;
  title: string;
  status: string;
  statusLabel: string;
  rfxType: string;
  currencyCode: string;
  budgetedAmount: string;
  budgetedAmountLabel: string;
  quoteCount: number;
  awardCount: number;
  closesAt: string;
  biddingOpen: boolean;
};

export type EvaluationPhaseView = {
  phaseCode: string;
  phaseLabel: string;
  included: boolean;
  sequence: number;
  weight: string;
  passmark: string;
  required: boolean;
};

export type SourcingQuoteVersion = {
  id: string;
  version: number;
  amount: string;
  currencyCode: string;
  amountLabel: string;
  submittedAt: string;
  status: string;
  statusLabel: string;
  comments: string | null;
  deliveryLeadDays: number | null;
  warrantyNotes: string | null;
  year1Amount: string | null;
  tcvAmount: string | null;
  tcoAmount: string | null;
  capturedOnBehalf: boolean;
  lines: Array<{
    sequence: number;
    description: string;
    quantity: string;
    unitPrice: string;
    taxRate: string;
    lineTotal: string;
    lineTotalLabel: string;
  }>;
  paymentTerms: Array<{
    sequence: number;
    milestoneName: string;
    percentage: string;
    amount: string | null;
    triggerEvent: string | null;
    duePeriodDays: number | null;
    comments: string | null;
  }>;
};

export type SupplierInvitationStatusView = {
  profileId: string;
  partyName: string;
  accessToken: string;
  responseStatus: string;
  responseStatusLabel: string;
  openedAt: string | null;
  hasSubmitted: boolean;
  withdrawn: boolean;
};

export type ClarificationView = {
  id: string;
  profileId: string | null;
  partyName: string | null;
  question: string;
  answer: string | null;
  isBroadcast: boolean;
  createdAt: string;
  answeredAt: string | null;
};

export type SupplierCommercialRow = {
  profileId: string;
  partyName: string;
  outcome: CommercialOutcome;
  labels: CommercialLabels;
  awarded: boolean;
  finalExceedsInitial: boolean;
  technicalScore: string | null;
  financialScore: string | null;
  overallScore: string | null;
  rank: number | null;
  technicallyQualified: boolean;
  recommended: boolean;
  winningQuoteId: string | null;
};

export type EvaluationCommitteeMemberView = {
  id: string;
  sequence: number;
  memberName: string;
  roleLabel: string | null;
};

export type EvaluationWorkspaceView = {
  id: string;
  eventNumber: string;
  title: string;
  rfxType: string;
  status: string;
  statusLabel: string;
  evaluationStage: string;
  evaluationStageLabel: string;
  currencyCode: string;
  budgetedAmount: string;
  budgetedAmountLabel: string;
  purchaseRequestNumbers: string[];
  recommendation: string | null;
  recommendedProfileIds: string[];
  bidsOpenedAt: string | null;
  comparison: SupplierCommercialRow[];
  commercialSealed: boolean;
  bidsReceivedCount: number;
  bidSubmissionCountVisible: boolean;
  invitations: SupplierInvitationStatusView[];
  clarifications: ClarificationView[];
  committeeMembers: EvaluationCommitteeMemberView[];
  awards: Array<{
    profileId: string;
    partyName: string;
    allocatedBudgetAmount: string;
    allocatedBudgetLabel: string;
    outcome: CommercialOutcome;
    labels: CommercialLabels;
  }>;
  closesAt: string;
  originalClosesAt: string;
  closedAt: string | null;
  evaluationStartedAt: string | null;
  biddingOpen: boolean;
  riskLevel: string;
  openingPolicy: string;
  openingPolicyLabel: string;
  openingPolicySource: string;
  evaluationMethod: string;
  evaluationMethodLabel: string;
  technicalWeight: string;
  financialWeight: string;
  financialBasis: string;
  phases: EvaluationPhaseView[];
  dueDiligenceRequired: boolean | null;
  dueDiligenceLocationVerified: boolean;
  dueDiligenceStaffVerified: boolean;
  dueDiligenceLegalVerified: boolean;
  dueDiligenceOtherNotes: string | null;
  dueDiligenceComplete: boolean;
  canCloseTender: boolean;
  canSetupCommittee: boolean;
  canConfigureCriteria: boolean;
  canLockCriteria: boolean;
  criteriaLockedAt: string | null;
  criteriaSnapshotHash: string | null;
  methodologyExplanation: string | null;
  lineComparison: Array<{
    sequence: number;
    description: string;
    suppliers: Array<{
      profileId: string;
      partyName: string;
      lineTotal: string;
      lineTotalLabel: string;
    }>;
  }>;
  awardApprovalStatus: string | null;
  awardRequiresApproval: boolean;
  canApproveAward: boolean;
  canStartEvaluation: boolean;
  canOpenBids: boolean;
  canRecordPhaseScores: boolean;
  openingRequiresChecker: boolean;
  canRecordDueDiligence: boolean;
  canInvite: boolean;
  canRecordQuote: boolean;
  canAward: boolean;
  canExtend: boolean;
  extensionRequiresApproval: boolean;
};

export type SupplierPortalView = {
  eventTitle: string;
  eventNumber: string;
  currencyCode: string;
  closesAt: string;
  biddingOpen: boolean;
  canSubmit: boolean;
  canWithdraw: boolean;
  ownQuotes: SourcingQuoteVersion[];
  currentAmount: string | null;
  clarifications: ClarificationView[];
};

export type SubmitQuoteCommand = {
  amount?: string | null;
  profileId?: string;
  comments?: string | null;
  deliveryLeadDays?: number | null;
  warrantyNotes?: string | null;
  year1Amount?: string | null;
  tcvAmount?: string | null;
  tcoAmount?: string | null;
  lines?: Array<{
    description: string;
    quantity: string;
    unitPrice: string;
    taxRate?: string | null;
  }>;
  paymentTerms?: Array<{
    milestoneName: string;
    percentage: string;
    amount?: string | null;
    triggerEvent?: string | null;
    duePeriodDays?: number | null;
    comments?: string | null;
  }>;
  idempotencyKey?: string | null;
  capturedOnBehalf?: boolean;
};

export type AskClarificationCommand = {
  question: string;
  profileId?: string | null;
};

export type AnswerClarificationCommand = {
  clarificationId: string;
  answer: string;
};

export type SetupEvaluationCommitteeCommand = {
  members: Array<{
    memberName: string;
    roleLabel?: string | null;
    userId?: string | null;
  }>;
};

export type ConfigureEvaluationCriteriaCommand = {
  evaluationMethod: string;
  technicalWeight?: string | null;
  financialWeight?: string | null;
  financialBasis?: string | null;
  phases?: Array<{
    phaseCode: string;
    included: boolean;
    sequence?: number;
    weight: string;
    passmark: string;
    required: boolean;
  }>;
};

export type RecordDueDiligenceCommand = {
  required: boolean;
  locationVerified?: boolean;
  staffVerified?: boolean;
  legalVerified?: boolean;
  otherNotes?: string | null;
};

export type InviteSupplierCommand = {
  profileId: string;
};

export type ExtendTenderCommand = {
  closesAt: string;
  reason?: string;
};

export type CreateSourcingEventCommand = {
  title: string;
  rfxType?: string;
  purchaseRequestIds: string[];
  closesAt?: string | null;
  riskLevel?: string | null;
  categoryCode?: string | null;
  requestedOpeningPolicy?: string | null;
};

export type OpenBidsCommand = {
  openingApprovedBy?: string | null;
};

export type RecordPhaseScoresCommand = {
  profileId: string;
  scores: Array<{
    phaseCode: string;
    score: string;
  }>;
};

export type AwardSupplierCommand = {
  profileId: string;
  allocatedBudgetAmount?: string | null;
  winningQuoteId?: string | null;
};

export type AwardLineSelectionCommand = {
  lineSequence: number;
  profileId: string;
  winningQuoteLineId?: string | null;
};

export type AwardSourcingCommand = {
  recommendation?: string | null;
  overrideReason?: string | null;
  awards?: AwardSupplierCommand[];
  lineAwards?: AwardLineSelectionCommand[];
};

export type PurchaseOrderControlRecord = {
  businessId: string;
  requiresApproval: boolean;
  skipRfxEnabled: boolean;
  skipRfxMaxAmount: string | null;
  materialAmendmentThreshold: string | null;
};

export type PurchaseOrderRecord = {
  id: string;
  businessId: string;
  poNumber: string;
  profileId: string;
  sourceType: string;
  purchaseRequestId: string | null;
  sourcingEventId: string | null;
  awardId: string | null;
  contractId: string | null;
  contractVersionId: string | null;
  callOffReference: string | null;
  winningQuoteId: string | null;
  currencyCode: string;
  status: string;
  currentVersionId: string | null;
  acceptedVersionId: string | null;
  subtotalAmount: string;
  taxAmount: string;
  totalAmount: string;
  year1Amount: string | null;
  tcvAmount: string | null;
  tcoAmount: string | null;
  deliveryLocation: string | null;
  warrantyNotes: string | null;
  termsAndConditions: string | null;
  submittedAt: Date | null;
  submittedBy: string | null;
  approvedAt: Date | null;
  approvedBy: string | null;
  issuedAt: Date | null;
  issuedBy: string | null;
  acceptedAt: Date | null;
  cancelledAt: Date | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  closedAt: Date | null;
  closedBy: string | null;
  closureReason: string | null;
  issueIdempotencyKey: string | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  deletedAt: Date | null;
};

export type PurchaseOrderInsert = Omit<
  PurchaseOrderRecord,
  "createdAt" | "updatedAt" | "deletedAt"
> & {
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
};

export type PurchaseOrderPatch = Partial<
  Omit<PurchaseOrderRecord, "id" | "businessId" | "poNumber" | "createdAt" | "createdBy">
>;

export type PurchaseOrderVersionRecord = {
  id: string;
  businessId: string;
  purchaseOrderId: string;
  versionNumber: number;
  status: string;
  subtotalAmount: string;
  taxAmount: string;
  totalAmount: string;
  year1Amount: string | null;
  tcvAmount: string | null;
  tcoAmount: string | null;
  promisedDeliveryDate: string | null;
  warrantyNotes: string | null;
  termsAndConditions: string | null;
  issuedAt: Date | null;
  issuedBy: string | null;
  supersededAt: Date | null;
  createdAt: Date;
  createdBy: string | null;
};

export type PoLineRecord = {
  id: string;
  businessId: string;
  versionId: string;
  awardLineId: string | null;
  quoteLineId: string | null;
  purchaseRequestLineId: string | null;
  catalogueItemId: string | null;
  sequence: number;
  description: string;
  quantity: string;
  uom: string;
  unitPrice: string;
  taxRate: string;
  lineSubtotal: string;
  lineTax: string;
  lineTotal: string;
  promisedDeliveryDate: string | null;
  deliveryLocation: string | null;
  comments: string | null;
  lineType: string;
};

export type PoLineDraft = {
  description: string;
  quantity: string;
  uom?: string | null;
  unitPrice: string;
  taxRate?: string | null;
  awardLineId?: string | null;
  quoteLineId?: string | null;
  purchaseRequestLineId?: string | null;
  catalogueItemId?: string | null;
  promisedDeliveryDate?: string | null;
  deliveryLocation?: string | null;
  comments?: string | null;
  lineType?: string | null;
};

export type PoPaymentTermRecord = {
  id: string;
  businessId: string;
  versionId: string;
  sequence: number;
  milestoneName: string;
  percentage: string;
  amount: string | null;
  triggerEvent: string | null;
  duePeriodDays: number | null;
  comments: string | null;
};

export type PoPaymentTermDraft = {
  milestoneName: string;
  percentage: string;
  amount?: string | null;
  triggerEvent?: string | null;
  duePeriodDays?: number | null;
  comments?: string | null;
};

export type PoSupplierTokenRecord = {
  id: string;
  businessId: string;
  purchaseOrderId: string;
  versionId: string;
  profileId: string;
  accessToken: string;
  tokenExpiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
};

export type PoSupplierResponseRecord = {
  id: string;
  businessId: string;
  purchaseOrderId: string;
  versionId: string;
  profileId: string;
  actionType: string;
  reason: string | null;
  idempotencyKey: string | null;
  createdAt: Date;
};

export type PoLineView = {
  id: string;
  sequence: number;
  description: string;
  quantity: string;
  uom: string;
  unitPrice: string;
  taxRate: string;
  lineSubtotal: string;
  lineTax: string;
  lineTotal: string;
  promisedDeliveryDate: string | null;
  deliveryLocation: string | null;
  comments: string | null;
  lineType: string;
  orderedQuantity: string;
  receivedQuantity: string;
  outstandingQuantity: string;
  fulfilmentStatus: string;
  fulfilmentStatusLabel: string;
  lastReceiptDate: string | null;
  isOverdue: boolean;
};

export type PoPaymentTermView = {
  sequence: number;
  milestoneName: string;
  percentage: string;
  amount: string | null;
  triggerEvent: string | null;
  duePeriodDays: number | null;
  comments: string | null;
};

export type PoVersionView = {
  id: string;
  versionNumber: number;
  status: string;
  subtotalAmount: string;
  taxAmount: string;
  totalAmount: string;
  issuedAt: string | null;
  supersededAt: string | null;
  lines: PoLineView[];
  paymentTerms: PoPaymentTermView[];
};

export type PurchaseOrderListView = {
  id: string;
  poNumber: string;
  supplierName: string;
  status: string;
  statusLabel: string;
  sourceType: string;
  totalAmount: string;
  currencyCode: string;
  issuedAt: string | null;
  createdAt: string;
};

export type PurchaseOrderListFilter = {
  query?: string;
  status?: "all" | "draft" | "pending-approval" | "issued" | "accepted" | "closed" | "cancelled";
};

export type PurchaseOrderView = {
  id: string;
  poNumber: string;
  profileId: string;
  supplierName: string;
  sourceType: string;
  purchaseRequestId: string | null;
  sourcingEventId: string | null;
  awardId: string | null;
  contractId: string | null;
  contractVersionId: string | null;
  callOffReference: string | null;
  winningQuoteId: string | null;
  currencyCode: string;
  status: string;
  statusLabel: string;
  subtotalAmount: string;
  taxAmount: string;
  totalAmount: string;
  year1Amount: string | null;
  tcvAmount: string | null;
  tcoAmount: string | null;
  deliveryLocation: string | null;
  warrantyNotes: string | null;
  termsAndConditions: string | null;
  currentVersion: PoVersionView | null;
  versions: PoVersionView[];
  canSubmit: boolean;
  canApprove: boolean;
  canIssue: boolean;
  canAmend: boolean;
  canCancel: boolean;
  canClose: boolean;
  submittedAt: string | null;
  approvedAt: string | null;
  issuedAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
};

export type PoSupplierPortalView = {
  poNumber: string;
  supplierName: string;
  status: string;
  statusLabel: string;
  currencyCode: string;
  totalAmount: string;
  lines: PoLineView[];
  paymentTerms: PoPaymentTermView[];
  warrantyNotes: string | null;
  termsAndConditions: string | null;
  canAccept: boolean;
  canReject: boolean;
  canRequestChange: boolean;
};

export type GeneratePoFromAwardCommand = {
  awardId: string;
};

export type GeneratePoFromPurchaseRequestCommand = {
  purchaseRequestId: string;
  profileId?: string | null;
};

export type AmendPurchaseOrderCommand = {
  lines: PoLineDraft[];
  paymentTerms?: PoPaymentTermDraft[];
  deliveryLocation?: string | null;
  warrantyNotes?: string | null;
  termsAndConditions?: string | null;
  promisedDeliveryDate?: string | null;
};

export type PoDecisionCommand = {
  reason?: string | null;
};

export type IssuePurchaseOrderCommand = {
  idempotencyKey?: string | null;
};

export type PoSupplierActionCommand = {
  reason?: string | null;
  idempotencyKey?: string | null;
};

export type RecordPoFulfilmentCommand = {
  fullyFulfilled: boolean;
};

export type ContractControlRecord = {
  businessId: string;
  requiresApproval: boolean;
  requiresExecutionEvidence: boolean;
  materialAmendmentThreshold: string | null;
  expiryWarningDays: number;
  directContractFromPrEnabled: boolean;
};

export type ContractRecord = {
  id: string;
  businessId: string;
  contractNumber: string;
  profileId: string;
  contractTypeCode: string;
  title: string;
  description: string | null;
  status: string;
  sourceType: string;
  purchaseRequestId: string | null;
  sourcingEventId: string | null;
  awardId: string | null;
  winningQuoteId: string | null;
  currencyCode: string;
  valueType: string;
  totalValue: string | null;
  annualValue: string | null;
  callOffCeiling: string | null;
  categoryCode: string | null;
  ownerUserId: string | null;
  ownerName: string | null;
  currentVersionId: string | null;
  startDate: string | null;
  endDate: string | null;
  executionDate: string | null;
  renewalOption: boolean;
  noticePeriodDays: number | null;
  callOffsPermitted: boolean;
  executionEvidenceDocumentId: string | null;
  submittedAt: Date | null;
  submittedBy: string | null;
  approvedAt: Date | null;
  approvedBy: string | null;
  rejectedAt: Date | null;
  rejectedBy: string | null;
  rejectionReason: string | null;
  activatedAt: Date | null;
  activatedBy: string | null;
  suspendedAt: Date | null;
  suspendedBy: string | null;
  suspensionReason: string | null;
  terminatedAt: Date | null;
  terminatedBy: string | null;
  terminationReason: string | null;
  closedAt: Date | null;
  closedBy: string | null;
  closureReason: string | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  deletedAt: Date | null;
};

export type ContractInsert = Omit<ContractRecord, "createdAt" | "updatedAt" | "deletedAt"> & {
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
};

export type ContractPatch = Partial<
  Omit<ContractRecord, "id" | "businessId" | "contractNumber" | "createdAt" | "createdBy">
>;

export type ContractVersionRecord = {
  id: string;
  businessId: string;
  contractId: string;
  versionNumber: number;
  status: string;
  changeReason: string | null;
  effectiveDate: string | null;
  valueType: string;
  totalValue: string | null;
  annualValue: string | null;
  callOffCeiling: string | null;
  startDate: string | null;
  endDate: string | null;
  renewalOption: boolean;
  noticePeriodDays: number | null;
  callOffsPermitted: boolean;
  supersededAt: Date | null;
  createdAt: Date;
  createdBy: string | null;
};

export type ContractPeriodValueRecord = {
  id: string;
  businessId: string;
  versionId: string;
  periodYear: number;
  sequence: number;
  amount: string;
  description: string | null;
};

export type ContractPaymentTermRecord = {
  id: string;
  businessId: string;
  versionId: string;
  sequence: number;
  milestoneName: string;
  percentage: string;
  amount: string | null;
  triggerEvent: string | null;
  duePeriodDays: number | null;
  comments: string | null;
};

export type ContractPeriodValueView = {
  periodYear: number;
  amount: string;
  amountLabel: string;
  description: string | null;
};

export type ContractPaymentTermView = {
  sequence: number;
  milestoneName: string;
  percentage: string;
  amount: string | null;
  triggerEvent: string | null;
  duePeriodDays: number | null;
  comments: string | null;
};

export type ContractVersionView = {
  id: string;
  versionNumber: number;
  status: string;
  changeReason: string | null;
  effectiveDate: string | null;
  totalValue: string | null;
  totalValueLabel: string | null;
  annualValue: string | null;
  callOffCeiling: string | null;
  startDate: string | null;
  endDate: string | null;
  periodValues: ContractPeriodValueView[];
  paymentTerms: ContractPaymentTermView[];
  createdAt: string;
};

export type ContractPoSummaryView = {
  poId: string;
  poNumber: string;
  status: string;
  statusLabel: string;
  totalAmount: string;
  totalAmountLabel: string;
  contractVersionId: string | null;
  createdAt: string;
};

export type ContractListView = {
  id: string;
  contractNumber: string;
  title: string;
  supplierName: string;
  contractTypeCode: string;
  status: string;
  statusLabel: string;
  startDate: string | null;
  endDate: string | null;
  totalValueLabel: string | null;
  currencyCode: string;
  ownerName: string | null;
  relatedPoCount: number;
};

export type ContractDashboardView = {
  activeCount: number;
  pendingApprovalCount: number;
  pendingExecutionCount: number;
  expiringSoonCount: number;
  expiredCount: number;
  withRemainingCallOffCount: number;
};

export type ContractView = {
  id: string;
  contractNumber: string;
  title: string;
  description: string | null;
  profileId: string;
  partyName: string;
  contractTypeCode: string;
  status: string;
  statusLabel: string;
  sourceType: string;
  purchaseRequestId: string | null;
  purchaseRequestNumber: string | null;
  sourcingEventId: string | null;
  sourcingEventNumber: string | null;
  awardId: string | null;
  currencyCode: string;
  valueType: string;
  totalValue: string | null;
  totalValueLabel: string | null;
  annualValue: string | null;
  annualValueLabel: string | null;
  callOffCeiling: string | null;
  callOffCeilingLabel: string | null;
  committedAmount: string | null;
  committedAmountLabel: string | null;
  remainingAmount: string | null;
  remainingAmountLabel: string | null;
  categoryCode: string | null;
  ownerName: string | null;
  startDate: string | null;
  endDate: string | null;
  executionDate: string | null;
  renewalOption: boolean;
  noticePeriodDays: number | null;
  callOffsPermitted: boolean;
  executionEvidenceDocumentId: string | null;
  currentVersion: ContractVersionView | null;
  versions: ContractVersionView[];
  paymentTerms: ContractPaymentTermView[];
  periodValues: ContractPeriodValueView[];
  relatedPurchaseOrders: ContractPoSummaryView[];
  canSubmit: boolean;
  canApprove: boolean;
  canReject: boolean;
  canMarkPendingExecution: boolean;
  canActivate: boolean;
  canAmend: boolean;
  canRenew: boolean;
  canSuspend: boolean;
  canTerminate: boolean;
  canClose: boolean;
  canCreateCallOff: boolean;
};

export type ContractListFilter = {
  status?: string | null;
  profileId?: string | null;
  contractTypeCode?: string | null;
  ownerUserId?: string | null;
  categoryCode?: string | null;
  expiringOnly?: boolean;
};

export type ContractPaymentTermInput = {
  milestoneName: string;
  percentage: string;
  amount?: string | null;
  triggerEvent?: string | null;
  duePeriodDays?: number | null;
  comments?: string | null;
  sequence?: number;
};

export type CreateContractCommand = {
  profileId: string;
  contractTypeCode: string;
  title: string;
  description?: string | null;
  currencyCode: string;
  valueType: string;
  totalValue?: string | null;
  annualValue?: string | null;
  callOffCeiling?: string | null;
  categoryCode?: string | null;
  ownerName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  executionDate?: string | null;
  renewalOption?: boolean;
  noticePeriodDays?: number | null;
  callOffsPermitted?: boolean;
  paymentTerms?: ContractPaymentTermInput[];
  periodValues?: Array<{ periodYear: number; amount: string; description?: string | null }>;
};

export type GenerateContractFromAwardCommand = { awardId: string };
export type GenerateContractFromPurchaseRequestCommand = {
  purchaseRequestId: string;
  profileId?: string | null;
};

export type AmendContractCommand = {
  changeReason: string;
  title?: string | null;
  description?: string | null;
  totalValue?: string | null;
  annualValue?: string | null;
  callOffCeiling?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  renewalOption?: boolean | null;
  noticePeriodDays?: number | null;
  callOffsPermitted?: boolean | null;
  paymentTerms?: ContractPaymentTermInput[];
  periodValues?: Array<{ periodYear: number; amount: string; description?: string | null }>;
};

export type RenewContractCommand = AmendContractCommand;

export type ContractDecisionCommand = { reason?: string | null };

export type ActivateContractCommand = {
  executionEvidenceDocumentId?: string | null;
  executionDate?: string | null;
};

export type CreateContractCallOffCommand = {
  description: string;
  quantity?: string | null;
  unitPrice?: string | null;
  amount?: string | null;
  callOffReference?: string | null;
};

export type GeneratePoFromContractCommand = {
  contractId: string;
  description: string;
  quantity?: string | null;
  unitPrice?: string | null;
  amount?: string | null;
  callOffReference?: string | null;
};

export type ReceivingControlRecord = {
  businessId: string;
  overReceiptPolicy: string;
  requiresSupplierAcceptance: boolean;
  requiresReceiptConfirmation: boolean;
};

export type ReceiptRecord = {
  id: string;
  businessId: string;
  receiptNumber: string;
  receiptType: string;
  status: string;
  purchaseOrderId: string;
  purchaseOrderVersionId: string;
  profileId: string;
  receiptDate: string;
  receiverUserId: string | null;
  deliveryLocation: string | null;
  inspectionStatus: string;
  inspectionNotes: string | null;
  inspectedAt: Date | null;
  inspectedBy: string | null;
  servicePeriodStart: string | null;
  servicePeriodEnd: string | null;
  assetCondition: string | null;
  comments: string | null;
  evidenceDocumentId: string | null;
  overDeliveryFlag: boolean;
  submittedAt: Date | null;
  submittedBy: string | null;
  confirmedAt: Date | null;
  confirmedBy: string | null;
  rejectedAt: Date | null;
  rejectedBy: string | null;
  rejectionReason: string | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  deletedAt: Date | null;
};

export type ReceiptLineRecord = {
  id: string;
  businessId: string;
  receiptId: string;
  poLineId: string;
  lineType: string;
  sequence: number;
  description: string;
  quantityReceived: string;
  uom: string;
  catalogueItemId: string | null;
  stockItemId: string | null;
  discrepancyType: string | null;
  discrepancyDescription: string | null;
  damageFlag: boolean;
};

export type ReceiptHandoffRecord = {
  id: string;
  businessId: string;
  receiptId: string;
  receiptLineId: string;
  handoffType: string;
  status: string;
  idempotencyKey: string;
  downstreamSystem: string;
  downstreamReference: string | null;
  errorMessage: string | null;
  attemptedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ReceiptLineInput = {
  poLineId: string;
  quantityReceived: string;
  discrepancyType?: string | null;
  discrepancyDescription?: string | null;
  damageFlag?: boolean;
  stockItemId?: string | null;
};

export type CreateReceiptCommand = {
  purchaseOrderId: string;
  receiptDate?: string | null;
  deliveryLocation?: string | null;
  comments?: string | null;
  evidenceDocumentId?: string | null;
  servicePeriodStart?: string | null;
  servicePeriodEnd?: string | null;
  assetCondition?: string | null;
  inspectionStatus?: string | null;
  lines: ReceiptLineInput[];
};

export type ReceiptDecisionCommand = { reason?: string | null };

export type RecordInspectionCommand = {
  inspectionStatus: string;
  inspectionNotes?: string | null;
};

export type RecordDiscrepancyCommand = {
  receiptLineId: string;
  discrepancyType: string;
  discrepancyDescription?: string | null;
  damageFlag?: boolean;
};

export type ReceiptHandoffView = {
  id: string;
  handoffType: string;
  status: string;
  downstreamSystem: string;
  downstreamReference: string | null;
  errorMessage: string | null;
};

export type ReceiptLineView = {
  id: string;
  poLineId: string;
  lineType: string;
  description: string;
  quantityReceived: string;
  uom: string;
  discrepancyType: string | null;
  discrepancyDescription: string | null;
  damageFlag: boolean;
  handoff: ReceiptHandoffView | null;
};

export type ReceiptListView = {
  id: string;
  receiptNumber: string;
  receiptType: string;
  status: string;
  statusLabel: string;
  purchaseOrderId: string;
  poNumber: string;
  supplierName: string;
  receiptDate: string;
  receiverName: string | null;
  handoffStatus: string | null;
  inspectionStatus: string;
  hasDiscrepancy: boolean;
};

export type ReceiptView = {
  id: string;
  receiptNumber: string;
  receiptType: string;
  status: string;
  statusLabel: string;
  purchaseOrderId: string;
  poNumber: string;
  purchaseOrderVersionId: string;
  supplierName: string;
  receiptDate: string;
  deliveryLocation: string | null;
  inspectionStatus: string;
  inspectionNotes: string | null;
  servicePeriodStart: string | null;
  servicePeriodEnd: string | null;
  assetCondition: string | null;
  comments: string | null;
  evidenceDocumentId: string | null;
  overDeliveryFlag: boolean;
  lines: ReceiptLineView[];
  canSubmit: boolean;
  canConfirm: boolean;
  canReject: boolean;
  canRecordInspection: boolean;
};

export type PoLineFulfilmentView = {
  poLineId: string;
  lineType: string;
  description: string;
  orderedQuantity: string;
  receivedQuantity: string;
  outstandingQuantity: string;
  promisedDeliveryDate: string | null;
  lastReceiptDate: string | null;
  fulfilmentStatus: string;
  fulfilmentStatusLabel: string;
  isOverdue: boolean;
  receiptType: string;
};

export type PoFulfilmentSummaryView = {
  purchaseOrderId: string;
  poNumber: string;
  fulfilmentStatus: string;
  fulfilmentStatusLabel: string;
  lines: PoLineFulfilmentView[];
  receipts: Array<{
    id: string;
    receiptNumber: string;
    receiptType: string;
    status: string;
    receiptDate: string;
    handoffStatus: string | null;
  }>;
};

export type ProcurementInventoryHandoffRequest = {
  businessId: string;
  receiptId: string;
  receiptLineId: string;
  purchaseOrderId: string;
  purchaseOrderVersionId: string;
  poLineId: string;
  catalogueItemId: string | null;
  stockItemId: string | null;
  quantity: string;
  uom: string;
  deliveryLocation: string | null;
  receiptDate: string;
  receiverUserId: string | null;
  idempotencyKey: string;
};

export type ProcurementInventoryHandoffResult = {
  success: boolean;
  movementReference: string | null;
  errorMessage: string | null;
};

export type ProcurementAssetHandoffRequest = {
  businessId: string;
  receiptId: string;
  receiptLineId: string;
  purchaseOrderId: string;
  poLineId: string;
  description: string;
  quantity: string;
  assetCondition: string | null;
  deliveryLocation: string | null;
  receiptDate: string;
  idempotencyKey: string;
};

export type ProcurementAssetHandoffResult = {
  success: boolean;
  handoffReference: string | null;
  errorMessage: string | null;
};

export type InvoiceControlRecord = {
  businessId: string;
  defaultMatchingMode: string;
  priceTolerancePercent: string;
  quantityTolerancePercent: string;
  taxToleranceAmount: string;
  duplicatePolicy: string;
  duplicateCheckAmountDate: boolean;
  allowNonPoInvoices: boolean;
  requireReceiptForInventory: boolean;
  requireReceiptForAssets: boolean;
  requireReceiptForServices: boolean;
  allowBlacklistedPaymentReady: boolean;
};

export type SupplierInvoiceRecord = {
  id: string;
  businessId: string;
  internalInvoiceNumber: string;
  supplierInvoiceNumber: string;
  profileId: string;
  partyId: string;
  purchaseOrderId: string | null;
  purchaseOrderVersionId: string | null;
  invoiceDate: string;
  dueDate: string | null;
  currencyCode: string;
  subtotalAmount: string;
  taxAmount: string;
  totalAmount: string;
  taxReference: string | null;
  attachmentDocumentId: string | null;
  status: string;
  matchOutcome: string | null;
  matchingMode: string | null;
  duplicateFlag: boolean;
  duplicateOfInvoiceId: string | null;
  matchVersion: number;
  matchIdempotencyKey: string | null;
  capturedAt: Date | null;
  capturedBy: string | null;
  matchedAt: Date | null;
  approvedAt: Date | null;
  approvedBy: string | null;
  paymentReadyAt: Date | null;
  rejectedAt: Date | null;
  rejectedBy: string | null;
  rejectionReason: string | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  deletedAt: Date | null;
};

export type SupplierInvoiceLineRecord = {
  id: string;
  businessId: string;
  invoiceId: string;
  poLineId: string | null;
  sequence: number;
  description: string;
  quantity: string;
  uom: string;
  unitPrice: string;
  taxRate: string;
  lineSubtotal: string;
  lineTax: string;
  lineTotal: string;
  taxReference: string | null;
};

export type InvoiceMatchRecord = {
  id: string;
  businessId: string;
  invoiceId: string;
  matchingMode: string;
  outcome: string;
  idempotencyKey: string;
  priceVarianceAmount: string;
  quantityVarianceAmount: string;
  taxVarianceAmount: string;
  summary: string | null;
  createdAt: Date;
};

export type InvoiceMatchLineRecord = {
  id: string;
  businessId: string;
  matchId: string;
  invoiceLineId: string;
  poLineId: string | null;
  receiptLineId: string | null;
  poQuantity: string | null;
  receiptQuantity: string | null;
  invoiceQuantity: string;
  poAmount: string | null;
  invoiceAmount: string;
  varianceType: string | null;
  varianceAmount: string | null;
  withinTolerance: boolean;
};

export type ApHandoffRecord = {
  id: string;
  businessId: string;
  invoiceId: string;
  status: string;
  payeePartyId: string;
  amount: string;
  currencyCode: string;
  dueDate: string | null;
  purchaseOrderId: string | null;
  supplierInvoiceNumber: string;
  internalInvoiceNumber: string;
  downstreamSystem: string;
  downstreamReference: string | null;
  idempotencyKey: string;
  errorMessage: string | null;
  attemptedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InvoiceLineDraft = {
  poLineId?: string | null;
  description: string;
  quantity: string;
  uom?: string | null;
  unitPrice: string;
  taxRate?: string | null;
  taxReference?: string | null;
};

export type CreateSupplierInvoiceCommand = {
  profileId: string;
  supplierInvoiceNumber: string;
  purchaseOrderId?: string | null;
  invoiceDate: string;
  dueDate?: string | null;
  currencyCode: string;
  taxReference?: string | null;
  attachmentDocumentId?: string | null;
  matchingMode?: string | null;
  lines: InvoiceLineDraft[];
};

export type InvoiceDecisionCommand = { reason?: string | null };

export type InvoiceListFilter = {
  query?: string;
  status?: "all" | "draft" | "unmatched" | "matched" | "variance" | "payment-ready";
};

export type InvoiceMatchLineView = {
  id: string;
  invoiceLineId: string;
  poLineId: string | null;
  description: string;
  poQuantity: string | null;
  receiptQuantity: string | null;
  invoiceQuantity: string;
  poAmount: string | null;
  invoiceAmount: string;
  varianceType: string | null;
  varianceAmount: string | null;
  withinTolerance: boolean;
};

export type InvoiceMatchView = {
  id: string;
  matchingMode: string;
  outcome: string;
  priceVarianceAmount: string;
  quantityVarianceAmount: string;
  taxVarianceAmount: string;
  summary: string | null;
  lines: InvoiceMatchLineView[];
};

export type ApHandoffView = {
  id: string;
  status: string;
  downstreamSystem: string;
  downstreamReference: string | null;
  amount: string;
  currencyCode: string;
  dueDate: string | null;
  errorMessage: string | null;
};

export type InvoiceLineView = {
  id: string;
  sequence: number;
  poLineId: string | null;
  description: string;
  quantity: string;
  uom: string;
  unitPrice: string;
  taxRate: string;
  lineSubtotal: string;
  lineTax: string;
  lineTotal: string;
  taxReference: string | null;
};

export type InvoiceListView = {
  id: string;
  internalInvoiceNumber: string;
  supplierInvoiceNumber: string;
  supplierName: string;
  poNumber: string | null;
  purchaseOrderId: string | null;
  invoiceDate: string;
  dueDate: string | null;
  totalAmount: string;
  currencyCode: string;
  status: string;
  statusLabel: string;
  matchOutcome: string | null;
  duplicateFlag: boolean;
};

export type PaymentReadyListView = {
  id: string;
  internalInvoiceNumber: string;
  supplierInvoiceNumber: string;
  supplierName: string;
  totalAmount: string;
  currencyCode: string;
  dueDate: string | null;
  paymentReadyAt: string | null;
  handoffStatus: string | null;
  handoffReference: string | null;
};

export type InvoiceView = {
  id: string;
  internalInvoiceNumber: string;
  supplierInvoiceNumber: string;
  profileId: string;
  supplierName: string;
  purchaseOrderId: string | null;
  poNumber: string | null;
  purchaseOrderVersionId: string | null;
  invoiceDate: string;
  dueDate: string | null;
  currencyCode: string;
  subtotalAmount: string;
  taxAmount: string;
  totalAmount: string;
  taxReference: string | null;
  attachmentDocumentId: string | null;
  status: string;
  statusLabel: string;
  matchOutcome: string | null;
  matchingMode: string | null;
  duplicateFlag: boolean;
  duplicateOfInvoiceId: string | null;
  lines: InvoiceLineView[];
  latestMatch: InvoiceMatchView | null;
  apHandoff: ApHandoffView | null;
  canCapture: boolean;
  canMatch: boolean;
  canApprove: boolean;
  canReject: boolean;
  canViewPaymentReady: boolean;
};

export type ProcurementApHandoffRequest = {
  businessId: string;
  invoiceId: string;
  payeePartyId: string;
  amount: string;
  currencyCode: string;
  dueDate: string | null;
  purchaseOrderId: string | null;
  supplierInvoiceNumber: string;
  internalInvoiceNumber: string;
  idempotencyKey: string;
};

export type ProcurementApHandoffResult = {
  success: boolean;
  handoffReference: string | null;
  errorMessage: string | null;
};

export type ExceptionControlRecord = {
  businessId: string;
  highSeverityRequiresApproval: boolean;
  duplicateInvoiceRequiresDecision: boolean;
  defaultSlaDays: number;
};

export type ExceptionTypeRecord = {
  id: string;
  businessId: string;
  code: string;
  name: string;
  description: string | null;
  defaultSeverity: string;
  requiresApprovalOnClose: boolean;
  displayOrder: number;
  isActive: boolean;
};

export type ExceptionLinkRecord = {
  id: string;
  businessId: string;
  exceptionId: string;
  objectType: string;
  objectId: string;
  createdAt: Date;
};

export type ExceptionActionRecord = {
  id: string;
  businessId: string;
  exceptionId: string;
  actionType: string;
  actorUserId: string | null;
  notes: string | null;
  createdAt: Date;
};

export type ExceptionRecord = {
  id: string;
  businessId: string;
  exceptionNumber: string;
  exceptionTypeCode: string;
  severity: string;
  status: string;
  title: string;
  description: string | null;
  evidenceDocumentId: string | null;
  raisedFrom: string;
  sourceKey: string | null;
  profileId: string | null;
  ownerUserId: string | null;
  resolutionNotes: string | null;
  resolutionDecision: string | null;
  varianceAcceptedBy: string | null;
  requiresApproval: boolean;
  approvedAt: Date | null;
  approvedBy: string | null;
  dueAt: Date | null;
  closedAt: Date | null;
  closedBy: string | null;
  cancelledAt: Date | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  deletedAt: Date | null;
};

export type ExceptionLinkInput = {
  objectType: string;
  objectId: string;
};

export type RaiseSystemExceptionCommand = {
  businessId: string;
  sourceKey: string;
  exceptionTypeCode: string;
  severity?: string | null;
  title: string;
  description?: string | null;
  raisedFrom: string;
  profileId?: string | null;
  evidenceDocumentId?: string | null;
  links: ExceptionLinkInput[];
  actorUserId?: string | null;
};

export type CreateExceptionCommand = {
  exceptionTypeCode: string;
  severity?: string | null;
  title: string;
  description?: string | null;
  evidenceDocumentId?: string | null;
  profileId?: string | null;
  ownerUserId?: string | null;
  links: ExceptionLinkInput[];
};

export type AssignExceptionCommand = {
  ownerUserId: string;
  notes?: string | null;
};

export type ResolveExceptionCommand = {
  resolutionNotes: string;
  resolutionDecision?: string | null;
  varianceAccepted?: boolean;
};

export type ExceptionDecisionCommand = {
  reason?: string | null;
};

export type ExceptionListFilter = {
  query?: string;
  status?: "all" | "open" | "mine" | "overdue" | "pending-approval";
};

export type ExceptionActionView = {
  id: string;
  actionType: string;
  actorUserId: string | null;
  notes: string | null;
  createdAt: string;
};

export type ExceptionLinkView = {
  id: string;
  objectType: string;
  objectId: string;
  href: string;
  label: string;
};

export type ExceptionListView = {
  id: string;
  exceptionNumber: string;
  exceptionTypeCode: string;
  exceptionTypeName: string;
  severity: string;
  status: string;
  statusLabel: string;
  title: string;
  ownerUserId: string | null;
  dueAt: string | null;
  isOverdue: boolean;
  raisedFrom: string;
  createdAt: string;
};

export type ExceptionView = {
  id: string;
  exceptionNumber: string;
  exceptionTypeCode: string;
  exceptionTypeName: string;
  severity: string;
  status: string;
  statusLabel: string;
  title: string;
  description: string | null;
  evidenceDocumentId: string | null;
  raisedFrom: string;
  profileId: string | null;
  ownerUserId: string | null;
  resolutionNotes: string | null;
  resolutionDecision: string | null;
  varianceAcceptedBy: string | null;
  requiresApproval: boolean;
  dueAt: string | null;
  isOverdue: boolean;
  links: ExceptionLinkView[];
  actions: ExceptionActionView[];
  canAssign: boolean;
  canStart: boolean;
  canResolve: boolean;
  canApprove: boolean;
  canClose: boolean;
  canCancel: boolean;
};

export type PerformanceControlRecord = {
  businessId: string;
  defaultPeriodDays: number;
  preferredScoreThreshold: string;
  preferredRequiresApproval: boolean;
  blockBlacklistedTransactions: boolean;
  supplierSelfEvalRequired: boolean;
  includeSupplierSelfEvalInAverage: boolean;
};

export type PerformanceMeasureRecord = {
  id: string;
  businessId: string;
  code: string;
  name: string;
  description: string | null;
  dimension: string;
  weight: string;
  higherIsBetter: boolean;
  displayOrder: number;
  isActive: boolean;
};

export type PerformanceEventRecord = {
  id: string;
  businessId: string;
  profileId: string;
  measureCode: string;
  sourceType: string;
  sourceId: string;
  sourceKey: string;
  eventCount: number;
  eventValue: string;
  occurredAt: Date;
  createdAt: Date;
};

export type RecordPerformanceEventCommand = {
  businessId: string;
  profileId: string;
  measureCode: string;
  sourceType: string;
  sourceId: string;
  sourceKey: string;
  eventCount?: number;
  eventValue?: string;
  occurredAt?: Date;
  actorUserId?: string | null;
};

export type ScorecardMeasureView = {
  measureCode: string;
  measureName: string;
  dimension: string;
  eventCount: number;
  eventTotal: string;
  score: string;
  weight: string;
  weightedScore: string;
};

export type SupplierScorecardView = {
  id: string;
  profileId: string;
  periodStart: string;
  periodEnd: string;
  compositeScore: string;
  status: string;
  computedAt: string;
  measures: ScorecardMeasureView[];
  evaluationSummary?: PerformanceEvaluationSummaryView;
};

export type PerformanceEvaluationRatingInput = {
  measureCode: string;
  score: number;
};

export type PerformanceEvaluationRecord = {
  id: string;
  businessId: string;
  profileId: string;
  periodStart: string;
  periodEnd: string;
  evaluatorType: string;
  evaluatorUserId: string | null;
  evaluatorLabel: string | null;
  status: string;
  compositeScore: string | null;
  submittedAt: Date | null;
  ratings: PerformanceEvaluationRatingInput[];
  createdAt: Date;
  updatedAt: Date;
};

export type PerformanceEvaluationSummaryView = {
  internalEvaluatorCount: number;
  internalAverageComposite: string | null;
  supplierEvaluationSubmitted: boolean;
  supplierCompositeScore: string | null;
  supplierIncludedInAverage: boolean;
  blendedEvaluatorCount: number;
};

export type SubmitPerformanceEvaluationCommand = {
  ratings: PerformanceEvaluationRatingInput[];
  evaluatorLabel?: string | null;
};

export type UpdatePerformanceControlCommand = {
  supplierSelfEvalRequired?: boolean;
  includeSupplierSelfEvalInAverage?: boolean;
  preferredScoreThreshold?: string;
  preferredRequiresApproval?: boolean;
};

export type ProcurementAnalyticsKpiView = {
  id: string;
  label: string;
  value: string;
  drilldownHref: string | null;
  formula?: string | null;
};

export type ProcurementAnalyticsSectionView = {
  id: string;
  title: string;
  description: string;
  kpis: ProcurementAnalyticsKpiView[];
};

export type ProcurementAnalyticsDashboardView = {
  sections: ProcurementAnalyticsSectionView[];
  spendBySupplier: Array<{ profileId: string; label: string; amount: string }>;
  spendByCategory: Array<{ categoryCode: string; label: string; amount: string }>;
  spendByBusinessUnit: Array<{ businessUnitCode: string; label: string; amount: string }>;
};

export type ProcurementLifecycleNodeView = {
  id: string;
  anchorType: string;
  label: string;
  status: string;
  href: string;
  timestamp: string | null;
};

export type ProcurementLifecycleChainView = {
  anchorType: string;
  anchorId: string;
  nodes: ProcurementLifecycleNodeView[];
  cycleTimeDays: number | null;
  cycleTimeExplanation: string | null;
};

export type GovernanceProposalRecord = {
  id: string;
  businessId: string;
  profileId: string;
  proposalType: string;
  status: string;
  reason: string;
  authority: string | null;
  evidenceDocumentId: string | null;
  effectiveDate: string | null;
  reviewDate: string | null;
  scorecardId: string | null;
  proposedBy: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ProposeGovernanceCommand = {
  proposalType: string;
  reason: string;
  authority?: string | null;
  evidenceDocumentId?: string | null;
  effectiveDate?: string | null;
  reviewDate?: string | null;
};

export type SupplierPerformanceRanking = {
  profileId: string;
  compositeScore: string | null;
  isPreferred: boolean;
  invitationRank: number;
};

export type SupplierProfilePerformanceView = {
  scorecard: SupplierScorecardView | null;
  pendingProposals: GovernanceProposalRecord[];
  evaluations: PerformanceEvaluationRecord[];
  control: PerformanceControlRecord;
  pendingSupplierSelfEval: boolean;
  canSubmitEvaluation: boolean;
  canManagePerformance: boolean;
  canProposeGovernance: boolean;
  canApproveGovernance: boolean;
};

