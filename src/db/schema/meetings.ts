import { sql } from "drizzle-orm";
import { bigint, index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./users";
import { projects } from "./projects";
import {
  meetingTypes,
  meetingStatuses,
  meetingAttachmentTypes,
  agendaTypes,
  resolutionStatuses,
} from "./lookups";

export const resolutionTypeEnum = pgEnum("meeting_resolution_type", [
  "APPROVED",
  "ACKNOWLEDGED",
  "CONDITIONAL_APPROVAL",
  "RECONSIDER",
  "NOT_APPROVED",
  "NOT_CONSIDERED",
]);

export const meetingDocumentTypeEnum = pgEnum("meeting_document_type", [
  "MEETING_DOCUMENT",
  "MEETING_MINUTES",
]);

export const meetings = pgTable("meetings", {
  id: uuid("id").primaryKey(),
  meetingNo: varchar("meeting_no", { length: 100 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  meetingTypeId: integer("meeting_type_id").references(() => meetingTypes.id).notNull(),
  meetingDate: timestamp("meeting_date").notNull(),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  location: varchar("location", { length: 500 }),
  description: text("description"),
  meetingStatusId: integer("meeting_status_id").references(() => meetingStatuses.id).notNull(),
  createdBy: uuid("created_by").references(() => users.userId).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: uuid("updated_by").references(() => users.userId),
  completedAt: timestamp("completed_at"),
  cancelledAt: timestamp("cancelled_at"),
  cancelReason: text("cancel_reason"),
}, (table) => ({
  meetingWorkflowIdx: index("meetings_workflow_idx").on(table.meetingTypeId, table.meetingStatusId, table.meetingDate),
}));

export const agendas = pgTable("agendas", {
  id: uuid("id").primaryKey(),
  meetingId: uuid("meeting_id")
    .references(() => meetings.id, { onDelete: "cascade" })
    .notNull(),
  projectId: uuid("project_id").references(() => projects.id),
  agendaNumber: varchar("agenda_number", { length: 50 }).notNull(),
  sortOrder: integer("sort_order").notNull(),
  agendaTypeId: integer("agenda_type_id").references(() => agendaTypes.id).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  meetingSortOrderIdx: uniqueIndex("agendas_meeting_sort_order_idx").on(table.meetingId, table.sortOrder),
  meetingProjectIdx: uniqueIndex("agendas_meeting_project_idx")
    .on(table.meetingId, table.projectId)
    .where(sql`${table.projectId} is not null`),
  projectMeetingIdx: index("agendas_project_meeting_idx").on(table.projectId, table.meetingId),
}));

export const meetingAttachments = pgTable("meeting_attachments", {
  id: uuid("id").primaryKey(),
  meetingId: uuid("meeting_id")
    .references(() => meetings.id, { onDelete: "cascade" })
    .notNull(),
  agendaId: uuid("agenda_id").references(() => agendas.id, { onDelete: "cascade" }),
  meetingDocTypeId: integer("meeting_doc_type_id").references(() => meetingAttachmentTypes.id).notNull(),
  uploadedBy: uuid("uploaded_by").references(() => users.userId).notNull(),
  fileName: varchar("file_name", { length: 500 }).notNull(),
  fileUrl: varchar("file_url", { length: 1000 }).notNull(),
  fileType: varchar("file_type", { length: 100 }).notNull(),
  documentType: meetingDocumentTypeEnum("document_type").default("MEETING_DOCUMENT").notNull(),
  originalFileName: varchar("original_file_name", { length: 500 }),
  storedFileName: varchar("stored_file_name", { length: 500 }),
  storagePath: varchar("storage_path", { length: 1000 }),
  mimeType: varchar("mime_type", { length: 100 }),
  sizeBytes: bigint("size_bytes", { mode: "number" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  meetingDocumentIdx: index("meeting_attachments_meeting_document_idx").on(table.meetingId, table.documentType),
}));

export const resolutions = pgTable("resolutions", {
  id: uuid("id").primaryKey(),
  agendaId: uuid("agenda_id")
    .references(() => agendas.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  resolutionStatusId: integer("resolution_status_id").references(() => resolutionStatuses.id).notNull(),
  resolutionType: resolutionTypeEnum("resolution_type"),
  comment: text("comment"),
  remark: text("remark"),
  recordedBy: uuid("recorded_by").references(() => users.userId).notNull(),
  resolvedAt: timestamp("resolved_at"),
  version: integer("version").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  resolutionAgendaIdx: index("resolutions_agenda_idx").on(table.agendaId),
}));
