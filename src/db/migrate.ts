// src/db/migrate.ts
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL!;

async function runMigration() {
  console.log("⏳ Starting Database Migration...");

  // สำหรับการรัน Migrate แนะนำให้ใช้ { max: 1 } 
  // เพื่อเปิด Connection เพียงอันเดียวในการเข้าไปอัปเดตตาราง ป้องกันปัญหา Connection ซ้อนกัน
  const migrationClient = postgres(connectionString, { max: 1 });
  const db = drizzle(migrationClient);

  try {
    // Path has to be the same as the one used in your migration config (drizzle.config.ts)
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("✅ Database Migration completed successfully!");
  } catch (error) {
    console.error("❌ An error occurred while running the migration:", error);
    process.exit(1);
  } finally {
    // Close the migration client to free up resources
    await migrationClient.end();
  }
}

// เรียกใช้งานฟังก์ชัน
runMigration();