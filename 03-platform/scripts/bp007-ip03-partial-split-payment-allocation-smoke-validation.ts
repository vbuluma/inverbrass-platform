/**
 * Purpose:
 * Smoke-validate BP-007 / IP-03 Partial, Split Payment & Allocation.
 *
 * Usage:
 *   npx tsx scripts/bp007-ip03-partial-split-payment-allocation-smoke-validation.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  comparePaymentAmount,
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
  PaymentAllocationService,
  PaymentInitiationService,
  PaymentObligationError,
  PaymentObligationService,
} from "@/modules/payments";
import type { PaymentEnablementPort, PaymentReadyContractPort } from "@/modules/payments/ports";
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
  PaymentTransactionInsert,
  PaymentTransactionRecord,
} from "@/modules/payments/types";

const ROOT = path.resolve(__dirname, "..");

type SmokeResult = { name: string; ok: boolean; detail?: string };

const REQUIRED_FILES = [
  "drizzle/0063_bp007_ip003_partial_split_payment_allocation.sql",
  "src/db/schema/payment-allocation.ts",
  "src/modules/payments/services/payment-allocation-service.ts",
  "src/modules/payments/services/payment-allocation-rules.ts",
  "src/modules/payments/services/payment-lock.ts",
  "src/modules/payments/actions/payment-allocation-actions.ts",
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
  return adapter;
}

function harness(options?: {
  contract?: PaymentReadyContract | null;
  flags?: PaymentEnablementFlags;
  currencies?: string[];
  adapter?: ScriptedPaymentInitiationAdapter;
  amountDue?: string;
  allowOverpayment?: boolean;
}) {
  const store = new InMemoryPaymentStore();
  const snapshot = defaultCatalogueFixture();
  store.seedCatalogue(snapshot);
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
    currencies: new InMemoryCurrencyReference(
      new Set(options?.currencies ?? ["KES"])
    ),
    audit,
  };
  const policy = createPaymentAllocationPolicyAdapter(
    options?.allowOverpayment ?? false
  );
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
    allocations,
    obligations: new PaymentObligationService(shared),
    payments: new PaymentInitiationService({
      ...shared,
      transactions: store.transactionPort,
      allocations,
      policy,
    }),
  };
}

async function insertSuccessfulTransaction(
  store: InMemoryPaymentStore,
  obligationId: string,
  overrides: Partial<PaymentTransactionInsert> = {}
): Promise<PaymentTransactionRecord> {
  return store.transactionPort.insert({
    businessId: "biz-a",
    obligationId,
    transactionNumber: `PT-${crypto.randomUUID().slice(0, 8)}`,
    methodId: "method-mm",
    networkId: "rail-mm-1",
    providerId: "provider-mm-1",
    channelId: "channel-mm-1",
    methodName: "Mobile Money",
    networkName: "Mobile money rail",
    providerName: "Mobile money provider",
    channelName: "Mobile prompt",
    amount: "4000",
    currencyCode: "KES",
    status: PAYMENT_STATUS_CODES.SUCCESSFUL,
    captureMode: "ELECTRONIC",
    providerTransactionReference: `ref-${crypto.randomUUID().slice(0, 8)}`,
    idempotencyKey: crypto.randomUUID(),
    initiatedAt: new Date(),
    completedAt: new Date(),
    failureCode: null,
    failureReason: null,
    providerResponseMetadata: null,
    outcomeMismatch: false,
    metadata: null,
    createdBy: "maker-1",
    updatedBy: "maker-1",
    ...overrides,
  });
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
  const allocation = readFileSync(
    path.join(ROOT, "src/modules/payments/services/payment-allocation-service.ts"),
    "utf8"
  );
  const initiation = readFileSync(
    path.join(ROOT, "src/modules/payments/services/payment-initiation-service.ts"),
    "utf8"
  );
  const rules = readFileSync(
    path.join(ROOT, "src/modules/payments/services/payment-allocation-rules.ts"),
    "utf8"
  );
  const patch = readFileSync(
    path.join(ROOT, "src/modules/payments/types.ts"),
    "utf8"
  );
  const txnRepo = readFileSync(
    path.join(ROOT, "src/modules/payments/repositories/payment-transaction-repository.ts"),
    "utf8"
  );
  const migration = readFileSync(
    path.join(ROOT, "drizzle/0063_bp007_ip003_partial_split_payment_allocation.sql"),
    "utf8"
  );
  const schema = readFileSync(
    path.join(ROOT, "src/db/schema/payment-allocation.ts"),
    "utf8"
  );
  const panel = readFileSync(
    path.join(ROOT, "src/modules/payments/components/payment-obligation-panel.tsx"),
    "utf8"
  )
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  const combined = `${allocation}\n${rules}\n${initiation}\n${migration}\n${schema}`;
  return [
    {
      name: "tc-27:no-provider-sdk",
      ok: scan.sdkHits.length === 0,
      detail: scan.sdkHits.join(", "),
    },
    {
      name: "tc-28:no-direct-provider-http",
      ok: scan.httpHits.length === 0,
      detail: scan.httpHits.join(", "),
    },
    {
      name: "static:no-hard-coded-provider-limits",
      ok: scan.limitHits.length === 0,
      detail: scan.limitHits.join(", "),
    },
    {
      name: "static:no-hard-coded-routing",
      ok: scan.routingHits.length === 0,
      detail: scan.routingHits.join(", "),
    },
    {
      name: "tc-25:allocation-does-not-mutate-payment-amount",
      ok:
        scan.mutationHits.length === 0 &&
        !/amount:\s*patch/.test(txnRepo) &&
        !patch.includes("| \"amount\"") &&
        !allocation.includes("transactions.update") &&
        !allocation.includes("transaction.amount ="),
      detail: scan.mutationHits.join(", "),
    },
    {
      name: "tc-29:no-commercial-recalculation",
      ok:
        !/sales_order_line|grandTotal|lineTotal/.test(combined) &&
        !initiation.includes("from \"@/db/schema/sales-order\"") &&
        scan.orderLineTotalHits.length === 0,
      detail: scan.orderLineTotalHits.join(", "),
    },
    {
      name: "tc-30:no-invoice-receipt-refund-settlement",
      ok:
        !/CREATE TABLE IF NOT EXISTS "(invoice|receipt|refund|settlement)/i.test(
          migration
        ) && !/pgTable\(\s*"(invoice|receipt|refund|settlement)/i.test(schema),
    },
    {
      name: "static:only-successful-may-allocate",
      ok: allocation.includes("PAYMENT_STATUS_CODES.SUCCESSFUL"),
    },
    {
      name: "ux:no-engine-jargon",
      ok:
        !panel.includes("BP-007") &&
        !panel.includes("IP-03") &&
        !panel.includes("ENG-006"),
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
  const actor = ctx("biz-a");

  const h = harness();
  const created = await h.obligations.createObligation(actor, { orderId: "order-1" });
  const successfulTxn = await insertSuccessfulTransaction(h.store, created.id, {
    amount: "4000",
    providerTransactionReference: "ABC-KEEP",
  });
  const allocated = await h.allocations.allocate(actor, {
    paymentTransactionId: successfulTxn.id,
    amount: "4000",
    idempotencyKey: "alloc-1",
  });
  results.push({
    name: "tc-01:successful-payment-can-be-allocated",
    ok:
      allocated.allocation?.status === "ALLOCATED" &&
      allocated.allocation.allocatedAmount === "4000" &&
      allocated.obligation.paidAmount === "4000",
    detail: allocated.allocation?.status,
  });

  const pendingH = harness({
    adapter: new ScriptedPaymentInitiationAdapter({ outcome: "PENDING" }),
  });
  const pendingOb = await pendingH.obligations.createObligation(actor, {
    orderId: "order-1",
  });
  const pendingPay = await pendingH.payments.initiatePayment(actor, {
    obligationId: pendingOb.id,
    methodId: "method-mm",
    amount: "4000",
    currency: "KES",
    idempotencyKey: "pending-1",
  });
  results.push({
    name: "tc-02:pending-payment-cannot-allocate",
    ok: await expectError(
      () =>
        pendingH.allocations.allocate(actor, {
          paymentTransactionId: pendingPay.transaction.id,
          amount: "4000",
          idempotencyKey: "pending-alloc",
        }),
      PAYMENT_ERROR_CODES.ALLOCATION_NOT_ALLOWED
    ),
  });
  results.push({
    name: "tc-17:pending-does-not-contribute-to-paid",
    ok:
      pendingPay.obligation.paidAmount === "0" &&
      pendingPay.obligation.outstandingAmount === "10000",
  });

  const failedH = harness({
    adapter: new ScriptedPaymentInitiationAdapter({
      outcome: "FAILED",
      failureCode: "PAYMENT_PROVIDER_REJECTED",
      failureReason: "Declined",
    }),
  });
  const failedOb = await failedH.obligations.createObligation(actor, {
    orderId: "order-1",
  });
  const failedPay = await failedH.payments.initiatePayment(actor, {
    obligationId: failedOb.id,
    methodId: "method-mm",
    amount: "4000",
    currency: "KES",
    idempotencyKey: "failed-1",
  });
  results.push({
    name: "tc-03:failed-payment-cannot-allocate",
    ok: await expectError(
      () =>
        failedH.allocations.allocate(actor, {
          paymentTransactionId: failedPay.transaction.id,
          amount: "4000",
          idempotencyKey: "failed-alloc",
        }),
      PAYMENT_ERROR_CODES.ALLOCATION_NOT_ALLOWED
    ),
  });
  results.push({
    name: "tc-16:failed-does-not-contribute-to-paid",
    ok:
      failedPay.obligation.paidAmount === "0" &&
      failedPay.obligation.outstandingAmount === "10000",
  });

  const expiredH = harness({
    adapter: new ScriptedPaymentInitiationAdapter({ outcome: "EXPIRED" }),
  });
  const expiredOb = await expiredH.obligations.createObligation(actor, {
    orderId: "order-1",
  });
  const expiredPay = await expiredH.payments.initiatePayment(actor, {
    obligationId: expiredOb.id,
    methodId: "method-mm",
    amount: "4000",
    currency: "KES",
    idempotencyKey: "expired-1",
  });
  results.push({
    name: "tc-04:expired-payment-cannot-allocate",
    ok: await expectError(
      () =>
        expiredH.allocations.allocate(actor, {
          paymentTransactionId: expiredPay.transaction.id,
          amount: "4000",
          idempotencyKey: "expired-alloc",
        }),
      PAYMENT_ERROR_CODES.ALLOCATION_NOT_ALLOWED
    ),
  });

  results.push({
    name: "tc-05:partial-payment-leaves-correct-outstanding",
    ok:
      allocated.obligation.amountDue === "10000" &&
      allocated.obligation.paidAmount === "4000" &&
      allocated.obligation.outstandingAmount === "6000",
    detail: `paid=${allocated.obligation.paidAmount} outstanding=${allocated.obligation.outstandingAmount}`,
  });

  const second = await insertSuccessfulTransaction(h.store, created.id, {
    amount: "2000",
    methodId: "method-cash",
    networkId: null,
    providerId: null,
    channelId: null,
    methodName: "Cash",
    networkName: null,
    providerName: null,
    channelName: null,
    captureMode: "MANUAL",
  });
  const secondAlloc = await h.allocations.allocate(actor, {
    paymentTransactionId: second.id,
    amount: "2000",
    idempotencyKey: "alloc-2",
  });
  results.push({
    name: "tc-06:two-successful-payments-allocate-to-one-obligation",
    ok:
      secondAlloc.obligation.paidAmount === "6000" &&
      secondAlloc.obligation.outstandingAmount === "4000",
  });

  const splitH = harness();
  const splitOb = await splitH.obligations.createObligation(actor, {
    orderId: "order-1",
  });
  const mm = await splitH.payments.initiatePayment(actor, {
    obligationId: splitOb.id,
    methodId: "method-mm",
    amount: "5000",
    currency: "KES",
    idempotencyKey: "split-mm",
  });
  const cash = await splitH.payments.initiatePayment(actor, {
    obligationId: splitOb.id,
    methodId: "method-cash",
    amount: "2000",
    currency: "KES",
    idempotencyKey: "split-cash",
    confirmManual: true,
  });
  const bank = await splitH.payments.initiatePayment(actor, {
    obligationId: splitOb.id,
    methodId: "method-bank",
    amount: "3000",
    currency: "KES",
    idempotencyKey: "split-bank",
  });
  const splitDetail = await splitH.payments.getObligationDetail(actor, splitOb.id);
  results.push({
    name: "tc-07:three-methods-allocate-to-one-obligation",
    ok:
      mm.transaction.methodId === "method-mm" &&
      cash.transaction.methodId === "method-cash" &&
      bank.transaction.methodId === "method-bank" &&
      splitDetail.paidAmount === "10000" &&
      splitDetail.outstandingAmount === "0" &&
      splitDetail.allocations.filter((row) => row.status === "ALLOCATED").length === 3,
    detail: `paid=${splitDetail.paidAmount} methods=${[mm, cash, bank]
      .map((row) => row.transaction.methodName)
      .join(",")}`,
  });
  results.push({
    name: "tc-08:transaction-retains-method-rail-provider-channel",
    ok:
      mm.transaction.methodId === "method-mm" &&
      mm.transaction.networkId === "rail-mm-1" &&
      mm.transaction.providerId === "provider-mm-1" &&
      mm.transaction.channelId === "channel-mm-1" &&
      cash.transaction.methodId === "method-cash" &&
      cash.transaction.networkId === null &&
      bank.transaction.methodId === "method-bank" &&
      bank.transaction.networkId === "rail-bank-1",
  });
  results.push({
    name: "tc-09:payment-transaction-amount-unchanged-by-allocation",
    ok:
      mm.transaction.amount === "5000" &&
      cash.transaction.amount === "2000" &&
      bank.transaction.amount === "3000" &&
      allocated.transaction.amount === "4000",
  });

  results.push({
    name: "tc-10:cannot-exceed-unallocated-successful-amount",
    ok: await expectError(
      () =>
        h.allocations.allocate(actor, {
          paymentTransactionId: successfulTxn.id,
          amount: "1",
          idempotencyKey: "alloc-overflow",
        }),
      PAYMENT_ERROR_CODES.ALLOCATION_EXCEEDS_UNALLOCATED
    ),
  });
  results.push({
    name: "tc-11:same-payment-cannot-allocate-twice",
    ok: await expectError(
      () =>
        h.allocations.allocate(actor, {
          paymentTransactionId: successfulTxn.id,
          amount: "4000",
          idempotencyKey: "alloc-dup-amount",
        }),
      PAYMENT_ERROR_CODES.ALLOCATION_EXCEEDS_UNALLOCATED
    ),
  });

  const again = await h.allocations.allocate(actor, {
    paymentTransactionId: successfulTxn.id,
    amount: "4000",
    idempotencyKey: "alloc-1",
  });
  const allocationCount = [...h.store.allocations.values()].filter(
    (row) => row.paymentTransactionId === successfulTxn.id && row.status === "ALLOCATED"
  ).length;
  results.push({
    name: "tc-12:same-idempotency-key-does-not-duplicate",
    ok: again.allocation?.id === allocated.allocation?.id && allocationCount === 1,
    detail: `count=${allocationCount}`,
  });

  const overH = harness();
  const overOb = await overH.obligations.createObligation(actor, {
    orderId: "order-1",
  });
  const overTxn = await insertSuccessfulTransaction(overH.store, overOb.id, {
    amount: "12000",
  });
  results.push({
    name: "tc-13:cannot-exceed-obligation-without-overpayment-policy",
    ok: await expectError(
      () =>
        overH.allocations.allocate(actor, {
          paymentTransactionId: overTxn.id,
          amount: "12000",
          idempotencyKey: "over-no-policy",
        }),
      PAYMENT_ERROR_CODES.ALLOCATION_EXCEEDS_OBLIGATION
    ),
  });
  results.push({
    name: "static:initiation-still-protects-outstanding-without-policy",
    ok: await expectError(
      () =>
        overH.payments.initiatePayment(actor, {
          obligationId: overOb.id,
          methodId: "method-mm",
          amount: "12000",
          currency: "KES",
          idempotencyKey: "init-over-blocked",
        }),
      PAYMENT_ERROR_CODES.PAYMENT_AMOUNT_EXCEEDS_OUTSTANDING
    ),
  });

  const allowedOver = harness({ allowOverpayment: true });
  const allowedOb = await allowedOver.obligations.createObligation(actor, {
    orderId: "order-1",
  });
  const overPay = await allowedOver.payments.initiatePayment(actor, {
    obligationId: allowedOb.id,
    methodId: "method-mm",
    amount: "12000",
    currency: "KES",
    idempotencyKey: "init-over-allowed",
  });
  const overDetail = await allowedOver.payments.getObligationDetail(
    actor,
    allowedOb.id
  );
  results.push({
    name: "tc-14:overpayment-does-not-increase-amount-due",
    ok:
      overPay.obligation.amountDue === "10000" &&
      overDetail.amountDue === "10000" &&
      overDetail.paidAmount === "10000" &&
      overDetail.outstandingAmount === "0",
  });
  results.push({
    name: "tc-15:overpayment-unallocated-amount-remains-visible",
    ok:
      overPay.transaction.amount === "12000" &&
      overDetail.unallocatedTotal === "2000" &&
      overDetail.recentTransactions[0]?.unallocatedAmount === "2000" &&
      allowedOver.audit.entries.some(
        (row) => row.action === "UNALLOCATED_BALANCE_RECORDED"
      ),
    detail: `unallocated=${overDetail.unallocatedTotal}`,
  });
  results.push({
    name: "tc-18:successful-payment-contributes-only-allocated-amount",
    ok:
      overDetail.paidAmount === "10000" &&
      overPay.transaction.amount === "12000" &&
      comparePaymentAmount(overDetail.paidAmount, overPay.transaction.amount) < 0,
  });
  results.push({
    name: "tc-19:outstanding-never-becomes-negative",
    ok:
      comparePaymentAmount(overDetail.outstandingAmount, "0") === 0 &&
      comparePaymentAmount(splitDetail.outstandingAmount, "0") === 0 &&
      comparePaymentAmount(secondAlloc.obligation.outstandingAmount, "0") >= 0,
  });

  const ccyH = harness({ currencies: ["KES", "USD"] });
  const ccyOb = await ccyH.obligations.createObligation(actor, { orderId: "order-1" });
  const usdTxn = await insertSuccessfulTransaction(ccyH.store, ccyOb.id, {
    currencyCode: "USD",
    amount: "4000",
  });
  results.push({
    name: "tc-20:currency-mismatch-fails",
    ok: await expectError(
      () =>
        ccyH.allocations.allocate(actor, {
          paymentTransactionId: usdTxn.id,
          amount: "4000",
          idempotencyKey: "ccy-alloc",
        }),
      PAYMENT_ERROR_CODES.ALLOCATION_CURRENCY_MISMATCH
    ),
  });

  results.push({
    name: "tc-21:cross-business-allocation-fails",
    ok: await expectError(
      () =>
        h.allocations.allocate(ctx("biz-b"), {
          paymentTransactionId: successfulTxn.id,
          amount: "4000",
          idempotencyKey: "xbiz-alloc",
        }),
      PAYMENT_ERROR_CODES.TRANSACTION_NOT_FOUND
    ),
  });

  const concH = harness({ amountDue: "6000" });
  const concOb = await concH.obligations.createObligation(actor, {
    orderId: "order-1",
  });
  const concA = await insertSuccessfulTransaction(concH.store, concOb.id, {
    amount: "4000",
    transactionNumber: "PT-CONC-A",
  });
  const concB = await insertSuccessfulTransaction(concH.store, concOb.id, {
    amount: "4000",
    transactionNumber: "PT-CONC-B",
    methodId: "method-cash",
    networkId: null,
    providerId: null,
    channelId: null,
    methodName: "Cash",
  });
  const concurrent = await Promise.allSettled([
    concH.allocations.allocate(actor, {
      paymentTransactionId: concA.id,
      amount: "4000",
      idempotencyKey: "conc-a",
    }),
    concH.allocations.allocate(actor, {
      paymentTransactionId: concB.id,
      amount: "4000",
      idempotencyKey: "conc-b",
    }),
  ]);
  const concFulfilled = concurrent.filter(
    (row) => row.status === "fulfilled"
  ) as PromiseFulfilledResult<typeof allocated>[];
  const concRejected = concurrent.filter((row) => row.status === "rejected");
  const concPaid = concFulfilled.reduce(
    (max, row) =>
      comparePaymentAmount(row.value.obligation.paidAmount, max) > 0
        ? row.value.obligation.paidAmount
        : max,
    "0"
  );
  const latestConc = await concH.obligations.getObligation(actor, concOb.id);
  results.push({
    name: "tc-22:concurrent-allocation-cannot-exceed-obligation",
    ok:
      concRejected.length === 1 &&
      concFulfilled.length === 1 &&
      latestConc.paidAmount === "4000" &&
      latestConc.outstandingAmount === "2000" &&
      comparePaymentAmount(latestConc.outstandingAmount, "0") >= 0 &&
      comparePaymentAmount(concPaid, "6000") <= 0,
    detail: `paid=${latestConc.paidAmount} rejected=${concRejected.length}`,
  });

  const samePayH = harness();
  const samePayOb = await samePayH.obligations.createObligation(actor, {
    orderId: "order-1",
  });
  const sameTxn = await insertSuccessfulTransaction(samePayH.store, samePayOb.id, {
    amount: "5000",
  });
  const sameConcurrent = await Promise.allSettled([
    samePayH.allocations.allocate(actor, {
      paymentTransactionId: sameTxn.id,
      amount: "5000",
      idempotencyKey: "same-a",
    }),
    samePayH.allocations.allocate(actor, {
      paymentTransactionId: sameTxn.id,
      amount: "5000",
      idempotencyKey: "same-b",
    }),
  ]);
  const sameOk = sameConcurrent.filter((row) => row.status === "fulfilled");
  const sameAllocCount = [...samePayH.store.allocations.values()].filter(
    (row) => row.paymentTransactionId === sameTxn.id && row.status === "ALLOCATED"
  ).length;
  results.push({
    name: "tc-23:concurrent-allocation-cannot-allocate-same-payment-twice",
    ok: sameOk.length === 1 && sameAllocCount === 1,
    detail: `fulfilled=${sameOk.length} allocations=${sameAllocCount}`,
  });

  const adjusted = await h.allocations.adjustAllocation(actor, {
    allocationId: allocated.allocation?.id as string,
    reason: "Incorrect assignment",
    idempotencyKey: "adjust-1",
  });
  const afterAdjust = await h.store.transactionPort.findById("biz-a", successfulTxn.id);
  results.push({
    name: "tc-24:allocation-adjustment-is-audited",
    ok:
      adjusted.allocation?.status === "ADJUSTED" &&
      h.audit.entries.some((row) => row.action === "ALLOCATION_ADJUSTED") &&
      h.audit.entries.some((row) => row.action === "ALLOCATION_CREATED"),
  });
  results.push({
    name: "tc-25:original-successful-payment-remains-immutable",
    ok:
      afterAdjust?.amount === "4000" &&
      afterAdjust.status === PAYMENT_STATUS_CODES.SUCCESSFUL &&
      afterAdjust.methodId === "method-mm" &&
      afterAdjust.networkId === "rail-mm-1" &&
      afterAdjust.providerId === "provider-mm-1" &&
      afterAdjust.channelId === "channel-mm-1",
  });
  results.push({
    name: "tc-26:provider-reference-remains-unchanged",
    ok: afterAdjust?.providerTransactionReference === "ABC-KEEP",
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
  if (process.env.IP03_SKIP_REGRESSION !== "1") {
    if (existsSync(path.join(ROOT, "scripts/bp007-ip01-payment-obligation-foundation-smoke-validation.ts"))) {
      regressionResults.push(
        runExternal("scripts/bp007-ip01-payment-obligation-foundation-smoke-validation.ts", {
          IP01_SKIP_REGRESSION: "1",
        })
      );
    }
    if (existsSync(path.join(ROOT, "scripts/bp007-ip02-payment-initiation-processing-smoke-validation.ts"))) {
      regressionResults.push(
        runExternal("scripts/bp007-ip02-payment-initiation-processing-smoke-validation.ts", {
          IP02_SKIP_REGRESSION: "1",
        })
      );
    }
    for (const script of [
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
