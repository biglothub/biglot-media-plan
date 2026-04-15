CREATE TABLE IF NOT EXISTS public.approval_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  platform text NOT NULL DEFAULT 'youtube',
  drive_url text NOT NULL,
  submitted_by text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  reviewer_notes text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

ALTER TABLE public.approval_submissions
  DROP CONSTRAINT IF EXISTS approval_submissions_status_check;--> statement-breakpoint

ALTER TABLE public.approval_submissions
  ADD CONSTRAINT approval_submissions_status_check
    CHECK (status IN ('pending', 'approved', 'changes_requested'));--> statement-breakpoint

ALTER TABLE public.approval_submissions
  DROP CONSTRAINT IF EXISTS approval_submissions_platform_check;--> statement-breakpoint

ALTER TABLE public.approval_submissions
  ADD CONSTRAINT approval_submissions_platform_check
    CHECK (platform IN ('youtube', 'facebook', 'instagram', 'tiktok', 'other'));--> statement-breakpoint

ALTER TABLE public.approval_submissions ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY public_read_approval_submissions
  ON public.approval_submissions FOR SELECT TO public USING (true);--> statement-breakpoint

CREATE POLICY public_insert_approval_submissions
  ON public.approval_submissions FOR INSERT TO public WITH CHECK (true);--> statement-breakpoint

CREATE POLICY public_update_approval_submissions
  ON public.approval_submissions FOR UPDATE TO public USING (true) WITH CHECK (true);--> statement-breakpoint

CREATE POLICY public_delete_approval_submissions
  ON public.approval_submissions FOR DELETE TO public USING (true);
