/**
 * ENG-003k — Resolve product user messages for a business context.
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  createIndustryExperienceService,
  resolveBusinessTerminology,
} from "@/core/industry-experience";
import {
  buildProductUserMessages,
  type ProductUserMessages,
} from "@/modules/product/product-user-messages";

export async function resolveProductUserMessages(
  businessId: string
): Promise<ProductUserMessages> {
  const industryService = createIndustryExperienceService();
  const industryContext =
    await industryService.getBusinessIndustryContext(businessId);
  return buildProductUserMessages(
    resolveBusinessTerminology(industryContext.industryCode)
  );
}

export async function resolveProductUserMessagesForContext(
  context: CurrentBusinessContext
): Promise<ProductUserMessages> {
  return resolveProductUserMessages(context.businessId);
}
