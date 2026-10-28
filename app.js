/* Шкет и Маня — логика. Пока Веты нет, герои «чем-то заняты»: при каждом возвращении в спальне выпадает новая сцена.
   Рисует 3D-мир (world.js), здесь — комнаты и переходы, реплики, кормёжка, гардероб, прятки, сон, готовка, альбом.
   Всё хранится на телефоне (localStorage), сервера нет. */
(function () {
'use strict';
const S = window.SCENES_API, CFG = S.CONFIG, WD = window.WORLD;
const $ = id => document.getElementById(id);
const KEY = 'shket-manya:v1';
const AWAY_MS = 2 * 60 * 1000;           // вернулась позже, чем через 2 минуты, — новая сцена
const HUNGRY_MS = 10 * 3600 * 1000;

/* отладка: ?scene=box&variant=resolved&tod=night&date=2026-11-19&away=40&all=1&reset=1&room=kitchen */
const q = new URLSearchParams(location.search);
if (q.has('reset')) try { localStorage.removeItem(KEY); } catch (e) { /* нет хранилища */ }

/* ---------- состояние ---------- */
function load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* приватный режим */ } }
const state = Object.assign({
  first: Date.now(), last: 0, visits: 0, seen: {}, cur: null, fed: {}, fresh: [], specialDay: '', install: false,
  outfit: {}, hideBest: 0, cooked: {}, plants: [0, 0, 0], plantDay: '', unlocked: [], boxDay: '', clean: {}, photos: 0,
}, load() || {});

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
function fmtAway(ms) {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} ${S.plural(m, ['минуту', 'минуты', 'минут'])}`;
  const h = Math.round(ms / 3600000);
  if (h < 24) return `${h} ${S.plural(h, ['час', 'часа', 'часов'])}`;
  const d = Math.round(ms / 86400000);
  return `${d} ${S.plural(d, ['день', 'дня', 'дней'])}`;
}
/* прозвище выбирается заново на каждую реплику, чтобы не залипало одно на весь заход */
let lastNick = '';
function fill(line) {
  let n;
  do { n = S.pick(CFG.nicks); } while (n === lastNick && CFG.nicks.length > 1);
  lastNick = n;
  return line.replace(/\{nick\}/g, n).replace(/\{Nick\}/g, S.cap(n));
}
const TOD_BG = { morning: '#f4e3d6', day: '#efe2d9', evening: '#e9cfc0', night: '#23243f' };
function setChrome(tod) {
  document.body.dataset.tod = tod;
  document.querySelector('meta[name="theme-color"]').setAttribute('content', TOD_BG[tod]);
}

/* ---------- запуск 3D ---------- */
const stage = $('stage');
try {
  if (!window.THREE) throw new Error('no three');
  WD.init(stage);
} catch (e) {
  stage.innerHTML = '<p class="nogl">Чтобы Шкет, Маня и Пингвин появились, нужен браузер с 3D (WebGL). Открой страницу в Safari или Chrome.</p>';
  return;
}
WD.setOutfit(state.outfit);

/* ---------- режимы: сцена дня (спальня), просто комната, прятки, сон, готовка ---------- */
let room = 'bedroom', mode = 'scene', game = null, cook = null, bath = null, popped = 0;
function ctxNow(extra) {
  const d = now();
  return S.makeCtx(Object.assign({ tod: todOf(d), now: d, seed: state.cur ? state.cur.seed : Math.random(), visits: state.visits }, extra));
}
function setCaption(label, story, opts = {}) {
  $('away').textContent = label;
  $('story').textContent = story;
  $('newcard').hidden = !opts.isNew;
  $('note').hidden = !opts.note;
  if (opts.note) { $('noteText').textContent = opts.note; $('noteSign').textContent = `— ${opts.sign}`; }
  const gb = $('gameBtns');
  gb.hidden = !opts.buttons;
  if (opts.buttons) gb.innerHTML = opts.buttons.map(([id, t]) => `<button class="mini" type="button" data-act="${id}">${t}</button>`).join('');
}
function closeTray() { tray.hidden = true; trayKind = null; setPicked(null); }
function show(fade) {
  room = 'bedroom'; mode = 'scene'; game = null; cook = null;
  closeTray();
  const sc = S.byId[state.cur.id] || S.byId.cuddle;
  const ctx = ctxNow({ variant: state.cur.variant, away: state.cur.away });
  setChrome(ctx.tod);
  WD.stage(sc.setup, ctx, 'bedroom');
  if (fade) { stage.classList.remove('fade'); void stage.offsetWidth; stage.classList.add('fade'); }
  const note = sc.note ? sc.note(ctx) : '';
  setCaption(state.cur.label, state.cur.variant && sc.resolved ? sc.resolved.text(ctx) : sc.text(ctx), { isNew: state.cur.isNew, note, sign: ctx.sign });
  const days = S.daysTogether(now());
  $('together').textContent = `вместе ${days} ${S.plural(days, ['день', 'дня', 'дней'])}`;
  renderBar();
  updateBadge();
}
/* перерисовать после переодевания: в спальне — сцену целиком, на кухне — только позы (чтобы не пропала миска) */
function restage() {
  if (mode === 'hide') WD.stage(S.hideSetup(game.spot), ctxNow({}), 'bedroom');
  else if (mode === 'sleep') WD.stage(S.sleepSetup, ctxNow({}), 'bedroom');
  else if (mode === 'morning') WD.stage(S.morningSetup, ctxNow({ fixed: morning }), 'bedroom');
  else if (mode === 'scene') { const sc = S.byId[state.cur.id] || S.byId.cuddle; WD.stage(sc.setup, ctxNow({ variant: state.cur.variant, away: state.cur.away }), 'bedroom'); }
  else if (room === 'kitchen') (cook && cook.look ? S.KITCHEN_LOOK[cook.look] : S.LAYOUT.kitchen)(WD);
  else if (mode === 'bath' && bath && bath.id) S.bathSetup(bath.id)(WD);
  else S.LAYOUT[room](WD);
}

/* ---------- комнаты: план квартиры, переход со шторкой, трое заходят по очереди ---------- */
const curtain = $('curtain');
function enterRoom(id) {
  const r = S.ROOMS.find(x => x.id === id);
  if (!r || !r.ready) return;
  closeTray();
  $('rooms').hidden = true;
  $('curtainName').textContent = r.name;
  curtain.classList.add('on');
  setTimeout(() => {
    room = id; mode = 'idle'; game = null; cook = null; bath = null;
    const ctx = ctxNow({});
    setChrome(ctx.tod);
    WD.stage(S.LAYOUT[id], ctx, id);
    if (id === 'balcony') WD.room.plants(state.plants);
    setCaption(r.name, r.text);
    renderBar();
    WD.walkIn(() => {
      say(S.pick(['manya', 'shket']), fill(S.pick(S.ENTER[id])));
      setTimeout(() => say('peng', fill(S.pick(S.ENTER.peng))), 900);
    });
    curtain.classList.remove('on');
  }, 450);
}
const ROOM_ICON = {
  bedroom: '<rect x="-17" y="-2" width="34" height="12" rx="3" fill="#f3b9b1"/><rect x="-17" y="-12" width="10" height="10" rx="3" fill="#fbf6ee" stroke="#d6cfc2" stroke-width="1.5"/><path d="M-19 14V-14M19 14V2" stroke="#a87f5c" stroke-width="3" stroke-linecap="round"/>',
  kitchen: '<path d="M-14 -2H14V2A14 12 0 0 1 -14 2Z" fill="#a9cbe0" stroke="#6e9bb9" stroke-width="2"/><path d="M14 -1H22" stroke="#6e9bb9" stroke-width="3" stroke-linecap="round"/><path d="M-6 -8q-3 -4 0 -8M2 -8q-3 -4 0 -8" stroke="#c9b8a6" stroke-width="2" fill="none" stroke-linecap="round"/>',
  bath: '<path d="M-18 -2H18V4A10 10 0 0 1 8 14H-8A10 10 0 0 1 -18 4Z" fill="#9fd6e8" stroke="#6aa6cf" stroke-width="2"/><circle cx="-6" cy="-7" r="3.5" fill="#fff" stroke="#9fd6e8"/><circle cx="2" cy="-10" r="2.5" fill="#fff" stroke="#9fd6e8"/>',
  balcony: '<path d="M-18 14V-2H18V14" fill="none" stroke="#a87f5c" stroke-width="2.5"/><path d="M-12 -2V14M-6 -2V14M0 -2V14M6 -2V14M12 -2V14" stroke="#a87f5c" stroke-width="1.8"/><circle cx="6" cy="-10" r="5" fill="#ffd36b"/>',
  hall: '<rect x="-10" y="-16" width="20" height="30" rx="2" fill="#d9b48f" stroke="#a87f5c" stroke-width="2"/><circle cx="5" cy="0" r="1.8" fill="#6b4524"/>',
  pantry: '<rect x="-16" y="-6" width="32" height="20" rx="2" fill="#d8a46a" stroke="#a6743f" stroke-width="2"/><path d="M-16 -6L-10 -14H10L16 -6" fill="#c99358" stroke="#a6743f" stroke-width="2"/><path d="M0 -6V14" stroke="#e8c495" stroke-width="4"/>',
};
function renderRooms() {
  $('roomGrid').innerHTML = S.ROOMS.map(r => `<button class="room-card${r.id === room ? ' here' : ''}${r.ready ? '' : ' soon'}" type="button" data-room="${r.id}" ${r.ready ? '' : 'disabled'}>
    <svg viewBox="-24 -24 48 48" aria-hidden="true">${ROOM_ICON[r.id]}</svg><b>${r.name}</b><span>${r.id === room ? 'вы здесь' : r.ready ? 'зайти' : 'скоро'}</span></button>`).join('');
}
$('btnRooms').addEventListener('click', () => { renderRooms(); $('rooms').hidden = false; });
$('roomsClose').addEventListener('click', () => { $('rooms').hidden = true; });
$('roomGrid').addEventListener('click', e => {
  const b = e.target.closest('[data-room]');
  if (!b) return;
  if (b.dataset.room === room) { $('rooms').hidden = true; return; }
  enterRoom(b.dataset.room);
});

/* ---------- кнопки внизу: у каждой комнаты свои ---------- */
const TOOLS = {
  feed: { label: 'Покормить', icon: '<circle cx="0" cy="3" r="14" fill="#f7a23b" stroke="#c9741c" stroke-width="2"/><ellipse cx="5" cy="-12" rx="7" ry="3.2" fill="#6fae4f" transform="rotate(-25 5 -12)"/>' },
  wear: { label: 'Нарядить', icon: '<path d="M-12 16L0 -16L12 16Z" fill="#f4a1b5" stroke="#a35d6e" stroke-width="2" stroke-linejoin="round"/><g fill="#fff"><circle cx="-3" cy="6" r="2"/><circle cx="4" cy="-2" r="2"/></g><circle cx="0" cy="-17" r="4.5" fill="#ffd36b"/>' },
  hide: { label: 'Прятки', alt: 'Выйти', icon: '<circle cx="-4" cy="-4" r="11" fill="none" stroke="#7a5a8c" stroke-width="3.2"/><path d="M4 4L14 14" stroke="#7a5a8c" stroke-width="4" stroke-linecap="round"/>' },
  sleep: { label: 'Спать', alt: 'Разбудить', icon: '<path d="M6 -16A14 14 0 1 0 14 8A11 11 0 0 1 6 -16Z" fill="#ffd36b" stroke="#c9a03d" stroke-width="2" stroke-linejoin="round"/>' },
  cook: { label: 'Готовить', alt: 'Хватит', icon: '<path d="M-16 -2H12V4A10 10 0 0 1 2 14H-6A10 10 0 0 1 -16 4Z" fill="#e5484d" stroke="#a6343a" stroke-width="2"/><path d="M12 0H20" stroke="#6b4524" stroke-width="4" stroke-linecap="round"/><path d="M-8 -8q-3 -4 0 -8M0 -8q-3 -4 0 -8" stroke="#c9b8a6" stroke-width="2" fill="none" stroke-linecap="round"/>' },
};
Object.assign(TOOLS, {
  bathe: { label: 'Купать', alt: 'Хватит', icon: '<rect x="-9" y="-4" width="18" height="12" rx="4" fill="#ffd36b" stroke="#c9a03d" stroke-width="2"/><g fill="#fff" stroke="#9fd6e8" stroke-width="1.6"><circle cx="-8" cy="-10" r="5"/><circle cx="3" cy="-13" r="4"/><circle cx="11" cy="-7" r="3.5"/></g>' },
  duck: { label: 'Уточка', icon: '<ellipse cx="-2" cy="6" rx="15" ry="9" fill="#ffd84a" stroke="#c9a03d" stroke-width="2"/><circle cx="7" cy="-7" r="8" fill="#ffd84a" stroke="#c9a03d" stroke-width="2"/><path d="M14 -6L21 -4L14 -2Z" fill="#f08a3c"/><circle cx="9" cy="-9" r="1.6" fill="#222"/>' },
  water: { label: 'Полить', icon: '<path d="M-14 -4H8V14H-14Z" fill="#7fb6e6" stroke="#4f86a8" stroke-width="2" stroke-linejoin="round"/><path d="M8 0L20 -10" stroke="#4f86a8" stroke-width="4" stroke-linecap="round"/><path d="M-10 -4Q-4 -16 4 -4" fill="none" stroke="#4f86a8" stroke-width="2.6"/><g fill="#7fc4ec"><circle cx="21" cy="-4" r="2"/><circle cx="23" cy="2" r="2"/></g>' },
  bubbles: { label: 'Пузыри', icon: '<g fill="#e7f4ff" stroke="#7fb6e6" stroke-width="2"><circle cx="-6" cy="4" r="10"/><circle cx="9" cy="-8" r="6"/><circle cx="11" cy="9" r="4"/></g><ellipse cx="-10" cy="0" rx="3" ry="2" fill="#fff"/>' },
  pigeon: { label: 'Голубь', icon: '<ellipse cx="-2" cy="4" rx="13" ry="9" fill="#9aa3b0" stroke="#6b7480" stroke-width="2"/><circle cx="9" cy="-7" r="7" fill="#9aa3b0" stroke="#6b7480" stroke-width="2"/><path d="M15 -7L21 -5L15 -3Z" fill="#d9a65a"/><circle cx="11" cy="-8" r="1.5" fill="#222"/>' },
  photo: { label: 'Фото', icon: '<rect x="-17" y="-9" width="34" height="24" rx="5" fill="#5a7fb5" stroke="#3f5f8a" stroke-width="2"/><rect x="-7" y="-14" width="14" height="6" rx="2" fill="#5a7fb5"/><circle cx="0" cy="3" r="8" fill="#e7f4ff" stroke="#3f5f8a" stroke-width="2"/><circle cx="12" cy="-4" r="2" fill="#ffd36b"/>' },
  hug: { label: 'Обнять', icon: '<path d="M0 14c-12-8-19-14-19-21 0-6 4.5-10 9.5-10 4 0 7 2.3 9.5 5.5 2.5-3.2 5.5-5.5 9.5-5.5 5 0 9.5 4 9.5 10 0 7-7 13-19 21z" fill="#ef6f78" stroke="#c94a58" stroke-width="2"/>' },
  box: { label: 'Сундук', icon: '<rect x="-16" y="-2" width="32" height="18" rx="2" fill="#b9773f" stroke="#7a4f2a" stroke-width="2"/><path d="M-16 -2Q0 -18 16 -2Z" fill="#c98a50" stroke="#7a4f2a" stroke-width="2"/><rect x="-3" y="-4" width="6" height="8" rx="1.5" fill="#e9b949"/>' },
});
const ROOM_TOOLS = {
  bedroom: ['feed', 'wear', 'hide', 'sleep'], kitchen: ['cook', 'feed', 'wear'], bath: ['bathe', 'duck', 'wear'],
  balcony: ['water', 'bubbles', 'pigeon', 'wear'], hall: ['photo', 'hug', 'wear'], pantry: ['box', 'feed', 'wear'],
};
function renderBar() {
  const list = ROOM_TOOLS[room] || ROOM_TOOLS.bedroom;
  const bar = $('bar');
  bar.style.gridTemplateColumns = `repeat(${list.length}, minmax(0, 1fr))`;
  bar.innerHTML = list.map(id => {
    const t = TOOLS[id], active = (id === 'hide' && mode === 'hide') || (id === 'sleep' && mode === 'sleep') || (id === 'cook' && mode === 'cook') || (id === 'bathe' && mode === 'bath');
    return `<button class="tool" type="button" data-tool="${id}"><svg viewBox="-24 -24 48 48" aria-hidden="true">${t.icon}</svg><span>${active && t.alt ? t.alt : t.label}</span></button>`;
  }).join('');
}
$('bar').addEventListener('click', e => {
  const b = e.target.closest('[data-tool]');
  if (!b) return;
  const id = b.dataset.tool;
  if (id === 'feed') openTray('food');
  else if (id === 'wear') openTray('wear');
  else if (id === 'hide') { if (mode === 'hide') show(false); else startHide(); }
  else if (id === 'sleep') toggleSleep();
  else if (id === 'cook') { if (mode === 'cook') endCook(); else startCook(); }
  else if (id === 'bathe') { if (mode === 'bath') endRoomMode(); else startBath(); }
  else if (id === 'duck') addDuck();
  else if (id === 'water') waterPlants();
  else if (id === 'bubbles') startBubbles();
  else if (id === 'pigeon') callPigeon();
  else if (id === 'photo') takePhoto();
  else if (id === 'hug') groupHug();
  else if (id === 'box') openChest();
});

/* ---------- какая сцена выпадет ---------- */
function pickScene(ctx) {
  if (ctx.first) return 'hello';
  if (state.walkOut) return 'back';          // кто-то ушёл гулять — в следующий раз он возвращается
  if (!state.seen.vetaDoll) return 'vetaDoll';   // знакомство с плюшевой Ветой — в первый же заход
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
    // «Ушли гулять»: запоминаем, кто ушёл, — в следующий раз он вернётся с подарком
    let variant = '';
    if (id === 'walk') { variant = S.pick(['manya', 'shket', 'peng']); state.walkOut = variant; }
    if (id === 'back') { variant = state.walkOut || 'shket'; state.walkOut = null; }
    state.cur = { id, at: t, label: first ? 'Знакомство' : `Пока тебя не было · ${fmtAway(away)}`, variant, isNew, seed: Math.random(), away };
    state.last = t;
    save();
    show(true);
    if (!first) greet(S.HELLO);
  } else {
    state.last = t;
    save();
    if (mode === 'scene') show(false);
  }
}

/* ---------- реплики и сердечки (следуют за героями, когда комната поворачивается) ---------- */
const fx = $('fx');
const bubbles = {};
function say(id, text) {
  if (bubbles[id]) bubbles[id].el.remove();
  const el = document.createElement('div');
  el.className = 'bubble';
  el.textContent = text;
  fx.appendChild(el);
  const b = { el, id };
  bubbles[id] = b;
  place(b);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.remove(); if (bubbles[id] === b) delete bubbles[id]; }, 320); }, 2800);
}
function place(b) {
  const p = WD.heroScreen(b.id), r = stage.getBoundingClientRect();
  b.el.style.left = Math.min(Math.max(p.x, 120), window.innerWidth - 120) + 'px';
  b.el.style.top = Math.min(Math.max(p.y, r.top + 60), r.bottom - 10) + 'px';
}
WD.onFrame(() => Object.values(bubbles).forEach(place));
const HEART = '<svg viewBox="-17 -20 34 30"><path d="M0 8c-10-7-16-12-16-18 0-5 4-9 8.5-9 3.5 0 6 2 7.5 4.5 1.5-2.5 4-4.5 7.5-4.5 4.5 0 8.5 4 8.5 9 0 6-6 11-16 18z" fill="#ef6f78" stroke="#c94a58" stroke-width="1.4"/></svg>';
function heartAt(x, y) {
  const h = document.createElement('div');
  h.className = 'heart'; h.innerHTML = HEART;
  h.style.left = x + 'px'; h.style.top = y + 'px';
  fx.appendChild(h);
  setTimeout(() => h.remove(), 1150);
}
function burst(id, n = 5) {
  const p = WD.heroScreen(id);
  for (let i = 0; i < n; i++) setTimeout(() => heartAt(p.x + (Math.random() - 0.5) * 70, p.y + 30 + Math.random() * 40), i * 110);
}
function greet(pool) {
  setTimeout(() => {
    if (document.hidden) return;
    say(S.pick(['shket', 'manya', 'peng']), fill(S.pick(pool)));
  }, 1100);
}
const TOYS = ['manya', 'shket', 'peng'];
/* за плюшевую Вету говорят игрушки — слов ей самой не придумываем */
function talkVeta() {
  WD.react('veta', 'squish');
  const who = S.pick(TOYS);
  say(who, mode === 'sleep' ? 'Тсс… Вета спит.' : fill(S.pick(S.VETA_TALK[who])));
}
function talk(id) {
  if (id === 'veta') return talkVeta();
  if (mode === 'sleep') { WD.react(id, 'squish'); say(id, fill(S.pick(S.SLEEPY))); return; }
  const hungry = !state.fed[id] || Date.now() - state.fed[id] > HUNGRY_MS;
  let pool = hungry && Math.random() < 0.3 ? S.HUNGRY[id] : S.TALK[id];
  if (id === 'peng' && (state.pengHugs || 0) >= 3 && Math.random() < 0.4) pool = S.PENG_WARM;   // оттаял
  WD.react(id, 'squish');
  say(id, fill(S.pick(pool)));
}
/* обнимашки: долго держать палец на герое. Пингвину нужнее всех — объятия считаются, и он оттаивает */
function hug(id) {
  WD.react(id, 'squish'); burst(id, 6);
  if (id === 'veta') {
    if (mode !== 'sleep') TOYS.forEach((t, i) => setTimeout(() => WD.react(t, 'hop'), 150 + i * 150));
    return say(S.pick(TOYS), mode === 'sleep' ? 'Тсс… Вета спит.' : fill(S.pick(S.VETA_HUG)));
  }
  if (mode === 'sleep') return say(id, fill(S.pick(S.SLEEPY)));
  if (id === 'peng') {
    state.pengHugs = (state.pengHugs || 0) + 1; save();
    if (state.pengHugs === 1) return say('peng', S.PENG_FIRST_HUG);
  }
  say(id, fill(S.pick(S.HUG[id])));
}
const HOLD_MS = 550;

/* ---------- тап, глажка, поворот комнаты, помешивание ---------- */
let touch = null;
let picked = null;          // выбранная в шторке вещь: { tray, id }
stage.addEventListener('pointerdown', e => {
  const stirring = mode === 'cook' && cook && cook.step === 'stir';
  const id = stirring ? null : WD.pickHero(e.clientX, e.clientY);
  touch = { id, stir: stirring, x: e.clientX, y: e.clientY, dist: 0, lastHeart: 0, done: false };
  // палец держат на герое и не двигают — обнимашки (кроме игр, где тап по герою что-то значит)
  if (id && !picked && (mode === 'idle' || mode === 'scene' || mode === 'sleep')) {
    const t = touch;
    t.hold = setTimeout(() => { if (touch === t && t.dist < 10) { t.hugged = true; hug(id); } }, HOLD_MS);
  }
  if (!id && !stirring) WD.setDragging(true);
  if (stirring) WD.cook.stir(true);
  try { stage.setPointerCapture(e.pointerId); } catch (err) { /* не критично */ }
});
stage.addEventListener('pointermove', e => {
  if (!touch) return;
  const dx = e.clientX - touch.x;
  const step = Math.hypot(dx, e.clientY - touch.y);
  touch.dist += step;
  touch.x = e.clientX; touch.y = e.clientY;
  if (touch.stir) { stirBy(step); return; }
  if (!touch.id) { if (touch.dist > 6) WD.orbit(dx); return; }
  if (touch.dist - touch.lastHeart > 34) {
    touch.lastHeart = touch.dist;
    if (mode === 'bath' && bath && bath.step === 'scrub' && touch.id === bath.id) { scrub(1); return; }
    heartAt(e.clientX, e.clientY - 10);
  }
  if (!touch.done && touch.dist > 260) {
    touch.done = true;
    WD.react(touch.id, 'squish');
    if (touch.id === 'veta') talkVeta();
    else say(touch.id, fill(S.pick(mode === 'sleep' ? S.SLEEPY : S.PET[touch.id])));
    burst(touch.id, 4);
  }
});
function endTouch(e) {
  if (!touch) return;
  const tp = touch;
  touch = null;
  clearTimeout(tp.hold);
  WD.setDragging(false);
  if (tp.stir) { WD.cook.stir(false); return; }
  if (tp.dist >= 10 || tp.hugged) return;
  if (mode === 'bubbles') { if (WD.room.pop(e.clientX, e.clientY)) popOne(); return; }
  if (picked && picked.tray === 'ing') return addIngredient(picked.id);
  if (tp.id) {
    if (mode === 'hide') return hideTapHero(tp.id);
    if (mode === 'bath' && bath && bath.step === 'pick') return bathPick(tp.id);
    if (mode === 'morning' && !morning[tp.id] && (tp.id === 'shket' || tp.id === 'peng')) return fixMorning(tp.id);
    if (picked && (picked.tray === 'food' || picked.tray === 'wear')) return use(tp.id, picked);
    return talk(tp.id);
  }
  if (mode === 'hide') hideTapEmpty(e.clientX, e.clientY);
}
stage.addEventListener('pointerup', endTouch);
stage.addEventListener('pointercancel', () => { if (touch) { clearTimeout(touch.hold); if (touch.stir) WD.cook.stir(false); } touch = null; WD.setDragging(false); });

/* ---------- шторка снизу: еда, одёжка, рецепты, продукты ---------- */
const ICON = {
  tangerine: '<circle cx="0" cy="3" r="14" fill="#f7a23b" stroke="#c9741c" stroke-width="2"/><circle cx="-5" cy="-2" r="4" fill="#ffd08a" opacity=".7"/><ellipse cx="5" cy="-12" rx="7" ry="3.2" fill="#6fae4f" transform="rotate(-25 5 -12)"/>',
  clover: '<path d="M0 6Q4 14 -2 20" fill="none" stroke="#4f8c3c" stroke-width="2.4" stroke-linecap="round"/><g fill="#7dbf63" stroke="#4f8c3c" stroke-width="1.6"><circle cx="-7" cy="-4" r="7"/><circle cx="7" cy="-4" r="7"/><circle cx="0" cy="-13" r="7"/></g>',
  fish: '<path d="M-18 0Q-6 -11 10 -3L19 -10L17 0L19 10L10 3Q-6 11 -18 0Z" fill="#8fc2e0" stroke="#4f86a8" stroke-width="2" stroke-linejoin="round"/><circle cx="-10" cy="-1.5" r="1.8" fill="#24333d"/>',
  cookie: '<circle r="15" fill="#dba468" stroke="#a8743d" stroke-width="2"/><g fill="#5c3a22"><circle cx="-5" cy="-3" r="2.2"/><circle cx="5" cy="5" r="2.2"/><circle cx="4" cy="-6" r="1.8"/><circle cx="-6" cy="6" r="1.8"/></g>',
  watermelon: '<path d="M-18 -4A18 18 0 0 0 18 -4Z" fill="#ef5f63" stroke="#3f8a45" stroke-width="4" stroke-linejoin="round"/><g fill="#2a1b17"><circle cx="-7" cy="1" r="1.6"/><circle cx="0" cy="5" r="1.6"/><circle cx="7" cy="1" r="1.6"/></g>',
  party: TOOLS.wear.icon,
  beanie: '<path d="M-16 8A16 16 0 0 1 16 8Z" fill="#9fc1e6" stroke="#6f93b8" stroke-width="2"/><rect x="-18" y="6" width="36" height="8" rx="4" fill="#9fc1e6" stroke="#6f93b8" stroke-width="2"/><circle cx="0" cy="-11" r="5" fill="#f6f1e6" stroke="#cfc6b6" stroke-width="1.5"/>',
  crown: '<path d="M-16 12V-6L-8 2L0 -12L8 2L16 -6V12Z" fill="#e9b949" stroke="#b48a2a" stroke-width="2" stroke-linejoin="round"/><circle cx="0" cy="5" r="3" fill="#ef5f6f"/>',
  santa: '<path d="M-14 12C-12 -6 6 -16 18 -8L12 0C8 -4 2 -2 0 12Z" fill="#d9493f" stroke="#9f2f28" stroke-width="2" stroke-linejoin="round"/><rect x="-16" y="9" width="32" height="8" rx="4" fill="#fff" stroke="#d8d2cc" stroke-width="1.5"/><circle cx="18" cy="-8" r="5" fill="#fff" stroke="#d8d2cc" stroke-width="1.5"/>',
  bow: '<path d="M0 0L-16 -10V10Z M0 0L16 -10V10Z" fill="#f28aa0" stroke="#c96f78" stroke-width="2" stroke-linejoin="round"/><circle r="4.5" fill="#f28aa0" stroke="#c96f78" stroke-width="2"/>',
  glasses: '<g fill="#e7f4ff" stroke="#2b2b33" stroke-width="2.6"><circle cx="-9" cy="0" r="7.5"/><circle cx="9" cy="0" r="7.5"/></g><path d="M-1.5 -1H1.5" stroke="#2b2b33" stroke-width="2.6"/>',
  none: '<path d="M-11 -11L11 11M11 -11L-11 11" stroke="#b08a7a" stroke-width="3.5" stroke-linecap="round"/>',
  chef: '<rect x="-10" y="2" width="20" height="12" rx="2" fill="#fff" stroke="#c9bfb6" stroke-width="2"/><g fill="#fff" stroke="#c9bfb6" stroke-width="2"><circle cx="-8" cy="-2" r="7"/><circle cx="8" cy="-2" r="7"/><circle cx="0" cy="-8" r="9"/></g>',
  flowers: '<ellipse cx="0" cy="4" rx="17" ry="7" fill="none" stroke="#6fae4f" stroke-width="3"/><g><circle cx="-14" cy="3" r="4.5" fill="#f28aa0"/><circle cx="-6" cy="-2" r="4.5" fill="#ffd36b"/><circle cx="4" cy="-2" r="4.5" fill="#c7a4f0"/><circle cx="13" cy="3" r="4.5" fill="#f7a23b"/><circle cx="0" cy="10" r="4.5" fill="#9fc1e6"/></g>',
  bunny: '<path d="M-14 12Q0 2 14 12" fill="none" stroke="#f28aa0" stroke-width="3"/><g fill="#fff" stroke="#d8cfc6" stroke-width="2"><ellipse cx="-6" cy="-6" rx="5" ry="13" transform="rotate(-12 -6 -6)"/><ellipse cx="6" cy="-6" rx="5" ry="13" transform="rotate(12 6 -6)"/></g><g fill="#f6b8c4"><ellipse cx="-6" cy="-6" rx="2.2" ry="9" transform="rotate(-12 -6 -6)"/><ellipse cx="6" cy="-6" rx="2.2" ry="9" transform="rotate(12 6 -6)"/></g>',
  cap: '<path d="M-14 6A14 14 0 0 1 14 6Z" fill="#e5484d" stroke="#a6343a" stroke-width="2"/><path d="M6 6H22Q22 11 6 10Z" fill="#e5484d" stroke="#a6343a" stroke-width="2"/><circle cx="0" cy="-8" r="2.5" fill="#fff"/>',
  flour: '<path d="M-12 16V-6Q-12 -14 0 -16Q12 -14 12 -6V16Z" fill="#f6f1e6" stroke="#c9b8a6" stroke-width="2"/><text x="0" y="6" text-anchor="middle" font-size="7" font-weight="700" fill="#b5545a">МУКА</text>',
  milk: '<path d="M-10 16V-6L-6 -14H6L10 -6V16Z" fill="#fff" stroke="#7fb6e6" stroke-width="2" stroke-linejoin="round"/><path d="M-10 -6H10" stroke="#7fb6e6" stroke-width="2"/><rect x="-10" y="2" width="20" height="6" fill="#7fb6e6"/>',
  egg: '<ellipse cx="0" cy="2" rx="11" ry="14" fill="#fbf1dc" stroke="#d8c3a0" stroke-width="2"/>',
  carrot: '<path d="M-3 -10L3 -10L0 18Z" fill="#f08a3c" stroke="#c96a2a" stroke-width="2" stroke-linejoin="round" transform="rotate(20)"/><path d="M-4 -12l-4 -8M0 -12v-9M4 -12l4 -8" stroke="#6fae4f" stroke-width="2.6" stroke-linecap="round" transform="rotate(20)"/>',
  apple: '<circle cx="0" cy="3" r="13" fill="#e5484d" stroke="#b03036" stroke-width="2"/><path d="M0 -10Q2 -16 6 -18" stroke="#6b4524" stroke-width="2.4" fill="none" stroke-linecap="round"/><ellipse cx="6" cy="-14" rx="5" ry="2.5" fill="#6fae4f"/>',
  pancakes: '<ellipse cx="0" cy="14" rx="20" ry="4" fill="#fff" stroke="#d3c7b8" stroke-width="1.5"/><g fill="#e8b46a" stroke="#b9853e" stroke-width="1.4"><rect x="-15" y="4" width="30" height="6" rx="3"/><rect x="-14" y="-2" width="28" height="6" rx="3"/><rect x="-13" y="-8" width="26" height="6" rx="3"/></g><path d="M-10 -8Q0 -12 10 -8V-4Q6 0 4 -4Q0 -2 -4 -4Q-8 0 -10 -4Z" fill="#c97a2a"/><circle cx="0" cy="-12" r="3" fill="#d9434b"/>',
  pie: '<ellipse cx="0" cy="12" rx="20" ry="5" fill="#fff" stroke="#d3c7b8" stroke-width="1.5"/><path d="M-16 8V0A16 6 0 0 1 16 0V8Z" fill="#e3a65f" stroke="#b9853e" stroke-width="1.6"/><ellipse cx="0" cy="0" rx="16" ry="6" fill="#f0b46a" stroke="#b9853e" stroke-width="1.6"/><g fill="#f7a23b"><circle cx="-7" cy="0" r="2.6"/><circle cx="0" cy="-2" r="2.6"/><circle cx="7" cy="0" r="2.6"/><circle cx="0" cy="3" r="2.6"/></g>',
  salad: '<path d="M-18 -2H18A18 16 0 0 1 -18 -2Z" fill="#bfe3d6" stroke="#8fbfae" stroke-width="2"/><g fill="#7dbf63"><circle cx="-8" cy="-4" r="6"/><circle cx="2" cy="-7" r="6"/><circle cx="10" cy="-3" r="5"/></g><rect x="-3" y="-10" width="3" height="9" rx="1.5" fill="#f08a3c" transform="rotate(30)"/><circle cx="-1" cy="-2" r="3" fill="#e5484d"/>',
  fishcakes: '<ellipse cx="0" cy="10" rx="20" ry="5" fill="#fff" stroke="#d3c7b8" stroke-width="1.5"/><g fill="#b9773f" stroke="#8a5a2b" stroke-width="1.4"><ellipse cx="-8" cy="4" rx="8" ry="5"/><ellipse cx="8" cy="4" rx="8" ry="5"/><ellipse cx="0" cy="-3" rx="8" ry="5"/></g><circle cx="14" cy="-4" r="4" fill="#ffe066"/>',
};
const tray = $('tray'), items = $('items');
let trayKind = null;
const HINT = {
  food: ['Перетащи вкусняшку на Шкета, Маню или Пингвина', 'Теперь тапни того, кого угощаем'],
  wear: ['Перетащи вещь на героя — наденется. Ещё раз — снимется', 'Теперь тапни того, кого наряжаем'],
  recipe: ['Что готовим? Выбери рецепт', 'Что готовим? Выбери рецепт'],
  ing: ['Перетащи продукты в миску', 'Теперь тапни по комнате — продукт упадёт в миску'],
};
function trayList(kind) {
  if (kind === 'food') return S.FOODS;
  if (kind === 'wear') return wearList();
  if (kind === 'recipe') return S.RECIPES;
  // продукты: нужные для рецепта и парочка лишних — чтобы было из чего выбирать
  const need = cook.recipe.need, extra = Object.keys(S.INGREDIENTS).filter(i => !need.includes(i)).sort(() => Math.random() - 0.5).slice(0, 2);
  return need.concat(extra).sort(() => Math.random() - 0.5).map(id => ({ id, name: S.INGREDIENTS[id] }));
}
function openTray(kind) {
  trayKind = kind;
  const list = trayList(kind);
  items.innerHTML = list.map(f => `<button class="food${kind === 'ing' && cook.added.includes(f.id) ? ' used' : ''}" type="button" data-item="${f.id}"><svg viewBox="-24 -24 48 48" aria-hidden="true">${ICON[f.id]}</svg>${f.short || f.name}</button>`).join('');
  items.style.gridTemplateColumns = `repeat(${Math.min(list.length, kind === 'food' || kind === 'ing' ? 5 : 4)}, 1fr)`;
  tray.hidden = false;
  setPicked(null);
}
function setPicked(id) {
  picked = id ? { tray: trayKind, id } : null;
  items.querySelectorAll('.food').forEach(b => b.classList.toggle('picked', b.dataset.item === id));
  if (trayKind) $('trayHint').textContent = HINT[trayKind][id ? 1 : 0];
}
$('trayClose').addEventListener('click', closeTray);

let drag = null;
items.addEventListener('pointerdown', e => {
  const b = e.target.closest('.food');
  if (!b || trayKind === 'recipe') return;
  drag = { id: b.dataset.item, x0: e.clientX, y0: e.clientY, ghost: null };
  try { b.setPointerCapture(e.pointerId); } catch (err) { /* не критично */ }
});
items.addEventListener('pointermove', e => {
  if (!drag) return;
  if (!drag.ghost && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 8) {
    drag.ghost = document.createElement('div');
    drag.ghost.className = 'drag-ghost';
    drag.ghost.innerHTML = `<svg viewBox="-24 -24 48 48">${ICON[drag.id]}</svg>`;
    document.body.appendChild(drag.ghost);
  }
  if (drag.ghost) drag.ghost.style.transform = `translate(${e.clientX - 28}px, ${e.clientY - 40}px)`;
});
items.addEventListener('pointerup', e => {
  if (!drag) return;
  const d = drag;
  drag = null;
  if (d.ghost) {
    d.ghost.remove();
    if (trayKind === 'ing') {
      const r = stage.getBoundingClientRect();
      if (e.clientY >= r.top && e.clientY <= r.bottom) addIngredient(d.id);
      return;
    }
    const id = WD.pickHero(e.clientX, e.clientY);
    if (id) use(id, { tray: trayKind, id: d.id });
  } else {
    setPicked(picked && picked.id === d.id ? null : d.id);
  }
});
items.addEventListener('pointercancel', () => { if (drag && drag.ghost) drag.ghost.remove(); drag = null; });
items.addEventListener('click', e => {
  const b = e.target.closest('.food');
  if (b && trayKind === 'recipe') chooseRecipe(b.dataset.item);
});

function use(heroId, it) {
  if (heroId === 'veta') say(S.pick(TOYS), S.VETA_NO[it.tray === 'wear' ? 'wear' : 'food']);
  else if (it.tray === 'wear') wear(heroId, it.id); else feed(heroId, it.id);
  setPicked(null);
}
function feed(id, food) {
  if (mode === 'sleep') { say(id, fill(S.pick(S.SLEEPY))); return; }
  const like = S.LIKES[id][food];
  WD.react(id, like > 0 ? 'chomp' : 'squish');
  say(id, fill(S.pick(S.FEED[id][like])));
  if (like > 0) {
    state.fed[id] = Date.now();
    burst(id, like === 2 ? 5 : 2);
    const sc = S.byId[state.cur.id];
    if (mode === 'scene' && sc.resolved && !state.cur.variant && sc.resolved.char === id) {
      state.cur.variant = 'resolved';
      setTimeout(() => { if (mode === 'scene') { restage(); $('story').textContent = sc.resolved.text(ctxNow({})); } }, 900);
    }
    save();
  }
}
/* гардероб: базовые вещи + то, что выпало из сундука в кладовой */
function wearList() {
  const extra = S.UNLOCKS.filter(u => state.unlocked.includes(u.id));
  return S.WEAR.filter(w => w.id !== 'none').concat(extra, S.WEAR.filter(w => w.id === 'none'));
}
function wear(id, item) {
  const def = wearList().find(w => w.id === item);
  const fit = Object.assign({}, state.outfit[id]);
  let on = true;
  if (def.kind === 'none') { delete state.outfit[id]; on = false; }
  else {
    if (def.kind === 'hat') { if (fit.hat === item) { delete fit.hat; on = false; } else fit.hat = item; }
    else { fit[def.kind] = !fit[def.kind]; on = fit[def.kind]; }
    state.outfit[id] = fit;
  }
  save();
  WD.setOutfit(state.outfit);
  restage();
  WD.react(id, 'hop');
  if (on) { burst(id, 3); say(id, fill(S.pick(S.WEAR_LINES[id]))); } else say(id, S.UNDRESS[id]);
}

/* ---------- кухня: готовим вместе ---------- */
function startCook() {
  closeTray();
  mode = 'cook';
  cook = { step: 'choose', recipe: null, added: [], stir: 0, look: null };
  S.LAYOUT.kitchen(WD);
  setCaption('Готовим', 'Шкет любит пирог, Маня — салат, Пингвин — котлетки, а блинчики — все.', { buttons: [['endcook', 'Хватит']] });
  renderBar();
  openTray('recipe');
}
function chooseRecipe(id) {
  const r = S.RECIPES.find(x => x.id === id);
  if (!r || !cook) return;
  cook.recipe = r; cook.step = 'add'; cook.added = []; cook.stir = 0;
  WD.cook.bowl();
  setCaption(r.name, `Нужно: ${r.need.map(i => S.INGREDIENTS[i].toLowerCase()).join(', ')}.`, { buttons: [['endcook', 'Хватит']] });
  openTray('ing');
}
function addIngredient(ing) {
  if (!cook || cook.step !== 'add') return;
  const who = S.pick(['shket', 'manya', 'peng']);
  if (!cook.recipe.need.includes(ing)) { WD.react(who, 'squish'); say(who, S.pick(S.COOK_LINES.wrong)); setPicked(null); return; }
  if (cook.added.includes(ing)) { setPicked(null); return; }
  cook.added.push(ing);
  WD.cook.add(ing);
  WD.react(who, 'hop');
  say(who, S.pick(S.COOK_LINES.add[ing]));
  const btn = items.querySelector(`[data-item="${ing}"]`);
  if (btn) btn.classList.add('used');
  setPicked(null);
  if (cook.added.length === cook.recipe.need.length) setTimeout(startStir, 700);
}
function startStir() {
  if (!cook) return;
  closeTray();
  cook.step = 'stir';
  setCaption(cook.recipe.name, 'Всё в миске! Теперь помешай: води пальцем по комнате кругами. Или жми «Мешать».', { buttons: [['stir', 'Мешать'], ['endcook', 'Хватит']] });
  say(S.pick(['manya', 'shket']), S.pick(S.COOK_LINES.stir));
}
function stirBy(px) {
  if (!cook || cook.step !== 'stir') return;
  cook.stir += px;
  if (cook.stir > 900) finishStir();
}
function finishStir() {
  WD.cook.stir(false);
  if (!cook.recipe.bake) return serveDish();
  cook.step = 'bake'; cook.look = 'oven';
  WD.cook.clear();
  WD.cook.oven(true);
  S.KITCHEN_LOOK.oven(WD);
  setCaption(cook.recipe.name, 'В духовке! Все смотрят и ждут…');
  say('peng', S.pick(S.COOK_LINES.bake));
  let n = 4;
  const tick = () => {
    if (!cook || cook.step !== 'bake') return;
    if (--n > 0) { $('story').textContent = `В духовке! Ещё ${n}…`; setTimeout(tick, 1000); return; }
    WD.cook.oven(false);
    serveDish();
  };
  setTimeout(tick, 1000);
}
function serveDish() {
  WD.cook.clear();
  cook.step = 'serve'; cook.look = 'dish';
  WD.cook.serve(cook.recipe.id);
  S.KITCHEN_LOOK.dish(WD);
  say(S.pick(['manya', 'shket', 'peng']), S.pick(S.COOK_LINES.done));
  setCaption(cook.recipe.name, `Готово! ${cook.recipe.name} — пальчики оближешь. Угостить всех?`, { buttons: [['eat', 'Угостить'], ['more', 'Другой рецепт']] });
}
function eatDish() {
  const r = cook.recipe;
  WD.cook.eat();
  ['manya', 'shket', 'peng'].forEach((id, i) => setTimeout(() => {
    const like = r.likes[id];
    WD.react(id, like > 0 ? 'chomp' : 'squish');
    say(id, fill(S.pick(S.FEED[id][like])));
    if (like > 0) { state.fed[id] = Date.now(); burst(id, like === 2 ? 4 : 2); }
  }, 400 + i * 900));
  state.cooked[r.id] = (state.cooked[r.id] || 0) + 1;
  save();
  cook.step = 'done'; cook.look = null;
  setTimeout(() => { if (cook) S.LAYOUT.kitchen(WD); }, 3200);
  const total = Object.values(state.cooked).reduce((a, b) => a + b, 0);
  setCaption(r.name, `Все наелись. Это уже ${total}-е блюдо, которое вы приготовили вместе.`, { buttons: [['more', 'Ещё рецепт'], ['endcook', 'Хватит']] });
}
function endCook() {
  closeTray();
  mode = 'idle'; cook = null;
  WD.stage(S.LAYOUT.kitchen, ctxNow({}), 'kitchen');
  const r = S.ROOMS.find(x => x.id === 'kitchen');
  setCaption(r.name, r.text);
  renderBar();
}

/* ---------- ванная, балкон, коридор, кладовая ---------- */
const NAME = { manya: 'Маню', shket: 'Шкета', peng: 'Пингвина' };
const L = S.ROOM_LINES;
const today = () => dayKey(now());
function roomCaption() { const r = S.ROOMS.find(x => x.id === room); setCaption(r.name, r.text); }
function endRoomMode() {
  closeTray();
  mode = 'idle'; bath = null;
  WD.stage(S.LAYOUT[room], ctxNow({}), room);
  if (room === 'balcony') WD.room.plants(state.plants);
  roomCaption();
  renderBar();
}
/* купание: выбрать героя → намылить (водить пальцем) → смыть → вытереть */
function startBath() {
  closeTray();
  mode = 'bath'; bath = { step: 'pick', id: null, foam: 0, ducks: 0 };
  setCaption('Купаемся', 'Кого купаем? Тапни героя.', { buttons: [['endroom', 'Хватит']] });
  renderBar();
}
function bathPick(id) {
  bath.id = id; bath.step = 'scrub'; bath.foam = 0;
  WD.stage(S.bathSetup(id), ctxNow({}), 'bath');
  say(id, L.bath.into[id]);
  setCaption('Купаемся', `Намыль ${NAME[id]}: води пальцем по герою или жми «Мылить».`, { buttons: [['soap', 'Мылить'], ['endroom', 'Хватит']] });
}
function scrub(n) {
  if (!bath || bath.step !== 'scrub') return;
  WD.room.foam(bath.id, n * 2);
  bath.foam += n * 2;
  if (Math.random() < 0.3) say(bath.id, S.pick(L.bath.scrub));
  if (bath.foam >= 16) {
    bath.step = 'rinse';
    setCaption('Купаемся', 'Сплошная пена! Теперь смоем.', { buttons: [['rinse', 'Смыть'], ['endroom', 'Хватит']] });
  }
}
function rinse() {
  bath.step = 'dry';
  WD.room.rinse();
  say(bath.id, S.pick(L.bath.rinse));
  setTimeout(() => { if (bath && bath.step === 'dry') setCaption('Купаемся', 'Чистота! Осталось вытереть полотенцем.', { buttons: [['dry', 'Вытереть'], ['endroom', 'Хватит']] }); }, 1300);
}
function dryOff() {
  const id = bath.id;
  WD.react(id, 'hop'); burst(id, 6);
  say(id, L.bath.dry[id]);
  state.clean[id] = Date.now(); save();
  bath.step = 'done';
  const done = { manya: 'Маня чистая и пушистая', shket: 'Шкет чистый и пушистый', peng: 'Пингвин чистый и пушистый' };
  setCaption('Купаемся', `${done[id]}. Кого ещё?`, { buttons: [['again', 'Купать ещё'], ['endroom', 'Хватит']] });
}
function addDuck() {
  if (room !== 'bath') return;
  const n = (bath && bath.ducks) || 0;
  if (n >= 8) { say('shket', L.bath.full); return; }
  WD.room.duck();
  if (bath) bath.ducks = n + 1; else bath = { ducks: n + 1 };
  say(S.pick(['manya', 'shket', 'peng']), S.pick(L.bath.duck));
}
/* балкон: полив раз в день растит цветы, пузыри лопаются тапом, голубь прилетает за крошками */
function waterPlants() {
  WD.room.water();
  say(S.pick(['manya', 'shket']), S.pick(L.balcony.water));
  if (state.plantDay === today()) { setTimeout(() => say('peng', L.balcony.again), 1200); return; }
  state.plantDay = today();
  state.plants = state.plants.map(v => Math.min(5, v + 1));
  save();
  setTimeout(() => {
    WD.room.plants(state.plants);
    const lv = state.plants[0];
    say('manya', L.balcony.grown[lv >= 5 ? 2 : lv >= 3 ? 1 : 0]);
    setCaption('Балкон', lv >= 5 ? 'Все цветы распустились! Не забывай поливать — им нравится.' : `Цветы подросли: ${lv} из 5. Полей завтра — подрастут ещё.`);
  }, 1700);
}
function startBubbles() {
  closeTray();
  mode = 'bubbles'; popped = 0;
  WD.room.bubbles(16);
  say(S.pick(['manya', 'shket', 'peng']), S.pick(L.balcony.bubbles));
  setCaption('Пузыри', 'Лопай пузыри тапом! Лопнуто: 0');
  setTimeout(() => {
    if (mode !== 'bubbles') return;
    mode = 'idle';
    setCaption('Пузыри', popped ? `Лопнуто ${popped} ${S.plural(popped, ['пузырь', 'пузыря', 'пузырей'])}! Ещё?` : 'Пузыри улетели. Попробуй ещё!');
  }, 15000);
}
function popOne() {
  popped++;
  $('story').textContent = `Лопай пузыри тапом! Лопнуто: ${popped}`;
  if (popped % 4 === 0) say(S.pick(['manya', 'shket', 'peng']), S.pick(['Бульк!', 'Ещё!', 'Ловко!', 'Ура!']));
}
function callPigeon() {
  WD.room.pigeon(true);
  ['manya', 'shket', 'peng'].forEach((id, i) => setTimeout(() => say(id, L.balcony.pigeon[id]), 300 + i * 1100));
}
/* коридор: фото у зеркала в рамке-полароиде, сохранить в «Фото»; обнимашки */
let photoBlob = null;
function takePhoto() {
  closeTray();
  S.LAYOUT.hall(WD);
  ['manya', 'shket', 'peng'].forEach(id => WD.react(id, 'hop'));
  say(S.pick(['manya', 'shket', 'peng']), S.pick(L.hall.photo));
  setTimeout(() => {
    stage.classList.remove('flash'); void stage.offsetWidth; stage.classList.add('flash');
    const shot = WD.photo(900, 1100);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = 1000; c.height = 1360;
      const g = c.getContext('2d');
      g.fillStyle = '#fffdf8'; g.fillRect(0, 0, c.width, c.height);
      g.drawImage(img, 50, 50, 900, 1100);
      g.fillStyle = '#4a3428'; g.font = `56px Pangolin, 'Comic Sans MS', cursive`; g.textAlign = 'center';
      g.fillText('Шкет, Маня и Пингвин', 500, 1235);
      g.fillStyle = '#a08a7a'; g.font = `36px Pangolin, 'Comic Sans MS', cursive`;
      g.fillText(now().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }), 500, 1300);
      $('photoImg').src = c.toDataURL('image/jpeg', 0.9);
      c.toBlob(b => { photoBlob = b; }, 'image/jpeg', 0.9);
      $('photo').hidden = false;
      state.photos++; save();
    };
    img.src = shot;
  }, 900);
}
$('photoClose').addEventListener('click', () => { $('photo').hidden = true; });
$('photoSave').addEventListener('click', async () => {
  if (!photoBlob) return;
  const file = new File([photoBlob], `shket-i-manya-${Date.now()}.jpg`, { type: 'image/jpeg' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Шкет, Маня и Пингвин' }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(photoBlob); a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
});
function groupHug() {
  closeTray();
  S.hugSetup(WD);
  ['manya', 'shket', 'peng'].forEach((id, i) => setTimeout(() => { WD.react(id, 'squish'); burst(id, 3); }, i * 250));
  say(S.pick(['manya', 'shket', 'peng']), fill(S.pick(L.hall.hug)));
  setTimeout(() => { if (room === 'hall' && mode === 'idle') S.LAYOUT.hall(WD); }, 4000);
}
/* кладовая: сундук открывается раз в день, внутри — новая вещь для гардероба (а когда всё собрано — печеньки) */
function openChest() {
  closeTray();
  if (state.boxDay === today()) {
    WD.react('shket', 'squish');
    say(S.pick(['manya', 'shket', 'peng']), S.pick(L.pantry.already));
    setCaption('Кладовая', 'Сундук сегодня уже открывали. Загляни завтра — там будет что-то новое.');
    return;
  }
  state.boxDay = today();
  const next = S.UNLOCKS.find(u => !state.unlocked.includes(u.id));
  if (next) {
    state.unlocked.push(next.id); save();
    WD.room.chest(true, next.id);
    setTimeout(() => { ['manya', 'shket', 'peng'].forEach(id => WD.react(id, 'hop')); say('manya', 'Ого! Это мне? Нам!'); }, 900);
    setCaption('Кладовая', `В сундуке — ${next.name.toLowerCase()}! Теперь это есть в гардеробе: жми «Нарядить».`);
  } else {
    save();
    WD.room.chest(true, null);
    ['manya', 'shket', 'peng'].forEach((id, i) => setTimeout(() => { WD.react(id, 'chomp'); burst(id, 2); state.fed[id] = Date.now(); }, 600 + i * 400));
    say('shket', L.pantry.treat);
    setCaption('Кладовая', 'Сегодня в сундуке печеньки — всех угостили. Завтра будет ещё.');
    save();
  }
}

/* ---------- прятки ---------- */
function startHide() {
  closeTray();
  let spot;
  do { spot = Math.floor(Math.random() * S.HIDE_SPOTS.length); } while (game && spot === game.spot && S.HIDE_SPOTS.length > 1);
  mode = 'hide';
  game = { spot, tries: 0, found: false };
  WD.stage(S.hideSetup(spot), ctxNow({}), 'bedroom');
  setCaption('Прятки', 'Шкет спрятался где-то в комнате. Тапай, где он может быть: Маня и Пингвин подскажут, тепло или холодно.', { buttons: [['giveup', 'Сдаюсь'], ['exit', 'Хватит']] });
  renderBar();
  say(S.pick(['manya', 'peng']), fill(S.pick(S.HIDE.start)));
}
function hideFound(gaveUp) {
  game.found = true;
  WD.react('shket', 'hop');
  burst('shket', 6);
  const where = S.HIDE_SPOTS[game.spot].where;
  let text;
  if (gaveUp) text = `Шкет сидел ${where}. В следующий раз точно найдёшь!`;
  else {
    const best = !state.hideBest || game.tries < state.hideBest;
    if (best) { state.hideBest = game.tries; save(); }
    text = `Нашла ${where}! С ${game.tries}-й попытки.` + (best && game.tries > 0 ? ' Это новый рекорд!' : ` Рекорд — с ${state.hideBest}-й.`);
    say('shket', fill(S.pick(S.HIDE.found)));
  }
  setCaption('Прятки', text, { buttons: [['again', 'Ещё раз'], ['exit', 'Хватит']] });
}
function hideTapHero(id) {
  if (game.found) return;
  game.tries++;
  if (id === 'shket') return hideFound(false);
  WD.react(id, 'squish');
  say(id, id === 'manya' ? 'Это я, Маня! Шкет где-то ещё.' : 'Я не Шкет. Я крупнее.');
}
function hideTapEmpty(x, y) {
  if (game.found) return;
  game.tries++;
  const p = WD.pickPoint(x, y);
  const d = p ? p.distanceTo(WD.heroWorld('shket')) : 9;
  const pool = d < 0.7 ? S.HIDE.hot : d < 1.4 ? S.HIDE.warm : S.HIDE.cold;
  say(S.pick(['manya', 'peng']), fill(S.pick(pool)));
}

/* ---------- кнопки в подписи: прятки и готовка ---------- */
$('gameBtns').addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const act = b.dataset.act;
  if (mode === 'morning' && act === 'lift') return fixMorning('peng');
  if (mode === 'morning' && act === 'flip') return fixMorning('shket');
  if (mode === 'hide') {
    if (act === 'giveup') hideFound(true);
    else if (act === 'again') startHide();
    else show(false);
  } else if (mode === 'bath') {
    if (act === 'soap') scrub(2);
    else if (act === 'rinse') rinse();
    else if (act === 'dry') dryOff();
    else if (act === 'again') { WD.stage(S.LAYOUT.bath, ctxNow({}), 'bath'); startBath(); }
    else endRoomMode();
  } else if (mode === 'cook') {
    if (act === 'stir') { WD.cook.stir(true); setTimeout(() => WD.cook.stir(false), 600); stirBy(200); }
    else if (act === 'eat') eatDish();
    else if (act === 'more') { cook = { step: 'choose', recipe: null, added: [], stir: 0, look: null }; WD.stage(S.LAYOUT.kitchen, ctxNow({}), 'kitchen'); setCaption('Готовим', 'Что приготовим теперь?', { buttons: [['endcook', 'Хватит']] }); openTray('recipe'); }
    else if (act === 'endcook') endCook();
  }
});

/* ---------- уложить спать ---------- */
/* как у Веты: Маня и Шкет у подушки, Пингвин в ногах — а утром он, конечно, на полу */
function toggleSleep() {
  closeTray();
  if (mode === 'sleep') return wakeUp();
  room = 'bedroom'; mode = 'sleep'; game = null;
  setChrome('night');
  WD.stage(S.sleepSetup, ctxNow({}), 'bedroom');
  setCaption('Спокойной ночи', 'Тсс… Вета уснула: Маня и Шкет у подушки, Пингвин в ногах — как всегда. Посмотрим, долежит ли он до утра.');
  renderBar();
}
/* утро: Шкет звёздочкой пузом кверху, Пингвин на полу; morning — кого уже поправили */
let morning = {};
function morningButtons() {
  return [!morning.shket && ['flip', 'Перевернуть Шкета'], !morning.peng && ['lift', 'Поднять Пингвина']].filter(Boolean);
}
function wakeUp() {
  mode = 'morning'; morning = {};
  setChrome('morning');
  WD.stage(S.morningSetup, ctxNow({ fixed: morning }), 'bedroom');
  setCaption('Доброе утро', 'Утро! Вета потягивается, кудри во все стороны. Маня сползла с подушки, Шкет — опять звёздочкой пузом кверху, а Пингвин… на полу. Как он туда попадает — загадка.', { buttons: morningButtons() });
  renderBar();
  setTimeout(() => { if (mode === 'morning' && !morning.peng) say('peng', 'Я… я сам слез. Мне тут удобно.'); }, 1200);
}
function fixMorning(id) {
  morning[id] = true;
  WD.stage(S.morningSetup, ctxNow({ fixed: morning }), 'bedroom');
  WD.react(id, 'hop'); burst(id, 4);
  say(id, id === 'peng' ? 'Спасибо. Я не падал. Почти.' : S.pick(S.STAR));
  if (morning.shket && morning.peng) {
    mode = 'idle';
    setTimeout(() => say('manya', fill('Доброе утро, {nick}!')), 1300);
    setCaption('Доброе утро', 'Все на месте. Шкет и Пингвин делают вид, что ничего не было.');
  } else {
    setCaption('Доброе утро', id === 'peng'
      ? 'Пингвин на месте. А Шкет всё ещё лежит звёздочкой и делает вид, что так и надо.'
      : 'Шкет снова на лапах. А Пингвин всё ещё на полу — ждёт, когда его заметят.', { buttons: morningButtons() });
  }
  renderBar();
}

/* ---------- альбом: снимки сцен делает 3D-мир ---------- */
const album = $('album'), albumBody = $('albumBody');
const RAR = { common: '', rare: '<span class="rar rare">редкая</span>', special: '<span class="rar special">особая</span>' };
const thumbs = {};
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
  return S.makeCtx({ tod: todOf(d), now: scene.rarity === 'special' ? d : now(), seed: 0.3, away: 40 * 3600e3 });
}
let snapping = false;
function renderGrid() {
  const seen = seenMap();
  const got = S.SCENES.filter(s => seen[s.id]).length;
  $('albumTitle').textContent = 'Альбом';
  $('albumCount').textContent = `Собрано ${got} из ${S.SCENES.length}`;
  $('albumClose').textContent = 'Закрыть';
  albumBody.innerHTML = `<div class="grid">${S.SCENES.map(s => {
    if (!seen[s.id]) return `<div class="card locked"><div class="thumb">?</div><h3>Пока секрет</h3><p>${RAR[s.rarity]} ${s.hint || 'выпадет само'}</p></div>`;
    const d = new Date(seen[s.id]);
    return `<button class="card" type="button" data-scene="${s.id}"><div class="thumb">${thumbs[s.id] ? `<img src="${thumbs[s.id]}" alt="">` : ''}</div><h3>${s.title}</h3><p>${RAR[s.rarity]} ${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</p></button>`;
  }).join('')}</div>`;
  album.scrollTop = 0;
  // снимки по одному за кадр, чтобы телефон не подвисал (на кухне в это время ничего не готовится — альбом её перекрывает)
  const todo = S.SCENES.filter(s => seen[s.id] && !thumbs[s.id]);
  if (!todo.length) return;
  snapping = true;
  const step = () => {
    if (album.hidden || !todo.length) { finishSnaps(); return; }
    const s = todo.shift();
    thumbs[s.id] = WD.snapshot(s.setup, thumbCtx(s, seen[s.id]), 300, 450);
    const card = albumBody.querySelector(`[data-scene="${s.id}"] .thumb`);
    if (card) card.innerHTML = `<img src="${thumbs[s.id]}" alt="">`;
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function finishSnaps() {
  if (!snapping) return;
  snapping = false;
  WD.restoreSize();
  if (room === 'kitchen') { cook = null; mode = 'idle'; WD.stage(S.LAYOUT.kitchen, ctxNow({}), 'kitchen'); const r = S.ROOMS.find(x => x.id === 'kitchen'); setCaption(r.name, r.text); renderBar(); }
  else if (mode === 'idle') WD.stage(S.LAYOUT[room], ctxNow({}), room);
  else restage();
}
function renderDetail(id) {
  const s = S.byId[id], seen = seenMap();
  const ctx = thumbCtx(s, seen[id]);
  $('albumTitle').textContent = s.title;
  $('albumCount').textContent = new Date(seen[id]).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  $('albumClose').textContent = 'Назад';
  albumBody.innerHTML = `<div class="detail"><div class="thumb">${thumbs[id] ? `<img src="${thumbs[id]}" alt="${s.title}">` : ''}</div><p class="story">${s.text(ctx)}</p></div>`;
  album.scrollTop = 0;
}
let detailOpen = false;
$('btnAlbum').addEventListener('click', () => {
  state.fresh = [];
  save();
  updateBadge();
  detailOpen = false;
  album.hidden = false;
  renderGrid();
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
  finishSnaps();
});

/* ---------- подсказка для iPhone ---------- */
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
if (isIOS && !standalone && !state.install) $('install').hidden = false;
$('installOk').addEventListener('click', () => { $('install').hidden = true; state.install = true; save(); });

/* ---------- без приближения на iPhone ----------
   Safari не всегда слушается viewport и touch-action: щипок гасим через gesture-события,
   быстрый второй тап — через touchend (реплики и глажка живут на pointer-событиях и не страдают). */
['gesturestart', 'gesturechange', 'gestureend'].forEach(t => document.addEventListener(t, e => e.preventDefault(), { passive: false }));
let lastTouchEnd = 0;
document.addEventListener('touchend', e => {
  const t = Date.now();
  if (t - lastTouchEnd < 350 && !e.target.closest('.sheet')) e.preventDefault();
  lastTouchEnd = t;
}, { passive: false });

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
  if (mode === 'scene' && document.body.dataset.tod !== todOf(now()) && album.hidden) show(false);
}, 15000);

/* надписи на предметах рисуются шрифтом Pangolin — ждём его, но не дольше полутора секунд */
const fontReady = document.fonts && document.fonts.load ? document.fonts.load('40px Pangolin') : Promise.resolve();
Promise.race([fontReady, new Promise(r => setTimeout(r, 1500))]).then(() => {
  arrive();
  if (q.get('room') && q.get('room') !== 'bedroom') enterRoom(q.get('room'));
});

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* без офлайна тоже работает */ });
}
})();
