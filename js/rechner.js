// Goldrechner (WOW 2) + Richtwerte-Tabellen. Liest nur die lokale data/goldpreis.json.
import { ANKAUFSQUOTE, GOLDPREIS_URL, KURS_VERALTET_NACH_STUNDEN } from './config.js';
import { waHref, reducedMotion } from './main.js';

const METALLE = {
  gold: {
    name: 'Gold', feinLabel: 'Feingoldanteil', kursLabel: 'Goldkurs je Gramm', key: 'eur_per_gram', standard: 585,
    legierungen: [
      { v: 333, k: '8 Karat' }, { v: 375, k: '9 Karat' }, { v: 585, k: '14 Karat' }, { v: 750, k: '18 Karat' },
      { v: 833, k: '20 Karat' }, { v: 900, k: 'Münzgold' }, { v: 916, k: '22 Karat' }, { v: 999, k: 'Feingold' },
    ],
  },
  silber: {
    name: 'Silber', feinLabel: 'Feinsilberanteil', kursLabel: 'Silberkurs je Gramm', key: 'silver_eur_per_gram', standard: 925,
    legierungen: [
      { v: 625, k: 'Münzsilber 625' }, { v: 800, k: 'Silber 800' }, { v: 835, k: 'Silber 835' }, { v: 900, k: 'Silber 900' },
      { v: 925, k: 'Sterling' }, { v: 999, k: 'Feinsilber' },
    ],
  },
};

const eur = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
const num = (n, d = 2) => new Intl.NumberFormat('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
const datum = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Berlin' });
const nurDatum = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeZone: 'Europe/Berlin' });

let kursPromise;
export function ladeKurs() {
  kursPromise ??= fetch(GOLDPREIS_URL, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  return kursPromise;
}

export function standText(data) {
  if (!data?.updated_at) return { text: 'Kurs derzeit nicht verfügbar – fragen Sie uns gern nach dem Tageskurs.', stale: true };
  const t = new Date(data.updated_at);
  const alterH = (Date.now() - t) / 36e5;
  if (alterH > KURS_VERALTET_NACH_STUNDEN) return { text: `Kurs vom ${nurDatum.format(t)} – der aktuelle Tageskurs kann abweichen.`, stale: true };
  return { text: `Stand: ${datum.format(t)} Uhr`, stale: false };
}

/* Logarithmischer Slider 0…1000 ↔ 0,5…500 g */
const G_MIN = 0.5, G_MAX = 500, SPAN = Math.log(G_MAX / G_MIN);
const sliderZuGramm = (s) => G_MIN * Math.exp((s / 1000) * SPAN);
const grammZuSlider = (g) => Math.round((Math.log(Math.min(Math.max(g, G_MIN), G_MAX) / G_MIN) / SPAN) * 1000);
const rundeGramm = (g) => (g < 10 ? Math.round(g * 10) / 10 : g < 100 ? Math.round(g * 2) / 2 : Math.round(g));

function initRechner(root, data) {
  const m = METALLE[root.dataset.metal] || METALLE.gold;
  const $ = (s) => root.querySelector(s);
  const out = (k) => root.querySelector(`[data-out="${k}"]`);
  const kurs = data?.[m.key] ?? null;
  // Mehrere Stücke: jedes mit eigener Legierung + Gewicht; die Eingaben bearbeiten das aktive Stück.
  let items = [{ legierung: m.standard, gramm: 10 }];
  try {
    const saved = JSON.parse(sessionStorage.getItem('so-rechner') || 'null');
    if (saved?.metal === root.dataset.metal && Array.isArray(saved.items) && saved.items.length) {
      items = saved.items.filter((it) => m.legierungen.some((l) => l.v === it.legierung) && it.gramm > 0);
      if (!items.length) items = [{ legierung: m.standard, gramm: 10 }];
    }
  } catch {}
  let active = items.length - 1;
  let state = items[active];

  /* Kacheln */
  const holder = $('[data-calc-alloys]');
  holder.removeAttribute('role');
  const group = document.createElement('div');
  group.setAttribute('role', 'radiogroup');
  group.setAttribute('aria-labelledby', 'calc-alloy-label');
  group.style.display = 'contents';
  for (const l of m.legierungen) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'alloy'; b.setAttribute('role', 'radio'); b.dataset.v = l.v;
    b.innerHTML = `<span class="alloy__val">${l.v}</span><span class="alloy__k">${l.k}</span>`;
    b.setAttribute('aria-label', `${l.v}er ${m.name}, ${l.k}`);
    group.append(b);
  }
  const help = document.createElement('button');
  help.type = 'button'; help.className = 'alloy alloy--help';
  help.innerHTML = '<span class="alloy__val">Weiß ich nicht</span><span class="alloy__k">Punzen-Hilfe</span>';
  help.setAttribute('aria-haspopup', 'dialog');
  holder.replaceChildren(group, help);
  const radios = [...group.children];

  const dialog = document.getElementById('punzen-hilfe');
  const plist = dialog?.querySelector('[data-punzen-list]');
  if (plist) {
    plist.replaceChildren(...m.legierungen.map((l) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = `<b>${l.v}</b><span>${l.k} · ${num(l.v / 10, 1)} %</span>`;
      b.addEventListener('click', () => { setLegierung(l.v, true); dialog.close(); });
      return b;
    }));
  }
  help.addEventListener('click', () => dialog?.showModal());

  function setLegierung(v, focus = false) {
    state.legierung = v;
    for (const r of radios) {
      const on = Number(r.dataset.v) === v;
      r.setAttribute('aria-checked', on);
      r.tabIndex = on ? 0 : -1;
      if (on && focus) r.focus();
    }
    render();
  }
  group.addEventListener('click', (e) => { const r = e.target.closest('[role="radio"]'); if (r) setLegierung(Number(r.dataset.v)); });
  group.addEventListener('keydown', (e) => {
    const i = radios.indexOf(document.activeElement);
    if (i < 0) return;
    const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (e.key === 'Home' || e.key === 'End' || d) {
      e.preventDefault();
      const n = e.key === 'Home' ? 0 : e.key === 'End' ? radios.length - 1 : (i + d + radios.length) % radios.length;
      setLegierung(Number(radios[n].dataset.v), true);
    }
  });

  /* Gewicht */
  const range = $('[data-calc-range]');
  const input = $('[data-calc-weight]');
  const setGramm = (g, from) => {
    if (!Number.isFinite(g) || g <= 0) return;
    state.gramm = Math.min(g, 5000);
    if (from !== 'range') range.value = grammZuSlider(state.gramm);
    if (from !== 'input') input.value = String(state.gramm);
    range.style.setProperty('--p', `${range.value / 10}%`);
    range.setAttribute('aria-valuetext', `${num(state.gramm, state.gramm % 1 ? 1 : 0)} Gramm`);
    render();
  };
  range.addEventListener('input', () => setGramm(rundeGramm(sliderZuGramm(Number(range.value))), 'range'));
  input.addEventListener('input', () => setGramm(parseFloat(input.value.replace(',', '.')), 'input'));
  input.addEventListener('blur', () => { if (!(parseFloat(input.value) > 0)) setGramm(state.gramm); });
  root.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => setGramm(Number(b.dataset.preset))));
  if (m === METALLE.silber) {
    const p = root.querySelectorAll('[data-preset]');
    [[10, 'Kette ≈ 10 g'], [31.1, 'Unzen-Münze ≈ 31 g'], [100, 'Besteckteil ≈ 100 g'], [250, 'Tablett ≈ 250 g']].forEach(([g, t], i) => {
      if (p[i]) { p[i].dataset.preset = g; p[i].textContent = t; }
    });
  }

  /* Waage */
  const svg = $('[data-calc-scale]');
  const beam = svg?.querySelector('.beam');
  const panL = svg?.querySelector('.pan-l');
  const panR = svg?.querySelector('.pan-r');
  const pile = svg?.querySelector('[data-calc-pile]');
  function waage() {
    if (!svg) return;
    const t = Math.min(Math.max(Math.log(state.gramm / G_MIN) / SPAN, 0), 1);
    const a = -t * 13; // Grad; negativ = linke Seite sinkt
    const rad = (a * Math.PI) / 180;
    const dy = -140 * Math.sin(rad);
    beam.style.transform = `rotate(${a}deg)`;
    panL.style.transform = `translate(${140 * (1 - Math.cos(rad))}px, ${dy}px)`;
    panR.style.transform = `translate(${-140 * (1 - Math.cos(rad))}px, ${-dy}px)`;
    const n = 1 + Math.round(t * 5);
    if (pile.childElementCount !== n) {
      const spots = [[0, -6, 10], [-14, -5, 8], [14, -5, 8], [-6, -14, 9], [8, -13, 8], [0, -21, 7]];
      pile.innerHTML = spots.slice(0, n).map(([x, y, r]) =>
        `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.62}" fill="url(#scaleGold)" stroke="#8E6B2F" stroke-width=".5"/>`).join('');
    }
  }

  /* Ausgabe mit Count-up */
  const valueEl = out('value');
  let shown = 0, anim = 0, liveTimer = 0;
  function countTo(target) {
    cancelAnimationFrame(anim);
    if (reducedMotion) { shown = target; valueEl.textContent = eur.format(target); return; }
    const from = shown, t0 = performance.now(), dur = 700;
    const step = (t) => {
      const p = Math.min((t - t0) / dur, 1);
      shown = from + (target - from) * (1 - Math.pow(1 - p, 3));
      valueEl.textContent = eur.format(shown);
      if (p < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  }

  const kLabel = (v) => m.legierungen.find((l) => l.v === v)?.k || '';
  const fmtG = (g) => num(g, g % 1 ? 1 : 0);
  const fein = (it) => it.gramm * (it.legierung / 1000);
  const listEl = out('items');
  const pieceEl = root.querySelector('[data-calc-piece]');

  function select(i) {
    active = i; state = items[i];
    setLegierung(state.legierung);
    setGramm(state.gramm);
  }

  function renderList() {
    const multi = items.length > 1;
    listEl.hidden = !multi;
    if (pieceEl) { pieceEl.hidden = !multi; pieceEl.textContent = `Stück ${active + 1} von ${items.length}`; }
    if (!multi) { listEl.replaceChildren(); return; }
    listEl.replaceChildren(...items.map((it, i) => {
      const li = document.createElement('li');
      li.className = 'calc__item' + (i === active ? ' is-active' : '');
      const w = kurs ? eur.format(fein(it) * kurs) : '–';
      li.innerHTML = `<button type="button" class="calc__item-sel" aria-pressed="${i === active}" aria-label="Stück ${i + 1} bearbeiten: ${fmtG(it.gramm)} Gramm ${it.legierung}er ${m.name}">` +
        `<span class="calc__item-n">${i + 1}</span><span>${it.legierung} · ${fmtG(it.gramm)} g</span><span class="num">${w}</span></button>` +
        `<button type="button" class="calc__item-del" aria-label="Stück ${i + 1} entfernen">×</button>`;
      li.querySelector('.calc__item-sel').addEventListener('click', () => select(i));
      li.querySelector('.calc__item-del').addEventListener('click', () => {
        items.splice(i, 1);
        select(Math.min(active > i ? active - 1 : active, items.length - 1));
        root.querySelector('[data-calc-add]')?.focus();
      });
      return li;
    }));
  }

  root.querySelector('[data-calc-add]')?.addEventListener('click', () => {
    items.push({ legierung: state.legierung, gramm: 10 });
    select(items.length - 1);
    root.querySelector('[role="radio"][aria-checked="true"]')?.focus();
  });

  function render() {
    const multi = items.length > 1;
    const feinGesamt = items.reduce((a, it) => a + fein(it), 0);
    const wert = kurs ? feinGesamt * kurs : null;
    out('alloy-label').textContent = multi ? 'Stücke' : 'Legierung';
    out('alloy').textContent = multi ? `${items.length} Stücke` : `${state.legierung} / 1000`;
    out('fine-label').textContent = multi ? `${m.feinLabel} gesamt` : m.feinLabel;
    out('spot-label').textContent = m.kursLabel;
    out('fine').textContent = `${num(feinGesamt, feinGesamt < 100 ? 2 : 1)} g`;
    out('spot').textContent = kurs ? eur.format(kurs) : '–';
    out('value-label').textContent = multi ? 'Börsenwert gesamt' : 'Börsenwert';
    if (wert == null) { valueEl.textContent = '– €'; } else countTo(wert);
    renderList();

    const q = out('quote');
    if (ANKAUFSQUOTE && wert != null) { q.hidden = false; q.innerHTML = `Unser Richtpreis: <strong>ca. ${eur.format(wert * ANKAUFSQUOTE)}</strong>`; }
    else q.hidden = true;

    const zeile = (it) => `ca. ${fmtG(it.gramm)} g, Legierung ${it.legierung} (${kLabel(it.legierung)})`;
    const was = m.name === 'Gold' ? 'mein Gold' : 'mein Silber';
    const text = multi
      ? `Hallo SchmuckOase, ich möchte ${was} bewerten lassen:\n${items.map((it) => `– ${zeile(it)}`).join('\n')}\nFoto anbei.`
      : `Hallo SchmuckOase, ich möchte ${was} bewerten lassen: ${zeile(items[0])}. Foto anbei.`;
    const wa = root.querySelector('[data-wa-calc]');
    wa.href = waHref(text);
    if (wa.href.startsWith('https://wa.me')) { wa.target = '_blank'; wa.rel = 'noopener'; }

    try { sessionStorage.setItem('so-rechner', JSON.stringify({ metal: root.dataset.metal, items, text })); } catch {}

    clearTimeout(liveTimer);
    liveTimer = setTimeout(() => {
      out('live').textContent = wert == null
        ? `${num(feinGesamt)} Gramm ${m.feinLabel.replace('anteil', '')}.`
        : multi
          ? `Börsenwert gesamt ca. ${eur.format(wert)} für ${items.length} Stücke.`
          : `Börsenwert ca. ${eur.format(wert)} für ${fmtG(state.gramm)} Gramm ${state.legierung}er ${m.name}.`;
    }, 800);
    waage();
  }

  const st = standText(data);
  const standEl = out('stand');
  standEl.querySelector('span').textContent = st.text;
  standEl.classList.toggle('is-stale', st.stale);

  setLegierung(state.legierung);
  setGramm(state.gramm);
}

function initRates(root, data) {
  const m = METALLE[root.dataset.metal] || METALLE.gold;
  const kurs = data?.[m.key];
  const liste = (root.dataset.rates || '333,585,750,999').split(',').map(Number);
  const target = root.querySelector('[data-rates-body]');
  const label = (v) => m.legierungen.find((l) => l.v === v)?.k || '';
  if (root.dataset.style === 'table') {
    target.innerHTML = liste.map((v) => `<tr><th scope="row">${v}</th><td>${label(v)}</td><td class="num">${num(v / 10, 1)} %</td>` +
      `<td class="num price">${kurs ? eur.format((kurs * v) / 1000) : '–'}</td></tr>`).join('');
  } else {
    target.innerHTML = liste.map((v) => `<div class="rate"><span class="rate__alloy">${v}<small>${label(v)}</small></span>` +
      `<span class="rate__price num">${kurs ? eur.format((kurs * v) / 1000) : '–'}</span><span class="rate__unit">Börsenwert je Gramm</span></div>`).join('');
  }
  const st = standText(data);
  root.querySelectorAll('[data-rates-stand]').forEach((el) => { el.textContent = st.text; el.classList.toggle('gold', st.stale); });
}

export async function init() {
  const data = await ladeKurs();
  document.querySelectorAll('[data-calc]').forEach((el) => initRechner(el, data));
  document.querySelectorAll('[data-rates]').forEach((el) => initRates(el, data));
}
