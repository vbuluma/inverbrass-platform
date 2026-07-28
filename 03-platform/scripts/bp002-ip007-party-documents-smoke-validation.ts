/**
 * Purpose:
 * Smoke-validate BP-002 / IP-007 Party Document Management.
 *
 * READ-ONLY:
 * This script must never seed, repair, insert, update, or delete data.
 *
 * Usage:
 *   npx tsx scripts/bp002-ip007-party-documents-smoke-validation.ts
 *
 * Implementation Package:
 * BP-002 / IP-007 – Party Documents
 */

import "@/lib/env/load-env";

import { existsSync } from "node:fs";
import path from "node:path";

import { count, eq } from "drizzle-orm";

import { closeDb, getDb } from "@/db/client";
import { documentType } from "@/db/schema/document-type";
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
  "src/core/shared/storage/types.ts",
  "src/core/shared/storage/supabase-storage-provider.ts",
  "src/core/shared/storage/index.ts",
  "src/db/schema/document-type.ts",
  "src/db/schema/party-document.ts",
  "src/db/seeds/document-types.ts",
  "src/db/seeds/document-types-seed.ts",
  "drizzle/0018_bp002_ip007_party_documents.sql",
  "src/modules/party/repositories/party-document-repository.ts",
  "src/modules/party/services/party-document-service.ts",
  "src/modules/party/services/party-document-rules.ts",
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
      detail: ok ? undefined : "Missing required Party Documents file.",
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
  ];
}

async function checkReferenceData(): Promise<SmokeResult[]> {
  try {
    const db = getDb();
    const [row] = await db
      .select({ total: count() })
      .from(documentType)
      .where(eq(documentType.isActive, true));

    const total = Number(row?.total ?? 0);
    return [
      {
        name: "reference-data:document_type",
        ok: total > 0,
        detail:
          total > 0
            ? undefined
            : "document_type catalogue is empty — run db:seed.",
      },
    ];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [
      {
        name: "reference-data:document_type",
        ok: false,
        detail: /party_document|document_type|does not exist|Failed query/i.test(
          message
        )
          ? "Run db:migrate then db:seed before smoke validation."
          : message,
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
      ? `✅ Party Documents smoke validation passed (${results.length} checks).`
      : `❌ Party Documents smoke validation failed (${failed}/${results.length} checks).`
  );

  await closeDb();
  process.exitCode = failed === 0 ? 0 : 1;
}

main().catch(async (error) => {
  console.error(error);
  await closeDb();
  process.exitCode = 1;
});
