import { boolean, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { business } from "./business";
import { crmCase } from "./crm-case";

export const crmCaseEntityLink = pgTable("crm_case_entity_link", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .references(() => business.id)
    .notNull(),
  caseId: uuid("case_id")
    .references(() => crmCase.id)
    .notNull(),
  entityTypeCode: varchar("entity_type_code", { length: 50 }).notNull(),
  entityId: uuid("entity_id").notNull(),
  isPrimary: boolean("is_primary").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid("created_by"),
});
