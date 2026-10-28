/* Шкет и Маня — логика. Пока Веты нет, герои «чем-то заняты»: при каждом возвращении выпадает новая сцена.
   Всё хранится на телефоне (localStorage), сервера нет. */
(function () {
'use strict';
const A = window.ART, S = window.SCENES_API, CFG = S.CONFIG;
const $ = id => document.getElementById(id);
const KEY = 'shket-manya:v1';
const AWAY_MS = 2 * 60 * 1000;           // вернулась позже, чем через 2 минуты, — новая сцена
const HUNGRY_MS = 10 * 3600 * 1000;

/* отладка: ?scene=box&variant=resolved&tod=night&date=2026-11-19&away=40&all=1&reset=1 */
const q = new URLSearchParams(location.search);
if (q.has('reset')) try { localStorage.removeItem(KEY); } catch (e) { /* нет хранилища */ }

/* ---------- состояние ---------- */
function load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* приватный режим */ } }
const state = Object.assign({ first: Date.now(), last: 0, visits: 0, seen: {}, cur: null, fed: {}, fresh: [], specialDay: '', install: false }, load() || {});

function now() {
  if (q.get('date')) {
    const d = new Date(`${q.get('date')}T${q.get('time') || '12:00'}`);
    if (!isNaN(d)) return d;
  }
  return new Date();
}
function todOf(d) {
  if (q.get('tod')) return q.get('tod');
  const h = d.getHours();
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 11 && h < 17) return 'day';
  if (h >= 17 && h < 22) return 'evening';
  return 'night';
}
const dayKey = d => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
let uidN = 0;
const uid = () => 'u' + (++uidN);

function fmtAway(ms) {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} ${S.plural(m, ['минуту', 'минуты', 'минут'])}`;
  const h = Math.round(ms / 3600000);
  if (h < 24) return `${h} ${S.plural(h, ['час', 'часа', 'часов'])}`;
  const d = Math.round(ms / 86400000);
  return `${d} ${S.plural(d, ['день', 'дня', 'дней'])}`;
}
function fill(line, ctx) {
  return line.replace('{nick}', ctx.nick).replace('{Nick}', S.cap(ctx.nick));
}

/* ---------- отрисовка сцены ---------- */
function svgFor(scene, ctx, label) {
  const opt = scene.roomOpt ? scene.roomOpt(ctx) : {};
  return `<svg viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${label || scene.title}">`
    + A.defs(ctx.uid, ctx.tod) + A.room(ctx.uid, ctx.tod, opt) + scene.draw(ctx) + A.overlay(ctx.uid, ctx.tod)
    + (scene.glow ? scene.glow(ctx) : '') + '</svg>';
}
const stage = $('stage');
const TOD_BG = { morning: '#f4e3d6', day: '#efe2d9', evening: '#e9cfc0', night: '#23243f' };

function ctxNow(extra) {
  const d = now();
  return S.makeCtx(Object.assign({ uid: uid(), tod: todOf(d), now: d, seed: state.cur ? state.cur.seed : Math.random() }, extra));
}
function show(fade) {
  const sc = S.byId[state.cur.id] || S.byId.cuddle;
  const ctx = ctxNow({ variant: state.cur.variant, away: state.cur.away });
  document.body.dataset.tod = ctx.tod;
  document.querySelector('meta[name="theme-color"]').setAttribute('content', TOD_BG[ctx.tod]);
  stage.innerHTML = svgFor(sc, ctx);
  if (fade) { stage.classList.remove('fade'); void stage.offsetWidth; stage.classList.add('fade'); }
  $('away').textContent = state.cur.label;
  $('story').textContent = state.cur.variant && sc.resolved ? sc.resolved.text(ctx) : sc.text(ctx);
  $('newcard').hidden = !state.cur.isNew;
  const note = sc.note ? sc.note(ctx) : '';
  $('note').hidden = !note;
  if (note) { $('noteText').textContent = note; $('noteSign').textContent = `— ${CFG.from}`; }
  const days = S.daysTogether(now());
  $('together').textContent = `вместе ${days} ${S.plural(days, ['день', 'дня', 'дней'])}`;
  updateBadge();
}

/* ---------- какая сцена выпадет ---------- */
function pickScene(ctx) {
  if (ctx.first) return 'hello';
  const today = dayKey(ctx.now);
  const specials = S.SCENES.filter(s => s.rarity === 'special' && s.when(ctx));
  if (specials.length && state.specialDay !== today) { state.specialDay = today; return specials[0].id; }
  const pool = S.SCENES.filter(s => s.rarity !== 'special' && s.id !== 'hello' && s.when(ctx) && !(state.cur && s.id === state.cur.id));
  if (!pool.length) return 'cuddle';
  const w = pool.map(s => {
    let x = s.rarity === 'rare' ? 2 : 10;
    if (!state.seen[s.id]) x *= 2.2;
    if (s.boost && s.boost(ctx)) x *= 4;
    return x;
  });
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) return pool[i].id; }
  return pool[pool.length - 1].id;
}

function arrive() {
  const t = Date.now();
  const away = q.has('away') ? Number(q.get('away')) * 3600e3 : (state.last ? t - state.last : 0);
  const forced = q.get('scene');
  if (forced && S.byId[forced]) {
    state.cur = { id: forced, at: t, label: `Пока тебя не было · ${fmtAway(Math.max(away, 3 * 3600e3))}`, variant: q.get('variant') || '', isNew: false, seed: Math.random(), away };
    show(true);
    return;
  }
  if (!state.cur || away > AWAY_MS) {
    const first = !state.cur;
    const ctx = ctxNow({ away, first });
    const id = pickScene(ctx);
    const isNew = !state.seen[id];
    if (isNew) { state.seen[id] = t; state.fresh.push(id); }
    state.visits++;
    state.cur = { id, at: t, label: first ? 'Знакомство' : `Пока тебя не было · ${fmtAway(away)}`, variant: '', isNew, seed: Math.random(), away };
    state.last = t;
    save();
    show(true);
  } else {
    state.last = t;
    save();
    show(false);
  }
}

/* ---------- реплики, сердечки ---------- */
const fx = $('fx');
const bubbles = {};
function say(el, id, text) {
  const r = el.getBoundingClientRect();
  if (bubbles[id]) bubbles[id].remove();
  const b = document.createElement('div');
  b.className = 'bubble';
  b.textContent = text;
  const W = window.innerWidth;
  b.style.left = Math.min(Math.max(r.left + r.width / 2, 120), W - 120) + 'px';
  b.style.top = Math.max(r.top + 4, 70) + 'px';
  fx.appendChild(b);
  bubbles[id] = b;
  setTimeout(() => { b.classList.add('out'); setTimeout(() => { b.remove(); if (bubbles[id] === b) delete bubbles[id]; }, 320); }, 2800);
}
const HEART = '<svg viewBox="-17 -20 34 30"><path d="M0 8c-10-7-16-12-16-18 0-5 4-9 8.5-9 3.5 0 6 2 7.5 4.5 1.5-2.5 4-4.5 7.5-4.5 4.5 0 8.5 4 8.5 9 0 6-6 11-16 18z" fill="#ef6f78" stroke="#c94a58" stroke-width="1.4"/></svg>';
function heartAt(x, y) {
  const h = document.createElement('div');
  h.className = 'heart';
  h.innerHTML = HEART;
  h.style.left = x + 'px';
  h.style.top = y + 'px';
  fx.appendChild(h);
  setTimeout(() => h.remove(), 1150);
}
function burst(el, n = 5) {
  const r = el.getBoundingClientRect();
  for (let i = 0; i < n; i++) setTimeout(() => heartAt(r.left + r.width * (0.25 + Math.random() * 0.5), r.top + r.height * (0.2 + Math.random() * 0.3)), i * 110);
}
function react(el, cls) {
  const g = el.querySelector('.react');
  if (!g) return;
  g.classList.remove('squish', 'chomp');
  void g.getBoundingClientRect();
  g.classList.add(cls);
}
function talk(el, id) {
  const ctx = ctxNow({});
  const hungry = !state.fed[id] || Date.now() - state.fed[id] > HUNGRY_MS;
  const pool = hungry && Math.random() < 0.4 ? S.HUNGRY[id] : S.TALK[id];
  react(el, 'squish');
  say(el, id, fill(S.pick(pool), ctx));
}

/* ---------- гладить и тапать ---------- */
let pet = null;
let picked = null;          // выбранная в кормушке еда (режим «тапни, кого кормим»)
stage.addEventListener('pointerdown', e => {
  const el = e.target.closest('[data-char]');
  if (!el) return;
  pet = { el, id: el.dataset.char, x: e.clientX, y: e.clientY, dist: 0, lastHeart: 0, done: false };
  try { stage.setPointerCapture(e.pointerId); } catch (err) { /* не критично */ }
});
stage.addEventListener('pointermove', e => {
  if (!pet) return;
  pet.dist += Math.hypot(e.clientX - pet.x, e.clientY - pet.y);
  pet.x = e.clientX; pet.y = e.clientY;
  if (pet.dist - pet.lastHeart > 34) { heartAt(e.clientX, e.clientY - 10); pet.lastHeart = pet.dist; }
  if (!pet.done && pet.dist > 260) {
    pet.done = true;
    react(pet.el, 'squish');
    say(pet.el, pet.id, S.pick(S.PET[pet.id]));
    burst(pet.el, 4);
  }
});
function endPet() {
  if (!pet) return;
  if (pet.dist < 10) {
    if (picked) feed(pet.el, pet.id, picked);
    else talk(pet.el, pet.id);
  }
  pet = null;
}
stage.addEventListener('pointerup', endPet);
stage.addEventListener('pointercancel', () => { pet = null; });

/* ---------- кормушка ---------- */
const tray = $('tray'), foods = $('foods');
foods.innerHTML = S.FOODS.map(f => `<button class="food" type="button" data-food="${f.id}"><svg viewBox="-24 -24 48 48" aria-hidden="true">${f.icon()}</svg>${f.name}</button>`).join('');
const DEFAULT_HINT = 'Перетащи вкусняшку на Шкета, Маню или Пингвина';
function setPicked(id) {
  picked = id;
  foods.querySelectorAll('.food').forEach(b => b.classList.toggle('picked', b.dataset.food === id));
  $('trayHint').textContent = id ? 'Теперь тапни того, кого угощаем' : DEFAULT_HINT;
}
$('btnFeed').addEventListener('click', () => { tray.hidden = false; setPicked(null); });
$('trayClose').addEventListener('click', () => { tray.hidden = true; setPicked(null); });

let drag = null;
foods.addEventListener('pointerdown', e => {
  const b = e.target.closest('.food');
  if (!b) return;
  drag = { id: b.dataset.food, x0: e.clientX, y0: e.clientY, ghost: null };
  try { b.setPointerCapture(e.pointerId); } catch (err) { /* не критично */ }
});
foods.addEventListener('pointermove', e => {
  if (!drag) return;
  if (!drag.ghost && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 8) {
    const f = S.FOODS.find(x => x.id === drag.id);
    drag.ghost = document.createElement('div');
    drag.ghost.className = 'drag-ghost';
    drag.ghost.innerHTML = `<svg viewBox="-24 -24 48 48">${f.icon()}</svg>`;
    document.body.appendChild(drag.ghost);
  }
  if (drag.ghost) drag.ghost.style.transform = `translate(${e.clientX - 28}px, ${e.clientY - 40}px)`;
});
foods.addEventListener('pointerup', e => {
  if (!drag) return;
  const d = drag;
  drag = null;
  if (d.ghost) {
    d.ghost.remove();
    const hit = document.elementFromPoint(e.clientX, e.clientY);
    const el = hit && hit.closest('[data-char]');
    if (el) feed(el, el.dataset.char, d.id);
  } else {
    setPicked(picked === d.id ? null : d.id);
  }
});
foods.addEventListener('pointercancel', () => { if (drag && drag.ghost) drag.ghost.remove(); drag = null; });

function feed(el, id, food) {
  const ctx = ctxNow({});
  const like = S.LIKES[id][food];
  react(el, like > 0 ? 'chomp' : 'squish');
  say(el, id, fill(S.pick(S.FEED[id][like]), ctx));
  if (like > 0) {
    state.fed[id] = Date.now();
    burst(el, like === 2 ? 5 : 2);
    const sc = S.byId[state.cur.id];
    if (sc.resolved && !state.cur.variant && sc.resolved.char === id) {
      state.cur.variant = 'resolved';
      setTimeout(() => show(true), 900);
    }
    save();
  }
  setPicked(null);
}

/* ---------- альбом ---------- */
const album = $('album'), albumBody = $('albumBody');
const RAR = { common: '', rare: '<span class="rar rare">редкая</span>', special: '<span class="rar special">особая</span>' };
function seenMap() {
  if (q.has('all')) return Object.fromEntries(S.SCENES.map(s => [s.id, state.first]));
  return state.seen;
}
function updateBadge() {
  const n = state.fresh.length;
  $('albumBadge').hidden = !n;
  $('albumBadge').textContent = n;
}
function thumbCtx(scene, ts) {
  const d = new Date(ts);
  return S.makeCtx({ uid: uid(), tod: todOf(d), now: scene.rarity === 'special' ? d : now(), seed: 0.3, away: 40 * 3600e3 });
}
function renderGrid() {
  const seen = seenMap();
  const total = S.SCENES.length, got = S.SCENES.filter(s => seen[s.id]).length;
  $('albumTitle').textContent = 'Альбом';
  $('albumCount').textContent = `Собрано ${got} из ${total}`;
  $('albumClose').textContent = 'Закрыть';
  albumBody.innerHTML = `<div class="grid">${S.SCENES.map(s => {
    if (!seen[s.id]) {
      return `<div class="card locked"><div class="thumb">?</div><h3>Пока секрет</h3><p>${RAR[s.rarity]} ${s.hint || 'выпадет само'}</p></div>`;
    }
    const d = new Date(seen[s.id]);
    return `<button class="card" type="button" data-scene="${s.id}"><div class="thumb">${svgFor(s, thumbCtx(s, seen[s.id]))}</div><h3>${s.title}</h3><p>${RAR[s.rarity]} ${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</p></button>`;
  }).join('')}</div>`;
  album.scrollTop = 0;
}
function renderDetail(id) {
  const s = S.byId[id], seen = seenMap();
  const ctx = thumbCtx(s, seen[id]);
  $('albumTitle').textContent = s.title;
  $('albumCount').textContent = new Date(seen[id]).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  $('albumClose').textContent = 'Назад';
  albumBody.innerHTML = `<div class="detail"><div class="thumb">${svgFor(s, ctx)}</div><p class="story">${s.text(ctx)}</p></div>`;
  album.scrollTop = 0;
}
let detailOpen = false;
$('btnAlbum').addEventListener('click', () => {
  state.fresh = [];
  save();
  updateBadge();
  detailOpen = false;
  renderGrid();
  album.hidden = false;
});
albumBody.addEventListener('click', e => {
  const c = e.target.closest('[data-scene]');
  if (!c) return;
  detailOpen = true;
  renderDetail(c.dataset.scene);
});
$('albumClose').addEventListener('click', () => {
  if (detailOpen) { detailOpen = false; renderGrid(); return; }
  album.hidden = true;
});

/* ---------- подсказка для iPhone ---------- */
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
if (isIOS && !standalone && !state.install) $('install').hidden = false;
$('installOk').addEventListener('click', () => { $('install').hidden = true; state.install = true; save(); });

/* ---------- приход и уход ---------- */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { state.last = Date.now(); save(); } else arrive();
});
window.addEventListener('pagehide', () => { state.last = Date.now(); save(); });
window.addEventListener('pageshow', e => { if (e.persisted) arrive(); });
setInterval(() => {
  if (document.hidden) return;
  state.last = Date.now();
  save();
  if (document.body.dataset.tod !== todOf(now()) && album.hidden) show(false);
}, 15000);

arrive();

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* без офлайна тоже работает */ });
}
})();
