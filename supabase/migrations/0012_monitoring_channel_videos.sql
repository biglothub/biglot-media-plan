-- Monitoring V3: store YouTube channel videos for channel links

CREATE TABLE IF NOT EXISTS public.monitoring_channel_videos (
	id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	platform_id     uuid NOT NULL REFERENCES public.monitoring_content_platform (id) ON DELETE CASCADE,
	video_id        text NOT NULL,
	video_url       text NOT NULL,
	title           text NOT NULL,
	thumbnail_url   text,
	published_label text,
	view_label      text,
	view_count      bigint,
	duration_label  text,
	raw_json        jsonb,
	created_at      timestamptz NOT NULL DEFAULT now(),
	updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_monitoring_channel_videos_platform_video
	ON public.monitoring_channel_videos (platform_id, video_id);

CREATE INDEX IF NOT EXISTS idx_monitoring_channel_videos_platform
	ON public.monitoring_channel_videos (platform_id);

CREATE INDEX IF NOT EXISTS idx_monitoring_channel_videos_updated
	ON public.monitoring_channel_videos (updated_at DESC);

ALTER TABLE public.monitoring_channel_videos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies
		WHERE schemaname = 'public'
			AND tablename = 'monitoring_channel_videos'
			AND policyname = 'public_read_monitoring_channel_videos'
	) THEN
		CREATE POLICY public_read_monitoring_channel_videos
		ON public.monitoring_channel_videos FOR SELECT TO public USING (true);
	END IF;
END $$;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies
		WHERE schemaname = 'public'
			AND tablename = 'monitoring_channel_videos'
			AND policyname = 'public_insert_monitoring_channel_videos'
	) THEN
		CREATE POLICY public_insert_monitoring_channel_videos
		ON public.monitoring_channel_videos FOR INSERT TO public WITH CHECK (true);
	END IF;
END $$;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies
		WHERE schemaname = 'public'
			AND tablename = 'monitoring_channel_videos'
			AND policyname = 'public_update_monitoring_channel_videos'
	) THEN
		CREATE POLICY public_update_monitoring_channel_videos
		ON public.monitoring_channel_videos FOR UPDATE TO public USING (true) WITH CHECK (true);
	END IF;
END $$;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies
		WHERE schemaname = 'public'
			AND tablename = 'monitoring_channel_videos'
			AND policyname = 'public_delete_monitoring_channel_videos'
	) THEN
		CREATE POLICY public_delete_monitoring_channel_videos
		ON public.monitoring_channel_videos FOR DELETE TO public USING (true);
	END IF;
END $$;
