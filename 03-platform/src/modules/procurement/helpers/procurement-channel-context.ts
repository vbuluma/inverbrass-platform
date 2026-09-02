/**
 * Purpose:
 * BP-009 procurement channel entry — delegates to ENG-003o domain helpers.
 */

import { createPermissionResolutionService } from "@/core/auth/services/permission-resolution-service";
import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  requireProcurementChannelContext as requireProcurementChannelContextCore,
} from "@/core/channel-experience/helpers/domain-channel-entry";
import type { ChannelExecutionContext } from "@/core/channel-experience/types";
import type { ProcurementActor } from "@/modules/procurement/types";

const PROCUREMENT_PERMISSION_PREFIX = "Procurement.";

export type ProcurementChannelContext = {
  context: CurrentBusinessContext;
  actor: ProcurementActor;
  execution?: ChannelExecutionContext;
};

export async function resolveProcurementActor(
  context: CurrentBusinessContext
): Promise<ProcurementActor> {
  const { permissionCodes } =
    await createPermissionResolutionService().resolveForContext(context);

  return {
    userId: context.platformUserId,
    permissions: permissionCodes.filter((code) =>
      code.startsWith(PROCUREMENT_PERMISSION_PREFIX)
    ),
  };
}

export async function requireProcurementChannelContext(
  capabilityId = "PROCUREMENT_WORKSPACE"
): Promise<ProcurementChannelContext> {
  const result = await requireProcurementChannelContextCore(capabilityId);
  return {
    context: result.context,
    actor: result.actor,
  };
}
