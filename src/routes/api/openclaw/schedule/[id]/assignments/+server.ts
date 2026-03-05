import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';
import type { TeamMember } from '$lib/team';
import { TEAM_MEMBERS, isTeamMember } from '$lib/team';

export const GET: RequestHandler = async ({ params }) => {
	if (!supabase) return json({ error: 'Supabase not configured' }, { status: 500 });

	const { data, error } = await supabase
		.from('calendar_assignments')
		.select('*')
		.eq('calendar_id', params.id)
		.order('created_at');

	if (error) return json({ error: error.message }, { status: 500 });
	return json(data);
};

export const PUT: RequestHandler = async ({ params, request }) => {
	if (!supabase) return json({ error: 'Supabase not configured' }, { status: 500 });

	// body: [{ member_name, role_detail }]
	const body = await request.json();
	const assignments: { member_name: string; role_detail: string }[] = body.assignments ?? [];

	// Validate member names
	const invalid = assignments.filter((a) => !isTeamMember(a.member_name));
	if (invalid.length > 0) {
		return json({ error: `Invalid member names: ${invalid.map((a) => a.member_name).join(', ')}. Valid: ${TEAM_MEMBERS.join(', ')}` }, { status: 400 });
	}

	const validAssignments = assignments as { member_name: TeamMember; role_detail: string }[];

	// Replace all assignments
	await supabase.from('calendar_assignments').delete().eq('calendar_id', params.id);

	if (validAssignments.length > 0) {
		const rows = validAssignments.map((a) => ({
			calendar_id: params.id,
			member_name: a.member_name,
			role_detail: a.role_detail ?? ''
		}));
		const { error } = await supabase.from('calendar_assignments').insert(rows);
		if (error) return json({ error: error.message }, { status: 500 });
	}

	const { data } = await supabase.from('calendar_assignments').select('*').eq('calendar_id', params.id);
	return json(data);
};
