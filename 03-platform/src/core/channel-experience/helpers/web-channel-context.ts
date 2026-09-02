/**
 * Purpose:
 * ENG-003o — Generic Web channel context resolution for all domain entry points.
 */

import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { invokeWebCapability } from "@/core/channel-experience/adapters/web-channel-adapter";
import {
  DOMAIN_PERMISSION_PREFIXES,
  type DomainWorkspaceCapability,
} from "@/core/channel-experience/domain-capabilities";
import {
  CHANNEL_EXPERIENCE_ERROR_CODES,
  ChannelExperienceError,
} from "@/core/channel-experience/errors";
import type { ChannelExecutionContext } from "@/core/channel-experience/types";
import type { CurrentBusinessContext } from "@/core/auth/types";

export type WebChannelContextResult = {
  context: CurrentBusinessContext;
  execution: ChannelExecutionContext;
  permissionCodes: readonly string[];
  roleCodes: readonly string[];
};

export type ChannelAccessDeniedHandler = (reason?: string) => never;

export type WebChannelContextOptions = {
  capabilityId: DomainWorkspaceCapability | string;
  requirePermissionPrefix?: string | null;
  onSessionRequired?: () => never;
  onBusinessContextRequired?: () => never;
  onUnauthorized?: ChannelAccessDeniedHandler;
};

function filterPermissions(
  permissionCodes: readonly string[],
  prefix: string | null | undefined
): readonly string[] {
  if (!prefix) {
    return permissionCodes;
  }
  return permissionCodes.filter((code) => code.startsWith(prefix));
}

function mapChannelError(
  error: unknown,
  options: Pick<
    WebChannelContextOptions,
    "onSessionRequired" | "onBusinessContextRequired" | "onUnauthorized"
  >
): never {
  if (error instanceof ChannelExperienceError) {
    if (error.code === CHANNEL_EXPERIENCE_ERROR_CODES.AUTHENTICATION_REQUIRED) {
      options.onSessionRequired?.();
      throw error;
    }
    if (error.code === CHANNEL_EXPERIENCE_ERROR_CODES.BUSINESS_CONTEXT_REQUIRED) {
      options.onBusinessContextRequired?.();
      throw error;
    }
    options.onUnauthorized?.(error.message);
    throw error;
  }
  throw error;
}

/**
 * Canonical Web channel entry for authenticated staff domain operations.
 */
export async function requireWebChannelContext(
  options: WebChannelContextOptions
): Promise<WebChannelContextResult> {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();
  if (!user) {
    return mapChannelError(
      new ChannelExperienceError(
        CHANNEL_EXPERIENCE_ERROR_CODES.AUTHENTICATION_REQUIRED,
        "Authentication is required.",
        401
      ),
      options
    );
  }

  const businessContextService = createBusinessContextService();
  const context = await businessContextService.getCurrentContext();
  if (!context) {
    return mapChannelError(
      new ChannelExperienceError(
        CHANNEL_EXPERIENCE_ERROR_CODES.BUSINESS_CONTEXT_REQUIRED,
        "Business context is required.",
        403
      ),
      options
    );
  }

  const permissionPrefix =
    options.requirePermissionPrefix ??
    DOMAIN_PERMISSION_PREFIXES[options.capabilityId as DomainWorkspaceCapability] ??
    null;

  try {
    const response = await invokeWebCapability(
      options.capabilityId,
      async (execution) => ({
        context: execution.businessContext,
        execution,
        permissionCodes: execution.identity.permissionCodes,
        roleCodes: execution.identity.roleCodes,
      })
    );

    const domainPermissions = filterPermissions(
      response.data.permissionCodes,
      permissionPrefix
    );

    if (permissionPrefix && domainPermissions.length === 0) {
      options.onUnauthorized?.("Required domain permissions are missing.");
      throw new ChannelExperienceError(
        CHANNEL_EXPERIENCE_ERROR_CODES.PERMISSION_DENIED,
        "Required domain permissions are missing.",
        403
      );
    }

    return {
      context: response.data.context,
      execution: response.data.execution,
      permissionCodes: domainPermissions,
      roleCodes: response.data.roleCodes,
    };
  } catch (error) {
    return mapChannelError(error, options);
  }
}

export function buildPermissionActor(
  context: CurrentBusinessContext,
  permissionCodes: readonly string[]
): { userId: string; permissions: readonly string[] } {
  return {
    userId: context.platformUserId,
    permissions: permissionCodes,
  };
}
