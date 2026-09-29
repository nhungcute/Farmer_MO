export class DebugHudController {
  constructor({ host, enabled = false } = {}) {
    this.host = host;
    this.enabled = enabled;
    this.element = document.createElement('pre');
    this.element.className = 'mo-renderer-debug';
    Object.assign(this.element.style, {
      position: 'absolute', right: '10px', top: '10px', zIndex: '20', margin: '0', padding: '8px 10px',
      borderRadius: '8px', background: 'rgba(12, 37, 27, .82)', color: '#f5ffe8', border: '1px solid rgba(255,255,255,.22)',
      font: '12px/1.35 ui-monospace, SFMono-Regular, Consolas, monospace', pointerEvents: 'none', whiteSpace: 'pre',
    });
    host.appendChild(this.element);
    this.element.hidden = !enabled;
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
      'MỠ FARM RENDERER',
      `FPS       ${this.fps.toFixed(1)}`,
      `DPR       ${data.dpr.toFixed(2)}`,
      `Viewport  ${Math.round(camera.viewportWidth)}×${Math.round(camera.viewportHeight)}`,
      `Zoom      ${camera.zoom.toFixed(2)}`,
      `Camera    ${camera.x.toFixed(0)}, ${camera.y.toFixed(0)}`,
      '',
      `Objects   ${scene.objects}`,
      `Visible   ${scene.visible}`,
      `Animated  ${scene.animated}`,
      `Effects   ${scene.effects}`,
      `Tiles     ${scene.terrainTiles}`,
      `Atlases   ${data.atlasPages}`,
    ].join('\n');
  }

  destroy() { this.element.remove(); }
}
