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
    // ระบุ Path ของโฟลเดอร์ที่เก็บไฟล์ .sql (ต้องตรงกับใน drizzle.config.ts)
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("✅ Database Migration completed successfully!");
  } catch (error) {
    console.error("❌ An error occurred while running the migration:", error);
    process.exit(1);
  } finally {
    // ปิด Connection เสมอหลังจากทำงานเสร็จ เพื่อคืนสิทธิ์ให้กับฐานข้อมูล
    await migrationClient.end();
  }
}

// เรียกใช้งานฟังก์ชัน
runMigration();