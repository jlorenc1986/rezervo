ALTER TABLE "operators" ADD COLUMN "deposit_iban" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "operators" ADD COLUMN "deposit_revolut_link" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "operators" ADD COLUMN "deposit_wise_link" text DEFAULT '' NOT NULL;
