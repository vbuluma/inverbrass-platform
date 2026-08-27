/**
 * Purpose:
 * ENG-005 Workflow Engine identifiers. Refund maker-checker slice only.
 *
 * Engine:
 * ENG-005 – Workflow & Approval Engine
 */

export const WORKFLOW_ENGINE_ID = "ENG-005";

export const WORKFLOW_OPERATIONS = {
  REFUND_APPROVAL: "REFUND_APPROVAL",
  EXCEPTION_RESOLUTION: "EXCEPTION_RESOLUTION",
} as const;
