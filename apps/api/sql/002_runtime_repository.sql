-- MO Farm runtime persistence boundary.
-- This migration is additive and safe to run after 001_mvp_schema.sql.  The
-- prototype FarmStore remains usable; these tables are the production adapter
-- contract and deliberately contain no content-definition seed data.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migration (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO schema_migration(version, name)
VALUES (1, '001_mvp_schema'), (2, '002_runtime_repository')
ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
INSERT INTO content_meta(key, value)
VALUES ('schemaVersion', '2')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

ALTER TABLE character ADD COLUMN IF NOT EXISTS state_revision BIGINT NOT NULL DEFAULT 1;
ALTER TABLE character ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{"locale":"vi-VN"}'::jsonb;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'character_level_nonnegative') THEN
    ALTER TABLE character ADD CONSTRAINT character_level_nonnegative CHECK (level >= 1) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'character_wallet_nonnegative') THEN
    ALTER TABLE character ADD CONSTRAINT character_wallet_nonnegative CHECK (xp >= 0 AND coins >= 0 AND diamonds >= 0) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'character_revision_positive') THEN
    ALTER TABLE character ADD CONSTRAINT character_revision_positive CHECK (state_revision >= 1) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'farm_character_fk') THEN
    ALTER TABLE farm ADD CONSTRAINT farm_character_fk FOREIGN KEY (character_id) REFERENCES character(id) ON DELETE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'idempotency_record_character_fk') THEN
    ALTER TABLE idempotency_record ADD CONSTRAINT idempotency_record_character_fk FOREIGN KEY (character_id) REFERENCES character(id) ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS game_session (
  id UUID PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  character_id UUID NOT NULL REFERENCES character(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS game_session_character_idx ON game_session(character_id);
CREATE INDEX IF NOT EXISTS game_session_expires_idx ON game_session(expires_at);
CREATE INDEX IF NOT EXISTS game_session_active_idx ON game_session(token_hash) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS farm_object (
  id UUID PRIMARY KEY,
  farm_id UUID NOT NULL REFERENCES farm(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES character(id) ON DELETE CASCADE,
  definition_id TEXT NOT NULL,
  grid_x INTEGER NOT NULL,
  grid_y INTEGER NOT NULL,
  rotation INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CHECK (grid_x >= 0 AND grid_y >= 0),
  CHECK (rotation IN (0, 90, 180, 270)),
  CHECK (level >= 1)
);
CREATE INDEX IF NOT EXISTS farm_object_farm_idx ON farm_object(farm_id);
CREATE INDEX IF NOT EXISTS farm_object_character_idx ON farm_object(character_id);

CREATE TABLE IF NOT EXISTS plot (
  id UUID PRIMARY KEY,
  farm_id UUID NOT NULL REFERENCES farm(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES character(id) ON DELETE CASCADE,
  grid_x INTEGER NOT NULL,
  grid_y INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(character_id, grid_x, grid_y),
  CHECK (grid_x >= 0 AND grid_y >= 0)
);
CREATE INDEX IF NOT EXISTS plot_farm_idx ON plot(farm_id);

CREATE TABLE IF NOT EXISTS crop_instance (
  id UUID PRIMARY KEY,
  plot_id UUID NOT NULL UNIQUE REFERENCES plot(id) ON DELETE CASCADE,
  crop_id TEXT NOT NULL,
  planted_at TIMESTAMPTZ NOT NULL,
  ready_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CHECK (ready_at >= planted_at)
);
CREATE INDEX IF NOT EXISTS crop_instance_ready_idx ON crop_instance(ready_at);

CREATE TABLE IF NOT EXISTS animal (
  id UUID PRIMARY KEY,
  character_id UUID NOT NULL REFERENCES character(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES farm_object(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  state TEXT NOT NULL,
  fed_at TIMESTAMPTZ,
  product_ready_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS animal_one_per_building_idx ON animal(building_id);
CREATE INDEX IF NOT EXISTS animal_character_idx ON animal(character_id);
CREATE INDEX IF NOT EXISTS animal_ready_idx ON animal(product_ready_at) WHERE product_ready_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS inventory_item (
  character_id UUID NOT NULL REFERENCES character(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY(character_id, item_id),
  CHECK (quantity >= 0)
);

CREATE TABLE IF NOT EXISTS warehouse (
  character_id UUID PRIMARY KEY REFERENCES character(id) ON DELETE CASCADE,
  capacity INTEGER NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CHECK (capacity >= 0)
);

CREATE TABLE IF NOT EXISTS farm_order (
  id UUID PRIMARY KEY,
  character_id UUID NOT NULL REFERENCES character(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  status TEXT NOT NULL,
  reward_coins INTEGER NOT NULL,
  reward_xp INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  CHECK (status IN ('OPEN', 'COMPLETED')),
  CHECK (reward_coins >= 0 AND reward_xp >= 0)
);
CREATE INDEX IF NOT EXISTS farm_order_character_status_idx ON farm_order(character_id, status);

CREATE TABLE IF NOT EXISTS order_line (
  order_id UUID NOT NULL REFERENCES farm_order(id) ON DELETE CASCADE,
  line_no INTEGER NOT NULL,
  item_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  PRIMARY KEY(order_id, line_no),
  CHECK (line_no >= 0 AND quantity > 0)
);

CREATE TABLE IF NOT EXISTS quest_progress (
  character_id UUID NOT NULL REFERENCES character(id) ON DELETE CASCADE,
  quest_id TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  target INTEGER NOT NULL,
  completed_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY(character_id, quest_id),
  CHECK (progress >= 0 AND target > 0 AND progress <= target)
);

ALTER TABLE idempotency_record ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idempotency_record_created_idx ON idempotency_record(created_at);
CREATE INDEX IF NOT EXISTS idempotency_record_expiry_idx ON idempotency_record(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS farm_character_idx ON farm(character_id);
CREATE INDEX IF NOT EXISTS character_updated_idx ON character(updated_at);
