// src/db/schema.ts
// คุยกับ PostgreSQL โดยตรง (ผ่าน Drizzle ORM)
import { pgTable, uuid, varchar, timestamp, text } from "drizzle-orm/pg-core";

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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
