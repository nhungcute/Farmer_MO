/**
 * Versioned, server-owned MVP content. Runtime code must import these values
 * instead of accepting prices, rewards, or timers from the client.
 */
export const CONTENT_VERSION = "mvp-1";

export const FARM = Object.freeze({ width: 24, height: 24, coins: 1000, diamonds: 5, level: 1, xp: 0, warehouseCapacity: 100 });

export const CROPS = Object.freeze({
  rice: Object.freeze({ id: "rice", name: "Lúa", unlockLevel: 1, plantCost: 5, growSeconds: 120, harvestYield: 3, sellPrice: 8, xpReward: 10, stages: 5 }),
  carrot: Object.freeze({ id: "carrot", name: "Cà rốt", unlockLevel: 2, plantCost: 8, growSeconds: 240, harvestYield: 3, sellPrice: 14, xpReward: 14, stages: 5 }),
  corn: Object.freeze({ id: "corn", name: "Bắp", unlockLevel: 3, plantCost: 12, growSeconds: 420, harvestYield: 3, sellPrice: 22, xpReward: 20, stages: 5 }),
  tomato: Object.freeze({ id: "tomato", name: "Cà chua", unlockLevel: 4, plantCost: 15, growSeconds: 600, harvestYield: 3, sellPrice: 34, xpReward: 28, stages: 5 }),
});

export const ITEMS = Object.freeze({
  rice: Object.freeze({ id: "rice", name: "Lúa", category: "Crops", sellPrice: 8, buyPrice: null, stack: 999 }),
  carrot: Object.freeze({ id: "carrot", name: "Cà rốt", category: "Crops", sellPrice: 14, buyPrice: null, stack: 999 }),
  corn: Object.freeze({ id: "corn", name: "Bắp", category: "Crops", sellPrice: 22, buyPrice: null, stack: 999 }),
  tomato: Object.freeze({ id: "tomato", name: "Cà chua", category: "Crops", sellPrice: 34, buyPrice: null, stack: 999 }),
  chicken_feed: Object.freeze({ id: "chicken_feed", name: "Thức ăn gà", category: "Animal Goods", sellPrice: null, buyPrice: 5, stack: 999 }),
  egg: Object.freeze({ id: "egg", name: "Trứng gà", category: "Animal Goods", sellPrice: 20, buyPrice: null, stack: 999 }),
});

export const BUILDINGS = Object.freeze({
  farmhouse_lv1: Object.freeze({ id: "farmhouse_lv1", name: "Nhà nông trại", category: "Buildings", unlockLevel: 1, cost: 0, width: 3, height: 3, unique: true, xp: 0 }),
  warehouse_lv1: Object.freeze({ id: "warehouse_lv1", name: "Kho", category: "Buildings", unlockLevel: 1, cost: 0, width: 2, height: 2, unique: true, xp: 0 }),
  pond_small_lv1: Object.freeze({ id: "pond_small_lv1", name: "Ao nhỏ", category: "Water", unlockLevel: 2, cost: 200, width: 2, height: 2, unique: true, xp: 20 }),
  chicken_coop_lv1: Object.freeze({ id: "chicken_coop_lv1", name: "Chuồng gà", category: "Buildings", unlockLevel: 2, cost: 300, width: 3, height: 2, unique: true, xp: 30 }),
});

export const CHICKEN = Object.freeze({ type: "chicken_basic", feedItem: "chicken_feed", feedQuantity: 1, product: "egg", productQuantity: 1, productSeconds: 600, collectXp: 8, maxPerCoop: 1 });

export const ORDER_TEMPLATES = Object.freeze([
  Object.freeze({ id: "order_rice_3", unlockLevel: 1, lines: Object.freeze([{ itemId: "rice", quantity: 3 }]), rewardCoins: 80, rewardXp: 80 }),
  Object.freeze({ id: "order_rice_5", unlockLevel: 1, lines: Object.freeze([{ itemId: "rice", quantity: 5 }]), rewardCoins: 120, rewardXp: 100 }),
  Object.freeze({ id: "order_rice_carrot", unlockLevel: 2, lines: Object.freeze([{ itemId: "rice", quantity: 3 }, { itemId: "carrot", quantity: 3 }]), rewardCoins: 180, rewardXp: 130 }),
  Object.freeze({ id: "order_carrot_corn", unlockLevel: 3, lines: Object.freeze([{ itemId: "carrot", quantity: 3 }, { itemId: "corn", quantity: 3 }]), rewardCoins: 280, rewardXp: 180 }),
  Object.freeze({ id: "order_corn_tomato", unlockLevel: 4, lines: Object.freeze([{ itemId: "corn", quantity: 3 }, { itemId: "tomato", quantity: 3 }]), rewardCoins: 420, rewardXp: 250 }),
]);

export const LEVEL_THRESHOLDS = Object.freeze([0, 100, 260, 480, 760, 1100, 1500, 1960, 2480, 3060]);
export const LEVEL_UNLOCKS = Object.freeze({ 1: ["rice", "farmhouse_lv1", "warehouse_lv1", "build_mode"], 2: ["carrot", "pond_small_lv1", "chicken_coop_lv1"], 3: ["corn"], 4: ["tomato"], 5: ["roads_decor_future"], 8: ["warehouse_upgrade_future"], 10: ["fishing_future"] });
export const QUESTS = Object.freeze({
  first_harvest: Object.freeze({ id: "first_harvest", name: "Thu hoạch đầu tiên", type: "HARVEST_ITEM", target: 1, rewardCoins: 50, rewardDiamonds: 0, rewardXp: 10 }),
  first_sale: Object.freeze({ id: "first_sale", name: "Lần bán đầu tiên", type: "SELL_ITEM", target: 5, rewardCoins: 100, rewardDiamonds: 0, rewardXp: 20 }),
  first_build: Object.freeze({ id: "first_build", name: "Xây dựng đầu tiên", type: "BUILD_OBJECT", target: 1, rewardCoins: 100, rewardDiamonds: 0, rewardXp: 20 }),
  first_egg: Object.freeze({ id: "first_egg", name: "Quả trứng đầu tiên", type: "COLLECT_PRODUCT", target: 1, rewardCoins: 150, rewardDiamonds: 1, rewardXp: 30 }),
});

export const STARTER_OBJECTS = Object.freeze([
  Object.freeze({ definitionId: "farmhouse_lv1", gridX: 8, gridY: 4, rotation: 0 }),
  Object.freeze({ definitionId: "warehouse_lv1", gridX: 13, gridY: 4, rotation: 0 }),
]);
export const STARTER_PLOTS = Object.freeze([[8, 10], [10, 10], [12, 10], [8, 13], [10, 13], [12, 13]]);
export const STARTER_ORDERS = Object.freeze(["order_rice_3", "order_rice_5", "order_rice_3"]);

export function xpLevel(xp) {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i += 1) if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
  return level;
}

export function unlocked(level, definition) {
  return Boolean(definition && definition.unlockLevel <= level);
}

// Stable lower-case aliases for shared consumers. Keep the uppercase names
// above for older API imports during the workspace migration.
export const farm = FARM;
export const crops = CROPS;
export const items = ITEMS;
export const buildings = BUILDINGS;
export const chicken = CHICKEN;
export const orders = ORDER_TEMPLATES;
export const quests = QUESTS;
export const levelThresholds = LEVEL_THRESHOLDS;
export const unlocks = LEVEL_UNLOCKS;
export const starterObjects = STARTER_OBJECTS;
export const starterPlots = STARTER_PLOTS;
export const starterOrders = STARTER_ORDERS;
