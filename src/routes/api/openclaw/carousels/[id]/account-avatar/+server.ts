import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';
import { deleteCarouselStoredAsset, uploadCarouselAccountAvatar } from '$lib/server/pexels';

const MAX_ACCOUNT_AVATAR_BYTES = 5 * 1024 * 1024;
const SUPPORTED_ACCOUNT_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

type CarouselProjectAvatarRow = {
	id: string;
	account_avatar_url: string | null;
	account_avatar_storage_path: string | null;
};

function normalizeStoragePath(value: unknown): string | null {
	return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function isSupportedAvatarType(type: string): boolean {
	return SUPPORTED_ACCOUNT_AVATAR_TYPES.has(type);
}

async function fetchProjectAvatar(projectId: string): Promise<CarouselProjectAvatarRow | null> {
	if (!supabase) {
		throw new Error('Supabase not configured');
	}

	const { data, error } = await supabase
		.from('carousel_projects')
		.select('id, account_avatar_url, account_avatar_storage_path')
		.eq('id', projectId)
		.single();

	if (error) {
		if (error.code === 'PGRST116') return null;
		throw new Error(error.message);
	}

	return data as CarouselProjectAvatarRow;
}

export const POST: RequestHandler = async ({ params, request }) => {
	if (!supabase) return json({ error: 'Supabase not configured' }, { status: 500 });

	try {
		const project = await fetchProjectAvatar(params.id);
		if (!project) {
			return json({ error: 'Carousel project not found' }, { status: 404 });
		}

		let formData: FormData;
		try {
			formData = await request.formData();
		} catch {
			return json({ error: 'multipart/form-data body is required' }, { status: 400 });
		}
		const file = formData.get('file');
		if (!(file instanceof File)) {
			return json({ error: 'file is required' }, { status: 400 });
		}
		if (!isSupportedAvatarType(file.type)) {
			return json({ error: 'รองรับเฉพาะไฟล์ภาพ JPG, PNG หรือ WEBP' }, { status: 400 });
		}
		if (file.size <= 0) {
			return json({ error: 'ไฟล์ภาพว่างเปล่า' }, { status: 400 });
		}
		if (file.size > MAX_ACCOUNT_AVATAR_BYTES) {
			return json({ error: 'ไฟล์ภาพใหญ่เกิน 5MB' }, { status: 400 });
		}

		const previousStoragePath = normalizeStoragePath(project.account_avatar_storage_path);
		const stored = await uploadCarouselAccountAvatar(file, params.id);

		const { data, error } = await supabase
			.from('carousel_projects')
			.update({
				account_avatar_url: stored.publicUrl,
				account_avatar_storage_path: stored.path,
				updated_at: new Date().toISOString()
			})
			.eq('id', params.id)
			.select('id, account_avatar_url, account_avatar_storage_path')
			.single();

		if (error) {
			try {
				await deleteCarouselStoredAsset(stored.path);
			} catch {
				// Best effort cleanup only.
			}
			return json({ error: error.message }, { status: 500 });
		}

		let cleanupWarning: string | null = null;
		if (previousStoragePath && previousStoragePath !== stored.path) {
			try {
				await deleteCarouselStoredAsset(previousStoragePath);
			} catch (cleanupError) {
				cleanupWarning = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
			}
		}

		return json({
			project: data,
			account_avatar_url: data.account_avatar_url,
			account_avatar_storage_path: data.account_avatar_storage_path,
			...(cleanupWarning ? { cleanup_warning: cleanupWarning } : {})
		});
	} catch (error) {
		return json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	if (!supabase) return json({ error: 'Supabase not configured' }, { status: 500 });

	try {
		const project = await fetchProjectAvatar(params.id);
		if (!project) {
			return json({ error: 'Carousel project not found' }, { status: 404 });
		}

		let cleanupWarning: string | null = null;
		const storagePath = normalizeStoragePath(project.account_avatar_storage_path);

		const { data, error } = await supabase
			.from('carousel_projects')
			.update({
				account_avatar_url: null,
				account_avatar_storage_path: null,
				updated_at: new Date().toISOString()
			})
			.eq('id', params.id)
			.select('id, account_avatar_url, account_avatar_storage_path')
			.single();

		if (error) {
			return json({ error: error.message }, { status: 500 });
		}

		if (storagePath) {
			try {
				await deleteCarouselStoredAsset(storagePath);
			} catch (cleanupError) {
				cleanupWarning = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
			}
		}

		return json({
			project: data,
			account_avatar_url: data.account_avatar_url,
			account_avatar_storage_path: data.account_avatar_storage_path,
			...(cleanupWarning ? { cleanup_warning: cleanupWarning } : {})
		});
	} catch (error) {
		return json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
	}
};
