/**
 * News Fetcher — ดึงข่าวทอง/เศรษฐกิจสำหรับ Live Script
 *
 * Auto-fetches gold price and economic calendar data.
 * Results are cached in-memory for 15 minutes to avoid rate limits.
 */

interface CacheEntry {
	data: string;
	timestamp: number;
}

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const FETCH_TIMEOUT_MS = 5000;

let goldCache: CacheEntry | null = null;
let econCache: CacheEntry | null = null;

function isCacheValid(cache: CacheEntry | null): cache is CacheEntry {
	return cache !== null && Date.now() - cache.timestamp < CACHE_TTL_MS;
}

/**
 * Fetch current gold (XAUUSD) price and daily change.
 * Returns a plain-text summary suitable for AI prompt injection.
 */
export async function fetchGoldNews(): Promise<string> {
	if (isCacheValid(goldCache)) return goldCache.data;

	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

		const res = await fetch('https://api.gold-api.com/price/XAU', {
			signal: controller.signal,
		});
		clearTimeout(timeout);

		if (!res.ok) throw new Error(`Gold API HTTP ${res.status}`);

		const json = await res.json();
		const price = json.price ?? json.bid ?? 'N/A';
		const change = json.ch ?? json.change ?? 'N/A';
		const changePercent = json.chp ?? json.change_percent ?? 'N/A';
		const high = json.high_price ?? json.high ?? 'N/A';
		const low = json.low_price ?? json.low ?? 'N/A';
		const timestamp = json.timestamp
			? new Date(json.timestamp * 1000).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })
			: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

		const summary = [
			`ราคาทอง XAUUSD ล่าสุด (${timestamp}):`,
			`- ราคาปัจจุบัน: $${price}`,
			`- เปลี่ยนแปลง: ${change} (${changePercent}%)`,
			`- สูงสุดวันนี้: $${high}`,
			`- ต่ำสุดวันนี้: $${low}`,
		].join('\n');

		goldCache = { data: summary, timestamp: Date.now() };
		return summary;
	} catch {
		return 'ไม่สามารถดึงข้อมูลราคาทองได้ — ให้ Host เช็คราคาจาก TradingView ก่อน Live';
	}
}

interface ForexFactoryEvent {
	title: string;
	country: string;
	date: string;
	impact: string;
	forecast?: string;
	previous?: string;
}

/**
 * Fetch this week's high-impact USD economic events from Forex Factory.
 * Returns a plain-text summary suitable for AI prompt injection.
 */
export async function fetchEconomicCalendar(): Promise<string> {
	if (isCacheValid(econCache)) return econCache.data;

	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

		const res = await fetch('https://nfs.faireconomy.media/ff_calendar_thisweek.json', {
			signal: controller.signal,
		});
		clearTimeout(timeout);

		if (!res.ok) throw new Error(`Forex Factory HTTP ${res.status}`);

		const events: ForexFactoryEvent[] = await res.json();

		// Filter high-impact USD events (most relevant to XAUUSD)
		const highImpact = events.filter(
			(e) => e.impact === 'High' && e.country === 'USD',
		);

		if (highImpact.length === 0) {
			const summary = 'ปฏิทินเศรษฐกิจ: ไม่มีข่าว High Impact USD สัปดาห์นี้';
			econCache = { data: summary, timestamp: Date.now() };
			return summary;
		}

		const lines = highImpact.map((e) => {
			const parts = [`- ${e.date}: ${e.title}`];
			if (e.forecast) parts.push(`Forecast: ${e.forecast}`);
			if (e.previous) parts.push(`Previous: ${e.previous}`);
			return parts.join(' | ');
		});

		const summary = `ข่าว High Impact USD สัปดาห์นี้:\n${lines.join('\n')}`;
		econCache = { data: summary, timestamp: Date.now() };
		return summary;
	} catch {
		return 'ไม่สามารถดึงปฏิทินเศรษฐกิจได้ — ให้ Host เช็คจาก Forex Factory ก่อน Live';
	}
}
