// src/db/schema/lookups.ts
import { pgTable, serial, varchar, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const departments = pgTable("departments", {
  departmentId: serial("department_id").primaryKey(),
  departmentName: varchar("department_name", { length: 255 }).unique().notNull(),
});

// เล็กกว่า departments เพราะ divisions เป็นส่วนย่อยของ departments
export const divisions = pgTable("divisions", {
  divisionId: serial("division_id").primaryKey(),
  departmentId: integer("department_id")
    .references(() => departments.departmentId)
    .notNull(),
  divisionName: varchar("division_name", { length: 255 }).unique().notNull(),
});

// กำหนด Relations เพื่อให้ Drizzle Query แบบ Join ได้ง่ายขึ้น
export const departmentRelations = relations(departments, ({ many }) => ({
  divisions: many(divisions),
}));

export const divisionRelations = relations(divisions, ({ one }) => ({
  department: one(departments, {
    fields: [divisions.departmentId],
    references: [departments.departmentId],
  }),
}));