/**
 * Purpose:
 * Smoke-validate BP-002 / IP-007 Documents & Compliance (platform refactor).
 *
 * READ-ONLY:
 * This script must never seed, repair, insert, update, or delete data.
 */

import "@/lib/env/load-env";

import { existsSync } from "node:fs";
import path from "node:path";

import { count, eq } from "drizzle-orm";

import { closeDb, getDb } from "@/db/client";
import { documentType } from "@/db/schema/document-type";
import { regulatoryRuleSet } from "@/db/schema/regulatory-rule-set";
import { requiredDocument } from "@/db/schema/required-document";
import {
  COMPLIANCE_DISPLAY_STATUSES,
  buildComplianceSummary,
  buildRequirementRows,
  isDocumentExpired,
  resolveRequirementStatus,
  VERIFICATION_METHOD_CODES,
} from "@/core/document-compliance";
import {
  PARTY_DOCUMENT_ALLOWED_MIME_TYPES,
  PARTY_DOCUMENT_MAX_SIZE_BYTES,
  PARTY_DOCUMENT_STATUS_CODES,
  PARTY_WORKSPACE_TABS,
  STORAGE_PROVIDER_CODES,
} from "@/modules/party/constants";
import {
  buildStorageObjectPath,
  canDownloadDocument,
  canVerifyDocument,
  formatFileSizeDisplay,
  isAllowedFileSize,
  isAllowedMimeType,
  isPartyDocumentStatusCode,
} from "@/modules/party/services/party-document-rules";
import {
  uploadPartyDocumentMetadataSchema,
  verifyPartyDocumentSchema,
} from "@/modules/party/validators/party-document-validators";

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "src/core/document-compliance/constants.ts",
  "src/core/document-compliance/types.ts",
  "src/core/document-compliance/index.ts",
  "src/core/document-compliance/services/compliance-assembler.ts",
  "src/core/document-compliance/services/validity-rules.ts",
  "src/core/document-compliance/services/verification-rules.ts",
  "src/core/document-compliance/repositories/verification-method-repository.ts",
  "src/core/shared/storage/types.ts",
  "src/core/shared/storage/supabase-storage-provider.ts",
  "src/core/shared/storage/index.ts",
  "src/core/localization-regulatory/types.ts",
  "src/core/localization-regulatory/index.ts",
  "src/core/localization-regulatory/repositories/regulatory-config-repository.ts",
  "src/core/localization-regulatory/services/regulatory-document-requirements-service.ts",
  "src/db/schema/document-type.ts",
  "src/db/schema/party-document.ts",
  "src/db/schema/required-document.ts",
  "src/db/schema/verification-method.ts",
  "src/db/seeds/document-types.ts",
  "src/db/seeds/document-types-seed.ts",
  "src/db/seeds/regulatory-document-requirements.ts",
  "src/db/seeds/regulatory-document-requirements-seed.ts",
  "src/db/seeds/verification-methods.ts",
  "src/db/seeds/verification-methods-seed.ts",
  "drizzle/0018_bp002_ip007_party_documents.sql",
  "drizzle/0019_eng003b_regulatory_document_requirements.sql",
  "drizzle/0020_document_compliance_platform_refactor.sql",
  "src/modules/party/adapters/party-document-evidence-adapter.ts",
  "src/modules/party/repositories/party-document-repository.ts",
  "src/modules/party/services/party-document-service.ts",
  "src/modules/party/services/party-document-rules.ts",
  "src/modules/party/services/party-document-compliance-rules.ts",
  "src/modules/party/validators/party-document-validators.ts",
  "src/modules/party/actions/party-document-actions.ts",
  "src/modules/party/components/party-documents-panel.tsx",
];

type SmokeResult = {
  name: string;
  ok: boolean;
  detail?: string;
};

function checkRequiredFiles(): SmokeResult[] {
  return REQUIRED_FILES.map((relativePath) => {
    const absolute = path.join(ROOT, relativePath);
    const ok = existsSync(absolute);
    return {
      name: `file:${relativePath}`,
      ok,
      detail: ok ? undefined : "Missing required Documents & Compliance file.",
    };
  });
}

function checkValidators(): SmokeResult[] {
  return [
    {
      name: "validator:uploadMetadata happy path",
      ok: uploadPartyDocumentMetadataSchema.safeParse({
        documentTypeCode: "PASSPORT",
        issueDate: "2024-01-15",
      }).success,
    },
    {
      name: "validator:uploadMetadata rejects missing type",
      ok: !uploadPartyDocumentMetadataSchema.safeParse({
        documentTypeCode: "",
      }).success,
    },
    {
      name: "validator:verifyDocument",
      ok: verifyPartyDocumentSchema.safeParse({ notes: "Verified in person" })
        .success,
    },
  ];
}

function checkRules(): SmokeResult[] {
  return [
    {
      name: "rules:pdf mime allowed",
      ok: isAllowedMimeType("application/pdf"),
    },
    {
      name: "rules:exe mime rejected",
      ok: !isAllowedMimeType("application/x-msdownload"),
    },
    {
      name: "rules:max file size",
      ok: isAllowedFileSize(PARTY_DOCUMENT_MAX_SIZE_BYTES),
    },
    {
      name: "rules:oversized file rejected",
      ok: !isAllowedFileSize(PARTY_DOCUMENT_MAX_SIZE_BYTES + 1),
    },
    {
      name: "rules:can verify active unverified",
      ok: canVerifyDocument(PARTY_DOCUMENT_STATUS_CODES.ACTIVE, false),
    },
    {
      name: "rules:cannot verify inactive",
      ok: !canVerifyDocument(PARTY_DOCUMENT_STATUS_CODES.INACTIVE, false),
    },
    {
      name: "rules:download active only",
      ok: canDownloadDocument(PARTY_DOCUMENT_STATUS_CODES.ACTIVE),
    },
    {
      name: "rules:status code guard",
      ok: isPartyDocumentStatusCode("ACTIVE"),
    },
    {
      name: "rules:storage path format",
      ok: buildStorageObjectPath(
        "biz-id",
        "party-id",
        "doc-id",
        "scan.pdf"
      ).includes("biz-id/party-id/doc-id"),
    },
    {
      name: "rules:file size display",
      ok: formatFileSizeDisplay(2048).includes("KB"),
    },
  ];
}

function checkComplianceRules(): SmokeResult[] {
  const requiredDocuments = buildRequirementRows({
    requirements: [
      {
        documentTypeCode: "NATIONAL_ID",
        requirementLevel: "REQUIRED",
        displayOrder: 1,
      },
      {
        documentTypeCode: "PASSPORT",
        requirementLevel: "OPTIONAL",
        displayOrder: 2,
      },
    ],
    evidence: [
      {
        id: "doc-1",
        documentTypeCode: "NATIONAL_ID",
        issueDate: "2024-01-01",
        expiryDate: "2030-01-01",
        lifecycleStatusCode: PARTY_DOCUMENT_STATUS_CODES.ACTIVE,
        isVerified: true,
        verificationMethodCode: VERIFICATION_METHOD_CODES.MANUAL,
        verifiedBy: null,
        verifiedAt: null,
        notes: null,
        fileHash: "abc",
        originalFileName: "id.pdf",
      },
    ],
    typeNameByCode: new Map([
      ["NATIONAL_ID", "National ID"],
      ["PASSPORT", "Passport"],
    ]),
  });

  const summary = buildComplianceSummary({
    countryCode: "KE",
    countryName: "Kenya",
    ruleSetCode: "KE_INDIVIDUAL",
    ruleSetName: "Individual - Kenya",
    requiredDocuments,
  });

  const resolved = resolveRequirementStatus(
    {
      id: "doc-2",
      documentTypeCode: "NATIONAL_ID",
      issueDate: "2020-01-01",
      expiryDate: "2020-12-31",
      lifecycleStatusCode: PARTY_DOCUMENT_STATUS_CODES.ACTIVE,
      isVerified: true,
      verificationMethodCode: VERIFICATION_METHOD_CODES.MANUAL,
      verifiedBy: null,
      verifiedAt: null,
      notes: null,
      fileHash: null,
      originalFileName: "id.pdf",
    },
    new Date("2025-01-01")
  );

  return [
    {
      name: "compliance:validity and verification separated",
      ok:
        requiredDocuments[0].validityStatus === "VALID" &&
        requiredDocuments[0].verificationStatus === "VERIFIED",
    },
    {
      name: "compliance:missing requirement detected",
      ok: requiredDocuments.some(
        (row) =>
          row.documentTypeCode === "PASSPORT" &&
          row.status === COMPLIANCE_DISPLAY_STATUSES.MISSING
      ),
    },
    {
      name: "compliance:verified required counted",
      ok: summary.verifiedCount === 1 && summary.requiredCount === 1,
    },
    {
      name: "compliance:percent from verified required only",
      ok: summary.compliancePercent === 100,
    },
    {
      name: "compliance:expired date detection",
      ok: isDocumentExpired("2020-01-01", new Date("2025-01-01")),
    },
    {
      name: "compliance:resolve expired display status",
      ok: resolved.displayStatus === COMPLIANCE_DISPLAY_STATUSES.EXPIRED,
    },
    {
      name: "compliance:verification methods configurable",
      ok: VERIFICATION_METHOD_CODES.GOVERNMENT_API === "GOVERNMENT_API",
    },
  ];
}

function checkWorkspaceTab(): SmokeResult[] {
  const documentsTab = PARTY_WORKSPACE_TABS.find((t) => t.id === "documents");
  return [
    {
      name: "workspace:documents tab exists",
      ok: Boolean(documentsTab),
    },
    {
      name: "workspace:documents tab available",
      ok: documentsTab?.available === true,
    },
    {
      name: "workspace:documents tab compliance label",
      ok: documentsTab?.label === "Documents & Compliance",
    },
  ];
}

async function checkReferenceData(): Promise<SmokeResult[]> {
  try {
    const db = getDb();
    const [docTypeRow] = await db
      .select({ total: count() })
      .from(documentType)
      .where(eq(documentType.isActive, true));

    const [ruleSetRow] = await db
      .select({ total: count() })
      .from(regulatoryRuleSet)
      .where(eq(regulatoryRuleSet.isActive, true));

    const [requiredDocRow] = await db
      .select({ total: count() })
      .from(requiredDocument)
      .where(eq(requiredDocument.isActive, true));

    const docTotal = Number(docTypeRow?.total ?? 0);
    const ruleSetTotal = Number(ruleSetRow?.total ?? 0);
    const requiredDocTotal = Number(requiredDocRow?.total ?? 0);

    return [
      {
        name: "reference-data:document_type",
        ok: docTotal > 0,
        detail:
          docTotal > 0
            ? undefined
            : "document_type catalogue is empty — run db:seed.",
      },
      {
        name: "reference-data:regulatory_rule_set",
        ok: ruleSetTotal > 0,
        detail:
          ruleSetTotal > 0
            ? undefined
            : "regulatory_rule_set is empty — run db:seed.",
      },
      {
        name: "reference-data:required_document",
        ok: requiredDocTotal > 0,
        detail:
          requiredDocTotal > 0
            ? undefined
            : "required_document is empty — run db:seed.",
      },
    ];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [
      {
        name: "reference-data:document_type",
        ok: false,
        detail: /party_document|document_type|required_document|regulatory_rule_set|does not exist|Failed query/i.test(
          message
        )
          ? "Run db:migrate then db:seed before smoke validation."
          : message,
      },
      {
        name: "reference-data:regulatory_rule_set",
        ok: false,
        detail: "Run db:migrate then db:seed before smoke validation.",
      },
      {
        name: "reference-data:required_document",
        ok: false,
        detail: "Run db:migrate then db:seed before smoke validation.",
      },
    ];
  }
}

function checkConstants(): SmokeResult[] {
  return [
    {
      name: "constants:storage provider",
      ok: STORAGE_PROVIDER_CODES.SUPABASE === "SUPABASE",
    },
    {
      name: "constants:allowed mime types",
      ok: PARTY_DOCUMENT_ALLOWED_MIME_TYPES.includes("application/pdf"),
    },
  ];
}

async function main() {
  const results: SmokeResult[] = [
    ...checkRequiredFiles(),
    ...checkValidators(),
    ...checkRules(),
    ...checkComplianceRules(),
    ...checkWorkspaceTab(),
    ...checkConstants(),
    ...(await checkReferenceData()),
  ];

  let failed = 0;
  for (const result of results) {
    const status = result.ok ? "PASS" : "FAIL";
    if (!result.ok) {
      failed += 1;
    }
    console.log(
      `[${status}] ${result.name}${result.detail ? ` — ${result.detail}` : ""}`
    );
  }

  console.log("");
  console.log(
    failed === 0
      ? `✅ Documents & Compliance smoke validation passed (${results.length} checks).`
      : `❌ Documents & Compliance smoke validation failed (${failed}/${results.length} checks).`
  );

  await closeDb();
  process.exitCode = failed === 0 ? 0 : 1;
}

main().catch(async (error) => {
  console.error(error);
  await closeDb();
  process.exitCode = 1;
});
