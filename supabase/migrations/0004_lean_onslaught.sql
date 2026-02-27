CREATE TABLE "produced_videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"calendar_id" uuid NOT NULL,
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
	CONSTRAINT "produced_videos_platform_check" CHECK ("produced_videos"."platform" in ('youtube', 'facebook', 'instagram', 'tiktok'))
);
--> statement-breakpoint
ALTER TABLE "produced_videos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "produced_videos" ADD CONSTRAINT "produced_videos_calendar_id_production_calendar_id_fk" FOREIGN KEY ("calendar_id") REFERENCES "public"."production_calendar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_produced_videos_calendar" ON "produced_videos" USING btree ("calendar_id");--> statement-breakpoint
CREATE INDEX "idx_produced_videos_platform" ON "produced_videos" USING btree ("platform");--> statement-breakpoint
CREATE POLICY "public_read_produced_videos" ON "produced_videos" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "public_insert_produced_videos" ON "produced_videos" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "public_update_produced_videos" ON "produced_videos" AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "public_delete_produced_videos" ON "produced_videos" AS PERMISSIVE FOR DELETE TO public USING (true);