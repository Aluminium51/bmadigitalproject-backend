CREATE TABLE "project_status_logs" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
  "project_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "old_status_id" integer NOT NULL,
  "new_status_id" integer NOT NULL,
  "remark" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "project_status_logs_project_id_projects_project_id_fk"
    FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE cascade,
  CONSTRAINT "project_status_logs_user_id_users_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action,
  CONSTRAINT "project_status_logs_old_status_id_project_statuses_project_status_id_fk"
    FOREIGN KEY ("old_status_id") REFERENCES "public"."project_statuses"("project_status_id") ON DELETE no action,
  CONSTRAINT "project_status_logs_new_status_id_project_statuses_project_status_id_fk"
    FOREIGN KEY ("new_status_id") REFERENCES "public"."project_statuses"("project_status_id") ON DELETE no action
);
--> statement-breakpoint
UPDATE "project_statuses" SET "project_status_name" = CASE "project_status_id"
  WHEN 1 THEN 'Draft'
  WHEN 2 THEN 'Pending Secretary'
  WHEN 3 THEN 'Returned by Secretary'
  WHEN 4 THEN 'Rejected by Secretary'
  WHEN 5 THEN 'Pending Assignment'
  WHEN 6 THEN 'In Analysis'
  ELSE "project_status_name"
END
WHERE "project_status_id" BETWEEN 1 AND 6;
--> statement-breakpoint
INSERT INTO "project_statuses" ("project_status_id", "project_status_name") VALUES
  (7, 'Returned by Analyst'),
  (8, 'Rejected by Analyst'),
  (9, 'Pending Small Board'),
  (10, 'Returned by Small Board'),
  (11, 'Rejected by Small Board'),
  (12, 'Pending Big Board'),
  (13, 'Returned by Big Board'),
  (14, 'Rejected by Big Board'),
  (15, 'Approved')
ON CONFLICT ("project_status_id") DO UPDATE SET "project_status_name" = EXCLUDED."project_status_name";
--> statement-breakpoint
UPDATE "projects" SET "project_status_id" = CASE "project_status_id"
  WHEN 5 THEN 15
  WHEN 6 THEN 4
  ELSE "project_status_id"
END;
--> statement-breakpoint
SELECT setval(
  pg_get_serial_sequence('project_statuses', 'project_status_id'),
  GREATEST((SELECT MAX("project_status_id") FROM "project_statuses"), 1),
  true
);
