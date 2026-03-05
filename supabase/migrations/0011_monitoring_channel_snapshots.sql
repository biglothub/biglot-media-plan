-- Monitoring V2: channel metadata + manual daily snapshots

ALTER TABLE public.monitoring_content
	ADD COLUMN IF NOT EXISTS owner text;

ALTER TABLE public.monitoring_content
	ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal';

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'chk_monitoring_content_priority'
	) THEN
		ALTER TABLE public.monitoring_content
			ADD CONSTRAINT chk_monitoring_content_priority
			CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
	END IF;
END $$;

ALTER TABLE public.monitoring_content_platform
	ADD COLUMN IF NOT EXISTS is_channel boolean NOT NULL DEFAULT true;

ALTER TABLE public.monitoring_content_platform
	ADD COLUMN IF NOT EXISTS last_checked_at timestamptz;

CREATE TABLE IF NOT EXISTS public.monitoring_metric_snapshots (
	id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	content_id      uuid NOT NULL REFERENCES public.monitoring_content (id) ON DELETE CASCADE,
	platform_id     uuid NOT NULL REFERENCES public.monitoring_content_platform (id) ON DELETE CASCADE,
	snapshot_date   date NOT NULL DEFAULT timezone('utc', now())::date,
	followers_count bigint,
	view_count      bigint,
	post_count      bigint,
	like_count      bigint,
	comment_count   bigint,
	share_count     bigint,
	save_count      bigint,
	notes           text,
	created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_monitoring_metric_snapshots_daily
	ON public.monitoring_metric_snapshots (platform_id, snapshot_date);

CREATE INDEX IF NOT EXISTS idx_monitoring_metric_snapshots_platform_date
	ON public.monitoring_metric_snapshots (platform_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_monitoring_metric_snapshots_content_date
	ON public.monitoring_metric_snapshots (content_id, snapshot_date DESC);

ALTER TABLE public.monitoring_metric_snapshots ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies
		WHERE schemaname = 'public'
			AND tablename = 'monitoring_metric_snapshots'
			AND policyname = 'public_read_monitoring_metric_snapshots'
	) THEN
		CREATE POLICY public_read_monitoring_metric_snapshots
		ON public.monitoring_metric_snapshots FOR SELECT TO public USING (true);
	END IF;
END $$;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies
		WHERE schemaname = 'public'
			AND tablename = 'monitoring_metric_snapshots'
			AND policyname = 'public_insert_monitoring_metric_snapshots'
	) THEN
		CREATE POLICY public_insert_monitoring_metric_snapshots
		ON public.monitoring_metric_snapshots FOR INSERT TO public WITH CHECK (true);
	END IF;
END $$;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies
		WHERE schemaname = 'public'
			AND tablename = 'monitoring_metric_snapshots'
			AND policyname = 'public_update_monitoring_metric_snapshots'
	) THEN
		CREATE POLICY public_update_monitoring_metric_snapshots
		ON public.monitoring_metric_snapshots FOR UPDATE TO public USING (true) WITH CHECK (true);
	END IF;
END $$;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies
		WHERE schemaname = 'public'
			AND tablename = 'monitoring_metric_snapshots'
			AND policyname = 'public_delete_monitoring_metric_snapshots'
	) THEN
		CREATE POLICY public_delete_monitoring_metric_snapshots
		ON public.monitoring_metric_snapshots FOR DELETE TO public USING (true);
	END IF;
END $$;
