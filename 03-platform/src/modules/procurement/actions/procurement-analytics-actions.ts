"use server";

/**
 * Purpose:
 * Server actions for BP-009 IP-12 procurement analytics.
 */

import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { ProcurementError } from "@/modules/procurement";
import { requireProcurementChannelContext } from "@/modules/procurement/helpers/procurement-channel-context";
import { createProcurementAnalyticsService } from "@/modules/procurement/services/procurement-analytics-service";
import type {
  ProcurementAnalyticsDashboardView,
  ProcurementLifecycleChainView,
} from "@/modules/procurement/types";

export type AnalyticsActionError = { code: string; message: string; field?: string };
export type AnalyticsActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: AnalyticsActionError };

function toError(error: unknown): AnalyticsActionError {
  if (error instanceof ProcurementError) {
    return { code: error.code, message: error.message, field: error.field };
  }
  if (isNextRedirectError(error)) {
    throw error;
  }
  return { code: "PROVIDER_ERROR", message: "Procurement analytics could not be completed." };
}

export async function getProcurementAnalyticsDashboardAction(): Promise<
  AnalyticsActionResult<ProcurementAnalyticsDashboardView>
> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createProcurementAnalyticsService().getDashboard(context, actor);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: toError(error) };
  }
}

export async function getProcurementLifecycleAction(
  anchorType: string,
  anchorId: string
): Promise<AnalyticsActionResult<ProcurementLifecycleChainView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createProcurementAnalyticsService().getLifecycleChain(
      context,
      actor,
      anchorType,
      anchorId
    );
    return { success: true, data };
  } catch (error) {
    return { success: false, error: toError(error) };
  }
}

export async function exportProcurementAnalyticsCsvAction(): Promise<
  AnalyticsActionResult<{ csv: string }>
> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const csv = await createProcurementAnalyticsService().exportDashboardCsv(context, actor);
    return { success: true, data: { csv } };
  } catch (error) {
    return { success: false, error: toError(error) };
  }
}
