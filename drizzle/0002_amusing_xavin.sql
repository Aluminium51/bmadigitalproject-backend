ALTER TABLE "project_attachments" ADD COLUMN "file_size" bigint;
--> statement-breakpoint
INSERT INTO "project_attachment_types" ("doc_type_name")
VALUES ('bma_dc_usage')
ON CONFLICT ("doc_type_name") DO NOTHING;
