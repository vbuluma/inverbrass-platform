/**
 * Purpose:
 * ENG-005 adapter for sourcing extension approval. Policy comes from
 * procurement_sourcing_control — not a pack-local workflow engine.
 */

import {
  InProcessWorkflowAdapter,
  type WorkflowEnginePort,
} from "@/core/workflow-engine";
import { WORKFLOW_OPERATIONS } from "@/core/workflow-engine/constants";
import type { RefundApprovalDecision } from "@/core/workflow-engine/types";
import type { SourcingStorePort } from "@/modules/procurement/ports";

export class ProcurementSourcingWorkflowAdapter implements WorkflowEnginePort {
  private readonly inner = new InProcessWorkflowAdapter();

  constructor(private readonly store: SourcingStorePort) {}

  evaluateRefundApproval = this.inner.evaluateRefundApproval.bind(this.inner);
  evaluateExceptionResolution = this.inner.evaluateExceptionResolution.bind(this.inner);
  evaluatePurchaseRequestApproval = this.inner.evaluatePurchaseRequestApproval.bind(this.inner);
  assertDistinctActors = this.inner.assertDistinctActors.bind(this.inner);

  async evaluateOperationApproval(request: {
    businessId: string;
    operationCode: string;
  }): Promise<RefundApprovalDecision> {
    if (request.operationCode === WORKFLOW_OPERATIONS.SOURCING_EXTENSION_APPROVAL) {
      const control = await this.store.getOrCreateControl(request.businessId);
      return {
        required: control.extensionRequiresApproval,
        operation: WORKFLOW_OPERATIONS.SOURCING_EXTENSION_APPROVAL,
      };
    }
    if (request.operationCode === WORKFLOW_OPERATIONS.SOURCING_AWARD_APPROVAL) {
      const control = await this.store.getOrCreateControl(request.businessId);
      return {
        required: control.awardRequiresApproval,
        operation: WORKFLOW_OPERATIONS.SOURCING_AWARD_APPROVAL,
      };
    }
    return this.inner.evaluateOperationApproval(request);
  }
}

export function createProcurementSourcingWorkflowAdapter(
  store: SourcingStorePort
): WorkflowEnginePort {
  return new ProcurementSourcingWorkflowAdapter(store);
}
