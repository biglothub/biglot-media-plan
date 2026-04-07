ALTER TABLE public.carousel_projects
  DROP CONSTRAINT IF EXISTS carousel_projects_quote_font_scale_check;

ALTER TABLE public.carousel_projects
  ADD CONSTRAINT carousel_projects_quote_font_scale_check
  CHECK (quote_font_scale >= 0.8 AND quote_font_scale <= 1.8);
