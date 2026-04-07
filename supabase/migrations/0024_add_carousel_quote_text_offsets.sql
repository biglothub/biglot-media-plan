ALTER TABLE public.carousel_slides
  ADD COLUMN IF NOT EXISTS quote_text_offset_x_px integer NOT NULL DEFAULT 0
    CHECK (quote_text_offset_x_px >= -180 AND quote_text_offset_x_px <= 180),
  ADD COLUMN IF NOT EXISTS quote_text_offset_y_px integer NOT NULL DEFAULT 0
    CHECK (quote_text_offset_y_px >= -180 AND quote_text_offset_y_px <= 180);
