/**
 * Purpose:
 * In-memory sourcing store for IP-03/IP-04 certification. Not production runtime.
 */

import { randomUUID } from "node:crypto";

import type { DocumentNumberingPort } from "@/core/localization-regulatory/document-numbering";
import { PURCHASE_REQUEST_STATUSES } from "@/modules/procurement/constants";
import { PROCUREMENT_ERROR_CODES, ProcurementError } from "@/modules/procurement/errors";
import type {
  ApprovedRequestBudgetPort,
  SourcingStorePort,
  SuggestedSupplierPort,
} from "@/modules/procurement/ports";
import type { ApprovedRequestBudget, SuggestedSupplierSnapshot } from "@/modules/procurement/types";

type MemoryEvent = {
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
  createdBy: string | null;
  deletedAt: Date | null;
};

type MemoryQuote = {
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
  submittedAt: Date;
  submittedBy: string | null;
};

type MemoryAward = {
  id: string;
  eventId: string;
  profileId: string;
  awardedAmount: string;
  allocatedBudgetAmount: string;
  winningQuoteId: string | null;
  overrideReason: string | null;
};

type MemoryInvitation = {
  id: string;
  businessId: string;
  eventId: string;
  profileId: string;
  accessToken: string;
  tokenExpiresAt: Date | null;
  openedAt: Date | null;
  revokedAt: Date | null;
  responseStatus: string;
};

export class InMemorySourcingStore {
  events = new Map<string, MemoryEvent>();
  eventPrs = new Map<string, string[]>();
  invitations = new Map<string, MemoryInvitation>();
  quotes: MemoryQuote[] = [];
  quoteLines = new Map<string, Array<{
    id: string;
    sequence: number;
    description: string;
    quantity: string;
    unitPrice: string;
    taxRate: string;
    lineTotal: string;
  }>>();
  paymentTerms = new Map<string, Array<{
    sequence: number;
    milestoneName: string;
    percentage: string;
    amount: string | null;
    triggerEvent: string | null;
    duePeriodDays: number | null;
    comments: string | null;
  }>>();
  clarifications: Array<{
    id: string;
    businessId: string;
    eventId: string;
    profileId: string | null;
    question: string;
    answer: string | null;
    isBroadcast: boolean;
    createdAt: Date;
    answeredAt: Date | null;
  }> = [];
  awards: MemoryAward[] = [];
  awardLines: Array<{
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
  }> = [];
  phases = new Map<string, Array<{
    phaseCode: string;
    included: boolean;
    sequence: number;
    weight: string;
    passmark: string;
    required: boolean;
  }>>();
  committeeMembers = new Map<string, Array<{
    id: string;
    sequence: number;
    memberName: string;
    roleLabel: string | null;
    userId: string | null;
  }>>();
  phaseScores: Array<{
    eventId: string;
    profileId: string;
    phaseCode: string;
    score: string;
  }> = [];
  control = {
    defaultOpeningPolicy: "STANDARD",
    extensionRequiresApproval: false,
    awardRequiresApproval: false,
    bidSubmissionCountVisible: false,
    makerCheckerMinAmount: null as string | null,
  };
  bidAccessLog: Array<{
    businessId: string;
    eventId: string;
    profileId: string | null;
    actorUserId: string | null;
    action: string;
  }> = [];
  openingRules: Array<{ dimension: string; matchValue: string; requiredPolicy: string }> = [];
  approvedRequests = new Map<string, ApprovedRequestBudget & { businessId: string }>();
  suppliers = new Map<string, SuggestedSupplierSnapshot>();
  nextNumber = 1;

  numbering: DocumentNumberingPort = {
    allocate: async () => {
      const value = this.nextNumber;
      this.nextNumber += 1;
      return {
        number: `RFX-${String(value).padStart(6, "0")}`,
        policyId: "policy-rfx",
        policyCode: "SOURCING_EVENT_DEFAULT",
      };
    },
  };

  seedApprovedRequest(row: ApprovedRequestBudget & { businessId: string }) {
    this.approvedRequests.set(row.id, row);
  }

  seedSupplier(snapshot: SuggestedSupplierSnapshot) {
    this.suppliers.set(snapshot.profileId, snapshot);
  }

  approvedBudget: ApprovedRequestBudgetPort = {
    getApproved: async (businessId, requestId) => {
      const row = this.approvedRequests.get(requestId);
      if (!row || row.businessId !== businessId) {
        return null;
      }
      if (row.status !== PURCHASE_REQUEST_STATUSES.APPROVED) {
        return null;
      }
      return row;
    },
    getLinked: async (businessId, requestId) => {
      const row = this.approvedRequests.get(requestId);
      if (!row || row.businessId !== businessId) {
        return null;
      }
      return row;
    },
  };

  suggestedSupplier: SuggestedSupplierPort = {
    resolve: async (businessId, profileId) => {
      const row = this.suppliers.get(profileId);
      if (!row || row.profile.businessId !== businessId) {
        return null;
      }
      return row;
    },
  };

  store: SourcingStorePort = {
    insertEvent: async (values) => {
      this.events.set(values.id, {
        ...values,
        recommendation: null,
        evaluationStage: values.evaluationStage ?? "BIDDING",
        committeeConstitutedAt: null,
        committeeConstitutedBy: null,
        criteriaLockedAt: null,
        criteriaLockedBy: null,
        criteriaSnapshotHash: null,
        criteriaSnapshotJson: null,
        awardApprovalStatus: null,
        awardSubmittedAt: null,
        awardSubmittedBy: null,
        awardApprovedAt: null,
        awardApprovedBy: null,
        closedAt: null,
        evaluationStartedAt: null,
        dueDiligenceRequired: null,
        dueDiligenceLocationVerified: false,
        dueDiligenceStaffVerified: false,
        dueDiligenceLegalVerified: false,
        dueDiligenceOtherNotes: null,
        dueDiligenceRecordedAt: null,
        bidsOpenedAt: null,
        bidsOpenedBy: null,
        bidsOpeningApprovedBy: null,
        recommendedProfileIds: null,
        awardOverrideReason: null,
        deletedAt: null,
      });
      this.eventPrs.set(values.id, []);
    },
    addPurchaseRequest: async (_businessId, eventId, purchaseRequestId) => {
      const current = this.eventPrs.get(eventId) ?? [];
      if (!current.includes(purchaseRequestId)) {
        current.push(purchaseRequestId);
        this.eventPrs.set(eventId, current);
      }
    },
    addInvitation: async (values) => {
      this.invitations.set(values.id, {
        id: values.id,
        businessId: values.businessId,
        eventId: values.eventId,
        profileId: values.profileId,
        accessToken: values.accessToken,
        tokenExpiresAt: values.tokenExpiresAt,
        openedAt: null,
        revokedAt: null,
        responseStatus: "INVITED",
      });
    },
    markInvitationOpened: async (eventId, profileId, openedAt) => {
      const row = [...this.invitations.values()].find(
        (item) => item.eventId === eventId && item.profileId === profileId
      );
      if (row && !row.openedAt) {
        row.openedAt = openedAt;
        row.responseStatus = "OPENED";
      }
    },
    updateInvitationResponseStatus: async (eventId, profileId, responseStatus) => {
      const row = [...this.invitations.values()].find(
        (item) => item.eventId === eventId && item.profileId === profileId
      );
      if (row) {
        row.responseStatus = responseStatus;
      }
    },
    insertQuote: async (values) => {
      this.quotes.push({
        ...values,
        submittedAt: new Date(),
      });
    },
    insertQuoteLines: async (_businessId, quoteId, lines) => {
      this.quoteLines.set(
        quoteId,
        lines.map((line, index) => ({
          id: `ql-${quoteId}-${index + 1}`,
          sequence: line.sequence,
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          taxRate: line.taxRate,
          lineTotal: line.lineTotal,
        }))
      );
    },
    insertPaymentTerms: async (_businessId, quoteId, terms) => {
      this.paymentTerms.set(quoteId, terms);
    },
    findQuoteByIdempotencyKey: async (eventId, profileId, idempotencyKey) => {
      const row = this.quotes.find(
        (item) =>
          item.eventId === eventId &&
          item.profileId === profileId &&
          item.idempotencyKey === idempotencyKey
      );
      return row ? { id: row.id } : null;
    },
    updateQuoteStatus: async (quoteId, status) => {
      const row = this.quotes.find((item) => item.id === quoteId);
      if (row) {
        row.status = status;
      }
    },
    listQuoteLines: async (quoteId) => this.quoteLines.get(quoteId) ?? [],
    listPaymentTerms: async (quoteId) => this.paymentTerms.get(quoteId) ?? [],
    insertClarification: async (values) => {
      this.clarifications.push({
        id: values.id,
        businessId: values.businessId,
        eventId: values.eventId,
        profileId: values.profileId,
        question: values.question,
        answer: null,
        isBroadcast: values.isBroadcast,
        createdAt: new Date(),
        answeredAt: null,
      });
    },
    answerClarification: async (businessId, clarificationId, answer, _answeredBy, _isBroadcast) => {
      const row = this.clarifications.find(
        (item) => item.id === clarificationId && item.businessId === businessId
      );
      if (row) {
        row.answer = answer;
        row.isBroadcast = true;
        row.answeredAt = new Date();
      }
    },
    listClarifications: async (eventId, _profileId) =>
      this.clarifications
        .filter((row) => row.eventId === eventId)
        .map((row) => ({
          id: row.id,
          profileId: row.profileId,
          question: row.question,
          answer: row.answer,
          isBroadcast: row.isBroadcast,
          createdAt: row.createdAt,
          answeredAt: row.answeredAt,
        })),
    insertAward: async (values) => {
      this.awards.push({
        id: values.id,
        eventId: values.eventId,
        profileId: values.profileId,
        awardedAmount: values.awardedAmount,
        allocatedBudgetAmount: values.allocatedBudgetAmount,
        winningQuoteId: values.winningQuoteId,
        overrideReason: values.overrideReason,
      });
    },
    insertAwardLines: async (lines) => {
      this.awardLines.push(...lines);
    },
    findAwardById: async (businessId, awardId) => {
      const row = this.awards.find((item) => item.id === awardId);
      if (!row) {
        return null;
      }
      const event = this.events.get(row.eventId);
      if (!event || event.businessId !== businessId) {
        return null;
      }
      return {
        id: row.id,
        eventId: row.eventId,
        profileId: row.profileId,
        awardedAmount: row.awardedAmount,
        allocatedBudgetAmount: row.allocatedBudgetAmount,
        currencyCode: event.currencyCode,
        winningQuoteId: row.winningQuoteId,
        overrideReason: row.overrideReason,
      };
    },
    listAwardLines: async (awardId) =>
      this.awardLines
        .filter((row) => row.awardId === awardId)
        .map((row) => ({
          id: row.id,
          awardId: row.awardId,
          winningQuoteId: row.winningQuoteId,
          winningQuoteLineId: row.winningQuoteLineId,
          sequence: row.sequence,
          description: row.description,
          quantity: row.quantity,
          uom: row.uom,
          unitPrice: row.unitPrice,
          taxRate: row.taxRate,
          lineTotal: row.lineTotal,
          currencyCode: row.currencyCode,
        })),
    updateEventStatus: async (businessId, eventId, status, recommendation) => {
      const current = this.events.get(eventId);
      if (!current || current.businessId !== businessId || current.deletedAt) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.SOURCING_NOT_FOUND, undefined, 404);
      }
      this.events.set(eventId, {
        ...current,
        status,
        recommendation,
      });
    },
    updateClosesAt: async (businessId, eventId, closesAt) => {
      const current = this.events.get(eventId);
      if (!current || current.businessId !== businessId || current.deletedAt) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.SOURCING_NOT_FOUND, undefined, 404);
      }
      this.events.set(eventId, { ...current, closesAt });
    },
    replacePhases: async (_businessId, eventId, phases) => {
      this.phases.set(eventId, phases);
    },
    getOrCreateControl: async () => this.control,
    listOpeningRules: async () => this.openingRules,
    findEvent: async (businessId, eventId) => {
      const row = this.events.get(eventId);
      if (!row || row.businessId !== businessId || row.deletedAt) {
        return null;
      }
      return row;
    },
    listEvents: async (businessId) =>
      [...this.events.values()]
        .filter((row) => row.businessId === businessId && !row.deletedAt)
        .map((row) => ({
          id: row.id,
          eventNumber: row.eventNumber,
          title: row.title,
          status: row.status,
          rfxType: row.rfxType,
          closesAt: row.closesAt,
        })),
    listEventPrIds: async (eventId) => this.eventPrs.get(eventId) ?? [],
    listInvitations: async (eventId) =>
      [...this.invitations.values()]
        .filter((row) => row.eventId === eventId)
        .map((row) => ({
          profileId: row.profileId,
          accessToken: row.accessToken,
          responseStatus: row.responseStatus,
          openedAt: row.openedAt,
          revokedAt: row.revokedAt,
          tokenExpiresAt: row.tokenExpiresAt,
        })),
    findInvitationByToken: async (token) => {
      const row = [...this.invitations.values()].find((item) => item.accessToken === token);
      if (!row) {
        return null;
      }
      return {
        businessId: row.businessId,
        eventId: row.eventId,
        profileId: row.profileId,
        revokedAt: row.revokedAt,
        tokenExpiresAt: row.tokenExpiresAt,
      };
    },
    listQuotes: async (eventId, profileId) =>
      this.quotes
        .filter((row) => row.eventId === eventId && (!profileId || row.profileId === profileId))
        .sort((a, b) => a.version - b.version)
        .map((row) => ({
          id: row.id,
          profileId: row.profileId,
          version: row.version,
          amount: row.amount,
          currencyCode: row.currencyCode,
          status: row.status,
          comments: row.comments,
          deliveryLeadDays: row.deliveryLeadDays,
          warrantyNotes: row.warrantyNotes,
          year1Amount: row.year1Amount,
          tcvAmount: row.tcvAmount,
          tcoAmount: row.tcoAmount,
          capturedOnBehalf: row.capturedOnBehalf,
          submittedAt: row.submittedAt,
        })),
    listAwards: async (eventId) =>
      this.awards
        .filter((row) => row.eventId === eventId)
        .map((row) => ({
          id: row.id,
          profileId: row.profileId,
          awardedAmount: row.awardedAmount,
          allocatedBudgetAmount: row.allocatedBudgetAmount,
          winningQuoteId: row.winningQuoteId,
          overrideReason: row.overrideReason,
        })),
    listPhases: async (eventId) => this.phases.get(eventId) ?? [],
    closeTender: async (businessId, eventId, closedAt, updatedBy) => {
      const current = this.events.get(eventId);
      if (!current || current.businessId !== businessId || current.deletedAt) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.SOURCING_NOT_FOUND, undefined, 404);
      }
      this.events.set(eventId, {
        ...current,
        status: "CLOSED",
        evaluationStage: "BIDS_RECEIVED",
        closedAt,
      });
    },
    replaceCommitteeMembers: async (businessId, eventId, members) => {
      this.committeeMembers.set(
        eventId,
        members.map((row) => ({
          id: row.id,
          sequence: row.sequence,
          memberName: row.memberName,
          roleLabel: row.roleLabel,
          userId: row.userId,
        }))
      );
      const current = this.events.get(eventId);
      if (current) {
        this.events.set(eventId, {
          ...current,
          evaluationStage: "COMMITTEE_SET",
          committeeConstitutedAt: new Date(),
          committeeConstitutedBy: members[0]?.createdBy ?? null,
        });
      }
    },
    listCommitteeMembers: async (eventId) => this.committeeMembers.get(eventId) ?? [],
    updateEvaluationCriteria: async (businessId, eventId, values) => {
      const current = this.events.get(eventId);
      if (!current || current.businessId !== businessId || current.deletedAt) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.SOURCING_NOT_FOUND, undefined, 404);
      }
      this.events.set(eventId, {
        ...current,
        evaluationMethod: values.evaluationMethod,
        technicalWeight: values.technicalWeight,
        financialWeight: values.financialWeight,
        financialBasis: values.financialBasis,
        evaluationStage: values.evaluationStage,
      });
    },
    startEvaluation: async (businessId, eventId, startedAt, updatedBy) => {
      const current = this.events.get(eventId);
      if (!current || current.businessId !== businessId || current.deletedAt) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.SOURCING_NOT_FOUND, undefined, 404);
      }
      this.events.set(eventId, {
        ...current,
        status: "EVALUATING",
        evaluationStage: "IN_PROGRESS",
        evaluationStartedAt: startedAt,
      });
    },
    updateDueDiligence: async (businessId, eventId, values) => {
      const current = this.events.get(eventId);
      if (!current || current.businessId !== businessId || current.deletedAt) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.SOURCING_NOT_FOUND, undefined, 404);
      }
      this.events.set(eventId, {
        ...current,
        dueDiligenceRequired: values.dueDiligenceRequired,
        dueDiligenceLocationVerified: values.dueDiligenceLocationVerified,
        dueDiligenceStaffVerified: values.dueDiligenceStaffVerified,
        dueDiligenceLegalVerified: values.dueDiligenceLegalVerified,
        dueDiligenceOtherNotes: values.dueDiligenceOtherNotes,
        dueDiligenceRecordedAt: values.dueDiligenceRecordedAt,
      });
    },
    openBids: async (businessId, eventId, values) => {
      const current = this.events.get(eventId);
      if (!current || current.businessId !== businessId || current.deletedAt) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.SOURCING_NOT_FOUND, undefined, 404);
      }
      this.events.set(eventId, {
        ...current,
        bidsOpenedAt: values.openedAt,
        bidsOpenedBy: values.openedBy,
        bidsOpeningApprovedBy: values.openingApprovedBy,
        recommendedProfileIds: values.recommendedProfileIds,
      });
    },
    upsertPhaseScores: async (_businessId, eventId, profileId, scores) => {
      this.phaseScores = this.phaseScores.filter(
        (row) => !(row.eventId === eventId && row.profileId === profileId)
      );
      for (const row of scores) {
        this.phaseScores.push({
          eventId,
          profileId,
          phaseCode: row.phaseCode,
          score: row.score,
        });
      }
    },
    listPhaseScores: async (eventId) =>
      this.phaseScores
        .filter((row) => row.eventId === eventId)
        .map((row) => ({
          profileId: row.profileId,
          phaseCode: row.phaseCode,
          score: row.score,
        })),
    lockEvaluationCriteria: async (businessId, eventId, values) => {
      const current = this.events.get(eventId);
      if (!current || current.businessId !== businessId || current.deletedAt) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.SOURCING_NOT_FOUND, undefined, 404);
      }
      this.events.set(eventId, {
        ...current,
        criteriaLockedAt: values.lockedAt,
        criteriaLockedBy: values.lockedBy,
        criteriaSnapshotHash: values.snapshotHash,
        criteriaSnapshotJson: values.snapshotJson,
        evaluationStage: values.evaluationStage,
      });
    },
    recordBidAccess: async (input) => {
      this.bidAccessLog.push({
        businessId: input.businessId,
        eventId: input.eventId,
        profileId: input.profileId ?? null,
        actorUserId: input.actorUserId,
        action: input.action,
      });
    },
    updateAwardApproval: async (businessId, eventId, values) => {
      const current = this.events.get(eventId);
      if (!current || current.businessId !== businessId || current.deletedAt) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.SOURCING_NOT_FOUND, undefined, 404);
      }
      this.events.set(eventId, {
        ...current,
        awardApprovalStatus: values.awardApprovalStatus,
        awardSubmittedAt: values.awardSubmittedAt ?? current.awardSubmittedAt,
        awardSubmittedBy: values.awardSubmittedBy ?? current.awardSubmittedBy,
        awardApprovedAt: values.awardApprovedAt ?? current.awardApprovedAt,
        awardApprovedBy: values.awardApprovedBy ?? current.awardApprovedBy,
        recommendation: values.recommendation ?? current.recommendation,
      });
    },
  };
}

export function newSourcingId() {
  return randomUUID();
}
