#!/usr/bin/env node

/**
 * PostgreSQL backup/restore drill for D02.
 *
 * The script intentionally operates on two explicitly supplied databases. It
 * runs the idempotent migration against the existing source and fresh target,
 * dumps the source, restores the dump into the target, reruns migration, and
 * compares deterministic row fingerprints for every runtime table.
 *
 * Required environment:
 *   BACKUP_SOURCE_DATABASE_URL   migrated database containing demo data
 *   BACKUP_TARGET_DATABASE_URL   disposable database to restore into
 * Optional:
 *   BACKUP_DUMP_PATH             custom-format dump path
 *   BACKUP_SKIP_MIGRATION=1      only for a pre-migrated test harness
 *   BACKUP_KEEP_DUMP=1           retain dump after a successful drill
 */
import { execFile } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { promisify } from "node:util";
import crypto from "node:crypto";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const run = promisify(execFile);
const { Pool } = pg;
const env = process.env;
const sourceUrl = env.BACKUP_SOURCE_DATABASE_URL ?? env.DATABASE_URL;
const targetUrl = env.BACKUP_TARGET_DATABASE_URL;
const dumpPath = path.resolve(env.BACKUP_DUMP_PATH ?? path.join("artifacts", "d02", `mo-farm-${Date.now()}.dump`));
const skipMigration = env.BACKUP_SKIP_MIGRATION === "1";
const keepDump = env.BACKUP_KEEP_DUMP === "1";
const useDocker = env.BACKUP_USE_DOCKER === "1";
const dockerImage = env.BACKUP_DOCKER_IMAGE ?? "postgres:16.4-alpine";

if (!sourceUrl || !targetUrl) throw new Error("BACKUP_SOURCE_DATABASE_URL (or DATABASE_URL) and BACKUP_TARGET_DATABASE_URL are required");

const TABLES = ["content_meta", "schema_migration", "character", "farm", "farm_object", "plot", "crop_instance", "animal", "inventory_item", "warehouse", "farm_order", "order_line", "quest_progress", "game_session", "idempotency_record"];

function parseDatabaseUrl(value) {
  const parsed = new URL(value);
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") throw new Error(`Unsupported PostgreSQL URL protocol: ${parsed.protocol}`);
  return {
    host: parsed.hostname,
    port: parsed.port || "5432",
    username: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: decodeURIComponent(parsed.pathname.replace(/^\//u, "")),
    sslmode: parsed.searchParams.get("sslmode") ?? undefined,
  };
}

const sourceIdentity = parseDatabaseUrl(sourceUrl);
const targetIdentity = parseDatabaseUrl(targetUrl);
if (sourceIdentity.port === targetIdentity.port && sourceIdentity.database === targetIdentity.database && sourceIdentity.username === targetIdentity.username && ["127.0.0.1", "localhost", "::1"].includes(sourceIdentity.host) && ["127.0.0.1", "localhost", "::1"].includes(targetIdentity.host)) {
  throw new Error("Source and target database URLs resolve to the same local database; use a separate disposable target");
}

function connectionArgs(value, { docker = false } = {}) {
  const parsed = parseDatabaseUrl(value);
  const host = docker && ["127.0.0.1", "localhost", "::1"].includes(parsed.host) ? "host.docker.internal" : parsed.host;
  const args = ["--host", host, "--port", parsed.port, "--username", parsed.username, "--dbname", parsed.database];
  return { args, env: { PGPASSWORD: parsed.password, ...(parsed.sslmode ? { PGSSLMODE: parsed.sslmode } : {}) } };
}

async function runCommand(binary, args, options = {}) {
  try {
    return await run(binary, args, { windowsHide: true, maxBuffer: 4 * 1024 * 1024, ...options });
  } catch (error) {
    const detail = String(error.stderr || error.stdout || error.message).trim();
    throw new Error(`${binary} failed: ${detail}`, { cause: error });
  }
}

async function runMigration(database) {
  await runCommand(process.execPath, ["apps/api/src/migrate.mjs"], { env: { ...env, PERSISTENCE_DRIVER: "postgres", DATABASE_URL: database } });
}

async function dump(source) {
  const connection = connectionArgs(source, { docker: useDocker });
  await mkdir(path.dirname(dumpPath), { recursive: true });
  if (useDocker) {
    await runCommand("docker", ["run", "--rm", "--add-host", "host.docker.internal:host-gateway", "--mount", `type=bind,source=${path.dirname(dumpPath)},target=/out`, "--env", "PGPASSWORD", dockerImage, "pg_dump", "--format=custom", "--no-owner", "--no-privileges", "--file", `/out/${path.basename(dumpPath)}`, ...connection.args], { env: { ...env, ...connection.env } });
    return;
  }
  await runCommand("pg_dump", ["--format=custom", "--no-owner", "--no-privileges", "--file", dumpPath, ...connection.args], { env: { ...env, ...connection.env } });
}

async function restore(target) {
  const connection = connectionArgs(target, { docker: useDocker });
  if (useDocker) {
    await runCommand("docker", ["run", "--rm", "--add-host", "host.docker.internal:host-gateway", "--mount", `type=bind,source=${path.dirname(dumpPath)},target=/out`, "--env", "PGPASSWORD", dockerImage, "pg_restore", "--clean", "--if-exists", "--exit-on-error", "--no-owner", "--no-privileges", "--dbname", connection.args.at(-1), `/out/${path.basename(dumpPath)}`, "--host", connection.args[1], "--port", connection.args[3], "--username", connection.args[5]], { env: { ...env, ...connection.env } });
    return;
  }
  await runCommand("pg_restore", ["--clean", "--if-exists", "--exit-on-error", "--no-owner", "--no-privileges", "--dbname", connection.args.at(-1), dumpPath, "--host", connection.args[1], "--port", connection.args[3], "--username", connection.args[5]], { env: { ...env, ...connection.env } });
}

function stable(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
}

async function fingerprint(database) {
  const pool = new Pool({ connectionString: database, max: 2 });
  try {
    const tables = {};
    for (const table of TABLES) {
      // The table list is a fixed internal allowlist, so interpolation cannot
      // be influenced by runtime input. Sorting after retrieval makes the
      // fingerprint independent of PostgreSQL's physical row order.
      const result = await pool.query(`SELECT * FROM ${table}`);
      const rows = result.rows.map((row) => stable(row)).sort();
      tables[table] = { count: rows.length, sha256: crypto.createHash("sha256").update(rows.join("\n")).digest("hex") };
    }
    return tables;
  } finally {
    await pool.end();
  }
}

function compare(source, target) {
  const differences = [];
  for (const table of TABLES) {
    if (source[table].count !== target[table].count || source[table].sha256 !== target[table].sha256) differences.push({ table, source: source[table], target: target[table] });
  }
  return differences;
}

async function main() {
  const startedAt = new Date().toISOString();
  if (!skipMigration) {
    await runMigration(sourceUrl);
    await runMigration(targetUrl);
  }
  const sourceFingerprintBefore = await fingerprint(sourceUrl);
  await dump(sourceUrl);
  await restore(targetUrl);
  if (!skipMigration) await runMigration(targetUrl);
  const targetFingerprint = await fingerprint(targetUrl);
  const differences = compare(sourceFingerprintBefore, targetFingerprint);
  if (differences.length) throw new Error(`Backup/restore fingerprint mismatch: ${JSON.stringify(differences)}`);
  const result = {
    task: "D02",
    status: "PASS",
    startedAt,
    finishedAt: new Date().toISOString(),
    source: "existing PostgreSQL database",
    target: "disposable PostgreSQL database",
    dumpPath,
    migration: skipMigration ? "skipped by explicit BACKUP_SKIP_MIGRATION=1" : "executed on source before dump, target before restore, and target after restore",
    tablesCompared: TABLES,
    fingerprint: sourceFingerprintBefore,
    verified: { aggregateRows: true, sessions: true, idempotencyRecords: true, runtimeTables: true, migrationIdempotent: !skipMigration },
    limits: "This is a correctness drill, not a production RPO/RTO or throughput claim. The dump path and target must be treated as disposable test data.",
  };
  console.log(JSON.stringify(result, null, 2));
  if (!keepDump) await rm(dumpPath, { force: true });
}

main().catch((error) => {
  console.error(JSON.stringify({ task: "D02", status: "FAIL", error: error.message, stack: error.stack }, null, 2));
  process.exitCode = 1;
});
