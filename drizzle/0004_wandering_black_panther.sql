ALTER TABLE "project_attachment_types" ADD COLUMN "code" varchar(64);--> statement-breakpoint
ALTER TABLE "project_statuses" ADD COLUMN "code" varchar(64);--> statement-breakpoint
ALTER TABLE "project_types" ADD COLUMN "code" varchar(64);--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "code" varchar(64);--> statement-breakpoint
UPDATE "roles"
SET "code" = CASE UPPER("role_name")
  WHEN 'USER' THEN 'USER'
  WHEN 'ANALYST' THEN 'ANALYST'
  WHEN 'SECRETARY' THEN 'SECRETARY'
  WHEN 'ADMIN' THEN 'ADMIN'
  WHEN 'SUPER_ADMIN' THEN 'SUPER_ADMIN'
  ELSE NULL
END;--> statement-breakpoint
UPDATE "project_statuses"
SET "code" = CASE "project_status_name"
  WHEN 'Draft' THEN 'PROJECT_DRAFT'
  WHEN 'Pending Secretary' THEN 'PROJECT_PENDING_SECRETARY'
  WHEN 'Returned by Secretary' THEN 'PROJECT_RETURNED_SECRETARY'
  WHEN 'Rejected by Secretary' THEN 'PROJECT_REJECTED_SECRETARY'
  WHEN 'Pending Assignment' THEN 'PROJECT_PENDING_ASSIGNMENT'
  WHEN 'In Analysis' THEN 'PROJECT_IN_ANALYSIS'
  WHEN 'Returned by Analyst' THEN 'PROJECT_RETURNED_ANALYST'
  WHEN 'Rejected by Analyst' THEN 'PROJECT_REJECTED_ANALYST'
  WHEN 'Pending Small Board' THEN 'PROJECT_PENDING_SMALL_BOARD'
  WHEN 'Returned by Small Board' THEN 'PROJECT_RETURNED_SMALL_BOARD'
  WHEN 'Rejected by Small Board' THEN 'PROJECT_REJECTED_SMALL_BOARD'
  WHEN 'Pending Big Board' THEN 'PROJECT_PENDING_BIG_BOARD'
  WHEN 'Returned by Big Board' THEN 'PROJECT_RETURNED_BIG_BOARD'
  WHEN 'Rejected by Big Board' THEN 'PROJECT_REJECTED_BIG_BOARD'
  WHEN 'Approved' THEN 'PROJECT_APPROVED'
  ELSE NULL
END;--> statement-breakpoint
UPDATE "project_types"
SET "code" = CASE LOWER("project_type_name")
  WHEN 'hardware' THEN 'HARDWARE'
  WHEN 'software' THEN 'SOFTWARE'
  ELSE NULL
END;--> statement-breakpoint
UPDATE "project_attachment_types"
SET "code" = CASE "doc_type_name"
  WHEN 'system_diagram' THEN 'SYSTEM_DIAGRAM'
  WHEN 'network_diagram' THEN 'NETWORK_DIAGRAM'
  WHEN 'use_case_diagram' THEN 'USE_CASE_DIAGRAM'
  WHEN 'security_diagram' THEN 'SECURITY_DIAGRAM'
  WHEN 'presentation' THEN 'PRESENTATION'
  WHEN 'report' THEN 'REPORT'
  WHEN 'quotation' THEN 'QUOTATION'
  WHEN 'one_page_summary' THEN 'ONE_PAGE_SUMMARY'
  WHEN 'approval_document' THEN 'APPROVAL_DOCUMENT'
  WHEN 'bma_dc_usage' THEN 'BMA_DC_USAGE'
  WHEN 'other' THEN 'OTHER'
  ELSE NULL
END;--> statement-breakpoint
ALTER TABLE "project_attachment_types" ADD CONSTRAINT "project_attachment_types_code_unique" UNIQUE("code");--> statement-breakpoint
ALTER TABLE "project_statuses" ADD CONSTRAINT "project_statuses_code_unique" UNIQUE("code");--> statement-breakpoint
ALTER TABLE "project_types" ADD CONSTRAINT "project_types_code_unique" UNIQUE("code");--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_code_unique" UNIQUE("code");
