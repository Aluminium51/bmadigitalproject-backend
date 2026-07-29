import { index, integer, numeric, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { resolutions } from "./meetings";
import { projects } from "./projects";
import { projectStatuses } from "./lookups";
import { users } from "./users";

export const meetingResolutionRevisions = pgTable("meeting_resolution_revisions", {
  id: uuid("id").defaultRandom().primaryKey(),
  resolutionId: uuid("resolution_id").references(() => resolutions.id, { onDelete: "cascade" }).notNull(),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  revisionNumber: integer("revision_number").notNull(),
  previousResolutionType: varchar("previous_resolution_type", { length: 64 }),
  newResolutionType: varchar("new_resolution_type", { length: 64 }).notNull(),
  previousRemark: text("previous_remark"),
  newRemark: text("new_remark"),
  previousProjectStatusId: integer("previous_project_status_id").references(() => projectStatuses.id),
  newProjectStatusId: integer("new_project_status_id").references(() => projectStatuses.id).notNull(),
  previousLatestApprovedBudget: numeric("previous_latest_approved_budget", { precision: 15, scale: 2 }),
  newLatestApprovedBudget: numeric("new_latest_approved_budget", { precision: 15, scale: 2 }),
  reason: text("reason"),
  changedBy: uuid("changed_by").references(() => users.userId).notNull(),
  changeMode: varchar("change_mode", { length: 40 }).notNull(),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
}, (table) => ({
  resolutionRevisionIdx: index("meeting_resolution_revisions_resolution_idx").on(table.resolutionId, table.revisionNumber),
  resolutionRevisionProjectIdx: index("meeting_resolution_revisions_project_idx").on(table.projectId, table.changedAt),
}));
