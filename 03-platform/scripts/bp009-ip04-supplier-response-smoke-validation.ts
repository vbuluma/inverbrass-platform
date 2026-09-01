/**
 * Purpose:
 * Smoke-validate BP-009 / IP-04 Supplier Response & Collaboration.
 *
 * Usage:
 *   npx tsx scripts/bp009-ip04-supplier-response-smoke-validation.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { CurrentBusinessContext } from "@/core/auth/types";
import { createInProcessNotificationAdapter } from "@/core/notification-engine/adapters/in-process-notification-adapter";
import {
  ALL_PROCUREMENT_PERMISSIONS,
  PROCUREMENT_AUDIT_ACTIONS,
  PROCUREMENT_ERROR_CODES,
  PROCUREMENT_PERMISSIONS,
  QUALIFICATION_STATUS_CODES,
  ProcurementError,
} from "@/modules/procurement";
import { createProcurementSourcingWorkflowAdapter } from "@/modules/procurement/adapters/procurement-sourcing-workflow-adapter";
import { RecordingProcurementAudit } from "@/modules/procurement/services/procurement-audit-helper";
import { SourcingService } from "@/modules/procurement/services/sourcing-service";
import { InMemorySourcingStore } from "@/modules/procurement/services/sourcing-memory-store";
import type {
  ApprovedRequestBudget,
  ProcurementActor,
  ProcurementPartyRef,
  ProcurementProfileRecord,
  SuggestedSupplierSnapshot,
} from "@/modules/procurement/types";

const ROOT = path.resolve(__dirname, "..");

type Result = { name: string; ok: boolean; detail?: string };

const REQUIRED_FILES = [
  "drizzle/0083_bp009_ip004_supplier_response.sql",
  "src/modules/procurement/services/sourcing-response-rules.ts",
  "src/modules/procurement/components/sourcing-supplier-portal.tsx",
  "src/app/(public)/sourcing/respond/[token]/page.tsx",
];

function record(results: Result[], name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
}

function ctx(businessId: string, userId = "buyer-1"): CurrentBusinessContext {
  return { businessId, platformUserId: userId, businessMembershipId: `mem-${businessId}` };
}

function actor(userId = "buyer-1", permissions = ALL_PROCUREMENT_PERMISSIONS): ProcurementActor {
  return { userId, permissions };
}

function futureClosesAt(days = 14): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function party(id: string, name: string, businessId = "biz-a"): ProcurementPartyRef {
  return {
    id,
    businessId,
    displayName: name,
    partyNumber: `PTY-${id}`,
    partyTypeCode: "ORGANIZATION",
    hasActiveSupplierRole: true,
  };
}

function profile(id: string, partyId: string, businessId = "biz-a"): ProcurementProfileRecord {
  return {
    id,
    businessId,
    partyId,
    profileNumber: `SPP-${id}`,
    statusCode: "ACTIVE",
    qualificationStatusCode: QUALIFICATION_STATUS_CODES.QUALIFIED,
    isPreferred: false,
    isApproved: true,
    defaultDeliveryTerms: null,
    defaultPaymentTerms: null,
    expectedLeadTimeDays: null,
    statusReason: null,
    statusEffectiveDate: "2026-01-01",
    statusReviewDate: null,
    statusAuthority: null,
    createdAt: new Date(),
    createdBy: "buyer-1",
    updatedAt: new Date(),
    updatedBy: "buyer-1",
    deletedAt: null,
    version: 1,
  };
}

function supplierSnapshot(
  profileId: string,
  partyId: string,
  name: string,
  businessId = "biz-a"
): SuggestedSupplierSnapshot {
  return {
    profileId,
    partyId,
    party: party(partyId, name, businessId),
    profile: profile(profileId, partyId, businessId),
    latestQualification: {
      id: `qual-${profileId}`,
      businessId,
      profileId,
      qualificationTypeCode: "GENERAL",
      outcomeCode: QUALIFICATION_STATUS_CODES.QUALIFIED,
      effectiveDate: "2026-01-01",
      expiryDate: "2027-01-01",
      reviewDate: null,
      reviewerUserId: null,
      notes: null,
      createdAt: new Date(),
      createdBy: "buyer-1",
      updatedAt: new Date(),
      updatedBy: "buyer-1",
      deletedAt: null,
      version: 1,
      evidenceDocumentIds: [],
    },
  };
}

function approvedPr(id: string, requestNumber: string, estimatedValue: string) {
  return {
    id,
    businessId: "biz-a",
    requestNumber,
    status: "APPROVED",
    estimatedValue,
    currencyCode: "KES",
  };
}

function harness() {
  const store = new InMemorySourcingStore();
  const audit = new RecordingProcurementAudit();
  const notifications = createInProcessNotificationAdapter();
  const service = new SourcingService({
    store: store.store,
    numbering: store.numbering,
    audit,
    approvedRequests: store.approvedBudget,
    suggestedSupplier: store.suggestedSupplier,
    workflow: createProcurementSourcingWorkflowAdapter(store.store),
    notifications,
  });
  return { store, audit, notifications, service };
}

async function expectError(run: () => Promise<unknown>, code: string) {
  try {
    await run();
    return false;
  } catch (error) {
    return error instanceof ProcurementError && error.code === code;
  }
}

async function runCases(): Promise<Result[]> {
  const results: Result[] = [];
  const buyer = actor();
  const context = ctx("biz-a");

  const { store, audit, notifications, service } = harness();
  store.seedApprovedRequest(approvedPr("pr-1", "PR-000001", "10000000"));
  store.seedSupplier(supplierSnapshot("sup-a", "pty-a", "Alpha Ltd"));
  store.seedSupplier(supplierSnapshot("sup-b", "pty-b", "Beta Ltd"));

  const event = await service.create(context, buyer, {
    title: "Laptop sourcing",
    purchaseRequestIds: ["pr-1"],
    closesAt: futureClosesAt(),
  });
  await service.inviteSupplier(context, buyer, event.id, { profileId: "sup-a" });
  const evalAfterInvite = await service.getEvaluation(context, buyer, event.id);
  const token = evalAfterInvite.invitations.find((row) => row.profileId === "sup-a")!.accessToken;

  const portal = await service.getPortalByToken(token);
  record(results, "ac-001:secure-invitation", Boolean(token) && portal.eventNumber === event.eventNumber);

  const submitted = await service.submitQuoteByToken(token, {
    amount: "9000000",
    comments: "Perpetual licence",
    lines: [{ description: "Laptops", quantity: "10", unitPrice: "900000", taxRate: "0" }],
    paymentTerms: [{ milestoneName: "Delivery", percentage: "100", triggerEvent: "Delivery" }],
    year1Amount: "9000000",
    idempotencyKey: "bid-1",
  });
  record(
    results,
    "ac-002:structured-response",
    submitted.ownQuotes.length === 1 && submitted.ownQuotes[0]!.lines.length === 1
  );

  const idempotent = await service.submitQuoteByToken(token, {
    amount: "9000000",
    idempotencyKey: "bid-1",
  });
  record(results, "sr-006:idempotent-submit", idempotent.ownQuotes.length === 1);

  const buyerView = await service.getEvaluation(context, buyer, event.id);
  record(
    results,
    "sealed:buyer-no-prices-while-issued",
    buyerView.commercialSealed && buyerView.comparison.length === 0
  );
  record(
    results,
    "invitation-status",
    buyerView.invitations[0]?.responseStatus === "SUBMITTED" &&
      buyerView.invitations[0]?.hasSubmitted === true
  );

  const uninvited = await expectError(
    () =>
      service.submitQuote(context, buyer, event.id, {
        profileId: "sup-b",
        amount: "1000",
      }),
    PROCUREMENT_ERROR_CODES.INVITATION_NOT_FOUND
  );
  record(results, "ac-004:uninvited-blocked", uninvited);

  const crossTenant = await expectError(
    () => service.getPortalByToken("invalid-token-xyz"),
    PROCUREMENT_ERROR_CODES.INVITATION_NOT_FOUND
  );
  record(results, "ac-005:invalid-token", crossTenant);

  const revised = await service.submitQuoteByToken(token, { amount: "8800000" });
  record(results, "ac-011:header-versions-preserved", revised.ownQuotes.length === 2);

  const withdrawn = await service.withdrawQuoteByToken(token);
  record(
    results,
    "ac-013:withdraw-while-open",
    withdrawn.canWithdraw === false && withdrawn.ownQuotes.at(-1)?.status === "WITHDRAWN"
  );

  record(
    results,
    "ac-014:notification-on-submit",
    notifications.deliveryCalls.length >= 1
  );

  notifications.failNext = true;
  await service.submitQuoteByToken(token, { amount: "8700000" });
  const afterNotifyFail = await service.getPortalByToken(token);
  record(
    results,
    "ac-014:bid-stored-if-notify-fails",
    afterNotifyFail.ownQuotes.some((row) => row.amount === "8700000.00")
  );

  const clarified = await service.askClarificationByToken(token, "Is warranty included?");
  record(results, "ac-007:clarification-recorded", clarified.clarifications.length === 1);

  await service.answerClarification(context, buyer, event.id, {
    clarificationId: clarified.clarifications[0]!.id,
    answer: "Yes, 3-year warranty is included.",
  });
  const answered = await service.getEvaluation(context, buyer, event.id);
  record(results, "ac-007:clarification-answered", answered.clarifications[0]?.answer?.includes("warranty") === true);

  await service.inviteSupplier(context, buyer, event.id, { profileId: "sup-b" });
  const tokenB = (await service.getEvaluation(context, buyer, event.id)).invitations.find(
    (row) => row.profileId === "sup-b"
  )!.accessToken;
  const portalB = await service.getPortalByToken(tokenB);
  record(
    results,
    "ac-007b:clarification-visible-all-vendors",
    portalB.clarifications.some((row) => row.question.includes("warranty")) &&
      portalB.clarifications.some((row) => row.answer?.includes("3-year"))
  );

  await service.submitQuote(context, buyer, event.id, {
    profileId: "sup-a",
    amount: "8600000",
    capturedOnBehalf: true,
  });
  record(
    results,
    "ac-008:staff-capture-attributed",
    audit.entries.some(
      (entry) =>
        entry.action === PROCUREMENT_AUDIT_ACTIONS.SOURCING_QUOTE_SUBMITTED &&
        entry.references?.capturedOnBehalf === "true"
    )
  );

  const portalText = JSON.stringify(portal);
  record(
    results,
    "ac-009:supplier-isolation",
    !portalText.includes("Beta") && !portalText.includes("budget") && !portalText.includes("savings")
  );

  const past = new Date();
  past.setDate(past.getDate() - 1);
  await store.store.updateClosesAt(context.businessId, event.id, past, "buyer-1");
  const closed = await expectError(
    () => service.submitQuoteByToken(token, { amount: "1000" }),
    PROCUREMENT_ERROR_CODES.TENDER_CLOSED
  );
  record(results, "ac-006:closed-blocks-submit", closed);

  record(
    results,
    "ac-010:no-award-in-ip04",
    !readFileSync(path.join(ROOT, "src/modules/procurement/services/sourcing-response-rules.ts"), "utf8").includes(
      "insertAward"
    )
  );

  const badTerms = await expectError(
    async () => {
      const { store: termsStore, service: svc } = harness();
      termsStore.seedApprovedRequest(approvedPr("pr-terms", "PR-000099", "10000000"));
      termsStore.seedSupplier(supplierSnapshot("sup-a", "pty-a", "Alpha Ltd"));
      const ev = await svc.create(context, buyer, {
        title: "Terms test",
        purchaseRequestIds: ["pr-terms"],
        closesAt: futureClosesAt(),
      });
      await svc.inviteSupplier(context, buyer, ev.id, { profileId: "sup-a" });
      const t = (await svc.getEvaluation(context, buyer, ev.id)).invitations[0]!.accessToken;
      await svc.submitQuoteByToken(t, {
        amount: "1000",
        paymentTerms: [{ milestoneName: "A", percentage: "60" }],
      });
    },
    PROCUREMENT_ERROR_CODES.INVALID_INPUT
  );
  record(results, "sr-011:payment-terms-100", badTerms);

  for (const relative of REQUIRED_FILES) {
    record(results, `files:${relative}`, existsSync(path.join(ROOT, relative)));
  }

  return results;
}

async function main() {
  console.log("\nBP-009 IP-04 SUPPLIER RESPONSE SMOKE VALIDATION\n");
  const results = await runCases();
  const failed = results.filter((row) => !row.ok);
  console.log(
    `\n${failed.length === 0 ? "PASS" : "FAIL"} — ${results.length - failed.length}/${results.length} checks`
  );
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
