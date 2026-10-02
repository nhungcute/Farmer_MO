const openers = new WeakMap();

export function openFarmModal(dialog, opener = document.activeElement) {
  if (!dialog) return;
  if (dialog.matches(':modal')) return;
  openers.set(dialog,opener);
  // A dialog rendered with an open attribute must enter the native top layer.
  if (dialog.open) dialog.close();
  dialog.showModal();
}
export function closeFarmModal(dialog) {
  if (!dialog) return;
  dialog.close();
  const opener = openers.get(dialog);
  if (opener?.isConnected) opener.focus();
  openers.delete(dialog);
}
/** Delegated behavior survives screen rerenders; the returned cleanup is required. */
export function attachFoundation(root) {
  const controller = new AbortController();
  const options = { signal:controller.signal };
  root.addEventListener('keydown',event => {
    if (event.key === 'Tab') {
      const dialog = event.target.closest?.('dialog.farm-modal:modal');
      if (dialog) {
        const controls = [...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex]')]
          .filter(node => node.tabIndex >= 0 && node.getClientRects().length);
        const first = controls[0], last = controls.at(-1);
        if (first && ((event.shiftKey && (event.target === first || event.target === dialog)) || (!event.shiftKey && event.target === last))) {
          event.preventDefault(); (event.shiftKey ? last : first).focus();
        }
      }
    }
    const selected = event.target.closest('[role="tab"]');
    if (!selected || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    const tabs = [...selected.closest('[role="tablist"]').querySelectorAll('[role="tab"]:not(:disabled)')];
    if (!tabs.length) return;
    event.preventDefault();
    const current = tabs.indexOf(selected);
    const next = event.key==='Home' ? 0 : event.key==='End' ? tabs.length-1 : (current+(event.key==='ArrowRight' ? 1 : -1)+tabs.length)%tabs.length;
    tabs[next].focus(); tabs[next].click();
  },options);
  root.addEventListener('click',event => {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    if (button.dataset.action==='dismiss-toast') button.closest('.farm-toast')?.remove();
    if (button.dataset.action==='close') {
      const dialog = button.closest('dialog.farm-modal');
      if (dialog) closeFarmModal(dialog);
    }
  },options);
  root.addEventListener('close',event => {
    const opener = openers.get(event.target);
    if (opener?.isConnected) opener.focus();
    openers.delete(event.target);
  },{...options,capture:true});
  return () => controller.abort();
}
