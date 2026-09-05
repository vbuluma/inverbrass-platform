/**
 * Purpose:
 * BP-006 constants — order lifecycle, sources, confirmation, fulfilment, and numbering.
 *
 * Implementation Package:
 * BP-006 / IP-01 – Sales & Order Creation
 * BP-006 / IP-02 – Order Lifecycle & Fulfilment
 * BP-006 / IP-03 – Delivery, Inspection & Service Completion
 * BP-006 / IP-04 – Amendments, Cancellation & Returns
 * BP-006 / IP-05 – Downstream Handoff & Sales Workspace
 */

export const SALES_BUILD_PACK = "BP-006";
export const SALES_IP = "IP-01";
export const SALES_IP_02 = "IP-02";
export const SALES_IP_03 = "IP-03";
export const SALES_IP_04 = "IP-04";
export const SALES_IP_05 = "IP-05";

export const SALES_ORDER_NUMBER_PREFIX = "SO";

export const SALES_ORDER_SOURCE_TYPES = {
  DIRECT: "DIRECT",
  QUOTATION: "QUOTATION",
} as const;

export type SalesOrderSourceType =
  (typeof SALES_ORDER_SOURCE_TYPES)[keyof typeof SALES_ORDER_SOURCE_TYPES];

/** IP-01 owns Draft → Submitted → Confirmed. Later IPs own the rest. */
export const SALES_ORDER_STATUS_CODES = {
  DRAFT: "DRAFT",
  SUBMITTED_FOR_CONFIRMATION: "SUBMITTED_FOR_CONFIRMATION",
  CONFIRMED: "CONFIRMED",
  IN_PROGRESS: "IN_PROGRESS",
  PARTIALLY_FULFILLED: "PARTIALLY_FULFILLED",
  FULFILLED: "FULFILLED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export type SalesOrderStatusCode =
  (typeof SALES_ORDER_STATUS_CODES)[keyof typeof SALES_ORDER_STATUS_CODES];

export const SALES_ORDER_IP01_STATUSES = [
  SALES_ORDER_STATUS_CODES.DRAFT,
  SALES_ORDER_STATUS_CODES.SUBMITTED_FOR_CONFIRMATION,
  SALES_ORDER_STATUS_CODES.CONFIRMED,
] as const;

export const SALES_ORDER_LINE_TYPES = {
  PHYSICAL: "PHYSICAL",
  SERVICE: "SERVICE",
} as const;

export type SalesOrderLineType =
  (typeof SALES_ORDER_LINE_TYPES)[keyof typeof SALES_ORDER_LINE_TYPES];

export const SALES_PAYMENT_STATUS_CODES = {
  NOT_RECORDED: "NOT_RECORDED",
} as const;

export const SALES_ORDER_HANDOFF_STATUS_CODES = {
  PENDING: "PENDING",
  READY: "READY",
} as const;

export const SALES_AUDIT_ACTIONS = {
  ORDER_CREATED: "ORDER_CREATED",
  ORDER_UPDATED: "ORDER_UPDATED",
  ORDER_SUBMITTED_FOR_CONFIRMATION: "ORDER_SUBMITTED_FOR_CONFIRMATION",
  ORDER_CONFIRMED: "ORDER_CONFIRMED",
  ORDER_CONFIRMATION_REJECTED: "ORDER_CONFIRMATION_REJECTED",
  LIFECYCLE_TRANSITIONED: "LIFECYCLE_TRANSITIONED",
  COMPLETION_REQUESTED: "COMPLETION_REQUESTED",
  ORDER_COMPLETED: "ORDER_COMPLETED",
  COMPLETION_REJECTED: "COMPLETION_REJECTED",
  CANCELLATION_RECOGNIZED: "CANCELLATION_RECOGNIZED",
  DELIVERY_RECORDED: "DELIVERY_RECORDED",
  INSPECTION_RECORDED: "INSPECTION_RECORDED",
  SERVICE_STARTED: "SERVICE_STARTED",
  SERVICE_COMPLETED: "SERVICE_COMPLETED",
  CANCELLATION_REQUESTED: "CANCELLATION_REQUESTED",
  AMENDMENT_PROPOSED: "AMENDMENT_PROPOSED",
  AMENDMENT_APPROVED: "AMENDMENT_APPROVED",
  AMENDMENT_REJECTED: "AMENDMENT_REJECTED",
  DISPOSITION_REQUESTED: "DISPOSITION_REQUESTED",
  DISPOSITION_APPROVED: "DISPOSITION_APPROVED",
  DISPOSITION_REJECTED: "DISPOSITION_REJECTED",
  NOTE_ADDED: "NOTE_ADDED",
} as const;

export type SalesAuditAction =
  (typeof SALES_AUDIT_ACTIONS)[keyof typeof SALES_AUDIT_ACTIONS];

export const SALES_IDEMPOTENCY_OPERATIONS = {
  CREATE_DIRECT_SALE: "CREATE_DIRECT_SALE",
} as const;

export type SalesIdempotencyOperation =
  (typeof SALES_IDEMPOTENCY_OPERATIONS)[keyof typeof SALES_IDEMPOTENCY_OPERATIONS];

export const SALES_CONFIRMATION_POLICY = {
  requiresSegregationOfDuties: true,
} as const;

export const SALES_CUSTOMER_WEB_CONFIRMATION_POLICY = {
  requiresSegregationOfDuties: false,
} as const;

export const SALES_COMPLETION_POLICY = {
  requiresSegregationOfDuties: true,
} as const;

export const SALES_LINE_FULFILMENT_STATUS_CODES = {
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  PARTIALLY_FULFILLED: "PARTIALLY_FULFILLED",
  FULFILLED: "FULFILLED",
  BLOCKED: "BLOCKED",
  CANCELLED: "CANCELLED",
} as const;

export type SalesLineFulfilmentStatusCode =
  (typeof SALES_LINE_FULFILMENT_STATUS_CODES)[keyof typeof SALES_LINE_FULFILMENT_STATUS_CODES];

export const SALES_LINE_FULFILMENT_STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  PARTIALLY_FULFILLED: "Partially fulfilled",
  FULFILLED: "Fulfilled",
  BLOCKED: "Blocked",
  CANCELLED: "Cancelled",
};

export const SALES_INSPECTION_STATUS_CODES = {
  NOT_REQUIRED: "NOT_REQUIRED",
  PENDING: "PENDING",
  PASSED: "PASSED",
  FAILED: "FAILED",
} as const;

export type SalesInspectionStatusCode =
  (typeof SALES_INSPECTION_STATUS_CODES)[keyof typeof SALES_INSPECTION_STATUS_CODES];

export const SALES_SERVICE_COMPLETION_STATUS_CODES = {
  NOT_REQUIRED: "NOT_REQUIRED",
  PENDING: "PENDING",
  COMPLETE: "COMPLETE",
} as const;

export type SalesServiceCompletionStatusCode =
  (typeof SALES_SERVICE_COMPLETION_STATUS_CODES)[keyof typeof SALES_SERVICE_COMPLETION_STATUS_CODES];

export const SALES_COMPLETION_BLOCKER_CODES = {
  OUTSTANDING_QUANTITY: "OUTSTANDING_QUANTITY",
  INSPECTION_PENDING: "INSPECTION_PENDING",
  INSPECTION_FAILED: "INSPECTION_FAILED",
  SERVICE_INCOMPLETE: "SERVICE_INCOMPLETE",
  DISPOSITION_REQUIRED: "DISPOSITION_REQUIRED",
  EVIDENCE_MISSING: "EVIDENCE_MISSING",
  CHECKLIST_FAILED: "CHECKLIST_FAILED",
  SOD_REQUIRED: "SOD_REQUIRED",
  ORDER_NOT_ELIGIBLE: "ORDER_NOT_ELIGIBLE",
  ORDER_CANCELLED: "ORDER_CANCELLED",
  ACCEPTED_EXCEEDS_ORDERED: "ACCEPTED_EXCEEDS_ORDERED",
  NO_FULFILMENT_ACTIVITY: "NO_FULFILMENT_ACTIVITY",
} as const;

export type SalesCompletionBlockerCode =
  (typeof SALES_COMPLETION_BLOCKER_CODES)[keyof typeof SALES_COMPLETION_BLOCKER_CODES];

export const SALES_CUSTOMER_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Sale being prepared",
  SUBMITTED_FOR_CONFIRMATION: "Sale waiting for confirmation",
  CONFIRMED: "Order confirmed",
  IN_PROGRESS: "Being prepared",
  PARTIALLY_FULFILLED: "Part of your order is ready",
  FULFILLED: "Completed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const SALES_LIFECYCLE_STEPS = [
  SALES_ORDER_STATUS_CODES.CONFIRMED,
  SALES_ORDER_STATUS_CODES.IN_PROGRESS,
  SALES_ORDER_STATUS_CODES.PARTIALLY_FULFILLED,
  SALES_ORDER_STATUS_CODES.COMPLETED,
] as const;

export const SALES_MATERIAL_FIELDS = [
  "partyId",
  "offeringId",
  "quantity",
  "commercialContractId",
  "snapshotId",
  "expectedAmount",
  "currencyCode",
] as const;

export const SALES_ORDER_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED_FOR_CONFIRMATION: "Waiting for confirmation",
  CONFIRMED: "Confirmed",
  IN_PROGRESS: "In progress",
  PARTIALLY_FULFILLED: "Partially fulfilled",
  FULFILLED: "Fulfilled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const SALES_DELIVERY_EVENT_TYPES = {
  PHYSICAL: "PHYSICAL",
  SERVICE: "SERVICE",
} as const;

export type SalesDeliveryEventType =
  (typeof SALES_DELIVERY_EVENT_TYPES)[keyof typeof SALES_DELIVERY_EVENT_TYPES];

export const SALES_DELIVERY_EVENT_STATUS_CODES = {
  RECORDED: "RECORDED",
  INSPECTED: "INSPECTED",
  SERVICE_IN_PROGRESS: "SERVICE_IN_PROGRESS",
  SERVICE_COMPLETED: "SERVICE_COMPLETED",
} as const;

export type SalesDeliveryEventStatusCode =
  (typeof SALES_DELIVERY_EVENT_STATUS_CODES)[keyof typeof SALES_DELIVERY_EVENT_STATUS_CODES];

export const SALES_REJECTION_REASON_CODES = {
  DAMAGED: "DAMAGED",
  DEFECTIVE: "DEFECTIVE",
  WRONG_ITEM: "WRONG_ITEM",
  SHORT_DATED: "SHORT_DATED",
  OTHER: "OTHER",
} as const;

export type SalesRejectionReasonCode =
  (typeof SALES_REJECTION_REASON_CODES)[keyof typeof SALES_REJECTION_REASON_CODES];

export const SALES_REJECTION_REASON_LABELS: Record<string, string> = {
  DAMAGED: "Damaged",
  DEFECTIVE: "Defective",
  WRONG_ITEM: "Wrong item",
  SHORT_DATED: "Short dated",
  OTHER: "Other",
};

export const SALES_QUALITY_FINDING_CODES = SALES_REJECTION_REASON_CODES;

export const SALES_DELIVERY_POLICY = {
  inspectionRequiredForPhysical: true,
  inspectionRequiresSod: true,
  serviceEvidenceRequired: true,
  serviceCompletionRequiresSod: true,
  commentsRequiredOnPartialOrReject: true,
} as const;

export const SALES_DISPOSITION_TYPES = {
  CANCEL: "CANCEL",
  RETURN_REPLACE: "RETURN_REPLACE",
  RETURN_CREDIT: "RETURN_CREDIT",
  REPLACE: "REPLACE",
  CANCEL_REMAINDER: "CANCEL_REMAINDER",
} as const;

export type SalesDispositionType =
  (typeof SALES_DISPOSITION_TYPES)[keyof typeof SALES_DISPOSITION_TYPES];

export const SALES_INSTRUCTION_STATUS_CODES = {
  PROPOSED: "PROPOSED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export type SalesInstructionStatusCode =
  (typeof SALES_INSTRUCTION_STATUS_CODES)[keyof typeof SALES_INSTRUCTION_STATUS_CODES];

export const SALES_CANCELLATION_REASON_CODES = {
  CUSTOMER_REQUEST: "CUSTOMER_REQUEST",
  DUPLICATE: "DUPLICATE",
  UNABLE_TO_FULFIL: "UNABLE_TO_FULFIL",
  OTHER: "OTHER",
} as const;

export const SALES_CANCELLATION_REASON_LABELS: Record<string, string> = {
  CUSTOMER_REQUEST: "Customer asked to cancel",
  DUPLICATE: "Duplicate sale",
  UNABLE_TO_FULFIL: "Unable to fulfil",
  OTHER: "Other",
};

export const SALES_RETURN_REASON_CODES = {
  REJECTED_GOODS: "REJECTED_GOODS",
  DAMAGED: "DAMAGED",
  DEFECTIVE: "DEFECTIVE",
  WRONG_ITEM: "WRONG_ITEM",
  CUSTOMER_RETURN: "CUSTOMER_RETURN",
  OTHER: "OTHER",
} as const;

export const SALES_RETURN_REASON_LABELS: Record<string, string> = {
  REJECTED_GOODS: "Rejected on inspection",
  DAMAGED: "Damaged",
  DEFECTIVE: "Defective",
  WRONG_ITEM: "Wrong item",
  CUSTOMER_RETURN: "Customer return",
  OTHER: "Other",
};

export const SALES_DISPOSITION_POLICY = {
  cancelReasonRequired: true,
  returnReasonRequired: true,
  cancelRequiresSodAfterConfirm: true,
  draftCancelRequiresSod: false,
  returnRequiresSod: true,
  amendmentRequiresSod: true,
} as const;

export const SALES_FINANCIAL_INSTRUCTION_TYPES = {
  NONE: "NONE",
  SALE: "SALE",
  CANCEL: "CANCEL",
  RETURN: "RETURN",
} as const;

export type SalesFinancialInstructionType =
  (typeof SALES_FINANCIAL_INSTRUCTION_TYPES)[keyof typeof SALES_FINANCIAL_INSTRUCTION_TYPES];

export const SALES_WORKSPACE_VIEW_CODES = {
  ALL: "all",
  OUTSTANDING: "outstanding",
  PARTIAL: "partial",
  INSPECTION_PENDING: "inspection-pending",
  SERVICE_REMAINING: "service-remaining",
  CANCELLED: "cancelled",
  CONVERTED: "converted",
} as const;

export type SalesWorkspaceViewCode =
  (typeof SALES_WORKSPACE_VIEW_CODES)[keyof typeof SALES_WORKSPACE_VIEW_CODES];

export const SALES_PAYMENT_AVAILABILITY_LABEL =
  "Payment not yet recorded — collection is not available yet.";
