// Kontaktformular: Vorbelegung (Rechner-Werte, Anliegen aus URL), Erfolgsmeldung, Doppelklick-Schutz.
import { WHATSAPP_NUMMER } from './config.js';

const ANLIEGEN = {
  bewertung: 'Gold bewerten / Termin',
  reparatur: 'Reparatur / Gravur',
  trauringe: 'Trauringe',
  ohrloch: 'Ohrloch stechen',
  uhr: 'Uhrenservice',
};

export function init() {
  const form = document.querySelector('[data-contact-form]');
  if (!form) return;
  const q = new URLSearchParams(location.search);

  const topic = form.querySelector('#f-topic');
  const msg = form.querySelector('#f-msg');
  if (ANLIEGEN[q.get('anliegen')]) topic.value = ANLIEGEN[q.get('anliegen')];
  if (q.get('anliegen') === 'bewertung') {
    try {
      const r = JSON.parse(sessionStorage.getItem('so-rechner') || 'null');
      if (r?.text && !msg.value) msg.value = `${r.text.replace(/\s*Foto anbei\.$/, '')}\nIch möchte gern einen Termin zur Bewertung vereinbaren.`;
    } catch {}
  }

  if (q.get('gesendet') === '1') {
    const ok = document.querySelector('[data-form-success]');
    if (ok) { ok.hidden = false; ok.setAttribute('tabindex', '-1'); ok.focus(); }
  }

  form.addEventListener('submit', () => {
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Wird gesendet …';
  });

  for (const el of document.querySelectorAll('[data-wa-missing]')) el.hidden = !!WHATSAPP_NUMMER;
  if (!WHATSAPP_NUMMER) document.querySelectorAll('[data-wa-main]').forEach((a) => a.setAttribute('aria-disabled', 'true'));
}
