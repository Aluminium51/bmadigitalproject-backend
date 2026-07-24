// src/db/schema/projects.ts
import {
  pgTable,
  serial,
  varchar,
  integer,
  boolean,
  timestamp,
  numeric,
  uuid,
  text,
  bigint,
} from "drizzle-orm/pg-core";
import { fourQuadrants, deputyGovernors, divisions } from "./lookups";
import { projectStatuses, projectTypes, projectAttachmentTypes } from "./lookups";
import { users } from "./users";

// ---------------------------------------------------------------------------
// MAIN TABLE: Project
// ---------------------------------------------------------------------------
export const projects = pgTable("projects", {
  id: uuid("project_id").primaryKey(),
  projectCode: varchar("project_code", { length: 50 }).unique(), // เพื่อให้ค้นหาง่ายขึ้น ex. "BMA-67-0001"
  // --- Relations ---
  userId: uuid("user_id").references(() => users.userId).notNull(), // เจ้าของโครงการ
  divisionId: integer("division_id").references(() => divisions.divisionId).notNull(), // ส่วนราชการเจ้าของโครงการ

  projectStatusId: integer("project_status_id").references(() => projectStatuses.id).notNull().default(1),
  projectTypeId: integer("project_type_id").references(() => projectTypes.id),
  fourQuadrantsId: integer("four_quadrants_id").references(() => fourQuadrants.id).notNull(),
  deputyGovernorId: integer("deputy_governor_id").references(() => deputyGovernors.id).notNull(),

  //  --- Budget Summaries ---
  initialRequestedBudget: numeric("initial_requested_budget", { precision: 15, scale: 2 }), // งบที่ขอตอนแรก
  latestApprovedBudget: numeric("latest_approved_budget", { precision: 15, scale: 2 }),     // งบที่อนุมัติจริง/ล่าสุด

  externalTaskId: varchar("external_task_id", { length: 255 }).unique(),

  // --- Project Details ---
  projectName: varchar("project_name", { length: 600 }), // ชื่อล่าสุด ใช้เพื่อแสดงผลและค้นหา
  projectNameOriginal: varchar("project_name_original", { length: 600 }), // ชื่อเดิมที่กรอกตอนสร้างโปรเจกต์ (เก็บไว้เพื่ออ้างอิง)

  // --- Assignment ---
  analystId: uuid("analyst_id"), // ID ผู้วิเคราะห์ที่ได้รับมอบหมาย
  assignedBy: uuid("assigned_by"), // ID ผู้มอบหมาย
  assignedAt: timestamp("assigned_at"),

  // --- Public Access ---
  isPublic: boolean("is_public").default(false).notNull(),
  publicToken: varchar("public_token", { length: 255 }).unique(),

  // --- Audit Trail ---
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: uuid("updated_by"),
  deletedAt: timestamp("deleted_at"),
});

// ---------------------------------------------------------------------------
// 3. SUB TABLE: Project_Attachment
// ---------------------------------------------------------------------------
// user can upload files both create proposal page and project detail page. So we need a separate table to store the attachments.
export const projectAttachments = pgTable("project_attachments", {
  id: uuid("id").primaryKey(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(), // if project is deleted, all attachments will be deleted too
  docTypeId: integer("doc_type_id").references(() => projectAttachmentTypes.id).notNull(),
  uploadedBy: uuid("uploaded_by").references(() => users.userId).notNull(),

  fileName: varchar("file_name", { length: 500 }).notNull(),
  fileUrl: varchar("file_url", { length: 1000 }).notNull(),
  fileType: varchar("file_type", { length: 100 }).notNull(),
  fileSize: bigint("file_size", { mode: "number" }),
  description: text("description"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projectSequences = pgTable("project_sequences", {
  year: integer("year").primaryKey(), // เก็บปี พ.ศ. เช่น 2569 เป็น Primary Key
  lastValue: integer("last_value").default(0).notNull(),
});
