/**
 * Purpose:
 * Offering document metadata — binaries in object storage (ENG-015 consumer).
 *
 * Implementation Package:
 * BP-003 / IP-009 – Offering Documents & Compliance
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
import { product } from "./product";

export const offeringDocument = pgTable("offering_document", {
  id: uuid("id").defaultRandom().primaryKey(),

  businessId: uuid("business_id")
    .references(() => business.id)
    .notNull(),

  productId: uuid("product_id")
    .references(() => product.id)
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
