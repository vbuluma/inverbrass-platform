"use server";

/**
 * Purpose:
 * Expose Account & Contact Management server actions.
 *
 * Implementation Package:
 * BP-004 / IP-04 – Customer & Contact Management
 */

import { requireCrmChannelContext as requireAccountContext } from "@/core/channel-experience/helpers/domain-channel-entry";
import { revalidatePath } from "next/cache";

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { AccountError } from "@/modules/crm/account/errors";
import { createAccountService } from "@/modules/crm/account/services/account-service";
import type {
  AccountDashboardView,
  AccountDetailView,
  AccountListFilters,
  AccountListView,
  AccountRegistrationCatalogues,
  AccountSummaryView,
  AssignAccountContactPayload,
  CreateAccountPayload,
  UpdateAccountContactPayload,
  UpdateAccountPayload,
} from "@/modules/crm/account/types";
import { createPartyService } from "@/modules/party/services/party-service";
import type { PartySearchResultView } from "@/modules/party/types";

export type AccountActionResult<T> = AuthActionResult<T>;


function mapError(error: unknown): AccountActionResult<never> {
  if (isNextRedirectError(error)) throw error;

  if (error instanceof AccountError) {
    return {
      success: false,
      error: { code: error.code, message: error.message, field: error.field },
    };
  }

  if (error instanceof AuthError) {
    return { success: false, error: { code: error.code, message: error.message } };
  }

  console.error("[account-actions]", error);
  return {
    success: false,
    error: {
      code: "PROVIDER_ERROR",
      message: "Something went wrong. Please try again.",
    },
  };
}

export async function getAccountDashboardAction(): Promise<
  AccountActionResult<AccountDashboardView>
> {
  try {
    const context = await requireAccountContext();
    const data = await createAccountService().getDashboard(context);
    return { success: true, data };
  } catch (error) {
    return mapError(error);
  }
}

export async function getAccountRegistrationCataloguesAction(): Promise<
  AccountActionResult<AccountRegistrationCatalogues>
> {
  try {
    const context = await requireAccountContext();
    const data = await createAccountService().getRegistrationCatalogues(context);
    return { success: true, data };
  } catch (error) {
    return mapError(error);
  }
}

export async function createAccountAction(
  payload: CreateAccountPayload
): Promise<AccountActionResult<AccountDetailView>> {
  try {
    const context = await requireAccountContext();
    const data = await createAccountService().createAccount(context, payload);
    revalidatePath("/accounts");
    if (data.crmRecordId) {
      revalidatePath(`/customers/${data.crmRecordId}`);
    }
    return { success: true, data };
  } catch (error) {
    return mapError(error);
  }
}

export async function getAccountAction(
  accountId: string
): Promise<AccountActionResult<AccountDetailView>> {
  try {
    const context = await requireAccountContext();
    const data = await createAccountService().getAccount(context, accountId);
    return { success: true, data };
  } catch (error) {
    return mapError(error);
  }
}

export async function listAccountsAction(
  filters: AccountListFilters
): Promise<AccountActionResult<AccountListView>> {
  try {
    const context = await requireAccountContext();
    const data = await createAccountService().listAccounts(context, filters);
    return { success: true, data };
  } catch (error) {
    return mapError(error);
  }
}

export async function searchAccountsAction(
  query: string
): Promise<AccountActionResult<AccountSummaryView[]>> {
  try {
    const context = await requireAccountContext();
    const data = await createAccountService().searchAccounts(context, query);
    return { success: true, data };
  } catch (error) {
    return mapError(error);
  }
}

export async function updateAccountAction(
  accountId: string,
  payload: UpdateAccountPayload
): Promise<AccountActionResult<AccountDetailView>> {
  try {
    const context = await requireAccountContext();
    const data = await createAccountService().updateAccount(
      context,
      accountId,
      payload
    );
    revalidatePath("/accounts");
    revalidatePath(`/accounts/${accountId}`);
    return { success: true, data };
  } catch (error) {
    return mapError(error);
  }
}

export async function assignAccountContactAction(
  accountId: string,
  payload: AssignAccountContactPayload
): Promise<AccountActionResult<AccountDetailView>> {
  try {
    const context = await requireAccountContext();
    const data = await createAccountService().assignContact(
      context,
      accountId,
      payload
    );
    revalidatePath(`/accounts/${accountId}`);
    return { success: true, data };
  } catch (error) {
    return mapError(error);
  }
}

export async function updateAccountContactAction(
  accountId: string,
  accountContactId: string,
  payload: UpdateAccountContactPayload
): Promise<AccountActionResult<AccountDetailView>> {
  try {
    const context = await requireAccountContext();
    const data = await createAccountService().updateContact(
      context,
      accountId,
      accountContactId,
      payload
    );
    revalidatePath(`/accounts/${accountId}`);
    return { success: true, data };
  } catch (error) {
    return mapError(error);
  }
}

export async function removeAccountContactAction(
  accountId: string,
  accountContactId: string,
  version: number
): Promise<AccountActionResult<AccountDetailView>> {
  try {
    const context = await requireAccountContext();
    const data = await createAccountService().removeContact(
      context,
      accountId,
      accountContactId,
      version
    );
    revalidatePath(`/accounts/${accountId}`);
    return { success: true, data };
  } catch (error) {
    return mapError(error);
  }
}

export async function searchPartiesForAccountAction(
  query: string
): Promise<AccountActionResult<PartySearchResultView[]>> {
  try {
    const context = await requireAccountContext();
    const data = await createPartyService().searchParties(context, query);
    return { success: true, data };
  } catch (error) {
    return mapError(error);
  }
}
