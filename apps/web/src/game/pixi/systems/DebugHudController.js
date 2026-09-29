export class DebugHudController {
  constructor({ host, enabled = false } = {}) {
    this.host = host;
    this.enabled = Boolean(enabled);
    this.element = document.createElement('pre');
    this.element.className = 'mo-renderer-debug';
    Object.assign(this.element.style, {
      position: 'absolute', right: '10px', top: '10px', zIndex: '20', margin: '0', padding: '8px 10px',
      borderRadius: '8px', background: 'rgba(12, 37, 27, .82)', color: '#f5ffe8', border: '1px solid rgba(255,255,255,.22)',
      font: '12px/1.35 ui-monospace, SFMono-Regular, Consolas, monospace', pointerEvents: 'none', whiteSpace: 'pre',
    });
    host.appendChild(this.element);
    this.element.hidden = !this.enabled;
    this.lastUpdate = 0;
    this.fps = 0;
    this.frameSamples = [];
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    this.element.hidden = !this.enabled;
  }

  update(now, deltaMs, data) {
    if (!this.enabled) return;
    this.frameSamples.push(deltaMs);
    if (this.frameSamples.length > 45) this.frameSamples.shift();
    if (now - this.lastUpdate < 250) return;
    this.lastUpdate = now;
    const avg = this.frameSamples.reduce((sum, value) => sum + value, 0) / Math.max(1, this.frameSamples.length);
    this.fps = avg > 0 ? 1000 / avg : 0;
    const camera = data.camera;
    const scene = data.scene;
    this.element.textContent = [
      'MO FARM · BỘ HIỂN THỊ',
      `Khung hình       ${this.fps.toFixed(1)}`,
      `Mật độ điểm ảnh  ${data.dpr.toFixed(2)}`,
      `Khung nhìn       ${Math.round(camera.viewportWidth)}×${Math.round(camera.viewportHeight)}`,
      `Thu phóng        ${camera.zoom.toFixed(2)}`,
      `Camera           ${camera.x.toFixed(0)}, ${camera.y.toFixed(0)}`,
      '',
      `Đối tượng        ${scene.objects}`,
      `Hiển thị         ${scene.visible}`,
      `Đã loại          ${scene.culled}`,
      `Đang chạy        ${scene.animated}`,
      `Hiệu ứng         ${scene.effects}`,
      `Ô địa hình       ${scene.terrainTiles}`,
      `Atlas            ${data.atlasPages}`,
    ].join('\n');
  }

  destroy() { this.element.remove(); }
}
