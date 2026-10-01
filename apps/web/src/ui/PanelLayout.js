/** Fit native inventory and shop panels inside the current game viewport. */
export function alignPanel(dialog) {
  if (!dialog?.classList.contains('warehouse-dialog') && !dialog?.classList.contains('shop-dialog')) return;
  const stage = document.querySelector('.live-stage')?.getBoundingClientRect();
  if (!stage) return;
  const shop = dialog.classList.contains('shop-dialog');
  const width = shop ? 970 : 980;
  const height = shop ? 524 : 445;
  const scale = Math.min(stage.width / 1010, (innerWidth - 20) / width, (innerHeight - 32) / height);
  dialog.style.setProperty('--reference-scale', String(scale));
  dialog.style.setProperty('--reference-left', `${Math.max(10, stage.left + (stage.width - width * scale) / 2)}px`);
  dialog.style.setProperty('--reference-top', `${Math.max(16, stage.top + (stage.height - height * scale) / 2)}px`);
}
