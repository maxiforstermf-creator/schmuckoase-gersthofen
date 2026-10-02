// Countdown bis zur Eröffnung + .ics-Download (lokal erzeugt, keine Drittanbieter).
import { EROEFFNUNG, EROEFFNUNG_DAUER_STUNDEN, ADRESSE } from './config.js';

const pad = (n) => String(n).padStart(2, '0');
const icsDate = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const esc = (s) => s.replace(/\\/g, '\\\\').replace(/[,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');

export function init() {
  const start = EROEFFNUNG ? new Date(EROEFFNUNG) : null;
  const valid = start && !Number.isNaN(start.getTime());

  for (const root of document.querySelectorAll('[data-countdown]')) {
    const grid = root.querySelector('[data-countdown-grid]');
    const live = root.querySelector('[data-countdown-live]');
    const ph = root.querySelector('[data-countdown-ph]');
    if (!valid) continue;
    ph.textContent = `Eröffnung am ${start.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Berlin' })} um ${start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })} Uhr`;
    const out = Object.fromEntries([...root.querySelectorAll('[data-cd]')].map((el) => [el.dataset.cd, el]));
    const tick = () => {
      const ms = start - Date.now();
      if (ms <= 0) { grid.hidden = true; live.hidden = false; ph.hidden = true; return false; }
      grid.hidden = false;
      const s = Math.floor(ms / 1000);
      out.d.textContent = pad(Math.floor(s / 86400));
      out.h.textContent = pad(Math.floor((s % 86400) / 3600));
      out.m.textContent = pad(Math.floor((s % 3600) / 60));
      out.s.textContent = pad(s % 60);
      return true;
    };
    if (tick()) { const t = setInterval(() => { if (!tick()) clearInterval(t); }, 1000); }
  }

  for (const btn of document.querySelectorAll('[data-ics]')) {
    if (!valid || start < Date.now()) {
      btn.setAttribute('aria-disabled', 'true');
      btn.title = valid ? 'Die Eröffnung hat bereits stattgefunden.' : 'Termin folgt in Kürze.';
      continue;
    }
    btn.addEventListener('click', () => {
      const end = new Date(start.getTime() + EROEFFNUNG_DAUER_STUNDEN * 36e5);
      const ort = `SchmuckOase Gersthofen, ${ADRESSE.strasse}, ${ADRESSE.zusatz}, ${ADRESSE.plz} ${ADRESSE.ort}`;
      const ics = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SchmuckOase Gersthofen//Eroeffnung//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:eroeffnung-${icsDate(start)}@schmuckoase-gersthofen.de`,
        `DTSTAMP:${icsDate(new Date())}`,
        `DTSTART:${icsDate(start)}`,
        `DTEND:${icsDate(end)}`,
        `SUMMARY:${esc('Neueröffnung SchmuckOase Gersthofen')}`,
        `LOCATION:${esc(ort)}`,
        `DESCRIPTION:${esc('Neueröffnung im City Center Gersthofen – Juwelier, Goldankauf und Service.\nhttps://schmuckoase-gersthofen.de/eroeffnung/')}`,
        'URL:https://schmuckoase-gersthofen.de/eroeffnung/',
        'END:VEVENT', 'END:VCALENDAR', '',
      ].join('\r\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
      a.download = 'schmuckoase-eroeffnung.ics';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
  }
}
