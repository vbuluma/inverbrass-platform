"use server";

/**
 * Purpose:
 * Server actions for BP-009 IP-03 sourcing, evaluation outcome, and awards.
 */

import { revalidatePath } from "next/cache";

import { AuthError } from "@/core/auth/errors";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { ProcurementError } from "@/modules/procurement";
import { requireProcurementChannelContext } from "@/modules/procurement/helpers/procurement-channel-context";
import { createSourcingService } from "@/modules/procurement/services/sourcing-service";
import type {
  OpenBidsCommand,
  RecordPhaseScoresCommand,
  AwardSourcingCommand,
  AnswerClarificationCommand,
  AskClarificationCommand,
  ConfigureEvaluationCriteriaCommand,
  CreateSourcingEventCommand,
  EvaluationWorkspaceView,
  ExtendTenderCommand,
  InviteSupplierCommand,
  RecordDueDiligenceCommand,
  SetupEvaluationCommitteeCommand,
  SourcingEventListFilter,
  SourcingEventListView,
  SubmitQuoteCommand,
  SupplierPortalView,
} from "@/modules/procurement/types";

export type SourcingActionError = {
  code: string;
  message: string;
  field?: string;
};

export type SourcingActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: SourcingActionError };

function toActionError(error: unknown): SourcingActionResult<never> {
  if (isNextRedirectError(error)) {
    throw error;
  }
  if (error instanceof ProcurementError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        field: error.field,
      },
    };
  }
  if (error instanceof AuthError) {
    return {
      success: false,
      error: { code: error.code, message: error.message },
    };
  }
  return {
    success: false,
    error: {
      code: "PROVIDER_ERROR",
      message: "The sourcing event could not be saved. Please try again.",
    },
  };
}

function revalidateSourcing(id?: string) {
  revalidatePath("/procurement");
  revalidatePath("/procurement/sourcing");
  revalidatePath("/procurement/sourcing/evaluations");
  revalidatePath("/procurement/sourcing/awards");
  if (id) {
    revalidatePath(`/procurement/sourcing/${id}`);
  }
}

export async function listSourcingEventsAction(
  filter: SourcingEventListFilter = {}
): Promise<SourcingActionResult<SourcingEventListView[]>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createSourcingService().list(context, actor, filter);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getEvaluationAction(
  eventId: string
): Promise<SourcingActionResult<EvaluationWorkspaceView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createSourcingService().getEvaluation(context, actor, eventId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createSourcingEventAction(
  input: CreateSourcingEventCommand
): Promise<SourcingActionResult<EvaluationWorkspaceView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createSourcingService().create(context, actor, input);
    revalidateSourcing(data.id);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function inviteSupplierAction(
  eventId: string,
  input: InviteSupplierCommand
): Promise<SourcingActionResult<EvaluationWorkspaceView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createSourcingService().inviteSupplier(context, actor, eventId, input);
    revalidateSourcing(data.id);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function recordSupplierQuoteAction(
  eventId: string,
  input: SubmitQuoteCommand
): Promise<SourcingActionResult<EvaluationWorkspaceView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createSourcingService().submitQuote(context, actor, eventId, input);
    revalidateSourcing(data.id);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function withdrawSupplierQuoteAction(
  eventId: string,
  profileId: string
): Promise<SourcingActionResult<EvaluationWorkspaceView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createSourcingService().withdrawQuote(context, actor, eventId, profileId);
    revalidateSourcing(data.id);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function askClarificationAction(
  eventId: string,
  input: AskClarificationCommand
): Promise<SourcingActionResult<EvaluationWorkspaceView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createSourcingService().askClarification(context, actor, eventId, input);
    revalidateSourcing(data.id);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function answerClarificationAction(
  eventId: string,
  input: AnswerClarificationCommand
): Promise<SourcingActionResult<EvaluationWorkspaceView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createSourcingService().answerClarification(context, actor, eventId, input);
    revalidateSourcing(data.id);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function awardSourcingAction(
  eventId: string,
  input: AwardSourcingCommand
): Promise<SourcingActionResult<EvaluationWorkspaceView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createSourcingService().awardSuppliers(context, actor, eventId, input);
    revalidateSourcing(data.id);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function extendTenderAction(
  eventId: string,
  input: ExtendTenderCommand
): Promise<SourcingActionResult<EvaluationWorkspaceView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createSourcingService().extendTender(context, actor, eventId, input);
    revalidateSourcing(data.id);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function closeTenderAction(
  eventId: string
): Promise<SourcingActionResult<EvaluationWorkspaceView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createSourcingService().closeTender(context, actor, eventId);
    revalidateSourcing(data.id);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function setupEvaluationCommitteeAction(
  eventId: string,
  input: SetupEvaluationCommitteeCommand
): Promise<SourcingActionResult<EvaluationWorkspaceView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createSourcingService().setupEvaluationCommittee(
      context,
      actor,
      eventId,
      input
    );
    revalidateSourcing(data.id);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function configureEvaluationCriteriaAction(
  eventId: string,
  input: ConfigureEvaluationCriteriaCommand
): Promise<SourcingActionResult<EvaluationWorkspaceView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createSourcingService().configureEvaluationCriteria(
      context,
      actor,
      eventId,
      input
    );
    revalidateSourcing(data.id);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function lockEvaluationCriteriaAction(
  eventId: string
): Promise<SourcingActionResult<EvaluationWorkspaceView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createSourcingService().lockEvaluationCriteria(context, actor, eventId);
    revalidateSourcing(data.id);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function approveAwardAction(
  eventId: string,
  input: { approvedBy?: string | null } = {}
): Promise<SourcingActionResult<EvaluationWorkspaceView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createSourcingService().approveAward(context, actor, eventId, input);
    revalidateSourcing(data.id);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function startEvaluationAction(
  eventId: string
): Promise<SourcingActionResult<EvaluationWorkspaceView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createSourcingService().startEvaluation(context, actor, eventId);
    revalidateSourcing(data.id);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function recordDueDiligenceAction(
  eventId: string,
  input: RecordDueDiligenceCommand
): Promise<SourcingActionResult<EvaluationWorkspaceView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createSourcingService().recordDueDiligence(
      context,
      actor,
      eventId,
      input
    );
    revalidateSourcing(data.id);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function openBidsAction(
  eventId: string,
  input: OpenBidsCommand = {}
): Promise<SourcingActionResult<EvaluationWorkspaceView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createSourcingService().openBids(context, actor, eventId, input);
    revalidateSourcing(data.id);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function recordPhaseScoresAction(
  eventId: string,
  input: RecordPhaseScoresCommand
): Promise<SourcingActionResult<EvaluationWorkspaceView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createSourcingService().recordPhaseScores(
      context,
      actor,
      eventId,
      input
    );
    revalidateSourcing(data.id);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getSupplierPortalAction(
  token: string
): Promise<SourcingActionResult<SupplierPortalView>> {
  try {
    const data = await createSourcingService().getPortalByToken(token);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function submitSupplierPortalQuoteAction(
  token: string,
  input: SubmitQuoteCommand | string
): Promise<SourcingActionResult<SupplierPortalView>> {
  try {
    const command = typeof input === "string" ? { amount: input } : input;
    const data = await createSourcingService().submitQuoteByToken(token, command);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function withdrawSupplierPortalQuoteAction(
  token: string
): Promise<SourcingActionResult<SupplierPortalView>> {
  try {
    const data = await createSourcingService().withdrawQuoteByToken(token);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function askSupplierPortalClarificationAction(
  token: string,
  question: string
): Promise<SourcingActionResult<SupplierPortalView>> {
  try {
    const data = await createSourcingService().askClarificationByToken(token, question);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
