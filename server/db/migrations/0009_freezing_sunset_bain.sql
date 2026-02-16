ALTER TABLE "iban_categories" ADD COLUMN "excluded" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "receipts" ADD COLUMN "excluded" integer DEFAULT 0 NOT NULL;