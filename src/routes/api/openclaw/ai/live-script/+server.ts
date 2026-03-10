import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { chat } from '$lib/server/minimax';
import { LIVE_DIRECTOR_SYSTEM_PROMPT, LIVE_SCRIPT_FORMAT } from '$lib/server/skills/live-director';
import { fetchGoldNews, fetchEconomicCalendar } from '$lib/server/news-fetcher';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { title, description, scheduled_date, gold_news, economic_news } = body;

	if (!title) {
		return json({ error: 'ต้องมีหัวข้อ Live ก่อน' }, { status: 400 });
	}

	// Auto-fetch news if client doesn't provide it
	const [goldContext, econContext] = await Promise.all([
		gold_news ? Promise.resolve(gold_news as string) : fetchGoldNews(),
		economic_news ? Promise.resolve(economic_news as string) : fetchEconomicCalendar(),
	]);

	const userPrompt = `วางแผน YouTube Live 1 ชั่วโมง:

📌 หัวข้อ: ${title}
📝 รายละเอียด: ${description || 'ไม่มี'}
📅 วันที่: ${scheduled_date || 'ไม่ระบุ'}

📰 ข่าวทอง/เศรษฐกิจล่าสุด:
${goldContext}

${econContext}

${LIVE_SCRIPT_FORMAT}`;

	try {
		const script = await chat(
			[
				{ role: 'system', content: LIVE_DIRECTOR_SYSTEM_PROMPT },
				{ role: 'user', content: userPrompt },
			],
			{ temperature: 0.7, max_tokens: 6000, timeout_ms: 300_000 },
		);

		return json({ script });
	} catch (e) {
		return json(
			{ error: `AI error: ${e instanceof Error ? e.message : String(e)}` },
			{ status: 500 },
		);
	}
};
