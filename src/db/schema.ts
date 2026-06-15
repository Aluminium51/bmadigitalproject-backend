// src/db/schema.ts
// คุยกับ PostgreSQL โดยตรง (ผ่าน Drizzle ORM)
import { pgTable, uuid, varchar, timestamp, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: varchar("username", { length: 255 }).unique().notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  position: varchar("position", { length: 255 }).notNull(),
  department: varchar("department", { length: 255 }).notNull(),
  division: varchar("division", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  mobilePhone: varchar("mobile_phone", { length: 20 }).notNull(),
  officePhone: varchar("office_phone", { length: 20 }),
  internalExtension: varchar("internal_extension", { length: 10 }),
  role: varchar("role", { length: 50 }).default("USER").notNull(),
  
  // 🟢 1. เพิ่มสถานะการใช้งาน (เปิดใช้งานเป็นค่าเริ่มต้น)
  isActive: boolean("is_active").default(true).notNull(),
  
  // 🟢 2. เพิ่มฟิลด์สำหรับระบบลืมรหัสผ่าน (ปล่อยว่างได้)
  resetPasswordToken: varchar("reset_password_token", { length: 255 }).unique(),
  resetPasswordExpires: timestamp("reset_password_expires"),

  // 🟢 3. ทำระบบยืนยันอีเมล
  isVerified: boolean("is_verified").default(false).notNull(),
  verificationToken: varchar("verification_token", { length: 255 }).unique(),
  verificationExpires: timestamp("verification_expires"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
