CREATE TABLE "plugin_sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_id" integer NOT NULL,
	"plugin_name" text NOT NULL,
	"edition" text NOT NULL,
	"renewal" integer DEFAULT 0 NOT NULL,
	"gross_amount" numeric(12, 2),
	"net_amount" numeric(12, 2),
	"customer" text,
	"date_sold" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plugin_sales_sale_id_unique" UNIQUE("sale_id")
);
