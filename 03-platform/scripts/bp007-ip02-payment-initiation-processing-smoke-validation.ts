/**
 * Purpose:
 * Smoke-validate BP-007 / IP-02 Payment Initiation & Processing.
 *
 * Usage:
 *   npx tsx scripts/bp007-ip02-payment-initiation-processing-smoke-validation.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  createCatalogueCapabilityPaymentEngine,
  ScriptedPaymentInitiationAdapter,
} from "@/core/payment-engine";
import { InMemoryCurrencyReference } from "@/modules/payments/adapters/currency-catalogue-adapter";
import { createPaymentAllocationPolicyAdapter } from "@/modules/payments/adapters/payment-allocation-policy-adapter";
import {
  listSourceFiles,
  scanPaymentArchitecture,
} from "@/modules/payments/architecture-scan";
import {
  PAYMENT_ERROR_CODES,
  PAYMENT_STATUS_CODES,
  PaymentInitiationService,
  PaymentObligationError,
  PaymentObligationService,
  assertPaymentStatusTransition,
} from "@/modules/payments";
import type { PaymentEnablementPort, PaymentReadyContractPort } from "@/modules/payments/ports";
import { PaymentAllocationService } from "@/modules/payments/services/payment-allocation-service";
import { createInProcessPaymentLock } from "@/modules/payments/services/payment-lock";
import { RecordingPaymentAudit } from "@/modules/payments/services/payment-obligation-audit-helper";
import {
  defaultCatalogueFixture,
  InMemoryCapabilityStore,
  InMemoryPaymentStore,
} from "@/modules/payments/services/payment-memory-store";
import type {
  PaymentEnablementFlags,
  PaymentReadyContract,
} from "@/modules/payments/types";

const ROOT = path.resolve(__dirname, "..");

type SmokeResult = { name: string; ok: boolean; detail?: string };

const REQUIRED_FILES = [
  "drizzle/0062_bp007_ip002_payment_initiation_processing.sql",
  "src/db/schema/payment-transaction.ts",
  "src/core/payment-engine/adapters/in-process-initiation-adapter.ts",
  "src/modules/payments/services/payment-initiation-service.ts",
  "src/modules/payments/services/payment-lifecycle-rules.ts",
  "src/app/(authenticated)/(app)/payments/transactions/[transactionId]/page.tsx",
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

function harness(options?: {
  contract?: PaymentReadyContract | null;
  flags?: PaymentEnablementFlags;
  currencies?: string[];
  adapter?: ScriptedPaymentInitiationAdapter;
  amountDue?: string;
}) {
  const store = new InMemoryPaymentStore();
  const snapshot = defaultCatalogueFixture();
  store.seedCatalogue(snapshot);
  const audit = new RecordingPaymentAudit();
  const adapter = options?.adapter ?? new ScriptedPaymentInitiationAdapter();
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
  const amountDue = options?.amountDue ?? "10000";
  const contract: PaymentReadyContract | null =
    options?.contract === undefined
      ? validContract({
          expectedAmount: amountDue,
          lines: [
            {
              orderLineId: "line-1",
              offeringId: "offering-1",
              expectedPayable: amountDue,
              currencyCode: "KES",
            },
          ],
        })
      : options.contract;
  const contracts: PaymentReadyContractPort = {
    async getByOrderId(_context, orderId) {
      if (!contract || contract.orderId !== orderId) {
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
    currencies: new InMemoryCurrencyReference(new Set(options?.currencies ?? ["KES"])),
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
  return {
    store,
    audit,
    adapter,
    obligations: new PaymentObligationService(shared),
    payments: new PaymentInitiationService({
      ...shared,
      transactions: store.transactionPort,
      allocations,
      policy,
    }),
  };
}

function checkFiles(): SmokeResult[] {
  return REQUIRED_FILES.map((relative) => ({
    name: `files:${relative}`,
    ok: existsSync(path.join(ROOT, relative)),
  }));
}

function scanScoped(): ReturnType<typeof scanPaymentArchitecture> {
  const paymentRoot = path.join(ROOT, "src/modules/payments");
  const engineRoot = path.join(ROOT, "src/core/payment-engine");
  const appRoot = path.join(ROOT, "src/app");
  const files = [
    ...listSourceFiles(paymentRoot),
    ...listSourceFiles(engineRoot),
    ...listSourceFiles(appRoot).filter((file) =>
      file.replace(/\\/g, "/").includes("/payments/")
    ),
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
  const initiation = readFileSync(
    path.join(ROOT, "src/modules/payments/services/payment-initiation-service.ts"),
    "utf8"
  );
  const migration = readFileSync(
    path.join(ROOT, "drizzle/0062_bp007_ip002_payment_initiation_processing.sql"),
    "utf8"
  );
  const schema = readFileSync(
    path.join(ROOT, "src/db/schema/payment-transaction.ts"),
    "utf8"
  );
  const obligationService = readFileSync(
    path.join(ROOT, "src/modules/payments/services/payment-obligation-service.ts"),
    "utf8"
  );
  const panel = readFileSync(
    path.join(ROOT, "src/modules/payments/components/payment-obligation-panel.tsx"),
    "utf8"
  ).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const combined = `${initiation}\n${schema}\n${migration}`;
  return [
    {
      name: "tc-08:no-hard-coded-provider-limit",
      ok: scan.limitHits.length === 0 && !/MAX_STK_AMOUNT/.test(initiation),
      detail: scan.limitHits.join(", "),
    },
    {
      name: "tc-09:initiation-goes-through-engine-port",
      ok: initiation.includes("engine.initiatePayment("),
    },
    {
      name: "tc-10:no-provider-sdk",
      ok: scan.sdkHits.length === 0,
      detail: scan.sdkHits.join(", "),
    },
    {
      name: "tc-11:no-direct-provider-http",
      ok: scan.httpHits.length === 0,
      detail: scan.httpHits.join(", "),
    },
    {
      name: "tc-27:no-named-provider-callback-route",
      ok: scan.callbackHits.length === 0,
      detail: scan.callbackHits.join(", "),
    },
    {
      name: "static:no-hard-coded-routing",
      ok: scan.routingHits.length === 0,
      detail: scan.routingHits.join(", "),
    },
    {
      name: "tc-29:no-commercial-recalculation",
      ok:
        !initiation.includes("sales_order_line") &&
        !initiation.includes("sales-order") &&
        !/grandTotal|lineTotal/.test(initiation) &&
        !obligationService.includes(".initiatePayment("),
    },
    {
      name: "tc-30:no-invoice-receipt-refund-settlement",
      ok:
        !/CREATE TABLE IF NOT EXISTS "(invoice|receipt|refund|settlement)/i.test(migration) &&
        !/pgTable\(\s*"(invoice|receipt|refund|settlement)/i.test(schema),
    },
    {
      name: "ux:no-engine-jargon",
      ok:
        !panel.includes("BP-007") &&
        !panel.includes("IP-02") &&
        !panel.includes("ENG-006"),
    },
    {
      name: "ux:simple-payment-language",
      ok:
        panel.includes("Amount due") &&
        panel.includes("How the customer can pay") &&
        panel.includes("How would you like to pay?"),
    },
    {
      name: "boundary:no-ip03-split",
      ok: !combined.includes("splitPayment") && !combined.includes("allocationLine"),
    },
  ];
}

async function expectError(
  run: () => Promise<unknown>,
  code: string
): Promise<boolean> {
  try {
    await run();
    return false;
  } catch (error) {
    return error instanceof PaymentObligationError && error.code === code;
  }
}

async function runCoreCases(): Promise<SmokeResult[]> {
  const results: SmokeResult[] = [];
  const h = harness();
  const created = await h.obligations.createObligation(ctx("biz-a"), { orderId: "order-1" });

  const initiated = await h.payments.initiatePayment(ctx("biz-a"), {
    obligationId: created.id,
    methodId: "method-mm",
    amount: "4000",
    currency: "KES",
    idempotencyKey: "ABC123",
  });
  results.push({
    name: "tc-01:valid-obligation-initiates-electronic-payment",
    ok:
      initiated.transaction.status === PAYMENT_STATUS_CODES.INITIATED &&
      initiated.obligation.outstandingAmount === "10000" &&
      h.adapter.initiateCalls.length === 1 &&
      h.adapter.initiateCalls[0]?.paymentTransactionId === initiated.transaction.id,
    detail: `status=${initiated.transaction.status} calls=${h.adapter.initiateCalls.length}`,
  });

  results.push({
    name: "tc-02:invalid-obligation-cannot-initiate",
    ok: await expectError(
      () =>
        h.payments.initiatePayment(ctx("biz-a"), {
          obligationId: "missing-obligation",
          methodId: "method-mm",
          amount: "1000",
          currency: "KES",
          idempotencyKey: "missing-1",
        }),
      PAYMENT_ERROR_CODES.OBLIGATION_NOT_FOUND
    ),
  });

  results.push({
    name: "tc-03:cross-business-cannot-initiate",
    ok: await expectError(
      () =>
        h.payments.initiatePayment(ctx("biz-b"), {
          obligationId: created.id,
          methodId: "method-mm",
          amount: "1000",
          currency: "KES",
          idempotencyKey: "xbiz-1",
        }),
      PAYMENT_ERROR_CODES.OBLIGATION_NOT_FOUND
    ),
  });

  results.push({
    name: "tc-04:zero-amount-rejected",
    ok: await expectError(
      () =>
        h.payments.initiatePayment(ctx("biz-a"), {
          obligationId: created.id,
          methodId: "method-mm",
          amount: "0",
          currency: "KES",
          idempotencyKey: "zero-1",
        }),
      PAYMENT_ERROR_CODES.PAYMENT_INVALID_AMOUNT
    ),
  });

  results.push({
    name: "tc-05:negative-amount-rejected",
    ok: await expectError(
      () =>
        h.payments.initiatePayment(ctx("biz-a"), {
          obligationId: created.id,
          methodId: "method-mm",
          amount: "-10",
          currency: "KES",
          idempotencyKey: "neg-1",
        }),
      PAYMENT_ERROR_CODES.PAYMENT_INVALID_AMOUNT
    ),
  });

  results.push({
    name: "tc-06:currency-mismatch-rejected",
    ok: await expectError(
      () =>
        h.payments.initiatePayment(ctx("biz-a"), {
          obligationId: created.id,
          methodId: "method-mm",
          amount: "1000",
          currency: "USD",
          idempotencyKey: "ccy-1",
        }),
      PAYMENT_ERROR_CODES.PAYMENT_INVALID_CURRENCY
    ),
  });

  const limited = harness({ amountDue: "200000" });
  const limitedObligation = await limited.obligations.createObligation(ctx("biz-a"), {
    orderId: "order-1",
  });
  const snapshot = defaultCatalogueFixture();
  snapshot.capabilities = snapshot.capabilities.map((row) =>
    row.paymentChannelId === "channel-mm-1"
      ? { ...row, maxAmount: "150000", transactionLimit: "150000" }
      : row
  );
  limited.store.seedCatalogue(snapshot);
  results.push({
    name: "tc-07:configured-channel-limit-blocks-excessive-payment",
    ok: await expectError(
      () =>
        limited.payments.initiatePayment(ctx("biz-a"), {
          obligationId: limitedObligation.id,
          methodId: "method-mm",
          amount: "200000",
          currency: "KES",
          idempotencyKey: "limit-1",
        }),
      PAYMENT_ERROR_CODES.PAYMENT_LIMIT_EXCEEDED
    ),
  });
  results.push({
    name: "tc-07b:limit-blocks-before-engine-call",
    ok: limited.adapter.initiateCalls.length === 0,
  });

  const successful = await h.payments.applyProviderOutcome(ctx("biz-a"), {
    paymentTransactionId: initiated.transaction.id,
    outcome: {
      outcome: "SUCCESSFUL",
      providerTransactionReference: "ABC999",
      amount: "4000",
      currency: "KES",
      obligationId: created.id,
    },
  });
  results.push({
    name: "tc-12:successful-provider-outcome-sets-successful",
    ok: successful.transaction.status === PAYMENT_STATUS_CODES.SUCCESSFUL,
  });
  results.push({
    name: "tc-13:successful-payment-updates-obligation",
    ok:
      successful.obligation.paidAmount === "4000" &&
      successful.obligation.outstandingAmount === "6000" &&
      successful.obligation.amountDue === "10000",
    detail: `paid=${successful.obligation.paidAmount} outstanding=${successful.obligation.outstandingAmount}`,
  });
  results.push({
    name: "tc-25:provider-reference-persisted",
    ok: successful.transaction.providerTransactionReference === "ABC999",
  });

  const duplicateOutcome = await h.payments.applyProviderOutcome(ctx("biz-a"), {
    providerTransactionReference: "ABC999",
    outcome: {
      outcome: "SUCCESSFUL",
      providerTransactionReference: "ABC999",
      amount: "4000",
      currency: "KES",
    },
  });
  results.push({
    name: "tc-20:duplicate-provider-outcome-is-idempotent",
    ok:
      duplicateOutcome.transaction.id === successful.transaction.id &&
      duplicateOutcome.obligation.paidAmount === "4000" &&
      duplicateOutcome.obligation.outstandingAmount === "6000" &&
      h.store.transactions.size === 1,
  });

  const pendingH = harness({ adapter: new ScriptedPaymentInitiationAdapter({ outcome: "PENDING" }) });
  const pendingOb = await pendingH.obligations.createObligation(ctx("biz-a"), {
    orderId: "order-1",
  });
  const pendingPay = await pendingH.payments.initiatePayment(ctx("biz-a"), {
    obligationId: pendingOb.id,
    methodId: "method-mm",
    amount: "4000",
    currency: "KES",
    idempotencyKey: "pending-1",
  });
  results.push({
    name: "tc-14:pending-outcome-remains-pending",
    ok:
      pendingPay.transaction.status === PAYMENT_STATUS_CODES.PENDING &&
      pendingPay.obligation.outstandingAmount === "10000",
  });
  results.push({
    name: "tc-18:pending-does-not-reduce-outstanding",
    ok: pendingPay.obligation.outstandingAmount === "10000",
  });

  const failedH = harness({ adapter: new ScriptedPaymentInitiationAdapter({ outcome: "FAILED", failureCode: "PAYMENT_PROVIDER_REJECTED", failureReason: "Declined" }) });
  const failedOb = await failedH.obligations.createObligation(ctx("biz-a"), {
    orderId: "order-1",
  });
  const failedPay = await failedH.payments.initiatePayment(ctx("biz-a"), {
    obligationId: failedOb.id,
    methodId: "method-mm",
    amount: "4000",
    currency: "KES",
    idempotencyKey: "failed-1",
  });
  results.push({
    name: "tc-15:failed-outcome-remains-failed",
    ok: failedPay.transaction.status === PAYMENT_STATUS_CODES.FAILED,
  });
  results.push({
    name: "tc-17:failed-does-not-reduce-outstanding",
    ok: failedPay.obligation.outstandingAmount === "10000",
  });
  results.push({
    name: "tc-26:provider-failure-is-normalized",
    ok: failedPay.transaction.failureCode === "PAYMENT_PROVIDER_REJECTED",
  });

  const expiredH = harness({ adapter: new ScriptedPaymentInitiationAdapter({ outcome: "EXPIRED" }) });
  const expiredOb = await expiredH.obligations.createObligation(ctx("biz-a"), {
    orderId: "order-1",
  });
  const expiredPay = await expiredH.payments.initiatePayment(ctx("biz-a"), {
    obligationId: expiredOb.id,
    methodId: "method-mm",
    amount: "4000",
    currency: "KES",
    idempotencyKey: "expired-1",
  });
  results.push({
    name: "tc-16:expired-outcome-remains-expired",
    ok:
      expiredPay.transaction.status === PAYMENT_STATUS_CODES.EXPIRED &&
      expiredPay.obligation.outstandingAmount === "10000",
  });

  const retry = await h.payments.initiatePayment(ctx("biz-a"), {
    obligationId: created.id,
    methodId: "method-mm",
    amount: "4000",
    currency: "KES",
    idempotencyKey: "ABC123",
  });
  results.push({
    name: "tc-19:same-idempotency-key-does-not-duplicate",
    ok:
      retry.transaction.id === initiated.transaction.id &&
      h.adapter.initiateCalls.length === 1 &&
      h.store.transactions.size === 1,
    detail: `calls=${h.adapter.initiateCalls.length} txns=${h.store.transactions.size}`,
  });

  const mismatchH = harness();
  const mismatchOb = await mismatchH.obligations.createObligation(ctx("biz-a"), {
    orderId: "order-1",
  });
  const mismatchPay = await mismatchH.payments.initiatePayment(ctx("biz-a"), {
    obligationId: mismatchOb.id,
    methodId: "method-mm",
    amount: "4000",
    currency: "KES",
    idempotencyKey: "mismatch-1",
  });
  const amountMismatch = await mismatchH.payments.applyProviderOutcome(ctx("biz-a"), {
    paymentTransactionId: mismatchPay.transaction.id,
    outcome: {
      outcome: "SUCCESSFUL",
      providerTransactionReference: "MIS-AMT",
      amount: "9999",
      currency: "KES",
    },
  });
  results.push({
    name: "tc-21:amount-mismatch-not-successful",
    ok:
      amountMismatch.transaction.status !== PAYMENT_STATUS_CODES.SUCCESSFUL &&
      amountMismatch.transaction.outcomeMismatch === true &&
      amountMismatch.obligation.outstandingAmount === "10000",
  });

  const ccyH = harness();
  const ccyOb = await ccyH.obligations.createObligation(ctx("biz-a"), { orderId: "order-1" });
  const ccyPay = await ccyH.payments.initiatePayment(ctx("biz-a"), {
    obligationId: ccyOb.id,
    methodId: "method-mm",
    amount: "4000",
    currency: "KES",
    idempotencyKey: "mismatch-ccy",
  });
  const ccyMismatch = await ccyH.payments.applyProviderOutcome(ctx("biz-a"), {
    paymentTransactionId: ccyPay.transaction.id,
    outcome: {
      outcome: "SUCCESSFUL",
      providerTransactionReference: "MIS-CCY",
      amount: "4000",
      currency: "USD",
    },
  });
  results.push({
    name: "tc-22:currency-mismatch-not-successful",
    ok:
      ccyMismatch.transaction.status !== PAYMENT_STATUS_CODES.SUCCESSFUL &&
      ccyMismatch.obligation.outstandingAmount === "10000",
  });

  const cashH = harness();
  const cashOb = await cashH.obligations.createObligation(ctx("biz-a"), { orderId: "order-1" });
  const cashPay = await cashH.payments.initiatePayment(ctx("biz-a"), {
    obligationId: cashOb.id,
    methodId: "method-cash",
    amount: "4000",
    currency: "KES",
    idempotencyKey: "cash-1",
    confirmManual: true,
  });
  results.push({
    name: "tc-23:cash-manual-capture-without-provider",
    ok:
      cashPay.transaction.status === PAYMENT_STATUS_CODES.SUCCESSFUL &&
      cashPay.transaction.captureMode === "MANUAL" &&
      cashH.adapter.initiateCalls.length === 0,
  });
  results.push({
    name: "tc-24:cash-success-updates-obligation",
    ok:
      cashPay.obligation.paidAmount === "4000" &&
      cashPay.obligation.outstandingAmount === "6000",
  });

  results.push({
    name: "tc-28:illegal-transition-fails-closed",
    ok: await expectError(
      () =>
        h.payments.applyProviderOutcome(ctx("biz-a"), {
          paymentTransactionId: successful.transaction.id,
          outcome: { outcome: "FAILED", failureCode: "PAYMENT_PROVIDER_REJECTED" },
        }),
      PAYMENT_ERROR_CODES.PAYMENT_INVALID_TRANSITION
    ),
  });

  let illegalHelper = false;
  try {
    assertPaymentStatusTransition("SUCCESSFUL", "FAILED");
  } catch (error) {
    illegalHelper =
      error instanceof PaymentObligationError &&
      error.code === PAYMENT_ERROR_CODES.PAYMENT_INVALID_TRANSITION;
  }
  results.push({
    name: "tc-28b:lifecycle-helper-rejects-illegal-transition",
    ok: illegalHelper,
  });

  const unknownH = harness({ adapter: new ScriptedPaymentInitiationAdapter({ outcome: "UNKNOWN" }) });
  const unknownOb = await unknownH.obligations.createObligation(ctx("biz-a"), {
    orderId: "order-1",
  });
  const unknownPay = await unknownH.payments.initiatePayment(ctx("biz-a"), {
    obligationId: unknownOb.id,
    methodId: "method-mm",
    amount: "4000",
    currency: "KES",
    idempotencyKey: "unknown-1",
  });
  results.push({
    name: "unknown-outcome-not-successful",
    ok:
      unknownPay.transaction.status !== PAYMENT_STATUS_CODES.SUCCESSFUL &&
      unknownPay.transaction.status !== PAYMENT_STATUS_CODES.FAILED &&
      unknownPay.obligation.outstandingAmount === "10000",
  });

  results.push({
    name: "audit:initiation-and-success-recorded",
    ok:
      h.audit.entries.some((row) => row.action === "PAYMENT_INITIATED") &&
      h.audit.entries.some((row) => row.action === "PAYMENT_SUCCESSFUL") &&
      h.audit.entries.some((row) => row.action === "PROVIDER_REFERENCE_ASSIGNED"),
  });

  const exceed = await expectError(
    () =>
      h.payments.initiatePayment(ctx("biz-a"), {
        obligationId: created.id,
        methodId: "method-mm",
        amount: "7000",
        currency: "KES",
        idempotencyKey: "over-1",
      }),
    PAYMENT_ERROR_CODES.PAYMENT_AMOUNT_EXCEEDS_OUTSTANDING
  );
  results.push({
    name: "amount:cannot-exceed-outstanding",
    ok: exceed,
  });

  const replayEnv = harness({
    adapter: new ScriptedPaymentInitiationAdapter({ outcome: "SUCCESSFUL" }),
  });
  const replayOb = await replayEnv.obligations.createObligation(ctx("biz-a"), {
    orderId: "order-1",
  });
  const firstPay = await replayEnv.payments.initiatePayment(ctx("biz-a"), {
    obligationId: replayOb.id,
    methodId: "method-mm",
    amount: "10000",
    currency: "KES",
    idempotencyKey: "pay-replay-1",
  });
  const replayPay = await replayEnv.payments.initiatePayment(ctx("biz-a"), {
    obligationId: replayOb.id,
    methodId: "method-mm",
    amount: "10000",
    currency: "KES",
    idempotencyKey: "pay-replay-1",
  });
  const replayTxns = await replayEnv.store.transactionPort.listByObligation(
    "biz-a",
    replayOb.id
  );
  results.push({
    name: "remediation:new-payment-valid-obligation",
    ok:
      firstPay.transaction.status === PAYMENT_STATUS_CODES.SUCCESSFUL &&
      firstPay.transaction.id === replayPay.transaction.id,
    detail: `status=${firstPay.transaction.status}`,
  });
  results.push({
    name: "remediation:successful-replay-returns-original",
    ok:
      firstPay.transaction.id === replayPay.transaction.id &&
      replayTxns.length === 1,
    detail: `txns=${replayTxns.length}`,
  });
  results.push({
    name: "remediation:replay-does-not-call-engine-again",
    ok: replayEnv.adapter.initiateCalls.length === 1,
    detail: `calls=${replayEnv.adapter.initiateCalls.length}`,
  });

  const crossReplay = await expectError(
    () =>
      replayEnv.payments.initiatePayment(ctx("biz-b"), {
        obligationId: replayOb.id,
        methodId: "method-mm",
        amount: "10000",
        currency: "KES",
        idempotencyKey: "pay-replay-1",
      }),
    PAYMENT_ERROR_CODES.OBLIGATION_NOT_FOUND
  );
  results.push({
    name: "remediation:same-key-other-business-fails-closed",
    ok: crossReplay,
  });

  const ineligible = await expectError(
    () =>
      replayEnv.payments.initiatePayment(ctx("biz-a"), {
        obligationId: replayOb.id,
        methodId: "method-mm",
        amount: "10000",
        currency: "KES",
        idempotencyKey: "pay-new-after-paid",
      }),
    PAYMENT_ERROR_CODES.OBLIGATION_NOT_ELIGIBLE
  );
  results.push({
    name: "remediation:new-payment-ineligible-obligation-still-fails",
    ok: ineligible,
  });

  return results;
}

function runExternal(script: string): SmokeResult {
  const result = spawnSync(process.execPath, ["--import", "tsx", script], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 420_000,
    env: { ...process.env, IP01_SKIP_REGRESSION: "1" },
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
  if (process.env.IP02_SKIP_REGRESSION !== "1") {
    for (const script of [
      "scripts/bp007-ip01-payment-obligation-foundation-smoke-validation.ts",
      "scripts/bp006-ip05-downstream-handoff-sales-workspace-smoke-validation.ts",
      "scripts/bp005-ip10-downstream-commercial-contract-smoke-validation.ts",
    ]) {
      if (existsSync(path.join(ROOT, script))) {
        regressionResults.push(runExternal(script));
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
