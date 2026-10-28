/* Шкет и Маня — рисунки. Всё рисуется в SVG-строки: комната, три героя, предметы.
   Координаты сцены: 400 × 600. У героев начало координат — точка, где они сидят (низ, центр). */
(function () {
'use strict';

const C = {
  // Шкет — капибара
  capyOl: '#5b3920', capyTop: '#c99260', capyBot: '#9e6b40', capyDark: '#84542f', capyNose: '#3a2315', capyEarIn: '#9b6440',
  // Маня — овечка из кудрявого флиса
  woolOl: '#b3a491', woolBase: '#f8f4ec', woolCurl: '#e6dccc', earIn: '#f3e4bd', manyaEye: '#6b4637', manyaNose: '#8c4a3e',
  // Пингвин
  pOl: '#3f4148', pBody: '#a6a8af', pBodyHi: '#c3c5cb', pHead: '#1d1e23', pFace: '#f6f6f3', pBeak: '#7c7e85', pFoot: '#5e6067',
  scarfBlue: '#2f7fd0',
  eye: '#21150e', blush: '#ef8f84', ink: '#4a3428',
};
const FONT = "Pangolin, 'Comic Sans MS', cursive";

/* ---------- defs: градиенты и узоры, свои у каждой картинки (uid) ---------- */
const SKY = {
  morning: [[0, '#a8d5f0'], [0.7, '#ffe3bf'], [1, '#ffd09a']],
  day: [[0, '#86c6ee'], [1, '#d8f1fc']],
  evening: [[0, '#5e5c9e'], [0.55, '#e98e74'], [1, '#ffc98d']],
  night: [[0, '#0f1434'], [1, '#2c3567']],
};
function defs(uid, tod) {
  return `<defs>
<linearGradient id="cf-${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.capyTop}"/><stop offset="1" stop-color="${C.capyBot}"/></linearGradient>
<pattern id="wool-${uid}" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="${C.woolBase}"/><circle cx="2.5" cy="2.5" r="2" fill="${C.woolCurl}" opacity=".55"/><circle cx="7.5" cy="7.5" r="2" fill="${C.woolCurl}" opacity=".55"/><circle cx="7.6" cy="2.2" r="1.2" fill="${C.woolCurl}" opacity=".4"/><circle cx="2.3" cy="7.7" r="1.2" fill="${C.woolCurl}" opacity=".4"/></pattern>
<radialGradient id="wsh-${uid}" cx=".38" cy=".3" r=".85"><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#bfb09c" stop-opacity=".38"/></radialGradient>
<radialGradient id="face-${uid}" cx=".45" cy=".38" r=".75"><stop offset="0" stop-color="#fffdf8"/><stop offset="1" stop-color="#efe6d7"/></radialGradient>
<radialGradient id="pb-${uid}" cx=".42" cy=".35" r=".8"><stop offset="0" stop-color="${C.pBodyHi}"/><stop offset="1" stop-color="#8b8d95"/></radialGradient>
<radialGradient id="ph-${uid}" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#3c3e46"/><stop offset="1" stop-color="${C.pHead}"/></radialGradient>
<pattern id="scarf-${uid}" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(28)"><rect width="8" height="8" fill="#fff"/><rect width="4" height="8" fill="${C.scarfBlue}"/></pattern>
<linearGradient id="sky-${uid}" x1="0" y1="0" x2="0" y2="1">${SKY[tod].map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>
<pattern id="wp-${uid}" width="30" height="30" patternUnits="userSpaceOnUse"><rect width="30" height="30" fill="#ebcbc5"/><path d="M15 3L27 15L15 27L3 15Z" fill="none" stroke="#f5e1dc" stroke-width="1.6"/><path d="M15 10L20 15L15 20L10 15Z" fill="#f2d9d3"/><circle cx="0" cy="0" r="1.6" fill="#f5e1dc"/><circle cx="30" cy="30" r="1.6" fill="#f5e1dc"/></pattern>
<pattern id="sheet-${uid}" width="44" height="38" patternUnits="userSpaceOnUse"><rect width="44" height="38" fill="#f4f3ee"/><path d="M0 0H44M0 0L22 38L44 0M0 38H44" fill="none" stroke="#7aa173" stroke-width="1.3"/></pattern>
<pattern id="duvet-${uid}" width="70" height="70" patternUnits="userSpaceOnUse"><rect width="70" height="70" fill="#e8e7e2"/><ellipse cx="22" cy="20" rx="18" ry="7" fill="#d9d7d0" opacity=".7" transform="rotate(-30 22 20)"/><ellipse cx="52" cy="52" rx="14" ry="5" fill="#dcdad3" opacity=".6" transform="rotate(-30 52 52)"/><path d="M-5 60L60 -5M20 75L75 20" stroke="#c9a650" stroke-width="1.2" opacity=".85"/></pattern>
<radialGradient id="glow-${uid}"><stop offset="0" stop-color="#ffd98a" stop-opacity=".9"/><stop offset="1" stop-color="#ffd98a" stop-opacity="0"/></radialGradient>
<radialGradient id="lamp-${uid}"><stop offset="0" stop-color="#ffcf87" stop-opacity=".55"/><stop offset=".6" stop-color="#ffcf87" stop-opacity=".12"/><stop offset="1" stop-color="#ffcf87" stop-opacity="0"/></radialGradient>
<radialGradient id="screen-${uid}"><stop offset="0" stop-color="#cfe8ff" stop-opacity=".7"/><stop offset="1" stop-color="#cfe8ff" stop-opacity="0"/></radialGradient>
<clipPath id="win-${uid}"><rect x="232" y="72" width="136" height="172"/></clipPath>
</defs>`;
}

/* ---------- комната: как у Веты — розовые обои с ромбами, простыня в зелёные треугольники ---------- */
function bulbs() {
  const out = [];
  for (let i = 0; i < 11; i++) {
    const t = (i + 0.5) / 11;
    const x = (1 - t) * (1 - t) * 0 + 2 * (1 - t) * t * 200 + t * t * 400;
    const y = (1 - t) * (1 - t) * 26 + 2 * (1 - t) * t * 70 + t * t * 22;
    out.push([x, y + 7, ['#ffd36b', '#f7a7b8', '#9fe0c8'][i % 3]]);
  }
  return out;
}
const BULBS = bulbs();

function cloud(x, y, s, c) {
  return `<g transform="translate(${x} ${y}) scale(${s})" fill="${c}"><circle cx="-14" cy="0" r="10"/><circle cx="0" cy="-6" r="13"/><circle cx="15" cy="0" r="10"/><rect x="-24" y="0" width="48" height="9" rx="4.5"/></g>`;
}
function snowFlakes() {
  return Array.from({ length: 18 }, (_, i) => `<circle cx="${236 + (i * 37) % 130}" cy="${78 + (i * 53) % 164}" r="${1.5 + (i % 3) * 0.6}" fill="#fff" opacity=".9" class="float" style="animation-delay:${(i % 5) * 0.4}s"/>`).join('');
}
function skyDetails(tod) {
  if (tod === 'night') {
    const stars = [[248, 92], [266, 130], [292, 84], [312, 150], [352, 90], [356, 170], [282, 176], [244, 160], [340, 130]]
      .map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 3 ? 1.2 : 1.8}" fill="#fff7d6" class="twinkle" style="animation-delay:${i * 0.4}s"/>`).join('');
    return `${stars}<circle cx="326" cy="112" r="16" fill="#f4ecd0"/><circle cx="333" cy="106" r="14" fill="#141a3d"/>`;
  }
  if (tod === 'evening') return `<circle cx="300" cy="232" r="34" fill="#ffb27a" opacity=".35"/><circle cx="300" cy="232" r="20" fill="#ff9a62"/>${cloud(268, 128, 0.8, '#f7b9a0')}`;
  if (tod === 'morning') return `<circle cx="272" cy="214" r="30" fill="#ffe08a" opacity=".35"/><circle cx="272" cy="214" r="16" fill="#ffd36b"/>${cloud(330, 130, 0.75, '#fff3ea')}`;
  return `<circle cx="338" cy="104" r="26" fill="#fff5c0" opacity=".45"/><circle cx="338" cy="104" r="14" fill="#fff0a3"/>${cloud(276, 112, 0.9, '#fff')}${cloud(326, 168, 0.7, '#fff')}`;
}
function roofs(tod) {
  const col = { morning: '#b6a7b9', day: '#9fb2c7', evening: '#6d5d82', night: '#1d2447' }[tod];
  const lit = tod === 'night' || tod === 'evening'
    ? [[258, 222], [276, 230], [304, 214], [338, 226], [356, 232], [262, 236]].map(([x, y]) => `<rect x="${x}" y="${y}" width="5" height="6" fill="#ffd27a" opacity=".9"/>`).join('')
    : '';
  return `<path d="M232 246V214H252V200H270V218H290V206L302 196L314 206V222H332V204H350V214H368V246Z" fill="${col}"/>${lit}`;
}
function room(uid, tod, opt = {}) {
  let s = `<rect width="400" height="600" fill="url(#wp-${uid})"/>`;
  // гирлянда
  s += `<path d="M0 26Q200 70 400 22" fill="none" stroke="#6f5a4e" stroke-width="1.6"/>`;
  s += BULBS.map(([x, y, c]) => `<rect x="${x - 2.5}" y="${y - 9}" width="5" height="4" rx="1" fill="#6f5a4e"/><ellipse cx="${x}" cy="${y}" rx="4.6" ry="6" fill="${c}"/>`).join('');
  // рамка с сердечком
  s += `<g transform="translate(72 104) rotate(-3)"><rect x="-30" y="-36" width="60" height="72" rx="4" fill="#d6ad86" stroke="#a37752" stroke-width="2"/><rect x="-23" y="-29" width="46" height="58" fill="#fffaf2"/><path d="M0 12c-10-7-16-12-16-18 0-5 4-9 8.5-9 3.5 0 6 2 7.5 4.5 1.5-2.5 4-4.5 7.5-4.5 4.5 0 8.5 4 8.5 9 0 6-6 11-16 18z" fill="#ef8f8a"/></g>`;
  // полка
  s += `<g><rect x="40" y="170" width="12" height="36" rx="1.5" fill="#8fb3c9" stroke="#6c8ea3" stroke-width="1.5"/><rect x="53" y="176" width="10" height="30" rx="1.5" fill="#e3b46c" stroke="#bf9150" stroke-width="1.5"/><rect x="64" y="166" width="13" height="40" rx="1.5" fill="#c98b8b" stroke="#a66b6b" stroke-width="1.5"/><rect x="82" y="174" width="11" height="32" rx="1.5" fill="#a9c7a0" stroke="#86a57d" stroke-width="1.5" transform="rotate(12 87 206)"/>
<path d="M128 206l-6-24h28l-6 24z" fill="#d98e6a" stroke="#b06d4e" stroke-width="2"/><g fill="#7fae6a" stroke="#5f8c4d" stroke-width="1.5"><ellipse cx="128" cy="168" rx="6" ry="13" transform="rotate(-28 128 168)"/><ellipse cx="144" cy="166" rx="6" ry="13" transform="rotate(26 144 166)"/><ellipse cx="136" cy="160" rx="6" ry="15"/></g>
<rect x="26" y="206" width="150" height="9" rx="3" fill="#c79c74" stroke="#9e7350" stroke-width="2"/><path d="M42 215l6 14M160 215l-6 14" stroke="#9e7350" stroke-width="3" stroke-linecap="round"/></g>`;
  // окно
  s += `<rect x="212" y="58" width="176" height="6" rx="3" fill="#b88a63"/>
<rect x="226" y="66" width="148" height="184" rx="8" fill="#fbf7f0" stroke="#cdbba7" stroke-width="2.5"/>
<rect x="232" y="72" width="136" height="172" fill="url(#sky-${uid})"/>
<g clip-path="url(#win-${uid})">${skyDetails(tod)}${roofs(tod)}${opt.snow ? snowFlakes() : ''}${opt.pigeon ? pigeon(338, 244) : ''}</g>
<rect x="297" y="72" width="6" height="172" fill="#fbf7f0"/><rect x="232" y="154" width="136" height="6" fill="#fbf7f0"/>
<rect x="218" y="248" width="164" height="10" rx="3" fill="#f3ebe0" stroke="#cdbba7" stroke-width="2"/>
<path d="M214 62C222 120 210 180 226 266L240 266C236 200 246 120 238 62Z" fill="#f0d3a0" stroke="#d1b07a" stroke-width="2"/>
<path d="M386 62C378 120 390 180 374 266L360 266C364 200 354 120 362 62Z" fill="#f0d3a0" stroke="#d1b07a" stroke-width="2"/>`;
  // изголовье
  s += `<path d="M10 446V336Q10 306 44 304H356Q390 306 390 336V446Z" fill="#e9ddd0" stroke="#c4b2a0" stroke-width="3"/>
<path d="M40 330H360" stroke="#d8c8b6" stroke-width="2" stroke-dasharray="2 7" stroke-linecap="round"/>`;
  // простыня
  s += `<path d="M0 436H400V600H0Z" fill="url(#sheet-${uid})"/><path d="M0 436H400" stroke="#d9d6cc" stroke-width="3"/>`;
  // подушки
  s += pillow(112, 424, 156, 64, '#fbfaf6') + pillow(292, 426, 146, 60, '#f3efe8');
  // одеяло внизу
  s += `<path d="M0 552C70 542 140 556 210 548S340 540 400 550V600H0Z" fill="url(#duvet-${uid})" stroke="#c9c6bd" stroke-width="2.5"/>`;
  return s;
}
function pillow(cx, cy, w, h, c) {
  return `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="${h * 0.42}" fill="${c}" stroke="#d6cfc2" stroke-width="2.5"/><rect x="${cx - w / 2 + 8}" y="${cy - h / 2 + 8}" width="${w - 16}" height="${h - 16}" rx="${h * 0.32}" fill="none" stroke="#e4ddd0" stroke-width="1.6" stroke-dasharray="4 4"/>`;
}

/* свет и тень по времени суток — поверх всего */
/* затемнение умножением: белое становится цветом света, чёрные контуры остаются чёрными */
const SHADE = { morning: '#fff1e2', day: null, evening: '#f4cdb0', night: '#7f84c2' };
function overlay(uid, tod) {
  let s = '';
  const sh = SHADE[tod];
  if (sh) s += `<rect width="400" height="600" fill="${sh}" style="mix-blend-mode:multiply" pointer-events="none"/>`;
  if (tod === 'night' || tod === 'evening') {
    s += `<circle cx="0" cy="360" r="240" fill="url(#lamp-${uid})" opacity="${tod === 'night' ? 0.5 : 0.35}" pointer-events="none"/>`;
    s += BULBS.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="15" fill="url(#glow-${uid})" pointer-events="none" class="glowpulse"/>`).join('');
  }
  return s;
}

/* ---------- Шкет: капибара, профиль, смотрит вправо ---------- */
function capyEyes(kind) {
  const o = C.capyOl;
  switch (kind) {
    case 'closed': return `<path d="M42 -54q6 4.5 12 0" fill="none" stroke="${o}" stroke-width="2.4" stroke-linecap="round"/>`;
    case 'happy': return `<path d="M42 -52q6 -6.5 12 0" fill="none" stroke="${o}" stroke-width="2.4" stroke-linecap="round"/>`;
    case 'wide': return `<g class="eyes"><circle cx="48" cy="-55" r="6.2" fill="#fff" stroke="${o}" stroke-width="1.6"/><circle cx="49.3" cy="-55" r="3.6" fill="${C.eye}"/><circle cx="50.4" cy="-56.4" r="1.2" fill="#fff"/></g>`;
    case 'grumpy': return `<g class="eyes"><circle cx="48" cy="-53.5" r="3.8" fill="${C.eye}"/><circle cx="49.3" cy="-55" r="1.1" fill="#fff"/></g><path d="M40 -60.5L56 -57" stroke="${o}" stroke-width="2.8" stroke-linecap="round"/>`;
    default: return `<g class="eyes"><circle cx="48" cy="-55" r="4.4" fill="${C.eye}"/><circle cx="49.6" cy="-56.6" r="1.4" fill="#fff"/></g>`;
  }
}
const HATS = {
  party: c => `<path d="M-12 0L0 -32L12 0Z" fill="${c || '#f4a1b5'}" stroke="#a35d6e" stroke-width="2" stroke-linejoin="round"/><circle cx="-4" cy="-8" r="2" fill="#fff"/><circle cx="4" cy="-16" r="2" fill="#fff"/><circle cx="-1" cy="-23" r="1.6" fill="#fff"/><circle cx="0" cy="-33" r="4.5" fill="#ffd36b" stroke="#c9a03d" stroke-width="1.5"/>`,
  santa: () => `<path d="M-15 0C-13 -20 6 -32 20 -22L13 -12C9 -17 2 -14 -1 0Z" fill="#d9493f" stroke="#9f2f28" stroke-width="2" stroke-linejoin="round"/><ellipse cx="0" cy="0" rx="17" ry="6" fill="#fff" stroke="#d8d2cc" stroke-width="1.5"/><circle cx="21" cy="-22" r="5.5" fill="#fff" stroke="#d8d2cc" stroke-width="1.5"/>`,
  nurse: () => `<path d="M-15 0L-12 -13H12L15 0Z" fill="#fff" stroke="#c9bfb6" stroke-width="2" stroke-linejoin="round"/><path d="M0 -3.5c-3-2-5-3.6-5-5.6 0-1.6 1.2-2.6 2.5-2.6 1.1 0 1.9.6 2.5 1.4.6-.8 1.4-1.4 2.5-1.4 1.3 0 2.5 1 2.5 2.6 0 2-2 3.6-5 5.6z" fill="#ef6f78"/>`,
};
function capy(o) {
  const { x = 0, y = 0, s = 1, flip = false, pose = 'loaf', eyes = 'open', mouth = 'calm', hat = '', hatColor = '', onHead = '', uid, anim = 'breathe', extra = '' } = o;
  const ol = C.capyOl;
  const mo = mouth === 'open'
    ? `<ellipse cx="73" cy="-26.5" rx="3.6" ry="3" fill="#5a2a1c"/>`
    : mouth === 'smile' ? `<path d="M78 -30q-4 6 -11 2.5" fill="none" stroke="${ol}" stroke-width="1.9" stroke-linecap="round"/>`
      : `<path d="M77 -28q-4 3 -9 1" fill="none" stroke="${ol}" stroke-width="1.8" stroke-linecap="round"/>`;
  let inner = `
<ellipse cx="30" cy="-84" rx="8.5" ry="7.5" fill="${C.capyDark}" stroke="${ol}" stroke-width="2.2"/><ellipse cx="30.5" cy="-85" rx="4.2" ry="3.4" fill="${C.capyEarIn}"/>
<ellipse cx="-46" cy="-8" rx="13" ry="8.5" fill="${C.capyDark}" stroke="${ol}" stroke-width="2.2"/>
<ellipse cx="38" cy="-8" rx="12" ry="8.5" fill="${C.capyDark}" stroke="${ol}" stroke-width="2.2"/>
<path d="M-68 -12C-80 -42 -66 -72 -30 -77C0 -81 30 -83 48 -75C66 -68 81 -53 81 -37C81 -22 70 -14 54 -13C30 -7 -40 -3 -68 -12Z" fill="url(#cf-${uid})" stroke="${ol}" stroke-width="2.6" stroke-linejoin="round"/>
<path d="M-58 -44C-48 -66 -2 -74 30 -73" fill="none" stroke="${ol}" stroke-opacity=".3" stroke-width="1.4" stroke-dasharray="3 4"/>
<path d="M60 -55C74 -52 81 -42 80 -32C79 -21 68 -16 56 -17C60 -30 61 -44 60 -55Z" fill="${C.capyDark}" opacity=".35"/>
<ellipse cx="75.5" cy="-44" rx="3.6" ry="5.6" fill="${C.capyNose}" transform="rotate(-12 75.5 -44)"/>
${mo}${capyEyes(eyes)}
<ellipse cx="57" cy="-37" rx="6.5" ry="3.6" fill="${C.blush}" opacity=".45"/>`;
  if (hat) inner += `<g transform="translate(36 -82) rotate(10)">${HATS[hat](hatColor)}</g>`;
  if (onHead === 'tangerine') inner += tangerine(38, -92, 11);
  inner += extra;
  const poseT = pose === 'sit' ? 'rotate(-16 -64 -6)' : pose === 'flop' ? 'translate(0 -86) scale(1 -1)' : pose === 'low' ? 'scale(1.05 .9)' : '';
  return wrap('shket', x, y, s, flip, anim, poseT, inner);
}

/* ---------- Маня: овечка из флиса, сидит лицом к нам ---------- */
function manyaEyes(kind) {
  const e = C.manyaEye;
  switch (kind) {
    case 'closed': return `<path d="M-20 -147q5.5 4 11 0M9 -147q5.5 4 11 0" fill="none" stroke="${e}" stroke-width="2.3" stroke-linecap="round"/>`;
    case 'happy': return `<path d="M-20 -145q5.5 -5.5 11 0M9 -145q5.5 -5.5 11 0" fill="none" stroke="${e}" stroke-width="2.3" stroke-linecap="round"/>`;
    case 'wide': return `<g class="eyes"><ellipse cx="-14" cy="-148" rx="3.6" ry="5.6" fill="${e}"/><ellipse cx="14" cy="-148" rx="3.6" ry="5.6" fill="${e}"/><circle cx="-13" cy="-150" r="1.2" fill="#fff"/><circle cx="15" cy="-150" r="1.2" fill="#fff"/></g>`;
    case 'grumpy': return `<g class="eyes"><ellipse cx="-14" cy="-147" rx="2.6" ry="3.4" fill="${e}"/><ellipse cx="14" cy="-147" rx="2.6" ry="3.4" fill="${e}"/></g><path d="M-22 -156L-8 -153M22 -156L8 -153" stroke="${e}" stroke-width="2.2" stroke-linecap="round"/>`;
    default: return `<g class="eyes"><ellipse cx="-14" cy="-148" rx="2.6" ry="4.3" fill="${e}" transform="rotate(-12 -14 -148)"/><ellipse cx="14" cy="-148" rx="2.6" ry="4.3" fill="${e}" transform="rotate(12 14 -148)"/></g>`;
  }
}
function manyaArm(side, angle, uid) {
  return `<g transform="translate(${side * 33} -100) rotate(${-side * angle})"><rect x="-11" y="-8" width="22" height="66" rx="11" fill="url(#wool-${uid})" stroke="${C.woolOl}" stroke-width="2.2"/><rect x="-11" y="-8" width="22" height="66" rx="11" fill="url(#wsh-${uid})"/></g>`;
}
function manya(o) {
  const { x = 0, y = 0, s = 1, flip = false, eyes = 'open', mouth = 'calm', arms = [14, 14], armsOver = false, tilt = 0, hat = '', hatColor = '', uid, anim = 'breathe2', extra = '', legs = 'out' } = o;
  const W = `url(#wool-${uid})`, SH = `url(#wsh-${uid})`, ol = C.woolOl;
  const ear = side => `<g transform="rotate(${side * 14} ${side * 44} -152)"><ellipse cx="${side * 62}" cy="-152" rx="27" ry="14" fill="${W}" stroke="${ol}" stroke-width="2.2"/><ellipse cx="${side * 64}" cy="-152" rx="18" ry="8" fill="${C.earIn}"/></g>`;
  const leg = side => legs === 'tucked'
    ? `<ellipse cx="${side * 26}" cy="-14" rx="20" ry="14" fill="${W}" stroke="${ol}" stroke-width="2.2"/>`
    : `<g transform="rotate(${-side * 8} ${side * 22} -40)"><rect x="${side * 22 - 14}" y="-50" width="28" height="56" rx="14" fill="${W}" stroke="${ol}" stroke-width="2.2"/><rect x="${side * 22 - 14}" y="-50" width="28" height="56" rx="14" fill="${SH}"/><ellipse cx="${side * 22}" cy="-1" rx="10" ry="5" fill="#ece3d4"/></g>`;
  const mo = mouth === 'open' ? `<ellipse cx="0" cy="-114" rx="3.6" ry="2.8" fill="${C.manyaNose}"/>` : '';
  let inner = `${ear(-1)}${ear(1)}
<ellipse cx="0" cy="-66" rx="40" ry="46" fill="${W}" stroke="${ol}" stroke-width="2.2"/><ellipse cx="0" cy="-66" rx="40" ry="46" fill="${SH}"/>
${leg(-1)}${leg(1)}
${armsOver ? '' : manyaArm(-1, arms[0], uid) + manyaArm(1, arms[1], uid)}
<ellipse cx="0" cy="-150" rx="46" ry="43" fill="${W}" stroke="${ol}" stroke-width="2.2"/><ellipse cx="0" cy="-150" rx="46" ry="43" fill="${SH}"/>
<ellipse cx="0" cy="-142" rx="33" ry="34" fill="url(#face-${uid})" stroke="#dacfbd" stroke-width="1.6"/>
${manyaEyes(eyes)}
<path d="M-6 -131L0 -126L6 -131M0 -126V-119" fill="none" stroke="${C.manyaNose}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>${mo}
<ellipse cx="-23" cy="-128" rx="6" ry="3.4" fill="${C.blush}" opacity=".32"/><ellipse cx="23" cy="-128" rx="6" ry="3.4" fill="${C.blush}" opacity=".32"/>
${armsOver ? manyaArm(-1, arms[0], uid) + manyaArm(1, arms[1], uid) : ''}`;
  if (hat) inner += `<g transform="translate(0 -190) rotate(-6)">${HATS[hat](hatColor)}</g>`;
  inner += extra;
  return wrap('manya', x, y, s, flip, anim, tilt ? `rotate(${tilt})` : '', inner);
}

/* ---------- Пингвин: большой птенец, в полосатом платке ---------- */
function pengEyes(kind) {
  const o = '#0d0d10';
  switch (kind) {
    case 'closed': return `<path d="M-32 -161q8 5.5 16 0M16 -161q8 5.5 16 0" fill="none" stroke="${o}" stroke-width="2.8" stroke-linecap="round"/>`;
    case 'happy': return `<path d="M-32 -160q8 -7 16 0M16 -160q8 -7 16 0" fill="none" stroke="${o}" stroke-width="2.8" stroke-linecap="round"/>`;
    case 'grumpy': return `<g class="eyes"><circle cx="-24" cy="-161" r="7" fill="${o}"/><circle cx="24" cy="-161" r="7" fill="${o}"/><circle cx="-21.6" cy="-164" r="2.2" fill="#fff"/><circle cx="26.4" cy="-164" r="2.2" fill="#fff"/></g><path d="M-38 -176L-14 -170M38 -176L14 -170" stroke="${o}" stroke-width="3.4" stroke-linecap="round"/>`;
    case 'wide': return `<g class="eyes"><circle cx="-24" cy="-163" r="9" fill="${o}"/><circle cx="24" cy="-163" r="9" fill="${o}"/><circle cx="-21" cy="-166.5" r="3" fill="#fff"/><circle cx="27" cy="-166.5" r="3" fill="#fff"/></g>`;
    default: return `<g class="eyes"><circle cx="-24" cy="-163" r="7.5" fill="${o}"/><circle cx="24" cy="-163" r="7.5" fill="${o}"/><circle cx="-21.5" cy="-166" r="2.4" fill="#fff"/><circle cx="26.5" cy="-166" r="2.4" fill="#fff"/></g>`;
  }
}
function penguin(o) {
  const { x = 0, y = 0, s = 1, flip = false, eyes = 'open', flippers = [16, 16], tilt = 0, hat = '', hatColor = '', uid, anim = 'breathe3', extra = '', mouth = '' } = o;
  const ol = C.pOl;
  const flipper = (side, a) => `<g transform="translate(${side * 52} -112) rotate(${-side * a})"><ellipse cx="0" cy="34" rx="15" ry="40" fill="url(#pb-${uid})" stroke="${ol}" stroke-width="2.4"/></g>`;
  let inner = `
<ellipse cx="-26" cy="-5" rx="21" ry="9" fill="${C.pFoot}" stroke="${ol}" stroke-width="2.2"/><ellipse cx="26" cy="-5" rx="21" ry="9" fill="${C.pFoot}" stroke="${ol}" stroke-width="2.2"/>
${flipper(-1, flippers[0])}${flipper(1, flippers[1])}
<ellipse cx="0" cy="-74" rx="60" ry="72" fill="url(#pb-${uid})" stroke="${ol}" stroke-width="2.6"/>
<ellipse cx="0" cy="-60" rx="38" ry="48" fill="${C.pBodyHi}" opacity=".45"/>
<path d="M-50 -122Q0 -98 50 -122L50 -106Q0 -82 -50 -106Z" fill="url(#scarf-${uid})" stroke="#2a5f97" stroke-width="1.6"/>
<path d="M-40 -108L-14 -100L-34 -70Z" fill="url(#scarf-${uid})" stroke="#2a5f97" stroke-width="1.6" stroke-linejoin="round"/>
<circle cx="-28" cy="-104" r="7" fill="url(#scarf-${uid})" stroke="#2a5f97" stroke-width="1.6"/>
<circle cx="0" cy="-168" r="60" fill="url(#ph-${uid})" stroke="#0f1013" stroke-width="2.6"/>
<ellipse cx="-27" cy="-160" rx="27" ry="30" fill="${C.pFace}"/><ellipse cx="27" cy="-160" rx="27" ry="30" fill="${C.pFace}"/>
<path d="M-9 -214Q0 -196 9 -214L9 -152Q0 -140 -9 -152Z" fill="url(#ph-${uid})"/>
${pengEyes(eyes)}
<path d="M-13 -150Q0 -156 13 -150Q8 -128 0 -119Q-8 -128 -13 -150Z" fill="${C.pBeak}" stroke="#55575d" stroke-width="2" stroke-linejoin="round"/>
${mouth === 'open' ? '<ellipse cx="0" cy="-131" rx="4" ry="3" fill="#3b3d42"/>' : ''}`;
  if (hat) inner += `<g transform="translate(6 -224) rotate(8)">${HATS[hat](hatColor)}</g>`;
  inner += extra;
  return wrap('peng', x, y, s, flip, anim, tilt ? `rotate(${tilt})` : '', inner);
}

function wrap(id, x, y, s, flip, anim, poseT, inner) {
  const sx = (flip ? -1 : 1) * s;
  return `<g data-char="${id}" class="char" transform="translate(${x} ${y}) scale(${sx} ${s})"><g class="react"><g class="${anim}"><g transform="${poseT}">${inner}</g></g></g></g>`;
}

/* ---------- предметы ---------- */
function tangerine(x, y, r = 10) {
  return `<g><circle cx="${x}" cy="${y}" r="${r}" fill="#f7a23b" stroke="#c9741c" stroke-width="2"/><circle cx="${x - r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.28}" fill="#ffd08a" opacity=".7"/><ellipse cx="${x + r * 0.3}" cy="${y - r * 0.95}" rx="${r * 0.45}" ry="${r * 0.22}" transform="rotate(-25 ${x + r * 0.3} ${y - r * 0.95})" fill="#6fae4f"/><circle cx="${x}" cy="${y - r * 0.92}" r="1.6" fill="#5b7f3a"/></g>`;
}
function fish(x, y, s = 1, rot = 0) {
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="M-18 0Q-6 -11 10 -3L19 -10L17 0L19 10L10 3Q-6 11 -18 0Z" fill="#8fc2e0" stroke="#4f86a8" stroke-width="2" stroke-linejoin="round"/><circle cx="-10" cy="-1.5" r="1.8" fill="#24333d"/><path d="M-2 -5q3 5 0 10" fill="none" stroke="#4f86a8" stroke-width="1.4"/></g>`;
}
function clover(x, y, s = 1) {
  const leaf = a => `<path d="M0 0c-4-6-12-6-12 1 0 5 7 8 12 9 5-1 12-4 12-9 0-7-8-7-12-1z" transform="rotate(${a}) translate(0 -11) scale(.62)" fill="#7dbf63" stroke="#4f8c3c" stroke-width="2.4"/>`;
  return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0Q4 14 -2 24" fill="none" stroke="#4f8c3c" stroke-width="2.4" stroke-linecap="round"/>${leaf(0)}${leaf(120)}${leaf(240)}</g>`;
}
function cookie(x, y, r = 11) {
  return `<g><circle cx="${x}" cy="${y}" r="${r}" fill="#dba468" stroke="#a8743d" stroke-width="2"/><circle cx="${x - r * 0.35}" cy="${y - r * 0.2}" r="${r * 0.14}" fill="#5c3a22"/><circle cx="${x + r * 0.3}" cy="${y + r * 0.3}" r="${r * 0.14}" fill="#5c3a22"/><circle cx="${x + r * 0.25}" cy="${y - r * 0.4}" r="${r * 0.11}" fill="#5c3a22"/></g>`;
}
function watermelon(x, y, s = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-16 -6A16 16 0 0 0 16 -6Z" fill="#ef5f63" stroke="#3f8a45" stroke-width="3.2" stroke-linejoin="round"/><circle cx="-6" cy="-1" r="1.4" fill="#2a1b17"/><circle cx="0" cy="3" r="1.4" fill="#2a1b17"/><circle cx="6" cy="-1" r="1.4" fill="#2a1b17"/></g>`;
}
function laptopBack(x, y, s = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-64 -84H64L70 0H-70Z" fill="#d3d7de" stroke="#8f96a0" stroke-width="2.6" stroke-linejoin="round"/>
<path d="M-74 0H74L70 8H-70Z" fill="#b9bec7" stroke="#8f96a0" stroke-width="2"/>
<path d="M0 -36c-9-6-15-11-15-17 0-5 4-8.5 8-8.5 3.4 0 5.6 2 7 4.4 1.4-2.4 3.6-4.4 7-4.4 4 0 8 3.5 8 8.5 0 6-6 11-15 17z" fill="#f29aa0" stroke="#d07780" stroke-width="1.5"/></g>`;
}
function popcorn(x, y) {
  const puffs = [[-14, -18], [-4, -24], [7, -21], [15, -15], [-9, -12], [3, -14], [12, -9], [-16, -9]].map(([a, b]) => `<circle cx="${x + a}" cy="${y + b}" r="6.5" fill="#fff6dc" stroke="#e1cc9c" stroke-width="1.5"/>`).join('');
  return `<g>${puffs}<path d="M${x - 24} ${y - 10}H${x + 24}L${x + 17} ${y + 14}H${x - 17}Z" fill="#fff" stroke="#c9483d" stroke-width="2" stroke-linejoin="round"/><path d="M${x - 14} ${y - 10}L${x - 10} ${y + 14}M${x} ${y - 10}V${y + 14}M${x + 14} ${y - 10}L${x + 10} ${y + 14}" stroke="#e1544a" stroke-width="5"/></g>`;
}
function cup(x, y, c = '#fff', empty = false) {
  return `<g><ellipse cx="${x}" cy="${y + 1}" rx="17" ry="4" fill="#f3ece4" stroke="#c9b8a6" stroke-width="1.8"/><path d="M${x + 11} ${y - 13}q8 0 8 5.5t-9 4.5" fill="none" stroke="#c9b8a6" stroke-width="2.6"/><path d="M${x - 12} ${y - 17}h24v6q0 11-12 11t-12-11z" fill="${c}" stroke="#c9b8a6" stroke-width="2"/>${empty ? '' : `<ellipse cx="${x}" cy="${y - 17}" rx="11" ry="2.6" fill="#b9763f"/><path class="steam" d="M${x - 4} ${y - 24}q-4 -7 0 -12t0 -12M${x + 4} ${y - 24}q-4 -7 0 -12t0 -12" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>`}</g>`;
}
function teapot(x, y) {
  return `<g><path d="M${x + 20} ${y - 18}q16 -6 20 -22" fill="none" stroke="#7fa9c4" stroke-width="5" stroke-linecap="round"/><path d="M${x - 20} ${y - 24}q-14 2 -12 14" fill="none" stroke="#7fa9c4" stroke-width="4.5" stroke-linecap="round"/><ellipse cx="${x}" cy="${y - 17}" rx="23" ry="18" fill="#a9cbe0" stroke="#7fa9c4" stroke-width="2.2"/><ellipse cx="${x}" cy="${y - 34}" rx="11" ry="3.5" fill="#94bcd4" stroke="#7fa9c4" stroke-width="2"/><circle cx="${x}" cy="${y - 39}" r="3.5" fill="#f2c9a0"/><path d="M${x - 12} ${y - 17}h24" stroke="#fff" stroke-width="3" opacity=".6" stroke-linecap="round"/></g>`;
}
function plate(x, y, items = '') {
  return `<g><ellipse cx="${x}" cy="${y}" rx="30" ry="8" fill="#fff" stroke="#d3c7b8" stroke-width="2"/>${items}</g>`;
}
function book(x, y, s = 1, rot = 0) {
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="M-34 4L0 8L34 4V-30L0 -26L-34 -30Z" fill="#c0504d" stroke="#8f3532" stroke-width="2" stroke-linejoin="round"/><path d="M0 4Q-15 -4 -30 2V-30Q-15 -36 0 -28Z" fill="#fffaf0" stroke="#c7b79f" stroke-width="1.6"/><path d="M0 4Q15 -4 30 2V-30Q15 -36 0 -28Z" fill="#fffaf0" stroke="#c7b79f" stroke-width="1.6"/><path d="M-25 -22h18M-25 -15h18M-25 -8h14M7 -22h18M7 -15h18M7 -8h12" stroke="#cdbfa8" stroke-width="1.6" stroke-linecap="round"/></g>`;
}
function boxBack(x, y) {
  return `<path d="M${x - 54} ${y - 58}L${x - 46} ${y - 66}H${x + 46}L${x + 54} ${y - 58}Z" fill="#8f6031"/>`;
}
function boxFront(x, y, label) {
  return `<g><path d="M${x - 54} ${y - 58}L${x - 76} ${y - 76}L${x - 62} ${y - 82}L${x - 46} ${y - 64}Z" fill="#c99358" stroke="#a6743f" stroke-width="2.2" stroke-linejoin="round"/><path d="M${x + 54} ${y - 58}L${x + 76} ${y - 76}L${x + 62} ${y - 82}L${x + 46} ${y - 64}Z" fill="#c99358" stroke="#a6743f" stroke-width="2.2" stroke-linejoin="round"/>
<rect x="${x - 54}" y="${y - 58}" width="108" height="58" rx="3" fill="#d8a46a" stroke="#a6743f" stroke-width="2.4"/><rect x="${x - 8}" y="${y - 58}" width="16" height="58" fill="#e8c495" opacity=".7"/>
${label ? `<text x="${x}" y="${y - 22}" text-anchor="middle" font-family="${FONT}" font-size="17" fill="#6b4524" transform="rotate(-4 ${x} ${y - 22})">${label}</text>` : ''}</g>`;
}
function sign(x, y, text, rot = -4) {
  return `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="-3" y="-6" width="6" height="70" rx="2" fill="#b98a5c" stroke="#8a6340" stroke-width="1.6"/><rect x="-62" y="-66" width="124" height="62" rx="4" fill="#fffaf0" stroke="#c7b79f" stroke-width="2.2"/><text x="0" y="-42" text-anchor="middle" font-family="${FONT}" font-size="17" fill="#c64a3e">${text[0]}</text><text x="0" y="-19" text-anchor="middle" font-family="${FONT}" font-size="17" fill="#c64a3e">${text[1]}</text></g>`;
}
function note(x, y, lines, rot = -5, w = 108) {
  return `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="${-w / 2}" y="-30" width="${w}" height="${12 + lines.length * 20}" rx="3" fill="#fffdf6" stroke="#d8cbb9" stroke-width="2"/><path d="M${-w / 2 + 6} -30v${12 + lines.length * 20}" stroke="#f0b3b0" stroke-width="1.2"/>${lines.map((l, i) => `<text x="${-w / 2 + 14}" y="${-12 + i * 20}" font-family="${FONT}" font-size="15" fill="#5a7fb5">${l}</text>`).join('')}</g>`;
}
function flag(x, y, text) {
  return `<g><path d="M${x} ${y}V${y - 70}" stroke="#8a6340" stroke-width="3" stroke-linecap="round"/><path d="M${x} ${y - 70}L${x + 70} ${y - 58}L${x} ${y - 44}Z" fill="#f29aa0" stroke="#c96f78" stroke-width="2" stroke-linejoin="round" class="wave"/><text x="${x + 6}" y="${y - 54}" font-family="${FONT}" font-size="10.5" fill="#fff">${text}</text></g>`;
}
function ivStand(x, y, tx, ty) {
  return `<g><path d="M${x - 22} ${y}L${x} ${y - 10}L${x + 22} ${y}M${x} ${y - 10}V${y - 196}M${x - 16} ${y - 196}H${x + 16}" fill="none" stroke="#a7adb5" stroke-width="3.2" stroke-linecap="round"/>
<path d="M${x - 1} ${y - 196}v8" stroke="#a7adb5" stroke-width="2"/><rect x="${x - 15}" y="${y - 188}" width="30" height="42" rx="8" fill="#ffe2c8" stroke="#e1a676" stroke-width="2"/><rect x="${x - 13}" y="${y - 170}" width="26" height="22" rx="6" fill="#f6a463" opacity=".85"/>
<text x="${x}" y="${y - 176}" text-anchor="middle" font-family="${FONT}" font-size="8.5" fill="#a5582a">компот</text>
<path d="M${x} ${y - 146}C${x} ${y - 110} ${tx + 30} ${ty - 40} ${tx} ${ty}" fill="none" stroke="#e8cdb6" stroke-width="2.4"/></g>`;
}
function meatball(x, y, r = 34) {
  return `<g><circle cx="${x}" cy="${y - r}" r="${r}" fill="#8a4c2c" stroke="#5a2e18" stroke-width="2.6"/>
<circle cx="${x - r * 0.4}" cy="${y - r * 0.6}" r="2" fill="#4f7a2f"/><circle cx="${x + r * 0.5}" cy="${y - r * 0.4}" r="1.8" fill="#d8b98a"/><circle cx="${x + r * 0.2}" cy="${y - r * 1.5}" r="1.6" fill="#4f7a2f"/>
<path d="M${x - r * 0.9} ${y - r * 1.45}Q${x} ${y - r * 2.25} ${x + r * 0.9} ${y - r * 1.45}Q${x + r * 0.5} ${y - r * 1.25} ${x + r * 0.3} ${y - r * 1.4}Q${x + r * 0.15} ${y - r * 1.05} ${x} ${y - r * 1.35}Q${x - r * 0.4} ${y - r * 1.2} ${x - r * 0.9} ${y - r * 1.45}Z" fill="#c23a1c" stroke="#8d2510" stroke-width="1.6"/>
<path d="M${x - r * 0.62} ${y - r * 1.18}L${x - r * 0.12} ${y - r * 1.02}M${x + r * 0.62} ${y - r * 1.18}L${x + r * 0.12} ${y - r * 1.02}" stroke="#2b1309" stroke-width="4.5" stroke-linecap="round"/>
<circle cx="${x - r * 0.33}" cy="${y - r * 0.86}" r="${r * 0.17}" fill="#f3eee3" stroke="#2b1309" stroke-width="1.4"/><circle cx="${x + r * 0.33}" cy="${y - r * 0.86}" r="${r * 0.17}" fill="#f3eee3" stroke="#2b1309" stroke-width="1.4"/>
<circle cx="${x - r * 0.3}" cy="${y - r * 0.84}" r="${r * 0.08}" fill="#1a0e08"/><circle cx="${x + r * 0.3}" cy="${y - r * 0.84}" r="${r * 0.08}" fill="#1a0e08"/>
<path d="M${x - r * 0.4} ${y - r * 0.42}Q${x} ${y - r * 0.62} ${x + r * 0.4} ${y - r * 0.42}V${y - r * 0.3}Q${x} ${y - r * 0.48} ${x - r * 0.4} ${y - r * 0.3}Z" fill="#f1e8d2" stroke="#2b1309" stroke-width="1.6"/><path d="M${x - r * 0.1} ${y - r * 0.52}v${r * 0.16}M${x + r * 0.16} ${y - r * 0.5}v${r * 0.16}" stroke="#2b1309" stroke-width="1.2"/></g>`;
}
function tub(x, y, back) {
  if (back) return `<ellipse cx="${x}" cy="${y - 54}" rx="78" ry="16" fill="#9e6a3c" stroke="#7a4f2a" stroke-width="2.4"/><ellipse cx="${x}" cy="${y - 52}" rx="70" ry="12" fill="#9fd6e8"/>`;
  return `<g><path d="M${x - 78} ${y - 54}L${x - 66} ${y}H${x + 66}L${x + 78} ${y - 54}Q${x} ${y - 30} ${x - 78} ${y - 54}Z" fill="#c8915f" stroke="#7a4f2a" stroke-width="2.6" stroke-linejoin="round"/>
<path d="M${x - 40} ${y - 44}V${y}M${x} ${y - 40}V${y}M${x + 40} ${y - 44}V${y}" stroke="#a87545" stroke-width="2"/><path d="M${x - 74} ${y - 30}Q${x} ${y - 12} ${x + 74} ${y - 30}" fill="none" stroke="#6b6b6b" stroke-width="3.5"/>
${tangerine(x - 46, y - 44, 9)}${tangerine(x + 36, y - 42, 8)}${tangerine(x + 58, y - 48, 7)}
<path class="steam" d="M${x - 30} ${y - 70}q-6 -9 0 -16t0 -16M${x + 10} ${y - 74}q-6 -9 0 -16t0 -16M${x + 46} ${y - 70}q-6 -9 0 -16t0 -16" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".8"/></g>`;
}
function towel(x, y) {
  return `<g><rect x="${x - 26}" y="${y - 30}" width="52" height="30" rx="5" fill="#f6c6cf" stroke="#d792a0" stroke-width="2"/><path d="M${x - 26} ${y - 20}h52M${x - 26} ${y - 12}h52" stroke="#fff" stroke-width="3"/></g>`;
}
function cake(x, y, label) {
  return `<g><ellipse cx="${x}" cy="${y}" rx="52" ry="9" fill="#fff" stroke="#d3c7b8" stroke-width="2"/>
<rect x="${x - 42}" y="${y - 38}" width="84" height="38" rx="6" fill="#f7cfc6" stroke="#cf8f86" stroke-width="2.2"/><path d="M${x - 42} ${y - 30}q7 10 14 0t14 0t14 0t14 0t14 0t14 0" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
<rect x="${x - 28}" y="${y - 64}" width="56" height="28" rx="6" fill="#fdeee2" stroke="#d9b49a" stroke-width="2.2"/><circle cx="${x - 16}" cy="${y - 66}" r="4.5" fill="#d9434b"/><circle cx="${x + 16}" cy="${y - 66}" r="4.5" fill="#d9434b"/>
<rect x="${x - 3}" y="${y - 90}" width="6" height="26" rx="2" fill="#9fd0f0" stroke="#6aa6cf" stroke-width="1.4"/><path class="flame" d="M${x} ${y - 104}q6 7 0 12q-6 -5 0 -12z" fill="#ffc94d" stroke="#f08a24" stroke-width="1.2"/>
${label ? `<text x="${x}" y="${y - 12}" text-anchor="middle" font-family="${FONT}" font-size="16" fill="#b5545a">${label}</text>` : ''}</g>`;
}
function banner(text, y = 286, color = '#f29aa0') {
  const flags = Array.from({ length: 9 }, (_, i) => {
    const x = 30 + i * 42, yy = y + Math.sin(i / 8 * Math.PI) * 14;
    return `<path d="M${x - 14} ${yy}H${x + 14}L${x} ${yy + 24}Z" fill="${['#f29aa0', '#ffd36b', '#9fe0c8', '#a9c4f2'][i % 4]}" stroke="#d1a08c" stroke-width="1.4"/>`;
  }).join('');
  return `<g><path d="M10 ${y}Q200 ${y + 30} 390 ${y}" fill="none" stroke="#a08070" stroke-width="1.6"/>${flags}<rect x="96" y="${y + 34}" width="208" height="38" rx="19" fill="${color}" stroke="#c96f78" stroke-width="2"/><text x="200" y="${y + 60}" text-anchor="middle" font-family="${FONT}" font-size="20" fill="#fff">${text}</text></g>`;
}
function confetti(n = 26, seed = 3) {
  let r = seed;
  const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  return Array.from({ length: n }, () => `<rect x="${20 + rnd() * 360}" y="${280 + rnd() * 270}" width="6" height="3" rx="1" fill="${['#f29aa0', '#ffd36b', '#9fe0c8', '#a9c4f2', '#c7a4f0'][Math.floor(rnd() * 5)]}" transform="rotate(${rnd() * 180} ${20 + rnd() * 360} ${280 + rnd() * 270})"/>`).join('');
}
function tree(x, y) {
  const balls = [[-20, -60, '#e5484d'], [16, -74, '#ffd36b'], [-8, -102, '#7fb6e6'], [24, -40, '#c7a4f0'], [-28, -30, '#ffd36b'], [6, -130, '#e5484d']]
    .map(([a, b, c]) => `<circle cx="${x + a}" cy="${y + b}" r="5.5" fill="${c}" stroke="#fff" stroke-width="1.4"/>`).join('');
  return `<g><rect x="${x - 14}" y="${y - 14}" width="28" height="16" rx="3" fill="#c0504d"/><path d="M${x} ${y - 160}L${x + 30} ${y - 104}H${x + 18}L${x + 44} ${y - 58}H${x + 30}L${x + 56} ${y - 14}H${x - 56}L${x - 30} ${y - 58}H${x - 44}L${x - 18} ${y - 104}H${x - 30}Z" fill="#4f9a5f" stroke="#2f6e3f" stroke-width="2.4" stroke-linejoin="round"/>${balls}<path d="M${x} ${y - 176}l4.5 9.5 10.5 1-8 7 2.4 10.5-9.4-5.5-9.4 5.5 2.4-10.5-8-7 10.5-1z" fill="#ffd36b" stroke="#d9a63d" stroke-width="1.6" class="twinkle"/></g>`;
}
function bouquet(x, y, tag) {
  const tulip = (dx, h, c) => `<path d="M${x + dx * 0.3} ${y - 30}Q${x + dx * 0.6} ${y - h * 0.6} ${x + dx} ${y - h}" fill="none" stroke="#4f8c3c" stroke-width="2.6"/><path d="M${x + dx - 9} ${y - h - 4}q1 -15 9 -16q8 1 9 16q-9 7 -18 0z" fill="${c}" stroke="#b04a5a" stroke-width="1.6"/>`;
  return `<g>${tulip(-24, 92, '#f28aa0')}${tulip(0, 106, '#ffd36b')}${tulip(22, 90, '#f28aa0')}${tulip(-10, 78, '#ef6f78')}${tulip(12, 80, '#ffb0c0')}<path d="M${x - 26} ${y - 36}L${x + 26} ${y - 36}L${x + 16} ${y}H${x - 16}Z" fill="#a9cbe0" stroke="#6e9bb9" stroke-width="2.2" stroke-linejoin="round"/>${tag ? `<g transform="rotate(-8 ${x + 30} ${y - 18})"><rect x="${x + 10}" y="${y - 28}" width="44" height="20" rx="3" fill="#fffdf6" stroke="#d8cbb9" stroke-width="1.6"/><text x="${x + 32}" y="${y - 13}" text-anchor="middle" font-family="${FONT}" font-size="12" fill="#c64a5a">${tag}</text></g>` : ''}</g>`;
}
function heartShape(x, y, s = 1, c = '#ef6f78', cls = '') {
  return `<path class="${cls}" transform="translate(${x} ${y}) scale(${s})" d="M0 8c-10-7-16-12-16-18 0-5 4-9 8.5-9 3.5 0 6 2 7.5 4.5 1.5-2.5 4-4.5 7.5-4.5 4.5 0 8.5 4 8.5 9 0 6-6 11-16 18z" fill="${c}" stroke="#c94a58" stroke-width="1.4"/>`;
}
function balloon(x, y, tx, ty) {
  return `<g><path d="M${x} ${y + 12}Q${(x + tx) / 2 + 14} ${(y + ty) / 2} ${tx} ${ty}" fill="none" stroke="#b9a9a0" stroke-width="1.6"/><g class="bob">${heartShape(x, y, 2.2, '#ef5f6f')}</g></g>`;
}
function zzz(x, y) {
  return `<g font-family="${FONT}" fill="#6f7fb0"><text x="${x}" y="${y}" font-size="16" class="zzz">z</text><text x="${x + 10}" y="${y - 14}" font-size="21" class="zzz" style="animation-delay:.8s">z</text><text x="${x + 24}" y="${y - 32}" font-size="26" class="zzz" style="animation-delay:1.6s">Z</text></g>`;
}
function notes(x, y) {
  return `<g font-family="'Segoe UI Symbol','Apple Symbols',sans-serif" fill="#8a6fc4"><text x="${x}" y="${y}" font-size="22" class="float">♪</text><text x="${x + 40}" y="${y - 20}" font-size="26" class="float" style="animation-delay:.6s">♫</text><text x="${x + 90}" y="${y + 6}" font-size="20" class="float" style="animation-delay:1.2s">♪</text></g>`;
}
function pigeon(x, y) {
  return `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="-10" rx="13" ry="9" fill="#9aa3b0" stroke="#6b7480" stroke-width="1.6"/><circle cx="-10" cy="-19" r="6.5" fill="#9aa3b0" stroke="#6b7480" stroke-width="1.6"/><circle cx="-12" cy="-20" r="1.4" fill="#222"/><path d="M-16.5 -19l-4 1.6 4 1.2z" fill="#d9a65a"/><path d="M-4 -14q6 3 10 0" fill="none" stroke="#7fa08f" stroke-width="2"/><path d="M12 -10l7 -3-2 6z" fill="#7d8692"/></g>`;
}
/* крепость из подушек: задняя тёмная ниша, затем стены и крыша-одеяло (front) */
function pillowFort(uid, front) {
  if (!front) return `<path d="M130 520V424Q130 404 150 402H250Q270 404 270 424V520Z" fill="#5a4a5e" opacity=".5"/>`;
  return `<g>${pillowV(116, 466, 54, 112, '#fbfaf6')}${pillowV(284, 466, 54, 112, '#f3efe8')}
<path d="M78 418Q200 360 322 418L310 442Q200 392 90 442Z" fill="url(#duvet-${uid})" stroke="#c9c6bd" stroke-width="2.4" stroke-linejoin="round"/></g>`;
}
function pillowV(cx, cy, w, h, c) {
  return `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="${w * 0.42}" fill="${c}" stroke="#d6cfc2" stroke-width="2.5"/><rect x="${cx - w / 2 + 7}" y="${cy - h / 2 + 7}" width="${w - 14}" height="${h - 14}" rx="${w * 0.3}" fill="none" stroke="#e4ddd0" stroke-width="1.6" stroke-dasharray="4 4"/>`;
}

window.ART = {
  C, FONT, defs, room, overlay, pillow, pillowV,
  capy, manya, penguin,
  tangerine, fish, clover, cookie, watermelon, laptopBack, popcorn, cup, teapot, plate, book, boxBack, boxFront, sign, note, flag,
  ivStand, meatball, tub, towel, cake, banner, confetti, tree, bouquet, heartShape, balloon, zzz, notes, pigeon, pillowFort,
};
})();
