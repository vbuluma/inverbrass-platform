/**
 * Purpose:
 * ENG-005 refund approval evaluation types.
 *
 * Engine:
 * ENG-005 – Workflow & Approval Engine
 */

export type RefundApprovalDecision = {
  required: boolean;
  operation: string;
};

export type EvaluateRefundApprovalInput = {
  businessId: string;
  amount: string;
  currencyCode: string;
  refundType: string;
};

export type EvaluateExceptionResolutionInput = {
  businessId: string;
  resolutionCode: string;
};

export type EvaluateOperationApprovalInput = {
  businessId: string;
  operationCode: string;
};
