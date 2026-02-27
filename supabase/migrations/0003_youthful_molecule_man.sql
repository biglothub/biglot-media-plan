CREATE TABLE "production_calendar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"backlog_id" uuid NOT NULL,
	"shoot_date" date NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "production_calendar" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "production_calendar" ADD CONSTRAINT "production_calendar_backlog_id_idea_backlog_id_fk" FOREIGN KEY ("backlog_id") REFERENCES "public"."idea_backlog"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_production_calendar_backlog" ON "production_calendar" USING btree ("backlog_id");--> statement-breakpoint
CREATE INDEX "idx_production_calendar_shoot_date" ON "production_calendar" USING btree ("shoot_date");--> statement-breakpoint
CREATE POLICY "public_read_calendar" ON "production_calendar" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "public_insert_calendar" ON "production_calendar" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "public_update_calendar" ON "production_calendar" AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "public_delete_calendar" ON "production_calendar" AS PERMISSIVE FOR DELETE TO public USING (true);