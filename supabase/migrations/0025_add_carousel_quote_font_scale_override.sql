ALTER TABLE public.carousel_slides
  ADD COLUMN IF NOT EXISTS quote_font_scale_override numeric(4, 2)
    CHECK (quote_font_scale_override IS NULL OR (quote_font_scale_override >= 0.55 AND quote_font_scale_override <= 1.8));
