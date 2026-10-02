// Live-Badge „Jetzt geöffnet / öffnet um …“ – immer in Europe/Berlin gerechnet.
import { OEFFNUNGSZEITEN, GESCHLOSSEN_AN } from './config.js';

const TAGE = ['', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const fmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Berlin', weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
const WD = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const uhr = (hhmm) => hhmm.replace(/^0/, '').replace(/:00$/, ''); // „18:00“ → „18“

function berlinNow(date = new Date()) {
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  return { tag: WD[p.weekday], min: Number(p.hour) * 60 + Number(p.minute), iso: `${p.year}-${p.month}-${p.day}` };
}

function isoPlus(iso, days) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function status(date = new Date()) {
  const now = berlinNow(date);
  const zeiten = (tag, iso) => (GESCHLOSSEN_AN.includes(iso) ? [] : OEFFNUNGSZEITEN[tag] || []);
  for (const [von, bis] of zeiten(now.tag, now.iso)) {
    if (now.min >= toMin(von) && now.min < toMin(bis)) return { offen: true, text: `Heute <em>geöffnet</em> bis ${uhr(bis)} Uhr` };
  }
  for (let d = 0; d < 8; d++) {
    const tag = ((now.tag - 1 + d) % 7) + 1;
    for (const [von] of zeiten(tag, isoPlus(now.iso, d))) {
      if (d === 0 && toMin(von) <= now.min) continue;
      if (d === 0) return { offen: false, text: `Heute ab ${uhr(von)} Uhr <em>geöffnet</em>` };
      const wann = d === 1 ? 'Morgen' : TAGE[tag];
      return { offen: false, text: `${wann} ab ${uhr(von)} Uhr <em>geöffnet</em>` }; // kurz halten: muss auf 320 px in eine Zeile passen
    }
  }
  return { offen: false, text: 'Derzeit <em>geschlossen</em>' };
}

export function init() {
  const update = () => {
    const s = status();
    for (const b of document.querySelectorAll('[data-open-badge]')) {
      b.classList.toggle('is-open', s.offen);
      b.querySelector('[data-open-text]').innerHTML = s.text; // Text stammt nur aus status() (kein Nutzerinhalt)
    }
    const heute = berlinNow().tag;
    document.querySelectorAll('[data-hours] tr[data-day]').forEach((tr) => tr.classList.toggle('is-today', Number(tr.dataset.day) === heute));
  };
  update();
  setInterval(update, 60_000);
}
