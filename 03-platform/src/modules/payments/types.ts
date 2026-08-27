/**
 * Purpose:
 * BP-007 IP-01 view and command types.
 *
 * Implementation Package:
 * BP-007 / IP-01 – Payment Obligation & Provider Integration Foundation
 */

export type PaymentReadyLineBreakdown = {
  orderLineId: string;
  offeringId: string;
  expectedPayable: string;
  currencyCode: string;
};

export type PaymentReadyContract = {
  orderId: string;
  orderNumber: string;
  businessId: string;
  customerId: string | null;
  expectedAmount: string | null;
  currency: string | null;
  commercialContractId: string | null;
  snapshotId: string | null;
  operationalStatus: string;
  financialInstructionType: string;
  expiresAt?: string | null;
  lines: PaymentReadyLineBreakdown[];
};

export type PaymentObligationRecord = {
  id: string;
  businessId: string;
  obligationNumber: string;
  salesOrderId: string;
  orderNumber: string;
  customerId: string | null;
  currencyCode: string;
  amountDue: string;
  paidAmount: string;
  outstandingAmount: string;
  paymentStatus: string;
  financialInstructionType: string;
  commercialContractId: string;
  snapshotId: string;
  paymentReadyContractRef: string;
  lineBreakdown: PaymentReadyLineBreakdown[] | null;
  paymentReadyContractPayload: PaymentReadyContract | null;
  providerTransactionReference: string | null;
  idempotencyKey: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
};

export type PaymentObligationInsert = Omit<
  PaymentObligationRecord,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: string;
};

export type PaymentIdempotencyRecord = {
  id: string;
  businessId: string;
  idempotencyKey: string;
  operationType: string;
  resourceType: string;
  resourceId: string;
  createdAt: Date;
  createdBy: string | null;
};

export type PaymentMethodRecord = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  customerLabel: string | null;
  displayOrder: number;
  isActive: boolean;
  requiresRail: boolean;
  requiresProvider: boolean;
  requiresChannel: boolean;
  enablementFlag: string | null;
};

export type PaymentNetworkRecord = {
  id: string;
  paymentMethodId: string;
  code: string;
  name: string;
  description: string | null;
  customerLabel: string | null;
  displayOrder: number;
  isActive: boolean;
};

export type PaymentProviderRecord = {
  id: string;
  paymentNetworkId: string;
  code: string;
  name: string;
  description: string | null;
  integrationRef: string | null;
  displayOrder: number;
  isActive: boolean;
};

export type PaymentChannelRecord = {
  id: string;
  paymentProviderId: string;
  code: string;
  name: string;
  description: string | null;
  customerLabel: string | null;
  displayOrder: number;
  isActive: boolean;
};

export type PaymentCapabilityRecordView = {
  id: string;
  paymentChannelId: string;
  paymentProviderId: string;
  minAmount: string | null;
  maxAmount: string | null;
  dailyLimit: string | null;
  transactionLimit: string | null;
  supportedCurrencies: string[] | null;
  supportsInitiation: boolean;
  supportsRefund: boolean;
  supportsStatusQuery: boolean;
  isAvailable: boolean;
  metadata?: Record<string, unknown> | null;
};

export type PaymentEnablementFlags = {
  cashEnabled: boolean;
  mobileMoneyEnabled: boolean;
  bankTransferEnabled: boolean;
  cardEnabled: boolean;
  creditSalesEnabled: boolean;
};

export type CreatePaymentObligationInput = {
  orderId: string;
  idempotencyKey?: string | null;
  claimedContract?: Partial<PaymentReadyContract> | null;
};

export type PaymentObligationView = {
  id: string;
  obligationNumber: string;
  businessId: string;
  salesOrderId: string;
  orderNumber: string;
  customerId: string | null;
  currencyCode: string;
  amountDue: string;
  paidAmount: string;
  outstandingAmount: string;
  paymentStatus: string;
  paymentStatusLabel: string;
  financialInstructionType: string;
  commercialContractId: string;
  snapshotId: string;
  providerTransactionReference: string | null;
  createdAt: string;
};

export type PaymentOptionView = {
  methodId: string;
  methodCode: string;
  label: string;
  requiresElectronicRail: boolean;
  railId: string | null;
  providerId: string | null;
  channelId: string | null;
  minAmount: string | null;
  maxAmount: string | null;
};

export type PaymentObligationDetailView = PaymentObligationView & {
  eligibleOptions: PaymentOptionView[];
  recentTransactions: PaymentTransactionView[];
  allocations: PaymentAllocationView[];
  unallocatedTotal: string;
};

export type PaymentDashboardView = {
  obligationCount: number;
  notStartedCount: number;
  partialCount?: number;
  fullyPaidCount?: number;
  outstandingCount?: number;
  unallocatedPaymentCount?: number;
  splitPaymentCount?: number;
  recentObligations: PaymentObligationView[];
};

export type PaymentAuditRecord = {
  businessId: string;
  actorUserId: string | null;
  obligationId: string | null;
  paymentTransactionId?: string | null;
  allocationId?: string | null;
  invoiceId?: string | null;
  receiptId?: string | null;
  refundId?: string | null;
  settlementId?: string | null;
  exceptionId?: string | null;
  operation: string;
  action: string;
  outcome: "SUCCESS" | "FAILURE";
  references?: Record<string, unknown>;
  timestamp?: string;
};

export type PaymentTransactionRecord = {
  id: string;
  businessId: string;
  obligationId: string;
  transactionNumber: string;
  methodId: string | null;
  networkId: string | null;
  providerId: string | null;
  channelId: string | null;
  methodName: string | null;
  networkName: string | null;
  providerName: string | null;
  channelName: string | null;
  amount: string;
  currencyCode: string;
  status: string;
  captureMode: string;
  providerTransactionReference: string | null;
  idempotencyKey: string;
  initiatedAt: Date | null;
  completedAt: Date | null;
  failureCode: string | null;
  failureReason: string | null;
  providerResponseMetadata: Record<string, unknown> | null;
  outcomeMismatch: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
};

export type PaymentTransactionInsert = Omit<
  PaymentTransactionRecord,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: string;
};

export type PaymentTransactionPatch = Partial<
  Pick<
    PaymentTransactionRecord,
    | "status"
    | "providerTransactionReference"
    | "initiatedAt"
    | "completedAt"
    | "failureCode"
    | "failureReason"
    | "providerResponseMetadata"
    | "outcomeMismatch"
    | "metadata"
    | "updatedBy"
  >
>;

export type InitiatePaymentCommand = {
  obligationId: string;
  methodId: string;
  amount?: string | null;
  currency?: string | null;
  idempotencyKey?: string | null;
  confirmManual?: boolean;
};

export type ApplyPaymentOutcomeCommand = {
  paymentTransactionId?: string | null;
  providerTransactionReference?: string | null;
  outcome: {
    outcome: string;
    providerTransactionReference?: string | null;
    amount?: string | null;
    currency?: string | null;
    obligationId?: string | null;
    failureCode?: string | null;
    failureReason?: string | null;
    metadata?: Record<string, unknown> | null;
  };
};

export type PaymentTransactionView = {
  id: string;
  transactionNumber: string;
  businessId: string;
  obligationId: string;
  obligationNumber: string;
  orderNumber: string;
  customerId: string | null;
  amount: string;
  currencyCode: string;
  methodId: string | null;
  methodName: string | null;
  networkId: string | null;
  networkName: string | null;
  providerId: string | null;
  providerName: string | null;
  channelId: string | null;
  channelName: string | null;
  status: string;
  statusLabel: string;
  customerMessage: string;
  captureMode: string;
  providerTransactionReference: string | null;
  initiatedAt: string | null;
  completedAt: string | null;
  failureCode: string | null;
  failureReason: string | null;
  outcomeMismatch: boolean;
  allocatedAmount: string;
  unallocatedAmount: string;
  createdAt: string;
};

export type PaymentInitiationResult = {
  transaction: PaymentTransactionView;
  obligation: PaymentObligationView;
};

export type PaymentAllocationRecord = {
  id: string;
  businessId: string;
  obligationId: string;
  paymentTransactionId: string;
  allocationNumber: string;
  targetType: string;
  allocatedAmount: string;
  currencyCode: string;
  status: string;
  idempotencyKey: string;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
};

export type PaymentAllocationInsert = Omit<
  PaymentAllocationRecord,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: string;
};

export type AllocatePaymentCommand = {
  paymentTransactionId: string;
  obligationId?: string | null;
  amount?: string | null;
  idempotencyKey?: string | null;
  reason?: string | null;
};

export type AdjustAllocationCommand = {
  allocationId: string;
  reason: string;
  idempotencyKey?: string | null;
};

export type PaymentAllocationView = {
  id: string;
  allocationNumber: string;
  paymentTransactionId: string;
  transactionNumber: string;
  obligationId: string;
  allocatedAmount: string;
  currencyCode: string;
  status: string;
  statusLabel: string;
  createdAt: string;
};

export type PaymentAllocationResult = {
  allocation: PaymentAllocationView | null;
  obligation: PaymentObligationView;
  transaction: PaymentTransactionView;
  unallocatedAmount: string;
};

export type PaymentAllocationPolicy = {
  allowOverpayment: boolean;
};

export type InvoicePaymentTermRecord = {
  code: string;
  name: string;
  netDays: number;
  displayOrder: number;
  isActive: boolean;
};

export type PaymentInvoiceRecord = {
  id: string;
  businessId: string;
  obligationId: string;
  salesOrderId: string;
  orderNumber: string;
  customerId: string | null;
  invoiceNumber: string;
  numberingPolicyId: string;
  currencyCode: string;
  invoiceAmount: string;
  paidAmount: string;
  outstandingAmount: string;
  openingPaidAmount: string;
  amountDueSnapshot: string;
  commercialContractId: string;
  snapshotId: string;
  paymentTermCode: string;
  issueDate: Date | null;
  dueDate: Date | null;
  status: string;
  documentId: string | null;
  documentStatus: string | null;
  cancellationReason: string | null;
  cancelledAt: Date | null;
  cancelledBy: string | null;
  idempotencyKey: string;
  provenance: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
};

export type PaymentInvoiceInsert = Omit<
  PaymentInvoiceRecord,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: string;
};

export type InvoiceAdjustmentRecord = {
  id: string;
  businessId: string;
  invoiceId: string;
  adjustmentType: string;
  status: string;
  amount: string;
  currencyCode: string;
  reason: string;
  handedOffToIp06: string;
  createdAt: Date;
  createdBy: string | null;
};

export type CreateInvoiceCommand = {
  obligationId: string;
  paymentTermCode: string;
  idempotencyKey?: string | null;
};

export type IssueInvoiceCommand = {
  invoiceId: string;
  idempotencyKey?: string | null;
};

export type CancelInvoiceCommand = {
  invoiceId: string;
  reason: string;
  idempotencyKey?: string | null;
};

export type InvoiceView = {
  id: string;
  invoiceNumber: string;
  businessId: string;
  obligationId: string;
  orderNumber: string;
  customerId: string | null;
  currencyCode: string;
  invoiceAmount: string;
  paidAmount: string;
  outstandingAmount: string;
  amountDueSnapshot: string;
  paymentTermCode: string;
  paymentTermName: string;
  issueDate: string | null;
  dueDate: string | null;
  status: string;
  statusLabel: string;
  documentId: string | null;
  documentStatus: string | null;
  commercialContractId: string;
  snapshotId: string;
  createdAt: string;
};

export type InvoiceDetailView = InvoiceView & {
  obligationNumber: string;
  salesOrderId: string;
  provenance: Record<string, unknown> | null;
  adjustments: Array<{
    id: string;
    adjustmentType: string;
    amount: string;
    reason: string;
    createdAt: string;
  }>;
};

export type InvoiceDashboardView = {
  invoiceCount: number;
  draftCount: number;
  issuedCount: number;
  overdueCount: number;
  recentInvoices: InvoiceView[];
  paymentTerms: InvoicePaymentTermRecord[];
};

export type PaymentReceiptRecord = {
  id: string;
  businessId: string;
  receiptNumber: string;
  numberingPolicyId: string;
  paymentTransactionId: string;
  paymentObligationId: string;
  customerId: string | null;
  salesOrderId: string;
  orderNumber: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
  currencyCode: string;
  amount: string;
  paymentDateTime: Date;
  methodId: string | null;
  networkId: string | null;
  providerId: string | null;
  channelId: string | null;
  methodName: string | null;
  networkName: string | null;
  providerName: string | null;
  channelName: string | null;
  providerTransactionReference: string | null;
  internalPaymentTransactionNumber: string;
  documentId: string | null;
  documentStorageKey: string | null;
  documentStatus: string | null;
  status: string;
  deliveryStatus: string;
  originalReceiptId: string | null;
  idempotencyKey: string;
  evidence: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
};

export type PaymentReceiptInsert = Omit<
  PaymentReceiptRecord,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: string;
};

export type PaymentReceiptDeliveryRecord = {
  id: string;
  businessId: string;
  receiptId: string;
  channel: string;
  status: string;
  failureReason: string | null;
  requestedAt: Date;
  createdBy: string | null;
};

export type IssueReceiptCommand = {
  paymentTransactionId: string;
  idempotencyKey?: string | null;
};

export type DeliverReceiptCommand = {
  receiptId: string;
  channel: string;
  recipientHint?: string | null;
};

export type ReceiptView = {
  id: string;
  receiptNumber: string;
  businessId: string;
  paymentTransactionId: string;
  transactionNumber: string;
  obligationId: string;
  obligationNumber: string;
  orderNumber: string;
  customerId: string | null;
  invoiceId: string | null;
  invoiceNumber: string | null;
  currencyCode: string;
  amount: string;
  paymentDateTime: string;
  methodId: string | null;
  methodName: string | null;
  networkId: string | null;
  networkName: string | null;
  providerId: string | null;
  providerName: string | null;
  channelId: string | null;
  channelName: string | null;
  providerTransactionReference: string | null;
  status: string;
  statusLabel: string;
  deliveryStatus: string;
  deliveryStatusLabel: string;
  documentId: string | null;
  documentStorageKey: string | null;
  originalReceiptId: string | null;
  createdAt: string;
};

export type ReceiptDetailView = ReceiptView & {
  salesOrderId: string;
  allocatedAmount: string;
  allocations: Array<{
    id: string;
    allocationNumber: string;
    allocatedAmount: string;
    status: string;
  }>;
  deliveries: Array<{
    id: string;
    channel: string;
    status: string;
    failureReason: string | null;
    requestedAt: string;
  }>;
  evidence: Record<string, unknown> | null;
};

export type ReceiptDashboardView = {
  receiptCount: number;
  recentReceipts: ReceiptView[];
};

export type PaymentRefundRecord = {
  id: string;
  businessId: string;
  refundNumber: string;
  numberingPolicyId: string;
  originalPaymentTransactionId: string;
  originalPaymentReference: string;
  paymentObligationId: string;
  originalReceiptId: string | null;
  originatingFinancialInstructionId: string | null;
  invoiceId: string | null;
  refundType: string;
  amount: string;
  currencyCode: string;
  methodId: string | null;
  networkId: string | null;
  providerId: string | null;
  channelId: string | null;
  methodName: string | null;
  networkName: string | null;
  providerName: string | null;
  channelName: string | null;
  status: string;
  reason: string;
  providerRefundReference: string | null;
  idempotencyKey: string;
  requestedBy: string | null;
  approvedBy: string | null;
  initiatedAt: Date | null;
  completedAt: Date | null;
  failureCode: string | null;
  failureReason: string | null;
  providerMetadata: Record<string, unknown> | null;
  documentId: string | null;
  documentStorageKey: string | null;
  documentStatus: string | null;
  captureMode: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
};

export type PaymentRefundInsert = Omit<
  PaymentRefundRecord,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: string;
};

export type PaymentRefundPatch = Partial<
  Pick<
    PaymentRefundRecord,
    | "status"
    | "approvedBy"
    | "initiatedAt"
    | "completedAt"
    | "failureCode"
    | "failureReason"
    | "providerRefundReference"
    | "providerMetadata"
    | "documentId"
    | "documentStorageKey"
    | "documentStatus"
    | "metadata"
    | "updatedBy"
  >
>;

export type RefundFinancialInstruction = {
  id: string;
  businessId: string;
  orderId: string;
  instructionType: string;
  expectedAmount: string;
  currency: string;
  alreadyProcessed: boolean;
};

export type RequestRefundCommand = {
  paymentTransactionId: string;
  amount?: string | null;
  refundType?: string | null;
  reason: string;
  financialInstructionId?: string | null;
  idempotencyKey?: string | null;
  confirmManual?: boolean;
};

export type ApproveRefundCommand = {
  refundId: string;
  decision: "APPROVE" | "REJECT";
  reason?: string | null;
};

export type RefundView = {
  id: string;
  refundNumber: string;
  businessId: string;
  originalPaymentTransactionId: string;
  originalPaymentReference: string;
  obligationId: string;
  originalReceiptId: string | null;
  originatingFinancialInstructionId: string | null;
  invoiceId: string | null;
  refundType: string;
  refundTypeLabel: string;
  amount: string;
  currencyCode: string;
  methodName: string | null;
  status: string;
  statusLabel: string;
  reason: string;
  providerRefundReference: string | null;
  documentId: string | null;
  requestedBy: string | null;
  approvedBy: string | null;
  createdAt: string;
  completedAt: string | null;
};

export type RefundDetailView = RefundView & {
  originalPaymentStatus: string;
  originalPaymentAmount: string;
  refundableAmount: string;
  alreadyRefundedAmount: string;
  captureMode: string;
  networkName: string | null;
  providerName: string | null;
  channelName: string | null;
  failureReason: string | null;
  customerMessage: string;
};

export type RefundEligibilityView = {
  paymentTransactionId: string;
  originalAmount: string;
  currencyCode: string;
  alreadyRefundedAmount: string;
  refundableAmount: string;
  eligible: boolean;
  originalReceiptId: string | null;
  invoiceId: string | null;
  captureMode: string;
  requiresApproval: boolean;
  requiresManualConfirmation: boolean;
  refunds: RefundView[];
};

export type PaymentSettlementRecord = {
  id: string;
  businessId: string;
  paymentTransactionId: string;
  paymentObligationId: string;
  settlementStatus: string;
  expectedAmount: string;
  receivedAmount: string | null;
  varianceAmount: string | null;
  currencyCode: string;
  settlementReference: string | null;
  settlementBatchReference: string | null;
  settlementDate: Date | null;
  receivedAt: Date | null;
  confirmedAt: Date | null;
  methodId: string | null;
  networkId: string | null;
  providerId: string | null;
  channelId: string | null;
  methodName: string | null;
  networkName: string | null;
  providerName: string | null;
  channelName: string | null;
  providerTransactionReference: string | null;
  providerSettlementMetadata: Record<string, unknown> | null;
  exceptionFlag: boolean;
  exceptionCode: string | null;
  exceptionReason: string | null;
  idempotencyKey: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
};

export type PaymentSettlementInsert = Omit<
  PaymentSettlementRecord,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: string;
};

export type PaymentSettlementPatch = Partial<
  Pick<
    PaymentSettlementRecord,
    | "settlementStatus"
    | "receivedAmount"
    | "varianceAmount"
    | "settlementReference"
    | "settlementBatchReference"
    | "settlementDate"
    | "receivedAt"
    | "confirmedAt"
    | "providerSettlementMetadata"
    | "exceptionFlag"
    | "exceptionCode"
    | "exceptionReason"
    | "metadata"
    | "updatedBy"
  >
>;

export type ApplyProviderSettlementCommand = {
  paymentTransactionId: string;
  receivedAmount?: string | null;
  expectedAmount?: string | null;
  currency?: string | null;
  settlementReference?: string | null;
  settlementBatchReference?: string | null;
  settlementDate?: string | Date | null;
  settlementStatus?: "NOT_APPLICABLE" | "PENDING" | "RECEIVED" | "CONFIRMED" | "EXCEPTION" | null;
  metadata?: Record<string, unknown> | null;
  idempotencyKey?: string | null;
};

export type SettlementView = {
  id: string;
  businessId: string;
  paymentTransactionId: string;
  obligationId: string;
  settlementStatus: string;
  settlementStatusLabel: string;
  expectedAmount: string;
  receivedAmount: string | null;
  varianceAmount: string | null;
  currencyCode: string;
  settlementReference: string | null;
  settlementBatchReference: string | null;
  settlementDate: string | null;
  receivedAt: string | null;
  confirmedAt: string | null;
  exceptionFlag: boolean;
  exceptionReason: string | null;
  methodName: string | null;
  networkName: string | null;
  providerName: string | null;
  channelName: string | null;
};

export type ReconciliationHandoffRefund = {
  refundId: string;
  refundNumber: string;
  amount: string;
  currencyCode: string;
  status: string;
};

export type ReconciliationHandoffPayload = {
  businessId: string;
  paymentTransactionId: string;
  transactionNumber: string;
  obligationId: string;
  paymentAmount: string;
  currency: string;
  paymentMethod: string | null;
  paymentNetwork: string | null;
  paymentProvider: string | null;
  paymentChannel: string | null;
  providerTransactionReference: string | null;
  settlementReference: string | null;
  settlementBatchReference: string | null;
  expectedSettlementAmount: string;
  actualSettlementAmount: string | null;
  settlementVariance: string | null;
  settlementStatus: string;
  settlementDate: string | null;
  exceptionFlag: boolean;
  refunds: ReconciliationHandoffRefund[];
};

export type SettlementMode = "NOT_APPLICABLE" | "IMMEDIATE" | "PROVIDER";

export type PaymentExceptionRecord = {
  id: string;
  businessId: string;
  exceptionNumber: string;
  numberingPolicyId: string;
  paymentTransactionId: string;
  paymentObligationId: string;
  exceptionType: string;
  severity: string;
  status: string;
  reason: string;
  detectedAt: Date;
  detectedBy: string | null;
  assignedTo: string | null;
  resolvedBy: string | null;
  resolutionCode: string | null;
  resolutionNotes: string | null;
  resolutionEvidence: string | null;
  approvalStatus: string | null;
  requestedBy: string | null;
  approvedBy: string | null;
  proposedResolutionCode: string | null;
  proposedResolutionNotes: string | null;
  retryOfTransactionId: string | null;
  idempotencyKey: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
};

export type PaymentExceptionInsert = Omit<
  PaymentExceptionRecord,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: string;
};

export type PaymentExceptionPatch = Partial<
  Pick<
    PaymentExceptionRecord,
    | "status"
    | "severity"
    | "assignedTo"
    | "resolvedBy"
    | "resolutionCode"
    | "resolutionNotes"
    | "resolutionEvidence"
    | "approvalStatus"
    | "requestedBy"
    | "approvedBy"
    | "proposedResolutionCode"
    | "proposedResolutionNotes"
    | "retryOfTransactionId"
    | "metadata"
    | "updatedBy"
  >
>;

export type PaymentExceptionPolicy = {
  pendingTimeoutMs: number;
  requiresApproval: boolean;
};

export type PaymentExceptionListFilter = {
  status?: string | null;
  exceptionType?: string | null;
  severity?: string | null;
  methodId?: string | null;
  networkId?: string | null;
  providerId?: string | null;
  channelId?: string | null;
  transactionNumber?: string | null;
  obligationNumber?: string | null;
  detectedFrom?: string | null;
  detectedTo?: string | null;
};

export type RaisePaymentExceptionCommand = {
  paymentTransactionId: string;
  exceptionType: string;
  reason: string;
  severity?: string | null;
  idempotencyKey?: string | null;
};

export type ResolvePaymentExceptionCommand = {
  exceptionId: string;
  resolutionCode: string;
  notes?: string | null;
  evidence?: string | null;
  idempotencyKey?: string | null;
};

export type ApprovePaymentExceptionCommand = {
  exceptionId: string;
  decision: "APPROVE" | "REJECT";
  notes?: string | null;
};

export type PaymentExceptionView = {
  id: string;
  exceptionNumber: string;
  businessId: string;
  paymentTransactionId: string;
  transactionNumber: string;
  obligationId: string;
  obligationNumber: string;
  exceptionType: string;
  exceptionTypeLabel: string;
  severity: string;
  status: string;
  statusLabel: string;
  reason: string;
  paymentStatus: string;
  paymentStatusLabel: string;
  settlementStatus: string | null;
  methodName: string | null;
  networkName: string | null;
  providerName: string | null;
  channelName: string | null;
  methodId: string | null;
  networkId: string | null;
  providerId: string | null;
  channelId: string | null;
  providerTransactionReference: string | null;
  amount: string;
  currencyCode: string;
  resolutionCode: string | null;
  approvalStatus: string | null;
  detectedAt: string;
  updatedAt: string;
};

export type PaymentExceptionDetailView = PaymentExceptionView & {
  resolutionNotes: string | null;
  resolutionEvidence: string | null;
  proposedResolutionCode: string | null;
  proposedResolutionNotes: string | null;
  requestedBy: string | null;
  approvedBy: string | null;
  canRetry: boolean;
  customerMessage: string;
};

export type PaymentExceptionCatalogueOption = {
  id: string;
  name: string;
};

export type PaymentExceptionDashboardView = {
  openCount: number;
  investigatingCount: number;
  resolvedCount: number;
  highSeverityCount: number;
  unknownCount: number;
  mismatchCount: number;
  duplicateCount: number;
  settlementCount: number;
  items: PaymentExceptionView[];
  catalogues: {
    methods: PaymentExceptionCatalogueOption[];
    networks: PaymentExceptionCatalogueOption[];
    providers: PaymentExceptionCatalogueOption[];
    channels: PaymentExceptionCatalogueOption[];
  };
};

export type RetryEligibilityView = {
  paymentTransactionId: string;
  allowed: boolean;
  reason: string;
};
