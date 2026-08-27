/**
 * Purpose:
 * ENG-005 workflow errors. Messages stay business-facing.
 *
 * Engine:
 * ENG-005 – Workflow & Approval Engine
 */

export const WORKFLOW_ENGINE_ERROR_CODES = {
  SELF_APPROVAL: "SELF_APPROVAL",
} as const;

export class WorkflowEngineError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, message: string, statusCode = 409) {
    super(message);
    this.name = "WorkflowEngineError";
    this.code = code;
    this.statusCode = statusCode;
  }
}
