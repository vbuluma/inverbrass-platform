/**
 * Purpose:
 * SL-CUS-004 — Customer Order & Payment Tracking certification.
 *
 * Run: npx tsx scripts/sl-cus-004-customer-order-payment-tracking-certification.ts
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";

import {
  CUSTOMER_WEB_CAPABILITY_ALLOW_LIST,
  assertCustomerOrderAccess,
  assertNoForbiddenCustomerFields,
  buildGuestCustomerIdentity,
  canAccessCustomerResource,
  createCustomerWebSessionPayload,
  evaluateCustomerWebPolicy,
  resolveCustomerOrderContext,
  toCustomerSafeOrderHubDetail,
  toCustomerSafeOrderListItem,
  toCustomerSafeOrderPaymentView,
} from "@/core/channel-experience";
import { ChannelExperienceError } from "@/core/channel-experience/errors";
import { buildCustomerWebOrderMetadata } from "@/core/channel-experience/customer/order-resource-auth";
import { getCapabilityDefinition } from "@/core/channel-experience/capability-registry";
import { CHANNEL_CODES } from "@/core/channel-experience/constants";
import {
  closeDbIfOpen,
  runLiveOrderPaymentTrackingProofs,
  type CertResult,
} from "./sl-cus-004-live-e2e";

let passed = 0;
let failed = 0;
let skipped = 0;

function check(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => {
      passed += 1;
      console.log(`PASS ${name}`);
    })
    .catch((error) => {
      failed += 1;
      console.error(`FAIL ${name}`);
      console.error(error);
    });
}

function recordClosure(results: CertResult[]) {
  for (const row of results) {
    if (row.status === "PASS") {
      passed += 1;
      console.log(`PASS ${row.name}${row.detail ? ` — ${row.detail}` : ""}`);
    } else if (row.status === "NA") {
      skipped += 1;
      console.log(`NA   ${row.name}${row.detail ? ` — ${row.detail}` : ""}`);
    } else {
      failed += 1;
      console.error(`FAIL ${row.name}${row.detail ? ` — ${row.detail}` : ""}`);
    }
  }
}

function guestSession(businessId = "biz-1", businessCode = "DEMO-AAA111") {
  return createCustomerWebSessionPayload({ businessId, businessCode });
}

function guestIdentity(session = guestSession()) {
  return buildGuestCustomerIdentity(session);
}

function runCommand(
  label: string,
  command: string,
  args: string[],
  cwd: string
): boolean {
  console.log(`\n> ${label}`);
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    shell: true,
    env: process.env,
  });
  if (result.status === 0) {
    passed += 1;
    console.log(`PASS ${label}`);
    return true;
  }
  failed += 1;
  console.error(`FAIL ${label}`);
  if (result.stdout) console.error(result.stdout.slice(-2000));
  if (result.stderr) console.error(result.stderr.slice(-2000));
  return false;
}

async function main() {
  console.log("SL-CUS-004 Customer Order & Payment Tracking Certification\n");

  console.log("\n=== A. CAPABILITY REGISTRY ===");
  await check("VIEW_ORDER registered BP-006", () => {
    const def = getCapabilityDefinition("VIEW_ORDER");
    assert.ok(def);
    assert.equal(def.owningDomain, "BP-006");
    assert.equal(def.requiresStaffContext, false);
    assert.equal(def.allowedChannels.includes(CHANNEL_CODES.WEB), true);
  });
  await check("VIEW_PAYMENT_STATUS registered BP-007", () => {
    const def = getCapabilityDefinition("VIEW_PAYMENT_STATUS");
    assert.ok(def);
    assert.equal(def.owningDomain, "BP-007");
    assert.equal(def.requiresStaffContext, false);
  });
  await check("VIEW_RECEIPT not invented for this slice", () => {
    assert.equal(getCapabilityDefinition("VIEW_RECEIPT") == null, true);
  });
  await check("CREATE_CASE not invented for this slice", () => {
    assert.equal(getCapabilityDefinition("CREATE_CASE") == null, true);
  });

  console.log("\n=== B. CUSTOMER WEB POLICY ===");
  await check("guest allows VIEW_ORDER", () => {
    assert.equal(
      evaluateCustomerWebPolicy("VIEW_ORDER", guestIdentity()).allowed,
      true
    );
  });
  await check("guest allows VIEW_PAYMENT_STATUS", () => {
    assert.equal(
      evaluateCustomerWebPolicy("VIEW_PAYMENT_STATUS", guestIdentity()).allowed,
      true
    );
  });
  await check("guest denies CRM_WORKSPACE", () => {
    assert.equal(
      evaluateCustomerWebPolicy("CRM_WORKSPACE", guestIdentity()).allowed,
      false
    );
  });
  await check("guest denies PROCUREMENT_WORKSPACE", () => {
    assert.equal(
      evaluateCustomerWebPolicy("PROCUREMENT_WORKSPACE", guestIdentity())
        .allowed,
      false
    );
  });
  await check("allow-list includes tracking capabilities only (no case)", () => {
    assert.ok(CUSTOMER_WEB_CAPABILITY_ALLOW_LIST.includes("VIEW_ORDER"));
    assert.ok(
      CUSTOMER_WEB_CAPABILITY_ALLOW_LIST.includes("VIEW_PAYMENT_STATUS")
    );
    assert.equal(
      (CUSTOMER_WEB_CAPABILITY_ALLOW_LIST as readonly string[]).includes(
        "CREATE_CASE"
      ),
      false
    );
  });

  console.log("\n=== C. RESOURCE AUTHORIZATION ===");
  const metadata = buildCustomerWebOrderMetadata({
    guestSessionId: "sess-a",
    partyId: "party-a",
    correlationId: "corr-1",
  });
  await check("Guest A owns Order A", () => {
    assertCustomerOrderAccess(
      { businessId: "biz-1", guestSessionId: "sess-a", partyId: null },
      { businessId: "biz-1", metadata, partyId: "party-a" }
    );
  });
  await check("Guest B denied Order A", () => {
    assert.equal(
      canAccessCustomerResource(
        { businessId: "biz-1", guestSessionId: "sess-b", partyId: null },
        {
          businessId: "biz-1",
          guestSessionId: "sess-a",
          partyId: "party-a",
        }
      ),
      false
    );
  });
  await check("cross-tenant denied", () => {
    assert.throws(
      () =>
        assertCustomerOrderAccess(
          { businessId: "biz-2", guestSessionId: "sess-a", partyId: null },
          { businessId: "biz-1", metadata, partyId: "party-a" }
        ),
      ChannelExperienceError
    );
  });
  await check("resolveCustomerOrderContext is exported helper", () => {
    assert.equal(typeof resolveCustomerOrderContext, "function");
  });

  console.log("\n=== D. CUSTOMER-SAFE DTOs ===");
  await check("order list DTO", () => {
    const item = toCustomerSafeOrderListItem({
      orderReference: "SO-1",
      orderDate: new Date().toISOString(),
      orderStatusCode: "CONFIRMED",
      totalAmount: "100",
      currencyCode: "KES",
      paymentStatusCode: "SUCCESSFUL",
    });
    assertNoForbiddenCustomerFields(item as unknown as Record<string, unknown>);
  });
  await check("payment DTO", () => {
    const payment = toCustomerSafeOrderPaymentView({
      orderReference: "SO-1",
      paymentReference: "PAY-1",
      paymentStatusCode: "SUCCESSFUL",
      amountDue: "100",
      amountPaid: "100",
      outstandingAmount: "0",
      currencyCode: "KES",
      receiptAvailable: true,
    });
    assertNoForbiddenCustomerFields(
      payment as unknown as Record<string, unknown>
    );
  });
  await check("order hub DTO", () => {
    const hub = toCustomerSafeOrderHubDetail({
      orderReference: "SO-1",
      orderDate: new Date().toISOString(),
      orderStatusCode: "CONFIRMED",
      currencyCode: "KES",
      totalAmount: "100",
      lines: [
        {
          offeringCode: "SKU-1",
          offeringName: "Item",
          orderedQuantity: "1",
          commercialLineAmount: "100",
          currencyCode: "KES",
        },
      ],
      payment: toCustomerSafeOrderPaymentView({
        orderReference: "SO-1",
        paymentReference: null,
        paymentStatusCode: "PENDING",
        amountDue: "100",
        amountPaid: "0",
        outstandingAmount: "100",
        currencyCode: "KES",
        receiptAvailable: false,
      }),
    });
    assertNoForbiddenCustomerFields(hub as unknown as Record<string, unknown>);
  });

  console.log("\n=== E. LIVE E2E ===");
  const liveResults = await runLiveOrderPaymentTrackingProofs();
  recordClosure(liveResults);

  console.log("\n=== F. ARCHITECTURE / SCOPE ===");
  await check("CRM Case deferred — no CREATE_CASE capability", () => {
    assert.equal(getCapabilityDefinition("CREATE_CASE") == null, true);
  });
  await check("no CustomerWeb case adapter invent", async () => {
    const fs = await import("node:fs");
    const caseAdapter = path.resolve(
      __dirname,
      "../src/core/channel-experience/customer/case-adapter.ts"
    );
    assert.equal(fs.existsSync(caseAdapter), false);
  });

  const parent = path.resolve(__dirname, "..");

  console.log("\n=== G. QUALITY GATES ===");
  runCommand("TypeScript (tsc --noEmit)", "npx", ["tsc", "--noEmit"], parent);
  runCommand(
    "ESLint (customer order tracking paths)",
    "npx",
    [
      "eslint",
      "src/core/channel-experience/customer/order-context.ts",
      "src/core/channel-experience/customer/order-tracking-adapter.ts",
      "src/core/channel-experience/customer/order-tracking-actions.ts",
      "src/core/channel-experience/customer/payment-adapter.ts",
      "src/core/channel-experience/customer/dto.ts",
      "src/app/(public)/store/[businessCode]/orders",
      "--max-warnings=0",
    ],
    parent
  );
  runCommand("Production build", "npx", ["next", "build"], parent);

  console.log("\n=== H. REGRESSION (smoke invoke) ===");
  await check("foundation allow-list still excludes staff workspaces", () => {
    assert.equal(
      CUSTOMER_WEB_CAPABILITY_ALLOW_LIST.includes("SALES_WORKSPACE" as never),
      false
    );
  });

  await closeDbIfOpen();

  console.log("\n=== SUMMARY ===");
  console.log(`PASS: ${passed}`);
  console.log(`FAIL: ${failed}`);
  console.log(`NA:   ${skipped}`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
