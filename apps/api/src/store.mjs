import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  BUILDINGS, CHICKEN, CONTENT_VERSION, CROPS, FARM, ITEMS, LEVEL_UNLOCKS,
  ORDER_TEMPLATES, QUESTS, STARTER_OBJECTS, STARTER_ORDERS, STARTER_PLOTS, unlocked, xpLevel,
} from "../../../packages/content/index.mjs";

export class ApiError extends Error {
  constructor(code, message, status = 400, details = {}) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const iso = (date) => new Date(date).toISOString();
const clone = (value) => JSON.parse(JSON.stringify(value));
const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const nowDefault = () => new Date();
const positiveQuantity = (value, field = "quantity", max = 99) => {
  if (!Number.isSafeInteger(value) || value < 1 || value > max) throw new ApiError("INVALID_INPUT", `${field} phải là số nguyên từ 1 đến ${max}.`, 400, { field, min: 1, max });
  return value;
};
const uuid = (value, field) => {
  if (typeof value !== "string" || !/^[0-9a-f-]{20,}$/i.test(value)) throw new ApiError("INVALID_INPUT", `${field} không hợp lệ.`, 400, { field });
  return value;
};

export function normalizeCharacterName(input) {
  if (typeof input !== "string") throw new ApiError("INVALID_INPUT", "Tên nhân vật không hợp lệ.", 400, { field: "name" });
  const displayName = input.normalize("NFC").trim().replace(/\s+/gu, " ");
  if ([...displayName].length < 2 || [...displayName].length > 24 || /\p{Cc}/u.test(displayName)) {
    throw new ApiError("INVALID_INPUT", "Tên nhân vật phải dài từ 2 đến 24 ký tự và không chứa ký tự điều khiển.", 400, { field: "name", minLength: 2, maxLength: 24 });
  }
  return { displayName, lookupName: displayName.toLocaleLowerCase("vi-VN") };
}

function createQuestState() {
  return Object.fromEntries(Object.values(QUESTS).map((quest) => [quest.id, { questId: quest.id, progress: 0, target: quest.target, completed: false, claimed: false }]));
}

export class FarmStore {
  constructor({ clock = nowDefault, sessionTtlMs = 7 * 24 * 60 * 60 * 1000 } = {}) {
    this.clock = clock;
    this.sessionTtlMs = sessionTtlMs;
    this.characters = new Map();
    this.lookup = new Map();
    this.sessions = new Map();
    this.idempotency = new Map();
  }

  now() { return new Date(this.clock()); }

  #sessionHash(token) { return createHash("sha256").update(token).digest("hex"); }

  #newSession(characterId, now) {
    const token = randomBytes(32).toString("base64url");
    this.sessions.set(this.#sessionHash(token), { characterId, expiresAt: new Date(now.getTime() + this.sessionTtlMs), createdAt: now, lastSeenAt: now, revokedAt: null });
    return token;
  }

  enter(name) {
    const normalized = normalizeCharacterName(name);
    const current = this.lookup.get(normalized.lookupName);
    const now = this.now();
    if (current) {
      const character = this.characters.get(current);
      const token = this.#newSession(character.id, now);
      return { status: "existing", token, character: this.characterSummary(character) };
    }

    const character = this.#createCharacter(normalized, now);
    this.characters.set(character.id, character);
    this.lookup.set(character.lookupName, character.id);
    const token = this.#newSession(character.id, now);
    return { status: "created", token, character: this.characterSummary(character) };
  }

  #createCharacter({ displayName, lookupName }, now) {
    const characterId = randomUUID();
    const farmId = randomUUID();
    const createdAt = iso(now);
    const objects = STARTER_OBJECTS.map((object) => ({ id: randomUUID(), ...object, farmId, level: 1, createdAt, updatedAt: createdAt }));
    const plots = STARTER_PLOTS.map(([gridX, gridY], index) => ({ id: randomUUID(), farmId, gridX, gridY, cropId: null, index }));
    for (const plot of plots.slice(0, 3)) {
      const plantedAt = new Date(now.getTime() - CROPS.rice.growSeconds * 1000);
      plot.cropId = "rice";
      plot.crop = { id: randomUUID(), plotId: plot.id, cropId: "rice", plantedAt: iso(plantedAt), readyAt: createdAt, createdAt, updatedAt: createdAt };
    }
    for (const plot of plots.slice(3)) delete plot.crop;
    const orders = STARTER_ORDERS.map((templateId) => this.#makeOrder(templateId, characterId, now));
    return {
      id: characterId, displayName, lookupName, level: FARM.level, xp: FARM.xp, coins: FARM.coins, diamonds: FARM.diamonds, stateRevision: 1,
      createdAt, updatedAt: createdAt, farm: { id: farmId, characterId, width: FARM.width, height: FARM.height, orderCursor: 0, createdAt, updatedAt: createdAt },
      objects, plots, animals: [], inventory: { chicken_feed: 1 }, warehouse: { capacity: FARM.warehouseCapacity }, orders,
      quests: createQuestState(), settings: { locale: "vi-VN", tutorialEnabled: false },
    };
  }

  #makeOrder(templateId, characterId, now) {
    const template = ORDER_TEMPLATES.find((item) => item.id === templateId);
    if (!template) throw new Error(`Unknown order template ${templateId}`);
    return { id: randomUUID(), characterId, templateId: template.id, status: "OPEN", lines: clone(template.lines), rewardCoins: template.rewardCoins, rewardXp: template.rewardXp, createdAt: iso(now), completedAt: null };
  }

  characterSummary(character) { return { id: character.id, displayName: character.displayName, level: character.level, xp: character.xp, coins: character.coins, diamonds: character.diamonds }; }

  getCharacterBySession(token) {
    if (!token) throw new ApiError("UNAUTHORIZED", "Phiên chơi không tồn tại.", 401);
    const session = this.sessions.get(this.#sessionHash(token));
    if (!session || session.revokedAt) throw new ApiError("UNAUTHORIZED", "Phiên chơi không hợp lệ.", 401);
    const now = this.now();
    if (session.expiresAt <= now) { session.revokedAt = now; throw new ApiError("SESSION_EXPIRED", "Phiên chơi đã hết hạn.", 401); }
    session.lastSeenAt = now;
    const character = this.characters.get(session.characterId);
    if (!character) throw new ApiError("UNAUTHORIZED", "Nhân vật không tồn tại.", 401);
    return character;
  }

  #itemQuantity(character, itemId) { return character.inventory[itemId] ?? 0; }
  #usedCapacity(character) { return Object.values(character.inventory).reduce((total, quantity) => total + quantity, 0); }
  #ensureCapacity(character, quantity) {
    if (this.#usedCapacity(character) + quantity > character.warehouse.capacity) throw new ApiError("WAREHOUSE_FULL", "Kho đã đầy! Hãy bán bớt hoặc nâng cấp Kho.", 409, { capacity: character.warehouse.capacity, used: this.#usedCapacity(character), requested: quantity });
  }
  #changeItem(character, itemId, delta) {
    const next = this.#itemQuantity(character, itemId) + delta;
    if (next < 0) throw new ApiError("NOT_ENOUGH_ITEM", "Không đủ vật phẩm.", 409, { itemId, requested: -delta, available: this.#itemQuantity(character, itemId) });
    if (next === 0) delete character.inventory[itemId]; else character.inventory[itemId] = next;
    return { itemId, delta, newQuantity: next };
  }
  #ensureCoins(character, amount) {
    if (character.coins < amount) throw new ApiError("NOT_ENOUGH_COINS", "Không đủ Xu.", 409, { required: amount, available: character.coins });
  }
  #ensureUnlocked(character, definition) {
    if (!unlocked(character.level, definition)) throw new ApiError("NOT_UNLOCKED", "Nội dung này chưa được mở khóa.", 409, { requiredLevel: definition.unlockLevel, level: character.level });
  }
  #addXp(character, amount) {
    character.xp += amount;
    const previousLevel = character.level;
    character.level = xpLevel(character.xp);
    const unlocks = [];
    for (let level = previousLevel + 1; level <= character.level; level += 1) unlocks.push(...(LEVEL_UNLOCKS[level] ?? []));
    return { previousLevel, level: character.level, unlocks };
  }
  #questProgress(character, questId, amount) {
    const progress = character.quests[questId];
    if (!progress || progress.claimed) return;
    progress.progress = Math.min(progress.target, progress.progress + amount);
    progress.completed = progress.progress >= progress.target;
  }
  #touch(character) { character.stateRevision += 1; character.updatedAt = iso(this.now()); }
  #mutation(character, actionType, key, payload, fn) {
    if (typeof key !== "string" || key.length < 1 || key.length > 128 || /\s/u.test(key)) throw new ApiError("INVALID_INPUT", "Thiếu Idempotency-Key hợp lệ.", 400, { header: "Idempotency-Key" });
    const id = `${character.id}:${actionType}:${key}`;
    const requestHash = hash(payload);
    const previous = this.idempotency.get(id);
    if (previous) {
      if (previous.requestHash !== requestHash) throw new ApiError("IDEMPOTENCY_KEY_REUSED", "Idempotency-Key đã được dùng cho dữ liệu khác.", 409, { actionType });
      return clone(previous.body);
    }
    const result = fn();
    this.#touch(character);
    const body = { ...result, serverNow: iso(this.now()), stateRevision: character.stateRevision };
    this.idempotency.set(id, { requestHash, body: clone(body) });
    return body;
  }

  bootstrap(character) {
    const crops = character.plots.filter((plot) => plot.crop).map((plot) => clone(plot.crop));
    const inventory = Object.entries(character.inventory).map(([itemId, quantity]) => ({ itemId, quantity }));
    const used = this.#usedCapacity(character);
    const quests = Object.values(character.quests).map((quest) => clone(quest));
    return {
      schemaVersion: 2, contentVersion: CONTENT_VERSION, serverNow: iso(this.now()), stateRevision: character.stateRevision,
      character: this.characterSummary(character), farm: clone(character.farm), objects: clone(character.objects), plots: character.plots.map(({ crop, ...plot }) => clone(plot)), crops,
      animals: clone(character.animals), inventory, warehouse: { capacity: character.warehouse.capacity, used }, orders: clone(character.orders), quests,
      unlocks: Object.entries(LEVEL_UNLOCKS).filter(([level]) => Number(level) <= character.level).flatMap(([, values]) => values), settings: clone(character.settings),
    };
  }

  plant(character, body, key) {
    return this.#mutation(character, "crops.plant", key, body, () => {
      const plotId = uuid(body?.plotId, "plotId");
      const cropId = body?.cropId;
      const definition = CROPS[cropId];
      if (!definition) throw new ApiError("INVALID_INPUT", "Loại cây không hợp lệ.", 400, { field: "cropId" });
      this.#ensureUnlocked(character, definition);
      const plot = character.plots.find((item) => item.id === plotId);
      if (!plot) throw new ApiError("NOT_FOUND", "Không tìm thấy ô đất.", 404, { plotId });
      if (plot.crop) throw new ApiError("PLOT_NOT_EMPTY", "Ô đất đang có cây.", 409, { plotId });
      this.#ensureCoins(character, definition.plantCost);
      const plantedAt = this.now();
      const crop = { id: randomUUID(), plotId, cropId, plantedAt: iso(plantedAt), readyAt: iso(new Date(plantedAt.getTime() + definition.growSeconds * 1000)), createdAt: iso(plantedAt), updatedAt: iso(plantedAt) };
      character.coins -= definition.plantCost; plot.crop = crop; plot.cropId = cropId;
      return { character: this.characterSummary(character), crop: clone(crop), inventoryDelta: [] };
    });
  }

  harvest(character, body, key) {
    return this.#mutation(character, "crops.harvest", key, body, () => {
      const plotId = uuid(body?.plotId, "plotId");
      const plot = character.plots.find((item) => item.id === plotId);
      if (!plot) throw new ApiError("NOT_FOUND", "Không tìm thấy ô đất.", 404, { plotId });
      if (!plot.crop) throw new ApiError("NOT_FOUND", "Ô đất chưa có cây.", 404, { plotId });
      const crop = plot.crop; const definition = CROPS[crop.cropId];
      if (new Date(crop.readyAt) > this.now()) throw new ApiError("CROP_NOT_READY", "Cây chưa chín.", 409, { readyAt: crop.readyAt });
      this.#ensureCapacity(character, definition.harvestYield);
      const delta = this.#changeItem(character, crop.cropId, definition.harvestYield);
      plot.crop = null; plot.cropId = null;
      this.#questProgress(character, "first_harvest", 1);
      const level = this.#addXp(character, definition.xpReward);
      return { character: this.characterSummary(character), inventoryDelta: [delta], levelUp: level, harvested: { cropId: crop.cropId, quantity: definition.harvestYield } };
    });
  }

  placeBuilding(character, body, key) {
    return this.#mutation(character, "buildings.place", key, body, () => {
      const definition = BUILDINGS[body?.definitionId];
      if (!definition || !["pond_small_lv1", "chicken_coop_lv1"].includes(definition.id)) throw new ApiError("INVALID_INPUT", "Công trình không hợp lệ.", 400, { field: "definitionId" });
      this.#ensureUnlocked(character, definition);
      const gridX = body?.gridX; const gridY = body?.gridY; const rotation = body?.rotation;
      if (!Number.isSafeInteger(gridX) || !Number.isSafeInteger(gridY)) throw new ApiError("INVALID_INPUT", "Tọa độ xây dựng không hợp lệ.", 400);
      if (rotation !== 0) throw new ApiError("INVALID_ROTATION", "Công trình này chỉ hỗ trợ xoay 0 độ.", 409, { rotation });
      if (definition.unique && character.objects.some((object) => object.definitionId === definition.id)) throw new ApiError("UNIQUE_BUILDING_EXISTS", "Công trình này đã tồn tại.", 409, { definitionId: definition.id });
      if (gridX < 0 || gridY < 0 || gridX + definition.width > character.farm.width || gridY + definition.height > character.farm.height) throw new ApiError("BUILDING_COLLISION", "Công trình nằm ngoài khu đất.", 409);
      const cells = (x, y, w, h) => Array.from({ length: w * h }, (_, index) => `${x + index % w}:${y + Math.floor(index / w)}`);
      const occupied = new Set();
      for (const object of character.objects) { const old = BUILDINGS[object.definitionId]; for (const cell of cells(object.gridX, object.gridY, old.width, old.height)) occupied.add(cell); }
      for (const plot of character.plots) occupied.add(`${plot.gridX}:${plot.gridY}`);
      for (const cell of cells(gridX, gridY, definition.width, definition.height)) if (occupied.has(cell)) throw new ApiError("BUILDING_COLLISION", "Vị trí xây dựng đang bị chiếm.", 409, { cell });
      this.#ensureCoins(character, definition.cost);
      character.coins -= definition.cost;
      const now = iso(this.now()); const object = { id: randomUUID(), farmId: character.farm.id, definitionId: definition.id, gridX, gridY, rotation, level: 1, createdAt: now, updatedAt: now };
      character.objects.push(object);
      let animal = null;
      if (definition.id === "chicken_coop_lv1") { animal = { id: randomUUID(), type: CHICKEN.type, buildingId: object.id, state: "IDLE", fedAt: null, productReadyAt: null, createdAt: now, updatedAt: now }; character.animals.push(animal); }
      this.#questProgress(character, "first_build", 1); const level = this.#addXp(character, definition.xp);
      return { character: this.characterSummary(character), object: clone(object), animal: clone(animal), levelUp: level };
    });
  }

  feedAnimal(character, body, key) {
    return this.#mutation(character, "animals.feed", key, body, () => {
      const animalId = uuid(body?.animalId, "animalId"); const animal = character.animals.find((item) => item.id === animalId);
      if (!animal) throw new ApiError("NOT_FOUND", "Không tìm thấy gà.", 404, { animalId });
      if (animal.productReadyAt) throw new ApiError("ANIMAL_NOT_READY", "Gà đã được cho ăn và đang chờ đẻ trứng.", 409, { productReadyAt: animal.productReadyAt });
      const delta = this.#changeItem(character, CHICKEN.feedItem, -CHICKEN.feedQuantity); const now = this.now();
      animal.fedAt = iso(now); animal.productReadyAt = iso(new Date(now.getTime() + CHICKEN.productSeconds * 1000)); animal.state = "EAT"; animal.updatedAt = iso(now);
      return { character: this.characterSummary(character), animal: clone(animal), inventoryDelta: [delta] };
    });
  }

  collectAnimal(character, body, key) {
    return this.#mutation(character, "animals.collect", key, body, () => {
      const animalId = uuid(body?.animalId, "animalId"); const animal = character.animals.find((item) => item.id === animalId);
      if (!animal) throw new ApiError("NOT_FOUND", "Không tìm thấy gà.", 404, { animalId });
      if (!animal.productReadyAt || new Date(animal.productReadyAt) > this.now()) throw new ApiError("ANIMAL_NOT_READY", "Gà chưa có trứng.", 409, { productReadyAt: animal.productReadyAt });
      this.#ensureCapacity(character, CHICKEN.productQuantity);
      const delta = this.#changeItem(character, CHICKEN.product, CHICKEN.productQuantity); const now = iso(this.now());
      animal.fedAt = null; animal.productReadyAt = null; animal.state = "HAPPY"; animal.updatedAt = now;
      this.#questProgress(character, "first_egg", 1); const level = this.#addXp(character, CHICKEN.collectXp);
      return { character: this.characterSummary(character), animal: clone(animal), inventoryDelta: [delta], levelUp: level, collected: { itemId: CHICKEN.product, quantity: CHICKEN.productQuantity } };
    });
  }

  sell(character, body, key) {
    return this.#mutation(character, "market.sell", key, body, () => {
      const itemId = body?.itemId; const item = ITEMS[itemId]; const quantity = positiveQuantity(body?.quantity);
      if (!item || item.sellPrice == null) throw new ApiError("INVALID_INPUT", "Vật phẩm này không thể bán.", 400, { itemId });
      if (this.#itemQuantity(character, itemId) < quantity) throw new ApiError("NOT_ENOUGH_ITEM", "Không đủ vật phẩm.", 409, { itemId, requested: quantity, available: this.#itemQuantity(character, itemId) });
      const delta = this.#changeItem(character, itemId, -quantity); const coins = quantity * item.sellPrice; character.coins += coins; this.#questProgress(character, "first_sale", quantity);
      return { character: this.characterSummary(character), inventoryDelta: [delta], earned: { coins, itemId, quantity } };
    });
  }

  buy(character, body, key) {
    return this.#mutation(character, "market.buy", key, body, () => {
      const itemId = body?.itemId; const item = ITEMS[itemId]; const quantity = positiveQuantity(body?.quantity);
      if (!item || item.buyPrice == null || itemId !== "chicken_feed") throw new ApiError("INVALID_INPUT", "Chỉ có thể mua thức ăn gà trong chợ MVP.", 400, { itemId });
      const cost = quantity * item.buyPrice; this.#ensureCoins(character, cost); this.#ensureCapacity(character, quantity); character.coins -= cost;
      const delta = this.#changeItem(character, itemId, quantity); return { character: this.characterSummary(character), inventoryDelta: [delta], purchased: { itemId, quantity, cost } };
    });
  }

  completeOrder(character, orderId, body, key) {
    return this.#mutation(character, "orders.complete", key, { orderId, body }, () => {
      uuid(orderId, "orderId"); const order = character.orders.find((item) => item.id === orderId);
      if (!order || order.status !== "OPEN") throw new ApiError("NOT_FOUND", "Không tìm thấy đơn hàng đang mở.", 404, { orderId });
      for (const line of order.lines) if (this.#itemQuantity(character, line.itemId) < line.quantity) throw new ApiError("ORDER_NOT_COMPLETABLE", "Chưa đủ vật phẩm cho đơn hàng.", 409, { orderId, line });
      const deltas = order.lines.map((line) => this.#changeItem(character, line.itemId, -line.quantity)); character.coins += order.rewardCoins; const level = this.#addXp(character, order.rewardXp);
      order.status = "COMPLETED"; order.completedAt = iso(this.now());
      const unlockedTemplates = ORDER_TEMPLATES.filter((template) => template.unlockLevel <= character.level); let replacement = null;
      for (let offset = 0; offset < ORDER_TEMPLATES.length; offset += 1) { const index = (character.farm.orderCursor + offset) % ORDER_TEMPLATES.length; const candidate = ORDER_TEMPLATES[index]; if (candidate.unlockLevel <= character.level) { replacement = this.#makeOrder(candidate.id, character.id, this.now()); character.farm.orderCursor = (index + 1) % ORDER_TEMPLATES.length; break; } }
      if (!replacement && unlockedTemplates[0]) replacement = this.#makeOrder(unlockedTemplates[0].id, character.id, this.now());
      if (replacement) character.orders[character.orders.indexOf(order)] = replacement;
      return { character: this.characterSummary(character), order: clone(order), replacement: clone(replacement), inventoryDelta: deltas, levelUp: level, earned: { coins: order.rewardCoins, xp: order.rewardXp } };
    });
  }

  claimQuest(character, questId, body, key) {
    return this.#mutation(character, `quests.${questId}.claim`, key, body, () => {
      const quest = QUESTS[questId]; const state = character.quests[questId];
      if (!quest || !state) throw new ApiError("NOT_FOUND", "Không tìm thấy nhiệm vụ.", 404, { questId });
      if (!state.completed || state.claimed) throw new ApiError("ORDER_NOT_COMPLETABLE", "Nhiệm vụ chưa hoàn thành hoặc đã nhận thưởng.", 409, { questId });
      state.claimed = true; character.coins += quest.rewardCoins; character.diamonds += quest.rewardDiamonds; const level = this.#addXp(character, quest.rewardXp);
      return { character: this.characterSummary(character), quest: clone(state), levelUp: level, reward: { coins: quest.rewardCoins, diamonds: quest.rewardDiamonds, xp: quest.rewardXp } };
    });
  }
}

