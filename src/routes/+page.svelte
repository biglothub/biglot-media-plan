<script lang="ts">
	import { onMount } from "svelte";
	import { hasSupabaseConfig, supabase } from "$lib/supabase";
	import type {
		EnrichResult,
		IdeaBacklogRow,
		ProductionCalendarRow,
		ProducedVideoRow,
		SupportedPlatform,
	} from "$lib/types";

	const numberFormatter = new Intl.NumberFormat("en-US");

	let linkInput = $state("");
	let notes = $state("");
	let loadingIdeas = $state(false);
	let enriching = $state(false);
	let saving = $state(false);
	let deletingId = $state<string | null>(null);
	let message = $state("");
	let errorMessage = $state("");
	let draft = $state<EnrichResult | null>(null);
	let ideas = $state<IdeaBacklogRow[]>([]);
	let calendarItems = $state<ProductionCalendarRow[]>([]);
	let producedVideos = $state<ProducedVideoRow[]>([]);
	let loadingCalendar = $state(false);
	let loadingProduced = $state(false);
	let currentMonthStart = $state(getMonthStartIso(new Date()));
	let dragHoverDate = $state<string | null>(null);
	let draggingBacklogId = $state<string | null>(null);
	let selectedCalendarId = $state<string | null>(null);
	let producedLinkInput = $state("");
	let producedNotes = $state("");
	let producedDraft = $state<EnrichResult | null>(null);
	let analyzingProduced = $state(false);
	let savingProduced = $state(false);
	let metrics = $state({
		views: null as number | null,
		likes: null as number | null,
		comments: null as number | null,
		shares: null as number | null,
		saves: null as number | null,
	});
	let producedMetrics = $state({
		views: null as number | null,
		likes: null as number | null,
		comments: null as number | null,
		shares: null as number | null,
		saves: null as number | null,
	});
	const platformOrder = ["youtube", "facebook", "instagram", "tiktok"] as const;
	const platformLabel: Record<(typeof platformOrder)[number], string> = {
		youtube: "YouTube",
		facebook: "Facebook",
		instagram: "Instagram",
		tiktok: "TikTok",
	};

	const groupedIdeas = $derived.by(() => {
		const grouped = new Map<string, IdeaBacklogRow[]>();

		for (const idea of ideas) {
			const bucket = grouped.get(idea.platform) ?? [];
			bucket.push(idea);
			grouped.set(idea.platform, bucket);
		}

		const orderedGroups: Array<{
			key: string;
			label: string;
			items: IdeaBacklogRow[];
		}> = platformOrder
			.map((platform) => ({
				key: platform,
				label: platformLabel[platform],
				items: grouped.get(platform) ?? [],
			}))
			.filter((group) => group.items.length > 0);

		for (const [platform, items] of grouped.entries()) {
			if (!platformOrder.includes(platform as (typeof platformOrder)[number])) {
				orderedGroups.push({
					key: platform,
					label: platform.toUpperCase(),
					items,
				});
			}
		}

		return orderedGroups;
	});
	const scheduledBacklogIds = $derived.by(
		() => new Set(calendarItems.map((item) => item.backlog_id)),
	);
	const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
	const monthLabel = $derived.by(() => formatMonthLabel(currentMonthStart));
	const monthCells = $derived.by(() => buildMonthCells(currentMonthStart));
	const sortedCalendarIdeas = $derived.by(() =>
		[...calendarItems].sort((a, b) => a.shoot_date.localeCompare(b.shoot_date)),
	);
	const selectedCalendarItem = $derived.by(
		() =>
			sortedCalendarIdeas.find((item) => item.id === selectedCalendarId) ?? null,
	);
	const producedByCalendarId = $derived.by(() => {
		const map = new Map<string, ProducedVideoRow>();
		for (const video of producedVideos) map.set(video.calendar_id, video);
		return map;
	});
	const selectedProducedVideo = $derived.by(() =>
		selectedCalendarId ? producedByCalendarId.get(selectedCalendarId) ?? null : null,
	);
	const calendarByDate = $derived.by(() => {
		const grouped = new Map<string, ProductionCalendarRow[]>();

		for (const item of calendarItems) {
			const bucket = grouped.get(item.shoot_date) ?? [];
			bucket.push(item);
			grouped.set(item.shoot_date, bucket);
		}

		return grouped;
	});
	const kpiRows = $derived.by(() => {
		const original = selectedCalendarItem?.idea_backlog;
		const produced = {
			view_count: normalizeMetricValue(producedMetrics.views),
			like_count: normalizeMetricValue(producedMetrics.likes),
			comment_count: normalizeMetricValue(producedMetrics.comments),
			share_count: normalizeMetricValue(producedMetrics.shares),
			save_count: normalizeMetricValue(producedMetrics.saves),
		};
		const specs = [
			{ key: "views", label: "Views" },
			{ key: "likes", label: "Likes" },
			{ key: "comments", label: "Comments" },
			{ key: "shares", label: "Shares" },
			{ key: "saves", label: "Saves" },
		] as const;
		const metricColumnByKey = {
			views: "view_count",
			likes: "like_count",
			comments: "comment_count",
			shares: "share_count",
			saves: "save_count",
		} as const;

		return specs.map(({ key, label }) => {
			const metricColumn = metricColumnByKey[key];
			const originalValue = original?.[metricColumn] as number | null | undefined;
			const producedValue = produced[metricColumn];

			if (
				originalValue === null ||
				originalValue === undefined ||
				producedValue === null ||
				producedValue === undefined
			) {
					return {
						label,
						original: originalValue ?? null,
						produced: producedValue ?? null,
						delta: null as number | null,
						pct: null as number | null,
						status: "na" as KpiStatus,
					};
				}

			const delta = producedValue - originalValue;
			const pct =
				originalValue === 0
					? producedValue === 0
						? 0
						: null
					: (delta / originalValue) * 100;
			const status: KpiStatus = delta > 0 ? "up" : delta < 0 ? "down" : "same";

			return {
				label,
				original: originalValue,
				produced: producedValue,
				delta,
				pct,
				status,
			};
		});
	});
	const effectiveProducedPreview = $derived.by(() => {
		if (producedDraft) {
			return {
				platform: producedDraft.platform,
				url: producedDraft.url,
				title: producedDraft.title,
				thumbnailUrl: producedDraft.thumbnailUrl,
			};
		}

		if (!selectedProducedVideo) return null;

		return {
			platform: selectedProducedVideo.platform,
			url: selectedProducedVideo.url,
			title: selectedProducedVideo.title,
			thumbnailUrl: selectedProducedVideo.thumbnail_url,
		};
	});

	function clearState() {
		draft = null;
		notes = "";
		metrics = {
			views: null,
			likes: null,
			comments: null,
			shares: null,
			saves: null,
		};
	}

	function formatCount(value: number | null): string {
		return value === null ? "-" : numberFormatter.format(value);
	}

	function toIsoLocalDate(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	}

	function parseIsoDate(isoDate: string): Date {
		const [year, month, day] = isoDate.split("-").map(Number);
		return new Date(year, month - 1, day);
	}

	function normalizeMetricValue(value: unknown): number | null {
		return typeof value === "number" && Number.isFinite(value) ? value : null;
	}

	function addDaysIso(isoDate: string, days: number): string {
		const target = parseIsoDate(isoDate);
		target.setDate(target.getDate() + days);
		return toIsoLocalDate(target);
	}

	function getMonthStartIso(date: Date): string {
		return toIsoLocalDate(new Date(date.getFullYear(), date.getMonth(), 1));
	}

	function addMonthsIso(isoDate: string, months: number): string {
		const target = parseIsoDate(isoDate);
		return toIsoLocalDate(new Date(target.getFullYear(), target.getMonth() + months, 1));
	}

	function formatMonthLabel(monthStartIso: string): string {
		return parseIsoDate(monthStartIso).toLocaleDateString("en-US", {
			month: "long",
			year: "numeric",
		});
	}

	function formatCalendarDate(isoDate: string): string {
		return parseIsoDate(isoDate).toLocaleDateString("en-US", {
			weekday: "short",
			month: "short",
			day: "numeric",
		});
	}

	function formatCalendarDayNumber(isoDate: string): string {
		return String(parseIsoDate(isoDate).getDate());
	}

	function formatCalendarDayMeta(isoDate: string): string {
		return parseIsoDate(isoDate).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
		});
	}

	function metricLabel(status: KpiStatus): string {
		if (status === "up") return "Better";
		if (status === "down") return "Lower";
		if (status === "same") return "Same";
		return "N/A";
	}

	function formatDelta(value: number | null): string {
		if (value === null) return "-";
		const sign = value > 0 ? "+" : "";
		return `${sign}${numberFormatter.format(value)}`;
	}

	function formatPercent(value: number | null): string {
		if (value === null) return "-";
		const sign = value > 0 ? "+" : "";
		return `${sign}${value.toFixed(1)}%`;
	}

	type KpiStatus = "up" | "down" | "same" | "na";

	function buildMonthCells(monthStartIso: string): Array<{
		dateIso: string;
		inCurrentMonth: boolean;
	}> {
		const monthStart = parseIsoDate(monthStartIso);
		const firstDayOffset = (monthStart.getDay() + 6) % 7;
		const gridStart = new Date(
			monthStart.getFullYear(),
			monthStart.getMonth(),
			1 - firstDayOffset,
		);

		return Array.from({ length: 42 }, (_, index) => {
			const current = new Date(gridStart);
			current.setDate(gridStart.getDate() + index);
			return {
				dateIso: toIsoLocalDate(current),
				inCurrentMonth: current.getMonth() === monthStart.getMonth(),
			};
		});
	}

	function getTikTokEmbedUrl(videoUrl: string): string | null {
		try {
			const parsed = new URL(videoUrl);
			const hostname = parsed.hostname.toLowerCase();
			if (!hostname.includes("tiktok.com")) return null;

			const videoId =
				parsed.pathname.match(/\/video\/(\d+)/)?.[1] ??
				parsed.pathname.match(/\/v\/(\d+)/)?.[1] ??
				null;

			return videoId ? `https://www.tiktok.com/embed/v2/${videoId}` : null;
		} catch {
			return null;
		}
	}

	function getInstagramEmbedUrl(videoUrl: string): string | null {
		try {
			const parsed = new URL(videoUrl);
			const hostname = parsed.hostname.toLowerCase();
			if (!hostname.includes("instagram.com")) return null;

			const match = parsed.pathname.match(/\/(p|reel|tv)\/([^/?#]+)/);
			if (!match) return null;

			const type = match[1];
			const shortcode = match[2];
			return `https://www.instagram.com/${type}/${shortcode}/embed/captioned`;
		} catch {
			return null;
		}
	}

	function getPlatformFromUrl(url: string): SupportedPlatform | null {
		try {
			const host = new URL(url).hostname.toLowerCase();
			if (host.includes("youtu.be") || host.includes("youtube.com")) return "youtube";
			if (host.includes("facebook.com") || host.includes("fb.watch")) return "facebook";
			if (host.includes("instagram.com")) return "instagram";
			if (host.includes("tiktok.com")) return "tiktok";
			return null;
		} catch {
			return null;
		}
	}

	const draftTikTokEmbedUrl = $derived(
		draft && draft.platform === "tiktok" ? getTikTokEmbedUrl(draft.url) : null,
	);
	const draftInstagramEmbedUrl = $derived(
		draft && draft.platform === "instagram"
			? getInstagramEmbedUrl(draft.url)
			: null,
	);
	const producedDraftTikTokEmbedUrl = $derived(
		effectiveProducedPreview && effectiveProducedPreview.platform === "tiktok"
			? getTikTokEmbedUrl(effectiveProducedPreview.url)
			: null,
	);
	const producedDraftInstagramEmbedUrl = $derived(
		effectiveProducedPreview && effectiveProducedPreview.platform === "instagram"
			? getInstagramEmbedUrl(effectiveProducedPreview.url)
			: null,
	);

	function resetProducedForm() {
		producedLinkInput = "";
		producedNotes = "";
		producedDraft = null;
		producedMetrics = {
			views: null,
			likes: null,
			comments: null,
			shares: null,
			saves: null,
		};
	}

	async function loadIdeas() {
		if (!supabase) return;

		loadingIdeas = true;
		errorMessage = "";

		const { data, error } = await supabase
			.from("idea_backlog")
			.select("*")
			.order("created_at", { ascending: false });

		loadingIdeas = false;

		if (error) {
			errorMessage = `โหลด backlog ไม่ได้: ${error.message}`;
			return;
		}

		ideas = (data ?? []) as IdeaBacklogRow[];
	}

	async function loadCalendar() {
		if (!supabase) return;

		loadingCalendar = true;

		const { data, error } = await supabase
			.from("production_calendar")
			.select(
				"id, backlog_id, shoot_date, status, notes, created_at, idea_backlog(*)",
			)
			.order("shoot_date", { ascending: true })
			.order("created_at", { ascending: true });

		loadingCalendar = false;

		if (error) {
			errorMessage = `โหลด calendar ไม่ได้: ${error.message}`;
			return;
		}

		const normalized = (data ?? []).map((item) => {
			const row = item as Record<string, unknown>;
			const linkedIdea = row.idea_backlog;

			return {
				...row,
				idea_backlog: Array.isArray(linkedIdea)
					? (linkedIdea[0] ?? null)
					: (linkedIdea ?? null),
			};
		});

		calendarItems = normalized as ProductionCalendarRow[];
		if (
			selectedCalendarId &&
			!calendarItems.some((item) => item.id === selectedCalendarId)
		) {
			selectedCalendarId = null;
			hydrateProducedForm(null);
		}
	}

	async function loadProducedVideos() {
		if (!supabase) return;

		loadingProduced = true;
		const { data, error } = await supabase
			.from("produced_videos")
			.select("*")
			.order("created_at", { ascending: false });
		loadingProduced = false;

		if (error) {
			errorMessage = `โหลด produced videos ไม่ได้: ${error.message}`;
			return;
		}

		producedVideos = (data ?? []) as ProducedVideoRow[];
		if (selectedCalendarId) {
			hydrateProducedForm(selectedCalendarId);
		}
	}

	function hydrateProducedForm(calendarId: string | null) {
		if (!calendarId) {
			resetProducedForm();
			return;
		}

		const existing = producedVideos.find((video) => video.calendar_id === calendarId);
		if (!existing) {
			resetProducedForm();
			return;
		}

		producedLinkInput = existing.url;
		producedNotes = existing.notes ?? "";
		producedDraft = null;
		producedMetrics = {
			views: existing.view_count,
			likes: existing.like_count,
			comments: existing.comment_count,
			shares: existing.share_count,
			saves: existing.save_count,
		};
	}

	function selectCalendarItem(calendarId: string) {
		selectedCalendarId = calendarId;
		hydrateProducedForm(calendarId);
	}

	async function analyzeProducedLink() {
		errorMessage = "";
		message = "";

		if (!selectedCalendarItem) {
			errorMessage = "เลือกไอเดียจากฝั่งซ้ายก่อน";
			return;
		}

		if (!producedLinkInput.trim()) {
			errorMessage = "กรุณาวางลิงก์วิดีโอที่ทำจริง";
			return;
		}

		analyzingProduced = true;
		try {
			const response = await fetch(
				`/api/enrich?url=${encodeURIComponent(producedLinkInput.trim())}`,
			);
			const body = await response.json();

			if (!response.ok) {
				errorMessage = body.error ?? "อ่านข้อมูลวิดีโอที่ทำจริงไม่สำเร็จ";
				return;
			}

			producedDraft = body as EnrichResult;
			producedLinkInput = producedDraft.url;
			producedMetrics = {
				views: producedDraft.metrics.views,
				likes: producedDraft.metrics.likes,
				comments: producedDraft.metrics.comments,
				shares: producedDraft.metrics.shares,
				saves: producedDraft.metrics.saves,
			};
			message = "ดึงข้อมูลวิดีโอที่ทำจริงสำเร็จแล้ว";
		} catch (error) {
			errorMessage =
				error instanceof Error
					? error.message
					: "เกิดข้อผิดพลาดระหว่าง analyze วิดีโอที่ทำจริง";
		} finally {
			analyzingProduced = false;
		}
	}

	async function saveProducedVideo() {
		if (!supabase) {
			errorMessage = "ยังไม่ได้ตั้งค่า Supabase";
			return;
		}

		if (!selectedCalendarItem) {
			errorMessage = "เลือกไอเดียจากฝั่งซ้ายก่อน";
			return;
		}

		const finalUrl = (producedDraft?.url ?? producedLinkInput).trim();
		if (!finalUrl) {
			errorMessage = "กรุณาใส่ลิงก์วิดีโอที่ทำจริง";
			return;
		}

		savingProduced = true;
		errorMessage = "";
		message = "";

		const sourcePlatform =
			producedDraft?.platform ??
			getPlatformFromUrl(finalUrl) ??
			selectedCalendarItem.idea_backlog?.platform ??
			"youtube";

		const payload = {
			calendar_id: selectedCalendarItem.id,
			url: finalUrl,
			platform: sourcePlatform,
			title: producedDraft?.title ?? null,
			thumbnail_url: producedDraft?.thumbnailUrl ?? null,
			published_at: producedDraft?.publishedAt ?? null,
			view_count: producedMetrics.views,
			like_count: producedMetrics.likes,
			comment_count: producedMetrics.comments,
			share_count: producedMetrics.shares,
			save_count: producedMetrics.saves,
			notes: producedNotes.trim() || null,
		};

		const { error } = await supabase
			.from("produced_videos")
			.upsert(payload, { onConflict: "calendar_id" });

		savingProduced = false;

		if (error) {
			errorMessage = `บันทึก produced video ไม่สำเร็จ: ${error.message}`;
			return;
		}

		message = "บันทึกวิดีโอที่ทำจริงแล้ว";
		await loadProducedVideos();
		hydrateProducedForm(selectedCalendarItem.id);
	}

	async function analyzeLink() {
		message = "";
		errorMessage = "";
		clearState();

		if (!linkInput.trim()) {
			errorMessage = "กรุณาวางลิงก์ก่อน";
			return;
		}

		enriching = true;
		try {
			const response = await fetch(
				`/api/enrich?url=${encodeURIComponent(linkInput.trim())}`,
			);
			const body = await response.json();

			if (!response.ok) {
				errorMessage = body.error ?? "อ่านข้อมูลจากลิงก์ไม่สำเร็จ";
				return;
			}

			draft = body as EnrichResult;
			metrics = {
				views: draft.metrics.views,
				likes: draft.metrics.likes,
				comments: draft.metrics.comments,
				shares: draft.metrics.shares,
				saves: draft.metrics.saves,
			};
			message = "ดึงข้อมูลสำเร็จแล้ว ตรวจค่า engagement ก่อนบันทึกได้เลย";
		} catch (error) {
			errorMessage =
				error instanceof Error
					? error.message
					: "เกิดข้อผิดพลาดระหว่าง analyze link";
		} finally {
			enriching = false;
		}
	}

	async function saveIdea() {
		if (!supabase) {
			errorMessage = "ยังไม่ได้ตั้งค่า Supabase";
			return;
		}

		if (!draft) {
			errorMessage = "ยังไม่มีข้อมูลจากการ analyze ลิงก์";
			return;
		}

		saving = true;
		errorMessage = "";
		message = "";

		const payload = {
			url: draft.url,
			platform: draft.platform,
			title: draft.title,
			description: draft.description,
			author_name: draft.authorName,
			thumbnail_url: draft.thumbnailUrl,
			published_at: draft.publishedAt,
			view_count: metrics.views,
			like_count: metrics.likes,
			comment_count: metrics.comments,
			share_count: metrics.shares,
			save_count: metrics.saves,
			notes: notes.trim() || null,
			status: "new",
			engagement_json: {
				source: draft.source,
				extracted_at: new Date().toISOString(),
			},
		};

		const { error } = await supabase.from("idea_backlog").insert(payload);
		saving = false;

		if (error) {
			errorMessage = `บันทึกไม่สำเร็จ: ${error.message}`;
			return;
		}

		message = "บันทึกเข้า backlog แล้ว";
		linkInput = "";
		clearState();
		await loadIdeas();
	}

	async function deleteIdea(idea: IdeaBacklogRow) {
		if (!supabase) {
			errorMessage = "ยังไม่ได้ตั้งค่า Supabase";
			return;
		}

		const confirmed = window.confirm(
			`ลบ backlog นี้ใช่ไหม?\n${idea.title ?? idea.url}`,
		);
		if (!confirmed) return;

		deletingId = idea.id;
		errorMessage = "";
		message = "";

		const { error } = await supabase
			.from("idea_backlog")
			.delete()
			.eq("id", idea.id);

		deletingId = null;

		if (error) {
			errorMessage = `ลบไม่สำเร็จ: ${error.message}`;
			return;
		}

		ideas = ideas.filter((item) => item.id !== idea.id);
		const removedCalendarIds = calendarItems
			.filter((item) => item.backlog_id === idea.id)
			.map((item) => item.id);
		calendarItems = calendarItems.filter((item) => item.backlog_id !== idea.id);
		producedVideos = producedVideos.filter(
			(video) => !removedCalendarIds.includes(video.calendar_id),
		);
		if (selectedCalendarId && removedCalendarIds.includes(selectedCalendarId)) {
			selectedCalendarId = null;
			hydrateProducedForm(null);
		}
		message = "ลบออกจาก backlog แล้ว";
	}

	function shiftMonth(months: number) {
		currentMonthStart = addMonthsIso(currentMonthStart, months);
	}

	function handleDragStart(event: DragEvent, backlogId: string) {
		draggingBacklogId = backlogId;
		event.dataTransfer?.setData("text/plain", backlogId);
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = "move";
		}
	}

	function handleDragOver(event: DragEvent, dateIso: string) {
		event.preventDefault();
		dragHoverDate = dateIso;
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = "move";
		}
	}

	async function scheduleIdeaOnDate(backlogId: string, dateIso: string) {
		if (!supabase) return;

		const { error } = await supabase.from("production_calendar").upsert(
			{
				backlog_id: backlogId,
				shoot_date: dateIso,
				status: "planned",
			},
			{ onConflict: "backlog_id" },
		);

		if (error) {
			errorMessage = `วางแผนใน calendar ไม่สำเร็จ: ${error.message}`;
			return;
		}

		message = "อัปเดตตารางถ่ายทำแล้ว";
		await loadCalendar();
		if (!selectedCalendarId) {
			const matched = calendarItems.find((item) => item.backlog_id === backlogId);
			if (matched) selectCalendarItem(matched.id);
		}
	}

	async function handleDropOnDate(event: DragEvent, dateIso: string) {
		event.preventDefault();
		const backlogId =
			event.dataTransfer?.getData("text/plain") || draggingBacklogId;
		draggingBacklogId = null;
		dragHoverDate = null;
		if (!backlogId) return;
		await scheduleIdeaOnDate(backlogId, dateIso);
	}

	async function unscheduleIdea(backlogId: string) {
		if (!supabase) return;
		const removedCalendarId =
			calendarItems.find((item) => item.backlog_id === backlogId)?.id ?? null;

		const { error } = await supabase
			.from("production_calendar")
			.delete()
			.eq("backlog_id", backlogId);

		if (error) {
			errorMessage = `ลบออกจาก calendar ไม่สำเร็จ: ${error.message}`;
			return;
		}

		message = "นำออกจาก calendar แล้ว";
		calendarItems = calendarItems.filter((item) => item.backlog_id !== backlogId);
		if (removedCalendarId) {
			producedVideos = producedVideos.filter(
				(video) => video.calendar_id !== removedCalendarId,
			);
			if (selectedCalendarId === removedCalendarId) {
				selectedCalendarId = null;
				hydrateProducedForm(null);
			}
		}
	}

	onMount(async () => {
		await Promise.all([loadIdeas(), loadCalendar(), loadProducedVideos()]);
		if (!selectedCalendarId && calendarItems.length > 0) {
			selectCalendarItem(calendarItems[0].id);
		}
	});
</script>

<main class="page">
	<section class="hero">
		<p class="kicker">BigLot Media Plan</p>
		<h1>Idea Backlog</h1>
		<p class="subtitle">
			วางลิงก์ YouTube / Facebook / Instagram / TikTok แล้วดึง engagement
			มาเก็บเป็น backlog
		</p>
	</section>

	{#if !hasSupabaseConfig}
		<p class="alert">
			ตั้งค่า env ก่อนใช้งาน: <code>PUBLIC_SUPABASE_URL</code> และ
			<code>PUBLIC_SUPABASE_ANON_KEY</code>
		</p>
	{/if}

	<section class="panel">
		<div class="row">
			<label for="video-link">Video Link</label>
			<input
				id="video-link"
				bind:value={linkInput}
				placeholder="https://www.youtube.com/watch?v=..."
			/>
		</div>
		<button class="primary" onclick={analyzeLink} disabled={enriching}>
			{enriching ? "Analyzing..." : "Analyze Link"}
		</button>
	</section>

	{#if message}
		<p class="notice success">{message}</p>
	{/if}

	{#if errorMessage}
		<p class="notice error">{errorMessage}</p>
	{/if}

	{#if draft}
		<section class="panel">
			<div class="preview">
				{#if draftTikTokEmbedUrl}
					<iframe
						class="preview-media tiktok-frame"
						src={draftTikTokEmbedUrl}
						title="TikTok Preview"
						loading="lazy"
						allow="encrypted-media; picture-in-picture"
						allowfullscreen
					></iframe>
				{:else if draftInstagramEmbedUrl}
					<iframe
						class="preview-media instagram-frame"
						src={draftInstagramEmbedUrl}
						title="Instagram Preview"
						loading="lazy"
						allow="encrypted-media; picture-in-picture"
						allowfullscreen
					></iframe>
				{:else if draft.thumbnailUrl}
					<img
						class="preview-media"
						src={draft.thumbnailUrl}
						alt={draft.title ?? "thumbnail"}
					/>
				{/if}
				<div class="preview-content">
					<span class="platform">{draft.platform.toUpperCase()}</span>
					<h2>{draft.title ?? "Untitled video"}</h2>
					<p class="meta">
						{draft.authorName ?? "Unknown creator"}
						{#if draft.publishedAt}
							• {new Date(draft.publishedAt).toLocaleDateString()}
						{/if}
					</p>
					{#if draft.description}
						<p class="notes">{draft.description}</p>
					{/if}
				</div>
			</div>

			<div class="metrics">
				<div class="metric-item">
					<label for="views">Views</label>
					<input
						id="views"
						type="number"
						min="0"
						bind:value={metrics.views}
					/>
				</div>
				<div class="metric-item">
					<label for="likes">Likes</label>
					<input
						id="likes"
						type="number"
						min="0"
						bind:value={metrics.likes}
					/>
				</div>
				<div class="metric-item">
					<label for="comments">Comments</label>
					<input
						id="comments"
						type="number"
						min="0"
						bind:value={metrics.comments}
					/>
				</div>
				<div class="metric-item">
					<label for="shares">Shares</label>
					<input
						id="shares"
						type="number"
						min="0"
						bind:value={metrics.shares}
					/>
				</div>
				<div class="metric-item">
					<label for="saves">Saves</label>
					<input
						id="saves"
						type="number"
						min="0"
						bind:value={metrics.saves}
					/>
				</div>
			</div>

			<div class="row">
				<label for="notes">Idea Notes</label>
				<textarea
					id="notes"
					bind:value={notes}
					rows={4}
					placeholder="ไอเดียที่ได้จากวิดีโอนี้ เช่น hook, visual style, CTA..."
				></textarea>
			</div>

			<button
				class="primary"
				onclick={saveIdea}
				disabled={saving || !hasSupabaseConfig}
			>
				{saving ? "Saving..." : "Save To Backlog"}
			</button>
		</section>
	{/if}

	<section class="panel">
		<div class="list-head">
			<h2>Backlog ({ideas.length})</h2>
			{#if loadingIdeas}
				<span class="loading-spinner">Loading...</span>
			{/if}
		</div>

		{#if ideas.length === 0}
			<p class="empty text-center">ยังไม่มีรายการไอเดียในระบบ</p>
		{:else}
			<div class="platform-groups">
				{#each groupedIdeas as group}
					<section class="platform-group">
						<div class="platform-group-head">
							<h3>{group.label}</h3>
							<span class="group-count">{group.items.length}</span>
						</div>

							<div class="grid">
								{#each group.items as idea}
									{@const tiktokEmbedUrl =
										idea.platform === "tiktok"
											? getTikTokEmbedUrl(idea.url)
											: null}
									{@const instagramEmbedUrl =
										idea.platform === "instagram"
											? getInstagramEmbedUrl(idea.url)
											: null}
									<article
										class="card"
										draggable="true"
										ondragstart={(event) => handleDragStart(event, idea.id)}
									>
										{#if tiktokEmbedUrl}
											<iframe
												class="card-media tiktok-frame"
											src={tiktokEmbedUrl}
											title="TikTok Backlog Preview"
											loading="lazy"
												allow="encrypted-media; picture-in-picture"
												allowfullscreen
											></iframe>
										{:else if instagramEmbedUrl}
											<iframe
												class="card-media instagram-frame"
												src={instagramEmbedUrl}
												title="Instagram Backlog Preview"
												loading="lazy"
												allow="encrypted-media; picture-in-picture"
												allowfullscreen
											></iframe>
										{:else if idea.thumbnail_url}
											<img
												class="card-media"
												src={idea.thumbnail_url}
											alt={idea.title ?? "thumbnail"}
										/>
									{/if}
										<div class="card-body">
											<span class="platform"
												>{idea.platform.toUpperCase()}</span
											>
											{#if scheduledBacklogIds.has(idea.id)}
												<span class="chip">Scheduled</span>
											{/if}
											<h3>{idea.title ?? "Untitled idea"}</h3>

										<div class="stats">
											<div class="stat-badge">
												<span>Views</span>
												<span>{formatCount(idea.view_count)}</span>
											</div>
											<div class="stat-badge">
												<span>Likes</span>
												<span>{formatCount(idea.like_count)}</span>
											</div>
											<div class="stat-badge">
												<span>Comments</span>
												<span
													>{formatCount(idea.comment_count)}</span
												>
											</div>
											<div class="stat-badge">
												<span>Shares</span>
												<span>{formatCount(idea.share_count)}</span>
											</div>
										</div>

										{#if idea.notes}
											<p class="notes">{idea.notes}</p>
										{/if}

										<div class="link">
											<a
												href={idea.url}
												target="_blank"
												rel="noreferrer">{idea.url}</a
											>
										</div>
										<button
											class="danger"
											onclick={() => deleteIdea(idea)}
											disabled={deletingId === idea.id}
										>
											{deletingId === idea.id ? "Deleting..." : "Delete"}
										</button>
									</div>
								</article>
							{/each}
						</div>
					</section>
				{/each}
			</div>
		{/if}
	</section>

	<section class="panel">
		<div class="list-head">
			<h2>Shoot Calendar</h2>
			<div class="calendar-controls">
				<button class="ghost" onclick={() => shiftMonth(-1)}>&larr; Prev</button>
				<span class="week-range">{monthLabel}</span>
				<button class="ghost" onclick={() => shiftMonth(1)}>Next &rarr;</button>
			</div>
		</div>

		{#if loadingCalendar}
			<p class="empty text-center">Loading calendar...</p>
		{:else}
			<div class="calendar-shell">
				<div class="calendar-weekdays">
					{#each weekdayLabels as weekday}
						<span>{weekday}</span>
					{/each}
				</div>

				<div class="calendar-grid">
					{#each monthCells as cell}
						<div
							class={`calendar-day ${cell.inCurrentMonth ? "" : "outside-month"} ${dragHoverDate === cell.dateIso ? "drop-hover" : ""}`}
							role="region"
							aria-label={`Shoot day ${cell.dateIso}`}
							ondragover={(event) => handleDragOver(event, cell.dateIso)}
							ondragleave={() => (dragHoverDate = null)}
							ondrop={(event) => handleDropOnDate(event, cell.dateIso)}
						>
							<div class="calendar-day-head">
								<strong>{formatCalendarDayNumber(cell.dateIso)}</strong>
								<small>{formatCalendarDayMeta(cell.dateIso)}</small>
							</div>

							{#if (calendarByDate.get(cell.dateIso) ?? []).length === 0}
								<p class="drop-hint">Drag idea here</p>
							{/if}

							{#each calendarByDate.get(cell.dateIso) ?? [] as item}
								<article
									class="calendar-item"
									draggable="true"
									ondragstart={(event) =>
										handleDragStart(event, item.backlog_id)}
								>
									<span class="platform"
										>{item.idea_backlog?.platform?.toUpperCase() ??
											"IDEA"}</span
									>
									<p>{item.idea_backlog?.title ?? "Untitled idea"}</p>
									<div class="calendar-item-actions">
										<button
											class="tiny-danger"
											onclick={() => unscheduleIdea(item.backlog_id)}
										>
											Remove
										</button>
									</div>
								</article>
							{/each}
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</section>

	<section class="panel">
		<div class="list-head">
			<h2>KPI Compare</h2>
		</div>
		<div class="kpi-layout">
			<div class="kpi-left">
				<h3>Calendar Ideas</h3>
				{#if loadingProduced}
					<p class="drop-hint">Loading produced videos...</p>
				{/if}
				{#if sortedCalendarIdeas.length === 0}
					<p class="empty">ยังไม่มีไอเดียใน calendar</p>
				{:else}
					<div class="kpi-idea-list">
						{#each sortedCalendarIdeas as item}
							<button
								class={`kpi-idea-btn ${selectedCalendarId === item.id ? "active" : ""}`}
								onclick={() => selectCalendarItem(item.id)}
							>
								<div>
									<strong>{item.idea_backlog?.title ?? "Untitled idea"}</strong>
									<p>{formatCalendarDate(item.shoot_date)}</p>
								</div>
								{#if producedByCalendarId.has(item.id)}
									<span class="chip">Compared</span>
								{/if}
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<div class="kpi-right">
				{#if !selectedCalendarItem}
					<p class="empty">เลือกไอเดียจากฝั่งซ้ายเพื่อเริ่มเทียบ KPI</p>
				{:else}
					<div class="kpi-source">
						<p class="kicker">Original Idea</p>
						<h3>{selectedCalendarItem.idea_backlog?.title ?? "Untitled idea"}</h3>
						<p class="meta">{formatCalendarDate(selectedCalendarItem.shoot_date)}</p>
					</div>

					<div class="row">
						<label for="produced-link">Produced Video Link</label>
						<input
							id="produced-link"
							bind:value={producedLinkInput}
							placeholder="https://www.youtube.com/watch?v=..."
						/>
					</div>
					<div class="kpi-actions">
						<button
							class="ghost"
							onclick={analyzeProducedLink}
							disabled={analyzingProduced || !selectedCalendarItem}
						>
							{analyzingProduced ? "Analyzing..." : "Analyze Produced Video"}
						</button>
						<button
							class="primary"
							onclick={saveProducedVideo}
							disabled={savingProduced || !selectedCalendarItem}
						>
							{savingProduced ? "Saving..." : "Save Produced KPI"}
						</button>
					</div>

						{#if effectiveProducedPreview}
							<div class="preview mini-preview">
								{#if producedDraftTikTokEmbedUrl}
									<iframe
									class="preview-media tiktok-frame"
									src={producedDraftTikTokEmbedUrl}
									title="Produced TikTok Preview"
									loading="lazy"
									allow="encrypted-media; picture-in-picture"
									allowfullscreen
								></iframe>
							{:else if producedDraftInstagramEmbedUrl}
								<iframe
									class="preview-media instagram-frame"
									src={producedDraftInstagramEmbedUrl}
									title="Produced Instagram Preview"
									loading="lazy"
									allow="encrypted-media; picture-in-picture"
									allowfullscreen
								></iframe>
								{:else if effectiveProducedPreview.thumbnailUrl}
									<img
										class="preview-media"
										src={effectiveProducedPreview.thumbnailUrl}
										alt={effectiveProducedPreview.title ?? "thumbnail"}
									/>
								{/if}
								<div class="preview-content">
									<span class="platform"
										>{effectiveProducedPreview.platform.toUpperCase()}</span
									>
									<h3>{effectiveProducedPreview.title ?? "Untitled produced video"}</h3>
								</div>
							</div>
						{/if}

					<div class="metrics">
						<div class="metric-item">
							<label for="p-views">Views</label>
							<input id="p-views" type="number" min="0" bind:value={producedMetrics.views} />
						</div>
						<div class="metric-item">
							<label for="p-likes">Likes</label>
							<input id="p-likes" type="number" min="0" bind:value={producedMetrics.likes} />
						</div>
						<div class="metric-item">
							<label for="p-comments">Comments</label>
							<input
								id="p-comments"
								type="number"
								min="0"
								bind:value={producedMetrics.comments}
							/>
						</div>
						<div class="metric-item">
							<label for="p-shares">Shares</label>
							<input id="p-shares" type="number" min="0" bind:value={producedMetrics.shares} />
						</div>
						<div class="metric-item">
							<label for="p-saves">Saves</label>
							<input id="p-saves" type="number" min="0" bind:value={producedMetrics.saves} />
						</div>
					</div>

					<div class="row">
						<label for="produced-notes">Produced Notes</label>
						<textarea
							id="produced-notes"
							bind:value={producedNotes}
							rows={3}
							placeholder="ผลลัพธ์ที่ต่างจากต้นฉบับ เช่น hook ที่ปรับ, ปัญหาหน้างาน..."
						></textarea>
					</div>

					<div class="kpi-table-wrap">
						<table class="kpi-table">
							<thead>
								<tr>
									<th>Metric</th>
									<th>Original</th>
									<th>Produced</th>
									<th>Delta</th>
									<th>%</th>
									<th>Status</th>
								</tr>
							</thead>
							<tbody>
								{#each kpiRows as row}
									<tr>
										<td>{row.label}</td>
										<td>{formatCount(row.original)}</td>
										<td>{formatCount(row.produced)}</td>
										<td>{formatDelta(row.delta)}</td>
										<td>{formatPercent(row.pct)}</td>
										<td>
											<span class={`kpi-status ${row.status}`}>
												{metricLabel(row.status)}
											</span>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		</div>
	</section>
</main>

<style>
	:global(body) {
		margin: 0;
		font-family: "Inter", "Noto Sans Thai", sans-serif;
		background-color: #f8fafc;
		background-image: radial-gradient(
				at 0% 0%,
				hsla(210, 100%, 96%, 1) 0px,
				transparent 50%
			),
			radial-gradient(
				at 100% 0%,
				hsla(25, 100%, 95%, 1) 0px,
				transparent 50%
			),
			radial-gradient(
				at 100% 100%,
				hsla(210, 100%, 94%, 1) 0px,
				transparent 50%
			),
			radial-gradient(
				at 0% 100%,
				hsla(280, 100%, 96%, 1) 0px,
				transparent 50%
			);
		background-attachment: fixed;
		color: #1e293b;
		line-height: 1.6;
	}

	h1,
	h2,
	h3,
	.kicker {
		font-family: "Outfit", sans-serif;
	}

	.page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 5rem 1.5rem;
	}

	.hero {
		text-align: center;
		margin-bottom: 5rem;
	}

	.hero h1 {
		margin: 0.75rem 0;
		font-size: clamp(2.5rem, 8vw, 4.2rem);
		font-weight: 700;
		background: linear-gradient(135deg, #0f172a 0%, #334155 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		letter-spacing: -0.04em;
	}

	.kicker {
		text-transform: uppercase;
		letter-spacing: 0.3em;
		margin: 0;
		color: #b45309;
		font-size: 0.8rem;
		font-weight: 600;
	}

	.subtitle {
		max-width: 50rem;
		margin: 1.5rem auto 0;
		color: #475569;
		font-size: 1.15rem;
	}

	.panel {
		margin-top: 2rem;
		padding: 2.5rem;
		border: 1px solid rgba(0, 0, 0, 0.05);
		border-radius: 1.5rem;
		backdrop-filter: blur(20px);
		background: rgba(255, 255, 255, 0.7);
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.05);
	}

	.row {
		display: grid;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}

	label {
		font-size: 0.9rem;
		font-weight: 500;
		color: #64748b;
		padding-left: 0.5rem;
	}

	input,
	textarea {
		width: 100%;
		border-radius: 0.85rem;
		border: 1px solid rgba(0, 0, 0, 0.1);
		background: rgba(255, 255, 255, 0.8);
		padding: 1rem 1.25rem;
		color: #0f172a;
		font: inherit;
		transition: all 0.2s ease;
		box-sizing: border-box;
	}

	input:focus,
	textarea:focus {
		outline: none;
		border-color: #2563eb;
		background: #fff;
		box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
	}

	.primary {
		width: 100%;
		border: 0;
		border-radius: 0.85rem;
		background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
		color: white;
		font-weight: 600;
		font-size: 1rem;
		padding: 1.1rem 1.5rem;
		cursor: pointer;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
	}

	.primary:hover:not(:disabled) {
		transform: translateY(-2px);
		filter: brightness(1.1);
		box-shadow: 0 8px 20px rgba(37, 99, 235, 0.3);
	}

	.danger {
		margin-top: 0.9rem;
		border: 1px solid rgba(220, 38, 38, 0.25);
		background: rgba(220, 38, 38, 0.08);
		color: #b91c1c;
		border-radius: 0.75rem;
		padding: 0.65rem 0.9rem;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.danger:hover:not(:disabled) {
		background: rgba(220, 38, 38, 0.16);
	}

	.danger:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.notice {
		padding: 1rem 1.25rem;
		border-radius: 1rem;
		margin-top: 1.5rem;
		font-size: 0.95rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.notice.success {
		background: rgba(22, 163, 74, 0.1);
		border: 1px solid rgba(22, 163, 74, 0.2);
		color: #166534;
	}

	.notice.error,
	.alert {
		background: rgba(220, 38, 38, 0.1);
		border: 1px solid rgba(220, 38, 38, 0.2);
		color: #991b1b;
		padding: 1rem 1.25rem;
		border-radius: 1rem;
	}

	.preview {
		display: grid;
		grid-template-columns: 320px 1fr;
		gap: 2.5rem;
	}

	.preview-media {
		width: 100%;
		aspect-ratio: 16 / 9;
		object-fit: cover;
		border-radius: 1rem;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
	}

	.tiktok-frame {
		border: 0;
		background: #000;
		aspect-ratio: 9 / 16;
	}

	.instagram-frame {
		border: 0;
		background: #fff;
		aspect-ratio: 4 / 5;
	}

	.preview-content {
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	.preview-content h2 {
		margin: 0.75rem 0;
		font-size: 1.9rem;
		color: #0f172a;
		line-height: 1.2;
	}

	.platform {
		display: inline-block;
		padding: 0.2rem 0.75rem;
		border-radius: 2rem;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		background: rgba(180, 83, 9, 0.1);
		color: #92400e;
		margin-bottom: 0.5rem;
		width: fit-content;
	}

	.meta {
		color: #64748b;
		font-size: 1rem;
		margin-bottom: 1rem;
	}

	.metrics {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 1.25rem;
		margin: 2.5rem 0;
	}

	.metric-item {
		background: rgba(0, 0, 0, 0.03);
		padding: 1.25rem;
		border-radius: 1rem;
		border: 1px solid rgba(0, 0, 0, 0.05);
	}

	.metric-item label {
		margin: 0 0 0.5rem;
		display: block;
		font-size: 0.8rem;
		color: #64748b;
	}

	.metric-item input {
		padding: 0.5rem;
		font-size: 1.25rem;
		font-weight: 700;
		text-align: center;
		background: transparent;
		border: none;
		color: #0f172a;
	}

	.list-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2.5rem;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.list-head h2 {
		margin: 0;
		font-size: 2.2rem;
		color: #0f172a;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
		gap: 2.5rem;
	}

	.platform-groups {
		display: grid;
		gap: 2.5rem;
	}

	.platform-group-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.25rem;
		padding-bottom: 0.9rem;
		border-bottom: 1px solid rgba(0, 0, 0, 0.08);
	}

	.platform-group-head h3 {
		margin: 0;
		font-size: 1.3rem;
		color: #0f172a;
	}

	.group-count {
		background: rgba(37, 99, 235, 0.1);
		color: #1d4ed8;
		padding: 0.2rem 0.7rem;
		border-radius: 1rem;
		font-size: 0.8rem;
		font-weight: 700;
	}

	.chip {
		display: inline-block;
		margin-left: 0.4rem;
		padding: 0.12rem 0.55rem;
		border-radius: 999px;
		background: rgba(22, 163, 74, 0.12);
		color: #166534;
		font-size: 0.72rem;
		font-weight: 700;
	}

	.calendar-controls {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex-wrap: wrap;
	}

	.ghost {
		border: 1px solid rgba(37, 99, 235, 0.25);
		background: rgba(37, 99, 235, 0.08);
		color: #1d4ed8;
		border-radius: 0.7rem;
		padding: 0.45rem 0.75rem;
		font-size: 0.82rem;
		font-weight: 600;
		cursor: pointer;
	}

	.week-range {
		font-size: 0.9rem;
		color: #334155;
		font-weight: 600;
	}

	.calendar-grid {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.calendar-shell {
		overflow-x: auto;
	}

	.calendar-weekdays,
	.calendar-grid {
		min-width: 920px;
	}

	.calendar-weekdays {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.calendar-weekdays span {
		font-size: 0.8rem;
		color: #64748b;
		text-align: center;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.calendar-day {
		min-height: 160px;
		border: 1px solid rgba(0, 0, 0, 0.08);
		background: rgba(255, 255, 255, 0.76);
		border-radius: 1rem;
		padding: 0.7rem;
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}

	.calendar-day.outside-month {
		opacity: 0.62;
		background: rgba(255, 255, 255, 0.45);
	}

	.calendar-day.drop-hover {
		border-color: rgba(37, 99, 235, 0.5);
		box-shadow: inset 0 0 0 2px rgba(37, 99, 235, 0.18);
	}

	.calendar-day-head {
		display: grid;
		gap: 0.15rem;
	}

	.calendar-day-head strong {
		font-size: 1rem;
		color: #0f172a;
	}

	.calendar-day-head small {
		font-size: 0.72rem;
		color: #64748b;
	}

	.drop-hint {
		font-size: 0.8rem;
		color: #64748b;
		margin: 0.25rem 0 0;
	}

	.calendar-item {
		border: 1px solid rgba(0, 0, 0, 0.08);
		background: #fff;
		border-radius: 0.8rem;
		padding: 0.55rem;
		display: grid;
		gap: 0.35rem;
		cursor: grab;
	}

	.calendar-item p {
		margin: 0;
		font-size: 0.82rem;
		color: #0f172a;
		line-height: 1.3;
	}

	.calendar-item-actions {
		display: flex;
		justify-content: flex-end;
	}

	.tiny-danger {
		border: 0;
		background: rgba(220, 38, 38, 0.12);
		color: #b91c1c;
		font-size: 0.72rem;
		font-weight: 700;
		border-radius: 0.6rem;
		padding: 0.3rem 0.45rem;
		cursor: pointer;
	}

	.kpi-layout {
		display: grid;
		grid-template-columns: 340px 1fr;
		gap: 1rem;
	}

	.kpi-left,
	.kpi-right {
		border: 1px solid rgba(0, 0, 0, 0.08);
		border-radius: 1rem;
		background: rgba(255, 255, 255, 0.78);
		padding: 0.9rem;
	}

	.kpi-left h3,
	.kpi-right h3 {
		margin: 0 0 0.7rem;
		font-size: 1.05rem;
	}

	.kpi-idea-list {
		display: grid;
		gap: 0.55rem;
		max-height: 520px;
		overflow: auto;
	}

	.kpi-idea-btn {
		text-align: left;
		border: 1px solid rgba(0, 0, 0, 0.08);
		border-radius: 0.75rem;
		background: #fff;
		padding: 0.7rem;
		cursor: pointer;
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.kpi-idea-btn strong {
		display: block;
		font-size: 0.88rem;
		color: #0f172a;
	}

	.kpi-idea-btn p {
		margin: 0.2rem 0 0;
		font-size: 0.76rem;
		color: #64748b;
	}

	.kpi-idea-btn.active {
		border-color: rgba(37, 99, 235, 0.45);
		box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.25);
	}

	.kpi-source {
		margin-bottom: 0.65rem;
	}

	.kpi-source .kicker {
		color: #2563eb;
		letter-spacing: 0.16em;
		font-size: 0.7rem;
	}

	.kpi-source h3 {
		margin: 0.2rem 0 0.35rem;
		font-size: 1.05rem;
	}

	.kpi-actions {
		display: flex;
		gap: 0.6rem;
		margin-bottom: 0.8rem;
	}

	.kpi-actions .primary {
		width: auto;
	}

	.mini-preview {
		margin-top: 0.2rem;
		grid-template-columns: 200px 1fr;
		gap: 1rem;
	}

	.kpi-table-wrap {
		overflow-x: auto;
	}

	.kpi-table {
		width: 100%;
		min-width: 540px;
		border-collapse: collapse;
		font-size: 0.84rem;
	}

	.kpi-table th,
	.kpi-table td {
		border-bottom: 1px solid rgba(0, 0, 0, 0.08);
		padding: 0.55rem 0.45rem;
		text-align: left;
		white-space: nowrap;
	}

	.kpi-table th {
		color: #64748b;
		font-weight: 700;
		font-size: 0.76rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.kpi-status {
		display: inline-block;
		border-radius: 999px;
		padding: 0.16rem 0.56rem;
		font-size: 0.72rem;
		font-weight: 700;
	}

	.kpi-status.up {
		background: rgba(22, 163, 74, 0.12);
		color: #166534;
	}

	.kpi-status.down {
		background: rgba(220, 38, 38, 0.12);
		color: #b91c1c;
	}

	.kpi-status.same {
		background: rgba(2, 132, 199, 0.12);
		color: #0c4a6e;
	}

	.kpi-status.na {
		background: rgba(100, 116, 139, 0.14);
		color: #475569;
	}

	.card {
		background: #fff;
		border: 1px solid rgba(0, 0, 0, 0.06);
		border-radius: 1.5rem;
		overflow: hidden;
		transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
		display: flex;
		flex-direction: column;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
	}

	.card:hover {
		transform: translateY(-10px);
		border-color: rgba(37, 99, 235, 0.2);
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.08);
	}

	.card-media {
		width: 100%;
		aspect-ratio: 16 / 9;
		object-fit: cover;
		border-bottom: 1px solid rgba(0, 0, 0, 0.06);
	}

	.card-body {
		padding: 1.75rem;
		flex-grow: 1;
		display: flex;
		flex-direction: column;
	}

	.card h3 {
		margin: 1rem 0 1rem;
		font-size: 1.35rem;
		line-height: 1.3;
		color: #0f172a;
		font-weight: 600;
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.85rem;
		margin: 1.25rem 0;
	}

	.stat-badge {
		background: rgba(0, 0, 0, 0.03);
		padding: 0.65rem 1rem;
		border-radius: 0.85rem;
		font-size: 0.85rem;
		color: #0f172a;
		border: 1px solid rgba(0, 0, 0, 0.03);
		display: flex;
		justify-content: space-between;
	}

	.stat-badge span:first-child {
		color: #64748b;
		font-weight: 500;
	}

	.link {
		font-size: 0.85rem;
		margin-top: auto;
		padding-top: 1.25rem;
		border-top: 1px solid rgba(0, 0, 0, 0.06);
	}

	.link a {
		color: #2563eb;
		text-decoration: none;
		transition: color 0.3s;
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.link a:hover {
		color: #1d4ed8;
		text-decoration: underline;
	}

	.notes {
		font-size: 0.95rem;
		color: #475569;
		margin: 0.75rem 0 1.25rem;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
		line-height: 1.6;
	}

	.empty {
		color: #64748b;
		padding: 4rem;
		text-align: center;
		font-size: 1.1rem;
	}

	.text-center {
		text-align: center;
	}

	@media (max-width: 900px) {
		.preview {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}

		.metrics {
			grid-template-columns: repeat(2, 1fr);
		}

		.page {
			padding: 3rem 1rem;
		}

		.hero h1 {
			font-size: 2.8rem;
		}

		.kpi-layout {
			grid-template-columns: 1fr;
		}

		.mini-preview {
			grid-template-columns: 1fr;
		}
	}
</style>
