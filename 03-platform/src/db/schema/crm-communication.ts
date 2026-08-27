/**
 * CRM Communication log — omnichannel interaction history (IP-08).
 */

import {
  boolean,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { business } from "./business";
import { crmActivity } from "./crm-activity";
import { crmVisit } from "./crm-visit";
import { party } from "./party";

export const crmCommunication = pgTable(
  "crm_communication",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => business.id)
      .notNull(),
    communicationNumber: varchar("communication_number", { length: 40 }).notNull(),
    channelTypeCode: varchar("channel_type_code", { length: 50 }).notNull(),
    directionCode: varchar("direction_code", { length: 20 }).notNull(),
    subject: varchar("subject", { length: 300 }),
    summary: varchar("summary", { length: 4000 }).notNull(),
    communicatedAt: timestamp("communicated_at", { withTimezone: true }).notNull(),
    durationSeconds: integer("duration_seconds"),
    statusCode: varchar("status_code", { length: 50 }).default("LOGGED").notNull(),
    consentCheckResult: varchar("consent_check_result", { length: 50 }),
    templateCode: varchar("template_code", { length: 100 }),
    threadId: uuid("thread_id"),
    primaryPartyId: uuid("primary_party_id")
      .references(() => party.id)
      .notNull(),
    contactChannelValue: varchar("contact_channel_value", { length: 300 }),
    ownerUserId: uuid("owner_user_id").notNull(),
    isSensitive: boolean("is_sensitive").default(false).notNull(),
    addendumToId: uuid("addendum_to_id"),
    linkedActivityId: uuid("linked_activity_id").references(() => crmActivity.id),
    linkedVisitId: uuid("linked_visit_id").references(() => crmVisit.id),
    recordSourceCode: varchar("record_source_code", { length: 50 })
      .default("MANUAL")
      .notNull(),
    deliveryStatusCode: varchar("delivery_status_code", { length: 50 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid("created_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    updatedBy: uuid("updated_by"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    version: integer("version").default(1).notNull(),
  },
  (table) => [
    uniqueIndex("crm_communication_business_number_uidx").on(
      table.businessId,
      table.communicationNumber
    ),
  ]
);
