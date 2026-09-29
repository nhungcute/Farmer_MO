export const DEFAULT_ISO = Object.freeze({ tileWidth: 128, tileHeight: 64 });

export function isoToWorld(gridX, gridY, tileWidth = DEFAULT_ISO.tileWidth, tileHeight = DEFAULT_ISO.tileHeight) {
  return {
    x: (gridX - gridY) * tileWidth * 0.5,
    y: (gridX + gridY) * tileHeight * 0.5,
  };
}

export function worldToIso(worldX, worldY, tileWidth = DEFAULT_ISO.tileWidth, tileHeight = DEFAULT_ISO.tileHeight) {
  const a = worldX / (tileWidth * 0.5);
  const b = worldY / (tileHeight * 0.5);
  return {
    x: (a + b) * 0.5,
    y: (b - a) * 0.5,
  };
}

export function worldToCell(worldX, worldY, tileWidth = DEFAULT_ISO.tileWidth, tileHeight = DEFAULT_ISO.tileHeight) {
  const point = worldToIso(worldX, worldY, tileWidth, tileHeight);
  return { x: Math.floor(point.x), y: Math.floor(point.y) };
}

export function tileDiamond(gridX, gridY, tileWidth = DEFAULT_ISO.tileWidth, tileHeight = DEFAULT_ISO.tileHeight) {
  const center = isoToWorld(gridX, gridY, tileWidth, tileHeight);
  const halfW = tileWidth * 0.5;
  const halfH = tileHeight * 0.5;
  return [
    { x: center.x, y: center.y - halfH },
    { x: center.x + halfW, y: center.y },
    { x: center.x, y: center.y + halfH },
    { x: center.x - halfW, y: center.y },
  ];
}

export function mapWorldBounds(width, height, tileWidth = DEFAULT_ISO.tileWidth, tileHeight = DEFAULT_ISO.tileHeight) {
  const corners = [
    isoToWorld(0, 0, tileWidth, tileHeight),
    isoToWorld(width, 0, tileWidth, tileHeight),
    isoToWorld(0, height, tileWidth, tileHeight),
    isoToWorld(width, height, tileWidth, tileHeight),
  ];
  const xs = corners.map((point) => point.x);
  const ys = corners.map((point) => point.y);
  return {
    minX: Math.min(...xs) - tileWidth * 0.5,
    maxX: Math.max(...xs) + tileWidth * 0.5,
    minY: Math.min(...ys) - tileHeight * 0.5,
    maxY: Math.max(...ys) + tileHeight * 0.5,
  };
}

export function depthFromGrid(gridX, gridY, renderOffsetY = 0, tileHeight = DEFAULT_ISO.tileHeight) {
  return (gridX + gridY) * tileHeight * 0.5 + renderOffsetY;
}
