import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { businessType } from "./schema/business-type";
import { businessTypes } from "./seeds/business-types";

async function seedDatabase() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is missing.");
  }

  console.log("🌱 Starting InverBrass Platform Seed...");

  // Create ONE database connection
  const sql = postgres(connectionString);
  const db = drizzle(sql);

  try {
    console.log("➡ Seeding Business Types...");

    await db
      .insert(businessType)
      .values(businessTypes)
      .onConflictDoUpdate({
        target: businessType.code,
        set: {
          name: businessType.name,
          description: businessType.description,
          iconCode: businessType.iconCode,
          displayOrder: businessType.displayOrder,
          isActive: businessType.isActive,
        },
      });

    console.log("✅ Business Types seeded successfully.");
  } finally {
    await sql.end();
  }

  console.log("🎉 Platform seed completed.");
}

seedDatabase().catch(console.error);