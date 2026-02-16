CREATE TABLE "business_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_name" text,
	"street" text,
	"city" text,
	"zip" text,
	"country" text,
	"email" text,
	"phone" text,
	"tax_id" text,
	"vat_id" text,
	"iban" text,
	"bic" text,
	"bank_name" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"street" text,
	"city" text,
	"zip" text,
	"country" text DEFAULT 'AT',
	"tax_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(10, 2),
	"unit_price" numeric(12, 2),
	"vat_rate" numeric(5, 2),
	"line_total" numeric(12, 2),
	"sort_order" integer
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_number" text NOT NULL,
	"client_id" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"issue_date" date,
	"due_date" date,
	"notes" text,
	"net_total" numeric(12, 2),
	"vat_total" numeric(12, 2),
	"gross_total" numeric(12, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;