/**
 * Purpose:
 * Optional recording of operational inventory incidents from existing services.
 *
 * Implementation Package:
 * BP-008 / IP-09 – Inventory Operations, Exceptions & Controls
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import type { InventoryOpsIncidentPort } from "@/modules/inventory/ports";
import type { RecordOpsIncidentCommand } from "@/modules/inventory/types";

export async function recordDetectedOpsIncident(
  recorder: InventoryOpsIncidentPort | undefined,
  context: CurrentBusinessContext,
  command: RecordOpsIncidentCommand
) {
  if (!recorder) {
    return;
  }
  await recorder.recordFromOperation(context, command);
}
