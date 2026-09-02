/**
 * Purpose:
 * ENG-005 adapter for purchase-request approval. Policy comes from
 * procurement_request_control — not a pack-local workflow engine.
 *
 * Engine:
 * ENG-005 – Workflow & Approval Engine
 */

import {
  InProcessWorkflowAdapter,
  type WorkflowEnginePort,
} from "@/core/workflow-engine";
import { WORKFLOW_OPERATIONS } from "@/core/workflow-engine/constants";
import type {
  EvaluatePurchaseRequestApprovalInput,
  RefundApprovalDecision,
} from "@/core/workflow-engine/types";
import type { PurchaseRequestControlPort } from "@/modules/procurement/ports";

export class ProcurementRequestWorkflowAdapter implements WorkflowEnginePort {
  private readonly inner = new InProcessWorkflowAdapter();

  constructor(private readonly controls: PurchaseRequestControlPort) {}

  evaluateRefundApproval = this.inner.evaluateRefundApproval.bind(this.inner);
  evaluateExceptionResolution = this.inner.evaluateExceptionResolution.bind(this.inner);
  assertDistinctActors = this.inner.assertDistinctActors.bind(this.inner);

  async evaluateOperationApproval(request: {
    businessId: string;
    operationCode: string;
  }): Promise<RefundApprovalDecision> {
    return this.evaluatePurchaseRequestApproval({
      businessId: request.businessId,
      operationCode: request.operationCode,
    });
  }

  async evaluatePurchaseRequestApproval(
    request: EvaluatePurchaseRequestApprovalInput
  ): Promise<RefundApprovalDecision> {
    const control = await this.controls.getControl(request.businessId);
    return {
      required: control?.requiresApproval ?? true,
      operation: request.operationCode || WORKFLOW_OPERATIONS.PURCHASE_REQUEST_APPROVAL,
    };
  }
}

export function createProcurementRequestWorkflowAdapter(
  controls: PurchaseRequestControlPort
): WorkflowEnginePort {
  return new ProcurementRequestWorkflowAdapter(controls);
}
