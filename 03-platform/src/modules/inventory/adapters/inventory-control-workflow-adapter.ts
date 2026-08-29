/**
 * Purpose:
 * ENG-005 adapter that resolves maker-checker from inventory operation
 * controls rather than hard-coding receiving vs opening-balance branches.
 *
 * Engine:
 * ENG-005 – Workflow & Approval Engine
 */

import {
  InProcessWorkflowAdapter,
  type WorkflowEnginePort,
} from "@/core/workflow-engine";
import type { EvaluateOperationApprovalInput, RefundApprovalDecision } from "@/core/workflow-engine/types";
import type { InventoryOperationControlPort } from "@/modules/inventory/ports";

export class InventoryControlWorkflowAdapter implements WorkflowEnginePort {
  private readonly inner = new InProcessWorkflowAdapter();

  constructor(private readonly controls: InventoryOperationControlPort) {}

  evaluateRefundApproval = this.inner.evaluateRefundApproval.bind(this.inner);
  evaluateExceptionResolution = this.inner.evaluateExceptionResolution.bind(this.inner);
  assertDistinctActors = this.inner.assertDistinctActors.bind(this.inner);

  async evaluateOperationApproval(
    request: EvaluateOperationApprovalInput
  ): Promise<RefundApprovalDecision> {
    const control = await this.controls.getControl(request.businessId, request.operationCode);
    return {
      required: control?.requiresApproval ?? true,
      operation: request.operationCode,
    };
  }
}

export function createInventoryControlWorkflowAdapter(
  controls: InventoryOperationControlPort
): WorkflowEnginePort {
  return new InventoryControlWorkflowAdapter(controls);
}
