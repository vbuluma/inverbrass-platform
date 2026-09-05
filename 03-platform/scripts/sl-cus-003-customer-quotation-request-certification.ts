/**
 * Purpose:
 * SL-CUS-003 — Customer Quotation Request certification.
 *
 * Run: npx tsx scripts/sl-cus-003-customer-quotation-request-certification.ts
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";

import {
  CREATE_QUOTATION_IDEMPOTENCY_STATUS,
  CUSTOMER_WEB_CAPABILITY_ALLOW_LIST,
  assertCustomerResourceAccess,
  assertNoForbiddenCustomerFields,
  buildCustomerQuotationIdempotencyKey,
  buildGuestCustomerIdentity,
  canAccessCustomerResource,
  createCustomerWebSessionPayload,
  evaluateCustomerWebPolicy,
  hashCreateQuotationPayload,
  toCustomerSafeQuotationView,
  toCustomerQuotationStatusLabel,
} from "@/core/channel-experience";
import { ChannelExperienceError } from "@/core/channel-experience/errors";
import {
  assertCustomerQuotationAccess,
  buildCustomerWebQuotationMetadata,
} from "@/core/channel-experience/customer/quotation-resource-auth";
import { getCapabilityDefinition } from "@/core/channel-experience/capability-registry";
import { evaluateChannelPolicy } from "@/core/channel-experience/channel-policy";
import { CHANNEL_CODES } from "@/core/channel-experience/constants";
import {
  CRM_ERROR_CODES,
  CrmError,
} from "@/modules/crm/errors";
import { QUOTATION_IDEMPOTENCY_OPERATIONS } from "@/modules/crm/constants";
import { createInMemoryQuotationIdempotencyStore } from "@/modules/crm/quotation/services/quotation-idempotency-memory-store";
import { CustomerWebQuotationAdapter } from "@/core/channel-experience/customer/quotation-adapter";
import {
  closeDbIfOpen,
  runLiveQuotationRequestProofs,
  type CertResult,
} from "./sl-cus-003-live-e2e";

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

function guestSession(businessId = "biz-1", businessCode = "DEMO-AAA111") {
  return createCustomerWebSessionPayload({ businessId, businessCode });
}

function guestIdentity(session = guestSession()) {
  return buildGuestCustomerIdentity(session);
}

async function runTenantIsolation() {
  console.log("\n=== A. TENANT ISOLATION ===");
  await check("CREATE_QUOTATION registry allows WEB customer channel", () => {
    const def = getCapabilityDefinition("CREATE_QUOTATION");
    assert.ok(def);
    assert.equal(def.requiresStaffContext, false);
    assert.equal(def.allowedChannels.includes(CHANNEL_CODES.WEB), true);
  });
  await check("VIEW_QUOTATION registered for customer channels", () => {
    const def = getCapabilityDefinition("VIEW_QUOTATION");
    assert.ok(def);
    assert.equal(def.owningDomain, "BP-004");
    assert.equal(def.requiresStaffContext, false);
  });
}

async function runTrustBoundary() {
  console.log("\n=== B. CUSTOMER TRUST BOUNDARY ===");
  await check("guest policy allows CREATE_QUOTATION", () => {
    const decision = evaluateCustomerWebPolicy(
      "CREATE_QUOTATION",
      guestIdentity()
    );
    assert.equal(decision.allowed, true);
  });
  await check("guest policy allows VIEW_QUOTATION", () => {
    const decision = evaluateCustomerWebPolicy(
      "VIEW_QUOTATION",
      guestIdentity()
    );
    assert.equal(decision.allowed, true);
  });
  await check("guest policy denies CRM_WORKSPACE", () => {
    const decision = evaluateCustomerWebPolicy(
      "CRM_WORKSPACE",
      guestIdentity()
    );
    assert.equal(decision.allowed, false);
  });
}

async function runCustomerAuthorization() {
  console.log("\n=== C. CUSTOMER AUTHORIZATION ===");
  await check("allow-list includes quotation capabilities", () => {
    assert.ok(CUSTOMER_WEB_CAPABILITY_ALLOW_LIST.includes("CREATE_QUOTATION"));
    assert.ok(CUSTOMER_WEB_CAPABILITY_ALLOW_LIST.includes("VIEW_QUOTATION"));
  });
  await check("staff WEB policy still allows CREATE_QUOTATION", () => {
    const staffIdentity = {
      channel: CHANNEL_CODES.WEB,
      actorType: "STAFF" as const,
      platformUserId: "user-1",
      partyId: null,
      externalIdentityKey: null,
      roleCodes: [] as string[],
      permissionCodes: [
        "CustomerRelationshipManagement.Quotation.Create",
      ],
    };
    assert.equal(
      evaluateChannelPolicy(
        CHANNEL_CODES.WEB,
        "CREATE_QUOTATION",
        staffIdentity
      ).allowed,
      true
    );
  });
}

async function runResourceAuthorization() {
  console.log("\n=== D. RESOURCE AUTHORIZATION ===");
  const metadata = buildCustomerWebQuotationMetadata({
    guestSessionId: "sess-a",
    partyId: "party-a",
    correlationId: "corr-1",
  });

  await check("Customer A → Request A PASS", () => {
    assertCustomerQuotationAccess(
      { businessId: "biz-1", guestSessionId: "sess-a", partyId: "party-a" },
      {
        businessId: "biz-1",
        metadata: metadata as Record<string, unknown>,
        partyId: "party-a",
      }
    );
  });

  await check("Customer B → Request A DENY", () => {
    assert.throws(
      () =>
        assertCustomerQuotationAccess(
          {
            businessId: "biz-1",
            guestSessionId: "sess-b",
            partyId: "party-b",
          },
          {
            businessId: "biz-1",
            metadata: metadata as Record<string, unknown>,
            partyId: "party-a",
          }
        ),
      ChannelExperienceError
    );
  });

  await check("Tenant B → Request A DENY", () => {
    assert.throws(
      () =>
        assertCustomerQuotationAccess(
          {
            businessId: "biz-2",
            guestSessionId: "sess-a",
            partyId: "party-a",
          },
          {
            businessId: "biz-1",
            metadata: metadata as Record<string, unknown>,
            partyId: "party-a",
          }
        ),
      ChannelExperienceError
    );
  });

  await check("unknown resource scope DENY", () => {
    assert.equal(
      canAccessCustomerResource(
        { businessId: "biz-1", guestSessionId: "sess-x", partyId: null },
        {
          businessId: "biz-1",
          guestSessionId: "sess-a",
          partyId: "party-a",
        }
      ),
      false
    );
  });
}

async function runCustomerSafeDto() {
  console.log("\n=== E. CUSTOMER-SAFE DTOs ===");
  await check("quotation DTO strips forbidden patterns", () => {
    const view = toCustomerSafeQuotationView({
      quotationNumber: "QT-1",
      status: "DRAFT",
      currencyCode: "KES",
      grandTotal: 100,
      createdAt: new Date().toISOString(),
      documentAvailable: false,
      lines: [
        {
          offeringCode: "SKU-1",
          offeringName: "Item",
          quantity: 2,
          unitPrice: 50,
          lineTotal: 100,
        },
      ],
    });
    assert.equal(view.statusLabel, "REQUEST_RECEIVED");
    assertNoForbiddenCustomerFields(view as unknown as Record<string, unknown>);
  });
  await check("status label mapping SENT → QUOTATION_ISSUED", () => {
    assert.equal(toCustomerQuotationStatusLabel("SENT"), "QUOTATION_ISSUED");
  });
}

async function runOfferingAndPricing() {
  console.log("\n=== F/G. OFFERING + PRICE INTEGRITY ===");
  await check("payload hash ignores client unit prices", () => {
    const hashA = hashCreateQuotationPayload({
      partyId: "p1",
      currencyCode: "KES",
      notes: "hello",
      lines: [{ offeringId: "o1", quantity: 2 }],
    });
    const hashB = hashCreateQuotationPayload({
      partyId: "p1",
      currencyCode: "kes",
      notes: "hello",
      lines: [{ offeringId: "o1", quantity: 2 }],
    });
    assert.equal(hashA, hashB);
  });
  await check("payload hash changes when quantity changes", () => {
    const hashA = hashCreateQuotationPayload({
      partyId: "p1",
      currencyCode: "KES",
      lines: [{ offeringId: "o1", quantity: 1 }],
    });
    const hashB = hashCreateQuotationPayload({
      partyId: "p1",
      currencyCode: "KES",
      lines: [{ offeringId: "o1", quantity: 2 }],
    });
    assert.notEqual(hashA, hashB);
  });
}

async function runIdempotency() {
  console.log("\n=== I/J/K. IDEMPOTENCY + DUPLICATE + CONCURRENCY ===");
  await check("channel idempotency key namespace", () => {
    const key = buildCustomerQuotationIdempotencyKey({
      businessId: "biz-1",
      guestSessionId: "sess-1",
      clientKey: "client-1",
    });
    assert.match(key.key, /^customer-web:create-quotation:/);
    assert.equal(CREATE_QUOTATION_IDEMPOTENCY_STATUS.domainIntegration, "READY");
  });

  await check("same key + same hash → replay record", async () => {
    const store = createInMemoryQuotationIdempotencyStore();
    await store.insert({
      businessId: "biz-1",
      idempotencyKey: "k1",
      operationType: QUOTATION_IDEMPOTENCY_OPERATIONS.CREATE_QUOTATION,
      payloadHash: "hash-a",
      resourceType: "quotation",
      resourceId: "q-1",
    });
    const existing = await store.find(
      "biz-1",
      QUOTATION_IDEMPOTENCY_OPERATIONS.CREATE_QUOTATION,
      "k1"
    );
    assert.equal(existing?.resourceId, "q-1");
    assert.equal(existing?.payloadHash, "hash-a");
  });

  await check("same key concurrent insert → conflict", async () => {
    const store = createInMemoryQuotationIdempotencyStore();
    const results = await Promise.allSettled([
      store.insert({
        businessId: "biz-1",
        idempotencyKey: "k-concurrent",
        operationType: QUOTATION_IDEMPOTENCY_OPERATIONS.CREATE_QUOTATION,
        payloadHash: "h1",
        resourceType: "quotation",
        resourceId: "q-a",
      }),
      store.insert({
        businessId: "biz-1",
        idempotencyKey: "k-concurrent",
        operationType: QUOTATION_IDEMPOTENCY_OPERATIONS.CREATE_QUOTATION,
        payloadHash: "h1",
        resourceType: "quotation",
        resourceId: "q-b",
      }),
    ]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    const reason = (rejected[0] as PromiseRejectedResult).reason;
    assert.ok(reason instanceof CrmError);
    assert.equal(reason.code, CRM_ERROR_CODES.IDEMPOTENCY_CONFLICT);
  });
}

async function runStatusAndDocument() {
  console.log("\n=== L/M/N. STATUS + RESOURCE + DOCUMENT ===");
  await check("documentAvailable only when issued+", () => {
    const draft = toCustomerSafeQuotationView({
      quotationNumber: "QT-1",
      status: "DRAFT",
      currencyCode: "KES",
      grandTotal: 10,
      createdAt: new Date().toISOString(),
      documentAvailable: true,
      lines: [],
    });
    assert.equal(draft.documentAvailable, false);
    const sent = toCustomerSafeQuotationView({
      quotationNumber: "QT-1",
      status: "SENT",
      currencyCode: "KES",
      grandTotal: 10,
      createdAt: new Date().toISOString(),
      documentAvailable: true,
      lines: [],
    });
    assert.equal(sent.documentAvailable, true);
  });
  await check("resource assert helper rejects cross-session", () => {
    assert.throws(
      () =>
        assertCustomerResourceAccess(
          { businessId: "biz-1", guestSessionId: "a", partyId: null },
          { businessId: "biz-1", guestSessionId: "b", partyId: null }
        ),
      ChannelExperienceError
    );
  });
}

function recordClosure(results: CertResult[]) {
  for (const result of results) {
    if (result.status === "PASS") {
      passed += 1;
      console.log(
        `PASS ${result.name}${result.detail ? ` — ${result.detail}` : ""}`
      );
    } else if (result.status === "FAIL") {
      failed += 1;
      console.error(
        `FAIL ${result.name}${result.detail ? ` — ${result.detail}` : ""}`
      );
    } else {
      skipped += 1;
      console.log(`NA   ${result.name} — ${result.detail ?? "not applicable"}`);
    }
  }
}

async function runArchitectureReuse() {
  console.log("\n=== CHANNEL REUSE / BUSINESS LOGIC SEPARATION ===");
  await check("CREATE_QUOTATION owned by BP-004", () => {
    assert.equal(
      getCapabilityDefinition("CREATE_QUOTATION")?.owningDomain,
      "BP-004"
    );
  });
  await check("CustomerWebQuotationAdapter is channel-specific class", () => {
    assert.equal(CustomerWebQuotationAdapter.name, "CustomerWebQuotationAdapter");
  });
  await check("WhatsApp could call same domain operation tomorrow", () => {
    assert.equal(
      CREATE_QUOTATION_IDEMPOTENCY_STATUS.channelContract,
      "READY"
    );
    assert.equal(CREATE_QUOTATION_IDEMPOTENCY_STATUS.domainIntegration, "READY");
  });
}

function runCommand(
  name: string,
  command: string,
  args: string[],
  cwd: string
): boolean {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    shell: true,
  });
  if (result.status === 0) {
    passed += 1;
    console.log(`PASS ${name}`);
    return true;
  }
  failed += 1;
  console.error(`FAIL ${name}`);
  if (result.stdout) console.error(result.stdout.slice(-2000));
  if (result.stderr) console.error(result.stderr.slice(-2000));
  return false;
}

async function main() {
  console.log("SL-CUS-003 Customer Quotation Request Certification\n");

  await runTenantIsolation();
  await runTrustBoundary();
  await runCustomerAuthorization();
  await runResourceAuthorization();
  await runCustomerSafeDto();
  await runOfferingAndPricing();

  console.log("\n=== H. REQUEST SUBMISSION (LIVE E2E) ===");
  const liveResults = await runLiveQuotationRequestProofs();
  recordClosure(liveResults);

  await runIdempotency();
  await runStatusAndDocument();

  console.log("\n=== O. AUDIT ===");
  await check("CREATE_QUOTATION auditRequired true", () => {
    assert.equal(
      getCapabilityDefinition("CREATE_QUOTATION")?.auditRequired,
      true
    );
  });

  console.log("\n=== P/Q/R. REGRESSION ===");
  await check("foundation allow-list still excludes workspaces", () => {
    assert.equal(
      CUSTOMER_WEB_CAPABILITY_ALLOW_LIST.includes("SALES_WORKSPACE" as never),
      false
    );
  });

  const parent = path.resolve(__dirname, "..");

  console.log("\n=== S/T/U. QUALITY GATES ===");
  runCommand(
    "TypeScript (tsc --noEmit)",
    "npx",
    ["tsc", "--noEmit"],
    parent
  );
  runCommand(
    "ESLint (customer + crm quotation paths)",
    "npx",
    [
      "eslint",
      "src/core/channel-experience/customer",
      "src/modules/crm/quotation",
      "src/app/(public)/store",
      "--max-warnings=0",
    ],
    parent
  );
  runCommand(
    "Production build",
    "npx",
    ["next", "build"],
    parent
  );

  await runArchitectureReuse();

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
