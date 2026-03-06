import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { chat } from '$lib/server/minimax';
import { CREATOR_SYSTEM_PROMPT } from '$lib/server/skills/creator';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { title, description, platform } = body;

	if (!title) {
		return json({ error: 'ต้องมี title' }, { status: 400 });
	}

	const userPrompt = `จาก content นี้:
Title: ${title}
Description: ${description || 'ไม่มี'}
Platform: ${platform || 'ไม่ระบุ'}

จัดหมวด content_category ที่เหมาะสมที่สุด โดยใช้ framework 3H ของ BigLot IB XAUUSD:
- hero: Comedy/Viral/Skit/Meme/Pain Point — ดึง Stranger ให้ Follow
- help: Education/Tutorial/How-to/สอนเทรด — สร้าง Authority
- hub: Community/Market Outlook/Trade Review/Retention — รักษา Active Trader

ตอบเป็น JSON object เท่านั้น ไม่มี markdown wrapper:
{"content_category": "hero|hub|help", "reason": "เหตุผลสั้นๆ 1 ประโยค"}`;

	try {
		const raw = await chat(
			[
				{ role: 'system', content: CREATOR_SYSTEM_PROMPT + '\n\nตอบเป็น JSON เท่านั้น ไม่มี markdown wrapper' },
				{ role: 'user', content: userPrompt }
			],
			{ temperature: 0.3, max_tokens: 200 }
		);

		const cleaned = raw.replace(/```(?:json)?\n?/g, '').trim();
		const result = JSON.parse(cleaned);
		return json(result);
	} catch (e) {
		return json({ error: `AI error: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 });
	}
};
