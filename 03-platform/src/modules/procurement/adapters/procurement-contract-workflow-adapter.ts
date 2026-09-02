/**
 * Purpose:
 * ENG-005 adapter for contract approval. Policy comes from procurement_contract_control.
 */

import {
  InProcessWorkflowAdapter,
  type WorkflowEnginePort,
} from "@/core/workflow-engine";
import { WORKFLOW_OPERATIONS } from "@/core/workflow-engine/constants";
import type { ContractControlPort } from "@/modules/procurement/ports";

export class ProcurementContractWorkflowAdapter implements WorkflowEnginePort {
  private readonly inner = new InProcessWorkflowAdapter();

  constructor(private readonly controls: ContractControlPort) {}

  evaluateRefundApproval = this.inner.evaluateRefundApproval.bind(this.inner);
  evaluateExceptionResolution = this.inner.evaluateExceptionResolution.bind(this.inner);
  evaluatePurchaseRequestApproval = this.inner.evaluatePurchaseRequestApproval.bind(this.inner);
  assertDistinctActors = this.inner.assertDistinctActors.bind(this.inner);

  async evaluateOperationApproval(request: {
    businessId: string;
    operationCode: string;
  }) {
    if (
      request.operationCode === WORKFLOW_OPERATIONS.CONTRACT_APPROVAL ||
      request.operationCode === WORKFLOW_OPERATIONS.CONTRACT_AMENDMENT_APPROVAL
    ) {
      const control = await this.controls.getControl(request.businessId);
      return {
        required: control?.requiresApproval ?? true,
        operation: request.operationCode,
      };
    }
    return this.inner.evaluateOperationApproval(request);
  }
}

export function createProcurementContractWorkflowAdapter(
  controls: ContractControlPort
): WorkflowEnginePort {
  return new ProcurementContractWorkflowAdapter(controls);
}
