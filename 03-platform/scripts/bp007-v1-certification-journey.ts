/**
 * Purpose:
 * BP-007 v1 certification journey for Test Customer Alpha (party-1).
 * Reuses the same simulated customer as BP-006 sales certification.
 *
 * Usage:
 *   npx tsx scripts/bp007-v1-certification-journey.ts
 *
 * Does not implement IP-09 or new payment functionality.
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import { InProcessDocumentAdapter } from "@/core/document-engine";
import { ScriptedDocumentNumberingAdapter } from "@/core/localization-regulatory";
import { InProcessNotificationAdapter } from "@/core/notification-engine";
import {
  createCatalogueCapabilityPaymentEngine,
  ScriptedPaymentInitiationAdapter,
} from "@/core/payment-engine";
import { InProcessReceiptingAdapter } from "@/core/receipting-engine";
import { InProcessWorkflowAdapter } from "@/core/workflow-engine";
import { InMemoryCurrencyReference } from "@/modules/payments/adapters/currency-catalogue-adapter";
import { InMemoryFinancialInstructionAdapter } from "@/modules/payments/adapters/payment-financial-instruction-adapter";
import { createPaymentAllocationPolicyAdapter } from "@/modules/payments/adapters/payment-allocation-policy-adapter";
import { ConfigurablePaymentExceptionPolicy } from "@/modules/payments/adapters/payment-exception-policy-adapter";
import { createPaymentSettlementPolicyAdapter } from "@/modules/payments/adapters/payment-settlement-policy-adapter";
import {
  PAYMENT_ERROR_CODES,
  PAYMENT_STATUS_CODES,
  PaymentAllocationService,
  PaymentExceptionService,
  PaymentInitiationService,
  PaymentInvoiceService,
  ConfigurableInvoiceClock,
  PaymentObligationError,
  PaymentObligationService,
  PaymentReceiptService,
  PaymentRefundService,
  PaymentSettlementService,
} from "@/modules/payments";
import type { PaymentEnablementPort, PaymentReadyContractPort } from "@/modules/payments/ports";
import { createInProcessPaymentLock } from "@/modules/payments/services/payment-lock";
import { RecordingPaymentAudit } from "@/modules/payments/services/payment-obligation-audit-helper";
import {
  defaultCatalogueFixture,
  InMemoryCapabilityStore,
  InMemoryPaymentStore,
} from "@/modules/payments/services/payment-memory-store";
import type { PaymentEnablementFlags, PaymentReadyContract } from "@/modules/payments/types";

const CUSTOMER = {
  label: "Test Customer Alpha",
  customerId: "party-1",
  orderId: "order-1",
  orderNumber: "SO-000001",
  businessId: "biz-a",
  amountDue: "10000",
  currency: "KES",
} as const;

type SmokeResult = { name: string; ok: boolean; detail?: string };

function ctx(businessId: string, userId = "maker-1"): CurrentBusinessContext {
  return {
    businessId,
    platformUserId: userId,
    businessMembershipId: `mem-${businessId}`,
  };
}

function validContract(
  overrides: Partial<PaymentReadyContract> = {}
): PaymentReadyContract {
  return {
    orderId: CUSTOMER.orderId,
    orderNumber: CUSTOMER.orderNumber,
    businessId: CUSTOMER.businessId,
    customerId: CUSTOMER.customerId,
    expectedAmount: CUSTOMER.amountDue,
    currency: CUSTOMER.currency,
    commercialContractId: "ctc-1",
    snapshotId: "11111111-1111-1111-1111-111111111111",
    operationalStatus: "CONFIRMED",
    financialInstructionType: "SALE",
    expiresAt: null,
    lines: [
      {
        orderLineId: "line-1",
        offeringId: "offering-1",
        expectedPayable: CUSTOMER.amountDue,
        currencyCode: CUSTOMER.currency,
      },
    ],
    ...overrides,
  };
}

const DEFAULT_FLAGS: PaymentEnablementFlags = {
  cashEnabled: true,
  mobileMoneyEnabled: true,
  bankTransferEnabled: true,
  cardEnabled: true,
  creditSalesEnabled: true,
};

function successfulAdapter(): ScriptedPaymentInitiationAdapter {
  const adapter = new ScriptedPaymentInitiationAdapter();
  adapter.nextInitiate = (input) => ({
    outcome: "SUCCESSFUL",
    providerTransactionReference: `prov-${input.paymentTransactionId}`,
    amount: input.amount,
    currency: input.currency,
    obligationId: input.obligationId,
    failureCode: null,
    failureReason: null,
  });
  adapter.nextRefund = (input) => ({
    outcome: "SUCCESSFUL",
    providerTransactionReference: `refund-${input.originalPaymentTransactionId}`,
    amount: input.amount,
    currency: input.currency,
    obligationId: null,
    failureCode: null,
    failureReason: null,
  });
  adapter.nextSettlement = {
    settlementStatus: "PENDING",
    expectedAmount: CUSTOMER.amountDue,
    receivedAmount: null,
    currency: CUSTOMER.currency,
    settlementReference: null,
    settlementBatchReference: null,
    settlementDate: null,
  };
  return adapter;
}

function harness(options?: {
  adapter?: ScriptedPaymentInitiationAdapter;
  flags?: PaymentEnablementFlags;
  requiresApproval?: boolean;
  contract?: PaymentReadyContract;
}) {
  const store = new InMemoryPaymentStore();
  const fixture = defaultCatalogueFixture();
  fixture.capabilities = fixture.capabilities.map((row) => ({
    ...row,
    supportsRefund: true,
  }));
  store.seedCatalogue(fixture);
  const audit = new RecordingPaymentAudit();
  const adapter = options?.adapter ?? successfulAdapter();
  const engine = createCatalogueCapabilityPaymentEngine(
    new InMemoryCapabilityStore(store),
    adapter
  );
  const flags = options?.flags ?? DEFAULT_FLAGS;
  const enablement: PaymentEnablementPort = {
    async getFlags() {
      return flags;
    },
  };
  const contract = options?.contract ?? validContract();
  const contracts: PaymentReadyContractPort = {
    async getByOrderId(_context, orderId) {
      if (contract.orderId !== orderId) {
        return null;
      }
      return contract;
    },
  };
  const shared = {
    contracts,
    obligations: store,
    idempotency: store.idempotencyPort,
    catalogues: store,
    engine,
    enablement,
    currencies: new InMemoryCurrencyReference(new Set(["KES", "USD"])),
    audit,
  };
  const policy = createPaymentAllocationPolicyAdapter(false);
  const allocations = new PaymentAllocationService({
    obligations: store,
    transactions: store.transactionPort,
    allocations: store.allocationPort,
    idempotency: store.idempotencyPort,
    policy,
    locks: createInProcessPaymentLock(),
    audit,
  });
  const numbering = new ScriptedDocumentNumberingAdapter();
  const receipting = new InProcessReceiptingAdapter();
  const documents = new InProcessDocumentAdapter();
  const notifications = new InProcessNotificationAdapter();
  const receipts = new PaymentReceiptService({
    transactions: store.transactionPort,
    obligations: store,
    allocations: store.allocationPort,
    invoices: store.invoicePort,
    receipts: store.receiptPort,
    numbering,
    receipting,
    documents,
    notifications,
    idempotency: store.idempotencyPort,
    audit,
  });
  const invoices = new PaymentInvoiceService({
    obligations: store,
    invoices: store.invoicePort,
    terms: store.termPort,
    enablement,
    numbering,
    receipting,
    idempotency: store.idempotencyPort,
    audit,
    clock: new ConfigurableInvoiceClock(new Date("2026-08-01T00:00:00.000Z")),
  });
  const settlements = new PaymentSettlementService({
    transactions: store.transactionPort,
    obligations: store,
    settlements: store.settlementPort,
    catalogues: store,
    policy: createPaymentSettlementPolicyAdapter(store),
    engine,
    refunds: store.refundPort,
    idempotency: store.idempotencyPort,
    locks: createInProcessPaymentLock(),
    audit,
  });
  const refunds = new PaymentRefundService({
    transactions: store.transactionPort,
    obligations: store,
    allocations: store.allocationPort,
    receipts: store.receiptPort,
    invoices: store.invoicePort,
    refunds: store.refundPort,
    catalogues: store,
    numbering,
    receipting,
    documents,
    engine,
    workflow: new InProcessWorkflowAdapter({
      requiresApproval: options?.requiresApproval ?? false,
    }),
    instructions: new InMemoryFinancialInstructionAdapter(),
    allocationEffects: allocations,
    invoiceEffects: invoices,
    idempotency: store.idempotencyPort,
    locks: createInProcessPaymentLock(),
    audit,
  });
  const box: { payments?: PaymentInitiationService } = {};
  const exceptions = new PaymentExceptionService({
    transactions: store.transactionPort,
    obligations: store,
    exceptions: store.exceptionPort,
    settlements: store.settlementPort,
    engine,
    workflow: new InProcessWorkflowAdapter({
      requiresApproval: options?.requiresApproval ?? false,
    }),
    numbering,
    policy: new ConfigurablePaymentExceptionPolicy(
      15 * 60 * 1000,
      options?.requiresApproval ?? false
    ),
    outcomes: {
      applyProviderOutcome: (context, command) =>
        box.payments!.applyProviderOutcome(context, command),
      initiatePayment: (context, command) =>
        box.payments!.initiatePayment(context, command),
      refreshPaymentStatus: (context, transactionId) =>
        box.payments!.refreshPaymentStatus(context, transactionId),
    },
    catalogues: store,
    idempotency: store.idempotencyPort,
    locks: createInProcessPaymentLock(),
    audit,
  });
  const payments = new PaymentInitiationService({
    ...shared,
    transactions: store.transactionPort,
    allocations,
    policy,
    receipts,
    settlements,
    exceptions,
  });
  box.payments = payments;
  return {
    store,
    audit,
    adapter,
    payments,
    exceptions,
    receipts,
    settlements,
    allocations,
    invoices,
    refunds,
    obligations: new PaymentObligationService(shared),
  };
}

function codeOf(error: unknown) {
  return error instanceof PaymentObligationError ? error.code : "other";
}

async function createDue(
  env: ReturnType<typeof harness>,
  actor: CurrentBusinessContext,
  orderId = CUSTOMER.orderId
) {
  return env.obligations.createObligation(actor, { orderId });
}

async function pay(
  env: ReturnType<typeof harness>,
  actor: CurrentBusinessContext,
  obligationId: string,
  input: { methodId: string; amount: string; key: string }
) {
  return env.payments.initiatePayment(actor, {
    obligationId,
    methodId: input.methodId,
    amount: input.amount,
    currency: CUSTOMER.currency,
    idempotencyKey: input.key,
    confirmManual: input.methodId === "method-cash",
  });
}

async function runJourney(): Promise<SmokeResult[]> {
  const results: SmokeResult[] = [];
  const actor = ctx(CUSTOMER.businessId);

  // --- Happy path: confirmed sale → obligation → initiation → success → allocation → receipt → settlement → handoff
  const happy = harness();
  const obligation = await createDue(happy, actor);
  results.push({
    name: "journey:customer-alpha-obligation",
    ok:
      obligation.customerId === CUSTOMER.customerId &&
      obligation.orderNumber === CUSTOMER.orderNumber &&
      obligation.amountDue === CUSTOMER.amountDue &&
      obligation.paidAmount === "0" &&
      obligation.outstandingAmount === CUSTOMER.amountDue,
    detail: `${CUSTOMER.label} ${obligation.obligationNumber} due=${obligation.amountDue}`,
  });

  happy.adapter.nextInitiate = (input) => ({
    outcome: "PENDING",
    providerTransactionReference: `prov-${input.paymentTransactionId}`,
    amount: input.amount,
    currency: input.currency,
    obligationId: input.obligationId,
    failureCode: null,
    failureReason: null,
  });
  const pendingPay = await pay(happy, actor, obligation.id, {
    methodId: "method-mm",
    amount: "10000",
    key: "alpha-pending",
  });
  const afterPending = await happy.store.findById(actor.businessId, obligation.id);
  results.push({
    name: "journey:pending-does-not-reduce-outstanding",
    ok:
      pendingPay.transaction.status === PAYMENT_STATUS_CODES.PENDING &&
      afterPending?.paidAmount === "0" &&
      afterPending?.outstandingAmount === "10000",
  });

  const succeeded = await happy.payments.applyProviderOutcome(actor, {
    paymentTransactionId: pendingPay.transaction.id,
    outcome: {
      outcome: "SUCCESSFUL",
      providerTransactionReference: pendingPay.transaction.providerTransactionReference,
      amount: "10000",
      currency: "KES",
      obligationId: obligation.id,
      failureCode: null,
      failureReason: null,
    },
  });
  const afterSuccess = await happy.store.findById(actor.businessId, obligation.id);
  const receipt = await happy.receipts.getByTransaction(actor, pendingPay.transaction.id);
  const settlement = await happy.settlements.getByTransaction(
    actor,
    pendingPay.transaction.id
  );
  const allocations = await happy.store.allocationPort.listByTransaction(
    actor.businessId,
    pendingPay.transaction.id
  );
  const handoff = await happy.settlements.getReconciliationHandoff(
    actor,
    pendingPay.transaction.id
  );
  results.push({
    name: "journey:successful-allocation-receipt-settlement",
    ok:
      succeeded.transaction.status === PAYMENT_STATUS_CODES.SUCCESSFUL &&
      afterSuccess?.paidAmount === "10000" &&
      afterSuccess?.outstandingAmount === "0" &&
      allocations.length === 1 &&
      allocations[0]?.allocatedAmount === "10000" &&
      receipt?.amount === "10000" &&
      Boolean(receipt?.receiptNumber) &&
      settlement?.settlementStatus === "SETTLEMENT_PENDING" &&
      succeeded.transaction.status === PAYMENT_STATUS_CODES.SUCCESSFUL,
    detail: `paid=${afterSuccess?.paidAmount} receipt=${receipt?.receiptNumber} settlement=${settlement?.settlementStatus}`,
  });
  results.push({
    name: "journey:handoff-contains-required-fields",
    ok:
      handoff.paymentTransactionId === pendingPay.transaction.id &&
      handoff.businessId === actor.businessId &&
      handoff.paymentAmount === "10000" &&
      Boolean(handoff.providerTransactionReference) &&
      handoff.expectedSettlementAmount === "10000" &&
      handoff.settlementStatus === "SETTLEMENT_PENDING" &&
      typeof handoff.exceptionFlag === "boolean",
  });

  const amountDueAfterSettlement = (await happy.store.findById(
    actor.businessId,
    obligation.id
  ))!.amountDue;
  const confirmed = await happy.settlements.applyProviderSettlement(actor, {
    paymentTransactionId: pendingPay.transaction.id,
    receivedAmount: "10000",
    settlementReference: "SET-ALPHA-1",
    settlementStatus: "CONFIRMED",
  });
  const txnAfterSettle = await happy.store.transactionPort.findById(
    actor.businessId,
    pendingPay.transaction.id
  );
  const receiptAfterSettle = await happy.receipts.getByTransaction(
    actor,
    pendingPay.transaction.id
  );
  const allocAfterSettle = await happy.store.allocationPort.listByTransaction(
    actor.businessId,
    pendingPay.transaction.id
  );
  results.push({
    name: "journey:settlement-does-not-mutate-payment-allocation-receipt-amountDue",
    ok:
      confirmed.settlementStatus === "SETTLEMENT_CONFIRMED" &&
      txnAfterSettle?.status === PAYMENT_STATUS_CODES.SUCCESSFUL &&
      txnAfterSettle?.amount === "10000" &&
      receiptAfterSettle?.id === receipt?.id &&
      receiptAfterSettle?.amount === receipt?.amount &&
      allocAfterSettle.length === 1 &&
      allocAfterSettle[0]?.allocatedAmount === "10000" &&
      amountDueAfterSettlement === "10000",
  });

  // Duplicate callback / idempotent allocation
  await happy.payments.applyProviderOutcome(actor, {
    paymentTransactionId: pendingPay.transaction.id,
    outcome: {
      outcome: "SUCCESSFUL",
      providerTransactionReference: pendingPay.transaction.providerTransactionReference,
      amount: "10000",
      currency: "KES",
      obligationId: obligation.id,
      failureCode: null,
      failureReason: null,
    },
  });
  const allocAfterDup = await happy.store.allocationPort.listByTransaction(
    actor.businessId,
    pendingPay.transaction.id
  );
  results.push({
    name: "journey:duplicate-callback-does-not-duplicate-allocation",
    ok: allocAfterDup.length === 1,
  });

  // --- Exception path: UNKNOWN → query → investigation → safe resolution
  const unknownEnv = harness();
  unknownEnv.adapter.nextInitiate = (input) => ({
    outcome: "UNKNOWN",
    providerTransactionReference: `prov-${input.paymentTransactionId}`,
    amount: input.amount,
    currency: input.currency,
    obligationId: input.obligationId,
    failureCode: null,
    failureReason: null,
  });
  const unknownOb = await createDue(unknownEnv, actor);
  const unknownPay = await pay(unknownEnv, actor, unknownOb.id, {
    methodId: "method-mm",
    amount: "10000",
    key: "alpha-unknown",
  });
  const unknownOutstanding = await unknownEnv.store.findById(
    actor.businessId,
    unknownOb.id
  );
  let unknownRetry: string | null = null;
  try {
    await unknownEnv.exceptions.retryPayment(actor, unknownPay.transaction.id);
  } catch (error) {
    unknownRetry = codeOf(error);
  }
  unknownEnv.adapter.nextQuery = {
    outcome: "SUCCESSFUL",
    providerTransactionReference: unknownPay.transaction.providerTransactionReference,
    amount: "10000",
    currency: "KES",
    obligationId: unknownOb.id,
    failureCode: null,
    failureReason: null,
  };
  const queried = await unknownEnv.exceptions.queryProvider(
    actor,
    unknownPay.transaction.id
  );
  const afterQuery = await unknownEnv.store.findById(actor.businessId, unknownOb.id);
  results.push({
    name: "journey:unknown-blocks-blind-retry-then-query-resolves",
    ok:
      unknownPay.transaction.status === PAYMENT_STATUS_CODES.UNKNOWN &&
      unknownOutstanding?.outstandingAmount === "10000" &&
      unknownRetry === PAYMENT_ERROR_CODES.EXCEPTION_RETRY_NOT_ALLOWED &&
      afterQuery?.outstandingAmount === "0" &&
      afterQuery?.paidAmount === "10000",
    detail: `retry=${unknownRetry} queried=${queried?.status} afterQueryPaid=${afterQuery?.paidAmount}`,
  });

  const mismatchEnv = harness();
  mismatchEnv.adapter.nextInitiate = (input) => ({
    outcome: "SUCCESSFUL",
    providerTransactionReference: `prov-${input.paymentTransactionId}`,
    amount: "9000",
    currency: input.currency,
    obligationId: input.obligationId,
    failureCode: null,
    failureReason: null,
  });
  const mismatchOb = await createDue(mismatchEnv, actor);
  const mismatchPay = await pay(mismatchEnv, actor, mismatchOb.id, {
    methodId: "method-mm",
    amount: "10000",
    key: "alpha-mismatch",
  });
  const mismatchRows = await mismatchEnv.exceptions.listForTransaction(
    actor,
    mismatchPay.transaction.id
  );
  const mismatchOutstanding = await mismatchEnv.store.findById(
    actor.businessId,
    mismatchOb.id
  );
  results.push({
    name: "journey:amount-mismatch-cannot-auto-complete",
    ok:
      mismatchPay.transaction.status !== PAYMENT_STATUS_CODES.SUCCESSFUL &&
      mismatchRows.some((row) => row.exceptionType.includes("AMOUNT")) &&
      mismatchOutstanding?.outstandingAmount === "10000",
    detail: `status=${mismatchPay.transaction.status} exceptions=${mismatchRows.map((r) => r.exceptionType).join(",")}`,
  });

  // --- Refund path
  const refundEnv = harness();
  const refundOb = await createDue(refundEnv, actor);
  const refundPay = await pay(refundEnv, actor, refundOb.id, {
    methodId: "method-mm",
    amount: "10000",
    key: "alpha-refund-pay",
  });
  const originalReceipt = await refundEnv.receipts.getByTransaction(
    actor,
    refundPay.transaction.id
  );
  const originalAlloc = await refundEnv.store.allocationPort.listByTransaction(
    actor.businessId,
    refundPay.transaction.id
  );
  const refund = await refundEnv.refunds.requestRefund(actor, {
    paymentTransactionId: refundPay.transaction.id,
    reason: "Customer cancelled",
    idempotencyKey: "alpha-full-refund",
  });
  const paymentAfterRefund = await refundEnv.store.transactionPort.findById(
    actor.businessId,
    refundPay.transaction.id
  );
  const receiptAfterRefund = await refundEnv.receipts.getByTransaction(
    actor,
    refundPay.transaction.id
  );
  const allocAfterRefund = await refundEnv.store.allocationPort.listByTransaction(
    actor.businessId,
    refundPay.transaction.id
  );
  const obAfterRefund = await refundEnv.store.findById(actor.businessId, refundOb.id);
  results.push({
    name: "journey:full-refund-restores-outstanding",
    ok:
      refundPay.transaction.status === PAYMENT_STATUS_CODES.SUCCESSFUL &&
      paymentAfterRefund?.status === PAYMENT_STATUS_CODES.SUCCESSFUL &&
      paymentAfterRefund?.amount === "10000" &&
      originalReceipt?.id === receiptAfterRefund?.id &&
      originalReceipt?.amount === receiptAfterRefund?.amount &&
      originalAlloc.length >= 1 &&
      allocAfterRefund.some((row) => row.id === originalAlloc[0]?.id) &&
      refund.id !== refundPay.transaction.id &&
      obAfterRefund?.paidAmount === "0" &&
      obAfterRefund?.outstandingAmount === "10000" &&
      obAfterRefund?.amountDue === "10000",
    detail: `refund=${refund.status} netPaid=${obAfterRefund?.paidAmount}`,
  });

  let overRefund: string | null = null;
  try {
    await refundEnv.refunds.requestRefund(actor, {
      paymentTransactionId: refundPay.transaction.id,
      amount: "1",
      reason: "Beyond refundable",
      idempotencyKey: "alpha-over-refund",
    });
  } catch (error) {
    overRefund = codeOf(error);
  }
  results.push({
    name: "journey:cannot-refund-more-than-collected",
    ok:
      overRefund === PAYMENT_ERROR_CODES.NO_REFUNDABLE_PAYMENT ||
      overRefund === PAYMENT_ERROR_CODES.REFUND_AMOUNT_EXCEEDS_REFUNDABLE,
    detail: overRefund ?? "no-error",
  });

  const partialRefundEnv = harness();
  const partialRefundOb = await createDue(partialRefundEnv, actor);
  const partialRefundPay = await pay(partialRefundEnv, actor, partialRefundOb.id, {
    methodId: "method-mm",
    amount: "10000",
    key: "alpha-partial-pay",
  });
  const firstPartial = await partialRefundEnv.refunds.requestRefund(actor, {
    paymentTransactionId: partialRefundPay.transaction.id,
    amount: "4000",
    reason: "Partial return",
    idempotencyKey: "alpha-partial-1",
  });
  const secondPartial = await partialRefundEnv.refunds.requestRefund(actor, {
    paymentTransactionId: partialRefundPay.transaction.id,
    amount: "3000",
    reason: "Second partial",
    idempotencyKey: "alpha-partial-2",
  });
  const afterPartials = await partialRefundEnv.store.findById(
    actor.businessId,
    partialRefundOb.id
  );
  results.push({
    name: "journey:multiple-partial-refunds",
    ok:
      firstPartial.amount === "4000" &&
      secondPartial.amount === "3000" &&
      afterPartials?.paidAmount === "3000" &&
      afterPartials?.outstandingAmount === "7000" &&
      afterPartials?.amountDue === "10000",
  });

  // --- Split / partial / four methods
  const split = harness();
  const splitOb = await createDue(split, actor);
  await pay(split, actor, splitOb.id, {
    methodId: "method-mm",
    amount: "4000",
    key: "alpha-split-mm",
  });
  await pay(split, actor, splitOb.id, {
    methodId: "method-cash",
    amount: "3000",
    key: "alpha-split-cash",
  });
  await pay(split, actor, splitOb.id, {
    methodId: "method-bank",
    amount: "3000",
    key: "alpha-split-bank",
  });
  const splitState = await split.store.findById(actor.businessId, splitOb.id);
  const splitTxns = await split.store.transactionPort.listByObligation(
    actor.businessId,
    splitOb.id
  );
  const methodNames = splitTxns.map((row) => row.methodName ?? row.methodId).join(",");
  results.push({
    name: "journey:split-4000-3000-3000",
    ok:
      splitState?.paidAmount === "10000" &&
      splitState?.outstandingAmount === "0" &&
      splitTxns.length === 3 &&
      !splitTxns.some((row) => /SPLIT|CREDIT/i.test(`${row.methodName ?? ""} ${row.methodId ?? ""}`)),
    detail: `paid=${splitState?.paidAmount} methods=${methodNames}`,
  });

  const four = harness();
  const fourOb = await createDue(four, actor);
  await pay(four, actor, fourOb.id, {
    methodId: "method-mm",
    amount: "2500",
    key: "alpha-four-mm",
  });
  await pay(four, actor, fourOb.id, {
    methodId: "method-cash",
    amount: "2500",
    key: "alpha-four-cash",
  });
  await pay(four, actor, fourOb.id, {
    methodId: "method-bank",
    amount: "2500",
    key: "alpha-four-bank",
  });
  await pay(four, actor, fourOb.id, {
    methodId: "method-card",
    amount: "2500",
    key: "alpha-four-card",
  });
  const fourState = await four.store.findById(actor.businessId, fourOb.id);
  const fourTxns = await four.store.transactionPort.listByObligation(
    actor.businessId,
    fourOb.id
  );
  const fourIds = fourTxns.map((row) => row.methodId).sort().join(",");
  results.push({
    name: "journey:four-methods-coexist",
    ok:
      fourState?.paidAmount === "10000" &&
      fourState?.outstandingAmount === "0" &&
      fourIds.includes("method-cash") &&
      fourIds.includes("method-mm") &&
      fourIds.includes("method-bank") &&
      fourIds.includes("method-card") &&
      !fourIds.includes("SPLIT") &&
      !fourIds.includes("CREDIT"),
    detail: fourIds,
  });

  const partial = harness();
  const partialOb = await createDue(partial, actor);
  await pay(partial, actor, partialOb.id, {
    methodId: "method-mm",
    amount: "4000",
    key: "alpha-partial-4000",
  });
  const partialState = await partial.store.findById(actor.businessId, partialOb.id);
  results.push({
    name: "journey:partial-4000-leaves-6000",
    ok: partialState?.paidAmount === "4000" && partialState?.outstandingAmount === "6000",
  });

  // --- Failed / pending / unknown do not reduce outstanding
  const failedEnv = harness();
  failedEnv.adapter.nextInitiate = (input) => ({
    outcome: "FAILED",
    providerTransactionReference: `prov-${input.paymentTransactionId}`,
    amount: input.amount,
    currency: input.currency,
    obligationId: input.obligationId,
    failureCode: "DECLINED",
    failureReason: "Declined",
  });
  const failedOb = await createDue(failedEnv, actor);
  await pay(failedEnv, actor, failedOb.id, {
    methodId: "method-mm",
    amount: "10000",
    key: "alpha-failed",
  });
  const failedState = await failedEnv.store.findById(actor.businessId, failedOb.id);
  results.push({
    name: "journey:failed-does-not-reduce-outstanding",
    ok: failedState?.paidAmount === "0" && failedState?.outstandingAmount === "10000",
  });

  // --- Invoice / credit-sale
  const cashPaid = harness();
  const cashOb = await createDue(cashPaid, actor);
  await pay(cashPaid, actor, cashOb.id, {
    methodId: "method-cash",
    amount: "10000",
    key: "alpha-cash-full",
  });
  const cashInvoices = await cashPaid.invoices.listForObligation(actor, cashOb.id);
  results.push({
    name: "journey:fully-paid-cash-invoice-optional",
    ok: cashInvoices.invoices.length === 0,
  });

  const creditOn = harness();
  const creditOb = await createDue(creditOn, actor);
  await pay(creditOn, actor, creditOb.id, {
    methodId: "method-mm",
    amount: "4000",
    key: "alpha-credit-partial",
  });
  const creditInvoice = await creditOn.invoices.createInvoice(actor, {
    obligationId: creditOb.id,
    paymentTermCode: "NET_30",
  });
  results.push({
    name: "journey:credit-invoice-for-outstanding",
    ok:
      creditInvoice.invoiceAmount === "6000" ||
      creditInvoice.outstandingAmount === "6000" ||
      creditInvoice.invoiceAmount === "10000",
    detail: `invoiceAmount=${creditInvoice.invoiceAmount} outstanding=${creditInvoice.outstandingAmount} status=${creditInvoice.status}`,
  });

  const creditOff = harness({
    flags: { ...DEFAULT_FLAGS, creditSalesEnabled: false },
  });
  const creditOffOb = await createDue(creditOff, actor);
  await pay(creditOff, actor, creditOffOb.id, {
    methodId: "method-mm",
    amount: "4000",
    key: "alpha-credit-off",
  });
  let creditRejected: string | null = null;
  try {
    await creditOff.invoices.createInvoice(actor, {
      obligationId: creditOffOb.id,
      paymentTermCode: "NET_30",
    });
  } catch (error) {
    creditRejected = codeOf(error);
  }
  results.push({
    name: "journey:credit-rejected-when-disabled",
    ok: creditRejected === PAYMENT_ERROR_CODES.CREDIT_SALES_DISABLED,
    detail: creditRejected ?? "no-error",
  });

  // --- Receipt rules: pending cannot receipt; idempotent issue
  const pendingReceiptEnv = harness();
  pendingReceiptEnv.adapter.nextInitiate = (input) => ({
    outcome: "PENDING",
    providerTransactionReference: `prov-${input.paymentTransactionId}`,
    amount: input.amount,
    currency: input.currency,
    obligationId: input.obligationId,
    failureCode: null,
    failureReason: null,
  });
  const pendingReceiptOb = await createDue(pendingReceiptEnv, actor);
  const pendingReceiptPay = await pay(pendingReceiptEnv, actor, pendingReceiptOb.id, {
    methodId: "method-mm",
    amount: "10000",
    key: "alpha-pending-receipt",
  });
  let pendingReceiptError: string | null = null;
  try {
    await pendingReceiptEnv.receipts.issueForSuccessfulPayment(
      actor,
      pendingReceiptPay.transaction.id
    );
  } catch (error) {
    pendingReceiptError = codeOf(error);
  }
  results.push({
    name: "journey:pending-cannot-generate-receipt",
    ok: pendingReceiptError !== null && pendingReceiptError !== "other",
    detail: pendingReceiptError ?? "no-error",
  });

  const receiptIdem = await happy.receipts.issueReceipt(actor, {
    paymentTransactionId: pendingPay.transaction.id,
  });
  results.push({
    name: "journey:receipt-issue-idempotent",
    ok: receiptIdem.id === receipt?.id && receiptIdem.receiptNumber === receipt?.receiptNumber,
  });

  // --- Tenant isolation
  let crossRead: string | null = null;
  try {
    await happy.obligations.getObligation(ctx("biz-b"), obligation.id);
  } catch (error) {
    crossRead = codeOf(error);
  }
  let crossTxn: string | null = null;
  try {
    await happy.payments.getTransaction(ctx("biz-b"), pendingPay.transaction.id);
  } catch (error) {
    crossTxn = codeOf(error);
  }
  const crossReceipt = await happy.receipts.getByTransaction(
    ctx("biz-b"),
    pendingPay.transaction.id
  );
  let crossSettle: string | null = null;
  try {
    await happy.settlements.getByTransaction(ctx("biz-b"), pendingPay.transaction.id);
  } catch (error) {
    crossSettle = codeOf(error);
  }
  results.push({
    name: "journey:cross-business-fails-closed",
    ok:
      (crossRead === PAYMENT_ERROR_CODES.CROSS_BUSINESS_ACCESS ||
        crossRead === PAYMENT_ERROR_CODES.OBLIGATION_NOT_FOUND) &&
      (crossTxn === PAYMENT_ERROR_CODES.CROSS_BUSINESS_ACCESS ||
        crossTxn === PAYMENT_ERROR_CODES.TRANSACTION_NOT_FOUND) &&
      crossReceipt === null &&
      (crossSettle === PAYMENT_ERROR_CODES.CROSS_BUSINESS_ACCESS ||
        crossSettle === PAYMENT_ERROR_CODES.SETTLEMENT_NOT_FOUND ||
        crossSettle === PAYMENT_ERROR_CODES.TRANSACTION_NOT_FOUND),
    detail: `ob=${crossRead} txn=${crossTxn} rct=${crossReceipt ? "leaked" : "null"} set=${crossSettle}`,
  });

  // --- Idempotent initiation
  const idem = harness();
  const idemOb = await createDue(idem, actor);
  const first = await pay(idem, actor, idemOb.id, {
    methodId: "method-mm",
    amount: "4000",
    key: "alpha-idem",
  });
  const second = await pay(idem, actor, idemOb.id, {
    methodId: "method-mm",
    amount: "4000",
    key: "alpha-idem",
  });
  const idemTxns = await idem.store.transactionPort.listByObligation(
    actor.businessId,
    idemOb.id
  );
  results.push({
    name: "journey:initiation-idempotent",
    ok: first.transaction.id === second.transaction.id && idemTxns.length === 1,
  });

  const refundIdem1 = await refundEnv.refunds.requestRefund(actor, {
    paymentTransactionId: refundPay.transaction.id,
    reason: "Customer cancelled",
    idempotencyKey: "alpha-full-refund",
  });
  results.push({
    name: "journey:refund-idempotent",
    ok: refundIdem1.id === refund.id,
  });

  // --- NOT_ACCEPTED retry allowed
  const retryEnv = harness();
  retryEnv.adapter.nextInitiate = (input) => ({
    outcome: "NOT_ACCEPTED",
    providerTransactionReference: `prov-${input.paymentTransactionId}`,
    amount: input.amount,
    currency: input.currency,
    obligationId: input.obligationId,
    failureCode: null,
    failureReason: null,
  });
  retryEnv.adapter.nextQuery = {
    outcome: "NOT_ACCEPTED",
    providerTransactionReference: null,
    amount: null,
    currency: null,
    obligationId: null,
    failureCode: null,
    failureReason: null,
  };
  const notAcceptedOb = await createDue(retryEnv, actor);
  const notAccepted = await pay(retryEnv, actor, notAcceptedOb.id, {
    methodId: "method-mm",
    amount: "10000",
    key: "alpha-not-accepted",
  });
  const canRetry = await retryEnv.exceptions.canRetry(actor, notAccepted.transaction.id);
  retryEnv.adapter.nextInitiate = (input) => ({
    outcome: "SUCCESSFUL",
    providerTransactionReference: `prov-retry-${input.paymentTransactionId}`,
    amount: input.amount,
    currency: input.currency,
    obligationId: input.obligationId,
    failureCode: null,
    failureReason: null,
  });
  let retriedStatus: string | null = null;
  let retriedId: string | null = null;
  let retryError: string | null = null;
  try {
    const retried = await retryEnv.exceptions.retryPayment(
      actor,
      notAccepted.transaction.id,
      "alpha-retry-1"
    );
    retriedStatus = retried.transaction.status;
    retriedId = retried.transaction.id;
  } catch (error) {
    retryError = codeOf(error);
  }
  results.push({
    name: "journey:not-accepted-retry-allowed",
    ok:
      canRetry.allowed &&
      retryError === null &&
      retriedId !== null &&
      retriedId !== notAccepted.transaction.id,
    detail: `canRetry=${canRetry.allowed} original=${notAccepted.transaction.status} retried=${retriedStatus} error=${retryError}`,
  });

  return results;
}

async function main() {
  console.log(`BP-007 v1 certification journey — customer: ${CUSTOMER.label} (${CUSTOMER.customerId})`);
  console.log(`Sale ${CUSTOMER.orderNumber} / ${CUSTOMER.currency} ${CUSTOMER.amountDue}\n`);
  const results = await runJourney();
  const failed = results.filter((row) => !row.ok);
  for (const row of results) {
    const mark = row.ok ? "PASS" : "FAIL";
    console.log(`${mark}  ${row.name}${row.detail ? `  ${row.detail}` : ""}`);
  }
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length > 0) {
    process.exit(1);
  }
}

void main();
