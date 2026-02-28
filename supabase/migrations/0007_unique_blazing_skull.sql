CREATE TABLE "monitoring_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_code" text DEFAULT 'MC-' || to_char(timezone('utc', now()), 'YYYYMMDD') || '-' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8)) NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"notes" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "monitoring_content" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "monitoring_content_platform" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" uuid NOT NULL,
	"url" text NOT NULL,
	"platform" text NOT NULL,
	"title" text,
	"thumbnail_url" text,
	"published_at" timestamp with time zone,
	"view_count" bigint,
	"like_count" bigint,
	"comment_count" bigint,
	"share_count" bigint,
	"save_count" bigint,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monitoring_content_platform_check" CHECK ("monitoring_content_platform"."platform" in ('youtube', 'facebook', 'instagram', 'tiktok'))
);
--> statement-breakpoint
ALTER TABLE "monitoring_content_platform" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "monitoring_content_platform" ADD CONSTRAINT "monitoring_content_platform_content_id_monitoring_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."monitoring_content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_monitoring_content_code" ON "monitoring_content" USING btree ("content_code");--> statement-breakpoint
CREATE INDEX "idx_monitoring_content_created_at" ON "monitoring_content" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_monitoring_content_platform_content" ON "monitoring_content_platform" USING btree ("content_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_monitoring_content_platform_unique" ON "monitoring_content_platform" USING btree ("content_id","platform");--> statement-breakpoint
CREATE INDEX "idx_monitoring_content_platform_platform" ON "monitoring_content_platform" USING btree ("platform");--> statement-breakpoint
CREATE POLICY "public_read_monitoring_content" ON "monitoring_content" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "public_insert_monitoring_content" ON "monitoring_content" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "public_update_monitoring_content" ON "monitoring_content" AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "public_delete_monitoring_content" ON "monitoring_content" AS PERMISSIVE FOR DELETE TO public USING (true);--> statement-breakpoint
CREATE POLICY "public_read_monitoring_content_platform" ON "monitoring_content_platform" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "public_insert_monitoring_content_platform" ON "monitoring_content_platform" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "public_update_monitoring_content_platform" ON "monitoring_content_platform" AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "public_delete_monitoring_content_platform" ON "monitoring_content_platform" AS PERMISSIVE FOR DELETE TO public USING (true);