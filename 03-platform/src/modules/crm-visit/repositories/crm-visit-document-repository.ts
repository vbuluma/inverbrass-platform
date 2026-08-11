import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { crmVisitDocument } from "@/db/schema/crm-visit-document";

type DbClient = PostgresJsDatabase<typeof schema>;

export class CrmVisitDocumentRepository {
  async insert(
    values: {
      businessId: string;
      visitId: string;
      fileName: string;
      mimeType?: string | null;
      storageKey: string;
      fileSizeBytes?: number | null;
      uploadedBy?: string | null;
    },
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(crmVisitDocument)
      .values({
        businessId: values.businessId,
        visitId: values.visitId,
        fileName: values.fileName,
        mimeType: values.mimeType ?? null,
        storageKey: values.storageKey,
        fileSizeBytes: values.fileSizeBytes ?? null,
        uploadedBy: values.uploadedBy ?? null,
      })
      .returning();
    return row;
  }

  async listByVisitId(visitId: string, dbClient: DbClient = getDb()) {
    return dbClient
      .select()
      .from(crmVisitDocument)
      .where(eq(crmVisitDocument.visitId, visitId));
  }
}

export function createCrmVisitDocumentRepository() {
  return new CrmVisitDocumentRepository();
}
