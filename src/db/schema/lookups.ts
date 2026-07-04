// src/db/schema/lookups.ts
import { pgTable, serial, varchar, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Project Lookup Tables
// ---------------------------------------------------------------------------
export const projectStatuses = pgTable("project_statuses", {
  id: serial("project_status_id").primaryKey(),
  statusName: varchar("project_status_name", { length: 255 }).unique().notNull(),
});

export const projectTypes = pgTable("project_types", {
  id: serial("project_type_id").primaryKey(),
  typeName: varchar("project_type_name", { length: 255 }).unique().notNull(),
});

export const projectAttachmentTypes = pgTable("project_attachment_types", {
  id: serial("doc_type_id").primaryKey(),
  docTypeName: varchar("doc_type_name", { length: 255 }).unique().notNull(), // ex. 'system_diagram', 'network_diagram', 'use_case_diagram', 'security_diagram', 'presentation', 'report', 'ใบเบิกเงิน', 'other'
});

// ---------------------------------------------------------------------------
// Proposal Lookup Tables
// ---------------------------------------------------------------------------
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

// ตาราง Lookup สำหรับ 4 Quadrants Model
export const fourQuadrants = pgTable("four_quadrants", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // เช่น "Q1: ลดรายจ่าย", "Q2: เพิ่มรายได้"
});

// ตาราง Lookup สำหรับ รองผู้ว่าฯ ที่ดูแล
export const deputyGovernors = pgTable("deputy_governors", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // ชื่อรองผู้ว่าฯ
});