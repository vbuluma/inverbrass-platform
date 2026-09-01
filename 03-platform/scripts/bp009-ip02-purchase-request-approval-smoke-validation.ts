/**
 * Purpose:
 * Smoke-validate BP-009 / IP-02 Purchase Requests & Procurement Approval.
 * Exercises production services with an in-memory store. Not production runtime.
 *
 * Usage:
 *   npx tsx scripts/bp009-ip02-purchase-request-approval-smoke-validation.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  ALL_PROCUREMENT_PERMISSIONS,
  PROCUREMENT_ERROR_CODES,
  PROCUREMENT_PERMISSIONS,
  PROCUREMENT_STATUS_CODES,
  ProcurementError,
  PURCHASE_REQUEST_STATUSES,
  QUALIFICATION_STATUS_CODES,
} from "@/modules/procurement";
import { scanProcurementArchitecture } from "@/modules/procurement/architecture-scan";
import { RecordingProcurementAudit } from "@/modules/procurement/services/procurement-audit-helper";
import { PurchaseRequestService } from "@/modules/procurement/services/purchase-request-service";
import { InMemoryPurchaseRequestStore } from "@/modules/procurement/services/purchase-request-memory-store";
import { OVER_BUDGET_MODES } from "@/modules/procurement/constants";
import type {
  ProcurementActor,
  ProcurementPartyRef,
  ProcurementProfileRecord,
  PurchaseRequestLineDraft,
  SuggestedSupplierSnapshot,
} from "@/modules/procurement/types";

const ROOT = path.resolve(__dirname, "..");

type Result = { name: string; ok: boolean; detail?: string };

const REQUIRED_FILES = [
  "drizzle/0080_bp009_ip002_purchase_requests.sql",
  "src/db/schema/procurement-purchase-request.ts",
  "src/modules/procurement/services/purchase-request-service.ts",
  "src/app/(authenticated)/(app)/procurement/requests/page.tsx",
  "src/app/(authenticated)/(app)/procurement/requests/new/page.tsx",
];

function ctx(businessId: string, userId = "user-a"): CurrentBusinessContext {
  return {
    businessId,
    platformUserId: userId,
    businessMembershipId: `mem-${businessId}`,
  };
}

function actor(
  userId: string,
  permissions: readonly string[] = ALL_PROCUREMENT_PERMISSIONS
): ProcurementActor {
  return { userId, permissions };
}

function line(overrides: Partial<PurchaseRequestLineDraft> = {}): PurchaseRequestLineDraft {
  return {
    description: "Laptops",
    quantity: "10",
    uom: "EA",
    estimatedValue: "2000000",
    ...overrides,
  };
}

function party(id: string, businessId = "biz-a"): ProcurementPartyRef {
  return {
    id,
    businessId,
    displayName: "ABC Technologies",
    partyNumber: "PTY-0001",
    partyTypeCode: "ORGANIZATION",
    hasActiveSupplierRole: true,
  };
}

function profile(
  id: string,
  partyId: string,
  statusCode: string
): ProcurementProfileRecord {
  return {
    id,
    businessId: "biz-a",
    partyId,
    profileNumber: "SPP-000001",
    statusCode,
    qualificationStatusCode: QUALIFICATION_STATUS_CODES.QUALIFIED,
    isPreferred: false,
    isApproved: true,
    defaultDeliveryTerms: null,
    defaultPaymentTerms: null,
    expectedLeadTimeDays: null,
    statusReason: statusCode === PROCUREMENT_STATUS_CODES.BLACKLISTED ? "Breach" : null,
    statusEffectiveDate: "2026-01-01",
    statusReviewDate: null,
    statusAuthority: null,
    createdAt: new Date(),
    createdBy: "user-a",
    updatedAt: new Date(),
    updatedBy: "user-a",
    deletedAt: null,
    version: 1,
  };
}

function supplierSnapshot(
  profileId: string,
  partyId: string,
  statusCode: string
): SuggestedSupplierSnapshot {
  const partyRef = party(partyId);
  const profileRef = profile(profileId, partyId, statusCode);
  return {
    profileId,
    partyId,
    party: partyRef,
    profile: profileRef,
    latestQualification: {
      id: `qual-${profileId}`,
      businessId: "biz-a",
      profileId,
      qualificationTypeCode: "GENERAL",
      outcomeCode: QUALIFICATION_STATUS_CODES.QUALIFIED,
      effectiveDate: "2026-01-01",
      expiryDate: "2027-01-01",
      reviewDate: null,
      reviewerUserId: null,
      notes: null,
      createdAt: new Date(),
      createdBy: "user-a",
      updatedAt: new Date(),
      updatedBy: "user-a",
      deletedAt: null,
      version: 1,
      evidenceDocumentIds: [],
    },
  };
}

function harness(requiresApproval = true) {
  const store = new InMemoryPurchaseRequestStore();
  store.control.requiresApproval = requiresApproval;
  store.reorders.set("SCA-000010", {
    reference: "SCA-000010",
    description: "Warehouse pallets",
    recommendedQuantity: "40",
  });
  store.suppliers.set("profile-ok", supplierSnapshot("profile-ok", "party-a", PROCUREMENT_STATUS_CODES.ACTIVE));
  store.suppliers.set(
    "profile-black",
    supplierSnapshot("profile-black", "party-b", PROCUREMENT_STATUS_CODES.BLACKLISTED)
  );
  const audit = new RecordingProcurementAudit();
  const service = new PurchaseRequestService({
    requests: store.requestsPort,
    numbering: store.numbering,
    audit,
    workflow: store.workflow(requiresApproval),
    controls: store.controls,
    suggestedSupplier: store.suggestedSupplier,
    reorderOrigin: store.reorderOrigin,
  });
  return { store, audit, service };
}

function record(results: Result[], name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
}

async function expectError(run: () => Promise<unknown>, code: string) {
  try {
    await run();
    return false;
  } catch (error) {
    return error instanceof ProcurementError && error.code === code;
  }
}

async function runAcceptance(): Promise<Result[]> {
  const results: Result[] = [];
  const { store, audit, service } = harness(true);
  const context = ctx("biz-a");
  const requester = actor("user-a");
  const approver = actor("user-b");

  const created = await service.create(context, requester, {
    procurementType: "GOODS",
    currencyCode: "KES",
    budgetSource: "EXISTING_BUDGET",
    budgetReference: "BUD-IT-2026",
    budgetAvailableAmount: "4000000",
    lines: [line(), line({ description: "Monitors", estimatedValue: "400000" })],
  });
  record(
    results,
    "AC-001",
    created.lines.length === 2 && created.requestNumber.startsWith("PR-")
  );

  const fromReorder = await service.create(context, requester, {
    originType: "INVENTORY_REORDER",
    originReference: "SCA-000010",
    procurementType: "GOODS",
    currencyCode: "KES",
    budgetSource: "EXISTING_BUDGET",
    budgetReference: "BUD-WH-2026",
    lines: [],
  });
  record(
    results,
    "AC-002",
    fromReorder.originType === "INVENTORY_REORDER" &&
      fromReorder.originReference === "SCA-000010" &&
      fromReorder.status === PURCHASE_REQUEST_STATUSES.DRAFT
  );

  const submitted = await service.submit(context, requester, created.id);
  record(results, "AC-003", submitted.status === PURCHASE_REQUEST_STATUSES.IN_APPROVAL);

  store.control.overBudgetMode = OVER_BUDGET_MODES.REQUIRE_EVIDENCE;
  const overBudgetBlocked = await expectError(
    () =>
      service.create(context, requester, {
        procurementType: "GOODS",
        currencyCode: "KES",
        budgetSource: "EXISTING_BUDGET",
        budgetReference: "BUD-IT-2026",
        budgetAvailableAmount: "1000",
        lines: [line({ estimatedValue: "2000000" })],
      }),
    PROCUREMENT_ERROR_CODES.BUDGET_EVIDENCE_REQUIRED
  );
  store.control.overBudgetMode = OVER_BUDGET_MODES.BLOCK;
  const overBudgetHard = await expectError(
    () =>
      service.create(context, requester, {
        procurementType: "GOODS",
        currencyCode: "KES",
        budgetSource: "EXISTING_BUDGET",
        budgetReference: "BUD-IT-2026",
        budgetAvailableAmount: "1000",
        lines: [line({ estimatedValue: "2000000" })],
      }),
    PROCUREMENT_ERROR_CODES.OVER_BUDGET
  );
  record(results, "AC-004", overBudgetBlocked && overBudgetHard);

  const selfApprove = await expectError(
    () => service.approve(context, requester, created.id),
    PROCUREMENT_ERROR_CODES.SELF_APPROVAL
  );
  record(results, "AC-005", selfApprove);

  const rejectReason = await expectError(
    () => service.reject(context, approver, created.id, { reason: "" }),
    PROCUREMENT_ERROR_CODES.DECISION_REASON_REQUIRED
  );
  const rejected = await service.reject(ctx("biz-a", "user-b"), approver, created.id, {
    reason: "Specification incomplete",
  });
  record(
    results,
    "AC-006",
    rejectReason &&
      rejected.status === PURCHASE_REQUEST_STATUSES.REJECTED &&
      audit.entries.some((entry) => entry.action === "PROCUREMENT_REQUEST_REJECTED")
  );

  const approvedDraft = await service.create(context, requester, {
    procurementType: "GOODS",
    currencyCode: "KES",
    budgetSource: "EXISTING_BUDGET",
    budgetReference: "BUD-IT-2026",
    budgetAvailableAmount: "5000000",
    lines: [line({ estimatedValue: "500000" })],
  });
  await service.submit(context, requester, approvedDraft.id);
  const approved = await service.approve(ctx("biz-a", "user-b"), approver, approvedDraft.id);
  record(
    results,
    "AC-007",
    approved.readyForSourcing &&
      approved.status === PURCHASE_REQUEST_STATUSES.APPROVED &&
      !readFileSync(
        path.join(ROOT, "src/modules/procurement/services/purchase-request-service.ts"),
        "utf8"
      ).includes("createRfx")
  );

  const suggestedBlocked = await expectError(
    () =>
      service.create(context, requester, {
        procurementType: "GOODS",
        currencyCode: "KES",
        budgetSource: "EXISTING_BUDGET",
        budgetReference: "BUD-IT-2026",
        suggestedProfileId: "profile-black",
        lines: [line({ estimatedValue: "1000" })],
      }),
    PROCUREMENT_ERROR_CODES.SUPPLIER_NOT_ELIGIBLE
  );
  record(results, "AC-008", suggestedBlocked);

  const crossBusiness = await expectError(
    () => service.get(ctx("biz-b"), approver, created.id),
    PROCUREMENT_ERROR_CODES.REQUEST_NOT_FOUND
  );
  record(results, "AC-009", crossBusiness);

  record(
    results,
    "AC-010",
    audit.entries.some((entry) => entry.action === "PROCUREMENT_REQUEST_CREATED") &&
      audit.entries.some((entry) => entry.action === "PROCUREMENT_REQUEST_SUBMITTED")
  );

  const withDoc = await service.create(context, requester, {
    procurementType: "SERVICES",
    currencyCode: "KES",
    budgetSource: "AD_HOC_BUDGET_APPROVAL",
    budgetApprovalReference: "BA-9",
    budgetApprover: "Finance",
    lines: [line({ description: "Training", estimatedValue: "200000" })],
  });
  const documented = await service.attachDocument(context, requester, withDoc.id, {
    documentTypeCode: "PURCHASE_REQUEST_SUPPORTING",
    originalFileName: "spec.pdf",
    storageReference: "doc://spec.pdf",
  });
  record(results, "AC-011", documented.documents.length === 1);

  const scan = scanProcurementArchitecture(path.join(ROOT, "src/modules/procurement"));
  record(results, "AC-012", scan.downstream.length === 0, scan.downstream.join(","));

  const missingBudget = await expectError(
    () =>
      service.create(context, requester, {
        procurementType: "GOODS",
        currencyCode: "KES",
        budgetSource: "EXISTING_BUDGET",
        lines: [line({ estimatedValue: "1000" })],
      }),
    PROCUREMENT_ERROR_CODES.BUDGET_REFERENCE_REQUIRED
  );
  record(results, "AC-013", missingBudget);

  store.control.overBudgetMode = OVER_BUDGET_MODES.REQUIRE_EVIDENCE;
  const evidenceOk = await service.create(context, requester, {
    procurementType: "GOODS",
    currencyCode: "KES",
    budgetSource: "EXISTING_BUDGET",
    budgetReference: "BUD-IT-2026",
    budgetAvailableAmount: "1000",
    budgetApprovalReference: "BA-EXTRA",
    lines: [line({ estimatedValue: "2000000" })],
  });
  record(results, "AC-014", evidenceOk.budgetCheckStatus === "OVER_BUDGET");
  store.control.overBudgetMode = OVER_BUDGET_MODES.BLOCK;

  const returnedDraft = await service.create(context, requester, {
    procurementType: "GOODS",
    currencyCode: "KES",
    budgetSource: "EXISTING_BUDGET",
    budgetReference: "BUD-IT-2026",
    budgetAvailableAmount: "5000000",
    lines: [line({ estimatedValue: "250000" })],
  });
  await service.submit(context, requester, returnedDraft.id);
  await service.returnRequest(ctx("biz-a", "user-b"), approver, returnedDraft.id, {
    reason: "Add delivery location",
  });
  const edited = await service.update(context, requester, returnedDraft.id, {
    deliveryLocation: "Nairobi warehouse",
  });
  const resubmitted = await service.submit(context, requester, returnedDraft.id);
  record(
    results,
    "AC-015",
    edited.status === PURCHASE_REQUEST_STATUSES.RETURNED &&
      edited.deliveryLocation === "Nairobi warehouse" &&
      resubmitted.status === PURCHASE_REQUEST_STATUSES.IN_APPROVAL
  );

  const cancelled = await service.cancel(context, requester, fromReorder.id, {
    reason: "No longer required",
  });
  const cancelApproved = await expectError(
    () => service.submit(context, requester, fromReorder.id),
    PROCUREMENT_ERROR_CODES.REQUEST_NOT_EDITABLE
  );
  record(
    results,
    "AC-016",
    cancelled.status === PURCHASE_REQUEST_STATUSES.CANCELLED && cancelApproved
  );

  const unauthorized = await expectError(
    () =>
      service.approve(context, actor("user-b", [PROCUREMENT_PERMISSIONS.REQUEST_READ]), approvedDraft.id),
    PROCUREMENT_ERROR_CODES.UNAUTHORIZED
  );
  record(results, "AC-017", unauthorized);

  record(
    results,
    "AC-018",
    existsSync(
      path.join(ROOT, "src/modules/procurement/services/supplier-eligibility-service.ts")
    ) && existsSync(path.join(ROOT, "src/app/(authenticated)/(app)/procurement/suppliers/page.tsx"))
  );

  const nav = readFileSync(path.join(ROOT, "src/lib/navigation/platform-nav-config.ts"), "utf8");
  record(results, "AC-019", nav.includes('href: "/procurement/suppliers"') && nav.includes('href: "/procurement/requests"'));
  record(
    results,
    "AC-020",
    !nav.includes("/procurement/rfq") &&
      nav.includes("/procurement/orders") &&
      nav.includes("/procurement/contracts")
  );

  const ui = [
    "src/modules/procurement/components/purchase-request-list.tsx",
    "src/modules/procurement/components/purchase-request-create-form.tsx",
    "src/modules/procurement/components/purchase-request-workspace.tsx",
    "src/modules/procurement/components/procurement-hub-workspace.tsx",
  ]
    .map((relative) => readFileSync(path.join(ROOT, relative), "utf8"))
    .join("\n")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  record(results, "ux:no-ip-labels", !ui.includes("BP-009") && !ui.includes("IP-02") && !ui.includes("ENG-005"));

  for (const relative of REQUIRED_FILES) {
    record(results, `files:${relative}`, existsSync(path.join(ROOT, relative)));
  }

  const silentEdit = await expectError(
    () => service.update(context, requester, approvedDraft.id, { justification: "changed" }),
    PROCUREMENT_ERROR_CODES.REQUEST_NOT_EDITABLE
  );
  record(results, "rule:no-silent-approved-edit", silentEdit);

  const duplicateSubmit = await service.submit(context, requester, resubmitted.id);
  record(results, "rule:idempotent-submit", duplicateSubmit.status === PURCHASE_REQUEST_STATUSES.IN_APPROVAL);

  record(results, "scan:no-supplier-master", scan.supplierMaster.length === 0);
  void store;
  return results;
}

async function main() {
  console.log("\nBP-009 IP-02 PURCHASE REQUEST & APPROVAL SMOKE VALIDATION\n");
  const results = await runAcceptance();
  const failed = results.filter((row) => !row.ok);
  console.log(
    `\n${failed.length === 0 ? "PASS" : "FAIL"} — ${results.length - failed.length}/${results.length} checks`
  );
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

void main();
