import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';

function normalizeText(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

function normalizeTextOrNull(value: unknown): string | null {
	const normalized = normalizeText(value);
	return normalized ? normalized : null;
}

function normalizeAccountHandle(value: unknown): string | null {
	const normalized = normalizeText(value).replace(/^@+/, '').trim();
	return normalized ? normalized : null;
}

export const GET: RequestHandler = async () => {
	if (!supabase) return json({ error: 'Supabase not configured' }, { status: 500 });

	try {
		const { data, error } = await supabase
			.from('carousel_quote_identities')
			.select('*')
			.order('updated_at', { ascending: false });

		if (error) {
			return json({ error: error.message }, { status: 500 });
		}

		return json({ identities: data ?? [] });
	} catch (error) {
		return json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	if (!supabase) return json({ error: 'Supabase not configured' }, { status: 500 });

	try {
		const body = await request.json();
		const accountDisplayName = normalizeText(body.account_display_name);
		if (!accountDisplayName) {
			return json({ error: 'account_display_name is required' }, { status: 400 });
		}

		const name = normalizeText(body.name) || accountDisplayName;
		const now = new Date().toISOString();
		const { data, error } = await supabase
			.from('carousel_quote_identities')
			.insert({
				name,
				account_display_name: accountDisplayName,
				account_handle: normalizeAccountHandle(body.account_handle),
				account_avatar_url: normalizeTextOrNull(body.account_avatar_url),
				account_avatar_storage_path: normalizeTextOrNull(body.account_avatar_storage_path),
				account_is_verified: Boolean(body.account_is_verified),
				updated_at: now
			})
			.select('*')
			.single();

		if (error) {
			return json({ error: error.message }, { status: 500 });
		}

		return json({ identity: data }, { status: 201 });
	} catch (error) {
		return json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
	}
};
