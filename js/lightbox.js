// Galerie-Lightbox mit <dialog>: Tastatur (←/→/Esc), Fokus bleibt im Dialog.
export function init() {
  const gallery = document.querySelector('[data-gallery]');
  const dlg = document.getElementById('lightbox');
  if (!gallery || !dlg) return;
  const items = [...gallery.querySelectorAll('[data-full]')];
  const img = dlg.querySelector('[data-lb-img]');
  const cap = dlg.querySelector('[data-lb-cap]');
  let idx = 0, opener = null;

  const show = (i) => {
    idx = (i + items.length) % items.length;
    const it = items[idx];
    const alt = it.querySelector('img')?.alt || '';
    img.src = it.dataset.full;
    img.alt = alt;
    cap.textContent = `${idx + 1} / ${items.length} · ${alt}`;
  };
  items.forEach((it, i) => it.addEventListener('click', () => { opener = it; show(i); dlg.showModal(); }));
  dlg.querySelector('[data-lb-prev]').addEventListener('click', () => show(idx - 1));
  dlg.querySelector('[data-lb-next]').addEventListener('click', () => show(idx + 1));
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(idx - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(idx + 1); }
  });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  // Wischen (Finger, Stift oder Maus ziehen): links = nächstes, rechts = vorheriges Bild
  let x0 = null, y0 = 0;
  img.addEventListener('pointerdown', (e) => { x0 = e.clientX; y0 = e.clientY; });
  img.addEventListener('pointerup', (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) show(idx + (dx < 0 ? 1 : -1));
    x0 = null;
  });
  img.addEventListener('pointercancel', () => { x0 = null; });
  img.draggable = false;
  dlg.addEventListener('close', () => opener?.focus());
}
