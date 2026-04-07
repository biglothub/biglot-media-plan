import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';
import { searchPexelsResources, hasPexelsConfig } from '$lib/server/pexels';

export const POST: RequestHandler = async ({ params, request }) => {
	if (!supabase) return json({ error: 'Supabase not configured' }, { status: 500 });

	try {
		const body = await request.json();
		const query = typeof body.query === 'string' ? body.query.trim() : '';
		const { data: slide, error: slideError } = await supabase
			.from('carousel_slides')
			.select('*')
			.eq('id', params.slideId)
			.eq('project_id', params.id)
			.single();

		if (slideError) {
			return json({ error: slideError.message }, { status: 404 });
		}

		const { data: project } = await supabase
			.from('carousel_projects')
			.select('content_mode')
			.eq('id', params.id)
			.maybeSingle();

		const contentMode = project?.content_mode === 'quote' ? 'quote' : 'standard';
		if (contentMode === 'quote' && slide.role !== 'cta') {
			return json({ slide, skipped: true });
		}

		if (!hasPexelsConfig) return json({ error: 'PEXELS_API_KEY is required' }, { status: 500 });
		if (!query) {
			return json({ error: 'query is required' }, { status: 400 });
		}

		const assets = await searchPexelsResources(query, 8);
		const { data, error } = await supabase
			.from('carousel_slides')
			.update({
				freepik_query: query,
				candidate_assets_json: assets,
				updated_at: new Date().toISOString()
			})
			.eq('id', params.slideId)
			.eq('project_id', params.id)
			.select('*')
			.single();

		if (error) {
			return json({ error: error.message }, { status: 500 });
		}

		return json({ slide: data });
	} catch (error) {
		return json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
	}
};
