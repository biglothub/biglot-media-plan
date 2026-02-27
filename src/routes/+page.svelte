<script lang="ts">
	import { onMount } from 'svelte';
	import { hasSupabaseConfig, supabase } from '$lib/supabase';
	import type { EnrichResult, IdeaBacklogRow } from '$lib/types';

	const numberFormatter = new Intl.NumberFormat('en-US');

	let linkInput = $state('');
	let notes = $state('');
	let loadingIdeas = $state(false);
	let enriching = $state(false);
	let saving = $state(false);
	let message = $state('');
	let errorMessage = $state('');
	let draft = $state<EnrichResult | null>(null);
	let ideas = $state<IdeaBacklogRow[]>([]);
	let metrics = $state({
		views: null as number | null,
		likes: null as number | null,
		comments: null as number | null,
		shares: null as number | null,
		saves: null as number | null
	});

	function clearState() {
		draft = null;
		notes = '';
		metrics = {
			views: null,
			likes: null,
			comments: null,
			shares: null,
			saves: null
		};
	}

	function formatCount(value: number | null): string {
		return value === null ? '-' : numberFormatter.format(value);
	}

	async function loadIdeas() {
		if (!supabase) return;

		loadingIdeas = true;
		errorMessage = '';

		const { data, error } = await supabase
			.from('idea_backlog')
			.select('*')
			.order('created_at', { ascending: false });

		loadingIdeas = false;

		if (error) {
			errorMessage = `โหลด backlog ไม่ได้: ${error.message}`;
			return;
		}

		ideas = (data ?? []) as IdeaBacklogRow[];
	}

	async function analyzeLink() {
		message = '';
		errorMessage = '';
		clearState();

		if (!linkInput.trim()) {
			errorMessage = 'กรุณาวางลิงก์ก่อน';
			return;
		}

		enriching = true;
		try {
			const response = await fetch(`/api/enrich?url=${encodeURIComponent(linkInput.trim())}`);
			const body = await response.json();

			if (!response.ok) {
				errorMessage = body.error ?? 'อ่านข้อมูลจากลิงก์ไม่สำเร็จ';
				return;
			}

			draft = body as EnrichResult;
			metrics = {
				views: draft.metrics.views,
				likes: draft.metrics.likes,
				comments: draft.metrics.comments,
				shares: draft.metrics.shares,
				saves: draft.metrics.saves
			};
			message = 'ดึงข้อมูลสำเร็จแล้ว ตรวจค่า engagement ก่อนบันทึกได้เลย';
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดระหว่าง analyze link';
		} finally {
			enriching = false;
		}
	}

	async function saveIdea() {
		if (!supabase) {
			errorMessage = 'ยังไม่ได้ตั้งค่า Supabase';
			return;
		}

		if (!draft) {
			errorMessage = 'ยังไม่มีข้อมูลจากการ analyze ลิงก์';
			return;
		}

		saving = true;
		errorMessage = '';
		message = '';

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
			status: 'new',
			engagement_json: {
				source: draft.source,
				extracted_at: new Date().toISOString()
			}
		};

		const { error } = await supabase.from('idea_backlog').insert(payload);
		saving = false;

		if (error) {
			errorMessage = `บันทึกไม่สำเร็จ: ${error.message}`;
			return;
		}

		message = 'บันทึกเข้า backlog แล้ว';
		linkInput = '';
		clearState();
		await loadIdeas();
	}

	onMount(loadIdeas);
</script>

<main class="page">
	<section class="hero">
		<p class="kicker">BigLot Media Plan</p>
		<h1>Idea Backlog</h1>
		<p class="subtitle">วางลิงก์ YouTube / Facebook / Instagram / TikTok แล้วดึง engagement มาเก็บเป็น backlog</p>
	</section>

	{#if !hasSupabaseConfig}
		<p class="alert">
			ตั้งค่า env ก่อนใช้งาน: <code>PUBLIC_SUPABASE_URL</code> และ <code>PUBLIC_SUPABASE_ANON_KEY</code>
		</p>
	{/if}

	<section class="panel">
		<div class="row">
			<label for="video-link">Video Link</label>
			<input id="video-link" bind:value={linkInput} placeholder="https://www.youtube.com/watch?v=..." />
		</div>
		<button class="primary" onclick={analyzeLink} disabled={enriching}>
			{enriching ? 'Analyzing...' : 'Analyze Link'}
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
				{#if draft.thumbnailUrl}
					<img src={draft.thumbnailUrl} alt={draft.title ?? 'thumbnail'} />
				{/if}
				<div>
					<p class="platform">{draft.platform.toUpperCase()}</p>
					<h2>{draft.title ?? 'Untitled video'}</h2>
					<p class="meta">
						{draft.authorName ?? 'Unknown creator'}
						{#if draft.publishedAt}
							• {new Date(draft.publishedAt).toLocaleDateString()}
						{/if}
					</p>
					{#if draft.description}
						<p>{draft.description}</p>
					{/if}
				</div>
			</div>

			<div class="metrics">
				<div>
					<label for="views">Views</label>
					<input id="views" type="number" min="0" bind:value={metrics.views} />
				</div>
				<div>
					<label for="likes">Likes</label>
					<input id="likes" type="number" min="0" bind:value={metrics.likes} />
				</div>
				<div>
					<label for="comments">Comments</label>
					<input id="comments" type="number" min="0" bind:value={metrics.comments} />
				</div>
				<div>
					<label for="shares">Shares</label>
					<input id="shares" type="number" min="0" bind:value={metrics.shares} />
				</div>
				<div>
					<label for="saves">Saves</label>
					<input id="saves" type="number" min="0" bind:value={metrics.saves} />
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

			<button class="primary" onclick={saveIdea} disabled={saving || !hasSupabaseConfig}>
				{saving ? 'Saving...' : 'Save To Backlog'}
			</button>
		</section>
	{/if}

	<section class="panel">
		<div class="list-head">
			<h2>Backlog ({ideas.length})</h2>
			{#if loadingIdeas}
				<span>Loading...</span>
			{/if}
		</div>

		{#if ideas.length === 0}
			<p class="empty">ยังไม่มีรายการ</p>
		{:else}
			<div class="grid">
				{#each ideas as idea}
					<article class="card">
						{#if idea.thumbnail_url}
							<img src={idea.thumbnail_url} alt={idea.title ?? 'thumbnail'} />
						{/if}
						<div class="card-body">
							<p class="platform">{idea.platform.toUpperCase()}</p>
							<h3>{idea.title ?? 'Untitled idea'}</h3>
							<p class="link"><a href={idea.url} target="_blank" rel="noreferrer">{idea.url}</a></p>
							<div class="stats">
								<span>V {formatCount(idea.view_count)}</span>
								<span>L {formatCount(idea.like_count)}</span>
								<span>C {formatCount(idea.comment_count)}</span>
								<span>S {formatCount(idea.share_count)}</span>
							</div>
							{#if idea.notes}
								<p>{idea.notes}</p>
							{/if}
						</div>
					</article>
				{/each}
			</div>
		{/if}
	</section>
</main>

<style>
	:global(body) {
		margin: 0;
		font-family: 'Space Grotesk', 'Noto Sans Thai', 'Sukhumvit Set', sans-serif;
		background:
			radial-gradient(circle at 15% 20%, #f4b893 0%, transparent 24%),
			radial-gradient(circle at 88% 15%, #f8dd8b 0%, transparent 22%),
			linear-gradient(165deg, #101824 0%, #1f2532 60%, #141a25 100%);
		color: #f6f7f9;
	}

	.page {
		max-width: 1080px;
		margin: 0 auto;
		padding: 2rem 1rem 4rem;
	}

	.hero h1 {
		margin: 0;
		font-size: clamp(2rem, 6vw, 3.8rem);
		letter-spacing: -0.03em;
	}

	.kicker {
		text-transform: uppercase;
		letter-spacing: 0.18em;
		margin: 0 0 0.5rem;
		color: #f8dd8b;
		font-size: 0.78rem;
	}

	.subtitle {
		max-width: 50rem;
		color: #d2d4d9;
	}

	.panel {
		margin-top: 1.1rem;
		padding: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 1rem;
		backdrop-filter: blur(2px);
		background: rgba(12, 18, 26, 0.72);
	}

	.row {
		display: grid;
		gap: 0.5rem;
		margin-bottom: 0.9rem;
	}

	label {
		font-size: 0.85rem;
		color: #d2d4d9;
	}

	input,
	textarea {
		width: 100%;
		border-radius: 0.75rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
		background: rgba(255, 255, 255, 0.06);
		padding: 0.7rem 0.8rem;
		color: #fff;
		font: inherit;
	}

	textarea {
		resize: vertical;
	}

	.primary {
		border: 0;
		border-radius: 0.75rem;
		background: linear-gradient(90deg, #e3644d, #ff9e4d);
		color: #0f0f11;
		font-weight: 700;
		padding: 0.72rem 1.1rem;
		cursor: pointer;
	}

	.primary:disabled {
		opacity: 0.65;
		cursor: not-allowed;
	}

	.notice {
		padding: 0.7rem 0.9rem;
		border-radius: 0.75rem;
		margin-top: 0.8rem;
	}

	.notice.success {
		background: rgba(49, 187, 135, 0.18);
		border: 1px solid rgba(49, 187, 135, 0.5);
	}

	.notice.error,
	.alert {
		background: rgba(230, 88, 88, 0.2);
		border: 1px solid rgba(230, 88, 88, 0.5);
		padding: 0.7rem 0.9rem;
		border-radius: 0.75rem;
	}

	.preview {
		display: grid;
		grid-template-columns: minmax(200px, 320px) 1fr;
		gap: 1rem;
	}

	.preview img {
		width: 100%;
		aspect-ratio: 16 / 9;
		object-fit: cover;
		border-radius: 0.8rem;
	}

	.platform {
		margin: 0;
		font-size: 0.78rem;
		letter-spacing: 0.12em;
		color: #f8dd8b;
	}

	.meta {
		color: #c9cdd3;
	}

	.metrics {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 0.7rem;
		margin: 0.9rem 0 1rem;
	}

	.list-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.8rem;
	}

	.list-head h2 {
		margin: 0;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 0.9rem;
	}

	.card {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.09);
		border-radius: 0.9rem;
		overflow: hidden;
	}

	.card img {
		width: 100%;
		aspect-ratio: 16 / 9;
		object-fit: cover;
	}

	.card-body {
		padding: 0.9rem;
	}

	.card h3 {
		margin: 0.35rem 0 0.5rem;
	}

	.stats {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		font-size: 0.82rem;
		margin-bottom: 0.4rem;
		color: #cfd3da;
	}

	.link {
		overflow-wrap: anywhere;
		font-size: 0.82rem;
	}

	.link a {
		color: #8fc6ff;
	}

	.empty {
		opacity: 0.7;
	}

	@media (max-width: 900px) {
		.preview {
			grid-template-columns: 1fr;
		}

		.metrics {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
