/**
 * Purpose:
 * ENG-005 adapter for purchase-order approval. Policy comes from
 * procurement_po_control — not a pack-local workflow engine.
 *
 * Engine:
 * ENG-005 – Workflow & Approval Engine
 */

import {
  InProcessWorkflowAdapter,
  type WorkflowEnginePort,
} from "@/core/workflow-engine";
import { WORKFLOW_OPERATIONS } from "@/core/workflow-engine/constants";
import type { RefundApprovalDecision } from "@/core/workflow-engine/types";
import type { PurchaseOrderControlPort } from "@/modules/procurement/ports";

export class ProcurementPoWorkflowAdapter implements WorkflowEnginePort {
  private readonly inner = new InProcessWorkflowAdapter();

  constructor(private readonly controls: PurchaseOrderControlPort) {}

  evaluateRefundApproval = this.inner.evaluateRefundApproval.bind(this.inner);
  evaluateExceptionResolution = this.inner.evaluateExceptionResolution.bind(this.inner);
  evaluatePurchaseRequestApproval = this.inner.evaluatePurchaseRequestApproval.bind(this.inner);
  assertDistinctActors = this.inner.assertDistinctActors.bind(this.inner);

  async evaluateOperationApproval(request: {
    businessId: string;
    operationCode: string;
  }): Promise<RefundApprovalDecision> {
    if (request.operationCode === WORKFLOW_OPERATIONS.PURCHASE_ORDER_APPROVAL) {
      const control = await this.controls.getControl(request.businessId);
      return {
        required: control?.requiresApproval ?? true,
        operation: WORKFLOW_OPERATIONS.PURCHASE_ORDER_APPROVAL,
      };
    }
    return this.inner.evaluateOperationApproval(request);
  }
}

export function createProcurementPoWorkflowAdapter(
  controls: PurchaseOrderControlPort
): WorkflowEnginePort {
  return new ProcurementPoWorkflowAdapter(controls);
}
