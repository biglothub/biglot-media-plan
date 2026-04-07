<script lang="ts">
	import {
		DEFAULT_CAROUSEL_QUOTE_FONT_SCALE,
		DEFAULT_CAROUSEL_TEXT_LETTER_SPACING_EM,
		getCarouselFontPresetDefinition,
		getCarouselSelectedAssetUrl,
		normalizeCarouselQuoteFontScale,
		normalizeCarouselTextLetterSpacingEm
	} from '$lib/carousel';
	import type { CarouselContentMode, CarouselFontPreset, CarouselSlideRow } from '$lib/types';

	interface Props {
		slide: CarouselSlideRow;
		fontPreset?: CarouselFontPreset;
		textLetterSpacingEm?: number;
		fallbackAssetUrl?: string | null;
		exportId?: string | null;
		contentMode?: CarouselContentMode;
		quoteFontScale?: number;
		accountDisplayName?: string | null;
		accountHandle?: string | null;
		accountAvatarUrl?: string | null;
		accountIsVerified?: boolean;
	}

	let {
		slide,
		fontPreset = 'biglot',
		textLetterSpacingEm = DEFAULT_CAROUSEL_TEXT_LETTER_SPACING_EM,
		fallbackAssetUrl = null,
		exportId = undefined,
		contentMode = 'standard',
		quoteFontScale = DEFAULT_CAROUSEL_QUOTE_FONT_SCALE,
		accountDisplayName = '',
		accountHandle = '',
		accountAvatarUrl = null,
		accountIsVerified = false
	}: Props = $props();

	const backgroundUrl = $derived(getCarouselSelectedAssetUrl(slide) ?? fallbackAssetUrl);
	const isCta = $derived(slide.role === 'cta');
	const isQuoteMode = $derived(contentMode === 'quote' && slide.role !== 'cta');
	const fontPresetDefinition = $derived(getCarouselFontPresetDefinition(fontPreset));
	const textLetterSpacingCss = $derived(`${normalizeCarouselTextLetterSpacingEm(textLetterSpacingEm)}em`);
	const quoteFontScaleCss = $derived(String(normalizeCarouselQuoteFontScale(quoteFontScale)));
	const normalizedHandle = $derived(normalizeAccountHandle(accountHandle));
	const accountNameLabel = $derived((accountDisplayName ?? '').trim() || 'Account');
	const accountInitials = $derived(getInitials(accountDisplayName));
	const resolvedExportId = $derived(exportId === null ? undefined : exportId ?? slide.id);

	function normalizeAccountHandle(value: string | null | undefined): string {
		if (!value) return '';
		return value.trim().replace(/^@+/, '').replace(/\s+/g, '');
	}

	function getInitials(value: string | null | undefined): string {
		const cleaned = value?.trim() ?? '';
		if (!cleaned) return 'Q';

		const parts = cleaned.split(/\s+/).filter(Boolean);
		const initials = parts
			.slice(0, 2)
			.map((part) => part[0] ?? '')
			.join('')
			.trim();

		return (initials || cleaned[0] || 'Q').toUpperCase();
	}
</script>

<article
	class="slide-preview slide-preview--{slide.layout_variant}"
	class:slide-preview--quote={isQuoteMode}
	data-export-slide-id={resolvedExportId}
	style:--carousel-font-heading={fontPresetDefinition.headingFont}
	style:--carousel-font-body={fontPresetDefinition.bodyFont}
	style:--carousel-text-letter-spacing={textLetterSpacingCss}
	style:--carousel-quote-font-scale={quoteFontScaleCss}
>
	{#if isQuoteMode}
		<div class="slide-preview-quote">
			<header class="slide-preview-account">
				<div class="slide-preview-avatar">
					{#if accountAvatarUrl}
						<img src={accountAvatarUrl} alt={accountNameLabel} loading="lazy" />
					{:else}
						<span>{accountInitials}</span>
					{/if}
				</div>
				<div class="slide-preview-account-copy">
					<div class="slide-preview-account-row">
						<strong>{accountNameLabel}</strong>
						{#if accountIsVerified}
							<span class="slide-preview-verified" aria-label="Verified account">
								<img src="/icons/verified-badge.png" alt="" loading="lazy" draggable="false" />
							</span>
						{/if}
					</div>
					{#if normalizedHandle}
						<p>@{normalizedHandle}</p>
					{/if}
				</div>
			</header>

			<div class="slide-preview-quote-copy">
				<h3>{slide.headline ?? 'Untitled slide'}</h3>
			</div>
		</div>
	{:else}
		<div class="slide-preview-bg" style:background-image={backgroundUrl ? `url("${backgroundUrl}")` : 'none'}></div>
		<div class="slide-preview-noise"></div>
		<div class="slide-preview-content">
			<div class="slide-preview-main">
				<h3>{slide.headline ?? 'Untitled slide'}</h3>
				{#if slide.body}
					<p class="slide-preview-body">{slide.body}</p>
				{/if}
				{#if isCta && slide.cta}
					<div class="slide-preview-cta">{slide.cta}</div>
				{:else if slide.cta}
					<p class="slide-preview-cta-note">{slide.cta}</p>
				{/if}
			</div>
		</div>
	{/if}
</article>

<style>
	.slide-preview {
		position: relative;
		overflow: hidden;
		border-radius: 1.6rem;
		aspect-ratio: 4 / 5;
		background:
			radial-gradient(circle at top left, rgba(251, 146, 60, 0.24), transparent 42%),
			linear-gradient(160deg, #111827 0%, #172554 42%, #431407 100%);
		color: #fff;
		font-family: var(--carousel-font-body);
		letter-spacing: var(--carousel-text-letter-spacing, 0em);
		border: 1px solid rgba(255, 255, 255, 0.12);
		box-shadow: var(--shadow-lg);
	}

	.slide-preview--quote {
		background: #111;
		border-color: rgba(255, 255, 255, 0.04);
		box-shadow: 0 18px 48px rgba(0, 0, 0, 0.32);
	}

	.slide-preview-bg,
	.slide-preview-noise {
		position: absolute;
		inset: 0;
	}

	.slide-preview-bg {
		background-position: center;
		background-size: cover;
		filter: saturate(1.08) contrast(1.02);
		transform: scale(1.02);
	}

	.slide-preview-noise {
		background:
			linear-gradient(180deg, rgba(15, 23, 42, 0.22), rgba(15, 23, 42, 0.72)),
			linear-gradient(135deg, rgba(249, 115, 22, 0.35), transparent 50%),
			linear-gradient(320deg, rgba(59, 130, 246, 0.25), transparent 55%);
	}

	.slide-preview-content {
		position: relative;
		z-index: 1;
		height: 100%;
		padding: 1.15rem;
		display: flex;
		align-items: stretch;
	}

	.slide-preview-quote {
		position: relative;
		z-index: 1;
		height: 100%;
		padding: 2rem 1.75rem 1.9rem;
		display: grid;
		grid-template-rows: auto 1fr;
		gap: 1.8rem;
	}

	.slide-preview-account {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding-top: 0.25rem;
	}

	.slide-preview-avatar {
		flex: none;
		width: 5.25rem;
		height: 5.25rem;
		border-radius: 999px;
		overflow: hidden;
		display: grid;
		place-items: center;
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0.08));
		border: 2px solid rgba(255, 255, 255, 0.16);
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.26);
	}

	.slide-preview-avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.slide-preview-avatar span {
		font-family: var(--carousel-font-heading);
		font-size: 1.5rem;
		font-weight: 800;
		letter-spacing: 0.05em;
		color: #fff;
	}

	.slide-preview-account-copy {
		display: grid;
		gap: 0.18rem;
		min-width: 0;
	}

	.slide-preview-account-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
	}

	.slide-preview-account-row strong {
		font-family: var(--carousel-font-body);
		font-size: clamp(
			calc(1.4rem * var(--carousel-quote-font-scale, 1)),
			calc(2.6vw * var(--carousel-quote-font-scale, 1)),
			calc(2rem * var(--carousel-quote-font-scale, 1))
		);
		font-weight: 800;
		line-height: 1;
		color: #fff;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.slide-preview-account-copy p {
		margin: 0;
		font-size: calc(0.92rem * var(--carousel-quote-font-scale, 1));
		font-weight: 600;
		line-height: 1.35;
		color: rgba(255, 255, 255, 0.46);
	}

	.slide-preview-verified {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.7rem;
		height: 1.7rem;
		flex: none;
	}

	.slide-preview-verified img {
		width: 100%;
		height: 100%;
		display: block;
		object-fit: contain;
	}

	.slide-preview-quote-copy {
		display: grid;
		align-content: center;
		justify-items: start;
		padding: 0 0.2rem 0.9rem;
		text-align: left;
	}

	.slide-preview-quote-copy h3 {
		margin: 0;
		max-width: 11ch;
		font-family: var(--carousel-font-body);
		font-size: clamp(
			calc(2rem * var(--carousel-quote-font-scale, 1)),
			calc(4.2vw * var(--carousel-quote-font-scale, 1)),
			calc(3.35rem * var(--carousel-quote-font-scale, 1))
		);
		font-weight: 700;
		line-height: 1.12;
		white-space: break-spaces;
		overflow-wrap: anywhere;
		text-wrap: balance;
		color: #fff;
	}

	.slide-preview-main {
		display: grid;
		gap: 0.8rem;
		align-content: center;
		margin: auto 0;
	}

	h3,
	.slide-preview-body,
	.slide-preview-cta,
	.slide-preview-cta-note {
		white-space: break-spaces;
		overflow-wrap: anywhere;
		text-wrap: wrap;
	}

	h3 {
		margin: 0;
		font-family: var(--carousel-font-heading);
		font-size: clamp(1.45rem, 2.7vw, 2.4rem);
		line-height: 1.02;
	}

	.slide-preview-body {
		margin: 0;
		font-size: 0.94rem;
		line-height: 1.55;
		max-width: 26ch;
		color: rgba(255, 255, 255, 0.92);
	}

	.slide-preview-cta,
	.slide-preview-cta-note {
		margin: 0;
	}

	.slide-preview-cta {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.8rem 1rem;
		border-radius: 999px;
		background: #fff;
		color: #0f172a;
		font-family: var(--carousel-font-body);
		font-weight: 800;
		font-size: 0.94rem;
		max-width: fit-content;
	}

	.slide-preview-cta-note {
		font-size: 0.84rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.88);
	}

	.slide-preview--content h3 {
		font-size: clamp(1.3rem, 2.3vw, 2rem);
	}

	.slide-preview--quote .slide-preview-quote-copy h3 {
		font-size: clamp(
			calc(2rem * var(--carousel-quote-font-scale, 1)),
			calc(4.2vw * var(--carousel-quote-font-scale, 1)),
			calc(3.35rem * var(--carousel-quote-font-scale, 1))
		);
	}

	.slide-preview--cta .slide-preview-main {
		align-content: end;
	}

	.slide-preview--cta h3 {
		max-width: 14ch;
	}
</style>
