ALTER TABLE "meeting_attachments" DROP CONSTRAINT "meeting_attachments_meeting_id_meetings_id_fk";
--> statement-breakpoint
ALTER TABLE "meeting_attachments" DROP CONSTRAINT "meeting_attachments_agenda_id_agendas_id_fk";
--> statement-breakpoint
ALTER TABLE "agendas" ADD COLUMN "sort_order" integer;
--> statement-breakpoint
WITH numeric_agendas AS (
  SELECT
    "id",
    "meeting_id",
    btrim("agenda_number")::integer AS "numeric_sort_order"
  FROM "agendas"
  WHERE btrim("agenda_number") ~ '^[0-9]+$'
), fallback_agendas AS (
  SELECT
    a."id",
    a."meeting_id",
    coalesce(max(n."numeric_sort_order"), 0)
      + row_number() OVER (PARTITION BY a."meeting_id" ORDER BY a."created_at", a."id")::integer
      AS "fallback_sort_order"
  FROM "agendas" AS a
  LEFT JOIN numeric_agendas AS n ON n."meeting_id" = a."meeting_id"
  WHERE btrim(a."agenda_number") !~ '^[0-9]+$'
  GROUP BY a."id", a."meeting_id", a."created_at"
), ranked_agendas AS (
  SELECT "id", "numeric_sort_order" AS "calculated_sort_order" FROM numeric_agendas
  UNION ALL
  SELECT "id", "fallback_sort_order" AS "calculated_sort_order" FROM fallback_agendas
)
UPDATE "agendas" AS a
SET "sort_order" = ranked_agendas."calculated_sort_order"
FROM ranked_agendas
WHERE a."id" = ranked_agendas."id";
--> statement-breakpoint
ALTER TABLE "agendas" ALTER COLUMN "sort_order" SET NOT NULL;
--> statement-breakpoint
INSERT INTO "agenda_types" ("id", "name")
VALUES (5, 'Any Other Business')
ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name";
--> statement-breakpoint
UPDATE "agendas" SET "agenda_type_id" = 5 WHERE "agenda_type_id" = 4;
--> statement-breakpoint
UPDATE "agendas" SET "agenda_type_id" = 4 WHERE "agenda_type_id" = 3;
--> statement-breakpoint
UPDATE "agenda_types" SET "name" = 'Chairman''s Announcements' WHERE "id" = 1;
--> statement-breakpoint
UPDATE "agenda_types" SET "name" = 'Adoption of Minutes' WHERE "id" = 2;
--> statement-breakpoint
UPDATE "agenda_types" SET "name" = 'Matters Arising / Follow-up' WHERE "id" = 3;
--> statement-breakpoint
UPDATE "agenda_types" SET "name" = 'Matters for Consideration' WHERE "id" = 4;
--> statement-breakpoint
UPDATE "agenda_types" SET "name" = 'Any Other Business' WHERE "id" = 5;
--> statement-breakpoint
SELECT setval(
  pg_get_serial_sequence('agenda_types', 'id'),
  GREATEST((SELECT COALESCE(MAX("id"), 1) FROM "agenda_types"), 1),
  true
);
--> statement-breakpoint
ALTER TABLE "meeting_attachments" ADD CONSTRAINT "meeting_attachments_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "meeting_attachments" ADD CONSTRAINT "meeting_attachments_agenda_id_agendas_id_fk" FOREIGN KEY ("agenda_id") REFERENCES "public"."agendas"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "agendas_meeting_sort_order_idx" ON "agendas" USING btree ("meeting_id","sort_order");
