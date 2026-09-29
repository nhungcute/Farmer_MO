-- MO Farm MVP reference schema. The prototype runtime uses FarmStore with an optional
-- JSON state file; this schema is the migration contract for the Prisma/PostgreSQL adapter.
CREATE TABLE IF NOT EXISTS content_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
INSERT INTO content_meta(key, value) VALUES ('schemaVersion', '1'), ('contentVersion', 'mvp-1') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
CREATE TABLE IF NOT EXISTS character (id UUID PRIMARY KEY, lookup_name TEXT UNIQUE NOT NULL, display_name TEXT NOT NULL, level INTEGER NOT NULL, xp INTEGER NOT NULL, coins INTEGER NOT NULL, diamonds INTEGER NOT NULL, created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL);
CREATE TABLE IF NOT EXISTS farm (id UUID PRIMARY KEY, character_id UUID UNIQUE NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL, order_cursor INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL);
CREATE TABLE IF NOT EXISTS idempotency_record (character_id UUID NOT NULL, action_type TEXT NOT NULL, key TEXT NOT NULL, request_hash TEXT NOT NULL, response JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL, PRIMARY KEY(character_id, action_type, key));
