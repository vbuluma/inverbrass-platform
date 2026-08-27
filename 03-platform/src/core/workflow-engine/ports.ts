/**
 * Purpose:
 * ENG-005 approval port consumed by BP-007 IP-06. Not a BP-007 workflow.
 *
 * Engine:
 * ENG-005 – Workflow & Approval Engine
 */

import type {
  EvaluateExceptionResolutionInput,
  EvaluateRefundApprovalInput,
  RefundApprovalDecision,
} from "@/core/workflow-engine/types";

export type WorkflowEnginePort = {
  evaluateRefundApproval(
    input: EvaluateRefundApprovalInput
  ): Promise<RefundApprovalDecision>;
  evaluateExceptionResolution(
    input: EvaluateExceptionResolutionInput
  ): Promise<RefundApprovalDecision>;
  assertDistinctActors(requesterId: string, approverId: string): void;
};
