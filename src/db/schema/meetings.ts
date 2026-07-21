import { index, pgTable, uuid, integer, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";
import { projects } from "./projects";
import {
  meetingTypes,
  meetingStatuses,
  meetingAttachmentTypes,
  agendaTypes,
  resolutionStatuses,
} from "./lookups";

export const meetings = pgTable("meetings", {
  id: uuid("id").primaryKey(),
  meetingNo: varchar("meeting_no", { length: 100 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  meetingTypeId: integer("meeting_type_id").references(() => meetingTypes.id).notNull(),
  meetingDate: timestamp("meeting_date").notNull(),
  location: varchar("location", { length: 500 }),
  meetingStatusId: integer("meeting_status_id").references(() => meetingStatuses.id).notNull(),
  createdBy: uuid("created_by").references(() => users.userId).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: uuid("updated_by").references(() => users.userId),
});

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
  meetingSortOrderIdx: index("agendas_meeting_sort_order_idx").on(table.meetingId, table.sortOrder),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const resolutions = pgTable("resolutions", {
  id: uuid("id").primaryKey(),
  agendaId: uuid("agenda_id")
    .references(() => agendas.id, { onDelete: "cascade" })
    .notNull()
    .unique(), // 1-to-1 กับ Agenda
  resolutionStatusId: integer("resolution_status_id").references(() => resolutionStatuses.id).notNull(),
  comment: text("comment"),
  recordedBy: uuid("recorded_by").references(() => users.userId).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});