import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';

export const PATCH: RequestHandler = async ({ params, request }) => {
	if (!supabase) return json({ error: 'Supabase not configured' }, { status: 500 });

	const body = await request.json();
	if (!body.status) return json({ error: 'status is required' }, { status: 400 });

	const valid = ['planned', 'scripting', 'shooting', 'editing', 'published'];
	if (!valid.includes(body.status)) {
		return json({ error: `status must be one of: ${valid.join(', ')}` }, { status: 400 });
	}

	const { data, error } = await supabase
		.from('production_calendar')
		.update({ status: body.status })
		.eq('id', params.id)
		.select()
		.single();

	if (error) return json({ error: 'Schedule not found' }, { status: 404 });
	return json(data);
};
