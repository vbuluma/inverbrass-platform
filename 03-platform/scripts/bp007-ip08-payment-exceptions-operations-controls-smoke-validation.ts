/**
 * Purpose:
 * Smoke-validate BP-007 / IP-08 Payment Exceptions, Operations & Controls.
 *
 * Usage:
 *   npx tsx scripts/bp007-ip08-payment-exceptions-operations-controls-smoke-validation.ts
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
import { ConfigurablePaymentExceptionPolicy } from "@/modules/payments/adapters/payment-exception-policy-adapter";
import { createPaymentSettlementPolicyAdapter } from "@/modules/payments/adapters/payment-settlement-policy-adapter";
import {
  listSourceFiles,
  scanPaymentArchitecture,
} from "@/modules/payments/architecture-scan";
import {
  PAYMENT_AUDIT_ACTIONS,
  PAYMENT_ERROR_CODES,
  PAYMENT_EXCEPTION_RESOLUTION_CODES,
  PAYMENT_EXCEPTION_STATUSES,
  PAYMENT_EXCEPTION_TYPES,
  PAYMENT_STATUS_CODES,
  PaymentAllocationService,
  PaymentExceptionService,
  PaymentInitiationService,
  PaymentObligationError,
  PaymentObligationService,
  PaymentReceiptService,
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

const ROOT = path.resolve(__dirname, "..");

type SmokeResult = { name: string; ok: boolean; detail?: string };

const REQUIRED_FILES = [
  "drizzle/0068_bp007_ip008_payment_exceptions_operations_controls.sql",
  "src/db/schema/payment-exception.ts",
  "src/modules/payments/services/payment-exception-service.ts",
  "src/modules/payments/services/payment-exception-rules.ts",
  "src/modules/payments/repositories/payment-exception-repository.ts",
  "src/modules/payments/components/payment-exceptions-workspace.tsx",
  "scripts/bp007-ip08-payment-exceptions-operations-controls-smoke-validation.ts",
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

function outcome(
  kind: string,
  extra?: Record<string, string | null>
): ScriptedPaymentInitiationAdapter["nextInitiate"] {
  return (input) => ({
    outcome: kind as "PENDING",
    providerTransactionReference: extra?.ref ?? `prov-${input.paymentTransactionId}`,
    amount: extra?.amount ?? input.amount,
    currency: extra?.currency ?? input.currency,
    obligationId: extra?.obligationId ?? input.obligationId,
    failureCode: extra?.failureCode ?? null,
    failureReason: extra?.failureReason ?? null,
  });
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

function harness(options?: {
  adapter?: ScriptedPaymentInitiationAdapter;
  pendingTimeoutMs?: number;
  requiresApproval?: boolean;
}) {
  const store = new InMemoryPaymentStore();
  const fixture = defaultCatalogueFixture();
  store.seedCatalogue(fixture);
  const audit = new RecordingPaymentAudit();
  const adapter = options?.adapter ?? new ScriptedPaymentInitiationAdapter();
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
      options?.pendingTimeoutMs ?? 15 * 60 * 1000,
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
    obligations: new PaymentObligationService(shared),
  };
}

async function createDue(env: ReturnType<typeof harness>, actor: CurrentBusinessContext) {
  return env.obligations.createObligation(actor, { orderId: "order-1" });
}

async function initiate(
  env: ReturnType<typeof harness>,
  actor: CurrentBusinessContext,
  input?: { key?: string; amount?: string; methodId?: string }
) {
  const obligation = await createDue(env, actor);
  const payment = await env.payments.initiatePayment(actor, {
    obligationId: obligation.id,
    methodId: input?.methodId ?? "method-mm",
    amount: input?.amount ?? "10000",
    currency: "KES",
    idempotencyKey: input?.key ?? crypto.randomUUID(),
  });
  return { obligation, payment };
}

function codeOf(error: unknown) {
  return error instanceof PaymentObligationError ? error.code : "other";
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
  const exceptionService = stripComments(
    readFileSync(
      path.join(ROOT, "src/modules/payments/services/payment-exception-service.ts"),
      "utf8"
    )
  );
  const exceptionRules = stripComments(
    readFileSync(
      path.join(ROOT, "src/modules/payments/services/payment-exception-rules.ts"),
      "utf8"
    )
  );
  const initiation = stripComments(
    readFileSync(
      path.join(ROOT, "src/modules/payments/services/payment-initiation-service.ts"),
      "utf8"
    )
  );
  const workspace = stripComments(
    readFileSync(
      path.join(ROOT, "src/modules/payments/components/payment-exceptions-workspace.tsx"),
      "utf8"
    )
  );
  const detail = stripComments(
    readFileSync(
      path.join(ROOT, "src/modules/payments/components/payment-transaction-detail.tsx"),
      "utf8"
    )
  );
  const opsDetail = stripComments(
    readFileSync(
      path.join(ROOT, "src/modules/payments/components/payment-exception-detail.tsx"),
      "utf8"
    )
  );
  const paymentsSrc = listSourceFiles(path.join(ROOT, "src/modules/payments"))
    .filter((file) => {
      const rel = file.replace(/\\/g, "/");
      return (
        !rel.includes("/services/payment-memory-store.ts") &&
        !rel.includes("/architecture-scan.ts")
      );
    })
    .map((file) => stripComments(readFileSync(file, "utf8")))
    .join("\n");
  const combinedOps = `${exceptionService}\n${exceptionRules}`;
  return [
    {
      name: "tc-31:no-provider-sdk",
      ok: scan.sdkHits.length === 0,
      detail: scan.sdkHits.join(","),
    },
    {
      name: "tc-32:no-direct-provider-http",
      ok: scan.httpHits.length === 0,
      detail: scan.httpHits.join(","),
    },
    {
      name: "tc-33:no-hard-coded-provider-names",
      ok:
        !/if\s*\(\s*(provider|providerId|providerCode)\s*===\s*["'](SAFARICOM|AIRTEL|EQUITY|KCB)/.test(
          combinedOps
        ) &&
        !/if\s*\(\s*rail\s*===\s*["']MPESA["']/.test(combinedOps) &&
        scan.routingHits.length === 0,
      detail: scan.routingHits.join(","),
    },
    {
      name: "tc-34:no-hard-coded-provider-limits",
      ok: scan.limitHits.length === 0 && !/MAX_STK_AMOUNT|STK_MAX|150000/.test(combinedOps),
      detail: scan.limitHits.join(","),
    },
    {
      name: "tc-35:no-commercial-recalculation",
      ok:
        !/expectedPayable|amountDue\s*=/.test(combinedOps) &&
        !/grandTotal|lineTotal/.test(combinedOps),
    },
    {
      name: "tc-36:no-collections-dunning",
      ok: !/dunning|debt recovery|collector assignment|collections engine/.test(paymentsSrc),
    },
    {
      name: "tc-37:no-statement-matching",
      ok: !/bank statement|m-pesa statement|cashbook|statement import|match by amount/.test(
        combinedOps
      ),
    },
    {
      name: "tc-38:no-new-catalogue-entities",
      ok: !/insertMethod|createProvider|new payment rail/.test(combinedOps),
    },
    {
      name: "static:query-through-eng-006",
      ok: /queryPayment|refreshPaymentStatus/.test(exceptionService),
    },
    {
      name: "static:no-direct-paid-mutation",
      ok: !/paidAmount\s*=/.test(combinedOps) && !/obligation\.paid/.test(combinedOps),
    },
    {
      name: "static:unknown-blocks-initiation",
      ok: /PAYMENT_UNKNOWN/.test(initiation),
    },
    {
      name: "ux:customer-language",
      ok:
        !/BP-007|IP-08|ENG-006|ENG-013|adapter/.test(`${workspace}\n${detail}`) &&
        !/ENG-006|BP-007|IP-08/.test(opsDetail),
    },
  ];
}

async function runCoreCases(): Promise<SmokeResult[]> {
  const results: SmokeResult[] = [];
  const actor = ctx("biz-a");

  const pendingEnv = harness();
  pendingEnv.adapter.nextInitiate = outcome("PENDING");
  const pending = await initiate(pendingEnv, actor, { key: "pending-1" });
  const pendingRows = await pendingEnv.exceptions.listForTransaction(
    actor,
    pending.payment.transaction.id
  );
  results.push({
    name: "tc-01:pending-remains-pending",
    ok:
      pending.payment.transaction.status === PAYMENT_STATUS_CODES.PENDING &&
      pendingRows.length === 0,
  });

  const timeoutEnv = harness({ pendingTimeoutMs: 0 });
  timeoutEnv.adapter.nextInitiate = outcome("PENDING");
  const timed = await initiate(timeoutEnv, actor, { key: "timeout-1" });
  const timeoutException = await timeoutEnv.exceptions.evaluatePending(
    actor,
    timed.payment.transaction.id
  );
  const stillPending = await timeoutEnv.store.transactionPort.findById(
    actor.businessId,
    timed.payment.transaction.id
  );
  results.push({
    name: "tc-02:pending-timeout-creates-exception",
    ok:
      timeoutException?.exceptionType === PAYMENT_EXCEPTION_TYPES.PAYMENT_TIMEOUT &&
      stillPending?.status === PAYMENT_STATUS_CODES.PENDING,
  });

  const unknownEnv = harness();
  unknownEnv.adapter.nextInitiate = outcome("UNKNOWN");
  const unknown = await initiate(unknownEnv, actor, { key: "unknown-1" });
  const unknownRows = await unknownEnv.exceptions.listForTransaction(
    actor,
    unknown.payment.transaction.id
  );
  results.push({
    name: "tc-03:unknown-creates-exception",
    ok:
      unknown.payment.transaction.status === PAYMENT_STATUS_CODES.UNKNOWN &&
      unknownRows.some((row) => row.exceptionType === PAYMENT_EXCEPTION_TYPES.PAYMENT_UNKNOWN),
  });

  const retryUnknown = await unknownEnv.exceptions.canRetry(
    actor,
    unknown.payment.transaction.id
  );
  let retryUnknownCode: string | null = null;
  try {
    await unknownEnv.exceptions.retryPayment(actor, unknown.payment.transaction.id);
  } catch (error) {
    retryUnknownCode = codeOf(error);
  }
  results.push({
    name: "tc-04:unknown-cannot-retry",
    ok: retryUnknown.allowed === false && retryUnknownCode === PAYMENT_ERROR_CODES.EXCEPTION_RETRY_NOT_ALLOWED,
  });

  let bypassCode: string | null = null;
  try {
    await unknownEnv.payments.initiatePayment(actor, {
      obligationId: unknown.obligation.id,
      methodId: "method-mm",
      amount: "10000",
      currency: "KES",
      idempotencyKey: "new-key-bypass",
    });
  } catch (error) {
    bypassCode = codeOf(error);
  }
  results.push({
    name: "tc-05:unknown-blocks-new-idempotency-key",
    ok: bypassCode === PAYMENT_ERROR_CODES.PAYMENT_UNKNOWN,
  });

  const querySuccessEnv = harness();
  querySuccessEnv.adapter.nextInitiate = outcome("UNKNOWN");
  querySuccessEnv.adapter.nextQuery = (input) => ({
    outcome: "SUCCESSFUL",
    providerTransactionReference: input.providerTransactionReference,
    amount: "10000",
    currency: "KES",
    obligationId: null,
    failureCode: null,
    failureReason: null,
  });
  const querySuccess = await initiate(querySuccessEnv, actor, { key: "query-ok" });
  const afterQueryOk = await querySuccessEnv.exceptions.queryProvider(
    actor,
    querySuccess.payment.transaction.id
  );
  results.push({
    name: "tc-06:query-unknown-to-successful",
    ok:
      afterQueryOk?.paymentStatus === PAYMENT_STATUS_CODES.SUCCESSFUL &&
      afterQueryOk.status === PAYMENT_EXCEPTION_STATUSES.RESOLVED,
  });

  const queryFailEnv = harness();
  queryFailEnv.adapter.nextInitiate = outcome("UNKNOWN");
  queryFailEnv.adapter.nextQuery = {
    outcome: "FAILED",
    providerTransactionReference: "fail-ref",
    amount: null,
    currency: null,
    obligationId: null,
    failureCode: "PROVIDER_DECLINED",
    failureReason: "Declined",
  };
  const queryFail = await initiate(queryFailEnv, actor, { key: "query-fail" });
  const afterQueryFail = await queryFailEnv.exceptions.queryProvider(
    actor,
    queryFail.payment.transaction.id
  );
  results.push({
    name: "tc-07:query-unknown-to-failed",
    ok:
      afterQueryFail?.paymentStatus === PAYMENT_STATUS_CODES.FAILED &&
      afterQueryFail.status === PAYMENT_EXCEPTION_STATUSES.RESOLVED,
  });

  const stillUnknownEnv = harness();
  stillUnknownEnv.adapter.nextInitiate = outcome("UNKNOWN");
  stillUnknownEnv.adapter.nextQuery = {
    outcome: "UNKNOWN",
    providerTransactionReference: null,
    amount: null,
    currency: null,
    obligationId: null,
    failureCode: null,
    failureReason: null,
  };
  const stillUnknown = await initiate(stillUnknownEnv, actor, { key: "still-unknown" });
  const afterStillUnknown = await stillUnknownEnv.exceptions.queryProvider(
    actor,
    stillUnknown.payment.transaction.id
  );
  results.push({
    name: "tc-08:unknown-query-stays-unresolved",
    ok:
      afterStillUnknown?.paymentStatus === PAYMENT_STATUS_CODES.UNKNOWN &&
      afterStillUnknown.status !== PAYMENT_EXCEPTION_STATUSES.RESOLVED,
  });

  const amountEnv = harness();
  amountEnv.adapter.nextInitiate = outcome("SUCCESSFUL", { amount: "9500" });
  const amountMismatch = await initiate(amountEnv, actor, { key: "amt-mismatch" });
  const amountRows = await amountEnv.exceptions.listForTransaction(
    actor,
    amountMismatch.payment.transaction.id
  );
  results.push({
    name: "tc-09:callback-amount-mismatch",
    ok:
      amountMismatch.payment.transaction.status !== PAYMENT_STATUS_CODES.SUCCESSFUL &&
      amountRows.some(
        (row) => row.exceptionType === PAYMENT_EXCEPTION_TYPES.CALLBACK_AMOUNT_MISMATCH
      ),
  });

  const currencyEnv = harness();
  currencyEnv.adapter.nextInitiate = outcome("SUCCESSFUL", { currency: "USD" });
  const currencyMismatch = await initiate(currencyEnv, actor, { key: "ccy-mismatch" });
  const currencyRows = await currencyEnv.exceptions.listForTransaction(
    actor,
    currencyMismatch.payment.transaction.id
  );
  results.push({
    name: "tc-10:callback-currency-mismatch",
    ok: currencyRows.some(
      (row) => row.exceptionType === PAYMENT_EXCEPTION_TYPES.CALLBACK_CURRENCY_MISMATCH
    ),
  });

  const obligationEnv = harness();
  obligationEnv.adapter.nextInitiate = outcome("SUCCESSFUL", {
    obligationId: "other-obligation",
  });
  const obligationMismatch = await initiate(obligationEnv, actor, { key: "ob-mismatch" });
  const obligationRows = await obligationEnv.exceptions.listForTransaction(
    actor,
    obligationMismatch.payment.transaction.id
  );
  results.push({
    name: "tc-11:callback-obligation-mismatch",
    ok: obligationRows.some(
      (row) => row.exceptionType === PAYMENT_EXCEPTION_TYPES.CALLBACK_OBLIGATION_MISMATCH
    ),
  });

  const allocations = await amountEnv.store.allocationPort.listByObligation(
    actor.businessId,
    amountMismatch.obligation.id
  );
  const refreshedObligation = await amountEnv.store.findById(
    actor.businessId,
    amountMismatch.obligation.id
  );
  results.push({
    name: "tc-12:mismatch-does-not-allocate",
    ok: allocations.length === 0 && refreshedObligation?.paidAmount === "0",
  });

  const idempotentEnv = harness();
  idempotentEnv.adapter.nextInitiate = outcome("SUCCESSFUL", { ref: "same-ref" });
  const first = await initiate(idempotentEnv, actor, { key: "dup-same" });
  const secondApply = await idempotentEnv.payments.applyProviderOutcome(actor, {
    paymentTransactionId: first.payment.transaction.id,
    outcome: {
      outcome: "SUCCESSFUL",
      providerTransactionReference: "same-ref",
      amount: "10000",
      currency: "KES",
      obligationId: first.obligation.id,
    },
  });
  const txnCount = await idempotentEnv.store.transactionPort.countAll(actor.businessId);
  results.push({
    name: "tc-13:duplicate-ref-same-transaction-idempotent",
    ok:
      secondApply.transaction.id === first.payment.transaction.id &&
      txnCount === 1 &&
      secondApply.transaction.status === PAYMENT_STATUS_CODES.SUCCESSFUL,
  });

  const conflictEnv = harness();
  conflictEnv.adapter.nextInitiate = outcome("PENDING", { ref: "shared-ref" });
  const firstPending = await initiate(conflictEnv, actor, { key: "conflict-a" });
  conflictEnv.adapter.nextInitiate = outcome("PENDING", { ref: "other-ref" });
  const secondPending = await conflictEnv.payments.initiatePayment(actor, {
    obligationId: firstPending.obligation.id,
    methodId: "method-mm",
    amount: "10000",
    currency: "KES",
    idempotencyKey: "conflict-b",
  });
  let conflictCode: string | null = null;
  try {
    await conflictEnv.payments.applyProviderOutcome(actor, {
      paymentTransactionId: secondPending.transaction.id,
      outcome: {
        outcome: "SUCCESSFUL",
        providerTransactionReference: "shared-ref",
        amount: "10000",
        currency: "KES",
      },
    });
  } catch (error) {
    conflictCode = codeOf(error);
  }
  const conflictRows = await conflictEnv.exceptions.listForTransaction(
    actor,
    secondPending.transaction.id
  );
  results.push({
    name: "tc-14:conflicting-provider-reference",
    ok:
      conflictCode === PAYMENT_ERROR_CODES.PAYMENT_DUPLICATE &&
      conflictRows.some(
        (row) => row.exceptionType === PAYMENT_EXCEPTION_TYPES.DUPLICATE_PROVIDER_REFERENCE
      ),
  });

  const failedEnv = harness();
  failedEnv.adapter.nextInitiate = outcome("FAILED", { failureCode: "DECLINED" });
  const failed = await initiate(failedEnv, actor, { key: "explicit-fail" });
  const failedRows = await failedEnv.exceptions.listForTransaction(
    actor,
    failed.payment.transaction.id
  );
  results.push({
    name: "tc-15:explicit-failed-no-unnecessary-exception",
    ok:
      failed.payment.transaction.status === PAYMENT_STATUS_CODES.FAILED &&
      failedRows.length === 0,
  });

  const retryEnv = harness();
  retryEnv.adapter.nextInitiate = outcome("NOT_ACCEPTED");
  retryEnv.adapter.nextQuery = {
    outcome: "NOT_ACCEPTED",
    providerTransactionReference: null,
    amount: null,
    currency: null,
    obligationId: null,
    failureCode: null,
    failureReason: null,
  };
  const notAccepted = await initiate(retryEnv, actor, { key: "not-accepted" });
  const canRetry = await retryEnv.exceptions.canRetry(
    actor,
    notAccepted.payment.transaction.id
  );
  retryEnv.adapter.nextInitiate = outcome("SUCCESSFUL");
  const retried = await retryEnv.exceptions.retryPayment(
    actor,
    notAccepted.payment.transaction.id,
    "retry-1"
  );
  results.push({
    name: "tc-16:safe-retry-not-accepted",
    ok:
      canRetry.allowed &&
      retried.transaction.id !== notAccepted.payment.transaction.id &&
      retryEnv.audit.entries.some(
        (row) => row.action === PAYMENT_AUDIT_ACTIONS.PAYMENT_EXCEPTION_RETRY_APPROVED
      ),
  });

  results.push({
    name: "tc-17:retry-blocked-unknown",
    ok: retryUnknown.allowed === false,
  });

  const pendingRetry = await pendingEnv.exceptions.canRetry(
    actor,
    pending.payment.transaction.id
  );
  results.push({
    name: "tc-18:retry-blocked-pending",
    ok: pendingRetry.allowed === false,
  });

  const resolveEnv = harness();
  resolveEnv.adapter.nextInitiate = outcome("UNKNOWN");
  const toResolve = await initiate(resolveEnv, actor, { key: "manual-success" });
  const openRow = (
    await resolveEnv.exceptions.listForTransaction(actor, toResolve.payment.transaction.id)
  )[0];
  const beforePaid = await resolveEnv.store.findById(actor.businessId, toResolve.obligation.id);
  const resolved = await resolveEnv.exceptions.resolve(actor, {
    exceptionId: openRow.id,
    resolutionCode: PAYMENT_EXCEPTION_RESOLUTION_CODES.CONFIRMED_SUCCESS,
    notes: "Confirmed with customer evidence",
    evidence: "call-ref-1",
  });
  const afterPaid = await resolveEnv.store.findById(actor.businessId, toResolve.obligation.id);
  const allocated = await resolveEnv.store.allocationPort.listByTransaction(
    actor.businessId,
    toResolve.payment.transaction.id
  );
  const receipt = await resolveEnv.store.receiptPort.findByTransaction(
    actor.businessId,
    toResolve.payment.transaction.id
  );
  results.push({
    name: "tc-19:manual-success-uses-lifecycle",
    ok:
      resolved.paymentStatus === PAYMENT_STATUS_CODES.SUCCESSFUL &&
      resolved.status === PAYMENT_EXCEPTION_STATUSES.RESOLVED,
  });
  results.push({
    name: "tc-20:no-direct-obligation-paid-edit",
    ok:
      beforePaid?.paidAmount === "0" &&
      afterPaid?.paidAmount === "10000" &&
      !/paidAmount\s*=/.test(
        stripComments(
          readFileSync(
            path.join(ROOT, "src/modules/payments/services/payment-exception-service.ts"),
            "utf8"
          )
        )
      ),
  });
  results.push({
    name: "tc-21:successful-resolution-allocates",
    ok: allocated.length === 1 && allocated[0]?.allocatedAmount === "10000",
  });
  results.push({
    name: "tc-22:receipt-governed-by-ip05",
    ok: receipt?.status === "ISSUED",
  });

  const settlementEnv = harness();
  settlementEnv.adapter.nextInitiate = outcome("SUCCESSFUL");
  const settledPay = await initiate(settlementEnv, actor, { key: "settle-1" });
  await settlementEnv.settlements.applyProviderSettlement(actor, {
    paymentTransactionId: settledPay.payment.transaction.id,
    receivedAmount: "9950",
    currency: "KES",
    settlementReference: "SET-VAR",
  });
  const surfaced = await settlementEnv.exceptions.surfaceSettlementException(
    actor,
    settledPay.payment.transaction.id
  );
  results.push({
    name: "tc-23:settlement-exception-surfaced",
    ok: surfaced?.exceptionType === PAYMENT_EXCEPTION_TYPES.SETTLEMENT_VARIANCE,
  });
  results.push({
    name: "tc-24:no-settlement-matching",
    ok: !/match by reference|statement import|cashbook/.test(
      stripComments(
        readFileSync(
          path.join(ROOT, "src/modules/payments/services/payment-exception-service.ts"),
          "utf8"
        )
      )
    ),
  });

  const sodEnv = harness({ requiresApproval: true });
  sodEnv.adapter.nextInitiate = outcome("UNKNOWN");
  const sodPay = await initiate(sodEnv, actor, { key: "sod-1" });
  const sodException = (
    await sodEnv.exceptions.listForTransaction(actor, sodPay.payment.transaction.id)
  )[0];
  const pendingDecision = await sodEnv.exceptions.resolve(actor, {
    exceptionId: sodException.id,
    resolutionCode: PAYMENT_EXCEPTION_RESOLUTION_CODES.CONFIRMED_SUCCESS,
  });
  let selfApprove: string | null = null;
  try {
    await sodEnv.exceptions.approve(actor, {
      exceptionId: sodException.id,
      decision: "APPROVE",
    });
  } catch (error) {
    selfApprove = codeOf(error);
  }
  results.push({
    name: "tc-25:maker-cannot-self-approve",
    ok:
      pendingDecision.approvalStatus === "PENDING" &&
      selfApprove === PAYMENT_ERROR_CODES.EXCEPTION_SELF_APPROVAL,
  });

  const checker = ctx("biz-a", "checker-1");
  const approved = await sodEnv.exceptions.approve(checker, {
    exceptionId: sodException.id,
    decision: "APPROVE",
  });
  results.push({
    name: "tc-26:checker-can-approve",
    ok:
      approved.status === PAYMENT_EXCEPTION_STATUSES.RESOLVED &&
      approved.paymentStatus === PAYMENT_STATUS_CODES.SUCCESSFUL,
  });

  const rejectEnv = harness({ requiresApproval: true });
  rejectEnv.adapter.nextInitiate = outcome("UNKNOWN");
  const rejectPay = await initiate(rejectEnv, actor, { key: "sod-reject" });
  const rejectException = (
    await rejectEnv.exceptions.listForTransaction(actor, rejectPay.payment.transaction.id)
  )[0];
  await rejectEnv.exceptions.resolve(actor, {
    exceptionId: rejectException.id,
    resolutionCode: PAYMENT_EXCEPTION_RESOLUTION_CODES.CONFIRMED_SUCCESS,
  });
  const rejected = await rejectEnv.exceptions.approve(checker, {
    exceptionId: rejectException.id,
    decision: "REJECT",
    notes: "Evidence incomplete",
  });
  results.push({
    name: "tc-27:rejected-resolution-audited",
    ok:
      rejected.status === PAYMENT_EXCEPTION_STATUSES.REJECTED &&
      rejectEnv.audit.entries.some(
        (row) =>
          row.action === PAYMENT_AUDIT_ACTIONS.PAYMENT_EXCEPTION_REJECTED &&
          row.exceptionId === rejectException.id
      ),
  });

  let crossRead: string | null = null;
  try {
    await unknownEnv.exceptions.getException(ctx("biz-b"), unknownRows[0].id);
  } catch (error) {
    crossRead = codeOf(error);
  }
  results.push({
    name: "tc-28:cross-business-read-fails",
    ok: crossRead === PAYMENT_ERROR_CODES.CROSS_BUSINESS_ACCESS,
  });

  let crossResolve: string | null = null;
  try {
    await unknownEnv.exceptions.resolve(ctx("biz-b"), {
      exceptionId: unknownRows[0].id,
      resolutionCode: PAYMENT_EXCEPTION_RESOLUTION_CODES.CONFIRMED_FAILURE,
    });
  } catch (error) {
    crossResolve = codeOf(error);
  }
  results.push({
    name: "tc-29:cross-business-resolution-fails",
    ok: crossResolve === PAYMENT_ERROR_CODES.CROSS_BUSINESS_ACCESS,
  });

  const exceptionActions = unknownEnv.audit.entries.filter((row) =>
    String(row.action).startsWith("PAYMENT_EXCEPTION_")
  );
  results.push({
    name: "tc-30:exception-actions-audited",
    ok:
      exceptionActions.some(
        (row) => row.action === PAYMENT_AUDIT_ACTIONS.PAYMENT_EXCEPTION_CREATED
      ) &&
      exceptionActions.every((row) => row.businessId === actor.businessId && row.exceptionId),
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
  if (process.env.IP08_SKIP_REGRESSION !== "1") {
    const packs: Array<[string, string, Record<string, string>]> = [
      [
        "regression-ip01",
        "scripts/bp007-ip01-payment-obligation-foundation-smoke-validation.ts",
        { IP01_SKIP_REGRESSION: "1" },
      ],
      [
        "regression-ip02",
        "scripts/bp007-ip02-payment-initiation-processing-smoke-validation.ts",
        { IP02_SKIP_REGRESSION: "1" },
      ],
      [
        "regression-ip03",
        "scripts/bp007-ip03-partial-split-payment-allocation-smoke-validation.ts",
        { IP03_SKIP_REGRESSION: "1" },
      ],
      [
        "regression-ip04",
        "scripts/bp007-ip04-billing-invoicing-credit-sales-smoke-validation.ts",
        { IP04_SKIP_REGRESSION: "1" },
      ],
      [
        "regression-ip05",
        "scripts/bp007-ip05-receipting-payment-evidence-smoke-validation.ts",
        { IP05_SKIP_REGRESSION: "1" },
      ],
      [
        "regression-ip06",
        "scripts/bp007-ip06-refunds-reversals-adjustments-smoke-validation.ts",
        { IP06_SKIP_REGRESSION: "1" },
      ],
      [
        "regression-ip07",
        "scripts/bp007-ip07-settlement-reconciliation-handoff-smoke-validation.ts",
        { IP07_SKIP_REGRESSION: "1" },
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
