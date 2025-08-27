ALTER TABLE "customer_diary" ADD COLUMN "supplier" text;--> statement-breakpoint
ALTER TABLE "customer_diary" ADD COLUMN "order_no" text;--> statement-breakpoint
ALTER TABLE "customer_diary" ADD COLUMN "eta_date" date;--> statement-breakpoint
ALTER TABLE "customer_diary" ADD COLUMN "order_status" text DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "customer_diary" ADD COLUMN "order_notes" text;