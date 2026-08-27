/**
 * Purpose:
 * Smoke-validate BP-007 / IP-01 Payment Obligation & Provider Integration Foundation.
 *
 * Usage:
 *   npx tsx scripts/bp007-ip01-payment-obligation-foundation-smoke-validation.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  createCatalogueCapabilityPaymentEngine,
  PAYMENT_ENGINE_ERROR_CODES,
  PaymentEngineError,
} from "@/core/payment-engine";
import { InMemoryCurrencyReference } from "@/modules/payments/adapters/currency-catalogue-adapter";
import {
  listSourceFiles,
  scanPaymentArchitecture,
} from "@/modules/payments/architecture-scan";
import {
  CREDIT_ENABLEMENT_FLAG,
  PAYMENT_ERROR_CODES,
  PAYMENT_IP01_STATUS,
  PAYMENT_STATUS_CODES,
  PaymentObligationError,
} from "@/modules/payments";
import type { PaymentEnablementPort, PaymentReadyContractPort } from "@/modules/payments/ports";
import { RecordingPaymentAudit } from "@/modules/payments/services/payment-obligation-audit-helper";
import { PaymentObligationService } from "@/modules/payments/services/payment-obligation-service";
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
  "drizzle/0061_bp007_ip001_payment_obligation_foundation.sql",
  "src/db/schema/payment-obligation.ts",
  "src/db/schema/payment-channel-capability.ts",
  "src/db/schema/payment-idempotency.ts",
  "src/core/payment-engine/ports.ts",
  "src/modules/payments/services/payment-obligation-service.ts",
  "src/modules/payments/services/payment-obligation-rules.ts",
  "src/modules/payments/services/payment-catalogue-rules.ts",
  "src/app/(authenticated)/(app)/payments/page.tsx",
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
}) {
  const store = new InMemoryPaymentStore();
  store.seedCatalogue(defaultCatalogueFixture());
  const audit = new RecordingPaymentAudit();
  const flags = options?.flags ?? DEFAULT_FLAGS;
  const enablement: PaymentEnablementPort = {
    async getFlags() {
      return flags;
    },
  };
  let contract: PaymentReadyContract | null =
    options?.contract === undefined ? validContract() : options.contract;
  const contracts: PaymentReadyContractPort = {
    async getByOrderId(_context, orderId) {
      if (!contract || contract.orderId !== orderId) {
        return null;
      }
      return contract;
    },
  };
  const service = new PaymentObligationService({
    contracts,
    obligations: store,
    idempotency: store.idempotencyPort,
    catalogues: store,
    engine: createCatalogueCapabilityPaymentEngine(new InMemoryCapabilityStore(store)),
    enablement,
    currencies: new InMemoryCurrencyReference(new Set(options?.currencies ?? ["KES"])),
    audit,
  });
  return {
    store,
    audit,
    service,
    setContract(next: PaymentReadyContract | null) {
      contract = next;
    },
  };
}

function checkFiles(): SmokeResult[] {
  return REQUIRED_FILES.map((relative) => ({
    name: `files:${relative}`,
    ok: existsSync(path.join(ROOT, relative)),
  }));
}

function checkUxLanguage(): SmokeResult[] {
  const workspace = readFileSync(
    path.join(ROOT, "src/modules/payments/components/payments-workspace.tsx"),
    "utf8"
  );
  const panel = readFileSync(
    path.join(ROOT, "src/modules/payments/components/payment-obligation-panel.tsx"),
    "utf8"
  );
  const visible = `${workspace}\n${panel}`.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  return [
    {
      name: "ux:no-engine-jargon",
      ok:
        !visible.includes("BP-007") &&
        !visible.includes("IP-01") &&
        !visible.includes("ENG-006") &&
        !visible.includes("CommercialTransactionContract"),
    },
    {
      name: "ux:simple-payment-language",
      ok:
        panel.includes("Amount due") &&
        panel.includes("How the customer can pay") &&
        workspace.includes("Record the amount due"),
    },
  ];
}

function checkNoFutureIps(): SmokeResult {
  const service = readFileSync(
    path.join(ROOT, "src/modules/payments/services/payment-obligation-service.ts"),
    "utf8"
  );
  return {
    name: "boundary:no-ip02-execution",
    ok:
      !service.includes(".initiatePayment(") &&
      !service.includes(".refundPayment(") &&
      !service.includes(".queryPayment(") &&
      !service.includes("stkPush") &&
      service.includes("PAYMENT_IP01_STATUS"),
  };
}

function checkArchitecture(): SmokeResult[] {
  const paymentRoot = path.join(ROOT, "src/modules/payments");
  const engineRoot = path.join(ROOT, "src/core/payment-engine");
  const files = [
    ...listSourceFiles(paymentRoot),
    ...listSourceFiles(engineRoot),
  ].filter((file) => {
    const rel = file.replace(/\\/g, "/");
    return (
      !rel.includes("/services/payment-memory-store.ts") &&
      !rel.includes("/architecture-scan.ts")
    );
  });
  const scan = scanPaymentArchitecture(files);
  const seeds = readFileSync(path.join(ROOT, "src/db/seeds/payment-methods.ts"), "utf8");
  return [
    {
      name: "tc-18:no-provider-sdk-imports",
      ok: scan.sdkHits.length === 0,
      detail: scan.sdkHits.join(", "),
    },
    {
      name: "tc-19:no-provider-http",
      ok: scan.httpHits.length === 0,
      detail: scan.httpHits.join(", "),
    },
    {
      name: "tc-15:no-hard-coded-limits",
      ok: scan.limitHits.length === 0,
      detail: scan.limitHits.join(", "),
    },
    {
      name: "static:no-hard-coded-routing",
      ok: scan.routingHits.length === 0,
      detail: scan.routingHits.join(", "),
    },
    {
      name: "tc-13:seed-has-no-credit-method",
      ok: !seeds.includes('code: "CREDIT"') && !seeds.includes(CREDIT_ENABLEMENT_FLAG),
    },
    {
      name: "tc-23:obligation-does-not-use-sales-order-schema",
      ok: scan.orderLineTotalHits.length === 0,
      detail: scan.orderLineTotalHits.join(", "),
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
  const created = await h.service.createObligation(ctx("biz-a"), { orderId: "order-1" });

  results.push({
    name: "tc-01:valid-contract-creates-obligation",
    ok:
      created.amountDue === "10000" &&
      created.paidAmount === "0" &&
      created.outstandingAmount === "10000" &&
      created.paymentStatus === PAYMENT_IP01_STATUS &&
      created.providerTransactionReference === null &&
      created.currencyCode === "KES" &&
      created.salesOrderId === "order-1" &&
      h.audit.entries.some((row) => row.outcome === "SUCCESS"),
    detail: `due=${created.amountDue} paid=${created.paidAmount} status=${created.paymentStatus}`,
  });

  results.push({
    name: "tc-22:currency-copied-from-contract",
    ok: created.currencyCode === "KES",
  });

  const missing = harness({ contract: null });
  results.push({
    name: "tc-02:missing-contract-fails",
    ok: await expectError(
      () => missing.service.createObligation(ctx("biz-a"), { orderId: "order-missing" }),
      PAYMENT_ERROR_CODES.CONTRACT_MISSING
    ),
  });

  const tamper = harness();
  results.push({
    name: "tc-03:tampered-contract-fails",
    ok: await expectError(
      () =>
        tamper.service.createObligation(ctx("biz-a"), {
          orderId: "order-1",
          claimedContract: { expectedAmount: "1" },
        }),
      PAYMENT_ERROR_CODES.CONTRACT_TAMPERED
    ),
  });

  const cross = harness({
    contract: validContract({ businessId: "biz-b" }),
  });
  results.push({
    name: "tc-04:cross-business-contract-fails",
    ok: await expectError(
      () => cross.service.createObligation(ctx("biz-a"), { orderId: "order-1" }),
      PAYMENT_ERROR_CODES.CROSS_BUSINESS_ACCESS
    ),
  });

  const nullAmount = harness({
    contract: validContract({ expectedAmount: null }),
  });
  results.push({
    name: "tc-05:null-amount-fails",
    ok: await expectError(
      () => nullAmount.service.createObligation(ctx("biz-a"), { orderId: "order-1" }),
      PAYMENT_ERROR_CODES.AMOUNT_DUE_MISSING
    ),
  });

  const missingCurrency = harness({
    contract: validContract({ currency: "" }),
  });
  results.push({
    name: "tc-06:missing-currency-fails",
    ok: await expectError(
      () => missingCurrency.service.createObligation(ctx("biz-a"), { orderId: "order-1" }),
      PAYMENT_ERROR_CODES.CURRENCY_MISSING
    ),
  });

  const inactiveMethod = harness();
  const snapshot = inactiveMethod.store.snapshot;
  snapshot.methods = snapshot.methods.map((row) =>
    row.code === "CASH" ? { ...row, isActive: false } : row
  );
  const createdInactive = await inactiveMethod.service.createObligation(ctx("biz-a"), {
    orderId: "order-1",
  });
  results.push({
    name: "tc-07:inactive-method-not-eligible",
    ok: !createdInactive.eligibleOptions.some((row) => row.methodCode === "CASH"),
  });

  const inactiveRail = harness();
  inactiveRail.store.snapshot.networks = inactiveRail.store.snapshot.networks.map((row) =>
    row.paymentMethodId === "method-mm" ? { ...row, isActive: false } : row
  );
  const createdRail = await inactiveRail.service.createObligation(ctx("biz-a"), {
    orderId: "order-1",
  });
  results.push({
    name: "tc-08:inactive-rail-not-eligible",
    ok: !createdRail.eligibleOptions.some((row) => row.methodCode === "MOBILE_MONEY"),
  });

  const inactiveProvider = harness();
  inactiveProvider.store.snapshot.providers =
    inactiveProvider.store.snapshot.providers.map((row) =>
      row.paymentNetworkId === "rail-mm-1" ? { ...row, isActive: false } : row
    );
  const createdProvider = await inactiveProvider.service.createObligation(ctx("biz-a"), {
    orderId: "order-1",
  });
  results.push({
    name: "tc-09:inactive-provider-not-eligible",
    ok: !createdProvider.eligibleOptions.some((row) => row.methodCode === "MOBILE_MONEY"),
  });

  const inactiveChannel = harness();
  inactiveChannel.store.snapshot.channels = inactiveChannel.store.snapshot.channels.map(
    (row) => (row.paymentProviderId === "provider-mm-1" ? { ...row, isActive: false } : row)
  );
  const createdChannel = await inactiveChannel.service.createObligation(ctx("biz-a"), {
    orderId: "order-1",
  });
  results.push({
    name: "tc-10:inactive-channel-not-eligible",
    ok: !createdChannel.eligibleOptions.some((row) => row.methodCode === "MOBILE_MONEY"),
  });

  results.push({
    name: "tc-11:cash-without-rail-provider-channel",
    ok: created.eligibleOptions.some(
      (row) =>
        row.methodCode === "CASH" &&
        row.requiresElectronicRail === false &&
        row.railId === null &&
        row.providerId === null &&
        row.channelId === null
    ),
  });

  results.push({
    name: "tc-12:mobile-money-requires-configured-path",
    ok: created.eligibleOptions.some(
      (row) =>
        row.methodCode === "MOBILE_MONEY" &&
        Boolean(row.railId) &&
        Boolean(row.providerId) &&
        Boolean(row.channelId)
    ),
  });

  const creditHarness = harness();
  creditHarness.store.snapshot.methods.push({
    id: "method-credit",
    code: "CREDIT",
    name: "Credit",
    description: "Must not be a tender",
    customerLabel: "Credit",
    displayOrder: 99,
    isActive: true,
    requiresRail: false,
    requiresProvider: false,
    requiresChannel: false,
    enablementFlag: CREDIT_ENABLEMENT_FLAG,
  });
  const createdCredit = await creditHarness.service.createObligation(ctx("biz-a"), {
    orderId: "order-1",
  });
  results.push({
    name: "tc-13:credit-sales-is-not-a-payment-method",
    ok: !createdCredit.eligibleOptions.some(
      (row) => row.methodCode === "CREDIT" || row.label === "Credit"
    ),
  });

  const limitHarness = harness();
  limitHarness.store.snapshot.capabilities = limitHarness.store.snapshot.capabilities.map(
    (row) =>
      row.paymentChannelId === "channel-mm-1" ? { ...row, maxAmount: "5000" } : row
  );
  const limited = await limitHarness.service.createObligation(ctx("biz-a"), {
    orderId: "order-1",
  });
  results.push({
    name: "tc-14:limits-come-from-adapter-metadata",
    ok: !limited.eligibleOptions.some((row) => row.methodCode === "MOBILE_MONEY"),
  });

  limitHarness.store.snapshot.capabilities = limitHarness.store.snapshot.capabilities.map(
    (row) =>
      row.paymentChannelId === "channel-mm-1" ? { ...row, maxAmount: "20000" } : row
  );
  const withinLimit = await limitHarness.service.listEligibleOptions(ctx("biz-a"), {
    amount: "10000",
    currency: "KES",
  });
  results.push({
    name: "tc-14b:raising-configured-limit-restores-eligibility",
    ok: withinLimit.some((row) => row.methodCode === "MOBILE_MONEY" && row.maxAmount === "20000"),
  });

  const idempotent = harness();
  const first = await idempotent.service.createObligation(ctx("biz-a"), {
    orderId: "order-1",
    idempotencyKey: "key-1",
  });
  const second = await idempotent.service.createObligation(ctx("biz-a"), {
    orderId: "order-1",
    idempotencyKey: "key-1",
  });
  results.push({
    name: "tc-16:idempotency-prevents-duplicate",
    ok: first.id === second.id && idempotent.store.obligations.size === 1,
    detail: `count=${idempotent.store.obligations.size}`,
  });

  results.push({
    name: "tc-17:cross-business-read-fails",
    ok: await expectError(
      () => h.service.getObligation(ctx("biz-b"), created.id),
      PAYMENT_ERROR_CODES.OBLIGATION_NOT_FOUND
    ),
  });

  const extra = harness();
  extra.store.snapshot.providers.push({
    id: "provider-mm-2",
    paymentNetworkId: "rail-mm-1",
    code: "PROVIDER_MM_SECONDARY",
    name: "Second mobile provider",
    description: null,
    integrationRef: null,
    displayOrder: 2,
    isActive: true,
  });
  extra.store.snapshot.channels.push({
    id: "channel-mm-2",
    paymentProviderId: "provider-mm-2",
    code: "CHANNEL_MM_SECONDARY",
    name: "Second prompt",
    description: null,
    customerLabel: "M-Pesa",
    displayOrder: 2,
    isActive: true,
  });
  extra.store.snapshot.capabilities.push({
    id: "cap-channel-mm-2",
    paymentChannelId: "channel-mm-2",
    paymentProviderId: "provider-mm-2",
    minAmount: "1",
    maxAmount: null,
    dailyLimit: null,
    transactionLimit: null,
    supportedCurrencies: ["KES"],
    supportsInitiation: true,
    supportsRefund: false,
    supportsStatusQuery: true,
    isAvailable: true,
  });
  const withNewProvider = await extra.service.createObligation(ctx("biz-a"), {
    orderId: "order-1",
  });
  results.push({
    name: "tc-20:multiple-providers-without-logic-change",
    ok:
      withNewProvider.eligibleOptions.filter((row) => row.methodCode === "MOBILE_MONEY")
        .length >= 2,
  });
  results.push({
    name: "tc-21:new-provider-is-configuration-only",
    ok: withNewProvider.eligibleOptions.some((row) => row.providerId === "provider-mm-2"),
  });

  const engine = createCatalogueCapabilityPaymentEngine(
    new InMemoryCapabilityStore(h.store)
  );
  let executionBlocked = false;
  try {
    await engine.initiatePayment({
      businessId: "biz-a",
      obligationId: created.id,
      providerId: "provider-mm-1",
      channelId: "channel-mm-1",
      amount: "10000",
      currency: "KES",
    });
  } catch (error) {
    executionBlocked =
      error instanceof PaymentEngineError &&
      error.code === PAYMENT_ENGINE_ERROR_CODES.EXECUTION_NOT_AVAILABLE;
  }
  results.push({
    name: "boundary:initiate-not-implemented",
    ok: executionBlocked,
  });

  results.push({
    name: "status:ip01-uses-not-started-only",
    ok: created.paymentStatus === PAYMENT_STATUS_CODES.NOT_STARTED,
  });

  return results;
}

function runExternal(script: string): SmokeResult {
  const result = spawnSync(process.execPath, ["--import", "tsx", script], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 420_000,
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
    ...checkUxLanguage(),
    checkNoFutureIps(),
    ...checkArchitecture(),
    ...(await runCoreCases()),
  ];
  const regressionResults: SmokeResult[] = [];
  if (process.env.IP01_SKIP_REGRESSION !== "1") {
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
  const coreFailed = coreResults.filter((item) => !item.ok);
  const failed = results.filter((item) => !item.ok);
  for (const item of results) {
    console.log(
      `[${item.ok ? "PASS" : "FAIL"}] ${item.name}${item.detail ? ` — ${item.detail}` : ""}`
    );
  }
  console.log(
    `\nCore: ${coreResults.length - coreFailed.length}/${coreResults.length} passed. All checks: ${results.length - failed.length}/${results.length} passed.`
  );
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
