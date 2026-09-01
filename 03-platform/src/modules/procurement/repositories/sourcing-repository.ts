/**
 * Purpose:
 * Persist sourcing events, quote versions, and awards with tenant isolation.
 */

import { and, asc, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  procurementAward,
  procurementAwardLine,
  procurementSourcingBidAccessLog,
  procurementSourcingClarification,
  procurementSourcingControl,
  procurementSourcingEvaluationPhase,
  procurementSourcingEvaluationCommittee,
  procurementSourcingEvent,
  procurementSourcingEventPr,
  procurementSourcingInvitation,
  procurementSourcingOpeningRule,
  procurementSourcingPhaseScore,
  procurementSupplierQuote,
  procurementSupplierQuoteLine,
  procurementSupplierQuotePaymentTerm,
} from "@/db/schema/procurement-sourcing";
import { PROCUREMENT_ERROR_CODES, ProcurementError } from "@/modules/procurement/errors";
import type { SourcingStorePort } from "@/modules/procurement/ports";

export class SourcingRepository implements SourcingStorePort {
  async insertEvent(values: Parameters<SourcingStorePort["insertEvent"]>[0]) {
    const db = getDb();
    await db.insert(procurementSourcingEvent).values({
      id: values.id,
      businessId: values.businessId,
      eventNumber: values.eventNumber,
      rfxType: values.rfxType,
      title: values.title,
      status: values.status,
      currencyCode: values.currencyCode,
      closesAt: values.closesAt,
      originalClosesAt: values.originalClosesAt,
      riskLevel: values.riskLevel,
      categoryCode: values.categoryCode,
      openingPolicy: values.openingPolicy,
      openingPolicySource: values.openingPolicySource,
      evaluationMethod: values.evaluationMethod,
      technicalWeight: values.technicalWeight,
      financialWeight: values.financialWeight,
      financialBasis: values.financialBasis,
      evaluationStage: values.evaluationStage ?? "BIDDING",
      createdBy: values.createdBy,
      updatedBy: values.createdBy,
    });
  }

  async addPurchaseRequest(businessId: string, eventId: string, purchaseRequestId: string) {
    const db = getDb();
    await db.insert(procurementSourcingEventPr).values({
      businessId,
      eventId,
      purchaseRequestId,
    });
  }

  async addInvitation(values: Parameters<SourcingStorePort["addInvitation"]>[0]) {
    const db = getDb();
    await db.insert(procurementSourcingInvitation).values({
      id: values.id,
      businessId: values.businessId,
      eventId: values.eventId,
      profileId: values.profileId,
      accessToken: values.accessToken,
      tokenExpiresAt: values.tokenExpiresAt,
      createdBy: values.createdBy,
    });
  }

  async markInvitationOpened(eventId: string, profileId: string, openedAt: Date) {
    const db = getDb();
    await db
      .update(procurementSourcingInvitation)
      .set({
        openedAt,
        responseStatus: "OPENED",
      })
      .where(
        and(
          eq(procurementSourcingInvitation.eventId, eventId),
          eq(procurementSourcingInvitation.profileId, profileId),
          isNull(procurementSourcingInvitation.openedAt)
        )
      );
  }

  async updateInvitationResponseStatus(
    eventId: string,
    profileId: string,
    responseStatus: string
  ) {
    const db = getDb();
    await db
      .update(procurementSourcingInvitation)
      .set({ responseStatus })
      .where(
        and(
          eq(procurementSourcingInvitation.eventId, eventId),
          eq(procurementSourcingInvitation.profileId, profileId)
        )
      );
  }

  async insertQuote(values: Parameters<SourcingStorePort["insertQuote"]>[0]) {
    const db = getDb();
    await db.insert(procurementSupplierQuote).values(values);
  }

  async insertQuoteLines(
    businessId: string,
    quoteId: string,
    lines: Parameters<SourcingStorePort["insertQuoteLines"]>[2]
  ) {
    const db = getDb();
    if (lines.length === 0) {
      return;
    }
    await db.insert(procurementSupplierQuoteLine).values(
      lines.map((line) => ({
        businessId,
        quoteId,
        sequence: line.sequence,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxRate: line.taxRate,
        lineTotal: line.lineTotal,
      }))
    );
  }

  async insertPaymentTerms(
    businessId: string,
    quoteId: string,
    terms: Parameters<SourcingStorePort["insertPaymentTerms"]>[2]
  ) {
    const db = getDb();
    if (terms.length === 0) {
      return;
    }
    await db.insert(procurementSupplierQuotePaymentTerm).values(
      terms.map((term) => ({
        businessId,
        quoteId,
        sequence: term.sequence,
        milestoneName: term.milestoneName,
        percentage: term.percentage,
        amount: term.amount,
        triggerEvent: term.triggerEvent,
        duePeriodDays: term.duePeriodDays,
        comments: term.comments,
      }))
    );
  }

  async findQuoteByIdempotencyKey(eventId: string, profileId: string, idempotencyKey: string) {
    const db = getDb();
    const [row] = await db
      .select({ id: procurementSupplierQuote.id })
      .from(procurementSupplierQuote)
      .where(
        and(
          eq(procurementSupplierQuote.eventId, eventId),
          eq(procurementSupplierQuote.profileId, profileId),
          eq(procurementSupplierQuote.idempotencyKey, idempotencyKey)
        )
      )
      .limit(1);
    return row ?? null;
  }

  async updateQuoteStatus(quoteId: string, status: string) {
    const db = getDb();
    await db
      .update(procurementSupplierQuote)
      .set({ status })
      .where(eq(procurementSupplierQuote.id, quoteId));
  }

  async listQuoteLines(quoteId: string) {
    const db = getDb();
    const rows = await db
      .select()
      .from(procurementSupplierQuoteLine)
      .where(eq(procurementSupplierQuoteLine.quoteId, quoteId))
      .orderBy(asc(procurementSupplierQuoteLine.sequence));
    return rows.map((row) => ({
      id: row.id,
      sequence: row.sequence,
      description: row.description,
      quantity: row.quantity,
      unitPrice: row.unitPrice,
      taxRate: row.taxRate,
      lineTotal: row.lineTotal,
    }));
  }

  async listPaymentTerms(quoteId: string) {
    const db = getDb();
    const rows = await db
      .select()
      .from(procurementSupplierQuotePaymentTerm)
      .where(eq(procurementSupplierQuotePaymentTerm.quoteId, quoteId))
      .orderBy(asc(procurementSupplierQuotePaymentTerm.sequence));
    return rows.map((row) => ({
      sequence: row.sequence,
      milestoneName: row.milestoneName,
      percentage: row.percentage,
      amount: row.amount,
      triggerEvent: row.triggerEvent,
      duePeriodDays: row.duePeriodDays,
      comments: row.comments,
    }));
  }

  async insertClarification(values: Parameters<SourcingStorePort["insertClarification"]>[0]) {
    const db = getDb();
    await db.insert(procurementSourcingClarification).values(values);
  }

  async answerClarification(
    businessId: string,
    clarificationId: string,
    answer: string,
    answeredBy: string | null,
    isBroadcast: boolean
  ) {
    const db = getDb();
    await db
      .update(procurementSourcingClarification)
      .set({
        answer,
        answeredBy,
        isBroadcast: true,
        answeredAt: new Date(),
      })
      .where(
        and(
          eq(procurementSourcingClarification.id, clarificationId),
          eq(procurementSourcingClarification.businessId, businessId)
        )
      );
  }

  async listClarifications(eventId: string, _profileId?: string | null) {
    const db = getDb();
    const rows = await db
      .select()
      .from(procurementSourcingClarification)
      .where(eq(procurementSourcingClarification.eventId, eventId))
      .orderBy(asc(procurementSourcingClarification.createdAt));
    return rows.map((row) => ({
      id: row.id,
      profileId: row.profileId,
      question: row.question,
      answer: row.answer,
      isBroadcast: row.isBroadcast,
      createdAt: row.createdAt,
      answeredAt: row.answeredAt,
    }));
  }

  async insertAward(values: Parameters<SourcingStorePort["insertAward"]>[0]) {
    const db = getDb();
    await db.insert(procurementAward).values(values);
  }

  async insertAwardLines(
    lines: Parameters<SourcingStorePort["insertAwardLines"]>[0]
  ) {
    const db = getDb();
    if (lines.length === 0) {
      return;
    }
    await db.insert(procurementAwardLine).values(lines);
  }

  async findAwardById(businessId: string, awardId: string) {
    const db = getDb();
    const [row] = await db
      .select()
      .from(procurementAward)
      .where(
        and(eq(procurementAward.id, awardId), eq(procurementAward.businessId, businessId))
      )
      .limit(1);
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      eventId: row.eventId,
      profileId: row.profileId,
      awardedAmount: row.awardedAmount,
      allocatedBudgetAmount: row.allocatedBudgetAmount,
      currencyCode: row.currencyCode,
      winningQuoteId: row.winningQuoteId,
      overrideReason: row.overrideReason,
    };
  }

  async listAwardLines(awardId: string) {
    const db = getDb();
    const rows = await db
      .select()
      .from(procurementAwardLine)
      .where(eq(procurementAwardLine.awardId, awardId))
      .orderBy(asc(procurementAwardLine.sequence));
    return rows.map((row) => ({
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
    }));
  }

  async updateEventStatus(
    businessId: string,
    eventId: string,
    status: string,
    recommendation: string | null,
    updatedBy: string | null
  ) {
    const db = getDb();
    const [updated] = await db
      .update(procurementSourcingEvent)
      .set({
        status,
        recommendation,
        updatedBy,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(procurementSourcingEvent.id, eventId),
          eq(procurementSourcingEvent.businessId, businessId),
          isNull(procurementSourcingEvent.deletedAt)
        )
      )
      .returning({ id: procurementSourcingEvent.id });
    if (!updated) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.SOURCING_NOT_FOUND, undefined, 404);
    }
  }

  async updateClosesAt(
    businessId: string,
    eventId: string,
    closesAt: Date,
    updatedBy: string | null
  ) {
    const db = getDb();
    const [updated] = await db
      .update(procurementSourcingEvent)
      .set({
        closesAt,
        updatedBy,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(procurementSourcingEvent.id, eventId),
          eq(procurementSourcingEvent.businessId, businessId),
          isNull(procurementSourcingEvent.deletedAt)
        )
      )
      .returning({ id: procurementSourcingEvent.id });
    if (!updated) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.SOURCING_NOT_FOUND, undefined, 404);
    }
  }

  async replacePhases(
    businessId: string,
    eventId: string,
    phases: Parameters<SourcingStorePort["replacePhases"]>[2]
  ) {
    const db = getDb();
    await db
      .delete(procurementSourcingEvaluationPhase)
      .where(eq(procurementSourcingEvaluationPhase.eventId, eventId));
    if (phases.length === 0) {
      return;
    }
    await db.insert(procurementSourcingEvaluationPhase).values(
      phases.map((phase) => ({
        businessId,
        eventId,
        phaseCode: phase.phaseCode,
        included: phase.included,
        sequence: phase.sequence,
        weight: phase.weight,
        passmark: phase.passmark,
        required: phase.required,
      }))
    );
  }

  async getOrCreateControl(businessId: string) {
    const db = getDb();
    const [existing] = await db
      .select()
      .from(procurementSourcingControl)
      .where(eq(procurementSourcingControl.businessId, businessId))
      .limit(1);
    if (existing) {
      return {
        defaultOpeningPolicy: existing.defaultOpeningPolicy,
        extensionRequiresApproval: existing.extensionRequiresApproval,
        awardRequiresApproval: existing.awardRequiresApproval,
        bidSubmissionCountVisible: existing.bidSubmissionCountVisible,
        makerCheckerMinAmount: existing.makerCheckerMinAmount,
      };
    }
    const [created] = await db
      .insert(procurementSourcingControl)
      .values({ businessId })
      .returning();
    return {
      defaultOpeningPolicy: created!.defaultOpeningPolicy,
      extensionRequiresApproval: created!.extensionRequiresApproval,
      awardRequiresApproval: created!.awardRequiresApproval,
      bidSubmissionCountVisible: created!.bidSubmissionCountVisible,
      makerCheckerMinAmount: created!.makerCheckerMinAmount,
    };
  }

  async listOpeningRules(businessId: string) {
    const db = getDb();
    const rows = await db
      .select({
        dimension: procurementSourcingOpeningRule.dimension,
        matchValue: procurementSourcingOpeningRule.matchValue,
        requiredPolicy: procurementSourcingOpeningRule.requiredPolicy,
      })
      .from(procurementSourcingOpeningRule)
      .where(eq(procurementSourcingOpeningRule.businessId, businessId));
    return rows;
  }

  async findEvent(businessId: string, eventId: string) {
    const db = getDb();
    const [row] = await db
      .select()
      .from(procurementSourcingEvent)
      .where(
        and(
          eq(procurementSourcingEvent.id, eventId),
          eq(procurementSourcingEvent.businessId, businessId),
          isNull(procurementSourcingEvent.deletedAt)
        )
      )
      .limit(1);
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      businessId: row.businessId,
      eventNumber: row.eventNumber,
      rfxType: row.rfxType,
      title: row.title,
      status: row.status,
      currencyCode: row.currencyCode,
      recommendation: row.recommendation,
      closesAt: row.closesAt,
      originalClosesAt: row.originalClosesAt,
      riskLevel: row.riskLevel,
      categoryCode: row.categoryCode,
      openingPolicy: row.openingPolicy,
      openingPolicySource: row.openingPolicySource,
      evaluationMethod: row.evaluationMethod,
      technicalWeight: row.technicalWeight,
      financialWeight: row.financialWeight,
      financialBasis: row.financialBasis,
      evaluationStage: row.evaluationStage,
      committeeConstitutedAt: row.committeeConstitutedAt,
      committeeConstitutedBy: row.committeeConstitutedBy,
      criteriaLockedAt: row.criteriaLockedAt,
      criteriaLockedBy: row.criteriaLockedBy,
      criteriaSnapshotHash: row.criteriaSnapshotHash,
      criteriaSnapshotJson: row.criteriaSnapshotJson,
      awardApprovalStatus: row.awardApprovalStatus,
      awardSubmittedAt: row.awardSubmittedAt,
      awardSubmittedBy: row.awardSubmittedBy,
      awardApprovedAt: row.awardApprovedAt,
      awardApprovedBy: row.awardApprovedBy,
      closedAt: row.closedAt,
      evaluationStartedAt: row.evaluationStartedAt,
      dueDiligenceRequired: row.dueDiligenceRequired,
      dueDiligenceLocationVerified: row.dueDiligenceLocationVerified,
      dueDiligenceStaffVerified: row.dueDiligenceStaffVerified,
      dueDiligenceLegalVerified: row.dueDiligenceLegalVerified,
      dueDiligenceOtherNotes: row.dueDiligenceOtherNotes,
      dueDiligenceRecordedAt: row.dueDiligenceRecordedAt,
      bidsOpenedAt: row.bidsOpenedAt,
      bidsOpenedBy: row.bidsOpenedBy,
      bidsOpeningApprovedBy: row.bidsOpeningApprovedBy,
      recommendedProfileIds: row.recommendedProfileIds,
      awardOverrideReason: row.awardOverrideReason,
    };
  }

  async listEvents(businessId: string) {
    const db = getDb();
    const rows = await db
      .select()
      .from(procurementSourcingEvent)
      .where(
        and(
          eq(procurementSourcingEvent.businessId, businessId),
          isNull(procurementSourcingEvent.deletedAt)
        )
      )
      .orderBy(asc(procurementSourcingEvent.eventNumber));
    return rows.map((row) => ({
      id: row.id,
      eventNumber: row.eventNumber,
      title: row.title,
      status: row.status,
      rfxType: row.rfxType,
      closesAt: row.closesAt,
    }));
  }

  async listEventPrIds(eventId: string) {
    const db = getDb();
    const rows = await db
      .select({ purchaseRequestId: procurementSourcingEventPr.purchaseRequestId })
      .from(procurementSourcingEventPr)
      .where(eq(procurementSourcingEventPr.eventId, eventId));
    return rows.map((row) => row.purchaseRequestId);
  }

  async listInvitations(eventId: string) {
    const db = getDb();
    const rows = await db
      .select({
        profileId: procurementSourcingInvitation.profileId,
        accessToken: procurementSourcingInvitation.accessToken,
        responseStatus: procurementSourcingInvitation.responseStatus,
        openedAt: procurementSourcingInvitation.openedAt,
        revokedAt: procurementSourcingInvitation.revokedAt,
        tokenExpiresAt: procurementSourcingInvitation.tokenExpiresAt,
      })
      .from(procurementSourcingInvitation)
      .where(eq(procurementSourcingInvitation.eventId, eventId));
    return rows;
  }

  async findInvitationByToken(token: string) {
    const db = getDb();
    const [row] = await db
      .select({
        businessId: procurementSourcingInvitation.businessId,
        eventId: procurementSourcingInvitation.eventId,
        profileId: procurementSourcingInvitation.profileId,
        revokedAt: procurementSourcingInvitation.revokedAt,
        tokenExpiresAt: procurementSourcingInvitation.tokenExpiresAt,
      })
      .from(procurementSourcingInvitation)
      .where(eq(procurementSourcingInvitation.accessToken, token))
      .limit(1);
    return row ?? null;
  }

  async listQuotes(eventId: string, profileId?: string) {
    const db = getDb();
    const rows = await db
      .select()
      .from(procurementSupplierQuote)
      .where(
        profileId
          ? and(
              eq(procurementSupplierQuote.eventId, eventId),
              eq(procurementSupplierQuote.profileId, profileId)
            )
          : eq(procurementSupplierQuote.eventId, eventId)
      )
      .orderBy(asc(procurementSupplierQuote.version));
    return rows.map((row) => ({
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
    }));
  }

  async listAwards(eventId: string) {
    const db = getDb();
    const rows = await db
      .select({
        id: procurementAward.id,
        profileId: procurementAward.profileId,
        awardedAmount: procurementAward.awardedAmount,
        allocatedBudgetAmount: procurementAward.allocatedBudgetAmount,
        winningQuoteId: procurementAward.winningQuoteId,
        overrideReason: procurementAward.overrideReason,
      })
      .from(procurementAward)
      .where(eq(procurementAward.eventId, eventId));
    return rows;
  }

  async listPhases(eventId: string) {
    const db = getDb();
    const rows = await db
      .select()
      .from(procurementSourcingEvaluationPhase)
      .where(eq(procurementSourcingEvaluationPhase.eventId, eventId))
      .orderBy(asc(procurementSourcingEvaluationPhase.sequence));
    return rows.map((row) => ({
      phaseCode: row.phaseCode,
      included: row.included,
      sequence: row.sequence,
      weight: row.weight,
      passmark: row.passmark,
      required: row.required,
    }));
  }

  async closeTender(businessId: string, eventId: string, closedAt: Date, updatedBy: string | null) {
    const db = getDb();
    const [updated] = await db
      .update(procurementSourcingEvent)
      .set({
        status: "CLOSED",
        evaluationStage: "BIDS_RECEIVED",
        closedAt,
        updatedBy,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(procurementSourcingEvent.id, eventId),
          eq(procurementSourcingEvent.businessId, businessId),
          isNull(procurementSourcingEvent.deletedAt)
        )
      )
      .returning({ id: procurementSourcingEvent.id });
    if (!updated) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.SOURCING_NOT_FOUND, undefined, 404);
    }
  }

  async replaceCommitteeMembers(
    businessId: string,
    eventId: string,
    members: Parameters<SourcingStorePort["replaceCommitteeMembers"]>[2]
  ) {
    const db = getDb();
    await db
      .delete(procurementSourcingEvaluationCommittee)
      .where(eq(procurementSourcingEvaluationCommittee.eventId, eventId));
    if (members.length === 0) {
      return;
    }
    await db.insert(procurementSourcingEvaluationCommittee).values(
      members.map((member) => ({
        id: member.id,
        businessId,
        eventId,
        sequence: member.sequence,
        memberName: member.memberName,
        roleLabel: member.roleLabel,
        userId: member.userId,
        createdBy: member.createdBy,
      }))
    );
    await db
      .update(procurementSourcingEvent)
      .set({
        evaluationStage: "COMMITTEE_SET",
        committeeConstitutedAt: new Date(),
        committeeConstitutedBy: members[0]?.createdBy ?? null,
        updatedBy: members[0]?.createdBy ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(procurementSourcingEvent.id, eventId),
          eq(procurementSourcingEvent.businessId, businessId)
        )
      );
  }

  async listCommitteeMembers(eventId: string) {
    const db = getDb();
    const rows = await db
      .select()
      .from(procurementSourcingEvaluationCommittee)
      .where(eq(procurementSourcingEvaluationCommittee.eventId, eventId))
      .orderBy(asc(procurementSourcingEvaluationCommittee.sequence));
    return rows.map((row) => ({
      id: row.id,
      sequence: row.sequence,
      memberName: row.memberName,
      roleLabel: row.roleLabel,
      userId: row.userId,
    }));
  }

  async updateEvaluationCriteria(
    businessId: string,
    eventId: string,
    values: Parameters<SourcingStorePort["updateEvaluationCriteria"]>[2]
  ) {
    const db = getDb();
    const [updated] = await db
      .update(procurementSourcingEvent)
      .set({
        evaluationMethod: values.evaluationMethod,
        technicalWeight: values.technicalWeight,
        financialWeight: values.financialWeight,
        financialBasis: values.financialBasis,
        evaluationStage: values.evaluationStage,
        updatedBy: values.updatedBy,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(procurementSourcingEvent.id, eventId),
          eq(procurementSourcingEvent.businessId, businessId),
          isNull(procurementSourcingEvent.deletedAt)
        )
      )
      .returning({ id: procurementSourcingEvent.id });
    if (!updated) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.SOURCING_NOT_FOUND, undefined, 404);
    }
  }

  async startEvaluation(
    businessId: string,
    eventId: string,
    startedAt: Date,
    updatedBy: string | null
  ) {
    const db = getDb();
    const [updated] = await db
      .update(procurementSourcingEvent)
      .set({
        status: "EVALUATING",
        evaluationStage: "IN_PROGRESS",
        evaluationStartedAt: startedAt,
        updatedBy,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(procurementSourcingEvent.id, eventId),
          eq(procurementSourcingEvent.businessId, businessId),
          isNull(procurementSourcingEvent.deletedAt)
        )
      )
      .returning({ id: procurementSourcingEvent.id });
    if (!updated) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.SOURCING_NOT_FOUND, undefined, 404);
    }
  }

  async updateDueDiligence(
    businessId: string,
    eventId: string,
    values: Parameters<SourcingStorePort["updateDueDiligence"]>[2]
  ) {
    const db = getDb();
    const [updated] = await db
      .update(procurementSourcingEvent)
      .set({
        dueDiligenceRequired: values.dueDiligenceRequired,
        dueDiligenceLocationVerified: values.dueDiligenceLocationVerified,
        dueDiligenceStaffVerified: values.dueDiligenceStaffVerified,
        dueDiligenceLegalVerified: values.dueDiligenceLegalVerified,
        dueDiligenceOtherNotes: values.dueDiligenceOtherNotes,
        dueDiligenceRecordedAt: values.dueDiligenceRecordedAt,
        updatedBy: values.updatedBy,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(procurementSourcingEvent.id, eventId),
          eq(procurementSourcingEvent.businessId, businessId),
          isNull(procurementSourcingEvent.deletedAt)
        )
      )
      .returning({ id: procurementSourcingEvent.id });
    if (!updated) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.SOURCING_NOT_FOUND, undefined, 404);
    }
  }

  async openBids(
    businessId: string,
    eventId: string,
    values: Parameters<SourcingStorePort["openBids"]>[2]
  ) {
    const db = getDb();
    const [updated] = await db
      .update(procurementSourcingEvent)
      .set({
        bidsOpenedAt: values.openedAt,
        bidsOpenedBy: values.openedBy,
        bidsOpeningApprovedBy: values.openingApprovedBy,
        recommendedProfileIds: values.recommendedProfileIds,
        updatedBy: values.updatedBy,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(procurementSourcingEvent.id, eventId),
          eq(procurementSourcingEvent.businessId, businessId),
          isNull(procurementSourcingEvent.deletedAt)
        )
      )
      .returning({ id: procurementSourcingEvent.id });
    if (!updated) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.SOURCING_NOT_FOUND, undefined, 404);
    }
  }

  async upsertPhaseScores(
    businessId: string,
    eventId: string,
    profileId: string,
    scores: Parameters<SourcingStorePort["upsertPhaseScores"]>[3]
  ) {
    const db = getDb();
    await db
      .delete(procurementSourcingPhaseScore)
      .where(
        and(
          eq(procurementSourcingPhaseScore.eventId, eventId),
          eq(procurementSourcingPhaseScore.profileId, profileId)
        )
      );
    if (scores.length === 0) {
      return;
    }
    await db.insert(procurementSourcingPhaseScore).values(
      scores.map((row) => ({
        id: row.id,
        businessId,
        eventId,
        profileId,
        phaseCode: row.phaseCode,
        score: row.score,
        scoredBy: row.scoredBy,
      }))
    );
  }

  async listPhaseScores(eventId: string) {
    const db = getDb();
    const rows = await db
      .select({
        profileId: procurementSourcingPhaseScore.profileId,
        phaseCode: procurementSourcingPhaseScore.phaseCode,
        score: procurementSourcingPhaseScore.score,
      })
      .from(procurementSourcingPhaseScore)
      .where(eq(procurementSourcingPhaseScore.eventId, eventId));
    return rows;
  }

  async lockEvaluationCriteria(
    businessId: string,
    eventId: string,
    values: Parameters<SourcingStorePort["lockEvaluationCriteria"]>[2]
  ) {
    const db = getDb();
    const [updated] = await db
      .update(procurementSourcingEvent)
      .set({
        criteriaLockedAt: values.lockedAt,
        criteriaLockedBy: values.lockedBy,
        criteriaSnapshotHash: values.snapshotHash,
        criteriaSnapshotJson: values.snapshotJson,
        evaluationStage: values.evaluationStage,
        updatedBy: values.updatedBy,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(procurementSourcingEvent.id, eventId),
          eq(procurementSourcingEvent.businessId, businessId),
          isNull(procurementSourcingEvent.deletedAt)
        )
      )
      .returning({ id: procurementSourcingEvent.id });
    if (!updated) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.SOURCING_NOT_FOUND, undefined, 404);
    }
  }

  async recordBidAccess(input: Parameters<SourcingStorePort["recordBidAccess"]>[0]) {
    const db = getDb();
    await db.insert(procurementSourcingBidAccessLog).values({
      businessId: input.businessId,
      eventId: input.eventId,
      profileId: input.profileId ?? null,
      actorUserId: input.actorUserId,
      action: input.action,
    });
  }

  async updateAwardApproval(
    businessId: string,
    eventId: string,
    values: Parameters<SourcingStorePort["updateAwardApproval"]>[2]
  ) {
    const db = getDb();
    const [updated] = await db
      .update(procurementSourcingEvent)
      .set({
        awardApprovalStatus: values.awardApprovalStatus,
        awardSubmittedAt: values.awardSubmittedAt,
        awardSubmittedBy: values.awardSubmittedBy,
        awardApprovedAt: values.awardApprovedAt,
        awardApprovedBy: values.awardApprovedBy,
        recommendation: values.recommendation,
        updatedBy: values.updatedBy,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(procurementSourcingEvent.id, eventId),
          eq(procurementSourcingEvent.businessId, businessId),
          isNull(procurementSourcingEvent.deletedAt)
        )
      )
      .returning({ id: procurementSourcingEvent.id });
    if (!updated) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.SOURCING_NOT_FOUND, undefined, 404);
    }
  }
}

export function createSourcingRepository() {
  return new SourcingRepository();
}
