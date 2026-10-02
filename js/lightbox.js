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
  dlg.addEventListener('close', () => opener?.focus());
}
