// WOW 3 – „Vom Rohgold zum Schmuckstück“: gepinnte Szenen mit Masken-Reveal + Parallax.
// Nur Desktop ohne reduced motion; sonst bleibt die CSS-Abfolge mit Fade (data-reveal).
import { gsap, ScrollTrigger } from './vendor/gsap.min.js';

export function init() {
  const root = document.querySelector('[data-story]');
  if (!root) return;
  gsap.registerPlugin(ScrollTrigger);

  const hookLenis = () => window.__lenis?.on('scroll', ScrollTrigger.update);
  window.__lenis ? hookLenis() : document.addEventListener('lenis:ready', hookLenis, { once: true });

  const mm = gsap.matchMedia();
  mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
    root.classList.add('is-pinned');
    const pin = root.querySelector('.story__pin');
    const items = [...root.querySelectorAll('.story__item')];
    const figs = items.map((it) => it.querySelector('.story__fig'));
    const texts = items.map((it) => it.querySelector('.story__text'));
    const imgs = items.map((it) => it.querySelector('img'));
    figs.forEach((f) => f.classList.add('is-in')); // CSS-Reveal übernimmt hier GSAP

    gsap.set(figs.slice(1), { clipPath: 'inset(100% 0% 0% 0%)' });
    gsap.set(figs[0], { clipPath: 'inset(0% 0% 0% 0%)' });
    gsap.set(texts.slice(1), { autoAlpha: 0, y: 48 });
    gsap.set(imgs, { scale: 1.16, transformOrigin: '50% 50%' });

    // Zeitachse: jede Szene hat einen Slot der Länge 1 (Szene i ist bei t = i voll sichtbar).
    // Übergang in Szene i: Bild-Maske i-0.6 → i-0.1, Textwechsel erst gegen Ende der Maske.
    const total = items.length - 0.6;
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: pin, start: 'top top', end: () => `+=${innerHeight * total * 1.1}`,
        pin: true, scrub: 0.9, anticipatePin: 1, invalidateOnRefresh: true,
      },
    });

    items.forEach((_, i) => {
      // langsamer Parallax-Zoom, solange die Szene sichtbar ist
      const from = Math.max(i - 0.6, 0);
      tl.to(imgs[i], { scale: 1, yPercent: 3, duration: Math.min(i + 1, total) - from }, from);
      if (i === 0) return;
      tl.to(figs[i], { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.5, ease: 'power2.inOut' }, i - 0.6)
        .to(texts[i - 1], { autoAlpha: 0, y: -32, duration: 0.18, ease: 'power1.in' }, i - 0.32)
        .to(texts[i], { autoAlpha: 1, y: 0, duration: 0.25, ease: 'power2.out' }, i - 0.16);
    });
    tl.to({}, { duration: Math.max(0, total - tl.duration()) }); // letzte Szene kurz halten
    tl.fromTo(root.querySelector('.story__progress span'), { scaleX: 0 }, { scaleX: 1, duration: total }, 0);

    return () => {
      root.classList.remove('is-pinned');
      gsap.set([...figs, ...texts, ...imgs], { clearProps: 'all' });
    };
  });
}
