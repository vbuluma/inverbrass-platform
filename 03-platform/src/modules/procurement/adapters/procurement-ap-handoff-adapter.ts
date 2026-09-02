/**
 * Purpose:
 * In-process AP handoff stub for BP-009 IP-09. Does not execute payment.
 */

import type { ProcurementApHandoffPort } from "@/modules/procurement/ports";
import type {
  ProcurementApHandoffRequest,
  ProcurementApHandoffResult,
} from "@/modules/procurement/types";

let handoffCounter = 1;

export class InProcessApHandoffAdapter implements ProcurementApHandoffPort {
  readonly handoffCounter = () => handoffCounter;

  async processHandoff(
    request: ProcurementApHandoffRequest
  ): Promise<ProcurementApHandoffResult> {
    const reference = `AP-REF-${String(handoffCounter).padStart(6, "0")}`;
    handoffCounter += 1;
    return {
      success: true,
      handoffReference: reference,
      errorMessage: null,
    };
  }
}

export function createInProcessApHandoffAdapter(): ProcurementApHandoffPort {
  return new InProcessApHandoffAdapter();
}
