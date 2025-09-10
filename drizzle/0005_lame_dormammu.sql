ALTER TABLE "customer_diary" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "customer_diary" ALTER COLUMN "status" SET DEFAULT 'Pending'::text;--> statement-breakpoint
DROP TYPE "public"."status_t";--> statement-breakpoint
CREATE TYPE "public"."status_t" AS ENUM('Pending', 'Ordered', 'Ready', 'Waiting', 'Collected', 'Cancelled');--> statement-breakpoint
ALTER TABLE "customer_diary" ALTER COLUMN "status" SET DEFAULT 'Pending'::"public"."status_t";--> statement-breakpoint
ALTER TABLE "customer_diary" ALTER COLUMN "status" SET DATA TYPE "public"."status_t" USING "status"::"public"."status_t";