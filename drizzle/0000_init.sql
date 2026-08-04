CREATE TYPE "public"."booking_source" AS ENUM('link', 'ops', 'whatsapp');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('pending', 'confirmed', 'deposit_paid', 'completed', 'no_show', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."currency" AS ENUM('EUR', 'ALL');--> statement-breakpoint
CREATE TYPE "public"."locale" AS ENUM('en', 'it', 'sq');--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"operator_id" text NOT NULL,
	"service_id" text NOT NULL,
	"date" text NOT NULL,
	"time" text NOT NULL,
	"guest_name" text NOT NULL,
	"guest_phone" text NOT NULL,
	"guest_locale" "locale" DEFAULT 'it' NOT NULL,
	"guests" integer NOT NULL,
	"status" "booking_status" DEFAULT 'pending' NOT NULL,
	"total_eur" numeric(10, 2) NOT NULL,
	"deposit_eur" numeric(10, 2) NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"source" "booking_source" DEFAULT 'link' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "operators" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"tagline" text DEFAULT '' NOT NULL,
	"city" text NOT NULL,
	"whatsapp" text NOT NULL,
	"phone" text NOT NULL,
	"currency" "currency" DEFAULT 'EUR' NOT NULL,
	"locale" "locale" DEFAULT 'it' NOT NULL,
	"deposit_note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "operators_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" text PRIMARY KEY NOT NULL,
	"operator_id" text NOT NULL,
	"name" text NOT NULL,
	"name_it" text NOT NULL,
	"name_sq" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"duration_minutes" integer NOT NULL,
	"capacity" integer NOT NULL,
	"price_eur" numeric(10, 2) NOT NULL,
	"deposit_percent" integer DEFAULT 30 NOT NULL,
	"meeting_point" text DEFAULT '' NOT NULL,
	"days_of_week" jsonb NOT NULL,
	"departures" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;
