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
    this.decorations = new Map();
    this.alphaMasks = new WeakMap();
    this.loaded = false;
    this.loading = null;
  }

  async load() {
    if (this.loaded) return this;
    if (this.loading) return this.loading;
    if (!this.fetchImpl) throw new Error('PixiAssetRegistry requires fetch().');

    this.loading = this.#loadAll()
      .catch((error) => {
        this.#clearTextures();
        this.manifest = null;
        throw error;
      })
      .finally(() => { this.loading = null; });
    return this.loading;
  }

  async #loadAll() {
    // Production disallows blob workers; decode atlas images on the main thread.
    Assets.setPreferences({ preferWorkers: false });
    this.manifest = await this.#fetchJson(joinUrl(this.assetBase, 'manifests/animation-manifest.json'));
    const pages = this.manifest?.generated?.pages;
    // A malformed/null pages value must produce a useful manifest error rather
    // than leaking an Object.values(null) TypeError from the loader.
    if (!this.manifest || !pages || Array.isArray(pages) || typeof pages !== 'object') {
      throw new Error('Animation manifest has no generated atlas pages.');
    }

    for (const groupPages of Object.values(pages)) {
      if (!Array.isArray(groupPages)) throw new Error('Animation manifest atlas pages must be arrays.');
      for (const page of groupPages) await this.#loadAtlasPage(page);
    }

    // Decorative art can fail independently without disabling the playable map.
    await this.loadDecoration('decor_orchard_tree', 'design/sprites/orchard-tree-v1.png', {
      anchor: { x: 0.54, y: 0.93 },
    }).catch(() => null);

    this.loaded = true;
    return this;
  }

  async #loadAtlasPage(page) {
    if (!page?.json || !page?.image) throw new Error('Animation manifest contains an incomplete atlas page.');
    const atlasUrl = joinUrl(this.assetBase, `atlases/${page.json}`);
    const imageUrl = joinUrl(this.assetBase, `atlases/${page.image}`);
    const [atlasData, pageTexture] = await Promise.all([
      this.#fetchJson(atlasUrl),
      Assets.load(imageUrl),
    ]);

    if (!pageTexture?.source) throw new Error(`Pixi did not return a Texture for ${imageUrl}`);
    pageTexture.source.scaleMode = 'linear';
    this.pageTextures.set(page.image, pageTexture);

    const frames = atlasData?.frames;
    if (!frames || Array.isArray(frames) || typeof frames !== 'object') {
      throw new Error(`Atlas has no frame table: ${atlasUrl}`);
    }
    for (const [frameId, meta] of Object.entries(frames)) {
      const frame = meta?.frame;
      if (!frame || ![frame.x, frame.y, frame.w, frame.h].every(Number.isFinite)
        || frame.x < 0 || frame.y < 0 || frame.w <= 0 || frame.h <= 0) {
        throw new Error(`Invalid atlas frame ${frameId} in ${atlasUrl}`);
      }
      if (this.textures.has(frameId)) throw new Error(`Duplicate atlas frame ${frameId}`);
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
    return this.textures.has(frameId) || this.decorations.has(frameId);
  }

  texture(frameId) {
    return this.textures.get(frameId) || this.decorations.get(frameId)?.texture || Texture.EMPTY;
  }

  frame(frameId) {
    return this.frameMeta.get(frameId) || null;
  }

  asset(assetId) {
    return this.manifest?.assets?.[assetId] || this.decorations.get(assetId) || null;
  }

  async loadDecoration(assetId, path, { anchor = { x: 0.5, y: 0.96 }, sourceScale = 1 } = {}) {
    const texture = await Assets.load(joinUrl(this.assetBase, path));
    if (!texture?.source) throw new Error(`Cannot load decorative sprite: ${assetId}`);
    texture.source.scaleMode = 'linear';
    this.decorations.set(assetId, { texture, anchor, sourceScale });
    return texture;
  }

  textureContainsPoint(texture, x, y) {
    const width = texture.orig.width;
    const height = texture.orig.height;
    if (x < 0 || y < 0 || x >= width || y >= height) return false;
    // Cache alpha once per frame: transparent atlas margins must not catch taps.
    if (!this.alphaMasks.has(texture)) {
      let mask = null;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        const frame = texture.frame;
        context.drawImage(texture.source.resource, frame.x, frame.y, frame.width, frame.height, 0, 0, width, height);
        const pixels = context.getImageData(0, 0, width, height).data;
        mask = new Uint8Array(width * height);
        for (let index = 0; index < mask.length; index += 1) mask[index] = pixels[index * 4 + 3];
      } catch { /* Restricted image sources fall back to sprite bounds. */ }
      this.alphaMasks.set(texture, mask);
    }
    const mask = this.alphaMasks.get(texture);
    return !mask || mask[Math.floor(y) * width + Math.floor(x)] >= 24;
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
    this.#clearTextures();
    this.manifest = null;
    this.loaded = false;
  }

  #clearTextures() {
    for (const texture of this.textures.values()) texture.destroy(false);
    this.textures.clear();
    this.frameMeta.clear();
    this.pageTextures.clear();
    this.decorations.clear();
    this.alphaMasks = new WeakMap();
  }
}
