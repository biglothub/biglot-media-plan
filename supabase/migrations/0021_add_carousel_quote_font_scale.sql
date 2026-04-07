ALTER TABLE public.carousel_projects
  ADD COLUMN IF NOT EXISTS quote_font_scale numeric(4, 2) NOT NULL DEFAULT 1
    CHECK (quote_font_scale >= 0.8 AND quote_font_scale <= 1.3);

UPDATE public.carousel_projects
SET quote_font_scale = COALESCE(quote_font_scale, 1);
