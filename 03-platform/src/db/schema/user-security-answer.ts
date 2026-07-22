import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { platformUser } from "./platform-user";
import { securityQuestion } from "./security-question";

export const userSecurityAnswer = pgTable(
  "user_security_answer",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    platformUserId: uuid("platform_user_id")
      .references(() => platformUser.id)
      .notNull(),

    securityQuestionId: uuid("security_question_id")
      .references(() => securityQuestion.id)
      .notNull(),

    answerHash: varchar("answer_hash", { length: 255 }).notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("user_security_answer_platform_user_uidx").on(
      table.platformUserId
    ),
  ]
);
