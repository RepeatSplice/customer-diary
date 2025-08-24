ALTER TABLE "customer_diary" ADD COLUMN "payment_method" text;--> statement-breakpoint
ALTER TABLE "customer_diary" ADD COLUMN "amount_paid" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "customer_diary" ADD COLUMN "invoice_po" text;--> statement-breakpoint
ALTER TABLE "customer_diary" ADD COLUMN "paid_at" date;--> statement-breakpoint
ALTER TABLE "customer_diary" ADD COLUMN "store_location" text;--> statement-breakpoint
ALTER TABLE "customer_diary" ADD COLUMN "tags" text;