ALTER TABLE "invoices" DROP COLUMN IF EXISTS "service_date";--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "service_date_from" date;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "service_date_to" date;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "reverse_charge" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "payment_terms" text;