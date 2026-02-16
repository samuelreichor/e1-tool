CREATE TABLE "iban_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"iban" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "iban_categories_iban_unique" UNIQUE("iban")
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_date" date NOT NULL,
	"value_date" date,
	"partner_name" text,
	"partner_iban" text,
	"type" text,
	"payment_reference" text,
	"amount_eur" numeric(12, 2) NOT NULL,
	"original_amount" numeric(12, 2),
	"original_currency" text,
	"exchange_rate" numeric(10, 6),
	"category" text DEFAULT 'Sonstige' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "receipts_booking_date_partner_name_amount_eur_payment_reference_unique" UNIQUE("booking_date","partner_name","amount_eur","payment_reference")
);
