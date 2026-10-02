import { attributes, classNames, escapeHtml } from './html.js';

// Asset IDs belong to the existing approved manifest. UI glyphs are native controls,
// not additional production artwork and do not modify the 188-asset inventory.
export const ICON_REGISTRY = Object.freeze({
  coin:'icon_coin', coins:'icon_coin', diamond:'icon_diamond', diamonds:'icon_diamond',
  rice:'icon_rice', carrot:'icon_carrot', corn:'icon_corn', tomato:'icon_tomato',
  chicken_feed:'icon_chicken_feed', egg:'icon_egg', orders:'icon_order',
  chicken:'animal_chicken_idle_se_00', coop:'building_chicken_coop_lv1',
  farmhouse:'building_farmhouse_lv1', warehouse:'building_warehouse_lv1', pond:'pond_small_lv1_base',
  loading:'ui_loading', success:'ui_success_toast', error:'ui_error_toast', rotate:'ui_rotate_overlay',
});
const GLYPHS = Object.freeze({
  close:'<path d="m9 9 14 14M23 9 9 23"/>', plus:'<path d="M16 7v18M7 16h18"/>', minus:'<path d="M7 16h18"/>',
  back:'<path d="m19 7-9 9 9 9"/>', next:'<path d="m13 7 9 9-9 9"/>', check:'<path d="m6 16 7 7L26 9"/>',
  lock:'<rect x="7" y="14" width="18" height="14" rx="3"/><path d="M11 14V9a5 5 0 0 1 10 0v5M16 20v3"/>',
  settings:'<path d="m12 3 8 0 1 5 4 3 5 1v8l-5 1-4 3-1 5h-8l-1-5-4-3-5-1v-8l5-1 4-3z"/><circle cx="16" cy="16" r="5"/>',
  quests:'<rect x="7" y="5" width="19" height="24" rx="3"/><path d="M12 4h9v5h-9zM11 15l2 2 3-4m-5 10 2 2 3-4m4-6h3m-3 8h3"/>',
  shop:'<path d="M5 13v15h22V13M4 5h24l3 8H1zM12 28V18h8v10M10 5l-1 8m13-8 1 8"/>',
  build:'<path d="m7 28 14-17m-7-6 5-4 11 10-5 5z"/>',
  crops:'<path d="M16 29V15C5 16 2 7 3 3c10 0 15 5 13 12Zm0 3c0-11 5-15 14-14 0 10-5 16-14 14"/>',
  map:'<path d="m2 8 9-4 10 4 9-4v23l-9 4-10-4-9 4zM11 4v23M21 8v23"/>',
  home:'<path d="m2 14 14-12 14 12M6 12v17h20V12M13 29V19h7v10"/>',
  info:'<circle cx="16" cy="16" r="13"/><path d="M16 14v9M16 8v1"/>',
  sound:'<path d="M4 12h6l7-7v22l-7-7H4zM22 11q6 5 0 10M26 6q10 10 0 20"/>',
});

export function FarmIcon(name, { className = '', label = '' } = {}) {
  const assetId = ICON_REGISTRY[name];
  const accessibility = label ? { role:'img', 'aria-label':label } : { 'aria-hidden':'true' };
  if (assetId) return `<span${attributes({ class:classNames('farm-icon',className), ...accessibility })}><canvas width="160" height="160" data-asset="${assetId}"></canvas></span>`;
  if (GLYPHS[name]) return `<svg${attributes({ class:classNames('farm-icon','farm-glyph',className), ...accessibility })} viewBox="0 0 32 32" focusable="false">${GLYPHS[name]}</svg>`;
  return `<span${attributes({ class:classNames('farm-icon-gap',className), 'data-icon-gap':name, ...accessibility })}>${escapeHtml(label)}</span>`;
}

const pageCache = new Map();
async function loadPage(base, name) {
  const key = `${base}/atlases/${name}`;
  if (!pageCache.has(key)) pageCache.set(key, (async () => {
    const response = await fetch(`${key}.json`);
    if (!response.ok) throw new Error(`Icon atlas unavailable: ${response.status}`);
    const atlas = await response.json();
    const picture = new Image();
    picture.src = `${key}.png`;
    await picture.decode();
    return { frames:atlas.frames, image:picture };
  })().catch(error => { pageCache.delete(key); throw error; }));
  return pageCache.get(key);
}

export async function paintFarmIcons(root, registry = null) {
  const base = String(globalThis.__MO_FARM_CONFIG__?.assetBase || './public/assets').replace(/\/$/,'');
  const canvases = [...root.querySelectorAll('canvas[data-asset]')];
  await Promise.all(canvases.map(async canvas => {
    const id = canvas.dataset.asset;
    let meta = registry?.frame?.(id);
    let image = meta && registry.images.get(meta.atlas);
    if (!image) {
      const page = await loadPage(base, id.startsWith('animal_chicken_') ? 'chicken-0' : 'farm_common-0');
      meta = page.frames[id]; image = page.image;
    }
    if (!meta || !canvas.isConnected) return;
    const { x,y,w,h } = meta.frame;
    const context = canvas.getContext('2d');
    const scale = Math.min(canvas.width/w,canvas.height/h)*.94;
    context.clearRect(0,0,canvas.width,canvas.height);
    context.drawImage(image,x,y,w,h,(canvas.width-w*scale)/2,(canvas.height-h*scale)/2,w*scale,h*scale);
    canvas.parentElement.classList.add('art-loaded');
  }));
}
