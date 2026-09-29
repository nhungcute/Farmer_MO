import { Assets, Rectangle, Texture } from 'pixi.js';

function joinUrl(base, path) {
  const cleanBase = String(base || '').replace(/\/$/, '');
  const cleanPath = String(path || '').replace(/^\//, '');
  return `${cleanBase}/${cleanPath}`;
}

export class PixiAssetRegistry {
  constructor({ assetBase = './public/assets', fetchImpl = globalThis.fetch?.bind(globalThis) } = {}) {
    this.assetBase = String(assetBase || './public/assets').replace(/\/$/, '');
    this.fetchImpl = fetchImpl;
    this.manifest = null;
    this.textures = new Map();
    this.frameMeta = new Map();
    this.pageTextures = new Map();
    this.loaded = false;
  }

  async load() {
    if (this.loaded) return this;
    if (!this.fetchImpl) throw new Error('PixiAssetRegistry requires fetch().');

    this.manifest = await this.#fetchJson(joinUrl(this.assetBase, 'manifests/animation-manifest.json'));
    const pages = this.manifest.generated?.pages || {};

    for (const groupPages of Object.values(pages)) {
      for (const page of groupPages) await this.#loadAtlasPage(page);
    }

    this.loaded = true;
    return this;
  }

  async #loadAtlasPage(page) {
    const atlasUrl = joinUrl(this.assetBase, `atlases/${page.json}`);
    const imageUrl = joinUrl(this.assetBase, `atlases/${page.image}`);
    const [atlasData, pageTexture] = await Promise.all([
      this.#fetchJson(atlasUrl),
      Assets.load(imageUrl),
    ]);

    if (!pageTexture?.source) throw new Error(`Pixi did not return a Texture for ${imageUrl}`);
    pageTexture.source.scaleMode = 'linear';
    this.pageTextures.set(page.image, pageTexture);

    for (const [frameId, meta] of Object.entries(atlasData.frames || {})) {
      const frame = meta.frame;
      const texture = new Texture({
        source: pageTexture.source,
        frame: new Rectangle(frame.x, frame.y, frame.w, frame.h),
      });
      texture.label = frameId;
      this.textures.set(frameId, texture);
      this.frameMeta.set(frameId, { ...meta, atlasImage: page.image, atlasJson: page.json });
    }
  }

  async #fetchJson(url) {
    const response = await this.fetchImpl(url, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Cannot load ${url}: HTTP ${response.status}`);
    return response.json();
  }

  has(frameId) {
    return this.textures.has(frameId);
  }

  texture(frameId) {
    return this.textures.get(frameId) || Texture.EMPTY;
  }

  frame(frameId) {
    return this.frameMeta.get(frameId) || null;
  }

  asset(assetId) {
    return this.manifest?.assets?.[assetId] || null;
  }

  sourceScale(assetId) {
    return Number(this.asset(assetId)?.sourceScale) || Number(this.manifest?.sourceScale) || 1;
  }

  anchor(assetId, fallback = { x: 0.5, y: 0.5 }) {
    return { ...fallback, ...(this.asset(assetId)?.anchor || {}) };
  }

  renderOffset(assetId) {
    return { x: 0, y: 0, ...(this.asset(assetId)?.renderOffset || {}) };
  }

  destroy() {
    for (const texture of this.textures.values()) texture.destroy(false);
    this.textures.clear();
    this.frameMeta.clear();
    this.pageTextures.clear();
    this.loaded = false;
  }
}
