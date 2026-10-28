/* Шкет и Маня — проба в 3D (three.js r128). Та же комната и те же герои, собранные из мягких форм:
   плюш — физический материал с «бархатным» отблеском (sheen) и рельефом флиса. */
(function () {
'use strict';
const S = window.SCENES_API, CFG = S.CONFIG;
const view = document.getElementById('view'), fx = document.getElementById('fx');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const C = h => new THREE.Color(h).convertSRGBToLinear();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
view.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
const aniso = renderer.capabilities.getMaxAnisotropy();

/* ---------- окружение для мягких отблесков ---------- */
{
  const pm = new THREE.PMREMGenerator(renderer);
  const es = new THREE.Scene();
  const g = new THREE.SphereGeometry(10, 32, 16), p = g.attributes.position, col = new Float32Array(p.count * 3), tc = new THREE.Color();
  const top = C('#fff8ef'), hor = C('#f1d8d2'), flo = C('#b9a593');
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / 10;
    if (y >= 0) tc.copy(hor).lerp(top, y); else tc.copy(hor).lerp(flo, -y);
    col.set([tc.r, tc.g, tc.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  es.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const win = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3.1, 3.2), side: THREE.DoubleSide }));
  win.position.set(6, 4, 2); win.lookAt(0, 0, 0); es.add(win);
  scene.environment = pm.fromScene(es, 0.04).texture;
  pm.dispose();
}

/* ---------- текстуры, нарисованные на canvas ---------- */
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
const wallpaper = canvasTex(128, 128, (g, w) => {
  g.fillStyle = '#ebcbc5'; g.fillRect(0, 0, w, w);
  g.strokeStyle = '#f6e3de'; g.lineWidth = 5;
  g.beginPath(); g.moveTo(64, 10); g.lineTo(118, 64); g.lineTo(64, 118); g.lineTo(10, 64); g.closePath(); g.stroke();
  g.fillStyle = '#f2d9d3'; g.beginPath(); g.moveTo(64, 40); g.lineTo(88, 64); g.lineTo(64, 88); g.lineTo(40, 64); g.closePath(); g.fill();
}, [14, 7]);
const sheetTex = canvasTex(256, 222, (g, w, h) => {
  g.fillStyle = '#f4f3ee'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#6f9a68'; g.lineWidth = 4;
  g.beginPath(); g.moveTo(0, 2); g.lineTo(w, 2); g.moveTo(0, 2); g.lineTo(w / 2, h - 2); g.lineTo(w, 2); g.moveTo(0, h - 2); g.lineTo(w, h - 2); g.stroke();
}, [6, 4]);
const duvetTex = canvasTex(256, 256, (g, w) => {
  g.fillStyle = '#e8e7e2'; g.fillRect(0, 0, w, w);
  for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(190,186,176,${0.15 + rnd() * 0.2})`; g.beginPath(); g.ellipse(rnd() * w, rnd() * w, 30 + rnd() * 40, 8 + rnd() * 10, -0.5, 0, Math.PI * 2); g.fill(); }
  g.strokeStyle = '#c9a650'; g.lineWidth = 3;
  for (let k = -1; k < 3; k++) { g.beginPath(); g.moveTo(k * 128, w); g.lineTo(k * 128 + w, 0); g.stroke(); }
}, [3, 1]);
const fleeceBump = canvasTex(128, 128, (g, w) => {
  g.fillStyle = '#808080'; g.fillRect(0, 0, w, w);
  for (let i = 0; i < 520; i++) { const v = 150 + rnd() * 90 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.beginPath(); g.arc(rnd() * w, rnd() * w, 2 + rnd() * 3.5, 0, Math.PI * 2); g.fill(); }
}, [6, 6], false);
const plushBump = canvasTex(128, 128, (g, w) => {
  g.fillStyle = '#808080'; g.fillRect(0, 0, w, w);
  for (let i = 0; i < 2200; i++) { const v = 90 + rnd() * 90 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(rnd() * w, rnd() * w, 1.5, 1.5); }
}, [8, 8], false);
const stripes = canvasTex(64, 64, (g, w) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, w);
  g.fillStyle = '#2f7fd0';
  for (let i = -w; i < w * 2; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 8, 0); g.lineTo(i + 8 + w, w); g.lineTo(i + w, w); g.closePath(); g.fill(); }
}, [6, 1]);
const SKY = {
  day: ['#86c6ee', '#d8f1fc'], evening: ['#5e5c9e', '#e98e74', '#ffc98d'], night: ['#0f1434', '#2c3567'],
};
function skyTex(tod) {
  return canvasTex(256, 280, (g, w, h) => {
    const cols = SKY[tod], gr = g.createLinearGradient(0, 0, 0, h);
    cols.forEach((c, i) => gr.addColorStop(i / (cols.length - 1), c));
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    if (tod === 'night') {
      g.fillStyle = '#fff7d6';
      for (let i = 0; i < 26; i++) { g.beginPath(); g.arc(rnd() * w, rnd() * h * 0.7, 1 + rnd() * 1.5, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#f4ecd0'; g.beginPath(); g.arc(180, 70, 26, 0, Math.PI * 2); g.fill();
      g.fillStyle = cols[0]; g.beginPath(); g.arc(192, 60, 23, 0, Math.PI * 2); g.fill();
    } else if (tod === 'evening') {
      g.fillStyle = '#ff9a62'; g.beginPath(); g.arc(130, 230, 34, 0, Math.PI * 2); g.fill();
    } else {
      g.fillStyle = '#fff0a3'; g.beginPath(); g.arc(196, 60, 22, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffffff';
      [[70, 90], [120, 150]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 16, 0, 7); g.arc(x + 20, y - 8, 20, 0, 7); g.arc(x + 42, y, 15, 0, 7); g.fill(); });
    }
    g.fillStyle = { day: '#9fb2c7', evening: '#6d5d82', night: '#1d2447' }[tod];
    g.beginPath(); g.moveTo(0, h);
    [[0, 230], [40, 230], [40, 205], [80, 205], [80, 236], [120, 236], [120, 214], [150, 196], [180, 214], [180, 240], [215, 240], [215, 210], [256, 210], [256, h]].forEach(([x, y]) => g.lineTo(x, y));
    g.fill();
    if (tod !== 'day') { g.fillStyle = '#ffd27a'; [[55, 218], [95, 246], [160, 226], [228, 228], [236, 250]].forEach(([x, y]) => g.fillRect(x, y, 7, 8)); }
  });
}

/* ---------- материалы ---------- */
const MATS = [];
function plush(hex, bump, rough = 0.92, sheen = '#ffffff', bs = 0.03) {
  const m = new THREE.MeshPhysicalMaterial({ color: C(hex), roughness: rough, metalness: 0, bumpMap: bump || null, bumpScale: bs, envMapIntensity: 0.55 });
  m.sheen = C(sheen).multiplyScalar(0.55);
  MATS.push(m);
  return m;
}
function shiny(hex) {
  const m = new THREE.MeshPhysicalMaterial({ color: C(hex), roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1 });
  MATS.push(m);
  return m;
}
function flat(hex, rough = 0.7, map = null) {
  const m = new THREE.MeshStandardMaterial({ color: map ? 0xffffff : C(hex), map, roughness: rough, envMapIntensity: 0.4 });
  MATS.push(m);
  return m;
}

/* ---------- формы ---------- */
const SPH = new THREE.SphereGeometry(1, 48, 32);
function blob(mat, sx, sy, sz, x, y, z, parent) {
  const m = new THREE.Mesh(SPH, mat);
  m.scale.set(sx, sy, sz); m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}
function limb(mat, r, len, parent, px, py, pz, rx, rz) {
  const pivot = new THREE.Group();
  pivot.position.set(px, py, pz); pivot.rotation.set(rx, 0, rz);
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 24, 1, true), mat);
  cyl.position.y = -len / 2;
  pivot.add(cyl);
  blob(mat, r, r, r, 0, 0, 0, pivot);
  blob(mat, r * 1.05, r * 1.05, r * 1.05, 0, -len, 0, pivot);
  cyl.castShadow = true; cyl.receiveShadow = true;
  parent.add(pivot);
  return pivot;
}
function seg(mat, a, b, r, parent) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 8), mat);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  parent.add(m);
  return m;
}

/* ---------- Маня ---------- */
function makeManya() {
  const g = new THREE.Group();
  const fleece = plush('#f7f2ea', fleeceBump, 0.95, '#fff6ea', 0.05);
  const face = plush('#fcf8f1', plushBump, 0.85, '#ffffff', 0.008);
  const inner = plush('#f3e2b8', plushBump, 0.9, '#fff3d6', 0.01);
  const brown = flat('#5e3c2f', 0.55);
  const stitch = flat('#8c4a3e', 0.6);
  const blush = new THREE.MeshStandardMaterial({ color: C('#f2a9a2'), transparent: true, opacity: 0.45, roughness: 1 });
  blob(fleece, 0.42, 0.5, 0.36, 0, 0.5, 0, g);
  limb(fleece, 0.13, 0.42, g, -0.17, 0.27, 0.06, -1.35, 0.08);
  limb(fleece, 0.13, 0.42, g, 0.17, 0.27, 0.06, -1.35, -0.08);
  const armL = limb(fleece, 0.105, 0.44, g, -0.37, 0.84, 0, -0.25, -0.25);
  const armR = limb(fleece, 0.105, 0.44, g, 0.37, 0.84, 0, -0.25, 0.25);
  const head = new THREE.Group(); head.position.set(0, 1.18, 0); g.add(head);
  blob(fleece, 0.44, 0.41, 0.4, 0, 0, 0, head);
  blob(face, 0.31, 0.32, 0.2, 0, -0.04, 0.27, head);
  for (const s of [-1, 1]) {
    const ear = new THREE.Group(); ear.position.set(s * 0.4, 0.03, -0.02); ear.rotation.z = -s * 0.3; head.add(ear);
    blob(fleece, 0.27, 0.12, 0.16, s * 0.2, 0, 0, ear);
    blob(inner, 0.19, 0.075, 0.06, s * 0.22, 0, 0.11, ear);
  }
  const eyes = [-1, 1].map(s => { const e = blob(brown, 0.026, 0.044, 0.018, s * 0.11, 0.05, 0.44, head); e.rotation.z = s * 0.25; return e; });
  const ny = new THREE.Group(); ny.position.set(0, -0.1, 0.468); head.add(ny);
  seg(stitch, [-0.034, 0.03, -0.004], [0, 0, 0], 0.008, ny);
  seg(stitch, [0.034, 0.03, -0.004], [0, 0, 0], 0.008, ny);
  seg(stitch, [0, 0, 0], [0, -0.045, -0.004], 0.008, ny);
  for (const s of [-1, 1]) blob(blush, 0.05, 0.028, 0.01, s * 0.19, -0.06, 0.428, head);
  return { g, head, eyes, arms: [armL, armR], id: 'manya' };
}

/* ---------- Шкет ---------- */
function makeShket() {
  const g = new THREE.Group();
  const fur = plush('#a8744a', plushBump, 0.9, '#f2c9a0', 0.02);
  const dark = plush('#8a5a33', plushBump, 0.9, '#e0b48a', 0.02);
  const eyeM = shiny('#1a110b');
  blob(fur, 0.62, 0.36, 0.4, 0, 0.36, 0, g);
  for (const [x, z] of [[-0.36, -0.2], [-0.36, 0.2], [0.34, -0.2], [0.34, 0.2]]) blob(dark, 0.1, 0.08, 0.1, x, 0.06, z, g);
  const head = new THREE.Group(); head.position.set(0.5, 0.5, 0); g.add(head);
  blob(fur, 0.3, 0.28, 0.3, 0, 0, 0, head);
  blob(fur, 0.22, 0.2, 0.24, 0.2, -0.05, 0, head);
  blob(dark, 0.055, 0.08, 0.11, 0.405, -0.01, 0, head);
  for (const s of [-1, 1]) blob(dark, 0.065, 0.055, 0.03, -0.05, 0.25, s * 0.16, head);
  const eyes = [-1, 1].map(s => blob(eyeM, 0.036, 0.036, 0.03, 0.15, 0.09, s * 0.235, head));
  return { g, head, eyes, id: 'shket' };
}

/* ---------- Пингвин ---------- */
function makePenguin() {
  const g = new THREE.Group();
  const grey = plush('#a3a6ad', plushBump, 0.92, '#e9ecf4', 0.02);
  const black = plush('#202127', plushBump, 0.85, '#7b7f90', 0.02);
  const white = plush('#f7f7f4', plushBump, 0.9, '#ffffff', 0.01);
  const beakM = plush('#7c7e85', null, 0.8, '#c9cbd2');
  const foot = plush('#5e6067', null, 0.9, '#9a9ca3');
  const scarf = plush('#ffffff', null, 0.9, '#ffffff');
  scarf.map = stripes;
  const eyeM = shiny('#0d0d10');
  blob(grey, 0.56, 0.62, 0.5, 0, 0.62, 0, g);
  for (const s of [-1, 1]) blob(foot, 0.17, 0.06, 0.2, s * 0.2, 0.04, 0.2, g);
  const flips = [-1, 1].map(s => { const f = new THREE.Group(); f.position.set(s * 0.5, 1.0, 0); g.add(f); const m = blob(grey, 0.12, 0.4, 0.09, 0, -0.32, 0, f); f.rotation.z = s * 0.32; return f; });
  const head = new THREE.Group(); head.position.set(0, 1.42, 0); g.add(head);
  blob(black, 0.5, 0.47, 0.46, 0, 0, 0, head);
  for (const s of [-1, 1]) blob(white, 0.24, 0.27, 0.14, s * 0.2, -0.02, 0.32, head);
  const eyes = [-1, 1].map(s => blob(eyeM, 0.06, 0.066, 0.04, s * 0.2, 0.0, 0.452, head));
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.22, 24), beakM);
  beak.position.set(0, -0.14, 0.47); beak.rotation.x = Math.PI * 0.75; beak.castShadow = true; head.add(beak);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.075, 16, 48), scarf);
  ring.rotation.x = Math.PI / 2; ring.position.y = 1.02; ring.scale.set(1, 0.9, 1); ring.castShadow = true; g.add(ring);
  blob(scarf, 0.08, 0.08, 0.06, -0.22, 1.0, 0.39, g);
  const tail = blob(scarf, 0.1, 0.18, 0.03, -0.27, 0.84, 0.42, g); tail.rotation.z = 0.4;
  return { g, head, eyes, flips, id: 'peng' };
}

/* ---------- комната ---------- */
const room = new THREE.Group(); scene.add(room);
const wall = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), flat('#ffffff', 0.85, wallpaper));
wall.position.set(0, 2.3, -1.6); wall.receiveShadow = true; room.add(wall);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), flat('#cdbba8', 0.8));
floor.rotation.x = -Math.PI / 2; floor.position.y = -0.4; floor.receiveShadow = true; room.add(floor);
const headboard = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.2, 0.14), plush('#ece0d3', plushBump, 0.9, '#ffffff', 0.01));
headboard.position.set(0, 0.6, -1.5); headboard.castShadow = headboard.receiveShadow = true; room.add(headboard);
const white = flat('#f4f3ee', 0.85);
const mattress = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.4, 2.8), [white, white, flat('#ffffff', 0.85, sheetTex), white, white, white]);
mattress.position.set(0, -0.025, -0.1); mattress.receiveShadow = true; room.add(mattress);
const pillowM = plush('#fbfaf6', plushBump, 0.9, '#ffffff', 0.01);
for (const x of [-1.05, 1.05]) blob(pillowM, 0.82, 0.24, 0.36, x, 0.35, -1.12, room);
const duvet = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 4.4, 32), plush('#ffffff', null, 0.9, '#ffffff'));
duvet.material.map = duvetTex; duvet.rotation.z = Math.PI / 2; duvet.position.set(0, 0.34, 1.12); duvet.castShadow = duvet.receiveShadow = true; room.add(duvet);
// окно
const winG = new THREE.Group(); winG.position.set(1.55, 2.35, -1.56); room.add(winG);
const skyMat = new THREE.MeshBasicMaterial({ map: skyTex('day') });
const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.5), skyMat); winG.add(glass);
const frameM = flat('#fbf7f0', 0.5);
for (const [w, h, x, y] of [[1.42, 0.07, 0, 0.78], [1.42, 0.07, 0, -0.78], [0.07, 1.6, -0.68, 0], [0.07, 1.6, 0.68, 0], [0.05, 1.5, 0, 0], [1.3, 0.05, 0, 0.05]]) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), frameM); b.position.set(x, y, 0.03); b.castShadow = true; winG.add(b);
}
const sill = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.07, 0.2), frameM); sill.position.set(0, -0.85, 0.08); sill.castShadow = true; winG.add(sill);
const curtM = plush('#f0d3a0', plushBump, 0.9, '#fff3dc', 0.01);
for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.95, 0.05), curtM); c.position.set(s * 0.82, 0.03, 0.12); c.castShadow = true; winG.add(c); }
// полка, рамка
const wood = flat('#c79c74', 0.6);
const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.24), wood); shelf.position.set(-1.45, 2.05, -1.46); shelf.castShadow = true; room.add(shelf);
[['#8fb3c9', -1.9, 0.32], ['#e3b46c', -1.8, 0.27], ['#c98b8b', -1.69, 0.36], ['#a9c7a0', -1.58, 0.29]].forEach(([c, x, h]) => {
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.09, h, 0.18), flat(c, 0.7)); b.position.set(x, 2.08 + h / 2, -1.46); b.castShadow = true; room.add(b);
});
const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.18, 24), flat('#d98e6a', 0.7)); pot.position.set(-1.05, 2.17, -1.46); pot.castShadow = true; room.add(pot);
const leaf = plush('#7fae6a', null, 0.8, '#d6f0c8');
for (const [x, y, r] of [[-1.05, 2.42, 0], [-1.12, 2.36, 0.5], [-0.98, 2.36, -0.5]]) { const l = blob(leaf, 0.05, 0.14, 0.05, x, y, -1.46, room); l.rotation.z = r; }
const picFrame = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.66, 0.05), wood); picFrame.position.set(-1.4, 2.85, -1.56); room.add(picFrame);
const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.43, 0.54), flat('#fffaf2', 0.9)); paper.position.set(-1.4, 2.85, -1.53); room.add(paper);
{
  const hs = new THREE.Shape();
  hs.moveTo(0, -0.12); hs.bezierCurveTo(-0.2, 0.02, -0.12, 0.17, 0, 0.07); hs.bezierCurveTo(0.12, 0.17, 0.2, 0.02, 0, -0.12);
  const heart = new THREE.Mesh(new THREE.ShapeGeometry(hs), flat('#ef8f8a', 0.6)); heart.position.set(-1.4, 2.84, -1.525); room.add(heart);
}
// гирлянда
const bulbs = [];
{
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-3.2, 3.9, -1.5), new THREE.Vector3(0, 3.2, -1.3), new THREE.Vector3(3.2, 3.95, -1.5));
  const wire = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.008, 6, false), flat('#6f5a4e', 0.6)); room.add(wire);
  const cols = ['#ffd36b', '#f7a7b8', '#9fe0c8'];
  for (let i = 0; i < 13; i++) {
    const p = curve.getPoint((i + 0.5) / 13);
    const m = new THREE.MeshStandardMaterial({ color: C(cols[i % 3]), emissive: C(cols[i % 3]), emissiveIntensity: 0.2, roughness: 0.4 });
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), m); b.scale.set(1, 1.3, 1); b.position.copy(p).add(new THREE.Vector3(0, -0.07, 0)); room.add(b);
    bulbs.push(m);
  }
}

/* ---------- герои на кровати ---------- */
const TOP = 0.175;
const manya = makeManya(); manya.g.position.set(-0.98, TOP, -0.15); manya.g.rotation.y = 0.28; manya.g.scale.setScalar(0.92);
const shket = makeShket(); shket.g.position.set(0.02, TOP, 0.5); shket.g.rotation.y = -1.2; shket.g.scale.setScalar(0.86);
const peng = makePenguin(); peng.g.position.set(1.05, TOP, -0.2); peng.g.rotation.y = -0.3; peng.g.scale.setScalar(0.86);
const HEROES = [manya, shket, peng];
for (const h of HEROES) { scene.add(h.g); h.base = h.g.scale.x; h.sq = 0; h.sqv = 0; h.nextBlink = 1 + Math.random() * 3; h.g.traverse(o => { o.userData.hero = h; }); }

/* ---------- свет и время суток ---------- */
const hemi = new THREE.HemisphereLight(C('#fff7ec'), C('#c9b6a6'), 0.6); scene.add(hemi);
const sun = new THREE.DirectionalLight(C('#fff1dc'), 2.0);
sun.position.set(3.5, 5, 4); sun.target.position.set(0, 0.6, 0);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -3.5, right: 3.5, top: 3.5, bottom: -2, near: 1, far: 15 });
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02; sun.shadow.radius = 4;
scene.add(sun, sun.target);
const lamp = new THREE.PointLight(C('#ffcf87'), 0, 7, 2); lamp.position.set(-2.6, 1.6, 0.8); scene.add(lamp);
const TOD = {
  day: { hemi: [0.6, '#fff7ec', '#c9b6a6'], sun: [2.0, '#fff1dc'], lamp: 0, bulbs: 0.15, env: 0.55, exp: 1.0, bg: '#efe2d9' },
  evening: { hemi: [0.38, '#ffd9c0', '#8a6f66'], sun: [1.3, '#ffa36b'], lamp: 1.6, bulbs: 1.6, env: 0.35, exp: 1.0, bg: '#e9cfc0' },
  night: { hemi: [0.16, '#8d97d6', '#2a2440'], sun: [0.45, '#8fa2ff'], lamp: 2.6, bulbs: 2.4, env: 0.16, exp: 1.05, bg: '#23243f' },
};
function setTod(t) {
  const L = TOD[t];
  hemi.intensity = L.hemi[0]; hemi.color.copy(C(L.hemi[1])); hemi.groundColor.copy(C(L.hemi[2]));
  sun.intensity = L.sun[0]; sun.color.copy(C(L.sun[1]));
  lamp.intensity = L.lamp;
  bulbs.forEach(m => { m.emissiveIntensity = L.bulbs; });
  MATS.forEach(m => { m.envMapIntensity = m.roughness < 0.3 ? L.env * 1.8 : L.env; });
  renderer.toneMappingExposure = L.exp;
  skyMat.map.dispose(); skyMat.map = skyTex(t); skyMat.needsUpdate = true;
  document.body.dataset.tod = t;
  document.querySelectorAll('.tods button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tod === t)));
}
const h0 = new Date().getHours();
setTod(h0 >= 17 && h0 < 22 ? 'evening' : (h0 >= 22 || h0 < 6) ? 'night' : 'day');
document.querySelector('.tods').addEventListener('click', e => { const b = e.target.closest('[data-tod]'); if (b) setTod(b.dataset.tod); });

/* ---------- камера: рамка под экран + поворот пальцем ---------- */
const target = new THREE.Vector3(0, 0.95, -0.1);
let az = 0, el = 0.34, azV = 0, W = 1, H = 1, dist = 7;
function frame() {
  W = window.innerWidth; H = window.innerHeight;
  renderer.setSize(W, H);
  camera.aspect = W / H;
  const half = Math.tan(camera.fov * Math.PI / 360);
  dist = Math.max(5.6, 1.8 / (half * camera.aspect));
  target.y = camera.aspect < 0.8 ? 1.75 : 0.9;   // на узком экране смотрим выше — кровать уходит вниз кадра
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', frame);
frame();

const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let drag = null;
renderer.domElement.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, lx: e.clientX, moved: 0 }; try { renderer.domElement.setPointerCapture(e.pointerId); } catch (err) { /* не критично */ } });
renderer.domElement.addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.lx; drag.lx = e.clientX;
  drag.moved += Math.abs(dx);
  if (drag.moved > 6) { az = Math.max(-0.5, Math.min(0.5, az - dx * 0.005)); azV = -dx * 0.3; }
});
renderer.domElement.addEventListener('pointerup', e => {
  if (drag && drag.moved < 8) tap(e.clientX, e.clientY);
  drag = null;
});
['gesturestart', 'gesturechange'].forEach(t => document.addEventListener(t, e => e.preventDefault(), { passive: false }));

const bubbles = {};
function nick() { return S.pick(CFG.nicks); }
function line(id) { const n = nick(); return S.pick(S.TALK[id]).replace(/\{nick\}/g, n).replace(/\{Nick\}/g, S.cap(n)); }
function tap(x, y) {
  ndc.set(x / W * 2 - 1, -(y / H) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(HEROES.map(h => h.g), true)[0];
  if (!hit) return;
  const h = hit.object.userData.hero;
  h.sqv += 3.2;
  say(h, line(h.id));
}
const tmp = new THREE.Vector3();
function say(h, text) {
  if (bubbles[h.id]) bubbles[h.id].el.remove();
  const el = document.createElement('div');
  el.className = 'bubble'; el.textContent = text;
  fx.appendChild(el);
  const b = { el, h };
  bubbles[h.id] = b;
  placeBubble(b);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.remove(); if (bubbles[h.id] === b) delete bubbles[h.id]; }, 320); }, 2800);
}
function placeBubble(b) {
  b.h.head.getWorldPosition(tmp); tmp.y += 0.55 * b.h.g.scale.y;
  tmp.project(camera);
  b.el.style.left = Math.min(Math.max((tmp.x * 0.5 + 0.5) * W, 120), W - 120) + 'px';
  b.el.style.top = Math.max((-tmp.y * 0.5 + 0.5) * H, 120) + 'px';
}

/* ---------- жизнь: дыхание, моргание, отклик на тап ---------- */
const clock = new THREE.Clock();
let t = 0;
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05); t += dt;
  if (!drag) { az += azV * dt * 0.01; azV *= Math.exp(-dt * 5); az *= Math.exp(-dt * 0.4); }
  camera.position.set(target.x + Math.sin(az) * dist * Math.cos(el), target.y + Math.sin(el) * dist, target.z + Math.cos(az) * dist * Math.cos(el));
  camera.lookAt(target);
  HEROES.forEach((h, i) => {
    h.sqv += (-130 * h.sq - 9 * h.sqv) * dt; h.sq += h.sqv * dt;
    const br = reduce ? 0 : Math.sin(t * (1.6 + i * 0.25) + i) * 0.012;
    h.g.scale.set(h.base * (1 + 0.06 * h.sq - br * 0.5), h.base * (1 - 0.09 * h.sq + br), h.base * (1 + 0.06 * h.sq - br * 0.5));
    if (t > h.nextBlink) { h.blinkAt = t; h.nextBlink = t + 2.5 + Math.random() * 3.5; }
    let k = 1;
    if (h.blinkAt != null) { const p = (t - h.blinkAt) / 0.16; if (p < 1) k = 1 - 0.9 * Math.sin(p * Math.PI); else h.blinkAt = null; }
    h.eyes.forEach(e => { if (e.userData.sy == null) e.userData.sy = e.scale.y; e.scale.y = e.userData.sy * k; });
    if (!reduce) h.head.rotation.z = Math.sin(t * 0.7 + i * 2) * 0.04;
  });
  if (!reduce && peng.flips) peng.flips.forEach((f, j) => { f.rotation.z = (j ? 0.32 : -0.32) + Math.sin(t * 1.3 + j) * 0.04; });
  Object.values(bubbles).forEach(placeBubble);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();
})();
