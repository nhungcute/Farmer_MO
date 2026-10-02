import * as canonical from './content.generated.mjs';

// This is a read-only display adapter. Only API mutations may grant or consume items.
export const content = Object.freeze({...canonical});
export const cropChoices = Object.freeze(Object.values(canonical.CROPS).map(crop => Object.freeze({
  ...crop,label:crop.name,cost:crop.plantCost,grow:crop.growSeconds,yield:crop.harvestYield,sell:crop.sellPrice,xp:crop.xpReward,
})));
export const legacyCrops = Object.freeze(Object.fromEntries(cropChoices.map(crop => [crop.id,crop])));
export function levelProgress(farm) {
  const thresholds = canonical.LEVEL_THRESHOLDS;
  const index = Math.min(thresholds.length-1,Math.max(0,(Number(farm.level)||1)-1));
  const floor = thresholds[index];
  const ceiling = thresholds[index+1];
  return {value:Math.max(0,(Number(farm.xp)||0)-floor),max:ceiling ? ceiling-floor : Math.max(1,(Number(farm.xp)||0)-floor),maxLevel:!ceiling};
}
export function itemQuantity(farm,itemId) {
  return itemId==='coins' || itemId==='diamonds' ? Number(farm[itemId])||0 : Number(farm.inventory?.[itemId])||0;
}
export function inventoryUsage(farm) { return Object.values(farm.inventory || {}).reduce((sum,value)=>sum+(Number(value)||0),0); }
export function isUnlocked(farm,definition) { return canonical.unlocked(Number(farm.level)||1,definition); }
