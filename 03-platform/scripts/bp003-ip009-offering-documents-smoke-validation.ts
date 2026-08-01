/**
 * Smoke-validate BP-003 / IP-009 Offering Documents & Compliance.
 * Usage: npx tsx scripts/bp003-ip009-offering-documents-smoke-validation.ts
 */

import "@/lib/env/load-env";

import { existsSync } from "node:fs";
import path from "node:path";

import { closeDb } from "@/db/client";
import { PRODUCT_WORKSPACE_TABS } from "@/modules/product/constants";
import { mapOfferingDocumentsToEvidence } from "@/modules/product/adapters/offering-document-evidence-adapter";
import {
  isAllowedFileSize,
  isAllowedMimeType,
} from "@/modules/product/services/offering-document-rules";
import { createOfferingDocumentService } from "@/modules/product/services/offering-document-service";
import { uploadOfferingDocumentMetadataSchema } from "@/modules/product/validators/offering-document-validators";

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "drizzle/0037_bp003_ip009_offering_documents.sql",
  "src/db/schema/offering-document.ts",
  "src/db/schema/offering-document-link.ts",
  "src/modules/product/repositories/offering-document-repository.ts",
  "src/modules/product/repositories/offering-document-link-repository.ts",
  "src/modules/product/adapters/offering-document-evidence-adapter.ts",
  "src/modules/product/services/offering-document-rules.ts",
  "src/modules/product/services/offering-document-service.ts",
  "src/modules/product/validators/offering-document-validators.ts",
  "src/modules/product/actions/offering-document-actions.ts",
  "src/modules/product/components/offering-documents-panel.tsx",
  "src/modules/product/components/offering-compliance-panel.tsx",
];

type SmokeResult = { name: string; ok: boolean; detail?: string };

function checkFiles(): SmokeResult[] {
  return REQUIRED_FILES.map((relativePath) => ({
    name: `file:${relativePath}`,
    ok: existsSync(path.join(ROOT, relativePath)),
    detail: existsSync(path.join(ROOT, relativePath))
      ? undefined
      : "Missing required file.",
  }));
}

function checkRules(): SmokeResult[] {
  return [
    {
      name: "rule:pdf mime allowed",
      ok: isAllowedMimeType("application/pdf"),
    },
    {
      name: "rule:file size limit",
      ok: isAllowedFileSize(1024) && !isAllowedFileSize(50 * 1024 * 1024),
    },
    {
      name: "rule:documents tab available",
      ok: PRODUCT_WORKSPACE_TABS.some(
        (tab) => tab.id === "documents" && tab.available
      ),
    },
    {
      name: "rule:compliance tab available",
      ok: PRODUCT_WORKSPACE_TABS.some(
        (tab) => tab.id === "compliance" && tab.available
      ),
    },
    {
      name: "adapter:evidence mapping",
      ok: mapOfferingDocumentsToEvidence([]).length === 0,
    },
  ];
}

function checkValidators(): SmokeResult[] {
  return [
    {
      name: "validator:upload metadata",
      ok: uploadOfferingDocumentMetadataSchema.safeParse({
        documentTypeCode: "TERMS",
      }).success,
    },
  ];
}

function checkService(): SmokeResult[] {
  return [
    {
      name: "service:OfferingDocumentService instantiates",
      ok: createOfferingDocumentService() instanceof Object,
    },
  ];
}

async function main() {
  const results = [...checkFiles(), ...checkRules(), ...checkValidators(), ...checkService()];
  const failed = results.filter((r) => !r.ok);

  console.log("BP-003 IP-009 Offering Documents Smoke Validation\n");
  for (const result of results) {
    console.log(`${result.ok ? "PASS" : "FAIL"}  ${result.name}${result.detail ? ` — ${result.detail}` : ""}`);
  }

  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  await closeDb();
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch(async (error) => {
  console.error(error);
  await closeDb();
  process.exit(1);
});
