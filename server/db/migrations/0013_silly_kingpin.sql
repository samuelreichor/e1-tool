ALTER TABLE "receipts" ALTER COLUMN "vat_rate" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "iban_categories" ADD COLUMN "vat_rate" integer DEFAULT 0 NOT NULL;