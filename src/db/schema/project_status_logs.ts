import { pgTable, uuid, integer, text, timestamp } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { users } from "./users";
import { projectStatuses } from "./lookups";

export const projectStatusLogs = pgTable("project_status_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id").references(() => users.userId).notNull(),
  oldStatusId: integer("old_status_id").references(() => projectStatuses.id).notNull(),
  newStatusId: integer("new_status_id").references(() => projectStatuses.id).notNull(),
  remark: text("remark"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
