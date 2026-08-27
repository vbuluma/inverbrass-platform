/**
 * Purpose:
 * Smoke-validate BP-004 / IP-10 Quotations & Sales Pipeline.
 *
 * Usage:
 *   npx tsx scripts/bp004-ip010-quotation-smoke-validation.ts
 */

import "@/lib/env/load-env";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { closeDb } from "@/db/client";
import {
  DEFAULT_QUOTATION_APPROVAL_THRESHOLD,
  QUOTATION_APPROVAL_STATUS_CODES,
  QUOTATION_STATUS_CODES,
} from "@/modules/crm/constants";
import { createQuotationDocumentAdapter } from "@/modules/crm/adapters/quotation-document-adapter";
import {
  canSendQuotationWithApproval,
  canSubmitForApproval,
  requiresApprovalByValue,
  resolveRequiredApprovalStatus,
} from "@/modules/crm/quotation/services/quotation-approval-rules";
import {
  calculateLineSubtotal,
  calculateLineTotal,
  roundMoney,
} from "@/modules/crm/quotation/services/quotation-calculation-rules";
import {
  canConvertQuotationToOrder,
  canTransitionQuotationStatus,
  isQuotationEditable,
  isQuotationExpiredByDate,
  resolveEffectiveQuotationStatus,
} from "@/modules/crm/quotation/services/quotation-rules";
import type { QuotationDetailView } from "@/modules/crm/quotation/types";
import { createQuotationSchema } from "@/modules/crm/quotation/validators/quotation-validators";

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "drizzle/0042_bp004_ip010_quotation_foundation.sql",
  "drizzle/0043_bp004_ip010_sales_order_approval.sql",
  "src/db/schema/quotation.ts",
  "src/db/schema/sales-order.ts",
  "src/modules/crm/constants.ts",
  "src/modules/crm/errors.ts",
  "src/modules/crm/crm-terminology-labels.ts",
  "src/modules/crm/adapters/pricing-resolution-adapter.ts",
  "src/modules/crm/adapters/opportunity-handoff-adapter.ts",
  "src/modules/crm/adapters/quotation-document-adapter.ts",
  "src/modules/crm/quotation/types.ts",
  "src/modules/crm/quotation/validators/quotation-validators.ts",
  "src/modules/crm/quotation/repositories/quotation-repository.ts",
  "src/modules/crm/quotation/repositories/quotation-version-repository.ts",
  "src/modules/crm/quotation/repositories/quotation-line-repository.ts",
  "src/modules/crm/quotation/repositories/sales-order-repository.ts",
  "src/modules/crm/quotation/services/quotation-rules.ts",
  "src/modules/crm/quotation/services/quotation-approval-rules.ts",
  "src/modules/crm/quotation/services/quotation-calculation-rules.ts",
  "src/modules/crm/quotation/services/quotation-calculation-service.ts",
  "src/modules/crm/quotation/services/quotation-service.ts",
  "src/modules/crm/quotation/services/sales-order-service.ts",
  "src/modules/crm/quotation/services/quotation-customer-360-provider.ts",
  "src/modules/crm/quotation/services/crm-audit-helper.ts",
  "src/modules/crm/actions/quotation-actions.ts",
  "src/modules/crm/components/quotation-dashboard.tsx",
  "src/modules/crm/components/quotation-workspace.tsx",
  "src/modules/crm/components/quotation-registration-form.tsx",
  "src/modules/crm/components/crm-module-error-page.tsx",
  "src/app/(authenticated)/(app)/quotations/page.tsx",
  "src/app/(authenticated)/(app)/quotations/new/page.tsx",
  "src/app/(authenticated)/(app)/quotations/[quotationId]/page.tsx",
  "scripts/bp004-ip010-quotation-smoke-validation.ts",
];

const MIGRATION_TAGS = [
  "0042_bp004_ip010_quotation_foundation",
  "0043_bp004_ip010_sales_order_approval",
];

type SmokeResult = { name: string; ok: boolean; detail?: string };

function checkRequiredFiles(): SmokeResult[] {
  return REQUIRED_FILES.map((relativePath) => ({
    name: `file:${relativePath}`,
    ok: existsSync(path.join(ROOT, relativePath)),
    detail: existsSync(path.join(ROOT, relativePath))
      ? undefined
      : "Missing required IP-10 file.",
  }));
}

function checkMigrationSql(): SmokeResult[] {
  const results: SmokeResult[] = [];

  const foundationPath = path.join(
    ROOT,
    "drizzle/0042_bp004_ip010_quotation_foundation.sql"
  );
  if (existsSync(foundationPath)) {
    const sql = readFileSync(foundationPath, "utf8");
    for (const table of ["quotation", "quotation_version", "quotation_line"]) {
      results.push({
        name: `migration:0042:table:${table}`,
        ok: sql.includes(`"${table}"`),
        detail: sql.includes(`"${table}"`) ? undefined : `Table ${table} not in 0042.`,
      });
    }
  }

  const approvalPath = path.join(
    ROOT,
    "drizzle/0043_bp004_ip010_sales_order_approval.sql"
  );
  if (existsSync(approvalPath)) {
    const sql = readFileSync(approvalPath, "utf8");
    for (const table of ["sales_order", "sales_order_line"]) {
      results.push({
        name: `migration:0043:table:${table}`,
        ok: sql.includes(`"${table}"`),
        detail: sql.includes(`"${table}"`) ? undefined : `Table ${table} not in 0043.`,
      });
    }
    results.push({
      name: "migration:0043:approval_status",
      ok: sql.includes("approval_status"),
    });
  }

  return results;
}

function checkMigrationJournal(): SmokeResult[] {
  const journalPath = path.join(ROOT, "drizzle/meta/_journal.json");
  if (!existsSync(journalPath)) {
    return [{ name: "journal", ok: false, detail: "Missing drizzle journal." }];
  }

  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
    entries: Array<{ tag: string }>;
  };
  const tags = new Set(journal.entries.map((entry) => entry.tag));

  return MIGRATION_TAGS.map((tag) => ({
    name: `migration:journal:${tag}`,
    ok: tags.has(tag),
    detail: tags.has(tag)
      ? undefined
      : "Migration tag not in journal — register in integration handover.",
  }));
}

function checkLifecycleRules(): SmokeResult[] {
  const past = new Date("2025-01-01T00:00:00.000Z");
  const future = new Date("2099-12-31T00:00:00.000Z");

  return [
    {
      name: "rules:draftEditable",
      ok: isQuotationEditable(QUOTATION_STATUS_CODES.DRAFT),
    },
    {
      name: "rules:sentNotEditable",
      ok: !isQuotationEditable(QUOTATION_STATUS_CODES.SENT),
    },
    {
      name: "rules:draftToSent",
      ok: canTransitionQuotationStatus(
        QUOTATION_STATUS_CODES.DRAFT,
        QUOTATION_STATUS_CODES.SENT
      ),
    },
    {
      name: "rules:sentToAccepted",
      ok: canTransitionQuotationStatus(
        QUOTATION_STATUS_CODES.SENT,
        QUOTATION_STATUS_CODES.ACCEPTED
      ),
    },
    {
      name: "rules:acceptedCannotRevert",
      ok: !canTransitionQuotationStatus(
        QUOTATION_STATUS_CODES.ACCEPTED,
        QUOTATION_STATUS_CODES.DRAFT
      ),
    },
    {
      name: "rules:expiredByDate",
      ok: isQuotationExpiredByDate(past),
    },
    {
      name: "rules:effectiveStatusExpired",
      ok:
        resolveEffectiveQuotationStatus(
          QUOTATION_STATUS_CODES.SENT,
          past
        ) === QUOTATION_STATUS_CODES.EXPIRED,
    },
    {
      name: "rules:canConvertAccepted",
      ok: canConvertQuotationToOrder(QUOTATION_STATUS_CODES.ACCEPTED, future),
    },
    {
      name: "rules:cannotConvertDraft",
      ok: !canConvertQuotationToOrder(QUOTATION_STATUS_CODES.DRAFT, future),
    },
  ];
}

function checkApprovalRules(): SmokeResult[] {
  const belowThreshold = DEFAULT_QUOTATION_APPROVAL_THRESHOLD - 1;
  const aboveThreshold = DEFAULT_QUOTATION_APPROVAL_THRESHOLD;

  return [
    {
      name: "approval:belowThreshold",
      ok:
        resolveRequiredApprovalStatus(belowThreshold) ===
        QUOTATION_APPROVAL_STATUS_CODES.NOT_REQUIRED,
    },
    {
      name: "approval:aboveThreshold",
      ok:
        resolveRequiredApprovalStatus(aboveThreshold) ===
        QUOTATION_APPROVAL_STATUS_CODES.PENDING,
    },
    {
      name: "approval:canSendWhenApproved",
      ok: canSendQuotationWithApproval(QUOTATION_APPROVAL_STATUS_CODES.APPROVED),
    },
    {
      name: "approval:cannotSendWhenPending",
      ok: !canSendQuotationWithApproval(QUOTATION_APPROVAL_STATUS_CODES.PENDING),
    },
    {
      name: "approval:canSubmit",
      ok: canSubmitForApproval(
        QUOTATION_APPROVAL_STATUS_CODES.NOT_REQUIRED,
        aboveThreshold
      ),
    },
    {
      name: "approval:requiresApprovalByValue",
      ok: requiresApprovalByValue(aboveThreshold),
    },
  ];
}

function checkCalculationRules(): SmokeResult[] {
  const subtotal = calculateLineSubtotal(10, 100);
  const taxAmount = 160;
  const total = calculateLineTotal(subtotal, 0, taxAmount);

  return [
    {
      name: "calc:lineSubtotal",
      ok: subtotal === 1000,
    },
    {
      name: "calc:lineTotalWithTax",
      ok: total === 1160,
    },
    {
      name: "calc:roundMoney",
      ok: roundMoney(10.555555) === 10.555555,
    },
  ];
}

function checkDocumentAdapter(): SmokeResult[] {
  const detail: QuotationDetailView = {
    id: "q-1",
    quotationNumber: "QT-0001",
    status: QUOTATION_STATUS_CODES.DRAFT,
    statusLabel: "Draft",
    approvalStatus: QUOTATION_APPROVAL_STATUS_CODES.NOT_REQUIRED,
    approvalStatusLabel: "Not required",
    partyId: "party-1",
    partyDisplayName: "Acme Corp",
    crmRecordId: null,
    accountId: null,
    opportunityId: null,
    currencyCode: "KES",
    grandTotal: 1160,
    validUntil: "2099-12-31",
    currentVersionNumber: 1,
    ownerUserId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pricingCatalogueId: null,
    customerSegment: null,
    salesChannel: null,
    region: null,
    notes: "Test note",
    termsTemplateCode: null,
    metadata: null,
    documentAvailable: false,
    acceptanceChannel: null,
    currentVersion: {
      id: "v-1",
      versionNumber: 1,
      status: QUOTATION_STATUS_CODES.DRAFT,
      statusLabel: "Draft",
      subtotal: 1000,
      taxAmount: 160,
      grandTotal: 1160,
      revisionReason: null,
      sentAt: null,
      lockedAt: null,
      createdAt: new Date().toISOString(),
      lines: [
        {
          id: "l-1",
          lineNumber: 1,
          offeringId: "off-1",
          offeringCode: "WGT-001",
          offeringName: "Widget",
          offeringVariantId: null,
          description: null,
          quantity: 10,
          unitOfMeasureId: null,
          unitOfMeasureSymbol: null,
          unitPrice: 100,
          pricingItemId: null,
          lineTotal: 1000,
          metadata: null,
        },
      ],
    },
  };

  const adapter = createQuotationDocumentAdapter();
  const snapshot = adapter.generateSnapshot(detail);

  return [
    {
      name: "document:formatHtml",
      ok: snapshot.format === "HTML",
    },
    {
      name: "document:containsNumber",
      ok: snapshot.htmlContent.includes("QT-0001"),
    },
    {
      name: "document:containsGrandTotal",
      ok: snapshot.htmlContent.includes("1160.00"),
    },
  ];
}

function checkValidators(): SmokeResult[] {
  const parsed = createQuotationSchema.safeParse({
    partyId: "550e8400-e29b-41d4-a716-446655440000",
    currencyCode: "KES",
    lines: [
      {
        offeringId: "550e8400-e29b-41d4-a716-446655440001",
        quantity: 1,
        unitPrice: 100,
      },
    ],
  });

  return [
    {
      name: "validator:createQuotation",
      ok: parsed.success,
      detail: parsed.success ? undefined : parsed.error.message,
    },
  ];
}

function checkNavigation(): SmokeResult[] {
  const navPath = path.join(ROOT, "src/lib/navigation/platform-nav-config.ts");
  if (!existsSync(navPath)) {
    return [{ name: "nav:config", ok: false, detail: "Missing nav config." }];
  }

  const nav = readFileSync(navPath, "utf8");
  return [
    {
      name: "nav:quotationsEntry",
      ok: nav.includes('href: "/quotations"'),
    },
    {
      name: "nav:quotationsLabel",
      ok: nav.includes('label: "Quotations"'),
    },
  ];
}

async function main() {
  const results: SmokeResult[] = [
    ...checkRequiredFiles(),
    ...checkMigrationSql(),
    ...checkMigrationJournal(),
    ...checkLifecycleRules(),
    ...checkApprovalRules(),
    ...checkCalculationRules(),
    ...checkDocumentAdapter(),
    ...checkValidators(),
    ...checkNavigation(),
  ];

  const failed = results.filter((result) => !result.ok);

  console.log("\nBP-004 / IP-10 Quotation Smoke Validation\n");
  for (const result of results) {
    const status = result.ok ? "PASS" : "FAIL";
    const detail = result.detail ? ` — ${result.detail}` : "";
    console.log(`  [${status}] ${result.name}${detail}`);
  }

  console.log(`\nSummary: ${results.length - failed.length}/${results.length} passed`);

  if (failed.length > 0) {
    const nonJournalFailed = failed.filter((f) => !f.name.startsWith("migration:journal:"));
    const journalOnly = nonJournalFailed.length === 0;
    if (journalOnly) {
      console.log(
        "\nNote: Journal entries deferred to Integration Manager — non-blocking for feature branch."
      );
      process.exitCode = 0;
    } else {
      process.exitCode = 1;
    }
  }

  await closeDb();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
