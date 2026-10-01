/** Native controls positioned on the unmodified screen artwork in the design pack. */
const SHEET = { width: 1448, height: 1086 };
const FRAMES = {
  login: { file: '01_Login.png', x: 98, y: 750, width: 596, height: 260 },
  loading: { file: '02_Loading.png', x: 101, y: 755, width: 586, height: 272 },
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
}

function sceneMarkup(name, controls, assetBase) {
  const frame = FRAMES[name];
  const base = String(assetBase || globalThis.__MO_FARM_CONFIG__?.assetBase || './public/assets').replace(/\/$/, '');
  const source = escapeHtml(`${base}/design/reference/${frame.file}`);
  const imageStyle = `width:${SHEET.width / frame.width * 100}%;height:${SHEET.height / frame.height * 100}%;left:${-frame.x / frame.width * 100}%;top:${-frame.y / frame.height * 100}%`;
  return `<section class="reference-entry reference-entry--${name}" aria-label="${name === 'login' ? 'Mỡ Farm — Đăng nhập' : 'Đang tải nông trại'}" style="--entry-ratio:${frame.width / frame.height}"><div class="reference-entry__scene"><img class="reference-entry__sheet" src="${source}" style="${imageStyle}" alt="" draggable="false" decoding="sync" fetchpriority="high">${controls}</div></section>`;
}

export function loginMarkup(error = '', assetBase) {
  return sceneMarkup('login', `<h1 class="reference-entry__sr">Mỡ Farm</h1><form id="login-form" class="reference-entry__form" novalidate><label for="farmer-name" class="reference-entry__sr">Tên người chơi</label><input id="farmer-name" class="reference-entry__name" name="name" autocomplete="nickname" maxlength="24" placeholder=" " required aria-describedby="login-error"><button class="reference-entry__enter" type="submit" aria-label="Vào nông trại"><span class="reference-entry__sr">Vào nông trại</span></button><p id="login-error" class="reference-entry__error" role="alert">${escapeHtml(error)}</p></form>`, assetBase);
}

export function loadingMarkup(assetBase) {
  return sceneMarkup('loading', `<h1 class="reference-entry__sr">Đang tải nông trại…</h1><div class="loading-track reference-entry__progress" role="progressbar" aria-label="Tiến trình tải" aria-valuemin="0" aria-valuemax="100" aria-valuenow="10"><span style="width:10%"></span><b class="loading-percent">10%</b></div><p class="loading-status reference-entry__status" role="status" aria-live="polite">Đang tải tài nguyên game…</p>`, assetBase);
}
