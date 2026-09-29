import { createHash, randomBytes, randomUUID } from "node:crypto";
import { normalizeName as normalizeCharacterName } from "../../../../packages/shared/index.mjs";
import * as content from "../../../../packages/content/index.mjs";

const CONTENT_VERSION = content.CONTENT_VERSION;
const FARM = content.FARM;
const CROPS = content.CROPS;
const CHICKEN = content.CHICKEN;
const ORDER_TEMPLATES = content.ORDER_TEMPLATES;
const QUESTS = content.QUESTS;
const LEVEL_UNLOCKS = content.LEVEL_UNLOCKS;
const STARTER_OBJECTS = content.STARTER_OBJECTS;
const STARTER_PLOTS = content.STARTER_PLOTS;
const STARTER_ORDERS = content.STARTER_ORDERS;

const iso = (value) => new Date(value).toISOString();
const clone = (value) => JSON.parse(JSON.stringify(value));
const hash = (value) => createHash("sha256").update(stableStringify(value)).digest("hex");
const stableStringify = (value) => {
  if (value === undefined) return "null";
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
};
const isRetryable = (error) => error?.code === "40001" || error?.code === "40P01";
const isUnique = (error) => error?.code === "23505";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * PostgreSQL persistence boundary. It intentionally accepts a node-postgres
 * compatible pool instead of importing `pg`, keeping the demo dependency-free
 * and making the adapter straightforward to exercise with a test double.
 */
export class PostgresFarmRepository {
  constructor({ pool, clock = () => new Date(), sessionTtlMs = 7 * 24 * 60 * 60 * 1000, idempotencyTtlMs = 24 * 60 * 60 * 1000, maxTransactionRetries = 3, uuid = randomUUID } = {}) {
    if (!pool || typeof pool.connect !== "function") throw new TypeError("PostgresFarmRepository requires a pg-compatible pool");
    this.pool = pool;
    this.clock = clock;
    this.sessionTtlMs = sessionTtlMs;
    this.idempotencyTtlMs = idempotencyTtlMs;
    this.maxTransactionRetries = Math.max(0, Math.min(8, maxTransactionRetries));
    this.uuid = uuid;
  }

  now() { return new Date(this.clock()); }

  async withTransaction(work, { retries = this.maxTransactionRetries, isolation = "SERIALIZABLE" } = {}) {
    if (!new Set(["SERIALIZABLE", "REPEATABLE READ", "READ COMMITTED"]).has(isolation)) throw new TypeError("Unsupported transaction isolation level");
    let attempt = 0;
    while (true) {
      const client = await this.pool.connect();
      try {
        await client.query("BEGIN");
        if (isolation) await client.query(`SET TRANSACTION ISOLATION LEVEL ${isolation}`);
        const result = await work(client);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        try { await client.query("ROLLBACK"); } catch { /* preserve original error */ }
        if (!isRetryable(error) || attempt >= retries) throw error;
        attempt += 1;
        await sleep(Math.min(100 * 2 ** (attempt - 1), 800));
      } finally {
        client.release();
      }
    }
  }

  async query(text, values = []) { return this.pool.query(text, values); }

  async health() {
    const result = await this.pool.query("SELECT 1 AS ok");
    return result.rows?.[0]?.ok === 1;
  }

  #token() { return randomBytes(32).toString("base64url"); }
  #tokenHash(token) { return createHash("sha256").update(token).digest("hex"); }
  #summary(row) {
    return {
      id: row.id,
      displayName: row.display_name ?? row.displayName,
      level: row.level,
      xp: row.xp,
      coins: row.coins,
      diamonds: row.diamonds,
    };
  }

  async #createSession(client, characterId, now) {
    const token = this.#token();
    await client.query(
      "INSERT INTO game_session(id, token_hash, character_id, expires_at, created_at, last_seen_at) VALUES($1, $2, $3, $4, $5, $5)",
      [this.uuid(), this.#tokenHash(token), characterId, new Date(now.getTime() + this.sessionTtlMs), now],
    );
    return token;
  }

  async #insertStarter(client, character, farmId, now) {
    await client.query(
      "INSERT INTO farm(id, character_id, width, height, order_cursor, created_at, updated_at) VALUES($1, $2, $3, $4, 0, $5, $5)",
      [farmId, character.id, FARM.width, FARM.height, now],
    );
    await client.query("INSERT INTO warehouse(character_id, capacity, updated_at) VALUES($1, $2, $3)", [character.id, FARM.warehouseCapacity, now]);
    await client.query("INSERT INTO inventory_item(character_id, item_id, quantity, updated_at) VALUES($1, $2, $3, $4)", [character.id, CHICKEN.feedItem, 1, now]);
    for (const definition of STARTER_OBJECTS) {
      await client.query(
        "INSERT INTO farm_object(id, farm_id, character_id, definition_id, grid_x, grid_y, rotation, level, created_at, updated_at) VALUES($1, $2, $3, $4, $5, $6, $7, 1, $8, $8)",
        [this.uuid(), farmId, character.id, definition.definitionId, definition.gridX, definition.gridY, definition.rotation, now],
      );
    }
    for (const [index, [gridX, gridY]] of STARTER_PLOTS.entries()) {
      const plotId = this.uuid();
      await client.query("INSERT INTO plot(id, farm_id, character_id, grid_x, grid_y, created_at, updated_at) VALUES($1, $2, $3, $4, $5, $6, $6)", [plotId, farmId, character.id, gridX, gridY, now]);
      if (index < 3) {
        const plantedAt = new Date(now.getTime() - CROPS.rice.growSeconds * 1000);
        await client.query("INSERT INTO crop_instance(id, plot_id, crop_id, planted_at, ready_at, created_at, updated_at) VALUES($1, $2, 'rice', $3, $4, $5, $5)", [this.uuid(), plotId, plantedAt, now, now]);
      }
    }
    for (const templateId of STARTER_ORDERS) {
      const template = ORDER_TEMPLATES.find((candidate) => candidate.id === templateId);
      if (!template) throw new Error(`Unknown order template ${templateId}`);
      const orderId = this.uuid();
      await client.query("INSERT INTO farm_order(id, character_id, template_id, status, reward_coins, reward_xp, created_at) VALUES($1, $2, $3, 'OPEN', $4, $5, $6)", [orderId, character.id, template.id, template.rewardCoins, template.rewardXp, now]);
      for (const [lineNo, line] of template.lines.entries()) await client.query("INSERT INTO order_line(order_id, line_no, item_id, quantity) VALUES($1, $2, $3, $4)", [orderId, lineNo, line.itemId, line.quantity]);
    }
    for (const quest of Object.values(QUESTS)) await client.query("INSERT INTO quest_progress(character_id, quest_id, progress, target, updated_at) VALUES($1, $2, 0, $3, $4)", [character.id, quest.id, quest.target, now]);
  }

  async enter(name) {
    const normalized = normalizeCharacterName(name);
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await this.withTransaction(async (client) => {
          const now = this.now();
          const found = await client.query("SELECT id, display_name, level, xp, coins, diamonds FROM character WHERE lookup_name = $1 FOR UPDATE", [normalized.lookupName]);
          if (found.rows[0]) {
            const character = found.rows[0];
            const token = await this.#createSession(client, character.id, now);
            return { status: "existing", token, character: this.#summary(character) };
          }
          const character = { id: this.uuid(), displayName: normalized.displayName };
          const farmId = this.uuid();
          await client.query("INSERT INTO character(id, lookup_name, display_name, level, xp, coins, diamonds, state_revision, settings, created_at, updated_at) VALUES($1, $2, $3, $4, $5, $6, $7, 1, $8::jsonb, $9, $9)", [character.id, normalized.lookupName, normalized.displayName, FARM.level, FARM.xp, FARM.coins, FARM.diamonds, JSON.stringify({ locale: "vi-VN" }), now]);
          await this.#insertStarter(client, character, farmId, now);
          const token = await this.#createSession(client, character.id, now);
          return { status: "created", token, character: { id: character.id, displayName: character.displayName, level: FARM.level, xp: FARM.xp, coins: FARM.coins, diamonds: FARM.diamonds } };
        });
      } catch (error) {
        if (!isUnique(error) || attempt !== 0) throw error;
        // Another request won the lookup-name race. A new transaction reads it.
      }
    }
    throw new Error("unreachable");
  }

  async getCharacterBySession(token) {
    if (typeof token !== "string" || token.length < 20) {
      const error = new Error("Session token is invalid"); error.code = "UNAUTHORIZED"; throw error;
    }
    return this.withTransaction(async (client) => {
      const now = this.now();
      const result = await client.query("SELECT s.expires_at, s.revoked_at, c.* FROM game_session s JOIN character c ON c.id = s.character_id WHERE s.token_hash = $1 FOR UPDATE OF s, c", [this.#tokenHash(token)]);
      if (!result.rows[0] || result.rows[0].revoked_at) { const error = new Error("Session is invalid"); error.code = "UNAUTHORIZED"; throw error; }
      if (new Date(result.rows[0].expires_at) <= now) {
        await client.query("UPDATE game_session SET revoked_at = $2 WHERE token_hash = $1 AND revoked_at IS NULL", [this.#tokenHash(token), now]);
        const error = new Error("Session has expired"); error.code = "SESSION_EXPIRED"; throw error;
      }
      await client.query("UPDATE game_session SET last_seen_at = $2 WHERE token_hash = $1", [this.#tokenHash(token), now]);
      return this.#loadAggregate(client, result.rows[0]);
    }, { isolation: "READ COMMITTED" });
  }

  async revokeSession(token) {
    const now = this.now();
    const result = await this.pool.query("UPDATE game_session SET revoked_at = $2 WHERE token_hash = $1 AND revoked_at IS NULL RETURNING character_id", [this.#tokenHash(token), now]);
    return Boolean(result.rowCount);
  }

  async #loadAggregate(client, row) {
    const characterId = row.id;
    const farm = (await client.query("SELECT * FROM farm WHERE character_id = $1", [characterId])).rows[0];
    if (!farm) throw new Error("Character farm is missing");
    const [objects, plots, crops, animals, inventory, warehouse, orders, lines, quests] = await Promise.all([
      client.query("SELECT * FROM farm_object WHERE character_id = $1 ORDER BY created_at, id", [characterId]),
      client.query("SELECT * FROM plot WHERE character_id = $1 ORDER BY grid_y, grid_x, id", [characterId]),
      client.query("SELECT c.* FROM crop_instance c JOIN plot p ON p.id = c.plot_id WHERE p.character_id = $1", [characterId]),
      client.query("SELECT * FROM animal WHERE character_id = $1 ORDER BY created_at, id", [characterId]),
      client.query("SELECT item_id, quantity FROM inventory_item WHERE character_id = $1 AND quantity > 0 ORDER BY item_id", [characterId]),
      client.query("SELECT capacity FROM warehouse WHERE character_id = $1", [characterId]),
      client.query("SELECT * FROM farm_order WHERE character_id = $1 ORDER BY created_at, id", [characterId]),
      client.query("SELECT l.* FROM order_line l JOIN farm_order o ON o.id = l.order_id WHERE o.character_id = $1 ORDER BY l.order_id, l.line_no", [characterId]),
      client.query("SELECT * FROM quest_progress WHERE character_id = $1 ORDER BY quest_id", [characterId]),
    ]);
    const cropByPlot = new Map(crops.rows.map((crop) => [crop.plot_id, { id: crop.id, plotId: crop.plot_id, cropId: crop.crop_id, plantedAt: iso(crop.planted_at), readyAt: iso(crop.ready_at), createdAt: iso(crop.created_at), updatedAt: iso(crop.updated_at) }]));
    const lineByOrder = new Map();
    for (const line of lines.rows) {
      let orderLines = lineByOrder.get(line.order_id);
      if (!orderLines) {
        orderLines = [];
        lineByOrder.set(line.order_id, orderLines);
      }
      orderLines.push({ itemId: line.item_id, quantity: line.quantity });
    }
    const inventoryObject = Object.fromEntries(inventory.rows.map((item) => [item.item_id, item.quantity]));
    return {
      id: row.id, displayName: row.display_name, lookupName: row.lookup_name, level: row.level, xp: row.xp, coins: row.coins, diamonds: row.diamonds,
      stateRevision: Number(row.state_revision ?? 1), createdAt: iso(row.created_at), updatedAt: iso(row.updated_at),
      farm: { id: farm.id, characterId: farm.character_id, width: farm.width, height: farm.height, orderCursor: farm.order_cursor, createdAt: iso(farm.created_at), updatedAt: iso(farm.updated_at) },
      objects: objects.rows.map((item) => ({ id: item.id, farmId: item.farm_id, definitionId: item.definition_id, gridX: item.grid_x, gridY: item.grid_y, rotation: item.rotation, level: item.level, createdAt: iso(item.created_at), updatedAt: iso(item.updated_at) })),
      plots: plots.rows.map((item) => ({ id: item.id, farmId: item.farm_id, gridX: item.grid_x, gridY: item.grid_y, cropId: cropByPlot.get(item.id)?.cropId ?? null, ...(cropByPlot.has(item.id) ? { crop: cropByPlot.get(item.id) } : {}) })),
      animals: animals.rows.map((item) => ({ id: item.id, type: item.type, buildingId: item.building_id, state: item.state, fedAt: item.fed_at ? iso(item.fed_at) : null, productReadyAt: item.product_ready_at ? iso(item.product_ready_at) : null, createdAt: iso(item.created_at), updatedAt: iso(item.updated_at) })),
      inventory: inventoryObject, warehouse: { capacity: warehouse.rows[0]?.capacity ?? FARM.warehouseCapacity },
      orders: orders.rows.map((item) => ({ id: item.id, characterId: item.character_id, templateId: item.template_id, status: item.status, lines: lineByOrder.get(item.id) ?? [], rewardCoins: item.reward_coins, rewardXp: item.reward_xp, createdAt: iso(item.created_at), completedAt: item.completed_at ? iso(item.completed_at) : null })),
      quests: Object.fromEntries(quests.rows.map((item) => [item.quest_id, { questId: item.quest_id, progress: item.progress, target: item.target, completed: Boolean(item.completed_at), claimed: Boolean(item.claimed_at) }])),
      settings: row.settings ?? { locale: "vi-VN" },
    };
  }

  async loadByCharacterId(characterId) {
    return this.withTransaction((client) => client.query("SELECT * FROM character WHERE id = $1", [characterId]).then(async (result) => result.rows[0] ? this.#loadAggregate(client, result.rows[0]) : null), { isolation: "READ COMMITTED" });
  }

  async bootstrap(characterOrId) {
    const character = typeof characterOrId === "string" ? await this.loadByCharacterId(characterOrId) : characterOrId;
    if (!character) return null;
    const crops = character.plots.filter((plot) => plot.crop).map((plot) => clone(plot.crop));
    const inventory = Object.entries(character.inventory).map(([itemId, quantity]) => ({ itemId, quantity }));
    const used = inventory.reduce((total, item) => total + item.quantity, 0);
    return { schemaVersion: 2, contentVersion: CONTENT_VERSION, serverNow: iso(this.now()), stateRevision: character.stateRevision, character: this.#summary(character), farm: clone(character.farm), objects: clone(character.objects), plots: character.plots.map(({ crop, ...plot }) => clone(plot)), crops, animals: clone(character.animals), inventory, warehouse: { capacity: character.warehouse.capacity, used }, orders: clone(character.orders), quests: Object.values(character.quests).map(clone), unlocks: Object.entries(LEVEL_UNLOCKS).filter(([level]) => Number(level) <= character.level).flatMap(([, values]) => values), settings: clone(character.settings) };
  }

  async runMutation({ characterId, actionType, key, payload, operation, lock = "character" }) {
    if (typeof key !== "string" || key.length < 1 || key.length > 128 || /\s/u.test(key)) { const error = new Error("Idempotency-Key is invalid"); error.code = "INVALID_INPUT"; throw error; }
    if (typeof operation !== "function") throw new TypeError("runMutation requires an operation callback");
    const requestHash = hash(payload);
    return this.withTransaction(async (client) => {
      const characterResult = await client.query("SELECT * FROM character WHERE id = $1 FOR UPDATE", [characterId]);
      if (!characterResult.rows[0]) { const error = new Error("Character not found"); error.code = "NOT_FOUND"; throw error; }
      if (lock === "farm") await client.query("SELECT id FROM farm WHERE character_id = $1 FOR UPDATE", [characterId]);
      const idem = await client.query("SELECT request_hash, response FROM idempotency_record WHERE character_id = $1 AND action_type = $2 AND key = $3 FOR UPDATE", [characterId, actionType, key]);
      if (idem.rows[0]) {
        if (idem.rows[0].request_hash !== requestHash) { const error = new Error("Idempotency key reused for another payload"); error.code = "IDEMPOTENCY_KEY_REUSED"; throw error; }
        return typeof idem.rows[0].response === "string" ? JSON.parse(idem.rows[0].response) : idem.rows[0].response;
      }
      const result = await operation(client, { character: characterResult.rows[0], lock, now: this.now() });
      const now = this.now();
      const revision = Number(characterResult.rows[0].state_revision ?? 1) + 1;
      await client.query("UPDATE character SET state_revision = $2, updated_at = $3 WHERE id = $1", [characterId, revision, now]);
      const body = { ...(result ?? {}), serverNow: iso(now), stateRevision: revision };
      await client.query("INSERT INTO idempotency_record(character_id, action_type, key, request_hash, response, created_at, expires_at) VALUES($1, $2, $3, $4, $5::jsonb, $6, $7)", [characterId, actionType, key, requestHash, JSON.stringify(body), now, new Date(now.getTime() + this.idempotencyTtlMs)]);
      return body;
    });
  }

  async lockInventory(client, characterId) { return client.query("SELECT character_id, item_id, quantity FROM inventory_item WHERE character_id = $1 FOR UPDATE", [characterId]); }
  async lockWarehouse(client, characterId) { return client.query("SELECT character_id, capacity FROM warehouse WHERE character_id = $1 FOR UPDATE", [characterId]); }
  async lockFarm(client, characterId) { return client.query("SELECT * FROM farm WHERE character_id = $1 FOR UPDATE", [characterId]); }
  async lockPlot(client, plotId) { return client.query("SELECT * FROM plot WHERE id = $1 FOR UPDATE", [plotId]); }
  async lockAnimal(client, animalId) { return client.query("SELECT * FROM animal WHERE id = $1 FOR UPDATE", [animalId]); }
  async lockOrder(client, orderId) { return client.query("SELECT * FROM farm_order WHERE id = $1 FOR UPDATE", [orderId]); }
}

export { hash as requestHash, stableStringify };
