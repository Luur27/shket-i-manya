/* Шкет и Маня — 3D-мир (three.js r128): комната Веты, три плюшевых героя, позы, предметы, свет по времени суток.
   Сцена — это раскладка: WORLD.stage(setup, ctx) ставит героев и предметы, setup получает строителя W. */
(function () {
'use strict';
const C = h => new THREE.Color(h).convertSRGBToLinear();
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TOP = 0.175;                      // верх матраса — на нём сидят герои
const FONT = "Pangolin, 'Comic Sans MS', cursive";

let renderer, scene, camera, box, W = 1, H = 1;
const MATS = [];

/* ---------- рисунки на canvas: текстуры и надписи ---------- */
let aniso = 1;
function canvasTex(w, h, draw, rep, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.encoding = THREE.sRGBEncoding;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (rep) t.repeat.set(rep[0], rep[1]);
  t.anisotropy = aniso;
  return t;
}
let seed = 7;
const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
function textTex(lines, w, h, o = {}) {
  return canvasTex(w, h, (g) => {
    if (o.bg) { g.fillStyle = o.bg; g.fillRect(0, 0, w, h); }
    g.fillStyle = o.color || '#4a3428';
    g.font = `${o.size || 40}px ${FONT}`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const lh = (o.size || 40) * 1.15, y0 = h / 2 - (lines.length - 1) * lh / 2;
    lines.forEach((l, i) => g.fillText(l, w / 2, y0 + i * lh));
    if (o.strike) { g.strokeStyle = '#d9434b'; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(w * 0.12, h * 0.62); g.lineTo(w * 0.88, h * 0.4); g.stroke(); }
  });
}

/* ---------- материалы и формы ---------- */
function plush(hex, bump, rough = 0.92, sheen = '#ffffff', bs = 0.03) {
  const m = new THREE.MeshPhysicalMaterial({ color: C(hex), roughness: rough, metalness: 0, bumpMap: bump || null, bumpScale: bs, envMapIntensity: 0.55 });
  m.sheen = C(sheen).multiplyScalar(0.55);
  MATS.push(m);
  return m;
}
function shiny(hex) { const m = new THREE.MeshPhysicalMaterial({ color: C(hex), roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1 }); MATS.push(m); return m; }
function flat(hex, rough = 0.7, map = null) { const m = new THREE.MeshStandardMaterial({ color: map ? 0xffffff : C(hex), map, roughness: rough, envMapIntensity: 0.4 }); MATS.push(m); return m; }
function glow(hex) { return new THREE.MeshBasicMaterial({ color: C(hex) }); }
let SPH;
function blob(mat, sx, sy, sz, x, y, z, parent) {
  const m = new THREE.Mesh(SPH, mat);
  m.scale.set(sx, sy, sz); m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}
function mesh(geo, mat, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}
function limb(mat, r, len, parent, px, py, pz) {
  const pivot = new THREE.Group(); pivot.position.set(px, py, pz);
  mesh(new THREE.CylinderGeometry(r, r, len, 20, 1, true), mat, pivot, 0, -len / 2, 0);
  blob(mat, r, r, r, 0, 0, 0, pivot);
  blob(mat, r * 1.05, r * 1.05, r * 1.05, 0, -len, 0, pivot);
  parent.add(pivot);
  return pivot;
}
function seg(mat, a, b, r, parent) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A);
  const m = mesh(new THREE.CylinderGeometry(r, r, d.length(), 8), mat, parent);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return m;
}
function heartShape(s = 1) {
  const hs = new THREE.Shape();
  hs.moveTo(0, -0.12 * s); hs.bezierCurveTo(-0.2 * s, 0.02 * s, -0.12 * s, 0.17 * s, 0, 0.07 * s); hs.bezierCurveTo(0.12 * s, 0.17 * s, 0.2 * s, 0.02 * s, 0, -0.12 * s);
  return hs;
}

/* ---------- текстуры комнаты и героев (создаются при старте) ---------- */
let TX = {};
function makeTextures() {
  TX.wallpaper = canvasTex(128, 128, (g, w) => {
    g.fillStyle = '#ebcbc5'; g.fillRect(0, 0, w, w);
    g.strokeStyle = '#f6e3de'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(64, 10); g.lineTo(118, 64); g.lineTo(64, 118); g.lineTo(10, 64); g.closePath(); g.stroke();
    g.fillStyle = '#f2d9d3'; g.beginPath(); g.moveTo(64, 40); g.lineTo(88, 64); g.lineTo(64, 88); g.lineTo(40, 64); g.closePath(); g.fill();
  }, [14, 7]);
  TX.sheet = canvasTex(256, 222, (g, w, h) => {
    g.fillStyle = '#f4f3ee'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#6f9a68'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(0, 2); g.lineTo(w, 2); g.moveTo(0, 2); g.lineTo(w / 2, h - 2); g.lineTo(w, 2); g.moveTo(0, h - 2); g.lineTo(w, h - 2); g.stroke();
  }, [6, 4]);
  TX.duvet = canvasTex(256, 256, (g, w) => {
    g.fillStyle = '#e8e7e2'; g.fillRect(0, 0, w, w);
    for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(190,186,176,${0.15 + rnd() * 0.2})`; g.beginPath(); g.ellipse(rnd() * w, rnd() * w, 30 + rnd() * 40, 8 + rnd() * 10, -0.5, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = '#c9a650'; g.lineWidth = 3;
    for (let k = -1; k < 3; k++) { g.beginPath(); g.moveTo(k * 128, w); g.lineTo(k * 128 + w, 0); g.stroke(); }
  }, [3, 1]);
  TX.fleece = canvasTex(128, 128, (g, w) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, w, w);
    for (let i = 0; i < 520; i++) { const v = 150 + rnd() * 90 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.beginPath(); g.arc(rnd() * w, rnd() * w, 2 + rnd() * 3.5, 0, Math.PI * 2); g.fill(); }
  }, [6, 6], false);
  TX.plush = canvasTex(128, 128, (g, w) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, w, w);
    for (let i = 0; i < 2200; i++) { const v = 90 + rnd() * 90 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(rnd() * w, rnd() * w, 1.5, 1.5); }
  }, [8, 8], false);
  TX.stripes = canvasTex(64, 64, (g, w) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, w); g.fillStyle = '#2f7fd0';
    for (let i = -w; i < w * 2; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 8, 0); g.lineTo(i + 8 + w, w); g.lineTo(i + w, w); g.closePath(); g.fill(); }
  }, [6, 1]);
  TX.dots = canvasTex(64, 64, (g, w) => {
    g.fillStyle = '#d2d2d2'; g.fillRect(0, 0, w, w);
    g.fillStyle = '#ffffff'; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(rnd() * w, rnd() * w, 3.5, 0, 7); g.fill(); }
  }, [2, 2]);
  TX.knit = canvasTex(64, 64, (g, w) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, w, w); g.strokeStyle = '#c0c0c0'; g.lineWidth = 3;
    for (let x = 0; x < w; x += 8) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 4, w); g.stroke(); }
  }, [6, 3], false);
  TX.soft = canvasTex(64, 64, (g, w) => {
    const gr = g.createRadialGradient(32, 32, 2, 32, 32, 31);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  });
  TX.heart = canvasTex(64, 64, (g) => {
    g.fillStyle = '#ef5f6f'; g.beginPath(); g.moveTo(32, 56); g.bezierCurveTo(2, 34, 8, 6, 32, 20); g.bezierCurveTo(56, 6, 62, 34, 32, 56); g.fill();
  });
}
const SKY = { morning: ['#a8d5f0', '#ffe3bf', '#ffd09a'], day: ['#86c6ee', '#d8f1fc'], evening: ['#5e5c9e', '#e98e74', '#ffc98d'], night: ['#0f1434', '#2c3567'] };
function skyTex(tod, snow) {
  return canvasTex(256, 280, (g, w, h) => {
    const cols = SKY[tod], gr = g.createLinearGradient(0, 0, 0, h);
    cols.forEach((c, i) => gr.addColorStop(i / (cols.length - 1), c));
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    if (tod === 'night') {
      g.fillStyle = '#fff7d6';
      for (let i = 0; i < 26; i++) { g.beginPath(); g.arc(rnd() * w, rnd() * h * 0.7, 1 + rnd() * 1.5, 0, 7); g.fill(); }
      g.fillStyle = '#f4ecd0'; g.beginPath(); g.arc(180, 70, 26, 0, 7); g.fill();
      g.fillStyle = cols[0]; g.beginPath(); g.arc(192, 60, 23, 0, 7); g.fill();
    } else if (tod === 'evening') {
      g.fillStyle = '#ff9a62'; g.beginPath(); g.arc(130, 230, 34, 0, 7); g.fill();
    } else if (tod === 'morning') {
      g.fillStyle = '#ffd36b'; g.beginPath(); g.arc(70, 220, 26, 0, 7); g.fill();
    } else {
      g.fillStyle = '#fff0a3'; g.beginPath(); g.arc(196, 60, 22, 0, 7); g.fill();
      g.fillStyle = '#ffffff';
      [[70, 90], [120, 150]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 16, 0, 7); g.arc(x + 20, y - 8, 20, 0, 7); g.arc(x + 42, y, 15, 0, 7); g.fill(); });
    }
    g.fillStyle = { morning: '#b6a7b9', day: '#9fb2c7', evening: '#6d5d82', night: '#1d2447' }[tod];
    g.beginPath(); g.moveTo(0, h);
    [[0, 230], [40, 230], [40, 205], [80, 205], [80, 236], [120, 236], [120, 214], [150, 196], [180, 214], [180, 240], [215, 240], [215, 210], [256, 210], [256, h]].forEach(([x, y]) => g.lineTo(x, y));
    g.fill();
    if (tod === 'night' || tod === 'evening') { g.fillStyle = '#ffd27a'; [[55, 218], [95, 246], [160, 226], [228, 228], [236, 250]].forEach(([x, y]) => g.fillRect(x, y, 7, 8)); }
    if (snow) { g.fillStyle = '#ffffff'; for (let i = 0; i < 70; i++) { g.beginPath(); g.arc(rnd() * w, rnd() * h, 1.5 + rnd() * 2, 0, 7); g.fill(); } }
  });
}

/* ---------- герои ---------- */
const H3 = {};
const DEF = {
  manya: { x: -0.98, z: -0.15, ry: 0.28, s: 0.92 },
  shket: { x: 0.02, z: 0.5, ry: -1.2, s: 0.86 },
  peng: { x: 1.05, z: -0.2, ry: -0.3, s: 0.86 },
};
function brows(mat, parent, pts, rz) {
  return pts.map((p, i) => { const b = blob(mat, 0.07, 0.014, 0.02, p[0], p[1], p[2], parent); b.rotation.set(p[3] || 0, p[4] || 0, rz[i]); b.visible = false; return b; });
}
function makeManya() {
  const h = { id: 'manya', place: new THREE.Group(), body: new THREE.Group() };
  h.place.add(h.body);
  const g = h.body;
  // флис чуть кремовее и с приглушённым отблеском — иначе на белой простыне Маня «светится»
  const fleece = plush('#ece2d1', TX.fleece, 0.97, '#d9cdb8', 0.06);
  fleece.sheen.multiplyScalar(0.5);
  const face = plush('#f3ebdd', TX.plush, 0.9, '#e6dccb', 0.008);
  face.sheen.multiplyScalar(0.5);
  const inner = plush('#f3e2b8', TX.plush, 0.9, '#fff3d6', 0.01);
  const brown = flat('#5e3c2f', 0.55), stitch = flat('#8c4a3e', 0.6);
  const blush = new THREE.MeshStandardMaterial({ color: C('#f2a9a2'), transparent: true, opacity: 0.45, roughness: 1 });
  blob(fleece, 0.42, 0.5, 0.36, 0, 0.5, 0, g);
  const legL = limb(fleece, 0.13, 0.42, g, -0.17, 0.27, 0.06); legL.rotation.set(-1.35, 0, 0.08);
  const legR = limb(fleece, 0.13, 0.42, g, 0.17, 0.27, 0.06); legR.rotation.set(-1.35, 0, -0.08);
  h.arms = [limb(fleece, 0.105, 0.44, g, -0.37, 0.84, 0), limb(fleece, 0.105, 0.44, g, 0.37, 0.84, 0)];
  const head = new THREE.Group(); head.position.set(0, 1.18, 0); g.add(head); h.head = head;
  blob(fleece, 0.44, 0.41, 0.4, 0, 0, 0, head);
  blob(face, 0.31, 0.32, 0.2, 0, -0.04, 0.27, head);
  for (const s of [-1, 1]) {
    const ear = new THREE.Group(); ear.position.set(s * 0.4, 0.03, -0.02); ear.rotation.z = -s * 0.3; head.add(ear);
    blob(fleece, 0.27, 0.12, 0.16, s * 0.2, 0, 0, ear);
    blob(inner, 0.19, 0.075, 0.06, s * 0.22, 0, 0.11, ear);
  }
  h.eyes = [-1, 1].map(s => { const e = blob(brown, 0.026, 0.044, 0.018, s * 0.11, 0.05, 0.44, head); e.rotation.z = s * 0.25; return e; });
  h.brows = brows(brown, head, [[-0.11, 0.13, 0.44], [0.11, 0.13, 0.44]], [-0.4, 0.4]);
  const ny = new THREE.Group(); ny.position.set(0, -0.1, 0.468); head.add(ny);
  seg(stitch, [-0.034, 0.03, -0.004], [0, 0, 0], 0.008, ny); seg(stitch, [0.034, 0.03, -0.004], [0, 0, 0], 0.008, ny); seg(stitch, [0, 0, 0], [0, -0.045, -0.004], 0.008, ny);
  for (const s of [-1, 1]) blob(blush, 0.05, 0.028, 0.01, s * 0.19, -0.06, 0.428, head);
  h.anchor = { top: [0, 0.4, 0, 1.45], face: [0, 0.05, 0.47, 1.25], side: [-0.33, 0.26, 0.12, 1.1], onhead: [0, 0.44, 0.02, 1.2] };
  h.halfW = 0.45; h.top = 1.6;
  return h;
}
function makeShket() {
  const h = { id: 'shket', place: new THREE.Group(), body: new THREE.Group() };
  h.place.add(h.body);
  const g = h.body;
  const fur = plush('#a8744a', TX.plush, 0.9, '#f2c9a0', 0.02);
  const dark = plush('#8a5a33', TX.plush, 0.9, '#e0b48a', 0.02);
  const eyeM = shiny('#1a110b');
  blob(fur, 0.62, 0.36, 0.4, 0, 0.36, 0, g);
  for (const [x, z] of [[-0.36, -0.2], [-0.36, 0.2], [0.34, -0.2], [0.34, 0.2]]) blob(dark, 0.1, 0.08, 0.1, x, 0.06, z, g);
  const head = new THREE.Group(); head.position.set(0.5, 0.5, 0); g.add(head); h.head = head;
  blob(fur, 0.3, 0.28, 0.3, 0, 0, 0, head);
  blob(fur, 0.22, 0.2, 0.24, 0.2, -0.05, 0, head);
  blob(dark, 0.055, 0.08, 0.11, 0.405, -0.01, 0, head);
  for (const s of [-1, 1]) blob(dark, 0.065, 0.055, 0.03, -0.05, 0.25, s * 0.16, head);
  h.eyes = [-1, 1].map(s => blob(eyeM, 0.036, 0.036, 0.03, 0.15, 0.09, s * 0.235, head));
  h.brows = brows(flat('#3a2315', 0.6), head, [[0.15, 0.16, -0.24], [0.15, 0.16, 0.24]], [-0.45, -0.45]);
  h.anchor = { top: [-0.02, 0.27, 0, 0.95], face: [0.3, 0.1, 0, 0.95, Math.PI / 2], side: [-0.04, 0.24, 0.16, 0.8], onhead: [0.02, 0.31, 0, 1] };
  h.halfW = 0.4; h.top = 0.82;
  return h;
}
function makePenguin() {
  const h = { id: 'peng', place: new THREE.Group(), body: new THREE.Group() };
  h.place.add(h.body);
  const g = h.body;
  const grey = plush('#a3a6ad', TX.plush, 0.92, '#e9ecf4', 0.02);
  const black = plush('#202127', TX.plush, 0.85, '#7b7f90', 0.02);
  const white = plush('#f7f7f4', TX.plush, 0.9, '#ffffff', 0.01);
  const beakM = plush('#7c7e85', null, 0.8, '#c9cbd2');
  const foot = plush('#5e6067', null, 0.9, '#9a9ca3');
  const scarf = plush('#ffffff', null, 0.9, '#ffffff'); scarf.map = TX.stripes;
  const eyeM = shiny('#0d0d10');
  blob(grey, 0.56, 0.62, 0.5, 0, 0.62, 0, g);
  for (const s of [-1, 1]) blob(foot, 0.17, 0.06, 0.2, s * 0.2, 0.04, 0.2, g);
  h.flips = [-1, 1].map(s => { const f = new THREE.Group(); f.position.set(s * 0.5, 1.0, 0); g.add(f); blob(grey, 0.12, 0.4, 0.09, 0, -0.32, 0, f); return f; });
  const head = new THREE.Group(); head.position.set(0, 1.42, 0); g.add(head); h.head = head;
  blob(black, 0.5, 0.47, 0.46, 0, 0, 0, head);
  for (const s of [-1, 1]) blob(white, 0.24, 0.27, 0.14, s * 0.2, -0.02, 0.32, head);
  h.eyes = [-1, 1].map(s => blob(eyeM, 0.06, 0.066, 0.04, s * 0.2, 0.0, 0.452, head));
  h.brows = brows(flat('#111216', 0.6), head, [[-0.2, 0.11, 0.455], [0.2, 0.11, 0.455]], [-0.45, 0.45]);
  const beak = mesh(new THREE.ConeGeometry(0.085, 0.22, 24), beakM, head, 0, -0.14, 0.47); beak.rotation.x = Math.PI * 0.75;
  const ring = mesh(new THREE.TorusGeometry(0.42, 0.075, 16, 48), scarf, g, 0, 1.02, 0); ring.rotation.x = Math.PI / 2; ring.scale.set(1, 0.9, 1);
  blob(scarf, 0.08, 0.08, 0.06, -0.22, 1.0, 0.39, g);
  const tail = blob(scarf, 0.1, 0.18, 0.03, -0.27, 0.84, 0.42, g); tail.rotation.z = 0.4;
  h.anchor = { top: [0, 0.45, 0, 1.6], face: [0, 0.0, 0.47, 1.7], side: [0.3, 0.3, 0.22, 1.3], onhead: [0, 0.48, 0, 1.4] };
  h.halfW = 0.56; h.top = 1.89;
  return h;
}

/* ---------- одёжка и мелочи на голову ---------- */
const ACC = {
  party(color = '#f4a1b5') {
    const g = new THREE.Group();
    const m = plush(color, null, 0.7); m.map = TX.dots;
    mesh(new THREE.ConeGeometry(0.12, 0.32, 24), m, g, 0, 0.16, 0);
    blob(plush('#ffd36b', null, 0.8), 0.045, 0.045, 0.045, 0, 0.33, 0, g);
    g.rotation.z = -0.15;
    return g;
  },
  santa() {
    const g = new THREE.Group();
    const c = mesh(new THREE.ConeGeometry(0.15, 0.34, 24), plush('#d9493f', TX.plush, 0.85, '#ffb0a8'), g, 0, 0.15, 0); c.rotation.z = -0.35;
    const band = mesh(new THREE.TorusGeometry(0.14, 0.045, 12, 32), plush('#ffffff', TX.fleece, 0.95, '#ffffff', 0.03), g, 0, 0, 0); band.rotation.x = Math.PI / 2;
    blob(plush('#ffffff', TX.fleece, 0.95), 0.055, 0.055, 0.055, 0.1, 0.3, 0, g);
    return g;
  },
  nurse() {
    const g = new THREE.Group();
    mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.1, 24), plush('#ffffff', null, 0.8), g, 0, 0.05, 0);
    const hm = mesh(new THREE.ShapeGeometry(heartShape(0.3)), flat('#ef6f78', 0.6), g, 0, 0.055, 0.125); hm.castShadow = false;
    return g;
  },
  beanie() {
    const g = new THREE.Group();
    const m = plush('#9fc1e6', TX.knit, 0.95, '#dceeff', 0.05);
    mesh(new THREE.SphereGeometry(0.17, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), m, g, 0, 0, 0);
    const rim = mesh(new THREE.TorusGeometry(0.165, 0.035, 12, 32), m, g, 0, 0.01, 0); rim.rotation.x = Math.PI / 2;
    blob(plush('#f6f1e6', TX.fleece, 0.95), 0.06, 0.06, 0.06, 0, 0.19, 0, g);
    return g;
  },
  crown() {
    const g = new THREE.Group();
    const gold = new THREE.MeshStandardMaterial({ color: C('#e9b949'), metalness: 0.9, roughness: 0.3, envMapIntensity: 1.2 }); MATS.push(gold);
    mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.07, 24, 1, true), gold, g, 0, 0.035, 0);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const c = mesh(new THREE.ConeGeometry(0.028, 0.08, 12), gold, g, Math.sin(a) * 0.12, 0.1, Math.cos(a) * 0.12); c.castShadow = false; }
    blob(shiny('#ef5f6f'), 0.022, 0.022, 0.022, 0, 0.04, 0.125, g);
    return g;
  },
  bow() {
    const g = new THREE.Group();
    const m = plush('#f28aa0', TX.plush, 0.8, '#ffd0dc', 0.01);
    const l = blob(m, 0.08, 0.05, 0.025, -0.07, 0, 0, g); l.rotation.z = 0.3;
    const r = blob(m, 0.08, 0.05, 0.025, 0.07, 0, 0, g); r.rotation.z = -0.3;
    blob(m, 0.03, 0.03, 0.03, 0, 0, 0.01, g);
    return g;
  },
  glasses() {
    const g = new THREE.Group();
    const m = shiny('#2b2b33');
    for (const s of [-1, 1]) mesh(new THREE.TorusGeometry(0.055, 0.009, 8, 28), m, g, s * 0.075, 0, 0);
    seg(m, [-0.022, 0.01, 0], [0.022, 0.01, 0], 0.007, g);
    const lens = new THREE.MeshPhysicalMaterial({ color: C('#bfe3ff'), transparent: true, opacity: 0.25, roughness: 0.05 });
    for (const s of [-1, 1]) { const d = mesh(new THREE.CircleGeometry(0.052, 24), lens, g, s * 0.075, 0, 0.001); d.castShadow = false; }
    return g;
  },
  tangerine() { return P.tangerine(0, 0.02, 0, 0.12, false); },
};
function attach(h, where, obj, rot) {
  const a = h.anchor[where];
  obj.position.set(a[0], a[1], a[2]);
  obj.scale.multiplyScalar(a[3]);
  if (a[4]) obj.rotation.y += a[4];
  if (rot) obj.rotation.z += rot;
  h.head.add(obj);
  h.acc.push(obj);
}

/* ---------- позы ---------- */
const ARM = { down: [-0.25, 0.25], wave: [0, 2.5], up: [0, 2.6], hug: [-1.15, -0.35], hold: [-1.25, -0.4], eyes: [-2.45, -0.55], out: [-0.2, 0.9] };
const FLIP = { down: [0, 0.32], up: [0, 2.3], wave: [0, 2.3], hold: [-1.2, 0.1], out: [0, 1.1] };
const EYE = { open: 1, closed: 0.14, happy: 0.16, wide: 1.32, grumpy: 0.85 };
let outfit = {};
function pose(id, o = {}) {
  const h = H3[id], d = Object.assign({}, DEF[id], o);
  h.place.visible = d.visible !== false;
  h.place.position.set(d.x, d.y != null ? d.y : TOP, d.z);
  h.place.rotation.set(0, d.ry, 0);
  h.place.scale.setScalar(d.s);
  if (d.lie === 'side') { h.place.rotation.z = d.lieDir || Math.PI / 2; h.place.position.y = (d.y != null ? d.y : TOP) + h.halfW * d.s; }
  const ef = EYE[d.eyes || 'open'];
  h.eyes.forEach(e => { if (e.userData.sy0 == null) e.userData.sy0 = e.scale.y; e.userData.sy = e.userData.sy0 * ef; e.scale.y = e.userData.sy; });
  h.blinks = ef >= 0.8;
  h.brows.forEach(b => { b.visible = d.eyes === 'grumpy'; });
  if (h.arms) { const a = d.arms || ['down', 'down']; h.arms.forEach((p, i) => { const v = ARM[a[i]] || ARM.down, side = i ? 1 : -1; p.rotation.set(v[0], 0, side * v[1]); }); }
  if (h.flips) { const a = d.flips || ['down', 'down']; h.flips.forEach((p, i) => { const v = FLIP[a[i]] || FLIP.down, side = i ? 1 : -1; p.rotation.set(v[0], 0, side * v[1]); }); }
  (h.acc || []).forEach(x => { if (x.parent) x.parent.remove(x); dispose(x); });
  h.acc = [];
  const fit = outfit[id] || {};
  const hat = d.hat !== undefined ? d.hat : fit.hat;
  if (hat && ACC[hat]) attach(h, 'top', ACC[hat](d.hatColor));
  if (d.onHead === 'tangerine') attach(h, 'onhead', ACC.tangerine());
  if (d.bow !== false && fit.bow) attach(h, 'side', ACC.bow(), id === 'manya' ? 0.4 : 0);
  if (d.glasses !== false && fit.glasses) attach(h, 'face', ACC.glasses());
  h.anim = d.anim || 'breathe';
  h.head.rotation.set(0, 0, 0);
  if (d.headTilt) h.head.rotation.z = d.headTilt;
}

/* ---------- предметы: всё ставится в группу props и убирается при смене сцены ---------- */
let props, anims = [];
function add(obj) { props.add(obj); return obj; }
function sprite(tex, x, y, z, s, float) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.position.set(x, y, z); sp.scale.set(s, s, s);
  if (float) anims.push({ o: sp, y0: y, kind: float, ph: Math.random() * 6 });
  return add(sp);
}
function labelSprite(text, x, y, z, s, color) {
  const t = textTex([text], 128, 128, { size: 90, color: color || '#6f7fb0' });
  return sprite(t, x, y, z, s, 'zzz');
}
const P = {
  tangerine(x, y, z, r = 0.09, toProps = true) {
    const g = new THREE.Group(); g.position.set(x, y, z);
    blob(plush('#f7a23b', TX.plush, 0.55, '#ffd9a0', 0.01), r, r * 0.92, r, 0, r * 0.92, 0, g);
    const l = blob(plush('#6fae4f', null, 0.7), r * 0.42, r * 0.12, r * 0.22, r * 0.25, r * 1.85, 0, g); l.rotation.z = -0.4;
    return toProps ? add(g) : g;
  },
  fish(x, y, z, s = 1, toProps = true) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s);
    blob(plush('#8fc2e0', null, 0.5, '#d9f0ff'), 0.16, 0.08, 0.05, 0, 0.08, 0, g);
    const tl = mesh(new THREE.ConeGeometry(0.07, 0.1, 3), plush('#6fa7c8', null, 0.6), g, 0.19, 0.08, 0); tl.rotation.z = Math.PI / 2;
    return toProps ? add(g) : g;
  },
  laptopBack(x, z, s = 1) {
    const g = new THREE.Group(); g.position.set(x, TOP, z); g.scale.setScalar(s);
    const alu = flat('#d3d7de', 0.35);
    mesh(new THREE.BoxGeometry(0.9, 0.04, 0.6), alu, g, 0, 0.02, 0.1);
    const lid = mesh(new THREE.BoxGeometry(0.9, 0.6, 0.03), alu, g, 0, 0.3, 0.38); lid.rotation.x = 0.2;
    const hm = mesh(new THREE.ShapeGeometry(heartShape(0.6)), flat('#f29aa0', 0.6), g, 0, 0.33, 0.405); hm.rotation.x = 0.2; hm.castShadow = false;
    return add(g);
  },
  popcorn(x, z) {
    const g = new THREE.Group(); g.position.set(x, TOP, z);
    const m = plush('#ffffff', null, 0.7); m.map = canvasTex(64, 16, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#e1544a'; for (let i = 0; i < w; i += 16) c.fillRect(i, 0, 8, h); });
    mesh(new THREE.CylinderGeometry(0.17, 0.12, 0.22, 24), m, g, 0, 0.11, 0);
    const pm = plush('#fff6dc', TX.plush, 0.9);
    for (let i = 0; i < 9; i++) blob(pm, 0.05, 0.045, 0.05, (rnd() - 0.5) * 0.24, 0.23 + rnd() * 0.06, (rnd() - 0.5) * 0.24, g);
    return add(g);
  },
  cup(x, z, color = '#ffffff', empty = false) {
    const g = new THREE.Group(); g.position.set(x, TOP, z);
    const m = plush(color, null, 0.3);
    mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.015, 24), m, g, 0, 0.008, 0);
    mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.13, 24, 1, true), m, g, 0, 0.08, 0).material.side = THREE.DoubleSide;
    const hd = mesh(new THREE.TorusGeometry(0.04, 0.012, 8, 20), m, g, 0.1, 0.08, 0); hd.rotation.y = Math.PI / 2;
    if (!empty) { mesh(new THREE.CircleGeometry(0.085, 24), flat('#b9763f', 0.3), g, 0, 0.13, 0).rotation.x = -Math.PI / 2; P.steam(x, TOP + 0.25, z); }
    return add(g);
  },
  teapot(x, z) {
    const g = new THREE.Group(); g.position.set(x, TOP, z);
    const m = plush('#a9cbe0', null, 0.3, '#e6f3ff');
    blob(m, 0.2, 0.16, 0.2, 0, 0.16, 0, g);
    const sp = mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.2, 12), m, g, 0.22, 0.22, 0); sp.rotation.z = -0.8;
    const hd = mesh(new THREE.TorusGeometry(0.08, 0.02, 8, 20), m, g, -0.2, 0.18, 0);
    blob(m, 0.09, 0.03, 0.09, 0, 0.31, 0, g); blob(plush('#f2c9a0', null, 0.5), 0.03, 0.03, 0.03, 0, 0.35, 0, g);
    return add(g);
  },
  cookies(x, z) {
    const g = new THREE.Group(); g.position.set(x, TOP, z);
    mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.02, 32), plush('#ffffff', null, 0.3), g, 0, 0.01, 0);
    const cm = plush('#dba468', TX.plush, 0.9, '#ffe2b8', 0.02);
    [[-0.07, 0.03], [0.08, -0.02], [0, 0.1]].forEach(([a, b]) => mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.025, 20), cm, g, a, 0.035, b));
    return add(g);
  },
  book(x, y, z, rx = -0.9, ry = 0) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.set(rx, ry, 0);
    const pageT = canvasTex(128, 160, (c, w, h) => { c.fillStyle = '#fffaf0'; c.fillRect(0, 0, w, h); c.fillStyle = '#cdbfa8'; for (let i = 24; i < h - 20; i += 16) c.fillRect(14, i, w - 28, 4); });
    const cover = flat('#c0504d', 0.8), page = flat('#ffffff', 0.9, pageT);
    for (const s of [-1, 1]) {
      const half = new THREE.Group(); half.rotation.y = s * 0.25; g.add(half);
      mesh(new THREE.BoxGeometry(0.26, 0.34, 0.012), cover, half, s * 0.13, 0, -0.008);
      mesh(new THREE.PlaneGeometry(0.24, 0.32), page, half, s * 0.125, 0, 0.0);
    }
    return add(g);
  },
  box(x, z, label, strike, open = true) {
    const g = new THREE.Group(); g.position.set(x, TOP, z);
    const card = plush('#d8a46a', TX.plush, 0.95, '#f2d0a8', 0.02), inner = flat('#8f6031', 0.9);
    const w = 0.85, d = 0.6, hgt = 0.42;
    mesh(new THREE.BoxGeometry(w, 0.02, d), inner, g, 0, 0.01, 0);
    mesh(new THREE.BoxGeometry(w, hgt, 0.02), inner, g, 0, hgt / 2, -d / 2);
    for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.02, hgt, d), card, g, s * w / 2, hgt / 2, 0);
    mesh(new THREE.BoxGeometry(w, hgt, 0.02), card, g, 0, hgt / 2, d / 2);
    if (label) { const lt = textTex([label], 320, 112, { size: 78, color: '#4f2e12', strike }); const pl = mesh(new THREE.PlaneGeometry(0.78, 0.27), new THREE.MeshBasicMaterial({ map: lt, transparent: true }), g, 0, hgt * 0.48, d / 2 + 0.014); pl.castShadow = false; }
    if (open) for (const s of [-1, 1]) { const f = mesh(new THREE.BoxGeometry(0.02, 0.32, d), card, g, s * (w / 2 + 0.12), hgt + 0.1, 0); f.rotation.z = -s * 0.7; }
    return add(g);
  },
  sign(x, z, lines) {
    const g = new THREE.Group(); g.position.set(x, TOP, z); g.rotation.z = -0.08;
    mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.6, 12), flat('#b98a5c', 0.7), g, 0, 0.8, 0);
    const tt = textTex(lines, 320, 180, { size: 58, color: '#c64a3e', bg: '#fffaf0' });
    mesh(new THREE.BoxGeometry(0.95, 0.55, 0.03), [flat('#e8ddcc'), flat('#e8ddcc'), flat('#e8ddcc'), flat('#e8ddcc'), flat('#ffffff', 0.9, tt), flat('#e8ddcc')], g, 0, 1.55, 0.03);
    return add(g);
  },
  note(x, z, lines, ry = 0.2) {
    const tt = textTex(lines, 256, 140, { size: 44, color: '#5a7fb5', bg: '#fffdf6' });
    const m = mesh(new THREE.PlaneGeometry(0.6, 0.33), flat('#ffffff', 0.9, tt), null, x, TOP + 0.005, z);
    m.rotation.set(-Math.PI / 2, 0, ry); m.castShadow = false;
    return add(m);
  },
  flag(x, y, z, text) {
    const g = new THREE.Group(); g.position.set(x, y, z);
    mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.8, 8), flat('#8a6340', 0.7), g, 0, 0.4, 0);
    const tt = textTex([text], 256, 128, { size: 44, color: '#ffffff', bg: '#f29aa0' });
    const f = mesh(new THREE.PlaneGeometry(0.62, 0.3), new THREE.MeshStandardMaterial({ map: tt, side: THREE.DoubleSide, roughness: 0.9 }), g, 0.32, 0.64, 0);
    anims.push({ o: f, kind: 'flag', ph: 0 });
    return add(g);
  },
  ivStand(x, z, tx, ty, tz) {
    const g = new THREE.Group(); g.position.set(x, TOP, z);
    const metal = new THREE.MeshStandardMaterial({ color: C('#b9bec6'), metalness: 0.8, roughness: 0.3 }); MATS.push(metal);
    mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.9, 12), metal, g, 0, 0.95, 0);
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; seg(metal, [0, 0.05, 0], [Math.sin(a) * 0.22, 0, Math.cos(a) * 0.22], 0.014, g); }
    seg(metal, [-0.12, 1.88, 0], [0.12, 1.88, 0], 0.012, g);
    const bag = new THREE.MeshPhysicalMaterial({ color: C('#f6a463'), transparent: true, opacity: 0.85, roughness: 0.2, clearcoat: 1 });
    blob(bag, 0.11, 0.17, 0.05, 0.1, 1.65, 0, g);
    const lab = textTex(['компот'], 128, 48, { size: 34, color: '#a5582a' });
    mesh(new THREE.PlaneGeometry(0.16, 0.06), new THREE.MeshBasicMaterial({ map: lab, transparent: true }), g, 0.1, 1.66, 0.052).castShadow = false;
    const pts = [new THREE.Vector3(x + 0.1, TOP + 1.48, z), new THREE.Vector3(x + 0.2, TOP + 0.9, z + 0.1), new THREE.Vector3((x + tx) / 2, ty + 0.2, (z + tz) / 2), new THREE.Vector3(tx, ty, tz)];
    add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.008, 6), new THREE.MeshStandardMaterial({ color: C('#efe2d4'), transparent: true, opacity: 0.8 })));
    return add(g);
  },
  meatball(x, z, r = 0.32) {
    const g = new THREE.Group(); g.position.set(x, TOP, z);
    const ft = canvasTex(512, 256, (c, w, h) => {
      c.fillStyle = '#8a4c2c'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) { c.fillStyle = rnd() > 0.5 ? '#6f3a20' : '#9c5c38'; c.fillRect(rnd() * w, rnd() * h, 4, 4); }
      const cx = w * 0.25;
      c.strokeStyle = '#2b1309'; c.lineWidth = 12; c.lineCap = 'round';
      c.beginPath(); c.moveTo(cx - 44, 86); c.lineTo(cx - 10, 100); c.moveTo(cx + 44, 86); c.lineTo(cx + 10, 100); c.stroke();
      c.fillStyle = '#f3eee3'; c.beginPath(); c.arc(cx - 26, 116, 12, 0, 7); c.arc(cx + 26, 116, 12, 0, 7); c.fill();
      c.fillStyle = '#1a0e08'; c.beginPath(); c.arc(cx - 24, 117, 5.5, 0, 7); c.arc(cx + 24, 117, 5.5, 0, 7); c.fill();
      c.fillStyle = '#f1e8d2'; c.fillRect(cx - 26, 150, 52, 16); c.strokeStyle = '#2b1309'; c.lineWidth = 3; c.strokeRect(cx - 26, 150, 52, 16);
      c.beginPath(); c.moveTo(cx - 8, 150); c.lineTo(cx - 8, 166); c.moveTo(cx + 9, 150); c.lineTo(cx + 9, 166); c.stroke();
    });
    blob(plush('#ffffff', TX.plush, 0.7, '#ffb08a', 0.04), r, r * 0.95, r, 0, r * 0.95, 0, g).material.map = ft;
    const sauce = shiny('#b6341a');
    const cap = mesh(new THREE.SphereGeometry(r * 1.03, 32, 12, 0, Math.PI * 2, 0, Math.PI * 0.3), sauce, g, 0, r * 0.95, 0);
    return add(g);
  },
  tub(x, z, r = 0.62) {
    const g = new THREE.Group(); g.position.set(x, TOP, z);
    const wood = plush('#c8915f', TX.plush, 0.8, '#ffd7b0', 0.02);
    const wall = mesh(new THREE.CylinderGeometry(r, r * 0.88, 0.45, 40, 1, true), wood, g, 0, 0.225, 0); wall.material.side = THREE.DoubleSide;
    for (const y of [0.1, 0.36]) { const hoop = mesh(new THREE.TorusGeometry(r * (0.9 + y * 0.25), 0.015, 8, 48), flat('#6b6b6b', 0.4), g, 0, y, 0); hoop.rotation.x = Math.PI / 2; }
    const water = new THREE.MeshPhysicalMaterial({ color: C('#9fd6e8'), roughness: 0.05, transparent: true, opacity: 0.85, clearcoat: 1 });
    mesh(new THREE.CircleGeometry(r * 0.97, 40), water, g, 0, 0.36, 0).rotation.x = -Math.PI / 2;
    [[-0.35, 0.2], [0.3, 0.25], [0.15, -0.3], [-0.2, -0.35]].forEach(([a, b]) => g.add(P.tangerine(a, 0.32, b, 0.07, false)));
    for (let i = 0; i < 3; i++) P.steam(x + (i - 1) * 0.3, TOP + 0.6, z);
    return add(g);
  },
  steam(x, y, z) {
    const sp = sprite(TX.soft, x, y, z, 0.25, 'steam');
    sp.material.opacity = 0;
    return sp;
  },
  towel(x, z) {
    const g = new THREE.Group(); g.position.set(x, TOP, z);
    const tt = canvasTex(64, 64, (c, w) => { c.fillStyle = '#f6c6cf'; c.fillRect(0, 0, w, w); c.fillStyle = '#ffffff'; c.fillRect(0, 20, w, 8); c.fillRect(0, 36, w, 8); });
    mesh(new THREE.BoxGeometry(0.4, 0.14, 0.28), plush('#ffffff', TX.plush, 0.95, '#ffe0e6').clone(), g, 0, 0.07, 0).material.map = tt;
    return add(g);
  },
  cake(x, z, label) {
    const g = new THREE.Group(); g.position.set(x, TOP, z);
    mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.03, 40), plush('#ffffff', null, 0.3), g, 0, 0.015, 0);
    mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.26, 40), plush('#f7cfc6', TX.plush, 0.7, '#ffe8e2', 0.01), g, 0, 0.16, 0);
    mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.2, 40), plush('#fdeee2', TX.plush, 0.7, '#ffffff', 0.01), g, 0, 0.39, 0);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; blob(shiny('#d9434b'), 0.035, 0.035, 0.035, Math.sin(a) * 0.15, 0.5, Math.cos(a) * 0.15, g); }
    mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.16, 12), plush('#9fd0f0', null, 0.5), g, 0, 0.57, 0);
    const fl = mesh(new THREE.ConeGeometry(0.03, 0.08, 12), glow('#ffc94d'), g, 0, 0.69, 0); fl.castShadow = false;
    anims.push({ o: fl, kind: 'flame', ph: 0 });
    const lamp = new THREE.PointLight(C('#ffb347'), 0.6, 2, 2); lamp.position.set(0, 0.75, 0); g.add(lamp);
    if (label) { const lt = textTex([label], 256, 64, { size: 40, color: '#b5545a' }); const pl = mesh(new THREE.PlaneGeometry(0.5, 0.125), new THREE.MeshBasicMaterial({ map: lt, transparent: true }), g, 0, 0.16, 0.325); pl.castShadow = false; }
    return add(g);
  },
  banner(text, color = '#f29aa0') {
    const g = new THREE.Group(); g.position.set(0, 0, -1.54);
    const tt = textTex([text], 512, 128, { size: 66, color: '#ffffff', bg: color });
    const b = mesh(new THREE.PlaneGeometry(1.5, 0.375), new THREE.MeshStandardMaterial({ map: tt, roughness: 0.9 }), g, -0.32, 2.95, 0.02); b.castShadow = false;
    const cols = ['#f29aa0', '#ffd36b', '#9fe0c8', '#a9c4f2'];
    for (let i = 0; i < 11; i++) {
      const t = i / 10, x = -2.2 + t * 4.4, y = 3.45 - Math.sin(t * Math.PI) * 0.3;
      const f = mesh(new THREE.ConeGeometry(0.11, 0.24, 3), flat(cols[i % 4], 0.8), g, x, y, 0.06); f.rotation.set(0, 0, Math.PI); f.scale.z = 0.15;
    }
    return add(g);
  },
  confetti(n = 40) {
    const cols = ['#f29aa0', '#ffd36b', '#9fe0c8', '#a9c4f2', '#c7a4f0'];
    for (let i = 0; i < n; i++) {
      const m = mesh(new THREE.PlaneGeometry(0.05, 0.025), new THREE.MeshStandardMaterial({ color: C(cols[i % 5]), side: THREE.DoubleSide }), null, (rnd() - 0.5) * 4, TOP + 0.003, (rnd() - 0.4) * 2.2);
      m.rotation.set(-Math.PI / 2, 0, rnd() * 3); m.castShadow = false; add(m);
    }
  },
  tree(x, z) {
    const g = new THREE.Group(); g.position.set(x, TOP, z);
    mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.18, 16), plush('#c0504d', null, 0.8), g, 0, 0.09, 0);
    const green = plush('#4f9a5f', TX.plush, 0.9, '#bfe8c8', 0.02);
    [[0.48, 0.5, 0.42], [0.38, 0.45, 0.75], [0.27, 0.4, 1.05]].forEach(([r, hh, y]) => mesh(new THREE.ConeGeometry(r, hh, 24), green, g, 0, y, 0));
    const cols = ['#e5484d', '#ffd36b', '#7fb6e6', '#c7a4f0'];
    for (let i = 0; i < 12; i++) { const a = i * 2.4, y = 0.35 + (i % 4) * 0.2, r = 0.42 - (i % 4) * 0.08; blob(shiny(cols[i % 4]), 0.04, 0.04, 0.04, Math.sin(a) * r, y, Math.cos(a) * r, g); }
    const star = mesh(new THREE.OctahedronGeometry(0.08), glow('#ffd36b'), g, 0, 1.32, 0); anims.push({ o: star, kind: 'spin', ph: 0 });
    return add(g);
  },
  bouquet(x, z, tag) {
    const g = new THREE.Group(); g.position.set(x, TOP, z);
    const glass = new THREE.MeshPhysicalMaterial({ color: C('#a9cbe0'), transparent: true, opacity: 0.6, roughness: 0.05, clearcoat: 1 });
    mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.32, 24), glass, g, 0, 0.16, 0);
    const stem = flat('#4f8c3c', 0.7), cols = ['#f28aa0', '#ffd36b', '#ef6f78', '#ffb0c0', '#f28aa0'];
    cols.forEach((c, i) => { const a = (i - 2) * 0.22, top = [Math.sin(a) * 0.3, 0.75 + (i % 2) * 0.1, (i % 3 - 1) * 0.08]; seg(stem, [0, 0.2, 0], top, 0.01, g); blob(plush(c, null, 0.7, '#ffffff'), 0.06, 0.09, 0.06, top[0], top[1] + 0.05, top[2], g); });
    if (tag) { const lt = textTex([tag], 192, 80, { size: 46, color: '#c64a5a', bg: '#fffdf6' }); const pl = mesh(new THREE.PlaneGeometry(0.3, 0.125), new THREE.MeshStandardMaterial({ map: lt }), g, 0.22, 0.12, 0.13); pl.rotation.z = -0.15; pl.castShadow = false; }
    return add(g);
  },
  balloon(x, y, z, tx, ty, tz) {
    const geo = new THREE.ExtrudeGeometry(heartShape(2.4), { depth: 0.12, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 6 });
    geo.center();
    const b = mesh(geo, shiny('#ef5f6f'), null, x, y, z); add(b);
    anims.push({ o: b, y0: y, kind: 'bob', ph: 0 });
    add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(x, y - 0.3, z), new THREE.Vector3((x + tx) / 2 + 0.1, (y + ty) / 2, (z + tz) / 2), new THREE.Vector3(tx, ty, tz)]), 20, 0.004, 4), flat('#b9a9a0')));
    return b;
  },
  pillow(x, y, z, sx, sy, sz, color = '#fbfaf6') { return add(blob(plush(color, TX.plush, 0.9, '#ffffff', 0.01), sx, sy, sz, x, y, z, new THREE.Group()).parent); },
  lump(x, z, sx, sy, sz) {
    const m = mesh(new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), flat('#ffffff', 0.9, TX.duvet), null, x, TOP, z);
    m.scale.set(sx, sy, sz); return add(m);
  },
  /* арка-крыша крепости: полуцилиндр, проём смотрит на нас */
  roof(x, z, r, depth) {
    const m = mesh(new THREE.CylinderGeometry(r, r, depth, 40, 1, true, Math.PI / 2, Math.PI), flat('#ffffff', 0.9, TX.duvet), null, x, TOP + 0.5, z);
    m.rotation.x = Math.PI / 2; m.material.side = THREE.DoubleSide; return add(m);
  },
  blanket() {
    const m = mesh(new THREE.CylinderGeometry(0.7, 0.7, 3.8, 40, 1, true, 0, Math.PI), flat('#ffffff', 0.9, TX.duvet), null, 0, TOP - 0.05, 0.25);
    m.rotation.z = Math.PI / 2; m.scale.set(1, 1, 0.75); m.material.side = THREE.DoubleSide; return add(m);
  },
  hearts(pts, s = 0.22) { pts.forEach(p => sprite(TX.heart, p[0], p[1], p[2], s, 'float')); },
  zzz(x, y, z) { labelSprite('z', x, y, z, 0.22); const a = labelSprite('Z', x + 0.15, y + 0.2, z, 0.3); a.userData.delay = 0.8; },
  notes(x, y, z) { ['♪', '♫', '♪'].forEach((n, i) => sprite(textTex([n], 128, 128, { size: 100, color: '#8a6fc4' }), x + i * 0.5, y + (i % 2) * 0.3, z, 0.3, 'float')); },
  screenLight(x, y, z) { const l = new THREE.PointLight(C('#bfe0ff'), 0.8, 3, 2); l.position.set(x, y, z); anims.push({ o: l, kind: 'flicker', ph: 0, base: 0.8 }); return add(l); },
};

/* ---------- кухня: продукты, миска, блюда ---------- */
function labelBox(w, h, d, color, text, textColor) {
  const g = new THREE.Group();
  const side = plush(color, null, 0.8, '#ffffff');
  const lt = textTex([text], 128, 64, { size: 30, color: textColor || '#4a3428', bg: color });
  mesh(new THREE.BoxGeometry(w, h, d), [side, side, side, side, flat('#ffffff', 0.8, lt), side], g, 0, h / 2, 0);
  return g;
}
const ING = {
  flour: () => { const g = labelBox(0.2, 0.24, 0.13, '#f6f1e6', 'МУКА', '#b5545a'); blob(plush('#f6f1e6', TX.plush, 0.9), 0.1, 0.05, 0.065, 0, 0.25, 0, g); return g; },
  milk: () => { const g = labelBox(0.14, 0.24, 0.14, '#ffffff', 'МОЛОКО', '#2f7fd0'); const r = mesh(new THREE.ConeGeometry(0.1, 0.08, 4), plush('#7fb6e6', null, 0.6), g, 0, 0.28, 0); r.rotation.y = Math.PI / 4; return g; },
  egg: () => { const g = new THREE.Group(); blob(plush('#fbf1dc', null, 0.4, '#ffffff'), 0.065, 0.085, 0.065, 0, 0.085, 0, g); return g; },
  tangerine: () => P.tangerine(0, 0, 0, 0.09, false),
  clover: () => { const g = new THREE.Group(); const m = plush('#7dbf63', null, 0.7); [[-0.05, 0], [0.05, 0], [0, 0.08]].forEach(([x, y]) => blob(m, 0.06, 0.06, 0.025, x, 0.12 + y, 0, g)); seg(flat('#4f8c3c'), [0, 0, 0], [0, 0.12, 0], 0.01, g); return g; },
  carrot: () => { const g = new THREE.Group(); const c = mesh(new THREE.ConeGeometry(0.05, 0.26, 16), plush('#f08a3c', null, 0.6), g, 0, 0.13, 0); c.rotation.x = Math.PI; blob(plush('#6fae4f', null, 0.7), 0.04, 0.07, 0.04, 0, 0.3, 0, g); return g; },
  apple: () => { const g = new THREE.Group(); blob(shiny('#e5484d'), 0.09, 0.085, 0.09, 0, 0.09, 0, g); seg(flat('#6b4524'), [0, 0.17, 0], [0.01, 0.22, 0], 0.008, g); return g; },
  fish: () => P.fish(0, 0, 0, 1, false),
};
const ING_COLOR = { flour: '#f6f1e6', milk: '#ffffff', egg: '#ffd66b', tangerine: '#f7a23b', clover: '#7dbf63', carrot: '#f08a3c', apple: '#e5484d', fish: '#9fc8e0' };
function plate(g, r = 0.3) { mesh(new THREE.CylinderGeometry(r, r * 0.9, 0.03, 40), plush('#ffffff', null, 0.25, '#ffffff'), g, 0, 0.015, 0); }
const DISH = {
  pancakes: () => {
    const g = new THREE.Group(); plate(g);
    const pm = plush('#e8b46a', TX.plush, 0.6, '#ffe2b0', 0.01);
    for (let i = 0; i < 5; i++) mesh(new THREE.CylinderGeometry(0.2 - i * 0.004, 0.2, 0.035, 32), pm, g, (i % 2 - 0.5) * 0.01, 0.05 + i * 0.036, 0);
    mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.012, 32), shiny('#c97a2a'), g, 0, 0.225, 0);
    blob(shiny('#d9434b'), 0.035, 0.035, 0.035, 0, 0.26, 0, g);
    return g;
  },
  pie: () => {
    const g = new THREE.Group(); plate(g, 0.34);
    mesh(new THREE.CylinderGeometry(0.27, 0.25, 0.11, 40), plush('#e3a65f', TX.plush, 0.6, '#ffd9a0', 0.02), g, 0, 0.085, 0);
    const om = plush('#f7a23b', null, 0.4, '#ffd9a0');
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; blob(om, 0.05, 0.015, 0.035, Math.sin(a) * 0.17, 0.145, Math.cos(a) * 0.17, g).rotation.y = a; }
    blob(om, 0.06, 0.02, 0.06, 0, 0.15, 0, g);
    return g;
  },
  salad: () => {
    const g = new THREE.Group();
    const pts = []; for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI / 2; pts.push(new THREE.Vector2(Math.sin(a) * 0.26 + 0.02, -Math.cos(a) * 0.14 + 0.14)); }
    const bm = plush('#bfe3d6', null, 0.3, '#ffffff'); bm.side = THREE.DoubleSide;
    mesh(new THREE.LatheGeometry(pts, 32), bm, g);
    const leaf = plush('#7dbf63', null, 0.7), car = plush('#f08a3c', null, 0.6), app = shiny('#e5484d');
    for (let i = 0; i < 9; i++) { const a = i * 2.3, r = 0.08 + (i % 3) * 0.05; blob(leaf, 0.06, 0.03, 0.05, Math.sin(a) * r, 0.15, Math.cos(a) * r, g).rotation.y = a; }
    for (let i = 0; i < 4; i++) { const a = i * 1.7; const c = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 8), car, g, Math.sin(a) * 0.1, 0.18, Math.cos(a) * 0.1); c.rotation.z = 1.2; c.rotation.y = a; }
    for (let i = 0; i < 3; i++) { const a = i * 2.1 + 0.5; blob(app, 0.03, 0.03, 0.03, Math.sin(a) * 0.14, 0.17, Math.cos(a) * 0.14, g); }
    return g;
  },
  fishcakes: () => {
    const g = new THREE.Group(); plate(g);
    const fm = plush('#b9773f', TX.plush, 0.7, '#ffd0a0', 0.03);
    [[-0.1, -0.05], [0.1, -0.05], [0, 0.1]].forEach(([x, z]) => blob(fm, 0.09, 0.04, 0.07, x, 0.06, z, g));
    mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 20), plush('#ffe066', null, 0.4), g, 0.18, 0.04, 0.12);
    blob(plush('#6fae4f', null, 0.7), 0.03, 0.02, 0.05, -0.17, 0.05, 0.12, g);
    return g;
  },
};
const COOK = { bowl: null, fill: null, spoon: null, n: 0, dish: null, stirring: false };
function cookBowl(x = 0, z = 0.6) {
  const g = new THREE.Group(); g.position.set(x, TOP, z);
  const pts = []; for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI / 2; pts.push(new THREE.Vector2(Math.sin(a) * 0.3 + 0.02, -Math.cos(a) * 0.22 + 0.22)); }
  const bm = plush('#ffffff', null, 0.25, '#ffffff'); bm.side = THREE.DoubleSide;
  mesh(new THREE.LatheGeometry(pts, 40), bm, g);
  const st = mesh(new THREE.TorusGeometry(0.315, 0.012, 8, 40), flat('#7fb6e6', 0.4), g, 0, 0.2, 0); st.rotation.x = Math.PI / 2;
  COOK.fill = mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.02, 32), plush('#f3e3c0', null, 0.6), g, 0, 0.04, 0);
  COOK.fill.visible = false;
  COOK.spoon = new THREE.Group(); COOK.spoon.position.set(0, 0.08, 0); g.add(COOK.spoon);
  const sp = mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.55, 8), flat('#c99a6a', 0.6), COOK.spoon, 0.09, 0.22, 0); sp.rotation.z = -0.35;
  COOK.bowl = add(g); COOK.n = 0;
}
function cookAdd(ing) {
  if (!COOK.bowl || !ING[ing]) return;
  const o = ING[ing](), b = COOK.bowl.position;
  o.position.set(b.x + (Math.random() - 0.5) * 0.1, TOP + 1.5, b.z);
  add(o);
  anims.push({ o, kind: 'drop', y0: TOP + 1.5, y1: TOP + 0.08, t0: t, dur: 0.45 });
  setTimeout(() => {
    COOK.n++;
    const f = COOK.fill; if (!f) return;
    f.visible = true;
    f.position.y = 0.04 + COOK.n * 0.045;
    f.scale.setScalar(1 + COOK.n * 0.08);
    f.material.color.lerp(C(ING_COLOR[ing]), 1 / COOK.n);
  }, 450);
}
function cookServe(dish, x = 0, z = 0.6) {
  const g = DISH[dish](); g.position.set(x, TOP, z); add(g);
  COOK.dish = g;
  for (let i = 0; i < 2; i++) P.steam(x + (i - 0.5) * 0.15, TOP + 0.35, z);
  anims.push({ o: g, kind: 'pop', t0: t, dur: 0.5 });
}
const COOK_API = {
  bowl: cookBowl, add: cookAdd, serve: cookServe,
  stir(on) { COOK.stirring = on; },
  clear() { if (COOK.bowl) { anims.push({ o: COOK.bowl, kind: 'shrink', t0: t, dur: 0.4 }); COOK.bowl = null; } },
  oven(on) { if (OVEN.door) { OVEN.door.emissiveIntensity = on ? 1.4 : 0; ovenLight.intensity = on ? 1.6 : 0; } },
  eat() { if (COOK.dish) { anims.push({ o: COOK.dish, kind: 'shrink', t0: t + 0.3, dur: 1.4 }); COOK.dish = null; } },
};

/* ---------- вход в комнату: трое заходят по очереди ---------- */
let walkCb = null;
const WALK = { manya: 'stomp', shket: 'roll', peng: 'waddle' };
function walkIn(cb) {
  ['manya', 'shket', 'peng'].forEach((id, i) => {
    const h = H3[id];
    if (!h.place.visible) return;
    const to = h.place.position.clone(), head = id === 'shket' ? 0 : Math.PI / 2;
    h.walk = { from: new THREE.Vector3(-3.7 - i * 0.3, to.y, to.z + 0.3), to, ry0: head, ry1: h.place.rotation.y, t0: t + i * 0.55, dur: 1.6, style: WALK[id] };
    h.place.position.copy(h.walk.from); h.place.rotation.y = head;
  });
  walkCb = cb || null;
  if (!Object.values(H3).some(h => h.walk) && cb) cb();
}

/* ---------- комната ---------- */
let skyMats = [], bulbs = [], sun, hemi, lamp, pigeon, ovenLight, curRoom = 'bedroom';
const ROOMS = {}, OVEN = {};
function buildBedroom() {
  const room = new THREE.Group(); scene.add(room);
  const wall = mesh(new THREE.PlaneGeometry(14, 7), flat('#ffffff', 0.85, TX.wallpaper), room, 0, 2.3, -1.6); wall.castShadow = false;
  const floor = mesh(new THREE.PlaneGeometry(14, 10), flat('#cdbba8', 0.8), room, 0, -0.4, 0); floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
  mesh(new THREE.BoxGeometry(4.4, 1.2, 0.14), plush('#ece0d3', TX.plush, 0.9, '#ffffff', 0.01), room, 0, 0.6, -1.5);
  const white = flat('#e9e7e0', 0.85);
  const sheetM = flat('#ffffff', 0.85, TX.sheet); sheetM.color.setScalar(0.93);
  const mattress = mesh(new THREE.BoxGeometry(4.4, 0.4, 2.8), [white, white, sheetM, white, white, white], room, 0, -0.025, -0.1); mattress.castShadow = false;
  const pillowM = plush('#fbfaf6', TX.plush, 0.9, '#ffffff', 0.01);
  for (const x of [-1.05, 1.05]) blob(pillowM, 0.82, 0.24, 0.36, x, 0.35, -1.12, room);
  const duvet = mesh(new THREE.CylinderGeometry(0.2, 0.2, 4.4, 32), plush('#ffffff', null, 0.9, '#ffffff'), room, 0, 0.34, 1.12);
  duvet.material.map = TX.duvet; duvet.rotation.z = Math.PI / 2;
  const winG = makeWindow(room, 1.55, 2.35, '#f0d3a0');
  pigeon = new THREE.Group(); pigeon.position.set(0.3, -0.76, 0.1); winG.add(pigeon);
  const pg = plush('#9aa3b0', TX.plush, 0.8, '#e0e6ee');
  blob(pg, 0.09, 0.07, 0.12, 0, 0, 0, pigeon); blob(pg, 0.055, 0.055, 0.055, 0, 0.09, 0.08, pigeon);
  blob(shiny('#222'), 0.012, 0.012, 0.012, 0.03, 0.1, 0.125, pigeon);
  const beak = mesh(new THREE.ConeGeometry(0.012, 0.04, 8), flat('#d9a65a'), pigeon, 0, 0.085, 0.14); beak.rotation.x = Math.PI / 2;
  const wood = flat('#c79c74', 0.6);
  mesh(new THREE.BoxGeometry(1.2, 0.06, 0.24), wood, room, -1.45, 2.05, -1.46);
  [['#8fb3c9', -1.9, 0.32], ['#e3b46c', -1.8, 0.27], ['#c98b8b', -1.69, 0.36], ['#a9c7a0', -1.58, 0.29]].forEach(([c, x, h]) => mesh(new THREE.BoxGeometry(0.09, h, 0.18), flat(c, 0.7), room, x, 2.08 + h / 2, -1.46));
  mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.18, 24), flat('#d98e6a', 0.7), room, -1.05, 2.17, -1.46);
  const leaf = plush('#7fae6a', null, 0.8, '#d6f0c8');
  for (const [x, y, r] of [[-1.05, 2.42, 0], [-1.12, 2.36, 0.5], [-0.98, 2.36, -0.5]]) blob(leaf, 0.05, 0.14, 0.05, x, y, -1.46, room).rotation.z = r;
  mesh(new THREE.BoxGeometry(0.55, 0.66, 0.05), wood, room, -1.4, 2.85, -1.56);
  mesh(new THREE.PlaneGeometry(0.43, 0.54), flat('#fffaf2', 0.9), room, -1.4, 2.85, -1.53).castShadow = false;
  mesh(new THREE.ShapeGeometry(heartShape(1)), flat('#ef8f8a', 0.6), room, -1.4, 2.84, -1.525).castShadow = false;
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-3.2, 3.9, -1.5), new THREE.Vector3(0, 3.2, -1.3), new THREE.Vector3(3.2, 3.95, -1.5));
  mesh(new THREE.TubeGeometry(curve, 40, 0.008, 6, false), flat('#6f5a4e', 0.6), room).castShadow = false;
  const cols = ['#ffd36b', '#f7a7b8', '#9fe0c8'];
  for (let i = 0; i < 13; i++) {
    const p = curve.getPoint((i + 0.5) / 13);
    const m = new THREE.MeshStandardMaterial({ color: C(cols[i % 3]), emissive: C(cols[i % 3]), emissiveIntensity: 0.2, roughness: 0.4 });
    const b = mesh(new THREE.SphereGeometry(0.045, 16, 12), m, room, p.x, p.y - 0.07, p.z); b.scale.set(1, 1.3, 1); b.castShadow = false;
    bulbs.push(m);
  }
  return room;
}
/* окно с небом, рамой, подоконником и шторками — небо общее для всех окон и меняется со временем суток */
function makeWindow(parent, x, y, curtain, w = 1.3, h = 1.5) {
  const winG = new THREE.Group(); winG.position.set(x, y, -1.56); parent.add(winG);
  const sm = new THREE.MeshBasicMaterial({ map: skyMats[0] ? skyMats[0].map : skyTex('day') });
  skyMats.push(sm);
  winG.add(new THREE.Mesh(new THREE.PlaneGeometry(w, h), sm));
  const frameM = flat('#fbf7f0', 0.5);
  for (const [fw, fh, fx, fy] of [[w + 0.12, 0.07, 0, h / 2 + 0.03], [w + 0.12, 0.07, 0, -h / 2 - 0.03], [0.07, h + 0.1, -w / 2 - 0.03, 0], [0.07, h + 0.1, w / 2 + 0.03, 0], [0.05, h, 0, 0], [w, 0.05, 0, 0.05]]) mesh(new THREE.BoxGeometry(fw, fh, 0.06), frameM, winG, fx, fy, 0.03);
  mesh(new THREE.BoxGeometry(w + 0.4, 0.07, 0.2), frameM, winG, 0, -h / 2 - 0.1, 0.08);
  const curtM = plush(curtain, TX.plush, 0.9, '#fff3dc', 0.01);
  for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.28, h + 0.45, 0.05), curtM, winG, s * (w / 2 + 0.17), 0.03, 0.12);
  return winG;
}
/* кухня: плитка, стол в клетчатой скатерти (на нём сидят герои), гарнитур с духовкой, холодильник с рисунком */
function buildKitchen() {
  const room = new THREE.Group(); scene.add(room);
  TX.tiles = canvasTex(128, 128, (c, w) => {
    c.fillStyle = '#eef3ef'; c.fillRect(0, 0, w, w); c.strokeStyle = '#cfdcd4'; c.lineWidth = 3;
    for (let y = 0; y <= w; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); const off = (y / 32) % 2 ? 32 : 0; for (let x = off; x <= w; x += 64) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 32); c.stroke(); } }
  }, [12, 6]);
  TX.check = canvasTex(64, 64, (c, w) => { c.fillStyle = '#fbf6f0'; c.fillRect(0, 0, w, w); c.fillStyle = 'rgba(214,80,80,.5)'; c.fillRect(0, 0, 32, w); c.fillRect(0, 0, w, 32); }, [9, 6]);
  mesh(new THREE.PlaneGeometry(14, 7), flat('#ffffff', 0.6, TX.tiles), room, 0, 2.3, -1.6).castShadow = false;
  const floor = mesh(new THREE.PlaneGeometry(14, 10), flat('#c49a72', 0.8), room, 0, -0.4, 0); floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
  const cloth = flat('#ffffff', 0.9, TX.check);
  mesh(new THREE.BoxGeometry(4.4, 0.12, 2.6), cloth, room, 0, TOP - 0.06, 0.1).castShadow = false;
  const cab = flat('#9fc7b4', 0.6), wood = flat('#d9b48f', 0.5);
  const handleM = new THREE.MeshStandardMaterial({ color: C('#c9ccd1'), metalness: 0.8, roughness: 0.3 }); MATS.push(handleM);
  mesh(new THREE.BoxGeometry(3.4, 1.45, 0.55), cab, room, 0.45, 0.3, -1.32);
  mesh(new THREE.BoxGeometry(3.5, 0.07, 0.62), wood, room, 0.45, 1.06, -1.3);
  for (const x of [0.25, 1.15, 1.9]) { mesh(new THREE.BoxGeometry(0.02, 1.2, 0.01), flat('#86b29e'), room, x - 0.05, 0.35, -1.04); mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.12, 8), handleM, room, x + 0.1, 0.75, -1.02); }
  OVEN.door = new THREE.MeshStandardMaterial({ color: C('#2b2b31'), emissive: C('#ff8a3c'), emissiveIntensity: 0, roughness: 0.2, metalness: 0.2 }); MATS.push(OVEN.door);
  mesh(new THREE.BoxGeometry(0.85, 0.55, 0.03), flat('#e9ecef', 0.4), room, -0.6, 0.55, -1.035);
  mesh(new THREE.BoxGeometry(0.7, 0.36, 0.02), OVEN.door, room, -0.6, 0.53, -1.015);
  mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.6, 8), handleM, room, -0.6, 0.76, -0.995).rotation.z = Math.PI / 2;
  ovenLight = new THREE.PointLight(C('#ff9a4a'), 0, 2.5, 2); ovenLight.position.set(-0.6, 0.55, -0.8); room.add(ovenLight);
  mesh(new THREE.BoxGeometry(0.85, 2.6, 0.7), plush('#bfe3d6', null, 0.35, '#ffffff'), room, -1.85, 0.9, -1.25);
  mesh(new THREE.BoxGeometry(0.86, 0.02, 0.71), flat('#9cc9b8'), room, -1.85, 1.55, -1.25);
  mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8), handleM, room, -1.5, 1.85, -0.88);
  mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8), handleM, room, -1.5, 1.05, -0.88);
  [['#ef6f78', -2.05, 2.0], ['#ffd36b', -1.75, 2.15], ['#7fb6e6', -1.95, 1.75]].forEach(([c, x, y]) => { mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 16), flat(c, 0.5), room, x, y, -0.89).rotation.x = Math.PI / 2; });
  const pic = textTex(['Шкет', 'Маня', 'Пингвин'], 128, 160, { size: 26, color: '#5a7fb5', bg: '#fffdf6' });
  mesh(new THREE.PlaneGeometry(0.34, 0.42), new THREE.MeshStandardMaterial({ map: pic }), room, -1.85, 1.2, -0.893).castShadow = false;
  mesh(new THREE.BoxGeometry(2.1, 0.75, 0.38), cab, room, -0.2, 2.75, -1.42);
  for (const x of [-0.75, 0.3]) mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.1, 8), handleM, room, x, 2.5, -1.22);
  makeWindow(room, 1.45, 2.25, '#f2b8b0', 1.1, 1.2);
  const kettle = plush('#ef8f8a', null, 0.3, '#ffd0cc');
  blob(kettle, 0.18, 0.15, 0.18, 0.85, 1.25, -1.3, room);
  mesh(new THREE.CylinderGeometry(0.02, 0.035, 0.16, 10), kettle, room, 1.05, 1.3, -1.3).rotation.z = -0.9;
  [['#f6c6cf', 1.25], ['#a9cbe0', 1.45]].forEach(([c, x]) => mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.13, 16), plush(c, null, 0.3), room, x, 1.16, -1.25));
  mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.14, 16), flat('#d98e6a'), room, 1.95, 1.17, -1.32);
  blob(plush('#7fae6a', null, 0.8), 0.1, 0.14, 0.1, 1.95, 1.33, -1.32, room);
  mesh(new THREE.CylinderGeometry(0.006, 0.006, 1.4, 6), flat('#555555'), room, 0, 4.1, 0.1);
  const shade = mesh(new THREE.ConeGeometry(0.32, 0.26, 32, 1, true), plush('#ffd36b', null, 0.6), room, 0, 3.3, 0.1); shade.material.side = THREE.DoubleSide;
  return room;
}
function setRoom(id) {
  curRoom = ROOMS[id] ? id : 'bedroom';
  Object.keys(ROOMS).forEach(k => { ROOMS[k].visible = k === curRoom; });
}
const TOD = {
  morning: { hemi: [0.5, '#fff0e0', '#c9b0a0'], sun: [1.7, '#ffd9b0'], lamp: 0, bulbs: 0.15, env: 0.45, exp: 0.92 },
  day: { hemi: [0.52, '#fff7ec', '#c9b6a6'], sun: [1.85, '#fff1dc'], lamp: 0, bulbs: 0.15, env: 0.48, exp: 0.9 },
  evening: { hemi: [0.34, '#ffd9c0', '#8a6f66'], sun: [1.2, '#ffa36b'], lamp: 1.2, bulbs: 1.6, env: 0.32, exp: 0.95 },
  night: { hemi: [0.16, '#8d97d6', '#2a2440'], sun: [0.45, '#8fa2ff'], lamp: 2.6, bulbs: 2.4, env: 0.16, exp: 1.05 },
};
let curTod = '', curSnow = false;
function setTod(t, snow = false) {
  const L = TOD[t] || TOD.day;
  hemi.intensity = L.hemi[0]; hemi.color.copy(C(L.hemi[1])); hemi.groundColor.copy(C(L.hemi[2]));
  sun.intensity = L.sun[0]; sun.color.copy(C(L.sun[1]));
  lamp.intensity = L.lamp;
  bulbs.forEach(m => { m.emissiveIntensity = L.bulbs; });
  MATS.forEach(m => { m.envMapIntensity = m.roughness < 0.3 ? L.env * 1.8 : L.env; });
  renderer.toneMappingExposure = L.exp;
  if (t !== curTod || snow !== curSnow) {
    const old = skyMats[0] && skyMats[0].map, tex = skyTex(t, snow);
    skyMats.forEach(m => { m.map = tex; m.needsUpdate = true; });
    if (old) old.dispose();
  }
  curTod = t; curSnow = snow;
}

/* ---------- сборка сцены ---------- */
let skyOpt = {};
const API = {
  TOP, P,
  pose, sky(o) { Object.assign(skyOpt, o); },
  heroPos(id) { return H3[id].place.position.clone(); },
};
/* старые предметы убираем вместе с геометрией, материалами и надписями, чтобы память не копилась */
function dispose(root) {
  const mats = new Set();
  root.traverse(o => {
    if (o.geometry && o.geometry !== SPH) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => mats.add(m));
  });
  mats.forEach(m => { if (m.map && !Object.values(TX).includes(m.map)) m.map.dispose(); m.dispose(); });
  for (let i = MATS.length - 1; i >= 0; i--) if (mats.has(MATS[i])) MATS.splice(i, 1);
}
function stage(setup, ctx, room = 'bedroom') {
  setRoom(room);
  Object.values(H3).forEach(h => { h.walk = null; });
  walkCb = null;
  Object.assign(COOK, { bowl: null, fill: null, spoon: null, n: 0, dish: null, stirring: false });
  if (OVEN.door) { OVEN.door.emissiveIntensity = 0; ovenLight.intensity = 0; }
  props.children.slice().forEach(c => { props.remove(c); dispose(c); });
  Object.values(H3).forEach(h => (h.acc || []).forEach(a => { if (a.parent) a.parent.remove(a); dispose(a); }));
  Object.values(H3).forEach(h => { h.acc = []; });
  anims = [];
  skyOpt = {};
  Object.keys(H3).forEach(id => pose(id, {}));
  if (setup) setup(API, ctx);
  pigeon.visible = !!skyOpt.pigeon;
  setTod(skyOpt.tod || ctx.tod, !!skyOpt.snow);
}

/* ---------- камера ---------- */
const target = new THREE.Vector3(0, 0.95, -0.1);
let az = 0, el = 0.34, azV = 0, dist = 7;
function frame() {
  const r = box.getBoundingClientRect();
  W = Math.max(1, r.width); H = Math.max(1, r.height);
  renderer.setSize(W, H);
  camera.aspect = W / H;
  fit(camera.aspect);
}
function fit(aspect) {
  const half = Math.tan(camera.fov * Math.PI / 360);
  dist = Math.max(5.6, 1.85 / (half * aspect));
  target.y = 0.9 + (dist - 5.6) * 0.45;   // чем уже кадр, тем дальше камера — поднимаем прицел, чтобы внизу не было пустого пола
  camera.updateProjectionMatrix();
}
function placeCamera() {
  camera.position.set(target.x + Math.sin(az) * dist * Math.cos(el), target.y + Math.sin(el) * dist, target.z + Math.cos(az) * dist * Math.cos(el));
  camera.lookAt(target);
}

/* ---------- выбор героя пальцем, позиция на экране ---------- */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), tmp = new THREE.Vector3();
function cast(x, y) {
  const r = box.getBoundingClientRect();
  ndc.set((x - r.left) / r.width * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
}
function pickHero(x, y) {
  cast(x, y);
  const hit = ray.intersectObjects(Object.values(H3).filter(h => h.place.visible).map(h => h.place), true)[0];
  if (!hit) return null;
  let o = hit.object;
  while (o && !o.userData.hero) o = o.parent;
  return o ? o.userData.hero : null;
}
function shown(o) { for (; o; o = o.parent) if (!o.visible) return false; return true; }
function pickPoint(x, y) {
  cast(x, y);
  const hit = ray.intersectObjects(scene.children, true).find(i => i.object.type === 'Mesh' && shown(i.object));
  return hit ? hit.point : null;
}
function heroScreen(id) {
  const h = H3[id];
  h.head.getWorldPosition(tmp);
  tmp.y += 0.45 * h.place.scale.y;
  tmp.project(camera);
  const r = box.getBoundingClientRect();
  return { x: r.left + (tmp.x * 0.5 + 0.5) * r.width, y: r.top + (-tmp.y * 0.5 + 0.5) * r.height };
}
function react(id, kind) { const h = H3[id]; h.sqv += kind === 'chomp' ? 2 : 3.2; if (kind === 'hop') h.hop = 0.6; }

/* ---------- снимок сцены для альбома ---------- */
function snapshot(setup, ctx, w, h, view, type = 'image/jpeg') {
  stage(setup, ctx);
  const saveAz = az; az = 0;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; fit(camera.aspect);
  if (view) { dist = view.dist; target.y = view.ty; }      // крупный план — для иконки
  placeCamera();
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL(type, 0.85);
  az = saveAz;
  return url;
}
function restoreSize() { renderer.setSize(W, H); camera.aspect = W / H; fit(camera.aspect); }

/* ---------- жизнь ---------- */
const frameCbs = [];
let clock, t = 0, dragging = false;
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05); t += dt;
  if (!dragging) { az += azV * dt * 0.01; azV *= Math.exp(-dt * 5); az *= Math.exp(-dt * 0.5); }
  placeCamera();
  Object.values(H3).forEach((h, i) => {
    h.sqv += (-130 * h.sq - 9 * h.sqv) * dt; h.sq += h.sqv * dt;
    let br = reduce ? 0 : Math.sin(t * (1.6 + i * 0.25) + i) * 0.012, lift = 0, rz = 0;
    if (h.anim === 'sleep') br = Math.sin(t * 0.9 + i) * 0.02;
    if (!reduce && h.anim === 'hop') lift = Math.max(0, Math.sin(t * 5 + i)) * 0.12;
    if (!reduce && h.anim === 'wiggle') rz = Math.sin(t * 4 + i) * 0.12;
    if (h.hop > 0) { h.hop -= dt; lift += Math.sin((0.6 - h.hop) / 0.6 * Math.PI) * 0.25; }
    if (h.walk) {
      const w = h.walk, p = Math.min(1, Math.max(0, (t - w.t0) / w.dur)), go = Math.min(1, p / 0.8);
      h.place.position.lerpVectors(w.from, w.to, 1 - (1 - go) * (1 - go));
      h.place.rotation.y = p < 0.8 ? w.ry0 : w.ry0 + (w.ry1 - w.ry0) * ((p - 0.8) / 0.2);
      if (p > 0 && p < 0.8 && !reduce) {
        if (w.style === 'stomp') lift += Math.abs(Math.sin(t * 11)) * 0.08;
        else if (w.style === 'roll') { rz = Math.sin(t * 10) * 0.08; lift += Math.abs(Math.sin(t * 10)) * 0.03; }
        else rz = Math.sin(t * 8) * 0.17;
      }
      if (p >= 1) {
        h.walk = null;
        if (!Object.values(H3).some(x => x.walk) && walkCb) { const cb = walkCb; walkCb = null; cb(); }
      }
    }
    h.body.scale.set(1 + 0.06 * h.sq - br * 0.5, 1 - 0.09 * h.sq + br, 1 + 0.06 * h.sq - br * 0.5);
    h.body.position.y = lift; h.body.rotation.z = rz;
    if (h.blinks) {
      if (t > h.nextBlink) { h.blinkAt = t; h.nextBlink = t + 2.5 + Math.random() * 3.5; }
      let k = 1;
      if (h.blinkAt != null) { const p = (t - h.blinkAt) / 0.16; if (p < 1) k = 1 - 0.9 * Math.sin(p * Math.PI); else h.blinkAt = null; }
      h.eyes.forEach(e => { e.scale.y = e.userData.sy * k; });
    }
  });
  anims.forEach(a => {
    const o = a.o, d = o.userData.delay || 0;
    if (a.kind === 'float') o.position.y = a.y0 + Math.sin(t * 1.6 + a.ph) * 0.06;
    else if (a.kind === 'bob') { o.position.y = a.y0 + Math.sin(t * 1.2) * 0.06; o.rotation.y = Math.sin(t * 0.7) * 0.25; }
    else if (a.kind === 'zzz') { const p = ((t + d) % 2.4) / 2.4; o.position.y = a.y0 + p * 0.35; o.material.opacity = Math.sin(p * Math.PI); }
    else if (a.kind === 'steam') { const p = ((t + a.ph) % 2.6) / 2.6; o.position.y = a.y0 + p * 0.4; o.material.opacity = Math.sin(p * Math.PI) * 0.7; o.scale.setScalar(0.18 + p * 0.25); }
    else if (a.kind === 'flame') o.scale.set(1, 1 + Math.sin(t * 12) * 0.15, 1);
    else if (a.kind === 'flag') o.rotation.y = Math.sin(t * 2) * 0.25;
    else if (a.kind === 'spin') o.rotation.y = t;
    else if (a.kind === 'flicker') o.intensity = a.base * (0.8 + Math.sin(t * 7) * 0.12 + Math.sin(t * 2.3) * 0.08);
    else if (a.kind === 'drop') { const p = Math.min(1, (t - a.t0) / a.dur); o.position.y = a.y0 + (a.y1 - a.y0) * p * p; o.rotation.y += dt * 4; if (p >= 1) o.visible = false; }
    else if (a.kind === 'shrink') { const p = Math.min(1, Math.max(0, (t - a.t0) / a.dur)); o.scale.setScalar(Math.max(0.001, 1 - p)); if (p >= 1) o.visible = false; }
    else if (a.kind === 'pop') { const p = Math.min(1, (t - a.t0) / a.dur); o.scale.setScalar(p < 1 ? Math.sin(p * Math.PI * 0.5) * (1 + Math.sin(p * Math.PI) * 0.15) : 1); }
  });
  if (COOK.stirring && COOK.spoon) COOK.spoon.rotation.y += dt * 7;
  frameCbs.forEach(cb => cb());
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

/* ---------- запуск ---------- */
function init(container) {
  box = container;
  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  aniso = renderer.capabilities.getMaxAnisotropy();
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
  SPH = new THREE.SphereGeometry(1, 40, 28);
  makeTextures();
  {
    const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene();
    const g = new THREE.SphereGeometry(10, 32, 16), p = g.attributes.position, col = new Float32Array(p.count * 3), tc = new THREE.Color();
    const top = C('#fff8ef'), hor = C('#f1d8d2'), flo = C('#b9a593');
    for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 10; if (y >= 0) tc.copy(hor).lerp(top, y); else tc.copy(hor).lerp(flo, -y); col.set([tc.r, tc.g, tc.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    es.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    const win = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3.1, 3.2), side: THREE.DoubleSide }));
    win.position.set(6, 4, 2); win.lookAt(0, 0, 0); es.add(win);
    scene.environment = pm.fromScene(es, 0.04).texture;
    pm.dispose();
  }
  ROOMS.bedroom = buildBedroom();
  ROOMS.kitchen = buildKitchen();
  setRoom('bedroom');
  props = new THREE.Group(); scene.add(props);
  [makeManya(), makeShket(), makePenguin()].forEach(h => {
    H3[h.id] = h; scene.add(h.place);
    h.sq = 0; h.sqv = 0; h.hop = 0; h.nextBlink = 1 + Math.random() * 3; h.acc = [];
    h.place.traverse(o => { o.userData.hero = h.id; });
  });
  hemi = new THREE.HemisphereLight(C('#fff7ec'), C('#c9b6a6'), 0.6); scene.add(hemi);
  sun = new THREE.DirectionalLight(C('#fff1dc'), 2.0);
  sun.position.set(3.5, 5, 4); sun.target.position.set(0, 0.6, 0);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -3.5, right: 3.5, top: 3.5, bottom: -2, near: 1, far: 15 });
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);
  lamp = new THREE.PointLight(C('#ffcf87'), 0, 7, 2); lamp.position.set(-2.6, 1.6, 0.8); scene.add(lamp);
  frame();
  if (window.ResizeObserver) new ResizeObserver(frame).observe(container); else window.addEventListener('resize', frame);
  clock = new THREE.Clock();
  tick();
}

window.WORLD = {
  init, stage, setTod, pose, pickHero, pickPoint, heroScreen, react, snapshot, restoreSize, walkIn, cook: COOK_API,
  onFrame(cb) { frameCbs.push(cb); },
  setOutfit(o) { outfit = o || {}; },
  heroWorld(id) { return H3[id].place.position.clone(); },
  orbit(dx) { az = Math.max(-0.5, Math.min(0.5, az - dx * 0.005)); azV = -dx * 0.3; },
  setDragging(v) { dragging = v; },
  canvas() { return renderer.domElement; },
};
})();
