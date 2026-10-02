export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[character]));
}

const ATTRIBUTES = new Set(['id','class','type','role','title','name','value','min','max','step','for','form','tabindex','autocomplete','maxlength','placeholder','disabled','hidden','open','required','readonly']);
export function attributes(values = {}) {
  return Object.entries(values).filter(([key, value]) =>
    (ATTRIBUTES.has(key) || /^(?:data|aria)-[a-z][a-z0-9-]*$/.test(key)) && value !== undefined && value !== null && value !== false,
  ).map(([key, value]) => value === true ? ` ${key}` : ` ${key}="${escapeHtml(value)}"`).join('');
}
export function classNames(...values) { return values.filter(Boolean).join(' '); }
export function formatNumber(value) { return new Intl.NumberFormat('vi-VN').format(Number(value) || 0); }
