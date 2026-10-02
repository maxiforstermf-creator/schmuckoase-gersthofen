// ─────────────────────────────────────────────────────────────────────────────
//  Zentrale Konfiguration – alle Werte, die der Inhaber pflegen muss.
//  Felder mit „TODO“ sind Platzhalter und vor dem Livegang zu befüllen.
// ─────────────────────────────────────────────────────────────────────────────

/** Ankaufsquote relativ zum Materialwert (z. B. 0.95 = 95 %).
 *  null → der Rechner zeigt NUR den Materialwert, keinen Richtpreis. */
export const ANKAUFSQUOTE = null; // TODO: vom Inhaber freigeben lassen

/** Telefon (bestätigt, alte Website). */
export const TELEFON = { anzeige: '0821 497901', href: 'tel:+49821497901' };

/** WhatsApp-Nummer international ohne + und ohne Leerzeichen, z. B. '491701234567'.
 *  Leer → WhatsApp-Buttons führen zur Kontaktseite. */
export const WHATSAPP_NUMMER = ''; // TODO: [PLATZHALTER: WhatsApp-Nummer]

/** Eröffnung: ISO-Datum mit Zeitzone, z. B. '2026-11-07T10:00:00+01:00'.
 *  null → Countdown zeigt einen Platzhalter, .ics-Button ist deaktiviert. */
export const EROEFFNUNG = '2026-10-01T09:00:00+02:00'; // Eröffnung 1. Oktober 2026 (Uhrzeit 9:00 angenommen)
export const EROEFFNUNG_DAUER_STUNDEN = 8;

/** Adresse des neuen Ladens. */
export const ADRESSE = {
  strasse: 'Bahnhofstraße 18',
  zusatz: 'gegenüber dem City Center',
  plz: '86368',
  ort: 'Gersthofen',
};

/** Ziel für Route & Karte (Suchbegriff für Google Maps). */
export const MAPS_QUERY = 'Bahnhofstraße 18, 86368 Gersthofen';

/** Öffnungszeiten (Europe/Berlin). Wochentag: 1 = Montag … 7 = Sonntag.
 *  Werte von der alten Website – TODO: für den neuen Laden bestätigen. */
export const OEFFNUNGSZEITEN = {
  1: [['09:00', '18:00']],
  2: [['09:00', '18:00']],
  3: [['09:00', '18:00']],
  4: [['09:00', '18:00']],
  5: [['09:00', '18:00']],
  6: [['09:00', '17:00']],
  7: [],
};

/** Gesetzliche Feiertage o. Ä., an denen geschlossen ist (YYYY-MM-DD). */
export const GESCHLOSSEN_AN = [
  // TODO: Feiertage Bayern / Betriebsferien pflegen
];

/** Pfad zur Goldpreis-JSON (von der GitHub Action geschrieben). */
export const GOLDPREIS_URL = '/data/goldpreis.json';

/** Ab diesem Alter (Stunden) wird „Kurs vom …“ statt „Stand: …“ angezeigt.
 *  80 h decken das Wochenende ab (die Action läuft nur werktags). */
export const KURS_VERALTET_NACH_STUNDEN = 80;
