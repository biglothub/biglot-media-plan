ALTER TABLE public.production_calendar
  ADD COLUMN IF NOT EXISTS draft_video_url text,
  ADD COLUMN IF NOT EXISTS review_notes text;
