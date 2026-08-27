/**
 * Purpose:
 * Smoke-validate BP-007 / IP-04 Billing, Invoicing & Credit Sales.
 *
 * Usage:
 *   npx tsx scripts/bp007-ip04-billing-invoicing-credit-sales-smoke-validation.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import type { CurrentBusinessContext } from "@/core/auth/types";
import { ScriptedDocumentNumberingAdapter } from "@/core/localization-regulatory";
import {
  comparePaymentAmount,
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
  "drizzle/0064_bp007_ip004_billing_invoicing_credit_sales.sql",
  "src/db/schema/payment-invoice.ts",
  "src/db/schema/invoice-payment-term.ts",
  "src/db/schema/invoice-adjustment.ts",
  "src/db/schema/document-numbering-policy.ts",
  "src/modules/payments/services/payment-invoice-service.ts",
  "src/modules/payments/services/payment-invoice-rules.ts",
  "src/modules/payments/actions/payment-invoice-actions.ts",
  "src/core/localization-regulatory/services/document-numbering-service.ts",
  "src/core/receipting-engine/adapters/in-process-receipting-adapter.ts",
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
    expectedAmount: "50000",
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
        expectedPayable: "50000",
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
  contract?: PaymentReadyContract | null;
  flags?: PaymentEnablementFlags;
  currencies?: string[];
  adapter?: ScriptedPaymentInitiationAdapter;
  amountDue?: string;
  allowOverpayment?: boolean;
  numberingFailClosed?: boolean;
  now?: Date;
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
  const amountDue = options?.amountDue ?? "50000";
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
  const numbering = new ScriptedDocumentNumberingAdapter({
    failClosed: options?.numberingFailClosed ?? false,
  });
  const receipting = new InProcessReceiptingAdapter();
  const clock = new ConfigurableInvoiceClock(
    options?.now ?? new Date("2026-08-01T00:00:00.000Z")
  );
  const invoices = new PaymentInvoiceService({
    obligations: store,
    invoices: store.invoicePort,
    terms: store.termPort,
    enablement,
    numbering,
    receipting,
    idempotency: store.idempotencyPort,
    audit,
    clock,
  });
  return {
    store,
    audit,
    adapter,
    allocations,
    numbering,
    receipting,
    clock,
    invoices,
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
    amount: "20000",
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
  const files = [
    ...listSourceFiles(path.join(ROOT, "src/modules/payments")),
    ...listSourceFiles(path.join(ROOT, "src/core/receipting-engine")),
    ...listSourceFiles(path.join(ROOT, "src/app")).filter((file) => {
      const rel = file.replace(/\\/g, "/");
      return rel.includes("/payments/") || rel.includes("/invoices/");
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
  const invoiceService = stripComments(
    readFileSync(
      path.join(ROOT, "src/modules/payments/services/payment-invoice-service.ts"),
      "utf8"
    )
  );
  const invoiceRules = stripComments(
    readFileSync(
      path.join(ROOT, "src/modules/payments/services/payment-invoice-rules.ts"),
      "utf8"
    )
  );
  const invoiceActions = stripComments(
    readFileSync(
      path.join(ROOT, "src/modules/payments/actions/payment-invoice-actions.ts"),
      "utf8"
    )
  );
  const numberingService = readFileSync(
    path.join(ROOT, "src/core/localization-regulatory/services/document-numbering-service.ts"),
    "utf8"
  );
  const receipting = stripComments(
    readFileSync(
      path.join(ROOT, "src/core/receipting-engine/adapters/in-process-receipting-adapter.ts"),
      "utf8"
    )
  );
  const migration = readFileSync(
    path.join(ROOT, "drizzle/0064_bp007_ip004_billing_invoicing_credit_sales.sql"),
    "utf8"
  );
  const panel = stripComments(
    readFileSync(
      path.join(ROOT, "src/modules/payments/components/payment-obligation-panel.tsx"),
      "utf8"
    )
  );
  const invoiceUi = stripComments(
    readFileSync(
      path.join(ROOT, "src/modules/payments/components/invoice-detail.tsx"),
      "utf8"
    ) +
      readFileSync(
        path.join(ROOT, "src/modules/payments/components/invoices-workspace.tsx"),
        "utf8"
      )
  );
  const methodsSeed = readFileSync(
    path.join(ROOT, "src/db/seeds/payment-methods.ts"),
    "utf8"
  );
  const ip04 = `${invoiceService}\n${invoiceRules}\n${invoiceActions}\n${receipting}`;
  return [
    {
      name: "tc-07:no-commercial-recalculation",
      ok:
        !/sales_order_line|grandTotal|lineTotal|quantity\s*\*|price\s*\*/.test(ip04) &&
        !invoiceService.includes("from \"@/db/schema/sales-order\"") &&
        scan.orderLineTotalHits.length === 0,
      detail: scan.orderLineTotalHits.join(", "),
    },
    {
      name: "tc-04:numbering-delegated-to-eng-003b",
      ok:
        invoiceService.includes("numbering.allocate") &&
        numberingService.includes("ConfigurableDocumentNumberingService") &&
        !/INV-\$\{/.test(invoiceService) &&
        !invoiceService.includes("padStart"),
    },
    {
      name: "tc-17:document-generation-through-eng-007",
      ok:
        invoiceService.includes("receipting.produceFinancialDocument") &&
        receipting.includes("produceFinancialDocument") &&
        !/pdfkit|puppeteer|jspdf/i.test(ip04),
    },
    {
      name: "tc-18:no-provider-sdk",
      ok: scan.sdkHits.length === 0,
      detail: scan.sdkHits.join(", "),
    },
    {
      name: "tc-19:no-direct-external-payment-http",
      ok: scan.httpHits.length === 0,
      detail: scan.httpHits.join(", "),
    },
    {
      name: "static:no-payment-initiation-in-invoice-service",
      ok:
        !invoiceService.includes("initiatePayment") &&
        !invoiceService.includes("createPaymentInitiationService"),
    },
    {
      name: "static:no-refund-settlement-collections",
      ok:
        !/initiateRefund|processRefund|createRefund|settlement matching|dunning|collector assignment|collection case|reminder engine/i.test(
          ip04
        ) &&
        !/CREATE TABLE IF NOT EXISTS "(receipt|refund|settlement|collection)/i.test(
          migration
        ) &&
        !/dunning|collector|collection case/i.test(invoiceUi),
    },
    {
      name: "tc-14:overdue-is-status-only",
      ok:
        !/dunning|collector|collection case|automated recovery/i.test(ip04) &&
        !/dunning|collector|collection case/i.test(invoiceUi),
    },
    {
      name: "tc-22:credit-not-a-payment-method",
      ok:
        scan.creditTenderHits.length === 0 &&
        !/code:\s*["']CREDIT["']/.test(methodsSeed) &&
        defaultCatalogueFixture().methods.every((row) => row.code !== "CREDIT"),
      detail: scan.creditTenderHits.join(", "),
    },
    {
      name: "ux:no-engine-jargon",
      ok:
        !panel.includes("BP-007") &&
        !panel.includes("IP-04") &&
        !panel.includes("ENG-003b") &&
        !panel.includes("ENG-007") &&
        !invoiceUi.includes("BP-007") &&
        !invoiceUi.includes("IP-04") &&
        !invoiceUi.includes("ENG-003b") &&
        !invoiceUi.includes("ENG-007"),
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

  const cash = harness({ amountDue: "10000" });
  const cashOb = await cash.obligations.createObligation(actor, { orderId: "order-1" });
  await cash.payments.initiatePayment(actor, {
    obligationId: cashOb.id,
    methodId: "method-cash",
    amount: "10000",
    currency: "KES",
    idempotencyKey: "cash-full",
    confirmManual: true,
  });
  results.push({
    name: "tc-01:fully-paid-cash-sale-without-invoice",
    ok:
      cashOb.amountDue === "10000" &&
      (await cash.obligations.getObligation(actor, cashOb.id)).outstandingAmount === "0" &&
      cash.store.invoices.size === 0,
  });

  const disabled = harness({
    flags: { ...DEFAULT_FLAGS, creditSalesEnabled: false },
  });
  const disabledOb = await disabled.obligations.createObligation(actor, {
    orderId: "order-1",
  });
  results.push({
    name: "tc-02:credit-invoice-blocked-when-disabled",
    ok: await expectError(
      () =>
        disabled.invoices.createInvoice(actor, {
          obligationId: disabledOb.id,
          paymentTermCode: "NET_30",
        }),
      PAYMENT_ERROR_CODES.CREDIT_SALES_DISABLED
    ),
  });

  const enabled = harness();
  const enabledOb = await enabled.obligations.createObligation(actor, {
    orderId: "order-1",
  });
  const obligationCountBefore = enabled.store.obligations.size;
  const created = await enabled.invoices.createInvoice(actor, {
    obligationId: enabledOb.id,
    paymentTermCode: "NET_7",
  });
  results.push({
    name: "tc-03:credit-invoice-allowed-when-enabled",
    ok:
      created.status === "DRAFT" &&
      created.invoiceAmount === "50000" &&
      created.outstandingAmount === "50000",
  });
  results.push({
    name: "tc-04:invoice-number-from-eng-003b",
    ok:
      enabled.numbering.calls.length >= 1 &&
      enabled.numbering.calls[0]?.documentType === "INVOICE" &&
      created.invoiceNumber === "POL-INV-000001",
    detail: created.invoiceNumber,
  });
  results.push({
    name: "tc-06:invoice-amount-from-obligation-provenance",
    ok:
      created.invoiceAmount === enabledOb.amountDue &&
      created.amountDueSnapshot === enabledOb.amountDue &&
      created.commercialContractId === "ctc-1" &&
      created.snapshotId === "11111111-1111-1111-1111-111111111111",
  });
  results.push({
    name: "tc-23:invoice-does-not-create-second-obligation",
    ok: enabled.store.obligations.size === obligationCountBefore,
  });
  results.push({
    name: "tc-17:eng-007-document-requested-on-create",
    ok:
      enabled.receipting.produceCalls.some(
        (row) => row.documentType === "INVOICE" && row.documentState === "DRAFT"
      ) && created.documentId !== null,
  });

  const missingPolicy = harness({ numberingFailClosed: true });
  const missingOb = await missingPolicy.obligations.createObligation(actor, {
    orderId: "order-1",
  });
  results.push({
    name: "tc-05:missing-numbering-policy-fails-closed",
    ok: await expectError(
      () =>
        missingPolicy.invoices.createInvoice(actor, {
          obligationId: missingOb.id,
          paymentTermCode: "NET_30",
        }),
      PAYMENT_ERROR_CODES.NUMBERING_POLICY_MISSING
    ),
  });

  const termsH = harness();
  const termsOb = await termsH.obligations.createObligation(actor, {
    orderId: "order-1",
  });
  const draft = await termsH.invoices.createInvoice(actor, {
    obligationId: termsOb.id,
    paymentTermCode: "NET_7",
  });
  const issued = await termsH.invoices.issueInvoice(actor, { invoiceId: draft.id });
  const issueDate = issued.issueDate ? new Date(issued.issueDate) : null;
  const dueDate = issued.dueDate ? new Date(issued.dueDate) : null;
  results.push({
    name: "tc-08:due-date-from-configured-terms",
    ok:
      issueDate !== null &&
      dueDate !== null &&
      dueDate.getTime() - issueDate.getTime() === 7 * 24 * 60 * 60 * 1000 &&
      issued.paymentTermCode === "NET_7",
    detail: issued.dueDate ?? "missing",
  });
  results.push({
    name: "tc-09:zero-allocation-is-issued-unpaid",
    ok:
      issued.status === "ISSUED" &&
      issued.paidAmount === "0" &&
      issued.outstandingAmount === "50000",
  });

  const pendingH = harness({
    adapter: new ScriptedPaymentInitiationAdapter({ outcome: "PENDING" }),
  });
  const pendingOb = await pendingH.obligations.createObligation(actor, {
    orderId: "order-1",
  });
  const pendingInvoice = await pendingH.invoices.createInvoice(actor, {
    obligationId: pendingOb.id,
    paymentTermCode: "NET_30",
  });
  await pendingH.invoices.issueInvoice(actor, { invoiceId: pendingInvoice.id });
  const pendingPay = await pendingH.payments.initiatePayment(actor, {
    obligationId: pendingOb.id,
    methodId: "method-mm",
    amount: "20000",
    currency: "KES",
    idempotencyKey: "pending-pay",
  });
  const afterPending = await pendingH.invoices.getInvoice(actor, pendingInvoice.id);
  results.push({
    name: "tc-12:pending-failed-do-not-make-invoice-paid",
    ok:
      pendingPay.transaction.status === PAYMENT_STATUS_CODES.PENDING &&
      afterPending.status === "ISSUED" &&
      afterPending.paidAmount === "0" &&
      afterPending.outstandingAmount === "50000",
    detail: `${pendingPay.transaction.status}/${afterPending.status}`,
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
  const failedInvoice = await failedH.invoices.createInvoice(actor, {
    obligationId: failedOb.id,
    paymentTermCode: "NET_30",
  });
  await failedH.invoices.issueInvoice(actor, { invoiceId: failedInvoice.id });
  await failedH.payments.initiatePayment(actor, {
    obligationId: failedOb.id,
    methodId: "method-mm",
    amount: "20000",
    currency: "KES",
    idempotencyKey: "failed-pay",
  });
  const afterFailed = await failedH.invoices.getInvoice(actor, failedInvoice.id);
  results.push({
    name: "tc-12b:failed-payment-does-not-make-invoice-paid",
    ok: afterFailed.status === "ISSUED" && afterFailed.paidAmount === "0",
  });

  const settle = harness();
  const settleOb = await settle.obligations.createObligation(actor, {
    orderId: "order-1",
  });
  const settleInvoice = await settle.invoices.createInvoice(actor, {
    obligationId: settleOb.id,
    paymentTermCode: "NET_30",
  });
  await settle.invoices.issueInvoice(actor, { invoiceId: settleInvoice.id });
  const firstTxn = await insertSuccessfulTransaction(settle.store, settleOb.id, {
    amount: "20000",
  });
  await settle.allocations.allocate(actor, {
    paymentTransactionId: firstTxn.id,
    amount: "20000",
    idempotencyKey: "alloc-partial",
  });
  const partial = await settle.invoices.getInvoice(actor, settleInvoice.id);
  results.push({
    name: "tc-10:partial-allocation-partially-paid",
    ok:
      partial.status === "PARTIALLY_PAID" &&
      partial.paidAmount === "20000" &&
      partial.outstandingAmount === "30000",
    detail: `${partial.status}/${partial.paidAmount}/${partial.outstandingAmount}`,
  });
  results.push({
    name: "tc-24:invoice-status-reflects-ip03-allocations",
    ok:
      settle.audit.entries.some((row) => row.action === "INVOICE_ALLOCATION_REFLECTED") &&
      comparePaymentAmount(partial.paidAmount, "20000") === 0,
  });

  const secondTxn = await insertSuccessfulTransaction(settle.store, settleOb.id, {
    amount: "30000",
  });
  await settle.allocations.allocate(actor, {
    paymentTransactionId: secondTxn.id,
    amount: "30000",
    idempotencyKey: "alloc-full",
  });
  const paid = await settle.invoices.getInvoice(actor, settleInvoice.id);
  results.push({
    name: "tc-11:full-allocation-paid",
    ok: paid.status === "PAID" && paid.paidAmount === "50000" && paid.outstandingAmount === "0",
  });

  const overdueH = harness();
  const overdueOb = await overdueH.obligations.createObligation(actor, {
    orderId: "order-1",
  });
  const overdueDraft = await overdueH.invoices.createInvoice(actor, {
    obligationId: overdueOb.id,
    paymentTermCode: "NET_7",
  });
  await overdueH.invoices.issueInvoice(actor, { invoiceId: overdueDraft.id });
  overdueH.clock.setNow(new Date("2026-08-10T00:00:00.000Z"));
  const overdue = await overdueH.invoices.getInvoice(actor, overdueDraft.id);
  results.push({
    name: "tc-13:past-due-unpaid-becomes-overdue",
    ok: overdue.status === "OVERDUE" && overdue.outstandingAmount === "50000",
    detail: overdue.status,
  });
  results.push({
    name: "tc-14:overdue-does-not-create-collection-workflow",
    ok:
      overdueH.audit.entries.some((row) => row.action === "INVOICE_OVERDUE") &&
      !overdueH.audit.entries.some((row) => /COLLECTION|DUNNING|REMINDER/.test(row.action)),
  });

  const cancelH = harness();
  const cancelOb = await cancelH.obligations.createObligation(actor, {
    orderId: "order-1",
  });
  const cancelDraft = await cancelH.invoices.createInvoice(actor, {
    obligationId: cancelOb.id,
    paymentTermCode: "NET_30",
  });
  const issuedCancel = await cancelH.invoices.issueInvoice(actor, {
    invoiceId: cancelDraft.id,
  });
  const cancelled = await cancelH.invoices.cancelInvoice(actor, {
    invoiceId: issuedCancel.id,
    reason: "Customer cancelled the sale",
  });
  results.push({
    name: "tc-15:cancelled-invoice-blocks-new-billing",
    ok:
      cancelled.status === "CANCELLED" &&
      (await expectError(
        () =>
          cancelH.invoices.issueInvoice(actor, {
            invoiceId: cancelled.id,
          }),
        PAYMENT_ERROR_CODES.INVOICE_ALREADY_CANCELLED
      )) &&
      (await expectError(
        () =>
          cancelH.invoices.createInvoice(actor, {
            obligationId: cancelOb.id,
            paymentTermCode: "NET_30",
          }),
        PAYMENT_ERROR_CODES.INVOICE_ALREADY_CANCELLED
      )),
  });
  const afterCancel = await cancelH.invoices.getInvoice(actor, cancelled.id);
  results.push({
    name: "tc-16:cancelled-invoice-remains-auditable",
    ok:
      afterCancel.status === "CANCELLED" &&
      afterCancel.id === cancelled.id &&
      cancelH.audit.entries.some((row) => row.action === "INVOICE_CANCELLED") &&
      cancelH.audit.entries.some((row) => row.action === "INVOICE_CREATED"),
  });

  const tenant = harness();
  const tenantOb = await tenant.obligations.createObligation(actor, {
    orderId: "order-1",
  });
  const tenantInvoice = await tenant.invoices.createInvoice(actor, {
    obligationId: tenantOb.id,
    paymentTermCode: "NET_30",
  });
  const other = ctx("biz-b");
  results.push({
    name: "tc-20:cross-business-invoice-access-fails",
    ok: await expectError(
      () => tenant.invoices.getInvoice(other, tenantInvoice.id),
      PAYMENT_ERROR_CODES.INVOICE_NOT_FOUND
    ),
  });
  const tenantTxn = await insertSuccessfulTransaction(tenant.store, tenantOb.id, {
    amount: "20000",
  });
  results.push({
    name: "tc-21:cross-business-allocation-cannot-be-applied",
    ok: await expectError(
      () =>
        tenant.allocations.allocate(other, {
          paymentTransactionId: tenantTxn.id,
          amount: "20000",
          idempotencyKey: "cross-alloc",
        }),
      PAYMENT_ERROR_CODES.TRANSACTION_NOT_FOUND
    ),
  });

  const overpay = harness();
  const overpayOb = await overpay.obligations.createObligation(actor, {
    orderId: "order-1",
  });
  const overpayInvoice = await overpay.invoices.createInvoice(actor, {
    obligationId: overpayOb.id,
    paymentTermCode: "NET_30",
  });
  await overpay.invoices.issueInvoice(actor, { invoiceId: overpayInvoice.id });
  const overpayTxn = await insertSuccessfulTransaction(overpay.store, overpayOb.id, {
    amount: "60000",
  });
  const overpayBlocked = await expectError(
    () =>
      overpay.allocations.allocate(actor, {
        paymentTransactionId: overpayTxn.id,
        amount: "60000",
        idempotencyKey: "overpay-1",
      }),
    PAYMENT_ERROR_CODES.ALLOCATION_EXCEEDS_OBLIGATION
  );
  const afterOverpay = await overpay.invoices.getInvoice(actor, overpayInvoice.id);
  const afterObligation = await overpay.obligations.getObligation(actor, overpayOb.id);
  results.push({
    name: "tc-25:overpayment-does-not-increase-amount-due",
    ok:
      overpayBlocked &&
      afterOverpay.invoiceAmount === "50000" &&
      afterOverpay.amountDueSnapshot === "50000" &&
      afterObligation.amountDue === "50000",
  });

  const paidCreditH = harness();
  const paidCreditOb = await paidCreditH.obligations.createObligation(actor, {
    orderId: "order-1",
  });
  const paidCreditInvoice = await paidCreditH.invoices.createInvoice(actor, {
    obligationId: paidCreditOb.id,
    paymentTermCode: "NET_30",
  });
  await paidCreditH.invoices.issueInvoice(actor, { invoiceId: paidCreditInvoice.id });
  const creditTxn = await insertSuccessfulTransaction(paidCreditH.store, paidCreditOb.id, {
    amount: "20000",
  });
  await paidCreditH.allocations.allocate(actor, {
    paymentTransactionId: creditTxn.id,
    amount: "20000",
    idempotencyKey: "credit-link",
  });
  const withPaid = await paidCreditH.invoices.getInvoice(actor, paidCreditInvoice.id);
  const cancelledPaid = await paidCreditH.invoices.cancelInvoice(actor, {
    invoiceId: withPaid.id,
    reason: "Billing reversed pending correction",
  });
  results.push({
    name: "static:credit-linkage-on-cancel-with-payments",
    ok:
      cancelledPaid.adjustments.some((row) => row.adjustmentType === "CREDIT_NOTE") &&
      paidCreditH.audit.entries.some(
        (row) => row.action === "INVOICE_CREDIT_LINKAGE_CREATED"
      ),
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
  if (process.env.IP04_SKIP_REGRESSION !== "1") {
    if (
      existsSync(
        path.join(ROOT, "scripts/bp007-ip01-payment-obligation-foundation-smoke-validation.ts")
      )
    ) {
      const ip01 = runExternal(
        "scripts/bp007-ip01-payment-obligation-foundation-smoke-validation.ts",
        { IP01_SKIP_REGRESSION: "1" }
      );
      regressionResults.push({ ...ip01, name: "tc-26:existing-ip01-smoke-passes" });
    }
    if (
      existsSync(
        path.join(ROOT, "scripts/bp007-ip02-payment-initiation-processing-smoke-validation.ts")
      )
    ) {
      const ip02 = runExternal(
        "scripts/bp007-ip02-payment-initiation-processing-smoke-validation.ts",
        { IP02_SKIP_REGRESSION: "1" }
      );
      regressionResults.push({ ...ip02, name: "tc-27:existing-ip02-smoke-passes" });
    }
    if (
      existsSync(
        path.join(ROOT, "scripts/bp007-ip03-partial-split-payment-allocation-smoke-validation.ts")
      )
    ) {
      const ip03 = runExternal(
        "scripts/bp007-ip03-partial-split-payment-allocation-smoke-validation.ts",
        { IP03_SKIP_REGRESSION: "1" }
      );
      regressionResults.push({ ...ip03, name: "tc-28:existing-ip03-smoke-passes" });
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
