/**
 * Purpose:
 * Smoke-validate BP-007 / IP-05 Receipting & Payment Evidence.
 *
 * Usage:
 *   npx tsx scripts/bp007-ip05-receipting-payment-evidence-smoke-validation.ts
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
  PaymentInvoiceService,
  PaymentObligationError,
  PaymentObligationService,
  PaymentReceiptService,
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
import type {
  PaymentEnablementFlags,
  PaymentReadyContract,
  PaymentTransactionInsert,
  PaymentTransactionRecord,
} from "@/modules/payments/types";

const ROOT = path.resolve(__dirname, "..");

type SmokeResult = { name: string; ok: boolean; detail?: string };

const REQUIRED_FILES = [
  "drizzle/0065_bp007_ip005_receipting_payment_evidence.sql",
  "src/db/schema/payment-receipt.ts",
  "src/modules/payments/services/payment-receipt-service.ts",
  "src/modules/payments/services/payment-receipt-rules.ts",
  "src/modules/payments/actions/payment-receipt-actions.ts",
  "src/core/notification-engine/adapters/in-process-notification-adapter.ts",
  "src/core/document-engine/adapters/in-process-document-adapter.ts",
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

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

function harness(options?: {
  flags?: PaymentEnablementFlags;
  adapter?: ScriptedPaymentInitiationAdapter;
  amountDue?: string;
  numberingFailClosed?: boolean;
  includeReceiptsOnInitiation?: boolean;
}) {
  const store = new InMemoryPaymentStore();
  store.seedCatalogue(defaultCatalogueFixture());
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
  const numbering = new ScriptedDocumentNumberingAdapter({
    failClosed: options?.numberingFailClosed ?? false,
  });
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
  return {
    store,
    audit,
    numbering,
    receipting,
    documents,
    notifications,
    receipts,
    invoices,
    allocations,
    obligations: new PaymentObligationService(shared),
    payments: new PaymentInitiationService({
      ...shared,
      transactions: store.transactionPort,
      allocations,
      policy,
      receipts: options?.includeReceiptsOnInitiation === false ? undefined : receipts,
    }),
  };
}

async function insertTransaction(
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

function scanScoped() {
  const files = [
    ...listSourceFiles(path.join(ROOT, "src/modules/payments")),
    ...listSourceFiles(path.join(ROOT, "src/core/receipting-engine")),
    ...listSourceFiles(path.join(ROOT, "src/core/notification-engine")),
    ...listSourceFiles(path.join(ROOT, "src/core/document-engine")),
    ...listSourceFiles(path.join(ROOT, "src/app")).filter((file) => {
      const rel = file.replace(/\\/g, "/");
      return (
        rel.includes("/payments/") ||
        rel.includes("/invoices/") ||
        rel.includes("/receipts/")
      );
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
  const receiptService = stripComments(
    readFileSync(
      path.join(ROOT, "src/modules/payments/services/payment-receipt-service.ts"),
      "utf8"
    )
  );
  const receiptRules = stripComments(
    readFileSync(
      path.join(ROOT, "src/modules/payments/services/payment-receipt-rules.ts"),
      "utf8"
    )
  );
  const ui = stripComments(
    readFileSync(
      path.join(ROOT, "src/modules/payments/components/receipt-detail.tsx"),
      "utf8"
    ) +
      readFileSync(
        path.join(ROOT, "src/modules/payments/components/receipts-workspace.tsx"),
        "utf8"
      )
  );
  const migration = readFileSync(
    path.join(ROOT, "drizzle/0065_bp007_ip005_receipting_payment_evidence.sql"),
    "utf8"
  );
  const ip05 = `${receiptService}\n${receiptRules}`;
  return [
    {
      name: "tc-21:no-commercial-recalculation",
      ok:
        !/sales_order_line|grandTotal|lineTotal|quantity\s*\*|price\s*\*/.test(ip05) &&
        !receiptService.includes("from \"@/db/schema/sales-order\"") &&
        scan.orderLineTotalHits.length === 0,
      detail: scan.orderLineTotalHits.join(", "),
    },
    {
      name: "tc-25:no-provider-sdk",
      ok: scan.sdkHits.length === 0,
      detail: scan.sdkHits.join(", "),
    },
    {
      name: "tc-26:no-direct-provider-http",
      ok: scan.httpHits.length === 0,
      detail: scan.httpHits.join(", "),
    },
    {
      name: "tc-27:no-hard-coded-provider-routing",
      ok: scan.routingHits.length === 0 && scan.limitHits.length === 0,
      detail: [...scan.routingHits, ...scan.limitHits].join(", "),
    },
    {
      name: "static:numbering-delegated-to-eng-003b",
      ok:
        receiptService.includes("numbering.allocate") &&
        !receiptService.includes("padStart") &&
        !/RCT-\$\{/.test(receiptService),
    },
    {
      name: "static:no-refund-settlement-collections",
      ok:
        !/initiateRefund|processRefund|settlement matching|dunning|collector/i.test(ip05) &&
        !/CREATE TABLE IF NOT EXISTS "(refund|settlement|collection)/i.test(migration),
    },
    {
      name: "ux:no-engine-jargon",
      ok:
        !ui.includes("BP-007") &&
        !ui.includes("IP-05") &&
        !ui.includes("ENG-003b") &&
        !ui.includes("ENG-007"),
    },
  ];
}

async function expectError(run: () => Promise<unknown>, code: string): Promise<boolean> {
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

  const cash = harness({ amountDue: "10000" });
  const cashOb = await cash.obligations.createObligation(actor, { orderId: "order-1" });
  const cashPay = await cash.payments.initiatePayment(actor, {
    obligationId: cashOb.id,
    methodId: "method-cash",
    amount: "10000",
    currency: "KES",
    idempotencyKey: "cash-full",
    confirmManual: true,
  });
  const cashReceipt = await cash.receipts.getByTransaction(actor, cashPay.transaction.id);
  results.push({
    name: "tc-01:successful-cash-creates-receipt",
    ok:
      cashPay.transaction.status === PAYMENT_STATUS_CODES.SUCCESSFUL &&
      cashReceipt?.amount === "10000" &&
      Boolean(cashReceipt.methodName) &&
      !cashReceipt.networkId &&
      !cashReceipt.providerId &&
      !cashReceipt.channelId,
    detail: cashReceipt?.methodName ?? undefined,
  });
  results.push({
    name: "tc-09:cash-receipt-allows-null-rail-provider-channel",
    ok:
      cashReceipt !== null &&
      !cashReceipt.networkId &&
      !cashReceipt.providerId &&
      !cashReceipt.channelId,
  });
  results.push({
    name: "tc-17:non-invoiced-sale-links-obligation-order",
    ok:
      cashReceipt?.invoiceId === null &&
      cashReceipt?.orderNumber === "SO-000001" &&
      cashReceipt.obligationId === cashOb.id,
  });
  results.push({
    name: "tc-10:receipt-number-from-eng-003b",
    ok:
      cash.numbering.calls.some((row) => row.documentType === "RECEIPT") &&
      cashReceipt?.receiptNumber === "POL-RCT-000001",
    detail: cashReceipt?.receiptNumber,
  });
  results.push({
    name: "tc-29:eng-007-document-handle-persisted",
    ok:
      cashReceipt?.documentId !== null &&
      cashReceipt?.documentStorageKey !== null &&
      cash.receipting.produceCalls.some((row) => row.documentType === "RECEIPT") &&
      cash.documents.storeCalls.length >= 1,
  });
  results.push({
    name: "tc-28:audit-events-created",
    ok:
      cash.audit.entries.some((row) => row.action === "RECEIPT_CREATED") &&
      cash.audit.entries.some((row) => row.action === "RECEIPT_ISSUED") &&
      cash.audit.entries.some((row) => row.action === "RECEIPT_DOCUMENT_REQUESTED"),
  });
  results.push({
    name: "tc-19:receipt-does-not-change-payment-status",
    ok: cashPay.transaction.status === PAYMENT_STATUS_CODES.SUCCESSFUL,
  });
  results.push({
    name: "tc-20:receipt-does-not-change-amount-due",
    ok: cashPay.obligation.amountDue === "10000",
  });

  const electronic = harness();
  const elOb = await electronic.obligations.createObligation(actor, { orderId: "order-1" });
  const elPay = await electronic.payments.initiatePayment(actor, {
    obligationId: elOb.id,
    methodId: "method-mm",
    amount: "10000",
    currency: "KES",
    idempotencyKey: "mm-full",
  });
  const elReceipt = await electronic.receipts.getByTransaction(actor, elPay.transaction.id);
  results.push({
    name: "tc-02:successful-electronic-creates-receipt",
    ok: elReceipt?.amount === "10000" && elReceipt.methodId === "method-mm",
  });
  results.push({
    name: "tc-06:receipt-contains-amount-currency",
    ok: elReceipt?.amount === "10000" && elReceipt.currencyCode === "KES",
  });
  results.push({
    name: "tc-07:receipt-contains-method-network-provider-channel",
    ok:
      elReceipt?.methodId === "method-mm" &&
      elReceipt.networkId === "rail-mm-1" &&
      elReceipt.providerId === "provider-mm-1" &&
      elReceipt.channelId === "channel-mm-1",
  });
  results.push({
    name: "tc-08:electronic-receipt-contains-provider-reference",
    ok: Boolean(elReceipt?.providerTransactionReference),
    detail: elReceipt?.providerTransactionReference ?? "missing",
  });

  const pending = harness({
    adapter: new ScriptedPaymentInitiationAdapter({ outcome: "PENDING" }),
  });
  const pendingOb = await pending.obligations.createObligation(actor, { orderId: "order-1" });
  const pendingPay = await pending.payments.initiatePayment(actor, {
    obligationId: pendingOb.id,
    methodId: "method-mm",
    amount: "4000",
    currency: "KES",
    idempotencyKey: "pending-1",
  });
  results.push({
    name: "tc-03:pending-payment-rejects-receipt",
    ok:
      pending.store.receipts.size === 0 &&
      (await expectError(
        () =>
          pending.receipts.issueReceipt(actor, {
            paymentTransactionId: pendingPay.transaction.id,
          }),
        PAYMENT_ERROR_CODES.RECEIPT_NOT_ELIGIBLE
      )),
  });

  const failed = harness({
    adapter: new ScriptedPaymentInitiationAdapter({
      outcome: "FAILED",
      failureCode: "PAYMENT_PROVIDER_REJECTED",
      failureReason: "Declined",
    }),
  });
  const failedOb = await failed.obligations.createObligation(actor, { orderId: "order-1" });
  const failedPay = await failed.payments.initiatePayment(actor, {
    obligationId: failedOb.id,
    methodId: "method-mm",
    amount: "4000",
    currency: "KES",
    idempotencyKey: "failed-1",
  });
  results.push({
    name: "tc-04:failed-payment-rejects-receipt",
    ok: await expectError(
      () =>
        failed.receipts.issueReceipt(actor, {
          paymentTransactionId: failedPay.transaction.id,
        }),
      PAYMENT_ERROR_CODES.RECEIPT_NOT_ELIGIBLE
    ),
  });

  const expired = harness({
    adapter: new ScriptedPaymentInitiationAdapter({ outcome: "EXPIRED" }),
  });
  const expiredOb = await expired.obligations.createObligation(actor, { orderId: "order-1" });
  const expiredPay = await expired.payments.initiatePayment(actor, {
    obligationId: expiredOb.id,
    methodId: "method-mm",
    amount: "4000",
    currency: "KES",
    idempotencyKey: "expired-1",
  });
  results.push({
    name: "tc-05:expired-payment-rejects-receipt",
    ok: await expectError(
      () =>
        expired.receipts.issueReceipt(actor, {
          paymentTransactionId: expiredPay.transaction.id,
        }),
      PAYMENT_ERROR_CODES.RECEIPT_NOT_ELIGIBLE
    ),
  });

  const missing = harness({
    numberingFailClosed: true,
    includeReceiptsOnInitiation: false,
  });
  const missingOb = await missing.obligations.createObligation(actor, { orderId: "order-1" });
  const missingPay = await missing.payments.initiatePayment(actor, {
    obligationId: missingOb.id,
    methodId: "method-cash",
    amount: "10000",
    currency: "KES",
    idempotencyKey: "cash-no-policy",
    confirmManual: true,
  });
  results.push({
    name: "tc-11:missing-numbering-policy-fails-closed",
    ok:
      missingPay.transaction.status === PAYMENT_STATUS_CODES.SUCCESSFUL &&
      (await expectError(
        () =>
          missing.receipts.issueReceipt(actor, {
            paymentTransactionId: missingPay.transaction.id,
          }),
        PAYMENT_ERROR_CODES.NUMBERING_POLICY_MISSING
      )),
  });

  const repeat = harness({ includeReceiptsOnInitiation: false });
  const repeatOb = await repeat.obligations.createObligation(actor, { orderId: "order-1" });
  const txn = await insertTransaction(repeat.store, repeatOb.id, { amount: "4000" });
  const first = await repeat.receipts.issueReceipt(actor, {
    paymentTransactionId: txn.id,
  });
  const receiptCalls = repeat.numbering.calls.filter((row) => row.documentType === "RECEIPT")
    .length;
  const second = await repeat.receipts.issueReceipt(actor, {
    paymentTransactionId: txn.id,
  });
  const opened = await repeat.receipts.getReceipt(actor, first.id);
  results.push({
    name: "tc-12:repeated-request-returns-existing-receipt",
    ok: second.id === first.id && second.receiptNumber === first.receiptNumber,
  });
  results.push({
    name: "tc-13:no-duplicate-receipt-number-for-same-payment",
    ok:
      repeat.store.receipts.size === 1 &&
      repeat.numbering.calls.filter((row) => row.documentType === "RECEIPT").length ===
        receiptCalls,
  });
  results.push({
    name: "tc-22:original-receipt-immutable",
    ok:
      opened.amount === "4000" &&
      opened.receiptNumber === first.receiptNumber &&
      opened.paymentTransactionId === txn.id,
  });
  results.push({
    name: "tc-30:view-does-not-create-another-receipt",
    ok:
      opened.id === first.id &&
      repeat.store.receipts.size === 1 &&
      repeat.audit.entries.some((row) => row.action === "RECEIPT_VIEWED"),
  });
  results.push({
    name: "tc-14:partial-payment-receipt-uses-payment-amount",
    ok: first.amount === "4000" && first.amount !== repeatOb.amountDue,
  });

  const split = harness({ includeReceiptsOnInitiation: false, amountDue: "10000" });
  const splitOb = await split.obligations.createObligation(actor, { orderId: "order-1" });
  const mm = await insertTransaction(split.store, splitOb.id, {
    amount: "5000",
    methodId: "method-mm",
  });
  const cashTxn = await insertTransaction(split.store, splitOb.id, {
    amount: "2000",
    methodId: "method-cash",
    methodName: "Cash",
    networkId: null,
    providerId: null,
    channelId: null,
    networkName: null,
    providerName: null,
    channelName: null,
    providerTransactionReference: null,
    captureMode: "MANUAL",
  });
  const bank = await insertTransaction(split.store, splitOb.id, {
    amount: "3000",
    methodId: "method-bank",
    methodName: "Bank Transfer",
    networkId: "rail-bank-1",
    providerId: "provider-bank-1",
    channelId: "channel-bank-1",
    networkName: "Bank rail",
    providerName: "Bank provider",
    channelName: "Bank app",
  });
  const r1 = await split.receipts.issueReceipt(actor, { paymentTransactionId: mm.id });
  const r2 = await split.receipts.issueReceipt(actor, { paymentTransactionId: cashTxn.id });
  const r3 = await split.receipts.issueReceipt(actor, { paymentTransactionId: bank.id });
  results.push({
    name: "tc-15:split-payments-have-separate-receipts",
    ok:
      new Set([r1.id, r2.id, r3.id]).size === 3 &&
      r1.amount === "5000" &&
      r2.amount === "2000" &&
      r3.amount === "3000" &&
      r1.methodName !== r2.methodName,
  });

  const billed = harness({ includeReceiptsOnInitiation: false, amountDue: "50000" });
  const billedOb = await billed.obligations.createObligation(actor, { orderId: "order-1" });
  const invoice = await billed.invoices.createInvoice(actor, {
    obligationId: billedOb.id,
    paymentTermCode: "NET_30",
  });
  await billed.invoices.issueInvoice(actor, { invoiceId: invoice.id });
  const billedTxn = await insertTransaction(billed.store, billedOb.id, { amount: "20000" });
  await billed.allocations.allocate(actor, {
    paymentTransactionId: billedTxn.id,
    amount: "20000",
    idempotencyKey: "alloc-inv",
  });
  const billedReceipt = await billed.receipts.issueReceipt(actor, {
    paymentTransactionId: billedTxn.id,
  });
  results.push({
    name: "tc-16:invoice-linked-receipt",
    ok: billedReceipt.invoiceId === invoice.id && billedReceipt.invoiceNumber === invoice.invoiceNumber,
  });
  results.push({
    name: "tc-18:allocation-information-from-ip03",
    ok:
      billedReceipt.allocations.length === 1 &&
      billedReceipt.allocations[0]?.allocatedAmount === "20000" &&
      billedReceipt.allocatedAmount === "20000",
  });

  const tenant = harness({ includeReceiptsOnInitiation: false });
  const tenantOb = await tenant.obligations.createObligation(actor, { orderId: "order-1" });
  const tenantTxn = await insertTransaction(tenant.store, tenantOb.id, { amount: "4000" });
  const tenantReceipt = await tenant.receipts.issueReceipt(actor, {
    paymentTransactionId: tenantTxn.id,
  });
  results.push({
    name: "tc-23:cross-business-receipt-access-fails",
    ok: await expectError(
      () => tenant.receipts.getReceipt(ctx("biz-b"), tenantReceipt.id),
      PAYMENT_ERROR_CODES.RECEIPT_NOT_FOUND
    ),
  });

  const delivery = harness({ includeReceiptsOnInitiation: false });
  const deliveryOb = await delivery.obligations.createObligation(actor, { orderId: "order-1" });
  const deliveryTxn = await insertTransaction(delivery.store, deliveryOb.id, {
    amount: "4000",
  });
  const deliveryReceipt = await delivery.receipts.issueReceipt(actor, {
    paymentTransactionId: deliveryTxn.id,
  });
  delivery.notifications.failNext = true;
  const afterFail = await delivery.receipts.requestDelivery(actor, {
    receiptId: deliveryReceipt.id,
    channel: "WHATSAPP",
  });
  const afterTxn = await delivery.store.transactionPort.findById("biz-a", deliveryTxn.id);
  results.push({
    name: "tc-24:delivery-failure-does-not-invalidate-receipt",
    ok:
      afterFail.status === "ISSUED" &&
      afterFail.deliveryStatus === "FAILED" &&
      afterTxn?.status === PAYMENT_STATUS_CODES.SUCCESSFUL &&
      delivery.audit.entries.some((row) => row.action === "RECEIPT_DELIVERY_FAILED"),
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
  if (process.env.IP05_SKIP_REGRESSION !== "1") {
    const packs: Array<[string, string, Record<string, string>]> = [
      [
        "tc-reg-ip01",
        "scripts/bp007-ip01-payment-obligation-foundation-smoke-validation.ts",
        { IP01_SKIP_REGRESSION: "1" },
      ],
      [
        "tc-reg-ip02",
        "scripts/bp007-ip02-payment-initiation-processing-smoke-validation.ts",
        { IP02_SKIP_REGRESSION: "1" },
      ],
      [
        "tc-reg-ip03",
        "scripts/bp007-ip03-partial-split-payment-allocation-smoke-validation.ts",
        { IP03_SKIP_REGRESSION: "1" },
      ],
      [
        "tc-reg-ip04",
        "scripts/bp007-ip04-billing-invoicing-credit-sales-smoke-validation.ts",
        { IP04_SKIP_REGRESSION: "1" },
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
