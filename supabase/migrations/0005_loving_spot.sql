DROP INDEX "ux_produced_videos_calendar";--> statement-breakpoint
CREATE INDEX "idx_produced_videos_calendar" ON "produced_videos" USING btree ("calendar_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_produced_videos_calendar_platform" ON "produced_videos" USING btree ("calendar_id","platform");