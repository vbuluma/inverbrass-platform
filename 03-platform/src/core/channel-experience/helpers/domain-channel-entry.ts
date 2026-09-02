/**
 * Purpose:
 * ENG-003o — Domain-specific Web channel entry helpers for server actions.
 *
 * All BP-002–BP-009 domain server actions should use these instead of
 * ad hoc auth/context resolution.
 */

import { DOMAIN_WORKSPACE_CAPABILITIES } from "@/core/channel-experience/domain-capabilities";
import {
  buildPermissionActor,
  requireWebChannelContext,
} from "@/core/channel-experience/helpers/web-channel-context";
import type { CurrentBusinessContext } from "@/core/auth/types";
import { CommercialError } from "@/modules/commercial/errors";
import { InventoryError } from "@/modules/inventory/errors";
import { PaymentObligationError } from "@/modules/payments/errors";
import { ProcurementError } from "@/modules/procurement/errors";
import { SalesOrderError } from "@/modules/sales/errors";

type DomainActor = {
  userId: string;
  permissions: readonly string[];
};

function sessionRequiredSales(): never {
  throw new SalesOrderError("SESSION_REQUIRED", undefined, 401);
}

function businessRequiredSales(): never {
  throw new SalesOrderError("BUSINESS_CONTEXT_REQUIRED", undefined, 403);
}

function unauthorizedSales(reason?: string): never {
  throw new SalesOrderError("CROSS_BUSINESS_ACCESS", reason, 403);
}

function sessionRequiredInventory(): never {
  throw new InventoryError("SESSION_REQUIRED", undefined, 401);
}

function businessRequiredInventory(): never {
  throw new InventoryError("BUSINESS_CONTEXT_REQUIRED", undefined, 403);
}

function unauthorizedInventory(reason?: string): never {
  throw new InventoryError("LOCATION_ACCESS_DENIED", reason, 403);
}

function sessionRequiredPayment(): never {
  throw new PaymentObligationError("SESSION_REQUIRED", undefined, 401);
}

function businessRequiredPayment(): never {
  throw new PaymentObligationError("BUSINESS_CONTEXT_REQUIRED", undefined, 403);
}

function unauthorizedPayment(reason?: string): never {
  throw new PaymentObligationError("CROSS_BUSINESS_ACCESS", reason, 403);
}

function sessionRequiredProcurement(): never {
  throw new ProcurementError("SESSION_REQUIRED", undefined, 401);
}

function businessRequiredProcurement(): never {
  throw new ProcurementError("BUSINESS_CONTEXT_REQUIRED", undefined, 403);
}

function unauthorizedProcurement(reason?: string): never {
  throw new ProcurementError("UNAUTHORIZED", reason, 403);
}

function sessionRequiredCommercial(): never {
  throw new CommercialError(
    "INVALID_INPUT",
    "Your session has expired. Please sign in again.",
    401,
    "session"
  );
}

function businessRequiredCommercial(): never {
  throw new CommercialError(
    "BUSINESS_CONTEXT_MISMATCH",
    "Select a business before continuing.",
    403,
    "businessId"
  );
}

function unauthorizedCommercial(reason?: string): never {
  throw new CommercialError(
    "GOVERNANCE_UNAUTHORIZED",
    reason ?? "Access denied.",
    403
  );
}

function unauthorizedTaxCompliance(reason?: string): never {
  throw new CommercialError(
    "TAX_COMPLIANCE_UNAUTHORIZED",
    reason ?? "Access denied.",
    403
  );
}

function sessionRequiredGeneric(): never {
  throw new CommercialError(
    "INVALID_INPUT",
    "Your session has expired. Please sign in again.",
    401,
    "session"
  );
}

function businessRequiredGeneric(): never {
  throw new CommercialError(
    "BUSINESS_CONTEXT_MISMATCH",
    "Select a business before continuing.",
    403,
    "businessId"
  );
}

function unauthorizedGeneric(reason?: string): never {
  throw new CommercialError(
    "INVALID_INPUT",
    reason ?? "Access denied.",
    403
  );
}

async function requireDomainContext(
  capabilityId: (typeof DOMAIN_WORKSPACE_CAPABILITIES)[keyof typeof DOMAIN_WORKSPACE_CAPABILITIES],
  handlers: {
    onSessionRequired: () => never;
    onBusinessContextRequired: () => never;
    onUnauthorized?: (reason?: string) => never;
  }
): Promise<CurrentBusinessContext> {
  const result = await requireWebChannelContext({
    capabilityId,
    onSessionRequired: handlers.onSessionRequired,
    onBusinessContextRequired: handlers.onBusinessContextRequired,
    onUnauthorized: handlers.onUnauthorized,
  });
  return result.context;
}

async function requireDomainActorContext(
  capabilityId: (typeof DOMAIN_WORKSPACE_CAPABILITIES)[keyof typeof DOMAIN_WORKSPACE_CAPABILITIES],
  handlers: {
    onSessionRequired: () => never;
    onBusinessContextRequired: () => never;
    onUnauthorized?: (reason?: string) => never;
  }
): Promise<{ context: CurrentBusinessContext; actor: DomainActor }> {
  const result = await requireWebChannelContext({
    capabilityId,
    onSessionRequired: handlers.onSessionRequired,
    onBusinessContextRequired: handlers.onBusinessContextRequired,
    onUnauthorized: handlers.onUnauthorized,
  });
  return {
    context: result.context,
    actor: buildPermissionActor(result.context, result.permissionCodes),
  };
}

export async function requirePartyChannelContext(): Promise<CurrentBusinessContext> {
  return requireDomainContext(DOMAIN_WORKSPACE_CAPABILITIES.PARTY, {
    onSessionRequired: sessionRequiredGeneric,
    onBusinessContextRequired: businessRequiredGeneric,
    onUnauthorized: unauthorizedGeneric,
  });
}

export async function requireProductChannelContext(): Promise<CurrentBusinessContext> {
  return requireDomainContext(DOMAIN_WORKSPACE_CAPABILITIES.PRODUCT, {
    onSessionRequired: sessionRequiredGeneric,
    onBusinessContextRequired: businessRequiredGeneric,
  });
}

export async function requireCrmChannelContext(): Promise<CurrentBusinessContext> {
  return requireDomainContext(DOMAIN_WORKSPACE_CAPABILITIES.CRM, {
    onSessionRequired: sessionRequiredGeneric,
    onBusinessContextRequired: businessRequiredGeneric,
  });
}

export async function requireCommercialChannelContext(): Promise<CurrentBusinessContext> {
  return requireDomainContext(DOMAIN_WORKSPACE_CAPABILITIES.COMMERCIAL, {
    onSessionRequired: sessionRequiredCommercial,
    onBusinessContextRequired: businessRequiredCommercial,
    onUnauthorized: unauthorizedCommercial,
  });
}

export async function requireCommercialGovernanceChannelContext(): Promise<{
  context: CurrentBusinessContext;
  actor: DomainActor & { roleCode: string | null };
}> {
  const result = await requireWebChannelContext({
    capabilityId: DOMAIN_WORKSPACE_CAPABILITIES.COMMERCIAL_GOVERNANCE,
    onSessionRequired: sessionRequiredCommercial,
    onBusinessContextRequired: businessRequiredCommercial,
    onUnauthorized: unauthorizedCommercial,
  });
  return {
    context: result.context,
    actor: {
      ...buildPermissionActor(result.context, result.permissionCodes),
      roleCode: result.roleCodes[0] ?? null,
    },
  };
}

export async function requireTaxComplianceChannelContext(): Promise<{
  context: CurrentBusinessContext;
  actor: DomainActor;
}> {
  return requireDomainActorContext(DOMAIN_WORKSPACE_CAPABILITIES.TAX_COMPLIANCE, {
    onSessionRequired: sessionRequiredCommercial,
    onBusinessContextRequired: businessRequiredCommercial,
    onUnauthorized: unauthorizedTaxCompliance,
  });
}

export async function requireSalesChannelContext(): Promise<CurrentBusinessContext> {
  return requireDomainContext(DOMAIN_WORKSPACE_CAPABILITIES.SALES, {
    onSessionRequired: sessionRequiredSales,
    onBusinessContextRequired: businessRequiredSales,
    onUnauthorized: unauthorizedSales,
  });
}

export async function requirePaymentChannelContext(): Promise<CurrentBusinessContext> {
  return requireDomainContext(DOMAIN_WORKSPACE_CAPABILITIES.PAYMENT, {
    onSessionRequired: sessionRequiredPayment,
    onBusinessContextRequired: businessRequiredPayment,
    onUnauthorized: unauthorizedPayment,
  });
}

export async function requireInventoryChannelContext(): Promise<CurrentBusinessContext> {
  return requireDomainContext(DOMAIN_WORKSPACE_CAPABILITIES.INVENTORY, {
    onSessionRequired: sessionRequiredInventory,
    onBusinessContextRequired: businessRequiredInventory,
    onUnauthorized: unauthorizedInventory,
  });
}

export async function requireProcurementChannelContext(
  capabilityId: string = DOMAIN_WORKSPACE_CAPABILITIES.PROCUREMENT
): Promise<{
  context: CurrentBusinessContext;
  actor: DomainActor;
}> {
  const result = await requireWebChannelContext({
    capabilityId,
    onSessionRequired: sessionRequiredProcurement,
    onBusinessContextRequired: businessRequiredProcurement,
    onUnauthorized: unauthorizedProcurement,
  });
  return {
    context: result.context,
    actor: buildPermissionActor(result.context, result.permissionCodes),
  };
}
