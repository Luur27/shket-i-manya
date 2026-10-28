/* Шкет и Маня — сцены. Каждая сцена: когда может выпасть, что написано и как всё расставлено в 3D-комнате.
   setup(W, c): W.pose(герой, поза) и W.P.<предмет>(...). Координаты: x — влево/вправо, z — к нам, верх матраса W.TOP.
   Всё личное (имя, дата, прозвища, подписи) — в CONFIG, чтобы править в одном месте. */
(function () {
'use strict';

const CONFIG = {
  name: 'Вета',
  from: ['Женя', 'Попка-карамелька'], // подпись в записках — как Вета его называет, выбирается случайно
  since: [2025, 6, 19],         // живут вместе с 19 июля 2025 (месяц с нуля: 6 = июль)
  penguin: 'Пингвин',
  nicks: ['тефтелька', 'фрикаделька', 'кошка', 'львёнок', 'принцесса', 'чебупелька'],
  cheeky: ['попка', 'писька', 'попка-фрикаделька', 'писька-фрикаделька', 'тефтеля', 'фрикаделька', 'кошка', 'львёнок', 'принцесса', 'чебупелька'],
};

/* ---------- мелочи ---------- */
function plural(n, f) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return f[2];
  if (b > 1 && b < 5) return f[1];
  if (b === 1) return f[0];
  return f[2];
}
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const pick = (arr, r = Math.random()) => arr[Math.floor(r * arr.length)];
function monthsTogether(d) {
  const [y, m, day] = CONFIG.since;
  let n = (d.getFullYear() - y) * 12 + (d.getMonth() - m);
  if (d.getDate() < day) n--;
  return n;
}
function daysTogether(d) {
  const [y, m, day] = CONFIG.since;
  return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(y, m, day)) / 86400000);
}
function makeCtx(o) {
  const now = o.now || new Date();
  const seed = o.seed == null ? Math.random() : o.seed;
  return {
    tod: o.tod, now, away: o.away || 0, first: !!o.first, variant: o.variant || '',
    months: monthsTogether(now), years: now.getFullYear() - CONFIG.since[0],
    nick: pick(CONFIG.nicks, seed), cheeky: pick(CONFIG.cheeky, (seed * 7.31) % 1), sign: pick(CONFIG.from, (seed * 3.71) % 1),
  };
}
const P = () => CONFIG.penguin;
const HR = 3600e3;
const evening = c => c.tod === 'evening' || c.tod === 'night';
const months = n => `${n} ${plural(n, ['месяц', 'месяца', 'месяцев'])}`;
const years = n => `${n} ${plural(n, ['год', 'года', 'лет'])}`;

/* ---------- сцены ---------- */
const SCENES = [
  {
    id: 'hello', title: 'Знакомство', rarity: 'common', hint: 'при первом заходе',
    when: () => false,
    text: c => `Привет, ${CONFIG.name}! Это мы — Шкет, Маня и ${P()}. Теперь мы живём ещё и здесь. Уходи сколько хочешь: когда вернёшься, мы будем чем-нибудь заняты.`,
    setup: W => {
      W.pose('manya', { eyes: 'happy', arms: ['down', 'wave'] });
      W.pose('shket', { eyes: 'happy', ry: -1.4 });
      W.pose('peng', { eyes: 'happy', flips: ['down', 'wave'] });
      W.P.hearts([[-0.5, 2.0, 0], [0.4, 2.3, 0], [1.5, 2.5, -0.2]]);
    },
  },
  {
    id: 'cuddle', title: 'Обнимашки', rarity: 'common',
    when: () => true,
    text: c => `Шкет и Маня обнимались — говорят, тренировались к твоему приходу. ${P()} делает вид, что ему всё равно. Ему не всё равно.`,
    setup: W => {
      W.pose('manya', { x: -0.55, z: -0.15, ry: 0.4, eyes: 'happy', arms: ['hug', 'hug'] });
      W.pose('shket', { x: -0.4, z: 0.42, ry: -1.9, eyes: 'happy' });
      W.pose('peng', { x: 1.2, z: -0.25, ry: -0.6, eyes: 'wide', flips: ['down', 'out'] });
      W.P.hearts([[-0.7, 1.9, 0.1], [-0.2, 2.1, 0.1]]);
    },
  },
  {
    id: 'movie', title: 'Кино без тебя', rarity: 'common', hint: 'вечером',
    when: evening,
    text: c => `Включили кино без тебя. Шкет клянётся, что дальше начала не смотрел. Попкорн съел тоже не он. ${P()} плакал на грустном месте, но просит никому не говорить.`,
    setup: W => {
      W.pose('manya', { x: -0.95, z: -0.35, ry: 0.15, eyes: 'wide', arms: ['hug', 'hug'] });
      W.pose('shket', { x: 0.05, z: -0.3, ry: -1.57, eyes: 'wide' });
      W.pose('peng', { x: 1.0, z: -0.35, ry: -0.15, eyes: 'wide' });
      W.P.laptopBack(0.05, 0.42, 0.85);
      W.P.popcorn(1.0, 0.5);
      W.P.screenLight(0.05, W.TOP + 0.45, 0.4);
    },
  },
  {
    id: 'pillow', title: 'Маня-подушка', rarity: 'common', hint: 'ночью или утром',
    when: c => c.tod === 'night' || c.tod === 'morning',
    text: c => `Шкет уснул на Мане, как на подушке. Маня не шевелится уже два часа — боится разбудить. ${P()} опять в ногах и всё это запоминает.`,
    setup: W => {
      W.pose('manya', { x: -0.6, z: -0.35, ry: 0.15, eyes: 'closed', arms: ['hug', 'hug'], anim: 'sleep' });
      W.pose('shket', { x: -0.55, z: 0.1, y: W.TOP + 0.14, ry: -1.57, s: 0.62, eyes: 'closed', anim: 'sleep' });
      W.pose('peng', { x: 1.35, z: 0.6, s: 0.66, eyes: 'grumpy', lie: 'side' });
      W.P.zzz(-0.25, 1.3, 0.2);
    },
  },
  {
    id: 'tangerine', title: 'Мандариновая шапочка', rarity: 'common',
    when: () => true,
    text: c => `Шкет положил мандаринку на голову и сидит. Говорит, у капибар так принято. Маня в шоке. ${P()} завидует: у него мандаринка скатывается.`,
    setup: W => {
      W.pose('shket', { x: 0, z: 0.45, ry: -1.4, eyes: 'happy', onHead: 'tangerine' });
      W.pose('manya', { eyes: 'wide', arms: ['down', 'out'] });
      W.pose('peng', { eyes: 'grumpy' });
      W.P.tangerine(0.75, W.TOP, 0.5, 0.09);
    },
  },
  {
    id: 'window', title: 'Ждали у окна', rarity: 'common', hint: 'если не заходить пару часов',
    when: c => c.away >= 3 * HR, boost: c => c.away >= 3 * HR,
    text: c => `Сидели у окна и высматривали тебя. Маня дважды приняла голубя за тебя. ${P()} сказал, что не ждал. Ждал больше всех.`,
    setup: W => {
      W.sky({ pigeon: true });
      W.pose('manya', { x: 0.0, z: -0.5, ry: 1.9, eyes: 'open' });
      W.pose('shket', { x: -0.7, z: 0.2, ry: 0.67, eyes: 'wide' });
      W.pose('peng', { x: 1.25, z: -0.55, ry: 2.3, eyes: 'wide' });
    },
  },
  {
    id: 'tea', title: 'Чаепитие', rarity: 'common', hint: 'днём',
    when: c => c.tod !== 'night',
    text: c => `Устроили чаепитие. Розовую чашку не трогают — это твоя. ${P()} третий раз спрашивает, когда ты придёшь.`,
    setup: W => {
      W.pose('manya', { eyes: 'happy', arms: ['down', 'hold'] });
      W.pose('shket', { x: 0.05, z: -0.3, ry: -1.57, eyes: 'open' });
      W.pose('peng', { eyes: 'open' });
      W.P.teapot(-0.45, 0.62); W.P.cup(-0.05, 0.75); W.P.cup(0.3, 0.7); W.P.cup(0.65, 0.6, '#f6c6cf', true);
      W.P.hearts([[0.65, W.TOP + 0.45, 0.6]], 0.16);
      W.P.cookies(-1.0, 0.75);
    },
  },
  {
    id: 'hide', title: 'Прятки', rarity: 'common',
    when: () => true,
    text: c => `Играют в прятки. Шкет спрятался под одеяло, но уши торчат. ${P()} спрятался за маленькой подушкой и уверен, что его не видно. Маня честно считает до ста.`,
    setup: W => {
      W.pose('manya', { eyes: 'closed', arms: ['eyes', 'eyes'] });
      W.pose('shket', { x: 0.1, z: 0.15, ry: -1.3, s: 0.8, eyes: 'closed' });
      W.P.lump(0.1, 0.3, 0.78, 0.58, 0.66);
      W.pose('peng', { eyes: 'happy' });
      W.P.pillow(1.05, W.TOP + 0.28, 0.32, 0.32, 0.22, 0.12, '#f6e1e5');
    },
  },
  {
    id: 'book', title: 'Сказка на ночь', rarity: 'common', hint: 'вечером',
    when: evening,
    text: c => `Маня читает сказку на ночь. Шкет уснул на второй странице, но просит не останавливаться. А ${P()} больше всего любит место про море.`,
    setup: W => {
      W.pose('manya', { x: 0, z: -0.3, ry: 0, eyes: 'open', arms: ['hold', 'hold'] });
      W.P.book(0, W.TOP + 0.66, 0.14, 0.45, Math.PI);
      W.pose('shket', { x: -1.15, z: 0.35, ry: -1.0, eyes: 'closed', anim: 'sleep' });
      W.P.zzz(-0.95, 1.0, 0.35);
      W.pose('peng', { x: 1.15, eyes: 'happy' });
    },
  },
  {
    id: 'strike', title: 'Забастовка', rarity: 'common',
    when: () => true,
    text: c => `${P()} объявил забастовку: он больше не подставка для ног. Требования — своя подушка и уважение. Шкет и Маня обдумывают.`,
    setup: W => {
      W.pose('peng', { x: 0.25, z: -0.1, ry: -0.1, eyes: 'grumpy', flips: ['down', 'up'] });
      W.P.sign(1.2, 0.05, ['Я НЕ', 'ПОДСТАВКА!']);
      W.pose('shket', { x: -0.55, z: 0.5, ry: -1.0, eyes: 'wide' });
      W.pose('manya', { x: -1.25, z: -0.3, ry: 0.45, eyes: 'wide', arms: ['hug', 'hug'] });
    },
  },
  {
    id: 'dance', title: 'Дискотека', rarity: 'common', hint: 'вечером',
    when: evening,
    text: c => `Включили музыку и танцуют. Маня — красиво, ${P()} — с достоинством, Шкет — как может.`,
    setup: W => {
      W.pose('manya', { eyes: 'happy', arms: ['up', 'up'], anim: 'hop' });
      W.pose('shket', { eyes: 'happy', ry: -1.4, anim: 'wiggle' });
      W.pose('peng', { eyes: 'happy', flips: ['up', 'up'], anim: 'wiggle' });
      W.P.notes(-0.8, 2.1, 0);
    },
  },
  {
    id: 'box', title: 'Шкет обиделся', rarity: 'common', hint: 'если не заходить пару дней',
    when: c => c.away >= 36 * HR, boost: () => true,
    text: c => `Тебя долго не было, и Шкет обиделся: сидит в коробке. Маня говорит, мандаринка поможет. Попробуй его покормить.`,
    setup: (W, c) => {
      if (c.variant === 'resolved') {
        W.pose('shket', { x: -0.45, z: 0.5, ry: -1.6, eyes: 'happy' });
        W.P.box(0.6, 0.5, 'ОБИЖЕН', true);
        W.pose('manya', { eyes: 'happy', arms: ['up', 'up'] });
        W.pose('peng', { eyes: 'happy' });
        W.P.hearts([[-0.45, 1.3, 0.5], [0.0, 1.5, 0.4]]);
        return;
      }
      W.P.box(-0.05, 0.42, 'ОБИЖЕН');
      W.pose('shket', { x: -0.05, z: 0.4, ry: -1.57, s: 0.7, eyes: 'grumpy' });
      W.pose('manya', { x: -1.15, eyes: 'open', arms: ['down', 'hold'] });
      W.P.tangerine(-0.82, W.TOP + 0.52, 0.24, 0.08);
      W.pose('peng', { x: 1.15, eyes: 'wide' });
    },
    resolved: { char: 'shket', text: c => `Отошёл! Мандаринка — лучшее извинение. Коробку Шкет оставил: вдруг ещё пригодится.` },
  },
  {
    id: 'fort', title: 'Подушечная крепость', rarity: 'common', hint: 'если не заходить сутки',
    when: c => c.away >= 20 * HR, boost: () => true,
    text: c => `Пока тебя не было, построили крепость из подушек. На флаге — «Ждём Вету». Пароль — обнимашки. ${P()} стоит на страже.`,
    setup: W => {
      W.P.pillow(-0.8, W.TOP + 0.36, 0.15, 0.2, 0.4, 0.42);
      W.P.pillow(0.8, W.TOP + 0.36, 0.15, 0.2, 0.4, 0.42, '#f3efe8');
      W.P.roof(0, 0.15, 0.82, 0.95);
      W.P.flag(0, W.TOP + 1.3, 0.15, 'Ждём Вету');
      W.pose('manya', { x: -0.3, z: 0.1, s: 0.55, eyes: 'happy' });
      W.pose('shket', { x: 0.3, z: 0.3, s: 0.55, ry: -1.57, eyes: 'happy' });
      W.pose('peng', { x: 1.45, z: -0.1, s: 0.78, eyes: 'grumpy' });
      W.P.note(-1.3, 0.85, ['мы скучали'], 0.25);
    },
  },
  {
    id: 'throne', title: 'Месть Пингвина', rarity: 'rare',
    when: () => true,
    text: c => `Пока никого нет, ${P()} спит на твоей подушке, а Шкета с Маней положил в ногах. Говорит, это восстановление справедливости.`,
    setup: W => {
      W.pose('peng', { x: 0.05, z: -0.95, y: W.TOP + 0.3, s: 0.78, lie: 'side', eyes: 'closed', anim: 'sleep' });
      W.P.zzz(-1.15, 1.45, -0.8);
      W.pose('manya', { x: 0.75, z: 0.35, s: 0.7, ry: -0.5, eyes: 'grumpy', arms: ['hug', 'hug'] });
      W.pose('shket', { x: 1.3, z: 0.6, ry: -2.6, s: 0.7, eyes: 'grumpy' });
    },
  },
  {
    id: 'sick', title: 'Больничка', rarity: 'rare',
    when: () => true,
    text: c => `Играют в больничку. Маню положили под капельницу с компотом, а Шкет держит её за ручку — как тогда держал тебя. Говорит, у него опыт.`,
    setup: W => {
      W.pose('manya', { x: 0.35, z: -0.55, s: 0.8, lie: 'side', eyes: 'open' });
      W.P.ivStand(-1.55, -0.45, -0.25, W.TOP + 0.45, -0.3);
      W.pose('shket', { x: 0.3, z: 0.4, ry: -2.6, eyes: 'open', hat: 'nurse' });
      W.pose('peng', { x: 1.5, z: -0.3, ry: -0.5, eyes: 'wide' });
      W.P.hearts([[-0.1, 1.3, 0]]);
    },
  },
  {
    id: 'meatball', title: 'В гости заходила тефтеля', rarity: 'rare',
    when: () => true,
    text: c => `Заходила Злая тефтеля. Ворчала, требовала подливы. Шкет предложил ей мандаринку — не помогло. ${P()} спрятался за Маню.`,
    setup: W => {
      W.P.meatball(0.15, 0.55, 0.32);
      W.pose('shket', { x: -0.9, z: 0.45, ry: -0.5, eyes: 'open' });
      W.P.tangerine(-0.3, W.TOP, 0.78, 0.08);
      W.pose('manya', { x: 0.95, z: -0.25, ry: -0.3, eyes: 'wide', arms: ['hug', 'hug'] });
      W.pose('peng', { x: 1.55, z: -0.8, ry: -0.5, eyes: 'wide' });
    },
  },
  {
    id: 'onsen', title: 'Мандариновая ванна', rarity: 'rare',
    when: () => true,
    text: c => `Шкет устроил себе ванну с мандаринками, как настоящая японская капибара. Маня охраняет полотенце. ${P()} ждёт очередь, но вода тёплая, а он за холодную.`,
    setup: W => {
      W.P.tub(-0.35, 0.35, 0.62);
      W.pose('shket', { x: -0.35, z: 0.35, y: W.TOP + 0.08, ry: -1.4, s: 0.78, eyes: 'closed', onHead: 'tangerine' });
      W.pose('manya', { x: 0.85, z: -0.2, ry: -0.25, eyes: 'happy' });
      W.P.towel(0.95, 0.62);
      W.pose('peng', { x: 1.6, z: -0.7, ry: -0.5, eyes: 'grumpy' });
    },
  },

  /* ---------- особые дни ---------- */
  {
    id: 'month', title: 'Наше 19-е', rarity: 'special', hint: 'откроется 19-го числа',
    when: c => c.now.getDate() === CONFIG.since[2] && c.now.getMonth() !== CONFIG.since[1] && c.months >= 1,
    text: c => `Сегодня 19-е: ${months(c.months)} как вы живёте вместе. Шкет, Маня и ${P()} испекли торт. Свечку задуваешь ты.`,
    note: c => `${cap(c.cheeky)}, ${months(c.months)} вместе. Спасибо, что ты у меня есть. Люблю тебя.`,
    setup: (W, c) => {
      W.P.banner(`${months(c.months)}!`);
      W.pose('manya', { eyes: 'happy', arms: ['down', 'wave'], hat: 'party' });
      W.pose('shket', { x: -0.35, z: 0.5, eyes: 'happy', hat: 'party', hatColor: '#9fe0c8' });
      W.pose('peng', { eyes: 'happy', hat: 'party', hatColor: '#ffd36b' });
      W.P.cake(0.5, 0.62); W.P.confetti(40);
    },
  },
  {
    id: 'anniversary', title: 'Годовщина', rarity: 'special', hint: 'откроется 19 июля',
    when: c => c.now.getDate() === CONFIG.since[2] && c.now.getMonth() === CONFIG.since[1] && c.years >= 1,
    text: c => `${years(c.years)} вместе! Все надели колпаки, ${P()} даже простил тебе ноги. Ждут только тебя.`,
    note: c => `${years(c.years)} с тобой — лучшее, что со мной было. Моя ${c.cheeky}, люблю тебя.`,
    setup: (W, c) => {
      W.P.banner(`${years(c.years)} вместе!`, '#c7a4f0');
      W.pose('manya', { eyes: 'happy', arms: ['up', 'up'], hat: 'party' });
      W.pose('shket', { x: -0.35, z: 0.5, eyes: 'happy', hat: 'party', hatColor: '#9fe0c8' });
      W.pose('peng', { eyes: 'happy', flips: ['down', 'wave'], hat: 'party', hatColor: '#ffd36b' });
      W.P.cake(0.5, 0.62); W.P.confetti(70);
    },
  },
  {
    id: 'newyear', title: 'Новый год', rarity: 'special', hint: 'откроется под Новый год',
    when: c => (c.now.getMonth() === 11 && c.now.getDate() >= 25) || (c.now.getMonth() === 0 && c.now.getDate() <= 7),
    text: c => `Нарядили ёлку. Шкет хотел быть звездой на макушке, Маня уговорила его быть просто шариком. ${P()} счастлив: наконец-то нормальная погода.`,
    note: c => `С Новым годом, ${c.nick}! Пусть он будет тёплым, как Маня, и сладким, как мандаринки Шкета.`,
    setup: W => {
      W.sky({ snow: true });
      W.P.tree(-1.75, -0.55);
      W.pose('manya', { x: -0.65, eyes: 'happy', arms: ['down', 'wave'], hat: 'santa' });
      W.pose('shket', { x: 0.15, eyes: 'happy', hat: 'santa' });
      W.pose('peng', { eyes: 'happy', hat: 'santa' });
    },
  },
  {
    id: 'feb14', title: '14 февраля', rarity: 'special', hint: 'откроется 14 февраля',
    when: c => c.now.getMonth() === 1 && c.now.getDate() === 14,
    text: c => `День всех влюблённых. Шкет надул сердечко, Маня покраснела, ${P()} сказал «фу», но в открытке подписался первым.`,
    note: c => `Ты моя валентинка, ${c.cheeky}.`,
    setup: W => {
      W.P.balloon(0.15, 2.05, 0.35, 0.05, W.TOP + 0.62, 0.5);
      W.pose('manya', { eyes: 'happy', arms: ['hug', 'hug'] });
      W.pose('shket', { eyes: 'happy', ry: -1.5 });
      W.pose('peng', { eyes: 'grumpy' });
      W.P.hearts([[-1.2, 2.0, 0], [1.0, 2.4, -0.2], [-0.4, 2.5, -0.3]]);
    },
  },
  {
    id: 'mar8', title: '8 Марта', rarity: 'special', hint: 'откроется 8 марта',
    when: c => c.now.getMonth() === 2 && c.now.getDate() === 8,
    text: c => `Нарвали тебе цветов. Где — не говорят. ${P()} настаивает, что жёлтый выбирал он.`,
    note: c => `С 8 Марта, ${c.nick}! Ты у меня самая-самая.`,
    setup: W => {
      W.P.bouquet(0.25, 0.6, CONFIG.name);
      W.pose('manya', { eyes: 'happy', arms: ['down', 'out'] });
      W.pose('shket', { x: -0.45, z: 0.5, eyes: 'happy' });
      W.pose('peng', { eyes: 'happy' });
    },
  },
];

/* ---------- прятки: где может сидеть Шкет ---------- */
const HIDE_SPOTS = [
  { where: 'на подушке за Маней', shket: { x: -0.55, z: -1.05, y: 0.5, ry: -1.2, s: 0.55 } },
  { where: 'на подоконнике', shket: { x: 0.93, z: -1.45, y: 1.54, ry: -1.0, s: 0.3 } },
  { where: 'за одеялом', shket: { x: 0.9, z: 0.82, ry: -1.57, s: 0.55 } },
  { where: 'за Пингвином', shket: { x: 1.25, z: -0.8, ry: -1.2, s: 0.62 } },
  { where: 'на полке', shket: { x: -1.72, z: -1.42, y: 2.08, ry: -1.57, s: 0.28 } },
  { where: 'за Маней', shket: { x: -1.25, z: -0.7, ry: -1.3, s: 0.6 } },
];
function hideSetup(spot) {
  return W => {
    W.pose('manya', { eyes: 'open' });
    W.pose('peng', { eyes: 'happy' });
    W.pose('shket', Object.assign({ eyes: 'happy' }, HIDE_SPOTS[spot].shket));
  };
}
/* ---------- уложить спать ---------- */
function sleepSetup(W) {
  W.sky({ tod: 'night' });
  W.pose('manya', { x: -0.9, z: -0.5, ry: 0.2, eyes: 'closed', arms: ['hug', 'hug'], anim: 'sleep' });
  W.pose('peng', { x: 1.0, z: -0.5, ry: -0.2, eyes: 'closed', anim: 'sleep' });
  W.P.blanket();
  W.pose('shket', { x: 0.05, z: 0.3, y: W.TOP + 0.62, ry: -1.57, s: 0.7, eyes: 'closed', anim: 'sleep' });
  W.P.zzz(-0.75, 1.65, -0.4); W.P.zzz(1.15, 2.05, -0.4); W.P.zzz(0.2, 1.35, 0.3);
}

/* ---------- квартира: комнаты, их раскладки и занятия ---------- */
const ROOMS = [
  { id: 'bedroom', name: 'Спальня', ready: true, text: 'Спальня — тут мы живём. Можно нарядиться, поиграть в прятки или лечь спать.' },
  { id: 'kitchen', name: 'Кухня', ready: true, text: 'Кухня. Пахнет мандаринами. Приготовим что-нибудь вместе?' },
  { id: 'bath', name: 'Ванная', ready: true, text: 'Ванная. Пахнет пеной. Кого искупаем? А ещё тут живут резиновые уточки.' },
  { id: 'balcony', name: 'Балкон', ready: true, text: 'Балкон. Тут растут наши цветы — поливай их каждый день, и они расцветут. Можно пускать пузыри.' },
  { id: 'hall', name: 'Коридор', ready: true, text: 'Коридор. Большое зеркало — можно сфотографироваться всем вместе.' },
  { id: 'pantry', name: 'Кладовая', ready: true, text: 'Кладовая. Тут стоит сундук: каждый день в нём что-то новое.' },
];
const LAYOUT = {
  bedroom: W => { W.pose('manya', {}); W.pose('shket', { ry: -1.4 }); W.pose('peng', {}); },
  kitchen: W => {
    W.pose('manya', { x: -0.95, z: -0.3, ry: 0.3 });
    W.pose('shket', { x: -0.1, z: -0.2, ry: -1.57 });
    W.pose('peng', { x: 0.95, z: -0.35, ry: -0.3 });
  },
  bath: W => {
    W.pose('manya', { x: -1.05, z: 0.25, ry: 0.35 });
    W.pose('shket', { x: 0.05, z: 0.55, ry: -1.5 });
    W.pose('peng', { x: 1.1, z: 0.2, ry: -0.35 });
  },
  balcony: W => {
    W.pose('manya', { x: -1.0, z: 0.0, ry: 0.3 });
    W.pose('shket', { x: 0.0, z: 0.5, ry: -1.4 });
    W.pose('peng', { x: 1.0, z: -0.05, ry: -0.3 });
  },
  hall: W => {
    W.pose('manya', { x: -0.95, z: 0.0, ry: 0.3 });
    W.pose('shket', { x: 0.05, z: 0.5, ry: -1.5 });
    W.pose('peng', { x: 0.95, z: -0.05, ry: -0.3 });
  },
  pantry: W => {
    W.pose('manya', { x: -1.15, z: -0.1, ry: 0.5 });
    W.pose('shket', { x: -0.75, z: 0.75, ry: -0.6 });
    W.pose('peng', { x: 1.1, z: -0.1, ry: -0.45 });
  },
};
/* ванная: выбранный герой сидит в воде, остальные смотрят спереди */
function bathSetup(id) {
  const front = { manya: { x: -1.05, z: 0.3, ry: 0.4 }, shket: { x: 0.05, z: 0.55, ry: -1.5 }, peng: { x: 1.1, z: 0.25, ry: -0.4 } };
  // в ванне Маня опускает ноги, а длинный Шкет ложится вдоль ванны — чтобы никто не торчал сквозь стенку
  const tub = { manya: { ry: 0, legs: 'down', z: -0.9 }, shket: { ry: -0.25, s: 0.8 }, peng: { ry: 0, s: 0.75 } };
  return W => ['manya', 'shket', 'peng'].forEach(h => {
    if (h === id) W.pose(h, Object.assign({ x: 0, z: -0.8, y: W.TOP + 0.22, eyes: 'happy' }, tub[h]));
    else W.pose(h, Object.assign({ eyes: 'open' }, front[h], id === 'shket' && h !== 'shket' ? {} : id !== 'shket' && h === 'shket' ? { x: id === 'manya' ? -0.6 : 0.6 } : {}));
  });
}
/* коридор: все вместе обнимаются посередине */
function hugSetup(W) {
  W.pose('manya', { x: -0.38, z: 0.0, ry: 0.55, eyes: 'happy', arms: ['hug', 'hug'] });
  W.pose('peng', { x: 0.42, z: -0.05, ry: -0.55, eyes: 'happy', flips: ['down', 'out'] });
  W.pose('shket', { x: 0.02, z: 0.45, ry: -1.57, eyes: 'happy' });
}
/* куда смотрят герои на кухне: на духовку (пока печётся) или на готовое блюдо */
const KITCHEN_LOOK = {
  oven: W => {
    W.pose('manya', { x: -0.95, z: -0.3, ry: 2.6, eyes: 'wide' });
    W.pose('shket', { x: -0.1, z: -0.2, ry: 2.4, eyes: 'wide' });
    W.pose('peng', { x: 0.95, z: -0.35, ry: -2.6, eyes: 'wide' });
  },
  dish: W => {
    W.pose('manya', { x: -0.95, z: -0.3, ry: 0.6, eyes: 'happy', arms: ['up', 'up'] });
    W.pose('shket', { x: -0.1, z: -0.2, ry: -1.57, eyes: 'happy' });
    W.pose('peng', { x: 0.95, z: -0.35, ry: -0.6, eyes: 'happy', flips: ['up', 'up'] });
  },
};
const ENTER = {
  bedroom: ['Дома!', 'Моя подушка на месте?', 'Спальня — лучшая комната.'],
  kitchen: ['Чем пахнет?', 'Я помогу! Наверное.', 'Где тут холодильник?', 'Кухня! Моя любимая комната.'],
  bath: ['Только не меня первого!', 'Где моя уточка?', 'Тут скользко!'],
  balcony: ['Свежий воздух!', 'Смотри, как цветы подросли!', 'Голуби тут бывают. Я видел.'],
  hall: ['Мы куда-то идём?', 'Смотри, зеркало! Это мы!', 'Сфоткаемся?'],
  pantry: ['Тут темновато…', 'Что в сундуке?', 'Пахнет вареньем.'],
  peng: ['Опять идти…', 'Я шёл последним. С достоинством.', 'Можно было и подождать пингвина.'],
};
const INGREDIENTS = {
  flour: 'Мука', milk: 'Молоко', egg: 'Яйцо', tangerine: 'Мандаринка', clover: 'Клевер', carrot: 'Морковка', apple: 'Яблоко', fish: 'Рыбка',
};
const RECIPES = [
  { id: 'pancakes', name: 'Блинчики', need: ['flour', 'milk', 'egg'], bake: true, likes: { shket: 2, manya: 2, peng: 1 } },
  { id: 'pie', name: 'Мандариновый пирог', short: 'Пирог', need: ['flour', 'egg', 'tangerine'], bake: true, likes: { shket: 2, manya: 1, peng: 1 } },
  { id: 'salad', name: 'Клеверный салат', short: 'Салат', need: ['clover', 'carrot', 'apple'], bake: false, likes: { shket: 1, manya: 2, peng: 0 } },
  { id: 'fishcakes', name: 'Рыбные котлетки', short: 'Котлетки', need: ['fish', 'flour', 'egg'], bake: true, likes: { shket: 0, manya: 0, peng: 2 } },
];
const COOK_LINES = {
  add: {
    flour: ['Мука! Апчхи!', 'Шкет весь в муке.'], milk: ['Молочко!', 'Буль-буль.'], egg: ['Яичко — аккуратно!', 'Не разбей… а, уже.'],
    tangerine: ['Мандаринка! Можно одну мне?', 'Шкет облизывается.'], clover: ['Клевер! Бе-е!', 'Самое вкусное — клевер.'],
    carrot: ['Хрум!', 'Морковка — для зрения.'], apple: ['Яблочко!', 'Красное, как моя щёчка.'], fish: ['РЫБКА!', 'Это я принёс. Ну, почти.'],
  },
  wrong: ['Это не из этого рецепта!', 'Хм, а это сюда точно?', 'Не-не, это в другой раз.'],
  stir: ['Мешаем-мешаем…', 'Кругами, кругами!', 'Я тоже хочу мешать!'],
  bake: ['Пахнет вкусно!', 'Ну скоро?', 'Не открывай, а то опадёт!'],
  done: ['Готово!', 'Ура, получилось!', 'Мы повара!'],
};

const ROOM_LINES = {
  bath: {
    into: { manya: 'Только не в глаза!', shket: 'Ванна! Мой любимый день!', peng: 'Наконец-то вода. Но тёплая…' },
    scrub: ['Щекотно!', 'Пена!', 'Ещё за ушком!', 'Хи-хи!'],
    rinse: ['Брр!', 'Как дождик!', 'Фух!'],
    dry: { manya: 'Я чистая и пушистая!', shket: 'Блестящая капибара готова.', peng: 'Свежий пингвин. Почти как из Антарктиды.' },
    duck: ['Уточка!', 'Кря!', 'Ещё одну!', 'Это моя уточка. Нет, моя!'],
    full: 'Ванна полна уточек!',
  },
  balcony: {
    water: ['Пейте, цветочки!', 'Расти большой!', 'Полили!'],
    grown: ['Смотри, подросли!', 'Скоро будет цветок!', 'Распустился!', 'Красота!'],
    again: 'Сегодня уже поливали — подрастут завтра.',
    bubbles: ['Пузыри!', 'Лови!', 'Бульк!'],
    pigeon: { manya: 'Голубь! Привет!', shket: 'Он ест наши крошки?', peng: 'А мне? Я тоже птица.' },
  },
  hall: {
    photo: ['Улыбочку!', 'Сыр!', 'Чур, я в центре!'],
    hug: ['Обнимашки!', 'Все вместе!', 'Иди к нам, {nick}!'],
  },
  pantry: {
    already: ['Сегодня сундук уже открывали.', 'Новое будет завтра. Я проверю ночью.'],
    treat: 'Тут печеньки! Всем по одной.',
  },
};
/* что может выпасть из сундука — по одной вещи в день, по порядку */
const UNLOCKS = [
  { id: 'chef', name: 'Поварской колпак', short: 'Повар', kind: 'hat' },
  { id: 'flowers', name: 'Венок из цветов', short: 'Венок', kind: 'hat' },
  { id: 'bunny', name: 'Ушки зайчика', short: 'Ушки', kind: 'hat' },
  { id: 'cap', name: 'Кепка', short: 'Кепка', kind: 'hat' },
];

/* ---------- реплики: {nick} / {Nick} — прозвище, выбирается заново на каждую реплику ---------- */
const TALK = {
  shket: ['Я не толстый, я плюшевый.', '{Nick}, ты пришла!', 'Я тебя ждал. Маня тоже, но меньше.', 'Мандаринку бы…', 'Можно я сегодня сплю в серединке?', 'Я храбрый. Я с тобой на капельницу ходил.', 'Погладь за ушком. Нет, за другим.',
    '{Nick} вернулась!', '{Nick}, почеши пузико. Ну пожалуйста.', 'Я без тебя мандарины считал. Их стало меньше.', 'Лучше тебя никого нет, {nick}.', '{Nick}, а ты меня сегодня возьмёшь с собой?'],
  manya: ['Бе-е.', 'Шкет опять занял подушку.', 'Я овечка, мне можно спать днём.', '{Nick}, обними!', 'Я тебя ждала и считала овец. Сбилась на себе.', 'Шёрстка сегодня особенно мягкая. Проверь.', 'Я не трусиха, я осторожная.',
    'Бе-е! {Nick} пришла!', 'Мы скучали, {nick}. Особенно я.', '{Nick}, ты сегодня особенно красивая.', 'Посмотрим вечером кино, {nick}?', 'Можно я сегодня сплю у тебя под щекой?'],
  peng: ['Я не подставка. Я пингвин.', 'Ноги — это не подушка. Подушка — это подушка.', '{Nick}, а меня погладить?', 'Я большой, но ранимый.', 'Холодно? Мне — нормально.', 'Шкет опять ест мандарины без меня.',
    '{Nick}, я тоже тут вообще-то.', 'Привет, {nick}. Подушку не отдам.', 'Я тебя прощаю, {nick}. Почти.', '{Nick}, сегодня спим без ног на мне. Договорились?'],
};
const HUNGRY = {
  shket: ['Я бы поел. Это намёк, {nick}.', 'Кажется, в животе урчит. Или это Маня.'],
  manya: ['Клевера бы…', 'Бе-е. Голодное бе-е, {nick}.'],
  peng: ['Рыбки не найдётся, {nick}? Спрашиваю для себя.', 'Пингвины тоже кушают, если что.'],
};
const PET = {
  shket: ['Мррр… Капибары так не умеют, но я научился.', 'Ещё, {nick}! За ушком!', 'Всё, я растаял.'],
  manya: ['Ещё, ещё! Бе-е-е!', 'Шёрстка любит, когда её гладит {nick}.', 'Маня довольна.'],
  peng: ['Ладно. Можно. Только недолго.', '…ещё чуть-чуть, {nick}.', 'Я всё ещё обижен, но гладь.'],
};
const HELLO = ['Привет, {nick}!', '{Nick} пришла!', 'Ура, {nick}!', 'О, {nick}! Мы тут как раз…'];
const FOODS = [
  { id: 'tangerine', name: 'Мандаринка' }, { id: 'clover', name: 'Клевер' }, { id: 'fish', name: 'Рыбка' },
  { id: 'cookie', name: 'Печенька' }, { id: 'watermelon', name: 'Арбуз' },
];
const LIKES = {
  shket: { tangerine: 2, watermelon: 2, cookie: 1, clover: 1, fish: 0 },
  manya: { clover: 2, cookie: 2, watermelon: 1, tangerine: 0, fish: 0 },
  peng: { fish: 2, cookie: 1, watermelon: 1, tangerine: 0, clover: 0 },
};
const FEED = {
  shket: { 2: ['Ням! Ты лучшая, {nick}!', 'Ням. А ещё есть?', 'Вот это я понимаю — забота.'], 1: ['Сойдёт. Спасибо, {nick}.', 'Съел. Но мандаринка была бы лучше.'], 0: ['Рыбу? Капибаре? {Nick}, ну ты чего.'] },
  manya: { 2: ['Бе-е-е! Вкуснятина!', 'Ты меня знаешь, {nick}.', 'Самая вкусная еда — из твоих рук.'], 1: ['Спасибо, {nick}! Бе.', 'Вкусно. А обнимашку можно?'], 0: ['Маня вежливо отказалась.', 'Это к Шкету. Или к Пингвину.'] },
  peng: { 2: ['РЫБКА! Наконец-то меня кормят.', 'Вот. Вот это уважение.', 'Рыбка! Прощаю тебе ноги. Почти.'], 1: ['Ну… спасибо. Рыбка была бы лучше.', 'Съел. Но я всё ещё не подставка.'], 0: ['Пингвины такое не едят. Запомни, {nick}.'] },
};
const WEAR = [
  { id: 'party', name: 'Колпак', kind: 'hat' }, { id: 'beanie', name: 'Шапка', kind: 'hat' }, { id: 'crown', name: 'Корона', kind: 'hat' },
  { id: 'santa', name: 'Колпак Деда Мороза', short: 'Дед Мороз', kind: 'hat' }, { id: 'bow', name: 'Бантик', kind: 'bow' }, { id: 'glasses', name: 'Очки', kind: 'glasses' },
  { id: 'none', name: 'Снять всё', short: 'Снять', kind: 'none' },
];
const WEAR_LINES = {
  shket: ['Я теперь важная капибара.', 'Сфоткай меня, {nick}!', 'Это мне? Ого.', 'Мне идёт? Скажи, что идёт.'],
  manya: ['Мне идёт? Бе-е!', 'Теперь я модная овечка.', 'Спасибо, {nick}! Покручусь перед зеркалом.'],
  peng: ['Наконец-то стиль.', 'Ладно, это я ношу.', 'Пингвин в образе. Не трогать.'],
};
const UNDRESS = { shket: 'Ну вот, был красивый…', manya: 'Бе. Без шапочки холодно.', peng: 'Верни. Мне шло.' };
const HIDE = {
  start: ['Шкет спрятался! Найдёшь?', 'Раз, два, три… Шкет спрятался!'],
  hot: ['Горячо!', 'Ой, совсем рядом!', 'Ещё чуть-чуть!'],
  warm: ['Тепло…', 'Уже теплее!'],
  cold: ['Холодно.', 'Мимо. Совсем холодно.', 'Не там, {nick}.'],
  found: ['Нашла! Как ты догадалась?', 'Ну вот, нашла. Я же так хорошо спрятался!', 'Нашла! Теперь ты водишь. Шучу.'],
};
const SLEEPY = ['Ещё пять минуточек…', 'Мне снилась ты, {nick}…', 'Zzz… рыбка…', 'Тсс… все спят.', 'Не буди, мне снится мандарин.'];
const WAKE = ['Доброе утро, {nick}!', 'Уже утро? Ура, {nick}!', 'Выспались! Спасибо, {nick}.'];

window.SCENES_API = {
  CONFIG, SCENES, byId: Object.fromEntries(SCENES.map(s => [s.id, s])),
  HIDE_SPOTS, hideSetup, sleepSetup, ROOMS, LAYOUT, KITCHEN_LOOK, ENTER, INGREDIENTS, RECIPES, COOK_LINES,
  bathSetup, hugSetup, ROOM_LINES, UNLOCKS,
  TALK, HUNGRY, PET, HELLO, FOODS, LIKES, FEED, WEAR, WEAR_LINES, UNDRESS, HIDE, SLEEPY, WAKE,
  plural, cap, pick, makeCtx, daysTogether, monthsTogether,
};
})();
