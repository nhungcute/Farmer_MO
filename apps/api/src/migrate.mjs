import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { CONTENT_VERSION } from '../../../packages/content/index.mjs';
import { resolvePersistenceDriver } from './persistence/config.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationDirectory = path.resolve(process.env.MIGRATIONS_DIR || path.join(root, 'sql'));

export async function applyMigrations({ databaseUrl = process.env.DATABASE_URL, directory = migrationDirectory, driver = process.env.PERSISTENCE_DRIVER } = {}) {
  const persistenceDriver = resolvePersistenceDriver(driver);
  // File mode intentionally keeps the JSON/memory adapter and does not make a
  // database connection merely because DATABASE_URL exists in a shared .env.
  if (persistenceDriver === 'file') return { mode: 'file', applied: [], contentVersion: CONTENT_VERSION };
  if (!databaseUrl) {
    const error = new Error('DATABASE_URL is required when PERSISTENCE_DRIVER=postgres');
    error.code = 'PERSISTENCE_UNAVAILABLE';
    throw error;
  }
  const files = (await fs.readdir(directory))
    .filter((file) => /^\d+_.+\.sql$/u.test(file))
    .sort((left, right) => left.localeCompare(right, 'en', { numeric: true }));
  if (files.length === 0) throw new Error(`No SQL migrations found in ${directory}`);

  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('mo_farm:migrations'))");
    for (const file of files) {
      // SQL files may be authored with a UTF-8 BOM on Windows; PostgreSQL
      // treats that marker as an unexpected token when sent through pg.
      const sql = (await fs.readFile(path.join(directory, file), 'utf8')).replace(/^\uFEFF/u, '');
      await client.query(sql);
    }
    await client.query('COMMIT');
    return { mode: 'postgres', applied: files, contentVersion: CONTENT_VERSION };
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { /* preserve migration error */ }
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  applyMigrations()
    .then((result) => console.log(JSON.stringify({ event: 'migration.applied', ...result })))
    .catch((error) => {
      console.error(JSON.stringify({ event: 'migration.failed', message: error.message }));
      process.exitCode = 1;
    });
}
