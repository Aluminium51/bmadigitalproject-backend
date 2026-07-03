// src/db/schema/projects.ts
import { 
  pgTable, 
  serial, 
  varchar, 
  integer, 
  boolean, 
  timestamp, 
  numeric,
  uuid
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// 1. Master Data สำหรับโปรเจกต์
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
// 2. MAIN TABLE: Project
// ---------------------------------------------------------------------------
export const projects = pgTable("projects", {
  id: uuid("project_id").primaryKey(),
  projectCode: varchar("project_code", { length: 50 }).unique(), // เพื่อให้ค้นหาง่ายขึ้น ex. "BMA-67-0001"
  // --- Relations ---
  userId: uuid("user_id").notNull(), // คนสร้างโปรเจกต์ (FK -> users.user_id)
  divisionId: integer("division_id").notNull(), // ส่วนราชการเจ้าของโครงการ (FK -> divisions.division_id)
  
  projectStatusId: integer("project_status_id").references(() => projectStatuses.id),
  projectTypeId: integer("project_type_id").references(() => projectTypes.id),

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
});

// ---------------------------------------------------------------------------
// 3. SUB TABLE: Project_Attachment
// ---------------------------------------------------------------------------
export const projectAttachments = pgTable("project_attachments", {
  id: serial("project_atm_id").primaryKey(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  
  uploadedBy: uuid("uploaded_by").notNull(), // คนอัปโหลด (FK -> users.user_id)
  
  fileName: varchar("file_name", { length: 500 }).notNull(),
  fileUrl: varchar("file_url", { length: 1000 }).notNull(),
  fileType: varchar("file_type", { length: 100 }), // เช่น 'pdf', 'image/png'
  
  docTypeId: integer("doc_type_id").references(() => projectAttachmentTypes.id).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});