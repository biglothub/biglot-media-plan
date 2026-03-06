import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';

export const GET: RequestHandler = async ({ params }) => {
	if (!supabase) return json({ error: 'Supabase not configured' }, { status: 500 });

	const { data, error } = await supabase.from('idea_backlog').select('*').eq('id', params.id).single();
	if (error) return json({ error: 'Idea not found' }, { status: 404 });
	return json(data);
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	if (!supabase) return json({ error: 'Supabase not configured' }, { status: 500 });

	const body = await request.json();
	const updates: Record<string, unknown> = {};
	for (const key of ['title', 'description', 'notes', 'status', 'content_category']) {
		if (body[key] !== undefined) updates[key] = body[key];
	}

	if (Object.keys(updates).length === 0) {
		return json({ error: 'No fields to update' }, { status: 400 });
	}

	const { data, error } = await supabase.from('idea_backlog').update(updates).eq('id', params.id).select().single();
	if (error) return json({ error: 'Idea not found' }, { status: 404 });
	return json(data);
};

export const DELETE: RequestHandler = async ({ params }) => {
	if (!supabase) return json({ error: 'Supabase not configured' }, { status: 500 });

	await supabase.from('idea_backlog').delete().eq('id', params.id);
	return new Response(null, { status: 204 });
};
