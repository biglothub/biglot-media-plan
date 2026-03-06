ALTER TABLE "idea_backlog" DROP CONSTRAINT IF EXISTS "idea_backlog_content_category_check";--> statement-breakpoint
ALTER TABLE "idea_backlog" ADD CONSTRAINT "idea_backlog_content_category_check" CHECK ("idea_backlog"."content_category" IS NULL OR "idea_backlog"."content_category" IN ('hero', 'help', 'hub', 'pin'));
