import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';

export const DELETE: RequestHandler = async ({ params }) => {
	if (!supabase) return json({ error: 'Supabase not configured' }, { status: 500 });

	try {
		const { data, error } = await supabase
			.from('carousel_quote_identities')
			.delete()
			.eq('id', params.id)
			.select('id');

		if (error) {
			return json({ error: error.message }, { status: 500 });
		}

		if (!data || data.length === 0) {
			return json({ error: 'Quote identity not found' }, { status: 404 });
		}

		return new Response(null, { status: 204 });
	} catch (error) {
		return json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
	}
};
