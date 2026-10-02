// WOW 1 – Echtzeit-Goldring (three.js, lokal). Das statische Poster bleibt sichtbar,
// bis der erste Frame gerendert ist; bei schwachen Geräten/kein WebGL/reduced motion
// wird three.js gar nicht erst geladen.
//
// init(canvas)                     → interaktiver Hero-Ring
// init(canvas, { still: true, … }) → ein einzelnes Standbild (für Poster/OG-Bild, tools/poster.html)

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;

// Arbeit in kleine Häppchen teilen, damit der Hauptthread zwischendurch frei ist (kein Ruckeln/TBT)
const pause = () => (globalThis.scheduler?.yield ? scheduler.yield() : new Promise((r) => setTimeout(r, 0)));

function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

function deviceOK() {
  if (reduced) return false;
  if (navigator.connection?.saveData) return false;
  if ((navigator.deviceMemory ?? 8) < 4) return false;
  if ((navigator.hardwareConcurrency ?? 8) < 4) return false;
  return webglOK();
}

/** Startet bei der ersten Interaktion, spätestens kurz nach dem Laden. */
function whenEngaged(cb) {
  const events = ['pointerdown', 'pointermove', 'touchstart', 'scroll', 'keydown', 'wheel'];
  let done = false;
  const go = () => {
    if (done) return; done = true;
    events.forEach((e) => removeEventListener(e, go, { passive: true }));
    clearTimeout(timer);
    cb();
  };
  events.forEach((e) => addEventListener(e, go, { passive: true, once: true }));
  const timer = setTimeout(go, coarse ? 3500 : 2500); // Handy: automatisch starten, sobald die Seite sicher fertig ist
}

/* Gravur „SchmuckOase“ außen umlaufend: Canvas-Texturen für Farbe/Relief und Rauheit.
   UV der Lathe-Geometrie: u = Umfang, v = Profil (Außenmitte bei v = 0.5). */
const FLIP_X = 1, FLIP_Y = 1; // Leserichtung der Gravur auf der Außenseite
async function gravur(T, renderer, { umfang, perimeter, lite }) {
  try {
    // Kalligrafische Gravur-Schreibschrift (Monsieur La Doulaise, OFL – lokal eingebunden)
    const face = new FontFace('SchmuckOase Gravur', 'url(/assets/fonts/monsieur-la-doulaise-latin-400-normal.woff2)');
    document.fonts.add(await face.load());
  } catch {}
  const W = lite ? 2048 : 4096, H = lite ? 512 : 1024; // Handy: kleinere Textur
  const pxU = W / umfang, pxV = H / perimeter;   // Pixel je Szenen-Einheit entlang Umfang bzw. Profil
  const sx = pxU / pxV;                          // Verzerrung u/v ausgleichen
  // Schreibschrift: kleine Mittellänge, große Schwünge → größer setzen, Breite begrenzen (2× umlaufend)
  const FONT = (px) => `400 ${px}px "SchmuckOase Gravur", "Cormorant Garamond", Georgia, serif`;
  let fontPx = Math.round(0.36 * pxV);
  { const m = document.createElement('canvas').getContext('2d'); m.font = FONT(fontPx);
    const maxW = (W * 0.44) / sx; const w = m.measureText('SchmuckOase').width;
    if (w > maxW) fontPx = Math.floor(fontPx * maxW / w); }
  const make = (bg, ink) => {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = FONT(fontPx);
    for (const x of [W * 0.25, W * 0.75]) {         // zweimal umlaufend
      g.save(); g.translate(x, H / 2); g.scale(FLIP_X * sx, FLIP_Y);
      g.fillText('SchmuckOase', 0, fontPx * 0.06);
      g.lineWidth = fontPx * 0.018; g.strokeStyle = ink; g.lineJoin = 'round'; // feine Haarstriche etwas kräftiger → auch klein lesbar
      g.strokeText('SchmuckOase', 0, fontPx * 0.06);
      g.restore();
    }
    const t = new T.CanvasTexture(c);
    t.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), lite ? 4 : 16);
    return t;
  };
  const color = make('#ffffff', '#6f5326');       // Buchstaben dunkler + tiefer (Bump)
  color.colorSpace = T.SRGBColorSpace;
  renderer.initTexture(color); await pause();     // Upload zur GPU als eigener Schritt
  const rough = make('#262626', '#8c8c8c');       // poliert 0.15 · Gravur matt ≈ 0.55
  renderer.initTexture(rough); await pause();
  return { color, rough };
}

export function init(canvas, opts = {}) {
  if (opts.still) return build(canvas, opts);
  if (!deviceOK()) return;
  whenEngaged(() => build(canvas, opts).catch((err) => console.warn('[ring]', err)));
}

async function build(canvas, opts) {
  const T = await import('./vendor/three.module.min.js');
  const still = !!opts.still;
  const lite = coarse && !still; // Handy: kleinere Textur/weniger Segmente (Material identisch zum Standbild)
  await pause();

  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: still, powerPreference: 'high-performance' });
  renderer.setPixelRatio(still ? (opts.pixelRatio || 2) : Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = T.SRGBColorSpace;
  await pause();

  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(28, 1, 0.1, 50);
  camera.position.set(0, 0, 7.2);

  /* Studio-Lightmap: dunkler Raum mit Softboxen → PMREM-Environment */
  const studio = new T.Scene();
  studio.add(new T.Mesh(new T.BoxGeometry(12, 12, 12), new T.MeshBasicMaterial({ color: 0x0b0a09, side: T.BackSide })));
  const softbox = (w, h, hex, intensity, x, y, z) => {
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(hex).multiplyScalar(intensity) }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); studio.add(m);
  };
  softbox(9, 2.4, 0xffffff, 5, 0, 5.6, 0.8);       // Top-Strip (Key)
  softbox(2.2, 9, 0xfff3dc, 3.2, -5.6, 0.4, 1.6);  // links
  softbox(2.4, 9, 0xffd9a0, 2.4, 5.6, -0.2, -0.6); // rechts, warm
  softbox(8, 2.4, 0xffffff, 1.4, 0, -3.4, 4.6);    // Fill von vorne unten
  softbox(6, 4, 0xffcf8a, 1.6, 0.5, 0.6, -5.6);    // Rim von hinten
  softbox(4, 4, 0xfff0d0, 0.9, 0, -5.6, 0);        // Boden-Aufheller
  softbox(0.8, 0.8, 0xffffff, 24, 2.4, 3.6, 3.6);  // Hotspot für Glanzpunkt
  const pmrem = new T.PMREMGenerator(renderer);
  const envMap = pmrem.fromScene(studio, 0.035).texture;
  scene.environment = envMap;
  pmrem.dispose();
  await pause();

  /* Ringschiene: Querschnitt als Superellipse („Komfortprofil“), per Lathe gedreht */
  const R = 1.0, halfW = 0.09, halfH = 0.26, n = 3.2, steps = 120;
  // Dicht abtasten, dann nach Bogenlänge gleichmäßig verteilen → UV v ist linear zur Oberfläche
  // (sonst wird die Gravur-Textur in der Höhe verzerrt). Start auf der Innenseite → Außenmitte bei v = 0.5.
  const dense = [];
  for (let i = 0; i <= 1440; i++) {
    const a = Math.PI + (i / 1440) * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    dense.push([R + halfW + halfW * Math.sign(c) * Math.pow(Math.abs(c), 2 / n) * (c > 0 ? 1.0 : 0.82),
                halfH * Math.sign(s) * Math.pow(Math.abs(s), 2 / n)]);
  }
  const cum = [0];
  for (let i = 1; i < dense.length; i++) cum.push(cum[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  const perimeter = cum.at(-1);
  const profile = [];
  for (let k = 0, j = 0; k <= steps; k++) {
    const target = (k / steps) * perimeter;
    while (j < cum.length - 2 && cum[j + 1] < target) j++;
    const f = (target - cum[j]) / (cum[j + 1] - cum[j] || 1);
    profile.push(new T.Vector2(dense[j][0] + (dense[j + 1][0] - dense[j][0]) * f, dense[j][1] + (dense[j + 1][1] - dense[j][1]) * f));
  }
  const geo = new T.LatheGeometry(profile, lite ? 160 : 240);
  await pause();
  const engr = await gravur(T, renderer, { umfang: 2 * Math.PI * (R + 2 * halfW), perimeter, lite });
  const mat = new T.MeshPhysicalMaterial({
    color: 0xe6c17a, metalness: 1, roughness: 1, roughnessMap: engr.rough,
    map: engr.color, bumpMap: engr.color, bumpScale: 3.5,       // identisch zum Standbild →
    clearcoat: 0.25, clearcoatRoughness: 0.08, envMapIntensity: 1.15, // Wechsel unsichtbar
  });
  const ring = new T.Mesh(geo, mat);

  /* Funkel-Glints auf der Außenfläche */
  const N = 46, pos = [], phase = [], speed = [], size = [];
  for (let i = 0; i < N; i++) {
    const th = Math.random() * Math.PI * 2;
    const y = (Math.random() * 2 - 1) * halfH * 0.7;
    const r = R + halfW * 2 + 0.006;
    pos.push(Math.cos(th) * r, y, Math.sin(th) * r);
    phase.push(Math.random() * Math.PI * 2);
    speed.push(0.6 + Math.random() * 1.1);
    size.push(26 + Math.random() * 34);
  }
  const gGeo = new T.BufferGeometry();
  gGeo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  gGeo.setAttribute('aPhase', new T.Float32BufferAttribute(phase, 1));
  gGeo.setAttribute('aSpeed', new T.Float32BufferAttribute(speed, 1));
  gGeo.setAttribute('aSize', new T.Float32BufferAttribute(size, 1));
  const gMat = new T.ShaderMaterial({
    transparent: true, depthWrite: false, blending: T.AdditiveBlending,
    uniforms: { uTime: { value: opts.time ?? 0 }, uPR: { value: renderer.getPixelRatio() } },
    vertexShader: /* glsl */`
      attribute float aPhase; attribute float aSpeed; attribute float aSize;
      uniform float uTime; uniform float uPR; varying float vA;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normalize(vec3(position.x, 0.0, position.z)));
        float facing = max(dot(n, normalize(-mv.xyz)), 0.0);
        float tw = pow(max(sin(uTime * aSpeed + aPhase), 0.0), 28.0);
        vA = tw * smoothstep(0.25, 0.85, facing);
        gl_PointSize = aSize * uPR * (0.5 + 0.9 * tw) * (7.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      varying float vA;
      void main() {
        vec2 p = gl_PointCoord - 0.5;
        float core = exp(-dot(p, p) * 140.0);
        float rays = exp(-abs(p.x) * 70.0) * exp(-abs(p.y) * 5.0) + exp(-abs(p.y) * 70.0) * exp(-abs(p.x) * 5.0);
        float a = (core + rays * 0.75) * vA;
        gl_FragColor = vec4(vec3(1.0, 0.95, 0.82) * a, a);
      }`,
  });
  ring.add(new T.Points(gGeo, gMat));

  /* Hierarchie: Drehteller (Welt-Y) → Neigung → Ring */
  const tilt = new T.Group();
  const TILT_X = opts.tiltX ?? 0.62;
  tilt.rotation.set(TILT_X, 0, 0.32);
  tilt.add(ring);
  const turntable = new T.Group();
  turntable.add(tilt);
  scene.add(turntable);
  canvas.__ring = { turntable, tilt }; // nur für automatische Tests (Pose prüfen)

  // Zeichenfläche ist immer quadratisch (wie das Standbild). Nur die Breite lesen: Safari liefert
  // vor dem ersten setSize die Höhe aus dem Standard-Seitenverhältnis 2:1 → Ring wäre anders skaliert.
  const resize = () => {
    const w = canvas.clientWidth || 600;
    renderer.setSize(w, w, false);
    camera.aspect = 1;
    camera.updateProjectionMatrix();
  };
  resize();

  if (still) {
    turntable.rotation.y = opts.angle ?? 0.55;
    renderer.render(scene, camera);
    canvas.dataset.rendered = '1';
    return;
  }

  await pause();
  if (renderer.compileAsync) await renderer.compileAsync(scene, camera);
  await pause();
  new ResizeObserver(resize).observe(canvas);

  /* Maus (Desktop): Ring folgt leicht dem Zeiger */
  const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    target.x = (e.clientY / innerHeight - 0.5) * 0.42;
    target.y = (e.clientX / innerWidth - 0.5) * 0.7;
  }, { passive: true });

  /* Scroll-Kopplung: beim Scrollen dreht und neigt sich der Ring (geglättet) */
  const page = opts.mode === 'page';
  const baseAngle = opts.angle ?? 0;
  const autoSpin = page ? 0.08 : 0.32;     // Grunddrehung pro Sekunde
  const spinPerPx = page ? 0.0075 : 0.0045; // zusätzliche Drehung je gescrolltem Pixel
  let scrollCur = 0;      // startet bei 0 und gleitet zur aktuellen Position → kein Sprung beim Übergang
  let spin = 0;           // Grunddrehung läuft weich an
  const uT0 = page ? 5.1 : 2.4; // gleicher Funkel-Zustand wie im Standbild

  /* Übergang Standbild → 3D in drei Phasen, damit nie zwei Ringe gleichzeitig zu sehen sind:
     1. 3D-Ring blendet REGUNGSLOS in exakt der Pose des Standbilds ein (CSS-Transition auf .is-ready)
     2. erst wenn er voll deckend ist: Standbild ausblenden (.is-live, sofort)
     3. erst danach beginnt die Bewegung (weich anlaufend) */
  const FADE_MS = 900;
  let moving = false;

  /* Nur rendern, wenn sichtbar und Tab aktiv */
  let visible = true, running = false, last = performance.now(), t = 0;
  // Pose aus Zustand berechnen – wird auch VOR dem ersten Bild aufgerufen (= Pose des Standbilds)
  const pose = () => {
    const sp = Math.min(scrollCur / innerHeight, 1.5); // Scroll-Fortschritt in Bildschirmhöhen
    turntable.rotation.y = baseAngle + spin + cur.y + scrollCur * spinPerPx;
    turntable.rotation.x = cur.x + sp * (page ? 0.35 : 0.28);
    tilt.rotation.z = 0.32 + Math.sin(t * 0.4) * 0.05 - sp * 0.18;
    gMat.uniforms.uTime.value = uT0 + t * 2.2;
  };
  const loop = (now) => {
    if (!visible || document.hidden) { running = false; return; }
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (moving) {
      t += dt;
      const k = Math.min(t / 1.6, 1), ease = k * k * (3 - 2 * k); // 0 → 1 über 1,6 s
      cur.x += (target.x * ease - cur.x) * 0.05;
      cur.y += (target.y * ease - cur.y) * 0.05;
      scrollCur += (scrollY * ease - scrollCur) * 0.085;
      spin += dt * autoSpin * ease;
    }
    pose();
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  };
  const start = () => { if (!running && visible && !document.hidden) { running = true; last = performance.now(); requestAnimationFrame(loop); } };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }).observe(canvas);
  document.addEventListener('visibilitychange', start);
  canvas.addEventListener('webglcontextlost', () => { canvas.classList.remove('is-ready'); canvas.parentElement?.classList.remove('is-live'); moving = false; });

  // Phase 1: erstes Bild (= Pose des Standbilds) rendern und einblenden
  pose();
  renderer.render(scene, camera);
  await new Promise((r) => requestAnimationFrame(r)); // sicherstellen, dass das Bild gezeichnet ist
  canvas.classList.add('is-ready');
  start();
  // Phase 2 + 3: nach vollständigem Einblenden Standbild weg, dann Bewegung starten
  await new Promise((r) => setTimeout(r, reduced ? 0 : FADE_MS + 60));
  canvas.parentElement?.classList.add('is-live');
  moving = true;
  addEventListener('scroll', start, { passive: true });
  start();
}
