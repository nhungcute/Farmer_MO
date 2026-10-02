export const FOUNDATION_VERSION = 'ui-v1';
export const UI_TARGETS = Object.freeze([
  {name:'desktop',width:1920,height:1080}, {name:'ipad-landscape',width:1366,height:1024},
  {name:'932x430',width:932,height:430}, {name:'915x412',width:915,height:412},
  {name:'844x390',width:844,height:390}, {name:'740x360',width:740,height:360},
].map(Object.freeze));

export function createScreenRegistry() {
  const screens = new Map();
  return Object.freeze({
    register(id,render) {
      if (!/^ui\d{2}-[a-z-]+$/.test(id) || typeof render!=='function') throw new TypeError('A screen needs a stable task ID and render function.');
      if (screens.has(id)) throw new Error(`Screen already registered: ${id}`);
      screens.set(id,render);
    },
    render(id,props={}) {
      const render = screens.get(id);
      if (!render) throw new Error(`Screen is not registered: ${id}`);
      return render(props);
    },
    has(id) { return screens.has(id); },
  });
}
