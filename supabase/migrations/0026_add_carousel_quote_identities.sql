CREATE TABLE IF NOT EXISTS public.carousel_quote_identities (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                        text NOT NULL,
  account_display_name        text NOT NULL,
  account_handle              text,
  account_avatar_url          text,
  account_avatar_storage_path text,
  account_is_verified         boolean NOT NULL DEFAULT false,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_carousel_quote_identities_updated_at
  ON public.carousel_quote_identities (updated_at DESC);

ALTER TABLE public.carousel_quote_identities ENABLE ROW LEVEL SECURITY;

CREATE POLICY public_read_carousel_quote_identities
  ON public.carousel_quote_identities FOR SELECT TO public USING (true);
CREATE POLICY public_insert_carousel_quote_identities
  ON public.carousel_quote_identities FOR INSERT TO public WITH CHECK (true);
CREATE POLICY public_update_carousel_quote_identities
  ON public.carousel_quote_identities FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY public_delete_carousel_quote_identities
  ON public.carousel_quote_identities FOR DELETE TO public USING (true);
