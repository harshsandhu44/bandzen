ALTER TABLE "subscriptions" ADD COLUMN "polar_subscription_id" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "currency" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "amount_minor" integer;