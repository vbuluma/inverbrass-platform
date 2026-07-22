import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { securityQuestion } from "@/db/schema/security-question";
import { securityQuestions } from "@/db/seeds/security-questions";

type SeedCounts = {
  inserted: number;
  updated: number;
  skipped: number;
};

function emptyCounts(): SeedCounts {
  return { inserted: 0, updated: 0, skipped: 0 };
}

export async function seedSecurityQuestions(
  db: PostgresJsDatabase
): Promise<SeedCounts> {
  const counts = emptyCounts();

  for (const row of securityQuestions) {
    const [existing] = await db
      .select({ id: securityQuestion.id })
      .from(securityQuestion)
      .where(eq(securityQuestion.code, row.code))
      .limit(1);

    const values = {
      code: row.code,
      questionText: row.questionText,
      displayOrder: row.displayOrder,
      isActive: row.isActive,
    };

    if (!existing) {
      await db.insert(securityQuestion).values(values);
      counts.inserted += 1;
      continue;
    }

    await db
      .update(securityQuestion)
      .set({
        ...values,
        updatedAt: new Date(),
      })
      .where(eq(securityQuestion.id, existing.id));

    counts.updated += 1;
  }

  return counts;
}
