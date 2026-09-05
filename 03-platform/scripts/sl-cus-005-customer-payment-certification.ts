/**
 * Purpose:
 * SL-CUS-005 — Customer Payment Against Existing Payment Obligation certification.
 *
 * Run: npx tsx scripts/sl-cus-005-customer-payment-certification.ts
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  CUSTOMER_WEB_CAPABILITY_ALLOW_LIST,
  buildGuestCustomerIdentity,
  createCustomerWebSessionPayload,
  evaluateCustomerWebPolicy,
  resolveCustomerPaymentObligationContext,
  toCustomerSafePaymentInitiationResult,
  assertNoForbiddenCustomerFields,
  INITIATE_PAYMENT_IDEMPOTENCY_STATUS,
  buildCustomerPaymentIdempotencyKey,
} from "@/core/channel-experience";
import { getCapabilityDefinition } from "@/core/channel-experience/capability-registry";
import { CHANNEL_CODES } from "@/core/channel-experience/constants";
import {
  closeDbIfOpen,
  runLiveCustomerPaymentProofs,
  type CertResult,
} from "./sl-cus-005-live-e2e";

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

function readDoc(relPath: string): string {
  return fs.readFileSync(
    path.resolve(__dirname, "..", "..", relPath),
    "utf8"
  );
}

async function main() {
  console.log(
    "SL-CUS-005 Customer Payment Against Existing Payment Obligation Certification\n"
  );

  console.log("\n=== A. GOVERNANCE DECISIONS LOCKED ===");
  const decisionDoc = readDoc(
    "07-Industry Editions/SME Digitization/SME-Edition-Gap-and-Decision-Register.md"
  );
  for (const id of [
    "D-05-01",
    "D-05-02",
    "D-05-03",
    "D-05-04",
    "D-05-05",
    "D-05-06",
  ]) {
    await check(`${id} recorded LOCKED`, () => {
      assert.ok(decisionDoc.includes(id));
      const line = decisionDoc
        .split("\n")
        .find((row) => row.includes(id) && row.includes("LOCKED"));
      assert.ok(line, `${id} must be LOCKED in decision register`);
    });
  }

  console.log("\n=== B. CAPABILITY REGISTRY ===");
  await check("INITIATE_PAYMENT registered BP-007", () => {
    const def = getCapabilityDefinition("INITIATE_PAYMENT");
    assert.ok(def);
    assert.equal(def.owningDomain, "BP-007");
    assert.equal(def.requiresStaffContext, false);
    assert.equal(def.allowedChannels.includes(CHANNEL_CODES.WEB), true);
  });
  await check("VIEW_PAYMENT_STATUS registered BP-007", () => {
    const def = getCapabilityDefinition("VIEW_PAYMENT_STATUS");
    assert.ok(def);
    assert.equal(def.owningDomain, "BP-007");
  });
  await check("VIEW_INVOICE not invented", () => {
    assert.equal(getCapabilityDefinition("VIEW_INVOICE") == null, true);
  });
  await check("VIEW_RECEIPT not invented", () => {
    assert.equal(getCapabilityDefinition("VIEW_RECEIPT") == null, true);
  });
  await check("VIEW_PAYMENT_HISTORY not invented", () => {
    assert.equal(getCapabilityDefinition("VIEW_PAYMENT_HISTORY") == null, true);
  });
  await check("PAY_OBLIGATION / PAY_INVOICE not invented", () => {
    assert.equal(getCapabilityDefinition("PAY_OBLIGATION") == null, true);
    assert.equal(getCapabilityDefinition("PAY_INVOICE") == null, true);
  });

  console.log("\n=== C. CUSTOMER WEB POLICY ===");
  await check("guest allows INITIATE_PAYMENT", () => {
    assert.equal(
      evaluateCustomerWebPolicy("INITIATE_PAYMENT", guestIdentity()).allowed,
      true
    );
  });
  await check("guest allows VIEW_PAYMENT_STATUS", () => {
    assert.equal(
      evaluateCustomerWebPolicy("VIEW_PAYMENT_STATUS", guestIdentity()).allowed,
      true
    );
  });
  await check("guest denies PAYMENT_WORKSPACE", () => {
    assert.equal(
      evaluateCustomerWebPolicy("PAYMENT_WORKSPACE", guestIdentity()).allowed,
      false
    );
  });
  await check("guest denies CRM_WORKSPACE", () => {
    assert.equal(
      evaluateCustomerWebPolicy("CRM_WORKSPACE", guestIdentity()).allowed,
      false
    );
  });
  await check("allow-list includes INITIATE_PAYMENT", () => {
    assert.ok(CUSTOMER_WEB_CAPABILITY_ALLOW_LIST.includes("INITIATE_PAYMENT"));
    assert.ok(
      CUSTOMER_WEB_CAPABILITY_ALLOW_LIST.includes("VIEW_PAYMENT_STATUS")
    );
  });

  console.log("\n=== D. IDEMPOTENCY + DTO ===");
  await check("payment idempotency contract READY", () => {
    assert.equal(INITIATE_PAYMENT_IDEMPOTENCY_STATUS.channelContract, "READY");
    assert.equal(INITIATE_PAYMENT_IDEMPOTENCY_STATUS.domainIntegration, "READY");
    const key = buildCustomerPaymentIdempotencyKey({
      businessId: "biz-1",
      guestSessionId: "sess-1",
      clientKey: "k1",
    });
    assert.ok(key.key.includes("customer-web:initiate-payment"));
  });
  await check("payment result DTO customer-safe", () => {
    const view = toCustomerSafePaymentInitiationResult({
      orderReference: "SO-1",
      paymentReference: "PT-1",
      paymentStatusCode: "SUCCESSFUL",
      requestedAmount: "10",
      amountDue: "100",
      amountPaid: "10",
      outstandingAmount: "90",
      currencyCode: "KES",
      receiptAvailable: true,
    });
    assertNoForbiddenCustomerFields(view as unknown as Record<string, unknown>);
  });
  await check("resolveCustomerPaymentObligationContext exported", () => {
    assert.equal(typeof resolveCustomerPaymentObligationContext, "function");
  });

  console.log("\n=== E. LIVE E2E ===");
  // Bounded timeout for max:1 session pooler. On timeout we NEVER closeDb while
  // live work is still the only outstanding promise — we await settle/grace first.
  const LIVE_TIMEOUT_MS = 2_400_000; // 40m — measured healthy live ~28m under max:1
  const SETTLE_GRACE_MS = 120_000;
  const livePromise = runLiveCustomerPaymentProofs();
  type LiveRace =
    | { kind: "done"; results: CertResult[] }
    | { kind: "timeout" }
    | { kind: "error"; error: unknown };
  let liveRace: LiveRace;
  try {
    liveRace = await Promise.race([
      livePromise.then(
        (results): LiveRace => ({ kind: "done", results }),
        (error): LiveRace => ({ kind: "error", error })
      ),
      new Promise<LiveRace>((resolve) =>
        setTimeout(() => resolve({ kind: "timeout" }), LIVE_TIMEOUT_MS)
      ),
    ]);
  } catch (error) {
    liveRace = { kind: "error", error };
  }

  if (liveRace.kind === "done") {
    recordClosure(liveRace.results);
    await closeDbIfOpen();
  } else if (liveRace.kind === "error") {
    failed += 1;
    console.error(
      `FAIL live-e2e harness — ${
        liveRace.error instanceof Error
          ? liveRace.error.message
          : String(liveRace.error)
      }`
    );
    await Promise.allSettled([livePromise]);
    await closeDbIfOpen();
  } else {
    failed += 1;
    console.error(
      `FAIL live-e2e harness — timed out after ${LIVE_TIMEOUT_MS}ms (operation=runLiveCustomerPaymentProofs)`
    );
    console.warn(
      `[sl-cus-005-cert] awaiting in-flight live settle (grace ${SETTLE_GRACE_MS}ms) before closeDb`
    );
    const settle = await Promise.race([
      livePromise.then(
        (results) => ({ kind: "late" as const, results }),
        (error) => ({ kind: "late_error" as const, error })
      ),
      new Promise<{ kind: "abandoned" }>((resolve) =>
        setTimeout(() => resolve({ kind: "abandoned" }), SETTLE_GRACE_MS)
      ),
    ]);
    if (settle.kind === "late") {
      console.warn("[sl-cus-005-cert] live completed during settle grace — recording results");
      // Timeout already counted as FAIL; still record late rows for diagnosis.
      recordClosure(settle.results);
      await closeDbIfOpen();
    } else if (settle.kind === "late_error") {
      console.error(
        `[sl-cus-005-cert] live failed during settle grace — ${
          settle.error instanceof Error ? settle.error.message : String(settle.error)
        }`
      );
      await closeDbIfOpen();
    } else {
      console.error(
        "[sl-cus-005-cert] live still unsettled after grace — exiting without starting quality gates (avoids orphaned pool use)"
      );
      await closeDbIfOpen();
      console.log(`\n=== SUMMARY ===`);
      console.log(`PASS ${passed}`);
      console.log(`FAIL ${failed}`);
      console.log(`NA   ${skipped}`);
      console.log("\nIMPLEMENTED — NOT CERTIFIED");
      process.exit(1);
    }
  }

  const platformRoot = path.resolve(__dirname, "..");

  console.log("\n=== F. QUALITY GATES ===");
  runCommand("TypeScript", "npx", ["tsc", "--noEmit"], platformRoot);
  runCommand(
    "ESLint customer payment paths",
    "npx",
    [
      "eslint",
      "src/core/channel-experience/customer/payment-adapter.ts",
      "src/core/channel-experience/customer/payment-actions.ts",
      "src/core/channel-experience/customer/payment-obligation-context.ts",
      "src/app/(public)/store/[businessCode]/orders/[orderReference]/pay",
    ],
    platformRoot
  );
  runCommand("Production build", "npm", ["run", "build"], platformRoot);

  console.log("\n=== G. REGRESSION (foundation smoke only — prior slices separately) ===");
  runCommand(
    "ENG-003o Customer Web foundation smoke",
    "npx",
    ["tsx", "scripts/eng003o-customer-web-foundation-smoke.ts"],
    platformRoot
  );

  console.log(`\n=== SUMMARY ===`);
  console.log(`PASS ${passed}`);
  console.log(`FAIL ${failed}`);
  console.log(`NA   ${skipped}`);

  if (failed > 0) {
    process.exitCode = 1;
    console.log("\nIMPLEMENTED — NOT CERTIFIED");
  } else {
    console.log("\nCERTIFIED — READY TO FREEZE");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
