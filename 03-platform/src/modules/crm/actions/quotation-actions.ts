"use server";

/**
 * Purpose:
 * Expose Quotation server actions to the App Router UI.
 *
 * Implementation Package:
 * BP-004 / IP-10 – Quotations & Sales Pipeline
 */

import { requireCrmChannelContext as requireCrmContext } from "@/core/channel-experience/helpers/domain-channel-entry";
import { revalidatePath } from "next/cache";

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { CrmError } from "@/modules/crm/errors";
import { createQuotationCustomer360Provider } from "@/modules/crm/quotation/services/quotation-customer-360-provider";
import { createQuotationService } from "@/modules/crm/quotation/services/quotation-service";
import type {
  AddQuotationLinePayload,
  CreateQuotationPayload,
  QuotationCustomer360Contribution,
  QuotationDashboardView,
  QuotationDetailView,
  QuotationDocumentView,
  QuotationSearchFilters,
  QuotationSearchResultView,
  QuotationVersionView,
  ReviseQuotationPayload,
  SalesOrderDetailView,
  UpdateQuotationHeaderPayload,
  UpdateQuotationLinePayload,
} from "@/modules/crm/quotation/types";


function isNextDynamicServerError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    String((error as { digest: string }).digest).includes("DYNAMIC_SERVER_USAGE")
  );
}

function toActionError(error: unknown): AuthActionResult<never> {
  if (isNextRedirectError(error) || isNextDynamicServerError(error)) {
    throw error;
  }
  if (error instanceof CrmError) {
    return { success: false, error: { code: error.code, message: error.message } };
  }
  if (error instanceof AuthError) {
    return { success: false, error: { code: error.code, message: error.message } };
  }
  console.error("[quotation-actions] Unexpected error", error);
  return {
    success: false,
    error: {
      code: "PROVIDER_ERROR",
      message: "We could not complete that quotation action. Please try again.",
    },
  };
}

function revalidateQuotation(quotationId?: string) {
  revalidatePath("/quotations");
  if (quotationId) {
    revalidatePath(`/quotations/${quotationId}`);
  }
}

export async function getQuotationDashboardAction(): Promise<
  AuthActionResult<QuotationDashboardView>
> {
  try {
    const context = await requireCrmContext();
    const data = await createQuotationService().getDashboard(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function searchQuotationsAction(
  filters: QuotationSearchFilters
): Promise<AuthActionResult<QuotationSearchResultView>> {
  try {
    const context = await requireCrmContext();
    const data = await createQuotationService().searchQuotations(context, filters);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getQuotationAction(
  quotationId: string
): Promise<AuthActionResult<QuotationDetailView>> {
  try {
    const context = await requireCrmContext();
    const data = await createQuotationService().getQuotationDetail(context, quotationId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createQuotationAction(
  payload: CreateQuotationPayload
): Promise<AuthActionResult<QuotationDetailView>> {
  try {
    const context = await requireCrmContext();
    const data = await createQuotationService().createQuotation(context, payload);
    revalidateQuotation(data.id);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateQuotationHeaderAction(
  quotationId: string,
  payload: UpdateQuotationHeaderPayload
): Promise<AuthActionResult<QuotationDetailView>> {
  try {
    const context = await requireCrmContext();
    const data = await createQuotationService().updateQuotationHeader(
      context,
      quotationId,
      payload
    );
    revalidateQuotation(quotationId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function addQuotationLineAction(
  quotationId: string,
  payload: AddQuotationLinePayload
): Promise<AuthActionResult<QuotationDetailView>> {
  try {
    const context = await requireCrmContext();
    const data = await createQuotationService().addQuotationLine(
      context,
      quotationId,
      payload
    );
    revalidateQuotation(quotationId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function sendQuotationAction(
  quotationId: string
): Promise<AuthActionResult<QuotationDetailView>> {
  try {
    const context = await requireCrmContext();
    const data = await createQuotationService().sendQuotation(context, quotationId);
    revalidateQuotation(quotationId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function acceptQuotationAction(
  quotationId: string,
  options: { acceptanceChannel?: string } = {}
): Promise<AuthActionResult<QuotationDetailView>> {
  try {
    const context = await requireCrmContext();
    const data = await createQuotationService().acceptQuotation(
      context,
      quotationId,
      options
    );
    revalidateQuotation(quotationId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function rejectQuotationAction(
  quotationId: string
): Promise<AuthActionResult<QuotationDetailView>> {
  try {
    const context = await requireCrmContext();
    const data = await createQuotationService().rejectQuotation(context, quotationId);
    revalidateQuotation(quotationId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function reviseQuotationAction(
  quotationId: string,
  payload: ReviseQuotationPayload = {}
): Promise<AuthActionResult<QuotationDetailView>> {
  try {
    const context = await requireCrmContext();
    const data = await createQuotationService().reviseQuotation(
      context,
      quotationId,
      payload
    );
    revalidateQuotation(quotationId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function submitQuotationApprovalAction(
  quotationId: string
): Promise<AuthActionResult<QuotationDetailView>> {
  try {
    const context = await requireCrmContext();
    const data = await createQuotationService().submitForApproval(context, quotationId);
    revalidateQuotation(quotationId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function approveQuotationAction(
  quotationId: string
): Promise<AuthActionResult<QuotationDetailView>> {
  try {
    const context = await requireCrmContext();
    const data = await createQuotationService().approveQuotation(context, quotationId);
    revalidateQuotation(quotationId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function generateQuotationDocumentAction(
  quotationId: string
): Promise<AuthActionResult<QuotationDocumentView>> {
  try {
    const context = await requireCrmContext();
    const data = await createQuotationService().generateQuotationDocument(
      context,
      quotationId
    );
    revalidateQuotation(quotationId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function convertQuotationToSalesOrderAction(
  quotationId: string
): Promise<AuthActionResult<SalesOrderDetailView>> {
  try {
    const context = await requireCrmContext();
    const data = await createQuotationService().convertToSalesOrder(
      context,
      quotationId
    );
    revalidateQuotation(quotationId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function listQuotationVersionsAction(
  quotationId: string
): Promise<AuthActionResult<QuotationVersionView[]>> {
  try {
    const context = await requireCrmContext();
    const data = await createQuotationService().listQuotationVersions(
      context,
      quotationId
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getQuotationCustomer360Action(
  partyId: string
): Promise<AuthActionResult<QuotationCustomer360Contribution>> {
  try {
    const context = await requireCrmContext();
    const data = await createQuotationCustomer360Provider().getContribution(
      context,
      partyId
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function refreshQuotationPricesAction(
  quotationId: string
): Promise<AuthActionResult<QuotationDetailView>> {
  try {
    const context = await requireCrmContext();
    const data = await createQuotationService().refreshQuotationPrices(
      context,
      quotationId
    );
    revalidateQuotation(quotationId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
