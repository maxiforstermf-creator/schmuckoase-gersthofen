// Einstieg für alle Seiten: kleine, sofort nötige Interaktionen.
// Schwere Module (3D-Ring, Rechner, Scroll-Story, Lenis …) werden bei Bedarf nachgeladen.
import { WHATSAPP_NUMMER, MAPS_QUERY } from './config.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;
const idle = (fn, timeout = 2000) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout }) : setTimeout(fn, 200));

/* ── WhatsApp- & Routen-Links aus der Config ─────────────────────────────── */
export function waHref(text) {
  if (!WHATSAPP_NUMMER) return '/kontakt/#whatsapp';
  return `https://wa.me/${WHATSAPP_NUMMER}?text=${encodeURIComponent(text)}`;
}
function initLinks() {
  for (const a of $$('[data-wa]')) {
    a.href = waHref(a.dataset.wa);
    if (WHATSAPP_NUMMER) { a.target = '_blank'; a.rel = 'noopener'; }
  }
  const route = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(MAPS_QUERY)}`;
  for (const a of $$('[data-route]')) a.href = route;
  for (const el of $$('[data-year]')) el.textContent = new Date().getFullYear();
}

/* ── Header: kompakt beim Scrollen, Menü, Untermenü ──────────────────────── */
function initHeader() {
  const header = $('#header');
  if (!header) return;
  let ticking = false, lastY = scrollY;
  const mobile = matchMedia('(max-width: 899px)');
  const update = () => {
    const y = scrollY;
    header.classList.toggle('is-scrolled', y > 24);
    // Handy: beim Runterscrollen ausblenden (mehr Platz), beim Hochscrollen sofort zeigen
    if (mobile.matches && !document.body.classList.contains('menu-open')) {
      if (y > lastY + 6 && y > 140) header.classList.add('is-hidden');
      else if (y < lastY - 6 || y < 140) header.classList.remove('is-hidden');
    } else header.classList.remove('is-hidden');
    lastY = y; ticking = false;
  };
  header.addEventListener('focusin', () => header.classList.remove('is-hidden'));
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();

  const burger = $('.burger', header);
  const menu = $('#mobile-menu');
  const setMenu = (open) => {
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    menu.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    header.classList.toggle('is-scrolled', open || scrollY > 24);
    menu.inert = !open;
    if (open) $('.mm-main', menu)?.focus({ preventScroll: true });
  };
  if (burger && menu) {
    menu.inert = true;
    burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('is-open')) { setMenu(false); burger.focus(); } });
  }

  // Mobile-Menü: Akkordeon, immer nur eine Gruppe offen; aktuelle Gruppe startet geöffnet
  const toggles = $$('.mm-toggle', menu || document);
  const setGroup = (btn, open) => btn.setAttribute('aria-expanded', open);
  for (const btn of toggles) {
    if (btn.parentElement.querySelector('[aria-current="page"]')) setGroup(btn, true);
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      toggles.forEach((b) => setGroup(b, b === btn && open));
    });
  }

  for (const li of $$('.has-sub', header)) {
    const btn = $('.nav__trigger', li);
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', open);
      li.classList.toggle('is-open', open);
    });
    li.addEventListener('focusout', (e) => {
      if (!li.contains(e.relatedTarget)) { btn.setAttribute('aria-expanded', 'false'); li.classList.remove('is-open'); }
    });
    li.addEventListener('keydown', (e) => { if (e.key === 'Escape') { btn.setAttribute('aria-expanded', 'false'); li.classList.remove('is-open'); btn.focus(); } });
  }
}

/* ── Reveal, Shimmer, Linien ─────────────────────────────────────────────── */
function initReveal() {
  const els = $$('[data-reveal], .shimmer');
  if (reducedMotion || !('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('is-in')); return; }
  // Maskierte Elemente (clip-path) zählen für den Observer als unsichtbar →
  // stattdessen das Elternelement beobachten.
  const proxy = new Map();
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      (proxy.get(e.target) || [e.target]).forEach((el) => el.classList.add('is-in'));
      io.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });
  for (const el of els) {
    if (el.dataset.reveal === 'mask' && el.parentElement) {
      const t = el.parentElement;
      proxy.set(t, [...(proxy.get(t) || []), el]);
      io.observe(t);
    } else io.observe(el);
  }
}

/* ── Mobile Sticky-Bar: erscheint nach dem Hero ──────────────────────────── */
function initStickyBar() {
  const bar = $('.sticky-bar');
  if (!bar) return;
  const hero = $('.hero, .page-hero');
  if (!hero) { bar.classList.add('is-visible'); return; }
  new IntersectionObserver(([e]) => bar.classList.toggle('is-visible', !e.isIntersecting && e.boundingClientRect.top < 0))
    .observe(hero);
}

/* ── Magnetische Buttons (nur Desktop) ───────────────────────────────────── */
function initMagnetic() {
  if (!finePointer || reducedMotion) return;
  for (const el of $$('[data-magnetic]')) {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * 0.22;
      const y = (e.clientY - r.top - r.height / 2) * 0.3;
      el.style.transform = `translate(${x}px, ${y}px)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  }
}

/* ── Bewertungs-Slider ───────────────────────────────────────────────────── */
function initReviews() {
  for (const root of $$('[data-reviews]')) {
    const track = $('.reviews__track', root);
    const prev = $('[data-prev]', root);
    const next = $('[data-next]', root);
    const step = () => (track.firstElementChild?.getBoundingClientRect().width || 300) + 24;
    const sync = () => {
      prev.disabled = track.scrollLeft < 8;
      next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 8;
    };
    prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: reducedMotion ? 'auto' : 'smooth' }));
    next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: reducedMotion ? 'auto' : 'smooth' }));
    track.addEventListener('scroll', () => requestAnimationFrame(sync), { passive: true });
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); next.click(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev.click(); }
    });
    sync();
  }
}

/* ── Karte: 2-Klick-Lösung ───────────────────────────────────────────────── */
function initMap() {
  for (const box of $$('[data-map]')) {
    $('button', box)?.addEventListener('click', () => {
      const f = document.createElement('iframe');
      f.src = `https://www.google.com/maps?q=${encodeURIComponent(MAPS_QUERY)}&output=embed`;
      f.title = 'Google Maps – Lage der SchmuckOase, Bahnhofstraße 18, Gersthofen';
      f.loading = 'lazy';
      f.referrerPolicy = 'no-referrer-when-downgrade';
      box.replaceChildren(f);
    }, { once: true });
  }
}

/* ── Lazy-Module ─────────────────────────────────────────────────────────── */
function whenNear(el, fn, margin = '600px') {
  if (!el) return;
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); fn(); } }, { rootMargin: margin });
  io.observe(el);
}

function initModules() {
  const calc = $('[data-calc]');
  const rates = $('[data-rates]');
  if (calc || rates) whenNear(calc || rates, () => import('./rechner.js').then((m) => m.init()), '900px');

  whenNear($('[data-story]'), () => import('./story.js').then((m) => m.init()), '800px');
  whenNear($('[data-gallery]'), () => import('./lightbox.js').then((m) => m.init()));
  const hours = $('[data-hours]') || $('[data-open-badge]');
  if (hours) import('./oeffnungszeiten.js').then((m) => m.init());
  if ($('[data-countdown]') || $('[data-ics]')) whenNear($('[data-countdown]') || $('[data-ics]'), () => import('./eroeffnung.js').then((m) => m.init()));
  if ($('[data-contact-form]')) import('./kontakt.js').then((m) => m.init());
  if (!reducedMotion) idle(() => import('./effects.js').then((m) => m.init()), 1200);

  // 3D-Ring (Hero bzw. Seitenkopf der Unterseiten): erst nach dem Laden + Leerlauf, damit LCP/TBT nicht leiden
  const canvas = $('.hero__canvas') || $('.page-hero__canvas');
  if (canvas) {
    const opts = canvas.classList.contains('page-hero__canvas')
      ? { mode: 'page', tiltX: Number(canvas.dataset.tilt ?? 0.78), angle: Number(canvas.dataset.angle ?? 5.2) }
      : { angle: 4.7 };
    const start = () => idle(() => import('./ring.js').then((m) => m.init(canvas, opts)).catch(() => {}), 1500);
    document.readyState === 'complete' ? start() : addEventListener('load', start, { once: true });
  }

  // Smooth Scrolling nur Desktop (Maus/Trackpad), nie bei reduced motion
  if (finePointer && !reducedMotion && innerWidth >= 1024) {
    addEventListener('load', () => idle(async () => {
      const { Lenis } = await import('./vendor/lenis.min.js');
      const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.95, anchors: { offset: -80 } });
      window.__lenis = lenis;
      document.documentElement.classList.add('has-lenis');
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
      document.dispatchEvent(new CustomEvent('lenis:ready'));
    }), { once: true });
  }
}

initLinks();
initHeader();
initReveal();
initStickyBar();
initMagnetic();
initReviews();
initMap();
initModules();
