import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const migrationsDir = path.resolve('supabase/migrations');
const journalPath = path.join(migrationsDir, 'meta', '_journal.json');
const filePattern = /^(\d{4})_([a-z0-9_]+)\.sql$/;

function fail(message) {
	console.error(`db:check failed: ${message}`);
	process.exit(1);
}

const files = readdirSync(migrationsDir)
	.filter((name) => name.endsWith('.sql'))
	.sort((a, b) => a.localeCompare(b));

if (files.length === 0) {
	fail(`no .sql files found in ${migrationsDir}`);
}

const seenIds = new Set();
for (const file of files) {
	const match = file.match(filePattern);
	if (!match) {
		fail(`invalid migration name "${file}" (expected 0000_name.sql format)`);
	}

	const id = match[1];
	if (seenIds.has(id)) {
		fail(`duplicate migration prefix "${id}"`);
	}
	seenIds.add(id);

	const fullPath = path.join(migrationsDir, file);
	if (!statSync(fullPath).isFile()) {
		fail(`migration is not a file: ${file}`);
	}
	if (!readFileSync(fullPath, 'utf8').trim()) {
		fail(`migration file is empty: ${file}`);
	}
}

try {
	const journalRaw = readFileSync(journalPath, 'utf8');
	const journal = JSON.parse(journalRaw);
	const entryTags = new Set((journal.entries ?? []).map((entry) => entry.tag));
	const missingInJournal = files
		.map((name) => name.replace(/\.sql$/, ''))
		.filter((tag) => !entryTags.has(tag));

	if (missingInJournal.length > 0) {
		console.warn(
			`db:check warning: ${missingInJournal.length} migration(s) are not listed in meta/_journal.json: ${missingInJournal.join(', ')}`
		);
	}
} catch {
	console.warn('db:check warning: unable to read meta/_journal.json (skipped journal consistency check)');
}

console.log(`db:check OK (${files.length} migration files)`);
