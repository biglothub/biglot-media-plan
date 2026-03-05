import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;
const migrationsDir = path.resolve('supabase/migrations');
const filePattern = /^(\d{4})_[a-z0-9_]+\.sql$/;
const trackingTable = 'schema_migrations';

if (!databaseUrl) {
	console.error('db:migrate failed: DATABASE_URL is required');
	process.exit(1);
}

const migrationFiles = readdirSync(migrationsDir)
	.filter((name) => filePattern.test(name))
	.sort((a, b) => a.localeCompare(b));

if (migrationFiles.length === 0) {
	console.log('db:migrate: no migration files found');
	process.exit(0);
}

const sql = postgres(databaseUrl, {
	max: 1,
	prepare: false
});

function tagFromFile(file) {
	return file.replace(/\.sql$/, '');
}

try {
	await sql`
		CREATE TABLE IF NOT EXISTS public.${sql(trackingTable)} (
			version text PRIMARY KEY,
			applied_at timestamptz NOT NULL DEFAULT now()
		)
	`;

	const appliedRows = await sql`SELECT version FROM public.${sql(trackingTable)}`;
	let applied = new Set(appliedRows.map((row) => row.version));

	// Bootstrap from old Drizzle table to avoid re-running historical migrations.
	if (applied.size === 0) {
		const drizzleTableExists = await sql`
			SELECT EXISTS (
				SELECT 1
				FROM information_schema.tables
				WHERE table_schema = 'public'
					AND table_name = '__drizzle_migrations'
			) AS exists
		`;

		if (drizzleTableExists[0]?.exists) {
			const drizzleRows = await sql`SELECT COUNT(*)::int AS count FROM public.__drizzle_migrations`;
			const historicalCount = drizzleRows[0]?.count ?? 0;
			const baseline = migrationFiles.slice(0, Math.min(historicalCount, migrationFiles.length));
			if (baseline.length > 0) {
				const values = baseline.map((file) => ({ version: tagFromFile(file) }));
				await sql`INSERT INTO public.${sql(trackingTable)} ${sql(values)} ON CONFLICT (version) DO NOTHING`;
				console.log(`db:migrate: baseline from __drizzle_migrations (${baseline.length} files)`);
				applied = new Set(baseline.map((file) => tagFromFile(file)));
			}
		}
	}

	let appliedCount = 0;
	for (const file of migrationFiles) {
		const version = tagFromFile(file);
		if (applied.has(version)) continue;

		const filePath = path.join(migrationsDir, file);
		const migrationSql = readFileSync(filePath, 'utf8');

		await sql.begin(async (tx) => {
			await tx.unsafe(migrationSql);
			await tx`
				INSERT INTO public.${sql(trackingTable)} (version)
				VALUES (${version})
			`;
		});

		appliedCount += 1;
		console.log(`db:migrate: applied ${file}`);
	}

	if (appliedCount === 0) {
		console.log('db:migrate: database is up to date');
	} else {
		console.log(`db:migrate: done (${appliedCount} migration(s) applied)`);
	}
} catch (error) {
	const message = error instanceof Error ? error.message : String(error);
	console.error(`db:migrate failed: ${message}`);
	process.exitCode = 1;
} finally {
	await sql.end({ timeout: 5 });
}
