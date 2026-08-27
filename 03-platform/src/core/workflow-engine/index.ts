/**
 * Purpose:
 * Public exports for ENG-005 Workflow Engine (refund approval slice).
 *
 * Engine:
 * ENG-005 – Workflow & Approval Engine
 */

export { WORKFLOW_ENGINE_ID, WORKFLOW_OPERATIONS } from "@/core/workflow-engine/constants";
export {
  WORKFLOW_ENGINE_ERROR_CODES,
  WorkflowEngineError,
} from "@/core/workflow-engine/errors";
export type { WorkflowEnginePort } from "@/core/workflow-engine/ports";
export type {
  EvaluateExceptionResolutionInput,
  EvaluateRefundApprovalInput,
  RefundApprovalDecision,
} from "@/core/workflow-engine/types";
export {
  InProcessWorkflowAdapter,
  createInProcessWorkflowAdapter,
} from "@/core/workflow-engine/adapters/in-process-workflow-adapter";
