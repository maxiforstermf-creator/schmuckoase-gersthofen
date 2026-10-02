// Mikro-Effekte: Cursor-Ring, Lichtschein auf Kacheln (nur Maus), Laufband reagiert auf
// Scroll-Tempo, Zahlen zählen hoch. Bei prefers-reduced-motion wird nichts davon gestartet.
const fine = matchMedia('(pointer: fine)').matches;

/* Cursor-Ring folgt der Maus, wird über klickbaren Elementen größer */
function cursor() {
  const el = document.createElement('div');
  el.className = 'cursor';
  el.setAttribute('aria-hidden', 'true');
  document.body.append(el);
  let x = -100, y = -100, cx = x, cy = y, shown = false;
  const HOVER = 'a, button, [role="radio"], input, select, textarea, summary, label';
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    x = e.clientX; y = e.clientY;
    if (!shown) { cx = x; cy = y; shown = true; el.classList.add('is-on'); }
    el.classList.toggle('is-hover', !!e.target.closest?.(HOVER));
  }, { passive: true });
  document.addEventListener('pointerleave', () => { el.classList.remove('is-on'); shown = false; });
  addEventListener('pointerdown', () => el.classList.add('is-down'));
  addEventListener('pointerup', () => el.classList.remove('is-down'));
  const tick = () => {
    cx += (x - cx) * 0.2; cy += (y - cy) * 0.2;
    el.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* Goldener Lichtschein, der auf Kacheln der Maus folgt */
function spotlight() {
  const SEL = '.buy, .service, .card, .rate, .review, .alloy, .calc__add';
  let last = null;
  addEventListener('pointermove', (e) => {
    const el = e.target.closest?.(SEL);
    if (last && last !== el) last.classList.remove('is-lit');
    last = el;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
    el.classList.add('is-lit');
  }, { passive: true });
}

/* Laufband: schneller beim Scrollen, in Scroll-Richtung */
function marquee() {
  const anim = document.querySelector('.marquee__track')?.getAnimations?.()[0];
  if (!anim) return;
  let lastY = scrollY, rate = 1, raf = 0;
  const settle = () => {
    rate += (1 - rate) * 0.06;
    anim.playbackRate = rate;
    if (Math.abs(rate - 1) > 0.01) raf = requestAnimationFrame(settle); else { anim.playbackRate = 1; raf = 0; }
  };
  addEventListener('scroll', () => {
    const v = scrollY - lastY; lastY = scrollY;
    rate = Math.max(-6, Math.min(6, 1 + v * 0.12));
    if (!raf) raf = requestAnimationFrame(settle);
  }, { passive: true });
}

/* Zahlen zählen hoch, sobald sie sichtbar werden: <b data-count="30" data-suffix="+">30+</b> */
function counters() {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      const el = e.target, end = Number(el.dataset.count), suf = el.dataset.suffix || '', t0 = performance.now();
      const step = (t) => {
        const p = Math.min((t - t0) / 1600, 1);
        el.textContent = Math.round(end * (1 - Math.pow(1 - p, 4))) + suf;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach((el) => io.observe(el));
}

export function init() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (fine) { cursor(); spotlight(); }
  marquee();
  counters();
}
