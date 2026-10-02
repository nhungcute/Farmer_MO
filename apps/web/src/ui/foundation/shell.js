import { escapeHtml } from './html.js';

export const SHELL_REGIONS = Object.freeze(['hud','navigation','toolbar','canvas','context','modal','toast']);
export function FarmShell({ hud='',navigation='',toolbar='',context='',sidebar='',modal='',toast='',status='',world='' } = {}) {
  return `<section class="game farm-ui farm-shell" data-ui-foundation="1">
    <div class="farm-shell__world world-wrap" data-region="canvas"><canvas id="farm-canvas" aria-label="Bản đồ nông trại"></canvas><div id="game-renderer-host" hidden aria-label="Cảnh nông trại"></div>${world}</div>
    <header class="farm-shell__hud" data-region="hud" aria-label="Thông tin nông trại">${hud}</header>
    <nav class="farm-shell__navigation side-nav" data-region="navigation" aria-label="Quản lý nông trại">${navigation}</nav>
    <nav class="farm-shell__toolbar live-toolbar" data-region="toolbar" aria-label="Công cụ nông trại">${toolbar}</nav>
    <aside class="farm-shell__sidebar quest-sidebar" aria-label="Nhiệm vụ và đơn hàng">${sidebar}</aside>
    <aside class="farm-shell__context" data-region="context" aria-label="Thao tác nông trại"${context ? '' : ' hidden'}>${context}</aside>
    <div class="farm-shell__status" id="status" role="status">${escapeHtml(status)}</div>
    <div class="farm-shell__modal" data-region="modal">${modal}</div>
    <div class="farm-shell__toast" data-region="toast" aria-live="polite">${toast}</div>
  </section>`;
}
export function EntryShell({ body='',footer='',className='' } = {}) {
  return `<section class="farm-ui farm-entry ${escapeHtml(className)}"><div class="farm-entry__body">${body}</div>${footer ? `<footer class="farm-entry__footer">${footer}</footer>` : ''}</section>`;
}
