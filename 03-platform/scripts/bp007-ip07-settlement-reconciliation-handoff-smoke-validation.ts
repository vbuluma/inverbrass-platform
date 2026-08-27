/**
 * Purpose:
 * Smoke-validate BP-007 / IP-07 Settlement & Reconciliation Handoff.
 *
 * Usage:
 *   npx tsx scripts/bp007-ip07-settlement-reconciliation-handoff-smoke-validation.ts
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
import { createPaymentAllocationPolicyAdapter } from "@/modules/payments/adapters/payment-allocation-policy-adapter";
import { InMemoryFinancialInstructionAdapter } from "@/modules/payments/adapters/payment-financial-instruction-adapter";
import { createPaymentSettlementPolicyAdapter } from "@/modules/payments/adapters/payment-settlement-policy-adapter";
import {
  listSourceFiles,
  scanPaymentArchitecture,
} from "@/modules/payments/architecture-scan";
import {
  PAYMENT_AUDIT_ACTIONS,
  PAYMENT_ERROR_CODES,
  PAYMENT_STATUS_CODES,
  PaymentAllocationService,
  PaymentInitiationService,
  PaymentInvoiceService,
  PaymentObligationError,
  PaymentObligationService,
  PaymentReceiptService,
  PaymentRefundService,
  PaymentSettlementService,
  ConfigurableInvoiceClock,
  SETTLEMENT_STATUS,
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
  "drizzle/0067_bp007_ip007_settlement_reconciliation_handoff.sql",
  "src/db/schema/payment-settlement.ts",
  "src/modules/payments/services/payment-settlement-service.ts",
  "src/modules/payments/services/payment-settlement-rules.ts",
  "src/modules/payments/repositories/payment-settlement-repository.ts",
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
  immediateChannel?: boolean;
}) {
  const store = new InMemoryPaymentStore();
  const fixture = defaultCatalogueFixture();
  fixture.capabilities = fixture.capabilities.map((row) => ({
    ...row,
    supportsRefund: true,
    metadata: options?.immediateChannel && row.paymentChannelId === "channel-mm-1"
      ? { settlementMode: "IMMEDIATE" }
      : row.metadata ?? null,
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
  const contract = validContract();
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
    workflow: new InProcessWorkflowAdapter({ requiresApproval: false }),
    instructions: new InMemoryFinancialInstructionAdapter(),
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
    settlements,
    refunds,
    obligations: new PaymentObligationService(shared),
    payments: new PaymentInitiationService({
      ...shared,
      transactions: store.transactionPort,
      allocations,
      policy,
      receipts,
      settlements,
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
  const settlementService = stripComments(
    readFileSync(
      path.join(ROOT, "src/modules/payments/services/payment-settlement-service.ts"),
      "utf8"
    )
  );
  const settlementRules = stripComments(
    readFileSync(
      path.join(ROOT, "src/modules/payments/services/payment-settlement-rules.ts"),
      "utf8"
    )
  );
  const combined = `${settlementService}\n${settlementRules}`;
  const ui = stripComments(
    readFileSync(
      path.join(ROOT, "src/modules/payments/components/payment-transaction-detail.tsx"),
      "utf8"
    )
  );
  const paymentsSrc = listSourceFiles(path.join(ROOT, "src/modules/payments"))
    .map((file) => stripComments(readFileSync(file, "utf8")))
    .join("\n");
  return [
    {
      name: "ac-012:no-statement-matching",
      ok:
        !/bank statement|m-pesa statement|cashbook|match by amount|match by reference|match by date/.test(
          combined
        ) && !/statement import|statement ingestion/.test(paymentsSrc),
    },
    {
      name: "ac-013:no-provider-sdk-or-http",
      ok: scan.sdkHits.length === 0 && scan.httpHits.length === 0,
      detail: [...scan.sdkHits, ...scan.httpHits].join(","),
    },
    {
      name: "ac-017:no-hard-coded-provider-rail-limits",
      ok: scan.routingHits.length === 0 && scan.limitHits.length === 0,
      detail: [...scan.routingHits, ...scan.limitHits].join(","),
    },
    {
      name: "static:no-cash-hardcode",
      ok: !/if\s*\(\s*(method|methodCode|option\.methodCode)\s*===\s*["']CASH["']/.test(
        combined
      ),
    },
    {
      name: "static:no-reconciliation-engine",
      ok: !/class\s+Reconciliation|automated reconciliation|exception resolution workflow/.test(
        combined
      ),
    },
    {
      name: "static:no-collections-or-gl",
      ok: !/collector assignment|general ledger|gl posting|revenue assurance/.test(
        combined
      ),
    },
    {
      name: "static:eng-006-boundary",
      ok: /getSettlementDetails/.test(settlementService),
    },
    {
      name: "ux:no-engine-jargon",
      ok: !/BP-007|IP-07|ENG-006|ENG-008/.test(ui),
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

  const env = harness();
  const paid = await paidTransaction(env, actor, { key: "mm-pay" });
  const pending = await env.settlements.getByTransaction(
    actor,
    paid.payment.transaction.id
  );
  const paymentAfterPending = await env.store.transactionPort.findById(
    actor.businessId,
    paid.payment.transaction.id
  );
  results.push({
    name: "ac-001:successful-electronic-settlement-pending",
    ok:
      paid.payment.transaction.status === PAYMENT_STATUS_CODES.SUCCESSFUL &&
      pending?.settlementStatus === SETTLEMENT_STATUS.SETTLEMENT_PENDING &&
      paymentAfterPending?.status === PAYMENT_STATUS_CODES.SUCCESSFUL,
  });

  const received = await env.settlements.applyProviderSettlement(actor, {
    paymentTransactionId: paid.payment.transaction.id,
    receivedAmount: "9950",
    expectedAmount: "10000",
    currency: "KES",
    settlementReference: "SET-1",
    settlementBatchReference: "BATCH-1",
    settlementStatus: "RECEIVED",
    settlementDate: "2026-08-26T10:00:00.000Z",
  });
  const paymentAfterReceived = await env.store.transactionPort.findById(
    actor.businessId,
    paid.payment.transaction.id
  );
  const obligationAfterReceived = await env.store.findById(
    actor.businessId,
    paid.obligation.id
  );
  results.push({
    name: "ac-002:received-does-not-change-payment-successful",
    ok:
      received.settlementStatus === SETTLEMENT_STATUS.SETTLEMENT_RECEIVED &&
      paymentAfterReceived?.status === PAYMENT_STATUS_CODES.SUCCESSFUL,
  });
  results.push({
    name: "ac-004:expected-and-actual-stored-separately",
    ok: received.expectedAmount === "10000" && received.receivedAmount === "9950",
  });
  results.push({
    name: "ac-005:variance-without-changing-amount-due",
    ok:
      received.varianceAmount === "-50" &&
      obligationAfterReceived?.amountDue === "10000" &&
      paymentAfterReceived?.amount === "10000",
  });
  results.push({
    name: "ac-006:settlement-and-batch-reference-persisted",
    ok:
      received.settlementReference === "SET-1" &&
      received.settlementBatchReference === "BATCH-1",
  });
  results.push({
    name: "ac-009:exception-flagged-without-reconciliation",
    ok: received.exceptionFlag === true && received.varianceAmount === "-50",
  });

  const duplicate = await env.settlements.applyProviderSettlement(actor, {
    paymentTransactionId: paid.payment.transaction.id,
    receivedAmount: "9950",
    currency: "KES",
    settlementReference: "SET-1",
    settlementBatchReference: "BATCH-1",
    settlementStatus: "RECEIVED",
  });
  results.push({
    name: "ac-007:duplicate-settlement-idempotent",
    ok: duplicate.id === received.id && env.store.settlements.size === 1,
  });

  let conflict: string | null = null;
  try {
    await env.settlements.applyProviderSettlement(actor, {
      paymentTransactionId: paid.payment.transaction.id,
      receivedAmount: "10000",
      currency: "KES",
      settlementReference: "SET-1",
      settlementBatchReference: "BATCH-1",
      settlementStatus: "RECEIVED",
    });
  } catch (error) {
    conflict = error instanceof PaymentObligationError ? error.code : "other";
  }
  const afterConflict = await env.settlements.getByTransaction(
    actor,
    paid.payment.transaction.id
  );
  results.push({
    name: "ac-008:conflicting-duplicate-fails-closed",
    ok:
      conflict === PAYMENT_ERROR_CODES.SETTLEMENT_CONFLICT &&
      afterConflict?.receivedAmount === "9950",
  });

  const exceptionPayment = await env.store.transactionPort.findById(
    actor.businessId,
    paid.payment.transaction.id
  );
  results.push({
    name: "tc:exception-keeps-payment-successful",
    ok: exceptionPayment?.status === PAYMENT_STATUS_CODES.SUCCESSFUL,
  });

  const confirmEnv = harness();
  const confirmPaid = await paidTransaction(confirmEnv, actor, { key: "confirm-pay" });
  await confirmEnv.settlements.applyProviderSettlement(actor, {
    paymentTransactionId: confirmPaid.payment.transaction.id,
    receivedAmount: "10000",
    currency: "KES",
    settlementReference: "SET-OK",
    settlementStatus: "RECEIVED",
  });
  const confirmedRow = await confirmEnv.settlements.getByTransaction(
    actor,
    confirmPaid.payment.transaction.id
  );
  const confirmed = await confirmEnv.settlements.confirmSettlement(
    actor,
    confirmedRow!.id
  );
  const paymentAfterConfirmed = await confirmEnv.store.transactionPort.findById(
    actor.businessId,
    confirmPaid.payment.transaction.id
  );
  results.push({
    name: "ac-003:confirmed-does-not-change-payment-successful",
    ok:
      confirmed.settlementStatus === SETTLEMENT_STATUS.SETTLEMENT_CONFIRMED &&
      paymentAfterConfirmed?.status === PAYMENT_STATUS_CODES.SUCCESSFUL,
  });

  const cashEnv = harness();
  const cashPaid = await paidTransaction(cashEnv, actor, {
    methodId: "method-cash",
    confirmManual: true,
    key: "cash-pay",
  });
  const cashSettlement = await cashEnv.settlements.getByTransaction(
    actor,
    cashPaid.payment.transaction.id
  );
  results.push({
    name: "ac-010:cash-not-applicable-via-config",
    ok: cashSettlement?.settlementStatus === SETTLEMENT_STATUS.NOT_APPLICABLE,
  });

  const immediateEnv = harness({ immediateChannel: true });
  const immediatePaid = await paidTransaction(immediateEnv, actor, { key: "imm-pay" });
  const immediateSettlement = await immediateEnv.settlements.getByTransaction(
    actor,
    immediatePaid.payment.transaction.id
  );
  results.push({
    name: "ac-010b:immediate-mode-via-capability-metadata",
    ok:
      immediateSettlement?.settlementStatus === SETTLEMENT_STATUS.SETTLEMENT_CONFIRMED &&
      immediateSettlement.receivedAmount === "10000" &&
      immediatePaid.payment.transaction.status === PAYMENT_STATUS_CODES.SUCCESSFUL,
  });

  const handoff = await env.settlements.getReconciliationHandoff(
    actor,
    paid.payment.transaction.id
  );
  results.push({
    name: "ac-011:eng-008-handoff-payload",
    ok:
      handoff.businessId === actor.businessId &&
      handoff.paymentTransactionId === paid.payment.transaction.id &&
      handoff.expectedSettlementAmount === "10000" &&
      handoff.actualSettlementAmount === "9950" &&
      handoff.settlementVariance === "-50" &&
      handoff.exceptionFlag === true &&
      handoff.settlementReference === "SET-1",
  });

  let cross: string | null = null;
  try {
    await env.settlements.getByTransaction(ctx("biz-b"), paid.payment.transaction.id);
  } catch (error) {
    cross = error instanceof PaymentObligationError ? error.code : "other";
  }
  let crossUpdate: string | null = null;
  try {
    await env.settlements.applyProviderSettlement(ctx("biz-b"), {
      paymentTransactionId: paid.payment.transaction.id,
      receivedAmount: "9950",
      settlementReference: "SET-X",
    });
  } catch (error) {
    crossUpdate = error instanceof PaymentObligationError ? error.code : "other";
  }
  let crossHandoff: string | null = null;
  try {
    await env.settlements.getReconciliationHandoff(
      ctx("biz-b"),
      paid.payment.transaction.id
    );
  } catch (error) {
    crossHandoff = error instanceof PaymentObligationError ? error.code : "other";
  }
  results.push({
    name: "ac-014:cross-tenant-fails-closed",
    ok:
      (cross === PAYMENT_ERROR_CODES.CROSS_BUSINESS_ACCESS ||
        cross === PAYMENT_ERROR_CODES.TRANSACTION_NOT_FOUND) &&
      (crossUpdate === PAYMENT_ERROR_CODES.CROSS_BUSINESS_ACCESS ||
        crossUpdate === PAYMENT_ERROR_CODES.TRANSACTION_NOT_FOUND) &&
      (crossHandoff === PAYMENT_ERROR_CODES.CROSS_BUSINESS_ACCESS ||
        crossHandoff === PAYMENT_ERROR_CODES.TRANSACTION_NOT_FOUND),
  });

  const audited = env.audit.entries.filter(
    (row) =>
      row.action === PAYMENT_AUDIT_ACTIONS.SETTLEMENT_CREATED ||
      row.action === PAYMENT_AUDIT_ACTIONS.SETTLEMENT_PENDING ||
      row.action === PAYMENT_AUDIT_ACTIONS.SETTLEMENT_RECEIVED ||
      row.action === PAYMENT_AUDIT_ACTIONS.SETTLEMENT_EXCEPTION
  );
  results.push({
    name: "ac-015:settlement-events-audited",
    ok:
      audited.some((row) => row.action === PAYMENT_AUDIT_ACTIONS.SETTLEMENT_CREATED) &&
      audited.some((row) => row.action === PAYMENT_AUDIT_ACTIONS.SETTLEMENT_RECEIVED) &&
      audited.some((row) => row.action === PAYMENT_AUDIT_ACTIONS.SETTLEMENT_EXCEPTION) &&
      audited.every((row) => row.businessId === actor.businessId && row.settlementId),
  });

  const refundEnv = harness();
  const refundPaid = await paidTransaction(refundEnv, actor, { key: "refund-pay" });
  await refundEnv.settlements.applyProviderSettlement(actor, {
    paymentTransactionId: refundPaid.payment.transaction.id,
    receivedAmount: "10000",
    currency: "KES",
    settlementReference: "SET-FULL",
    settlementStatus: "RECEIVED",
  });
  const toConfirm = await refundEnv.settlements.getByTransaction(
    actor,
    refundPaid.payment.transaction.id
  );
  await refundEnv.settlements.confirmSettlement(actor, toConfirm!.id);
  await refundEnv.refunds.requestRefund(actor, {
    paymentTransactionId: refundPaid.payment.transaction.id,
    amount: "3000",
    reason: "Partial return",
    idempotencyKey: "refund-partial",
  });
  const settlementAfterRefund = await refundEnv.settlements.getByTransaction(
    actor,
    refundPaid.payment.transaction.id
  );
  const originalPayment = await refundEnv.store.transactionPort.findById(
    actor.businessId,
    refundPaid.payment.transaction.id
  );
  const handoffAfterRefund = await refundEnv.settlements.getReconciliationHandoff(
    actor,
    refundPaid.payment.transaction.id
  );
  results.push({
    name: "ac-016:refund-does-not-overwrite-settlement",
    ok:
      settlementAfterRefund?.expectedAmount === "10000" &&
      settlementAfterRefund?.receivedAmount === "10000" &&
      settlementAfterRefund?.settlementStatus === SETTLEMENT_STATUS.SETTLEMENT_CONFIRMED &&
      originalPayment?.status === PAYMENT_STATUS_CODES.SUCCESSFUL &&
      originalPayment?.amount === "10000" &&
      handoffAfterRefund.refunds.some((row) => row.amount === "3000"),
  });

  const engineEnv = harness();
  engineEnv.adapter.nextSettlement = {
    settlementStatus: "RECEIVED",
    expectedAmount: "10000",
    receivedAmount: "10000",
    currency: "KES",
    settlementReference: "ENG-SET-1",
    settlementBatchReference: "ENG-BATCH-1",
    settlementDate: "2026-08-26T12:00:00.000Z",
  };
  const enginePaid = await paidTransaction(engineEnv, actor, { key: "eng-pay" });
  const fromEngine = await engineEnv.settlements.refreshFromEngine(
    actor,
    enginePaid.payment.transaction.id
  );
  results.push({
    name: "tc:eng-006-normalized-settlement",
    ok:
      fromEngine.settlementStatus === SETTLEMENT_STATUS.SETTLEMENT_RECEIVED &&
      fromEngine.settlementReference === "ENG-SET-1" &&
      engineEnv.adapter.settlementCalls.length === 1 &&
      enginePaid.payment.transaction.status === PAYMENT_STATUS_CODES.SUCCESSFUL,
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
  if (process.env.IP07_SKIP_REGRESSION !== "1") {
    const packs: Array<[string, string, Record<string, string>]> = [
      [
        "ac-018-ip01",
        "scripts/bp007-ip01-payment-obligation-foundation-smoke-validation.ts",
        { IP01_SKIP_REGRESSION: "1" },
      ],
      [
        "ac-018-ip02",
        "scripts/bp007-ip02-payment-initiation-processing-smoke-validation.ts",
        { IP02_SKIP_REGRESSION: "1" },
      ],
      [
        "ac-018-ip03",
        "scripts/bp007-ip03-partial-split-payment-allocation-smoke-validation.ts",
        { IP03_SKIP_REGRESSION: "1" },
      ],
      [
        "ac-018-ip04",
        "scripts/bp007-ip04-billing-invoicing-credit-sales-smoke-validation.ts",
        { IP04_SKIP_REGRESSION: "1" },
      ],
      [
        "ac-018-ip05",
        "scripts/bp007-ip05-receipting-payment-evidence-smoke-validation.ts",
        { IP05_SKIP_REGRESSION: "1" },
      ],
      [
        "ac-018-ip06",
        "scripts/bp007-ip06-refunds-reversals-adjustments-smoke-validation.ts",
        { IP06_SKIP_REGRESSION: "1" },
      ],
    ];
    for (const [name, script, env] of packs) {
      if (existsSync(path.join(ROOT, script))) {
        regressionResults.push({ ...runExternal(script, env), name });
      }
    }
    const bp006 = "scripts/bp006-ip05-downstream-handoff-sales-workspace-smoke-validation.ts";
    if (existsSync(path.join(ROOT, bp006))) {
      regressionResults.push(runExternal(bp006));
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
