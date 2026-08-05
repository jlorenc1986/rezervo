ALTER TABLE "operators" ADD COLUMN "auth_user_id" text;--> statement-breakpoint
ALTER TABLE "operators" ADD CONSTRAINT "operators_auth_user_id_unique" UNIQUE("auth_user_id");
