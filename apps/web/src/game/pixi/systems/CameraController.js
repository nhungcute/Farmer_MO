import { CameraModel } from '../../core/CameraModel.js';

export class CameraController {
  constructor({ worldContainer, viewportWidth = 1, viewportHeight = 1, minZoom = 0.7, maxZoom = 1.3 } = {}) {
    this.worldContainer = worldContainer;
    this.model = new CameraModel({ viewportWidth, viewportHeight, minZoom, maxZoom, zoom: 1 });
    this.apply();
  }

  setViewport(width, height) {
    this.model.setViewport(width, height);
    this.apply();
  }

  setBounds(bounds, { padding = 128, fit = false } = {}) {
    this.model.setBounds(bounds, padding);
    if (fit) this.model.fitBounds(bounds, { padding: 36, maxZoom: 1 });
    this.apply();
  }

  panByScreen(dx, dy) {
    this.model.panByScreen(dx, dy);
    this.apply();
  }

  zoomAt(screenX, screenY, zoom) {
    this.model.zoomAtScreen(screenX, screenY, zoom);
    this.apply();
  }

  focus(worldX, worldY, zoom = this.model.zoom) {
    this.model.focus(worldX, worldY, zoom);
    this.apply();
  }

  apply() {
    const camera = this.model;
    this.worldContainer.scale.set(camera.zoom);
    this.worldContainer.position.set(
      camera.viewportWidth * 0.5 - camera.x * camera.zoom,
      camera.viewportHeight * 0.5 - camera.y * camera.zoom,
    );
  }
}
