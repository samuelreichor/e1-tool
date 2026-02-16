ALTER TABLE "plugin_sales" ADD COLUMN "gross_amount_eur" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "plugin_sales" ADD COLUMN "net_amount_eur" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "plugin_sales" ADD COLUMN "exchange_rate" numeric(10, 6);