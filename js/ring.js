// WOW 1 – Echtzeit-Goldring (three.js, lokal). Das statische Poster bleibt sichtbar,
// bis der erste Frame gerendert ist; bei schwachen Geräten/kein WebGL/reduced motion
// wird three.js gar nicht erst geladen.
//
// init(canvas)                     → interaktiver Hero-Ring
// init(canvas, { still: true, … }) → ein einzelnes Standbild (für Poster/OG-Bild, tools/poster.html)

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;

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

/** Startet erst bei der ersten Interaktion (Mobile) bzw. kurz nach dem Laden (Desktop). */
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
  const timer = coarse ? 0 : setTimeout(go, 2500);
}

export function init(canvas, opts = {}) {
  if (opts.still) return build(canvas, opts);
  if (!deviceOK()) return;
  whenEngaged(() => build(canvas, opts).catch((err) => console.warn('[ring]', err)));
}

async function build(canvas, opts) {
  const T = await import('./vendor/three.module.min.js');
  const still = !!opts.still;

  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: still, powerPreference: 'high-performance' });
  renderer.setPixelRatio(still ? (opts.pixelRatio || 2) : Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = T.SRGBColorSpace;

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

  /* Ringschiene: Querschnitt als Superellipse („Komfortprofil“), per Lathe gedreht */
  const R = 1.0, halfW = 0.09, halfH = 0.26, n = 3.2, steps = 72;
  const profile = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    const x = R + halfW + halfW * Math.sign(c) * Math.pow(Math.abs(c), 2 / n) * (c > 0 ? 1.0 : 0.82);
    const y = halfH * Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
    profile.push(new T.Vector2(x, y));
  }
  const geo = new T.LatheGeometry(profile, 220);
  const mat = new T.MeshPhysicalMaterial({
    color: 0xe6c17a, metalness: 1, roughness: 0.15,
    clearcoat: 0.25, clearcoatRoughness: 0.08, envMapIntensity: 1.15,
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

  const resize = () => {
    const w = canvas.clientWidth || 600, h = canvas.clientHeight || 600;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();

  if (still) {
    turntable.rotation.y = opts.angle ?? 0.55;
    renderer.render(scene, camera);
    canvas.dataset.rendered = '1';
    return;
  }

  if (renderer.compileAsync) await renderer.compileAsync(scene, camera);
  new ResizeObserver(resize).observe(canvas);

  /* Maus (Desktop) / Neigung (Mobile, erst nach Tap) */
  const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    target.x = (e.clientY / innerHeight - 0.5) * 0.42;
    target.y = (e.clientX / innerWidth - 0.5) * 0.7;
  }, { passive: true });

  const tiltBtn = document.querySelector('.hero__tilt');
  if (tiltBtn && coarse && 'DeviceOrientationEvent' in window) {
    tiltBtn.classList.add('is-available');
    tiltBtn.addEventListener('click', async () => {
      try {
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
          if ((await DeviceOrientationEvent.requestPermission()) !== 'granted') return;
        }
        addEventListener('deviceorientation', (e) => {
          if (e.beta == null) return;
          target.x = T.MathUtils.clamp((e.beta - 45) / 90, -0.5, 0.5) * 0.6;
          target.y = T.MathUtils.clamp(e.gamma / 45, -1, 1) * 0.6;
        }, { passive: true });
        tiltBtn.setAttribute('aria-pressed', 'true');
        tiltBtn.querySelector('span').textContent = 'Neigung aktiv';
      } catch {}
    });
  }

  /* Nur rendern, wenn sichtbar und Tab aktiv */
  let visible = true, running = false, last = performance.now(), t = 0;
  const loop = (now) => {
    if (!visible || document.hidden) { running = false; return; }
    const dt = Math.min((now - last) / 1000, 0.05); last = now; t += dt;
    cur.x += (target.x - cur.x) * 0.05;
    cur.y += (target.y - cur.y) * 0.05;
    turntable.rotation.y = t * 0.32 + cur.y;
    turntable.rotation.x = cur.x;
    tilt.rotation.z = 0.32 + Math.sin(t * 0.4) * 0.05;
    gMat.uniforms.uTime.value = t * 2.2;
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  };
  const start = () => { if (!running && visible && !document.hidden) { running = true; last = performance.now(); requestAnimationFrame(loop); } };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }).observe(canvas);
  document.addEventListener('visibilitychange', start);
  canvas.addEventListener('webglcontextlost', () => { canvas.classList.remove('is-ready'); canvas.parentElement?.classList.remove('is-live'); });

  renderer.render(scene, camera);
  canvas.classList.add('is-ready');
  canvas.parentElement?.classList.add('is-live');
  start();
}
