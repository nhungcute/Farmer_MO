export function rectIntersects(a, b) {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

export function entityWorldBounds(entity, defaultHalfSize = 96) {
  const halfWidth = Math.max(1, Number(entity.cullHalfWidth) || defaultHalfSize);
  const halfHeight = Math.max(1, Number(entity.cullHalfHeight) || defaultHalfSize);
  return {
    minX: entity.worldX - halfWidth,
    maxX: entity.worldX + halfWidth,
    minY: entity.worldY - halfHeight,
    maxY: entity.worldY + halfHeight,
  };
}

export function isEntityVisible(entity, visibleWorldRect, defaultHalfSize = 96) {
  return rectIntersects(entityWorldBounds(entity, defaultHalfSize), visibleWorldRect);
}
