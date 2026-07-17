CREATE TABLE "user_login_history" (
	"id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"ip_address" varchar(45),
	"user_agent" varchar(512),
	"login_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_login_history_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX "user_login_history_user_id_login_at_idx" ON "user_login_history" USING btree ("user_id", "login_at" DESC NULLS LAST);
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "last_login";
