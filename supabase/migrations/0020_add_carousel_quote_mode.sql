ALTER TABLE public.carousel_projects
  ADD COLUMN IF NOT EXISTS content_mode text NOT NULL DEFAULT 'standard'
    CHECK (content_mode IN ('standard', 'quote')),
  ADD COLUMN IF NOT EXISTS account_display_name text,
  ADD COLUMN IF NOT EXISTS account_handle text,
  ADD COLUMN IF NOT EXISTS account_avatar_url text,
  ADD COLUMN IF NOT EXISTS account_avatar_storage_path text,
  ADD COLUMN IF NOT EXISTS account_is_verified boolean NOT NULL DEFAULT false;

UPDATE public.carousel_projects
SET
  content_mode = COALESCE(NULLIF(content_mode, ''), 'standard'),
  account_is_verified = COALESCE(account_is_verified, false);
