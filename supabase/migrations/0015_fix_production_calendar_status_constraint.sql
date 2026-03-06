-- Fix production_calendar.status CHECK constraint so it accepts the review stage
-- Some databases still have the old constraint name from 0010: chk_production_calendar_status

ALTER TABLE public.production_calendar
  DROP CONSTRAINT IF EXISTS chk_production_calendar_status;--> statement-breakpoint

ALTER TABLE public.production_calendar
  DROP CONSTRAINT IF EXISTS production_calendar_status_check;--> statement-breakpoint

ALTER TABLE public.production_calendar
  ADD CONSTRAINT chk_production_calendar_status
    CHECK (status IN ('planned', 'scripting', 'shooting', 'editing', 'review', 'published'));--> statement-breakpoint
