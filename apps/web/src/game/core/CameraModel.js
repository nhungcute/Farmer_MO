function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export class CameraModel {
  constructor({ minZoom = 0.7, maxZoom = 1.3, zoom = 1, viewportWidth = 1, viewportHeight = 1 } = {}) {
    this.minZoom = minZoom;
    this.maxZoom = maxZoom;
    this.zoom = clamp(zoom, minZoom, maxZoom);
    this.x = 0;
    this.y = 0;
    this.viewportWidth = Math.max(1, viewportWidth);
    this.viewportHeight = Math.max(1, viewportHeight);
    this.bounds = null;
    this.padding = 96;
  }

  setViewport(width, height) {
    this.viewportWidth = Math.max(1, width);
    this.viewportHeight = Math.max(1, height);
    this.clampToBounds();
  }

  setBounds(bounds, padding = this.padding) {
    this.bounds = bounds ? { ...bounds } : null;
    this.padding = padding;
    this.clampToBounds();
  }

  setZoom(nextZoom) {
    this.zoom = clamp(nextZoom, this.minZoom, this.maxZoom);
    this.clampToBounds();
    return this.zoom;
  }

  panByScreen(deltaX, deltaY) {
    this.x -= deltaX / this.zoom;
    this.y -= deltaY / this.zoom;
    this.clampToBounds();
  }

  zoomAtScreen(screenX, screenY, nextZoom) {
    const before = this.screenToWorld(screenX, screenY);
    this.zoom = clamp(nextZoom, this.minZoom, this.maxZoom);
    const after = this.screenToWorld(screenX, screenY);
    this.x += before.x - after.x;
    this.y += before.y - after.y;
    this.clampToBounds();
    return this.zoom;
  }

  worldToScreen(worldX, worldY) {
    return {
      x: (worldX - this.x) * this.zoom + this.viewportWidth * 0.5,
      y: (worldY - this.y) * this.zoom + this.viewportHeight * 0.5,
    };
  }

  screenToWorld(screenX, screenY) {
    return {
      x: (screenX - this.viewportWidth * 0.5) / this.zoom + this.x,
      y: (screenY - this.viewportHeight * 0.5) / this.zoom + this.y,
    };
  }

  focus(worldX, worldY, zoom = this.zoom) {
    this.x = worldX;
    this.y = worldY;
    this.setZoom(zoom);
  }

  fitBounds(bounds, { padding = 48, maxZoom = 1 } = {}) {
    if (!bounds) return this.zoom;
    const width = Math.max(1, bounds.maxX - bounds.minX);
    const height = Math.max(1, bounds.maxY - bounds.minY);
    const zoomX = (this.viewportWidth - padding * 2) / width;
    const zoomY = (this.viewportHeight - padding * 2) / height;
    this.x = (bounds.minX + bounds.maxX) * 0.5;
    this.y = (bounds.minY + bounds.maxY) * 0.5;
    this.zoom = clamp(Math.min(zoomX, zoomY, maxZoom), this.minZoom, this.maxZoom);
    this.clampToBounds();
    return this.zoom;
  }

  visibleWorldRect(margin = 0) {
    const topLeft = this.screenToWorld(-margin, -margin);
    const bottomRight = this.screenToWorld(this.viewportWidth + margin, this.viewportHeight + margin);
    return {
      minX: Math.min(topLeft.x, bottomRight.x),
      minY: Math.min(topLeft.y, bottomRight.y),
      maxX: Math.max(topLeft.x, bottomRight.x),
      maxY: Math.max(topLeft.y, bottomRight.y),
    };
  }

  clampToBounds() {
    if (!this.bounds) return;
    const halfW = this.viewportWidth * 0.5 / this.zoom;
    const halfH = this.viewportHeight * 0.5 / this.zoom;
    const minX = this.bounds.minX - this.padding + halfW;
    const maxX = this.bounds.maxX + this.padding - halfW;
    const minY = this.bounds.minY - this.padding + halfH;
    const maxY = this.bounds.maxY + this.padding - halfH;

    this.x = minX <= maxX ? clamp(this.x, minX, maxX) : (this.bounds.minX + this.bounds.maxX) * 0.5;
    this.y = minY <= maxY ? clamp(this.y, minY, maxY) : (this.bounds.minY + this.bounds.maxY) * 0.5;
  }
}
