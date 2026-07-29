/**
 * Purpose:
 * Party document metadata — binaries live in object storage (not PostgreSQL).
 *
 * Design rationale:
 * Storage provider abstraction allows future S3/Azure/GCS backends.
 * Version replacement links via supersedes_document_id for audit history.
 *
 * Implementation Package:
 * BP-002 / IP-007 – Party Documents
 */

import {
  bigint,
  boolean,
  date,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { party } from "./party";

export const partyDocument = pgTable("party_document", {
  id: uuid("id").defaultRandom().primaryKey(),

  businessId: uuid("business_id")
    .references(() => business.id)
    .notNull(),

  partyId: uuid("party_id")
    .references(() => party.id)
    .notNull(),

  documentTypeCode: varchar("document_type_code", { length: 50 }).notNull(),

  storageProviderCode: varchar("storage_provider_code", { length: 50 }).notNull(),

  storageBucket: varchar("storage_bucket", { length: 200 }).notNull(),

  fileReference: varchar("file_reference", { length: 1000 }).notNull(),

  originalFileName: varchar("original_file_name", { length: 500 }).notNull(),

  mimeType: varchar("mime_type", { length: 150 }).notNull(),

  fileSizeBytes: bigint("file_size_bytes", { mode: "number" }).notNull(),

  fileHash: varchar("file_hash", { length: 128 }),

  issueDate: date("issue_date"),

  expiryDate: date("expiry_date"),

  statusCode: varchar("status_code", { length: 50 }).notNull(),

  isVerified: boolean("is_verified").default(false).notNull(),

  verifiedBy: uuid("verified_by"),

  verifiedAt: timestamp("verified_at", { withTimezone: true }),

  verificationMethodCode: varchar("verification_method_code", { length: 50 }),

  supersedesDocumentId: uuid("supersedes_document_id"),

  notes: varchar("notes", { length: 2000 }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  createdBy: uuid("created_by"),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedBy: uuid("updated_by"),

  deletedAt: timestamp("deleted_at", { withTimezone: true }),

  version: integer("version").default(1).notNull(),
});
