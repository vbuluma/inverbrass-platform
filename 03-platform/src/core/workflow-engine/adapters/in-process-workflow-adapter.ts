/**
 * Purpose:
 * In-process ENG-005 adapter for refund maker-checker. Policy is
 * configuration, not a BP-007 approval framework.
 *
 * Engine:
 * ENG-005 – Workflow & Approval Engine
 */

import { WORKFLOW_ENGINE_ERROR_CODES, WorkflowEngineError } from "@/core/workflow-engine/errors";
import type { WorkflowEnginePort } from "@/core/workflow-engine/ports";
import { WORKFLOW_OPERATIONS } from "@/core/workflow-engine/constants";
import type {
  EvaluateExceptionResolutionInput,
  EvaluateOperationApprovalInput,
  EvaluateRefundApprovalInput,
  RefundApprovalDecision,
} from "@/core/workflow-engine/types";

export class InProcessWorkflowAdapter implements WorkflowEnginePort {
  requiresApproval: boolean;
  requiresApprovalByOperation: Record<string, boolean>;

  constructor(options?: {
    requiresApproval?: boolean;
    requiresApprovalByOperation?: Record<string, boolean>;
  }) {
    this.requiresApproval = options?.requiresApproval ?? false;
    this.requiresApprovalByOperation = options?.requiresApprovalByOperation ?? {};
  }

  async evaluateRefundApproval(
    input: EvaluateRefundApprovalInput
  ): Promise<RefundApprovalDecision> {
    void input;
    return {
      required: this.requiresApproval,
      operation: WORKFLOW_OPERATIONS.REFUND_APPROVAL,
    };
  }

  async evaluateExceptionResolution(
    input: EvaluateExceptionResolutionInput
  ): Promise<RefundApprovalDecision> {
    void input;
    return {
      required: this.requiresApproval,
      operation: WORKFLOW_OPERATIONS.EXCEPTION_RESOLUTION,
    };
  }

  async evaluateOperationApproval(
    input: EvaluateOperationApprovalInput
  ): Promise<RefundApprovalDecision> {
    const required =
      this.requiresApprovalByOperation[input.operationCode] ?? this.requiresApproval;
    return {
      required,
      operation: input.operationCode,
    };
  }

  assertDistinctActors(requesterId: string, approverId: string, message?: string): void {
    if (requesterId.trim() && requesterId === approverId) {
      throw new WorkflowEngineError(
        WORKFLOW_ENGINE_ERROR_CODES.SELF_APPROVAL,
        message ?? "The person who requested this refund cannot approve it.",
        409
      );
    }
  }
}

export function createInProcessWorkflowAdapter(options?: {
  requiresApproval?: boolean;
  requiresApprovalByOperation?: Record<string, boolean>;
}) {
  return new InProcessWorkflowAdapter(options);
}
