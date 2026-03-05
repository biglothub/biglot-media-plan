import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';

export const GET: RequestHandler = async () => {
	if (!supabase) return json({ error: 'Supabase not configured' }, { status: 500 });

	const today = new Date().toISOString().slice(0, 10);
	const yesterday = new Date(Date.now() - 86400000).toISOString();

	// New ideas (last 24h)
	const { data: newIdeas } = await supabase
		.from('idea_backlog')
		.select('*')
		.gte('created_at', yesterday)
		.order('created_at', { ascending: false });

	// Shoots today
	const { data: shootsToday } = await supabase
		.from('production_calendar')
		.select('*')
		.eq('shoot_date', today);

	// In progress
	const { data: inProgress } = await supabase
		.from('production_calendar')
		.select('*')
		.neq('status', 'planned')
		.neq('status', 'published')
		.order('shoot_date');

	// Attach ideas to schedule rows
	const allSchedule = [...(shootsToday ?? []), ...(inProgress ?? [])];
	const backlogIds = [...new Set(allSchedule.map((r) => r.backlog_id as string))];
	let ideasMap = new Map<string, Record<string, unknown>>();

	if (backlogIds.length > 0) {
		const { data: ideas } = await supabase.from('idea_backlog').select('*').in('id', backlogIds);
		ideasMap = new Map((ideas ?? []).map((i) => [i.id as string, i]));
	}

	const withIdea = (rows: Record<string, unknown>[]) =>
		rows.map((r) => ({ ...r, idea: ideasMap.get(r.backlog_id as string) ?? null }));

	return json({
		date: today,
		new_ideas_count: newIdeas?.length ?? 0,
		new_ideas: newIdeas ?? [],
		shoots_today: withIdea(shootsToday ?? []),
		in_progress: withIdea(inProgress ?? [])
	});
};
