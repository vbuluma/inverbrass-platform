/**
 * Purpose:
 * Public exports for BP-006 Sales, Orders & Service Delivery.
 *
 * Implementation Package:
 * BP-006 / IP-01 – Sales & Order Creation
 * BP-006 / IP-02 – Order Lifecycle & Fulfilment
 * BP-006 / IP-03 – Delivery, Inspection & Service Completion
 * BP-006 / IP-04 – Amendments, Cancellation & Returns
 * BP-006 / IP-05 – Downstream Handoff & Sales Workspace
 */

export {
  SALES_AUDIT_ACTIONS,
  SALES_BUILD_PACK,
  SALES_COMPLETION_POLICY,
  SALES_CONFIRMATION_POLICY,
  SALES_IP,
  SALES_IP_02,
  SALES_IP_03,
  SALES_IP_04,
  SALES_IP_05,
  SALES_LIFECYCLE_STEPS,
  SALES_MATERIAL_FIELDS,
  SALES_ORDER_HANDOFF_STATUS_CODES,
  SALES_ORDER_IP01_STATUSES,
  SALES_ORDER_LINE_TYPES,
  SALES_ORDER_NUMBER_PREFIX,
  SALES_ORDER_SOURCE_TYPES,
  SALES_ORDER_STATUS_CODES,
  SALES_ORDER_STATUS_LABELS,
  SALES_PAYMENT_STATUS_CODES,
} from "@/modules/sales/constants";

export {
  SalesOrderError,
  SALES_ERROR_CODES,
  SALES_USER_MESSAGES,
} from "@/modules/sales/errors";

export type {
  ConsumedCommercialResult,
  ConvertQuotationInput,
  CreateDirectSaleInput,
  CreateDirectSaleLineInput,
  InventoryFulfilmentHandoffContract,
  PaymentReadyOrderContract,
  SalesDashboardView,
  SalesDownstreamHandoffContract,
  SalesNextActionReadiness,
  SalesOrderDetailView,
  SalesOrderSummaryView,
  UpdateDraftSaleInput,
} from "@/modules/sales/types";

export {
  SalesOrderService,
  createDefaultSalesOrderDependencies,
  createSalesOrderService,
} from "@/modules/sales/services/sales-order-service";

export {
  SalesDeliveryService,
  createDefaultSalesDeliveryService,
  createSalesDeliveryService,
} from "@/modules/sales/services/sales-delivery-service";

export {
  SalesExceptionService,
  createDefaultSalesExceptionService,
  createSalesExceptionService,
} from "@/modules/sales/services/sales-exception-service";

export {
  assertSegregationOfDuties,
  canTransitionSalesOrderStatus,
  copiedExpectedAmountFromContract,
  isConfirmedStatus,
  isDraftStatus,
} from "@/modules/sales/services/sales-order-rules";

export {
  assertFulfilmentProgressionAllowed,
  canTransitionSalesLifecycle,
  deriveLineQuantities,
} from "@/modules/sales/services/order-lifecycle-rules";

export {
  canCheckerApprove,
  toFulfilmentHandoffContract,
  toPaymentReadyContract,
} from "@/modules/sales/services/handoff-rules";
