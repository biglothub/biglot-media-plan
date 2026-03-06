import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { chat } from '$lib/server/minimax';
import { CREATOR_SYSTEM_PROMPT, CONTENT_PLAN_FORMAT } from '$lib/server/skills/creator';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { title, description, platform, content_category, context } = body;

	if (!title) {
		return json({ error: 'ต้องมี title ก่อน' }, { status: 400 });
	}

	const userPrompt = `วางแผน content นี้อย่างละเอียด:

📌 Title: ${title}
📝 Description: ${description || 'ไม่มี'}
📱 Platform: ${platform || 'ไม่ระบุ'}
🏷 Category: ${content_category || 'ไม่ระบุ'}${context ? `\n💡 Context เพิ่มเติม: ${context}` : ''}

${CONTENT_PLAN_FORMAT}`;

	try {
		const plan = await chat(
			[
				{ role: 'system', content: CREATOR_SYSTEM_PROMPT },
				{ role: 'user', content: userPrompt }
			],
			{ temperature: 0.75, max_tokens: 2000, timeout_ms: 300_000 }
		);

		return json({ plan });
	} catch (e) {
		return json({ error: `AI error: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 });
	}
};
