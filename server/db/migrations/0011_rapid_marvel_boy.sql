DELETE FROM "receipts" WHERE "id" NOT IN (
  SELECT MIN("id") FROM "receipts"
  GROUP BY "booking_date", COALESCE("partner_name", ''), COALESCE("amount_eur"::text, ''), COALESCE("payment_reference", '')
);--> statement-breakpoint
ALTER TABLE "receipts" DROP CONSTRAINT "receipts_booking_date_partner_name_amount_eur_payment_reference_unique";--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_booking_date_partner_name_amount_eur_payment_reference_unique" UNIQUE NULLS NOT DISTINCT("booking_date","partner_name","amount_eur","payment_reference");
