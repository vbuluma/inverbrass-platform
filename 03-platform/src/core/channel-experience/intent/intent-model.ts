/**
 * Purpose:
 * ENG-003o — Intent → Capability mapping contract (no LLM in this phase).
 *
 * Intents never mutate domain state directly. They resolve to registered capabilities.
 */

import type { BusinessIntentCode, IntentResolution } from "@/core/channel-experience/types";

const INTENT_CAPABILITY_MAP: Record<BusinessIntentCode, string> = {
  PRODUCT_PRICE_QUERY: "PRICE_QUERY",
  STOCK_AVAILABILITY_QUERY: "STOCK_AVAILABILITY_QUERY",
  CREATE_ORDER_REQUEST: "CREATE_SALE",
  VIEW_ORDER_STATUS: "VIEW_ORDER",
  INITIATE_PAYMENT_REQUEST: "INITIATE_PAYMENT",
  VIEW_SUPPLIER: "VIEW_SUPPLIER",
  CREATE_PROCUREMENT_REQUEST: "CREATE_PROCUREMENT_REQUEST",
  VIEW_PROCUREMENT_STATUS: "VIEW_PROCUREMENT_STATUS",
};

export function resolveIntentToCapability(
  intentCode: BusinessIntentCode
): IntentResolution {
  return {
    intentCode,
    capabilityId: INTENT_CAPABILITY_MAP[intentCode],
    confidence: 1,
  };
}

export function listIntentMappings(): readonly IntentResolution[] {
  return (Object.keys(INTENT_CAPABILITY_MAP) as BusinessIntentCode[]).map(
    resolveIntentToCapability
  );
}
