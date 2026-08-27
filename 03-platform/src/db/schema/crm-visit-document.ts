import { integer, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { business } from "./business";
import { crmVisit } from "./crm-visit";

export const crmVisitDocument = pgTable("crm_visit_document", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .references(() => business.id)
    .notNull(),
  visitId: uuid("visit_id")
    .references(() => crmVisit.id)
    .notNull(),
  fileName: varchar("file_name", { length: 300 }).notNull(),
  mimeType: varchar("mime_type", { length: 150 }),
  storageKey: varchar("storage_key", { length: 500 }).notNull(),
  fileSizeBytes: integer("file_size_bytes"),
  uploadedBy: uuid("uploaded_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
