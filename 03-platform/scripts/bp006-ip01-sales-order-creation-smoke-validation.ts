/**
 * Purpose:
 * Smoke-validate BP-006 / IP-01 Sales & Order Creation.
 *
 * Usage:
 *   npx tsx scripts/bp006-ip01-sales-order-creation-smoke-validation.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  CommercialError,
  CommercialResolutionService,
  createDownstreamCommercialContractAdapter,
  createCommercialContractService,
  type ResolvedBasePrice,
} from "@/modules/commercial";
import { QUOTATION_STATUS_CODES } from "@/modules/crm/constants";
import { SALES_ORDER_STATUS_CODES } from "@/modules/sales/constants";
import { SalesOrderError } from "@/modules/sales/errors";
import type { CommercialContractPort } from "@/modules/sales/ports";
import { SalesOrderService } from "@/modules/sales/services/sales-order-service";
import { RecordingSalesAudit } from "@/modules/sales/services/sales-order-audit-helper";
import {
  InMemoryOfferingLookup,
  InMemoryPartyLookup,
  InMemoryQuotationLookup,
  InMemorySalesOrderStore,
} from "@/modules/sales/services/sales-order-memory-store";
import type { CreateDirectSaleLineInput } from "@/modules/sales/types";

const ROOT = path.resolve(__dirname, "..");

type SmokeResult = { name: string; ok: boolean; detail?: string };

const REQUIRED_FILES = [
  "drizzle/0057_bp006_ip001_sales_order_creation.sql",
  "src/db/schema/sales-order.ts",
  "src/modules/sales/constants.ts",
  "src/modules/sales/errors.ts",
  "src/modules/sales/types.ts",
  "src/modules/sales/ports.ts",
  "src/modules/sales/index.ts",
  "src/modules/sales/services/sales-order-rules.ts",
  "src/modules/sales/services/sales-order-service.ts",
  "src/modules/sales/services/sales-order-memory-store.ts",
  "src/modules/sales/services/sales-order-audit-helper.ts",
  "src/modules/sales/repositories/sales-order-repository.ts",
  "src/modules/sales/adapters/commercial-contract-adapter.ts",
  "src/modules/sales/adapters/master-lookup-adapter.ts",
  "src/modules/sales/actions/sales-order-actions.ts",
  "src/modules/sales/components/create-sale-wizard.tsx",
  "src/modules/sales/components/sales-dashboard.tsx",
  "src/modules/sales/components/sales-order-workspace.tsx",
  "src/modules/sales/sales-journey-handoff.ts",
  "src/app/(authenticated)/(app)/sales/page.tsx",
  "src/app/(authenticated)/(app)/sales/new/page.tsx",
  "src/app/(authenticated)/(app)/sales/[orderId]/page.tsx",
];

function ctx(businessId: string, userId = "maker-1"): CurrentBusinessContext {
  return {
    businessId,
    platformUserId: userId,
    businessMembershipId: `mem-${businessId}`,
  };
}

function fixtureResolvedBase(
  overrides: Partial<ResolvedBasePrice> = {}
): ResolvedBasePrice {
  return {
    unitPrice: 300,
    currencyCode: "KES",
    pricingMethod: "FIXED",
    pricingMethodLabel: "Fixed",
    pricingCatalogueId: "cat-1",
    catalogueCode: "DEFAULT",
    catalogueName: "Default",
    pricingItemId: "price-1",
    offeringId: "offering-1",
    offeringCode: "JA-ADV-001",
    offeringName: "Journey Alpha Advisory Service",
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveTo: null,
    effectiveAt: "2026-06-01T00:00:00.000Z",
    minimumPrice: null,
    maximumPrice: null,
    customerSegment: null,
    salesChannel: "WEB",
    region: null,
    provenance: {
      businessId: "biz-a",
      offeringId: "offering-1",
      effectiveAt: "2026-06-01T00:00:00.000Z",
      pricingCatalogueId: "cat-1",
      catalogueCode: "DEFAULT",
      catalogueName: "Default",
      pricingItemId: "price-1",
      pricingMethod: "FIXED",
      pricingMethodLabel: "Fixed",
      dimensions: {
        currencyCode: "KES",
        customerSegment: null,
        salesChannel: "WEB",
        region: null,
        pricingCatalogueId: null,
        partyId: "party-1",
        quantity: 1,
      },
      candidateCount: 1,
      precedenceOwner: "IP-05",
      selectionMode: "SINGLE_CANDIDATE",
      unsupportedDimensionsNoted: [],
    },
    resolvedAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

function commercialPort(): CommercialContractPort {
  const adapter = createDownstreamCommercialContractAdapter();
  const service = createCommercialContractService();
  return {
    consumeFromSnapshot: (context, snapshot, options) =>
      adapter.consumeFromSnapshot(context, snapshot, options),
    validate: (context, contract, snapshot) =>
      adapter.validate(context, contract, snapshot),
    verifyIntegrity: (context, contract, snapshot) =>
      service.verifyCommercialContractIntegrity(context, contract, snapshot),
  };
}

async function buildLine(
  businessId: string,
  offeringId: string,
  quantity: number,
  currencyCode = "KES"
): Promise<CreateDirectSaleLineInput> {
  const resolution = new CommercialResolutionService({
    resolveBasePrice: async () =>
      fixtureResolvedBase({
        offeringId,
        provenance: {
          ...fixtureResolvedBase().provenance,
          businessId,
          offeringId,
          dimensions: {
            ...fixtureResolvedBase().provenance.dimensions,
            currencyCode,
            quantity,
          },
        },
      }),
  } as never);
  const pipeline = await resolution.resolveExpectedAmount(ctx(businessId), {
    businessId,
    offeringId,
    currencyCode,
    quantity,
  });
  return {
    offeringId,
    quantity,
    snapshot: pipeline.snapshot,
    expected: pipeline.expected,
  };
}

function harness(options?: { resolverCalls?: { count: number } }) {
  const store = new InMemorySalesOrderStore();
  const audit = new RecordingSalesAudit();
  const resolverCalls = options?.resolverCalls ?? { count: 0 };
  const service = new SalesOrderService({
    orders: store,
    parties: new InMemoryPartyLookup([
      { id: "party-1", businessId: "biz-a", displayName: "Test Customer Alpha" },
      { id: "party-b", businessId: "biz-b", displayName: "Other Business Customer" },
    ]),
    offerings: new InMemoryOfferingLookup([
      {
        id: "offering-1",
        businessId: "biz-a",
        productCode: "JA-ADV-001",
        productName: "Journey Alpha Advisory Service",
        productTypeCode: "SERVICE",
      },
      {
        id: "offering-b",
        businessId: "biz-b",
        productCode: "OTHER",
        productName: "Other Offering",
        productTypeCode: "SERVICE",
      },
    ]),
    quotations: new InMemoryQuotationLookup([
      {
        id: "quote-accepted",
        businessId: "biz-a",
        quotationNumber: "QT-000001",
        status: QUOTATION_STATUS_CODES.ACCEPTED,
        validUntil: new Date("2099-01-01T00:00:00.000Z"),
        partyId: "party-1",
        crmRecordId: "crm-1",
        accountId: null,
        opportunityId: "opp-1",
        currencyCode: "KES",
        currentVersionId: "qv-1",
        currentVersionNumber: 1,
        lines: [
          {
            id: "ql-1",
            offeringId: "offering-1",
            description: "Journey Alpha Advisory Service",
            quantity: 1,
            lineNumber: 1,
          },
        ],
      },
      {
        id: "quote-draft",
        businessId: "biz-a",
        quotationNumber: "QT-000002",
        status: QUOTATION_STATUS_CODES.DRAFT,
        validUntil: null,
        partyId: "party-1",
        crmRecordId: null,
        accountId: null,
        opportunityId: null,
        currencyCode: "KES",
        currentVersionId: "qv-2",
        currentVersionNumber: 1,
        lines: [
          {
            id: "ql-2",
            offeringId: "offering-1",
            description: "Draft line",
            quantity: 1,
            lineNumber: 1,
          },
        ],
      },
      {
        id: "quote-other-biz",
        businessId: "biz-b",
        quotationNumber: "QT-B-1",
        status: QUOTATION_STATUS_CODES.ACCEPTED,
        validUntil: new Date("2099-01-01T00:00:00.000Z"),
        partyId: "party-b",
        crmRecordId: null,
        accountId: null,
        opportunityId: null,
        currencyCode: "KES",
        currentVersionId: "qv-b",
        currentVersionNumber: 1,
        lines: [
          {
            id: "ql-b",
            offeringId: "offering-b",
            description: "Other",
            quantity: 1,
            lineNumber: 1,
          },
        ],
      },
    ]),
    commercial: commercialPort(),
    commercialResolver: {
      resolveAndConsume: async (context, input) => {
        resolverCalls.count += 1;
        const line = await buildLine(
          context.businessId,
          input.offeringId,
          input.quantity,
          input.currencyCode
        );
        const contract = commercialPort().consumeFromSnapshot(context, line.snapshot, {
          expected: line.expected,
          expectedCurrency: input.currencyCode,
          consumerRef: input.consumerRef,
        });
        return { snapshot: line.snapshot, expected: line.expected!, contract };
      },
    },
    audit,
    confirmationPolicy: { requiresSegregationOfDuties: true },
  });
  return { service, store, audit, resolverCalls };
}

function checkFiles(): SmokeResult[] {
  return REQUIRED_FILES.map((relative) => ({
    name: `file:${relative}`,
    ok: existsSync(path.join(ROOT, relative)),
  }));
}

function checkJournal(): SmokeResult {
  const journal = readFileSync(
    path.join(ROOT, "drizzle/meta/_journal.json"),
    "utf8"
  );
  return {
    name: "journal:0057_bp006_ip001_sales_order_creation",
    ok: journal.includes("0057_bp006_ip001_sales_order_creation"),
  };
}

function checkBarrel(): SmokeResult {
  const barrel = readFileSync(path.join(ROOT, "src/db/schema/index.ts"), "utf8");
  return {
    name: "schema-barrel:salesOrderCommercialLink",
    ok:
      barrel.includes("salesOrderCommercialLink") && barrel.includes("salesOrder"),
  };
}

function checkNav(): SmokeResult[] {
  const nav = readFileSync(
    path.join(ROOT, "src/lib/navigation/platform-nav-config.ts"),
    "utf8"
  );
  const routes = readFileSync(
    path.join(ROOT, "src/lib/navigation/business-app-routes.ts"),
    "utf8"
  );
  const wizard = readFileSync(
    path.join(ROOT, "src/modules/sales/components/create-sale-wizard.tsx"),
    "utf8"
  );
  const workspace = readFileSync(
    path.join(ROOT, "src/modules/sales/components/sales-order-workspace.tsx"),
    "utf8"
  );
  return [
    {
      name: "ux:sales-nav",
      ok: nav.includes('href: "/sales"') && nav.includes('label: "Sales"'),
    },
    { name: "ux:sales-route-prefix", ok: routes.includes('"/sales"') },
    {
      name: "ux:business-language",
      ok:
        wizard.includes("New sale") &&
        wizard.includes("Expected total") &&
        wizard.includes("Save draft sale") &&
        !wizard.includes('idleLabel="BP-') &&
        !wizard.includes(">BP-006<"),
    },
    {
      name: "ux:payment-not-recorded",
      ok: workspace.includes("Payment not yet recorded"),
    },
  ];
}

async function runCoreCases(): Promise<SmokeResult[]> {
  const results: SmokeResult[] = [];
  const { service, store, audit, resolverCalls } = harness();
  const maker = ctx("biz-a", "maker-1");
  const checker = ctx("biz-a", "checker-1");

  const line = await buildLine("biz-a", "offering-1", 1);
  const expectedPayable = line.expected?.expectedAmount ?? "";

  const direct = await service.createDirectSale(maker, {
    customerPartyId: "party-1",
    currencyCode: "KES",
    lines: [line],
  });
  results.push({
    name: "TC-01:create-direct-sale",
    ok:
      direct.status === SALES_ORDER_STATUS_CODES.DRAFT &&
      direct.customerId === "party-1" &&
      direct.lines.length === 1 &&
      direct.paymentRecorded === false,
  });

  const converted = await service.convertFromQuotation(maker, {
    quotationId: "quote-accepted",
    lineSnapshots: [line],
  });
  results.push({
    name: "TC-02:convert-accepted-quotation",
    ok:
      converted.quotationId === "quote-accepted" &&
      converted.opportunityId === "opp-1" &&
      converted.status === SALES_ORDER_STATUS_CODES.DRAFT,
  });

  try {
    await service.convertFromQuotation(maker, { quotationId: "quote-draft" });
    results.push({ name: "TC-03:reject-unaccepted-quotation", ok: false });
  } catch (error) {
    results.push({
      name: "TC-03:reject-unaccepted-quotation",
      ok: error instanceof SalesOrderError && error.code === "QUOTATION_NOT_ELIGIBLE",
      detail: error instanceof SalesOrderError ? error.code : String(error),
    });
  }

  try {
    await service.createDirectSale(maker, {
      customerPartyId: "party-b",
      currencyCode: "KES",
      lines: [line],
    });
    results.push({ name: "TC-04:reject-cross-business-customer", ok: false });
  } catch (error) {
    results.push({
      name: "TC-04:reject-cross-business-customer",
      ok: error instanceof SalesOrderError && error.code === "CUSTOMER_NOT_IN_BUSINESS",
      detail: error instanceof SalesOrderError ? error.code : String(error),
    });
  }

  try {
    await service.createDirectSale(maker, {
      customerPartyId: "party-1",
      currencyCode: "KES",
      lines: [{ ...line, offeringId: "offering-b" }],
    });
    results.push({ name: "TC-05:reject-cross-business-offering", ok: false });
  } catch (error) {
    results.push({
      name: "TC-05:reject-cross-business-offering",
      ok:
        error instanceof SalesOrderError &&
        (error.code === "OFFERING_NOT_IN_BUSINESS" ||
          error.code === "COMMERCIAL_OFFERING_MISMATCH"),
      detail: error instanceof SalesOrderError ? error.code : String(error),
    });
  }

  const tamperedSnapshot = structuredClone(line.snapshot);
  tamperedSnapshot.resolution.payable = "1.00";
  try {
    await service.createDirectSale(maker, {
      customerPartyId: "party-1",
      currencyCode: "KES",
      lines: [{ ...line, snapshot: tamperedSnapshot }],
    });
    results.push({ name: "TC-06:reject-tampered-contract", ok: false });
  } catch (error) {
    results.push({
      name: "TC-06:reject-tampered-contract",
      ok:
        error instanceof SalesOrderError &&
        (error.code === "COMMERCIAL_CONTRACT_TAMPERED" ||
          error.code === "COMMERCIAL_CONTRACT_INVALID"),
      detail: error instanceof SalesOrderError ? error.code : String(error),
    });
  }

  const resolverBefore = resolverCalls.count;
  const confirmable = await service.createDirectSale(maker, {
    customerPartyId: "party-1",
    currencyCode: "KES",
    lines: [await buildLine("biz-a", "offering-1", 1)],
  });
  await service.submitConfirmation(maker, confirmable.id);
  const confirmed = await service.approveConfirmation(checker, confirmable.id);
  results.push({
    name: "TC-07:confirm-valid-order",
    ok: confirmed.status === SALES_ORDER_STATUS_CODES.CONFIRMED && confirmed.confirmedBy === "checker-1",
  });

  const own = await service.createDirectSale(maker, {
    customerPartyId: "party-1",
    currencyCode: "KES",
    lines: [await buildLine("biz-a", "offering-1", 1)],
  });
  await service.submitConfirmation(maker, own.id);
  try {
    await service.approveConfirmation(maker, own.id);
    results.push({ name: "TC-08:maker-cannot-self-approve", ok: false });
  } catch (error) {
    results.push({
      name: "TC-08:maker-cannot-self-approve",
      ok: error instanceof SalesOrderError && error.code === "SOD_VIOLATION",
      detail: error instanceof SalesOrderError ? error.code : String(error),
    });
  }

  results.push({
    name: "TC-09:expected-amount-from-contract",
    ok: Number(direct.expectedAmount) === Number(expectedPayable) && Number(expectedPayable) > 0,
    detail: `${direct.expectedAmount} vs ${expectedPayable}`,
  });

  results.push({
    name: "TC-10:no-local-recalculation",
    ok:
      resolverCalls.count === resolverBefore &&
      Number(direct.expectedAmount) === Number(line.expected?.expectedAmount),
    detail: `resolverDelta=${resolverCalls.count - resolverBefore}; expected=${direct.expectedAmount}`,
  });

  try {
    await service.createDirectSale(maker, {
      customerPartyId: "party-1",
      currencyCode: "USD",
      lines: [line],
    });
    results.push({ name: "TC-11:currency-mismatch-fail-closed", ok: false });
  } catch (error) {
    results.push({
      name: "TC-11:currency-mismatch-fail-closed",
      ok:
        error instanceof SalesOrderError &&
        (error.code === "COMMERCIAL_CURRENCY_MISMATCH" ||
          error.code === "COMMERCIAL_CONTRACT_INVALID"),
      detail: error instanceof SalesOrderError ? error.code : String(error),
    });
  }

  const editable = await service.createDirectSale(maker, {
    customerPartyId: "party-1",
    currencyCode: "KES",
    lines: [await buildLine("biz-a", "offering-1", 1)],
  });
  const updated = await service.updateDraft(maker, editable.id, {
    orderDate: "2026-08-01T00:00:00.000Z",
  });
  results.push({
    name: "TC-12:draft-can-be-edited",
    ok: updated.orderDate.startsWith("2026-08-01") && updated.status === "DRAFT",
  });

  try {
    await service.updateDraft(checker, confirmable.id, {
      lines: [await buildLine("biz-a", "offering-1", 1)],
    });
    results.push({ name: "TC-13:confirmed-values-immutable", ok: false });
  } catch (error) {
    results.push({
      name: "TC-13:confirmed-values-immutable",
      ok: error instanceof SalesOrderError && error.code === "MATERIAL_VALUE_IMMUTABLE",
      detail: error instanceof SalesOrderError ? error.code : String(error),
    });
  }

  try {
    const existing = await store.findById("biz-a", direct.id);
    if (!existing?.partyId) {
      results.push({ name: "TC-14:order-number-unique-in-business", ok: false, detail: "missing original" });
    } else {
      // Omit identity/audit fields so the duplicate number is the only clash.
      const { id, createdAt, updatedAt, version, ...rest } = existing;
      void id;
      void createdAt;
      void updatedAt;
      void version;
      await store.insert({
        ...rest,
        id: crypto.randomUUID(),
        partyId: existing.partyId,
        orderNumber: direct.orderNumber,
      });
      results.push({ name: "TC-14:order-number-unique-in-business", ok: false });
    }
  } catch (error) {
    results.push({
      name: "TC-14:order-number-unique-in-business",
      ok: error instanceof SalesOrderError && error.code === "ORDER_NUMBER_NOT_UNIQUE",
      detail: error instanceof SalesOrderError ? error.code : String(error),
    });
  }

  try {
    await service.createDirectSale(maker, {
      customerPartyId: "party-1",
      currencyCode: "KES",
      lines: [{ ...line, quantity: 0 }],
    });
    results.push({ name: "TC-15:quantity-validation", ok: false });
  } catch (error) {
    results.push({
      name: "TC-15:quantity-validation",
      ok: error instanceof SalesOrderError && error.code === "INVALID_QUANTITY",
      detail: error instanceof SalesOrderError ? error.code : String(error),
    });
  }

  const payment = await service.getPaymentReadyContract(maker, confirmed.id);
  const fulfilment = await service.getFulfilmentHandoffContract(maker, confirmed.id);
  results.push({
    name: "TC-16:downstream-handoff-without-execution",
    ok:
      payment.paymentRecorded === false &&
      payment.tenderSplit === null &&
      payment.collectedAmount === null &&
      fulfilment.inventoryExecuted === false &&
      !("cashAmount" in payment) &&
      !("mpesaAmount" in payment),
  });

  const isolated = await service.getOrder(ctx("biz-b", "other"), direct.id).then(
    () => false,
    (error) => error instanceof SalesOrderError && error.code === "ORDER_NOT_FOUND"
  );
  results.push({
    name: "TC-17:tenant-isolation",
    ok: isolated === true,
  });

  const actions = new Set(audit.entries.map((entry) => entry.action));
  results.push({
    name: "TC-18:audit-events",
    ok:
      actions.has("ORDER_CREATED") &&
      actions.has("ORDER_SUBMITTED_FOR_CONFIRMATION") &&
      actions.has("ORDER_CONFIRMED") &&
      audit.entries.every((entry) => entry.businessId && entry.orderId),
    detail: [...actions].join(","),
  });

  results.push({
    name: "no-pricing-item-query-in-sales-module",
    ok: !readFileSync(
      path.join(ROOT, "src/modules/sales/services/sales-order-service.ts"),
      "utf8"
    ).includes("pricing_item"),
  });

  void CommercialError;
  return results;
}

function runExternal(script: string): SmokeResult {
  const result = spawnSync(process.execPath, ["--import", "tsx", script], {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env,
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
    checkJournal(),
    checkBarrel(),
    ...checkNav(),
    ...(await runCoreCases()),
  ];

  const regressionResults: SmokeResult[] = [];
  const regressions = [
    "scripts/bp003-ip011-offering-pricing-smoke-validation.ts",
    "scripts/bp004-ip010-quotation-smoke-validation.ts",
    "scripts/bp005-ip10-downstream-commercial-contract-smoke-validation.ts",
  ];
  for (const script of regressions) {
    if (existsSync(path.join(ROOT, script))) {
      regressionResults.push(runExternal(script));
    }
  }

  const results = [...coreResults, ...regressionResults];
  const coreFailed = coreResults.filter((item) => !item.ok);
  const failed = results.filter((item) => !item.ok);
  for (const item of results) {
    const mark = item.ok ? "PASS" : "FAIL";
    console.log(`[${mark}] ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
  }
  console.log(
    `\nCore: ${coreResults.length - coreFailed.length}/${coreResults.length} passed. All checks: ${results.length - failed.length}/${results.length} passed.`
  );
  process.exit(coreFailed.length === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
