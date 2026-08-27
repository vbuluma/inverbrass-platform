/**
 * Purpose:
 * Smoke-validate BP-007 / IP-06 Refunds, Reversals & Adjustments.
 *
 * Usage:
 *   npx tsx scripts/bp007-ip06-refunds-reversals-adjustments-smoke-validation.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

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
import {
  listSourceFiles,
  scanPaymentArchitecture,
} from "@/modules/payments/architecture-scan";
import {
  PAYMENT_ERROR_CODES,
  PAYMENT_STATUS_CODES,
  PaymentAllocationService,
  PaymentInitiationService,
  PaymentInvoiceService,
  PaymentObligationError,
  PaymentObligationService,
  PaymentReceiptService,
  PaymentRefundService,
  ConfigurableInvoiceClock,
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

const ROOT = path.resolve(__dirname, "..");

type SmokeResult = { name: string; ok: boolean; detail?: string };

const REQUIRED_FILES = [
  "drizzle/0066_bp007_ip006_refunds_reversals_adjustments.sql",
  "src/db/schema/payment-refund.ts",
  "src/modules/payments/services/payment-refund-service.ts",
  "src/modules/payments/services/payment-refund-rules.ts",
  "src/modules/payments/actions/payment-refund-actions.ts",
  "src/core/workflow-engine/adapters/in-process-workflow-adapter.ts",
];

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
    orderId: "order-1",
    orderNumber: "SO-000001",
    businessId: "biz-a",
    customerId: "party-1",
    expectedAmount: "10000",
    currency: "KES",
    commercialContractId: "ctc-1",
    snapshotId: "11111111-1111-1111-1111-111111111111",
    operationalStatus: "CONFIRMED",
    financialInstructionType: "SALE",
    expiresAt: null,
    lines: [
      {
        orderLineId: "line-1",
        offeringId: "offering-1",
        expectedPayable: "10000",
        currencyCode: "KES",
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
  return adapter;
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

function harness(options?: {
  adapter?: ScriptedPaymentInitiationAdapter;
  amountDue?: string;
  requiresApproval?: boolean;
  instructions?: InMemoryFinancialInstructionAdapter;
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
  const enablement: PaymentEnablementPort = {
    async getFlags() {
      return DEFAULT_FLAGS;
    },
  };
  const amountDue = options?.amountDue ?? "10000";
  const contract = validContract({
    expectedAmount: amountDue,
    lines: [
      {
        orderLineId: "line-1",
        offeringId: "offering-1",
        expectedPayable: amountDue,
        currencyCode: "KES",
      },
    ],
  });
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
    currencies: new InMemoryCurrencyReference(new Set(["KES"])),
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
  const instructions = options?.instructions ?? new InMemoryFinancialInstructionAdapter();
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
    instructions,
    allocationEffects: allocations,
    invoiceEffects: invoices,
    idempotency: store.idempotencyPort,
    locks: createInProcessPaymentLock(),
    audit,
  });
  return {
    store,
    audit,
    adapter,
    numbering,
    receipts,
    invoices,
    allocations,
    refunds,
    obligations: new PaymentObligationService(shared),
    payments: new PaymentInitiationService({
      ...shared,
      transactions: store.transactionPort,
      allocations,
      policy,
      receipts,
    }),
  };
}

function checkFiles(): SmokeResult[] {
  return REQUIRED_FILES.map((relative) => ({
    name: `files:${relative}`,
    ok: existsSync(path.join(ROOT, relative)),
  }));
}

function scanScoped() {
  const files = [
    ...listSourceFiles(path.join(ROOT, "src/modules/payments")),
    ...listSourceFiles(path.join(ROOT, "src/core/payment-engine")),
    ...listSourceFiles(path.join(ROOT, "src/core/workflow-engine")),
    ...listSourceFiles(path.join(ROOT, "src/app")).filter((file) => {
      const rel = file.replace(/\\/g, "/");
      return rel.includes("/payments/");
    }),
  ].filter((file) => {
    const rel = file.replace(/\\/g, "/");
    return (
      !rel.includes("/services/payment-memory-store.ts") &&
      !rel.includes("/architecture-scan.ts") &&
      !rel.includes("/adapters/scripted-initiation-adapter.ts")
    );
  });
  return scanPaymentArchitecture(files);
}

function staticChecks(): SmokeResult[] {
  const scan = scanScoped();
  const refundService = stripComments(
    readFileSync(path.join(ROOT, "src/modules/payments/services/payment-refund-service.ts"), "utf8")
  );
  const refundRules = stripComments(
    readFileSync(path.join(ROOT, "src/modules/payments/services/payment-refund-rules.ts"), "utf8")
  );
  const combined = `${refundService}\n${refundRules}`;
  return [
    {
      name: "tc-13:no-provider-sdk",
      ok: scan.sdkHits.length === 0,
      detail: scan.sdkHits.join(","),
    },
    {
      name: "tc-14:no-direct-provider-http",
      ok: scan.httpHits.length === 0,
      detail: scan.httpHits.join(","),
    },
    {
      name: "tc-34:no-hard-coded-provider-routing",
      ok: scan.routingHits.length === 0,
      detail: scan.routingHits.join(","),
    },
    {
      name: "tc-35:no-hard-coded-provider-limits",
      ok: scan.limitHits.length === 0,
      detail: scan.limitHits.join(","),
    },
    {
      name: "tc-33:no-commercial-recalculation",
      ok:
        !/recalculateTax|taxInclusive|lineTotal\s*\+|grandTotal\s*\+/.test(combined) &&
        scan.orderLineTotalHits.length === 0,
    },
    {
      name: "static:no-settlement-reconciliation-collections",
      ok: !/CREATE TABLE IF NOT EXISTS "payment_settlement"|exception_queue|cashbook/.test(
        readFileSync(
          path.join(ROOT, "drizzle/0066_bp007_ip006_refunds_reversals_adjustments.sql"),
          "utf8"
        )
      ),
    },
    {
      name: "static:no-cash-hardcode",
      ok: !/if\s*\(\s*(method|methodCode|option\.methodCode)\s*===\s*["']CASH["']/.test(combined),
    },
    {
      name: "ux:no-engine-jargon",
      ok: !/BP-007|IP-06|ENG-006|ENG-005/.test(
        stripComments(
          readFileSync(
            path.join(ROOT, "src/modules/payments/components/payment-transaction-detail.tsx"),
            "utf8"
          )
        )
      ),
    },
  ];
}

async function paidTransaction(
  env: ReturnType<typeof harness>,
  actor: CurrentBusinessContext,
  input?: { methodId?: string; amount?: string; confirmManual?: boolean; key?: string }
) {
  const obligation = await env.obligations.createObligation(actor, { orderId: "order-1" });
  const payment = await env.payments.initiatePayment(actor, {
    obligationId: obligation.id,
    methodId: input?.methodId ?? "method-mm",
    amount: input?.amount ?? "10000",
    currency: "KES",
    idempotencyKey: input?.key ?? crypto.randomUUID(),
    confirmManual: input?.confirmManual,
  });
  return { obligation, payment };
}

async function runCoreCases(): Promise<SmokeResult[]> {
  const results: SmokeResult[] = [];
  const actor = ctx("biz-a");

  const full = harness();
  const cashPaid = await paidTransaction(full, actor, {
    methodId: "method-cash",
    confirmManual: true,
    key: "cash-pay",
  });
  const receiptBefore = await full.receipts.getByTransaction(
    actor,
    cashPaid.payment.transaction.id
  );
  const originalAllocations = await full.store.allocationPort.listByTransaction(
    actor.businessId,
    cashPaid.payment.transaction.id
  );
  const request = await full.refunds.requestRefund(actor, {
    paymentTransactionId: cashPaid.payment.transaction.id,
    reason: "Customer cancelled",
    confirmManual: true,
    idempotencyKey: "cash-full-refund",
  });
  const paymentAfter = await full.store.transactionPort.findById(
    actor.businessId,
    cashPaid.payment.transaction.id
  );
  const receiptAfter = await full.receipts.getByTransaction(
    actor,
    cashPaid.payment.transaction.id
  );
  const obligationAfter = await full.store.findById(actor.businessId, cashPaid.obligation.id);
  const allocationsAfter = await full.store.allocationPort.listByTransaction(
    actor.businessId,
    cashPaid.payment.transaction.id
  );

  results.push({
    name: "tc-01:successful-payment-can-request-full-refund",
    ok: request.refundType === "FULL_REFUND" && request.amount === "10000",
  });
  results.push({
    name: "tc-02:full-refund-completes-successfully",
    ok: request.status === "SUCCESSFUL",
  });
  results.push({
    name: "tc-03:original-payment-remains-successful",
    ok: paymentAfter?.status === PAYMENT_STATUS_CODES.SUCCESSFUL,
  });
  results.push({
    name: "tc-04:original-receipt-unchanged",
    ok:
      receiptBefore?.id === receiptAfter?.id &&
      receiptBefore?.amount === receiptAfter?.amount &&
      receiptBefore?.receiptNumber === receiptAfter?.receiptNumber,
  });
  results.push({
    name: "tc-15:cash-refund-uses-catalogue-config",
    ok: request.captureMode === "MANUAL" && !request.providerRefundReference,
  });
  results.push({
    name: "tc-25:refund-references-original-receipt",
    ok: request.originalReceiptId === receiptBefore?.id,
  });
  results.push({
    name: "tc-11:successful-refund-updates-net-paid",
    ok: obligationAfter?.paidAmount === "0" && obligationAfter.outstandingAmount === "10000",
  });
  results.push({
    name: "tc-28:original-payment-immutable",
    ok:
      paymentAfter?.amount === "10000" &&
      paymentAfter.status === PAYMENT_STATUS_CODES.SUCCESSFUL,
  });
  results.push({
    name: "tc-29:original-allocation-history-preserved",
    ok:
      originalAllocations.some((row) => row.status === "ALLOCATED" && row.allocatedAmount === "10000") &&
      allocationsAfter.some((row) => row.status === "ALLOCATED" && row.allocatedAmount === "10000") &&
      allocationsAfter.some((row) => row.status === "REFUND" && row.allocatedAmount === "10000"),
  });
  results.push({
    name: "tc-27:refund-is-audited",
    ok:
      full.audit.entries.some((row) => row.action === "REFUND_REQUESTED") &&
      full.audit.entries.some((row) => row.action === "REFUND_SUCCESSFUL"),
  });

  const electronic = harness();
  const elPaid = await paidTransaction(electronic, actor, { key: "el-pay" });
  const elRefund = await electronic.refunds.requestRefund(actor, {
    paymentTransactionId: elPaid.payment.transaction.id,
    reason: "Return",
    idempotencyKey: "el-full",
  });
  results.push({
    name: "tc-12:electronic-refund-goes-through-eng-006",
    ok:
      electronic.adapter.refundCalls.length === 1 &&
      elRefund.status === "SUCCESSFUL" &&
      Boolean(elRefund.providerRefundReference),
  });
  results.push({
    name: "tc-19:provider-reference-persisted",
    ok: Boolean(elRefund.providerRefundReference),
    detail: elRefund.providerRefundReference ?? undefined,
  });

  const partial = harness();
  const partPaid = await paidTransaction(partial, actor, { key: "part-pay" });
  const first = await partial.refunds.requestRefund(actor, {
    paymentTransactionId: partPaid.payment.transaction.id,
    amount: "3000",
    refundType: "PARTIAL_REFUND",
    reason: "Partial return",
    idempotencyKey: "part-1",
  });
  const second = await partial.refunds.requestRefund(actor, {
    paymentTransactionId: partPaid.payment.transaction.id,
    amount: "2000",
    refundType: "PARTIAL_REFUND",
    reason: "Second return",
    idempotencyKey: "part-2",
  });
  let exceeded: string | null = null;
  try {
    await partial.refunds.requestRefund(actor, {
      paymentTransactionId: partPaid.payment.transaction.id,
      amount: "6000",
      reason: "Too much",
      idempotencyKey: "part-3",
    });
  } catch (error) {
    exceeded = error instanceof PaymentObligationError ? error.code : "other";
  }
  const eligibility = await partial.refunds.getEligibility(
    actor,
    partPaid.payment.transaction.id
  );
  const partObligation = await partial.store.findById(
    actor.businessId,
    partPaid.obligation.id
  );
  results.push({
    name: "tc-05:partial-refund-works",
    ok: first.status === "SUCCESSFUL" && first.amount === "3000",
  });
  results.push({
    name: "tc-06:second-partial-within-remaining",
    ok: second.status === "SUCCESSFUL" && second.amount === "2000",
  });
  results.push({
    name: "tc-07:exceeding-refundable-fails",
    ok: exceeded === PAYMENT_ERROR_CODES.REFUND_AMOUNT_EXCEEDS_REFUNDABLE,
  });
  results.push({
    name: "tc-30:refund-history-visible",
    ok: eligibility.refunds.length >= 2,
  });
  results.push({
    name: "tc-31:partial-amount-displayed",
    ok: eligibility.alreadyRefundedAmount === "5000" && eligibility.refundableAmount === "5000",
  });
  results.push({
    name: "tc-11b:net-paid-after-partial",
    ok: partObligation?.paidAmount === "5000" && partObligation.outstandingAmount === "5000",
  });

  let none: string | null = null;
  const unpaid = harness();
  const unpaidOb = await unpaid.obligations.createObligation(actor, { orderId: "order-1" });
  try {
    await unpaid.store.transactionPort.insert({
      businessId: actor.businessId,
      obligationId: unpaidOb.id,
      transactionNumber: "PT-NONE",
      methodId: "method-cash",
      networkId: null,
      providerId: null,
      channelId: null,
      methodName: "Cash",
      networkName: null,
      providerName: null,
      channelName: null,
      amount: "10000",
      currencyCode: "KES",
      status: PAYMENT_STATUS_CODES.PENDING,
      captureMode: "MANUAL",
      providerTransactionReference: null,
      idempotencyKey: "pending-none",
      initiatedAt: new Date(),
      completedAt: null,
      failureCode: null,
      failureReason: null,
      providerResponseMetadata: null,
      outcomeMismatch: false,
      metadata: null,
      createdBy: actor.platformUserId,
      updatedBy: actor.platformUserId,
    });
    const pendingTxn = [...unpaid.store.transactions.values()].find(
      (row) => row.idempotencyKey === "pending-none"
    );
    await unpaid.refunds.requestRefund(actor, {
      paymentTransactionId: pendingTxn?.id ?? "",
      reason: "No money",
      confirmManual: true,
    });
  } catch (error) {
    none = error instanceof PaymentObligationError ? error.code : "other";
  }
  results.push({
    name: "tc-08:no-successful-collected-payment-fails",
    ok: none === PAYMENT_ERROR_CODES.NO_REFUNDABLE_PAYMENT,
  });

  const pendingAdapter = successfulAdapter();
  pendingAdapter.nextRefund = {
    outcome: "PENDING",
    providerTransactionReference: "refund-pending",
    amount: "3000",
    currency: "KES",
    obligationId: null,
    failureCode: null,
    failureReason: null,
  };
  const pendingEnv = harness({ adapter: pendingAdapter });
  const pendingPaid = await paidTransaction(pendingEnv, actor, { key: "pend-pay" });
  const pendingRefund = await pendingEnv.refunds.requestRefund(actor, {
    paymentTransactionId: pendingPaid.payment.transaction.id,
    amount: "3000",
    reason: "Pending refund",
    idempotencyKey: "pend-1",
  });
  const pendingEligibility = await pendingEnv.refunds.getEligibility(
    actor,
    pendingPaid.payment.transaction.id
  );
  results.push({
    name: "tc-09:pending-refund-does-not-count-as-successful",
    ok:
      pendingRefund.status === "PENDING" &&
      pendingEligibility.alreadyRefundedAmount === "0" &&
      pendingEligibility.refundableAmount === "10000",
  });

  const failedAdapter = successfulAdapter();
  failedAdapter.nextRefund = {
    outcome: "FAILED",
    providerTransactionReference: "refund-failed",
    amount: "3000",
    currency: "KES",
    obligationId: null,
    failureCode: "REJECTED",
    failureReason: "Provider rejected",
  };
  const failedEnv = harness({ adapter: failedAdapter });
  const failedPaid = await paidTransaction(failedEnv, actor, { key: "fail-pay" });
  const failedRefund = await failedEnv.refunds.requestRefund(actor, {
    paymentTransactionId: failedPaid.payment.transaction.id,
    amount: "3000",
    reason: "Failed refund",
    idempotencyKey: "fail-1",
  });
  const failedEligibility = await failedEnv.refunds.getEligibility(
    actor,
    failedPaid.payment.transaction.id
  );
  results.push({
    name: "tc-10:failed-refund-does-not-reduce-refundable",
    ok:
      failedRefund.status === "FAILED" &&
      failedEligibility.refundableAmount === "10000",
  });
  results.push({
    name: "tc-20:provider-rejection-is-failed",
    ok: failedRefund.status === "FAILED",
  });

  const idem = harness();
  const idemPaid = await paidTransaction(idem, actor, { key: "idem-pay" });
  const firstIdem = await idem.refunds.requestRefund(actor, {
    paymentTransactionId: idemPaid.payment.transaction.id,
    reason: "Idempotent",
    idempotencyKey: "same-key",
  });
  const secondIdem = await idem.refunds.requestRefund(actor, {
    paymentTransactionId: idemPaid.payment.transaction.id,
    reason: "Idempotent",
    idempotencyKey: "same-key",
  });
  results.push({
    name: "tc-16:same-idempotency-returns-same-refund",
    ok: firstIdem.id === secondIdem.id && idem.adapter.refundCalls.length === 1,
  });

  const concurrent = harness();
  const concPaid = await paidTransaction(concurrent, actor, { key: "conc-pay" });
  const [left, right] = await Promise.allSettled([
    concurrent.refunds.requestRefund(actor, {
      paymentTransactionId: concPaid.payment.transaction.id,
      amount: "6000",
      reason: "A",
      idempotencyKey: "conc-a",
    }),
    concurrent.refunds.requestRefund(actor, {
      paymentTransactionId: concPaid.payment.transaction.id,
      amount: "6000",
      reason: "B",
      idempotencyKey: "conc-b",
    }),
  ]);
  const outcomes = [left, right];
  const successes = outcomes.filter(
    (row) => row.status === "fulfilled" && row.value.status === "SUCCESSFUL"
  );
  const failures = outcomes.filter(
    (row) =>
      row.status === "rejected" &&
      row.reason instanceof PaymentObligationError &&
      row.reason.code === PAYMENT_ERROR_CODES.REFUND_AMOUNT_EXCEEDS_REFUNDABLE
  );
  results.push({
    name: "tc-17:concurrent-refunds-cannot-exceed-refundable",
    ok: successes.length === 1 && failures.length === 1,
  });

  const unknownAdapter = successfulAdapter();
  unknownAdapter.nextRefund = {
    outcome: "UNKNOWN",
    providerTransactionReference: "refund-unknown",
    amount: "5000",
    currency: "KES",
    obligationId: null,
    failureCode: null,
    failureReason: null,
  };
  const unknownEnv = harness({ adapter: unknownAdapter });
  const unknownPaid = await paidTransaction(unknownEnv, actor, { key: "unk-pay" });
  const unknownRefund = await unknownEnv.refunds.requestRefund(actor, {
    paymentTransactionId: unknownPaid.payment.transaction.id,
    amount: "5000",
    reason: "Unknown",
    idempotencyKey: "unk-1",
  });
  const unknownAgain = await unknownEnv.refunds.requestRefund(actor, {
    paymentTransactionId: unknownPaid.payment.transaction.id,
    amount: "5000",
    reason: "Unknown",
    idempotencyKey: "unk-1",
  });
  let secondUnknown: string | null = null;
  try {
    await unknownEnv.refunds.requestRefund(actor, {
      paymentTransactionId: unknownPaid.payment.transaction.id,
      amount: "5000",
      reason: "Unknown retry",
      idempotencyKey: "unk-2",
    });
  } catch (error) {
    secondUnknown = error instanceof PaymentObligationError ? error.code : "other";
  }
  results.push({
    name: "tc-18:unknown-does-not-auto-retry",
    ok:
      unknownRefund.status === "UNKNOWN" &&
      unknownAgain.id === unknownRefund.id &&
      unknownEnv.adapter.refundCalls.length === 1 &&
      secondUnknown === PAYMENT_ERROR_CODES.REFUND_OUTCOME_UNKNOWN,
  });

  const sod = harness({ requiresApproval: true });
  const sodPaid = await paidTransaction(sod, actor, { key: "sod-pay" });
  const pendingApproval = await sod.refunds.requestRefund(actor, {
    paymentTransactionId: sodPaid.payment.transaction.id,
    reason: "Needs checker",
    idempotencyKey: "sod-1",
  });
  let self: string | null = null;
  try {
    await sod.refunds.approveRefund(actor, {
      refundId: pendingApproval.id,
      decision: "APPROVE",
    });
  } catch (error) {
    self = error instanceof PaymentObligationError ? error.code : "other";
  }
  const checker = ctx("biz-a", "checker-1");
  const approved = await sod.refunds.approveRefund(checker, {
    refundId: pendingApproval.id,
    decision: "APPROVE",
  });
  results.push({
    name: "tc-22:approval-required-when-configured",
    ok: pendingApproval.status === "APPROVAL_PENDING",
  });
  results.push({
    name: "tc-21:maker-checker-blocks-self-approval",
    ok: self === PAYMENT_ERROR_CODES.REFUND_SELF_APPROVAL && approved.status === "SUCCESSFUL",
  });

  const instructions = new InMemoryFinancialInstructionAdapter();
  instructions.seed({
    id: "fi-valid",
    businessId: "biz-a",
    orderId: "order-1",
    instructionType: "CANCEL",
    expectedAmount: "10000",
    currency: "KES",
    alreadyProcessed: false,
  });
  const fiEnv = harness({ instructions });
  const fiPaid = await paidTransaction(fiEnv, actor, { key: "fi-pay" });
  let invalidFi: string | null = null;
  try {
    await fiEnv.refunds.requestRefund(actor, {
      paymentTransactionId: fiPaid.payment.transaction.id,
      reason: "Bad instruction",
      financialInstructionId: "missing",
      idempotencyKey: "fi-bad",
    });
  } catch (error) {
    invalidFi = error instanceof PaymentObligationError ? error.code : "other";
  }
  const linked = await fiEnv.refunds.requestRefund(actor, {
    paymentTransactionId: fiPaid.payment.transaction.id,
    reason: "Cancel sale",
    financialInstructionId: "fi-valid",
    idempotencyKey: "fi-good",
  });
  results.push({
    name: "tc-23:invalid-financial-instruction-fails",
    ok: invalidFi === PAYMENT_ERROR_CODES.FINANCIAL_INSTRUCTION_INVALID,
  });
  results.push({
    name: "tc-24:refund-references-financial-instruction",
    ok: linked.originatingFinancialInstructionId === "fi-valid",
  });

  let cross: string | null = null;
  try {
    await full.refunds.requestRefund(ctx("biz-b"), {
      paymentTransactionId: cashPaid.payment.transaction.id,
      reason: "Cross",
      confirmManual: true,
    });
  } catch (error) {
    cross = error instanceof PaymentObligationError ? error.code : "other";
  }
  results.push({
    name: "tc-26:cross-business-refund-fails",
    ok:
      cross === PAYMENT_ERROR_CODES.CROSS_BUSINESS_ACCESS ||
      cross === PAYMENT_ERROR_CODES.TRANSACTION_NOT_FOUND,
  });

  const billed = harness({ amountDue: "50000" });
  const billedPaid = await paidTransaction(billed, actor, {
    amount: "20000",
    key: "inv-pay",
  });
  await billed.invoices.createInvoice(actor, {
    obligationId: billedPaid.obligation.id,
    paymentTermCode: "NET_30",
  });
  let invoiceOver: string | null = null;
  try {
    await billed.refunds.requestRefund(actor, {
      paymentTransactionId: billedPaid.payment.transaction.id,
      amount: "30000",
      reason: "Too much vs collected",
      idempotencyKey: "inv-over",
    });
  } catch (error) {
    invoiceOver = error instanceof PaymentObligationError ? error.code : "other";
  }
  results.push({
    name: "tc-32:invoice-cannot-refund-more-than-collected",
    ok: invoiceOver === PAYMENT_ERROR_CODES.REFUND_AMOUNT_EXCEEDS_REFUNDABLE,
  });

  const amountDueUnchanged = obligationAfter?.amountDue === "10000";
  results.push({
    name: "tc-28b:amount-due-unchanged",
    ok: amountDueUnchanged,
  });

  return results;
}

function runExternal(script: string, env: Record<string, string> = {}): SmokeResult {
  const result = spawnSync(process.execPath, ["--import", "tsx", script], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 420_000,
    env: { ...process.env, ...env },
  });
  return {
    name: `regression:${path.basename(script)}`,
    ok: result.status === 0,
    detail:
      result.status === 0
        ? undefined
        : (result.stdout || result.stderr || `exit=${result.status}`).slice(-800),
  };
}

async function main() {
  const coreResults: SmokeResult[] = [
    ...checkFiles(),
    ...staticChecks(),
    ...(await runCoreCases()),
  ];
  const regressionResults: SmokeResult[] = [];
  if (process.env.IP06_SKIP_REGRESSION !== "1") {
    const packs: Array<[string, string, Record<string, string>]> = [
      [
        "tc-36",
        "scripts/bp007-ip01-payment-obligation-foundation-smoke-validation.ts",
        { IP01_SKIP_REGRESSION: "1" },
      ],
      [
        "tc-37",
        "scripts/bp007-ip02-payment-initiation-processing-smoke-validation.ts",
        { IP02_SKIP_REGRESSION: "1" },
      ],
      [
        "tc-38",
        "scripts/bp007-ip03-partial-split-payment-allocation-smoke-validation.ts",
        { IP03_SKIP_REGRESSION: "1" },
      ],
      [
        "tc-39",
        "scripts/bp007-ip04-billing-invoicing-credit-sales-smoke-validation.ts",
        { IP04_SKIP_REGRESSION: "1" },
      ],
      [
        "tc-40",
        "scripts/bp007-ip05-receipting-payment-evidence-smoke-validation.ts",
        { IP05_SKIP_REGRESSION: "1" },
      ],
    ];
    for (const [name, script, env] of packs) {
      if (existsSync(path.join(ROOT, script))) {
        regressionResults.push({ ...runExternal(script, env), name });
      }
    }
  }
  const results = [...coreResults, ...regressionResults];
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
