/* Шкет и Маня — логика. Пока Веты нет, герои «чем-то заняты»: при каждом возвращении выпадает новая сцена.
   Рисует 3D-мир (world.js), здесь — выбор сцены, реплики, кормёжка, гардероб, прятки, сон, альбом.
   Всё хранится на телефоне (localStorage), сервера нет. */
(function () {
'use strict';
const S = window.SCENES_API, CFG = S.CONFIG, WD = window.WORLD;
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
const state = Object.assign({ first: Date.now(), last: 0, visits: 0, seen: {}, cur: null, fed: {}, fresh: [], specialDay: '', install: false, outfit: {}, hideBest: 0 }, load() || {});

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

/* ---------- режимы: обычная сцена, прятки, сон ---------- */
let mode = 'scene', game = null;
function ctxNow(extra) {
  const d = now();
  return S.makeCtx(Object.assign({ tod: todOf(d), now: d, seed: state.cur ? state.cur.seed : Math.random() }, extra));
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
function setBar() {
  $('btnHide').querySelector('span').textContent = mode === 'hide' ? 'Выйти' : 'Прятки';
  $('btnSleep').querySelector('span').textContent = mode === 'sleep' ? 'Разбудить' : 'Спать';
}
function show(fade) {
  mode = 'scene'; game = null;
  const sc = S.byId[state.cur.id] || S.byId.cuddle;
  const ctx = ctxNow({ variant: state.cur.variant, away: state.cur.away });
  setChrome(ctx.tod);
  WD.stage(sc.setup, ctx);
  if (fade) { stage.classList.remove('fade'); void stage.offsetWidth; stage.classList.add('fade'); }
  const note = sc.note ? sc.note(ctx) : '';
  setCaption(state.cur.label, state.cur.variant && sc.resolved ? sc.resolved.text(ctx) : sc.text(ctx), { isNew: state.cur.isNew, note, sign: ctx.sign });
  const days = S.daysTogether(now());
  $('together').textContent = `вместе ${days} ${S.plural(days, ['день', 'дня', 'дней'])}`;
  setBar();
  updateBadge();
}
function restage() {
  if (mode === 'hide') WD.stage(S.hideSetup(game.spot), ctxNow({}));
  else if (mode === 'sleep') WD.stage(S.sleepSetup, ctxNow({}));
  else { const sc = S.byId[state.cur.id] || S.byId.cuddle; WD.stage(sc.setup, ctxNow({ variant: state.cur.variant, away: state.cur.away })); }
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
function talk(id) {
  if (mode === 'sleep') { WD.react(id, 'squish'); say(id, fill(S.pick(S.SLEEPY))); return; }
  const hungry = !state.fed[id] || Date.now() - state.fed[id] > HUNGRY_MS;
  const pool = hungry && Math.random() < 0.3 ? S.HUNGRY[id] : S.TALK[id];
  WD.react(id, 'squish');
  say(id, fill(S.pick(pool)));
}

/* ---------- тап, глажка, поворот комнаты ---------- */
let touch = null;
let picked = null;          // выбранная в шторке вещь: { tray: 'food'|'wear', id }
stage.addEventListener('pointerdown', e => {
  const id = WD.pickHero(e.clientX, e.clientY);
  touch = { id, x: e.clientX, y: e.clientY, x0: e.clientX, dist: 0, lastHeart: 0, done: false };
  if (!id) WD.setDragging(true);
  try { stage.setPointerCapture(e.pointerId); } catch (err) { /* не критично */ }
});
stage.addEventListener('pointermove', e => {
  if (!touch) return;
  const dx = e.clientX - touch.x;
  touch.dist += Math.hypot(dx, e.clientY - touch.y);
  touch.x = e.clientX; touch.y = e.clientY;
  if (!touch.id) { if (touch.dist > 6) WD.orbit(dx); return; }
  if (touch.dist - touch.lastHeart > 34) { heartAt(e.clientX, e.clientY - 10); touch.lastHeart = touch.dist; }
  if (!touch.done && touch.dist > 260) {
    touch.done = true;
    WD.react(touch.id, 'squish');
    say(touch.id, fill(S.pick(mode === 'sleep' ? S.SLEEPY : S.PET[touch.id])));
    burst(touch.id, 4);
  }
});
function endTouch(e) {
  if (!touch) return;
  const tp = touch;
  touch = null;
  WD.setDragging(false);
  if (tp.dist >= 10) return;
  if (tp.id) {
    if (mode === 'hide') return hideTapHero(tp.id);
    if (picked) return use(tp.id, picked);
    return talk(tp.id);
  }
  if (mode === 'hide') hideTapEmpty(e.clientX, e.clientY);
}
stage.addEventListener('pointerup', endTouch);
stage.addEventListener('pointercancel', () => { touch = null; WD.setDragging(false); });

/* ---------- шторка: еда и одёжка ---------- */
const ICON = {
  tangerine: '<circle cx="0" cy="3" r="14" fill="#f7a23b" stroke="#c9741c" stroke-width="2"/><circle cx="-5" cy="-2" r="4" fill="#ffd08a" opacity=".7"/><ellipse cx="5" cy="-12" rx="7" ry="3.2" fill="#6fae4f" transform="rotate(-25 5 -12)"/>',
  clover: '<path d="M0 6Q4 14 -2 20" fill="none" stroke="#4f8c3c" stroke-width="2.4" stroke-linecap="round"/><g fill="#7dbf63" stroke="#4f8c3c" stroke-width="1.6"><circle cx="-7" cy="-4" r="7"/><circle cx="7" cy="-4" r="7"/><circle cx="0" cy="-13" r="7"/></g>',
  fish: '<path d="M-18 0Q-6 -11 10 -3L19 -10L17 0L19 10L10 3Q-6 11 -18 0Z" fill="#8fc2e0" stroke="#4f86a8" stroke-width="2" stroke-linejoin="round"/><circle cx="-10" cy="-1.5" r="1.8" fill="#24333d"/>',
  cookie: '<circle r="15" fill="#dba468" stroke="#a8743d" stroke-width="2"/><g fill="#5c3a22"><circle cx="-5" cy="-3" r="2.2"/><circle cx="5" cy="5" r="2.2"/><circle cx="4" cy="-6" r="1.8"/><circle cx="-6" cy="6" r="1.8"/></g>',
  watermelon: '<path d="M-18 -4A18 18 0 0 0 18 -4Z" fill="#ef5f63" stroke="#3f8a45" stroke-width="4" stroke-linejoin="round"/><g fill="#2a1b17"><circle cx="-7" cy="1" r="1.6"/><circle cx="0" cy="5" r="1.6"/><circle cx="7" cy="1" r="1.6"/></g>',
  party: '<path d="M-12 16L0 -16L12 16Z" fill="#f4a1b5" stroke="#a35d6e" stroke-width="2" stroke-linejoin="round"/><g fill="#fff"><circle cx="-3" cy="6" r="2"/><circle cx="4" cy="-2" r="2"/></g><circle cx="0" cy="-17" r="4.5" fill="#ffd36b"/>',
  beanie: '<path d="M-16 8A16 16 0 0 1 16 8Z" fill="#9fc1e6" stroke="#6f93b8" stroke-width="2"/><rect x="-18" y="6" width="36" height="8" rx="4" fill="#9fc1e6" stroke="#6f93b8" stroke-width="2"/><circle cx="0" cy="-11" r="5" fill="#f6f1e6" stroke="#cfc6b6" stroke-width="1.5"/>',
  crown: '<path d="M-16 12V-6L-8 2L0 -12L8 2L16 -6V12Z" fill="#e9b949" stroke="#b48a2a" stroke-width="2" stroke-linejoin="round"/><circle cx="0" cy="5" r="3" fill="#ef5f6f"/>',
  santa: '<path d="M-14 12C-12 -6 6 -16 18 -8L12 0C8 -4 2 -2 0 12Z" fill="#d9493f" stroke="#9f2f28" stroke-width="2" stroke-linejoin="round"/><rect x="-16" y="9" width="32" height="8" rx="4" fill="#fff" stroke="#d8d2cc" stroke-width="1.5"/><circle cx="18" cy="-8" r="5" fill="#fff" stroke="#d8d2cc" stroke-width="1.5"/>',
  bow: '<path d="M0 0L-16 -10V10Z M0 0L16 -10V10Z" fill="#f28aa0" stroke="#c96f78" stroke-width="2" stroke-linejoin="round"/><circle r="4.5" fill="#f28aa0" stroke="#c96f78" stroke-width="2"/>',
  glasses: '<g fill="#e7f4ff" stroke="#2b2b33" stroke-width="2.6"><circle cx="-9" cy="0" r="7.5"/><circle cx="9" cy="0" r="7.5"/></g><path d="M-1.5 -1H1.5" stroke="#2b2b33" stroke-width="2.6"/>',
  none: '<path d="M-11 -11L11 11M11 -11L-11 11" stroke="#b08a7a" stroke-width="3.5" stroke-linecap="round"/>',
};
const tray = $('tray'), items = $('items');
let trayKind = null;
const HINT = {
  food: ['Перетащи вкусняшку на Шкета, Маню или Пингвина', 'Теперь тапни того, кого угощаем'],
  wear: ['Перетащи вещь на героя — наденется. Ещё раз — снимется', 'Теперь тапни того, кого наряжаем'],
};
function openTray(kind) {
  trayKind = kind;
  const list = kind === 'food' ? S.FOODS : S.WEAR;
  items.innerHTML = list.map(f => `<button class="food" type="button" data-item="${f.id}"><svg viewBox="-24 -24 48 48" aria-hidden="true">${ICON[f.id]}</svg>${f.short || f.name}</button>`).join('');
  items.style.gridTemplateColumns = `repeat(${Math.min(list.length, kind === 'food' ? 5 : 4)}, 1fr)`;
  tray.hidden = false;
  setPicked(null);
}
function setPicked(id) {
  picked = id ? { tray: trayKind, id } : null;
  items.querySelectorAll('.food').forEach(b => b.classList.toggle('picked', b.dataset.item === id));
  if (trayKind) $('trayHint').textContent = HINT[trayKind][id ? 1 : 0];
}
$('btnFeed').addEventListener('click', () => openTray('food'));
$('btnWear').addEventListener('click', () => openTray('wear'));
$('trayClose').addEventListener('click', () => { tray.hidden = true; trayKind = null; setPicked(null); });

let drag = null;
items.addEventListener('pointerdown', e => {
  const b = e.target.closest('.food');
  if (!b) return;
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
    const id = WD.pickHero(e.clientX, e.clientY);
    if (id) use(id, { tray: trayKind, id: d.id });
  } else {
    setPicked(picked && picked.id === d.id ? null : d.id);
  }
});
items.addEventListener('pointercancel', () => { if (drag && drag.ghost) drag.ghost.remove(); drag = null; });

function use(heroId, it) {
  if (it.tray === 'wear') wear(heroId, it.id); else feed(heroId, it.id);
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
function wear(id, item) {
  const def = S.WEAR.find(w => w.id === item);
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

/* ---------- прятки ---------- */
function startHide() {
  tray.hidden = true; setPicked(null);
  let spot;
  do { spot = Math.floor(Math.random() * S.HIDE_SPOTS.length); } while (game && spot === game.spot && S.HIDE_SPOTS.length > 1);
  mode = 'hide';
  game = { spot, tries: 0, found: false };
  WD.stage(S.hideSetup(spot), ctxNow({}));
  setCaption('Прятки', 'Шкет спрятался где-то в комнате. Тапай, где он может быть: Маня и Пингвин подскажут, тепло или холодно.', { buttons: [['giveup', 'Сдаюсь'], ['exit', 'Хватит']] });
  setBar();
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
$('gameBtns').addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b || mode !== 'hide') return;
  if (b.dataset.act === 'giveup') hideFound(true);
  else if (b.dataset.act === 'again') startHide();
  else show(false);
});
$('btnHide').addEventListener('click', () => { if (mode === 'hide') show(false); else startHide(); });

/* ---------- уложить спать ---------- */
$('btnSleep').addEventListener('click', () => {
  tray.hidden = true; setPicked(null);
  if (mode === 'sleep') { show(true); greet(S.WAKE); return; }
  mode = 'sleep'; game = null;
  setChrome('night');
  WD.stage(S.sleepSetup, ctxNow({}));
  setCaption('Спокойной ночи', 'Тсс… Все легли спать. Шкет, как всегда, устроился сверху. Тапни, если очень надо кого-то разбудить.');
  setBar();
});

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
  // снимки по одному за кадр, чтобы телефон не подвисал
  const todo = S.SCENES.filter(s => seen[s.id] && !thumbs[s.id]);
  const step = () => {
    if (album.hidden || !todo.length) { finishSnaps(); return; }
    const s = todo.shift();
    thumbs[s.id] = WD.snapshot(s.setup, thumbCtx(s, seen[s.id]), 300, 450);
    const card = albumBody.querySelector(`[data-scene="${s.id}"] .thumb`);
    if (card) card.innerHTML = `<img src="${thumbs[s.id]}" alt="">`;
    requestAnimationFrame(step);
  };
  snapping = true;
  requestAnimationFrame(step);
}
let snapping = false;
function finishSnaps() {
  if (!snapping) return;
  snapping = false;
  WD.restoreSize();
  restage();
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
Promise.race([fontReady, new Promise(r => setTimeout(r, 1500))]).then(arrive, arrive);

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* без офлайна тоже работает */ });
}
})();
