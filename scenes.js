/* Шкет и Маня — сцены. Каждая сцена: когда может выпасть, что написано, что нарисовано.
   Всё личное (имя, дата, прозвища, записки) — в CONFIG, чтобы править в одном месте. */
(function () {
'use strict';
const A = window.ART;

const CONFIG = {
  name: 'Вета',
  from: 'Женя',                 // подпись в записках
  since: [2025, 6, 19],         // живут вместе с 19 июля 2025 (месяц с нуля: 6 = июль)
  penguin: 'Пингвин',           // имя пингвина, если появится
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
  const a = Date.UTC(y, m, day), b = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((b - a) / 86400000);
}
function makeCtx(o) {
  const now = o.now || new Date();
  const seed = o.seed == null ? Math.random() : o.seed;
  return {
    uid: o.uid, tod: o.tod, now, away: o.away || 0, first: !!o.first, variant: o.variant || '',
    months: monthsTogether(now), years: now.getFullYear() - CONFIG.since[0],
    nick: pick(CONFIG.nicks, seed), cheeky: pick(CONFIG.cheeky, (seed * 7.31) % 1),
  };
}
const P = () => CONFIG.penguin;
const H = 3600e3;
const evening = c => c.tod === 'evening' || c.tod === 'night';

/* короткие вызовы героев с общими параметрами сцены */
const K = (c, o) => A.capy(Object.assign({ uid: c.uid }, o));
const M = (c, o) => A.manya(Object.assign({ uid: c.uid }, o));
const Pg = (c, o) => A.penguin(Object.assign({ uid: c.uid }, o));
const hearts = (pts, s = 0.8) => pts.map(([x, y], i) => `<g class="float" style="animation-delay:${i * 0.5}s">${A.heartShape(x, y, s)}</g>`).join('');
const party = c => K(c, { x: 238, y: 512, s: 0.78, eyes: 'happy', mouth: 'smile', hat: 'party', hatColor: '#9fe0c8' });

/* ---------- сцены ---------- */
const SCENES = [
  {
    id: 'hello', title: 'Знакомство', rarity: 'common', hint: 'при первом заходе',
    when: () => false,
    text: c => `Привет, ${CONFIG.name}! Это мы — Шкет, Маня и ${P()}. Теперь мы живём ещё и здесь. Уходи сколько хочешь: когда вернёшься, мы будем чем-нибудь заняты.`,
    draw: c => Pg(c, { x: 330, y: 516, s: 0.66, eyes: 'happy', flippers: [16, 120] })
      + M(c, { x: 118, y: 510, s: 0.78, eyes: 'happy', arms: [14, 150] })
      + K(c, { x: 230, y: 522, s: 0.82, eyes: 'happy', mouth: 'smile', pose: 'sit' })
      + hearts([[200, 380], [290, 330], [80, 330]]),
  },
  {
    id: 'cuddle', title: 'Обнимашки', rarity: 'common',
    when: () => true,
    text: c => `Шкет и Маня обнимались — говорят, тренировались к твоему приходу. ${P()} делает вид, что ему всё равно. Ему не всё равно.`,
    draw: c => Pg(c, { x: 336, y: 516, s: 0.64, eyes: 'wide', flippers: [16, 40] })
      + M(c, { x: 150, y: 506, s: 0.8, eyes: 'happy', arms: [-38, -38] })
      + K(c, { x: 168, y: 528, s: 0.74, eyes: 'happy', mouth: 'smile' })
      + hearts([[150, 330], [205, 300], [110, 300]]),
  },
  {
    id: 'movie', title: 'Кино без тебя', rarity: 'common', hint: 'вечером',
    when: evening,
    text: c => `Включили кино без тебя. Шкет клянётся, что дальше начала не смотрел. Попкорн съел тоже не он. ${P()} плакал на грустном месте, но просит никому не говорить.`,
    draw: c => Pg(c, { x: 322, y: 512, s: 0.64, eyes: 'wide' })
      + M(c, { x: 104, y: 508, s: 0.76, eyes: 'wide', arms: [-20, -20] })
      + K(c, { x: 206, y: 506, s: 0.74, eyes: 'wide', mouth: 'open' })
      + A.laptopBack(196, 590, 0.72) + A.popcorn(330, 572),
    glow: c => `<ellipse cx="200" cy="500" rx="170" ry="90" fill="url(#screen-${c.uid})" opacity=".55" class="screenglow" pointer-events="none"/>`,
  },
  {
    id: 'pillow', title: 'Маня-подушка', rarity: 'common', hint: 'ночью или утром',
    when: c => c.tod === 'night' || c.tod === 'morning',
    text: c => `Шкет уснул на Мане, как на подушке. Маня не шевелится уже два часа — боится разбудить. ${P()} опять в ногах и всё это запоминает.`,
    draw: c => M(c, { x: 150, y: 504, s: 0.82, eyes: 'closed', arms: [-30, -30] })
      + K(c, { x: 150, y: 486, s: 0.62, eyes: 'closed', pose: 'low' })
      + Pg(c, { x: 360, y: 552, s: 0.5, eyes: 'grumpy', tilt: -90 })
      + A.zzz(206, 380),
  },
  {
    id: 'tangerine', title: 'Мандариновая шапочка', rarity: 'common',
    when: () => true,
    text: c => `Шкет положил мандаринку на голову и сидит. Говорит, у капибар так принято. Маня в шоке. ${P()} завидует: у него мандаринка скатывается.`,
    draw: c => Pg(c, { x: 66, y: 516, s: 0.6, eyes: 'grumpy' })
      + M(c, { x: 300, y: 508, s: 0.76, eyes: 'wide', arms: [14, 30] })
      + K(c, { x: 168, y: 522, s: 0.86, eyes: 'happy', mouth: 'smile', onHead: 'tangerine' })
      + A.tangerine(96, 532, 9),
  },
  {
    id: 'window', title: 'Ждали у окна', rarity: 'common', hint: 'если не заходить пару часов',
    when: c => c.away >= 3 * H, boost: c => c.away >= 3 * H,
    roomOpt: () => ({ pigeon: true }),
    text: c => `Сидели у окна и высматривали тебя. Маня дважды приняла голубя за тебя. ${P()} сказал, что не ждал. Ждал больше всех.`,
    draw: c => M(c, { x: 110, y: 506, s: 0.76, eyes: 'open', arms: [14, 60] })
      + Pg(c, { x: 322, y: 512, s: 0.68, eyes: 'wide', flippers: [16, 30] })
      + K(c, { x: 214, y: 522, s: 0.8, pose: 'sit', eyes: 'wide' }),
  },
  {
    id: 'tea', title: 'Чаепитие', rarity: 'common', hint: 'днём',
    when: c => c.tod !== 'night',
    text: c => `Устроили чаепитие. Розовую чашку не трогают — это твоя. ${P()} третий раз спрашивает, когда ты придёшь.`,
    draw: c => M(c, { x: 92, y: 506, s: 0.7, eyes: 'happy', arms: [-24, 14] })
      + Pg(c, { x: 332, y: 512, s: 0.6, eyes: 'open' })
      + K(c, { x: 214, y: 506, s: 0.7, eyes: 'open', mouth: 'smile' })
      + A.teapot(150, 566) + A.cup(214, 572) + A.cup(262, 574, '#fff') + A.cup(312, 578, '#f6c6cf', true)
      + A.heartShape(312, 532, 0.6) + A.plate(100, 580, A.cookie(88, 574, 9) + A.cookie(108, 576, 9)),
  },
  {
    id: 'hide', title: 'Прятки', rarity: 'common',
    when: () => true,
    text: c => `Играют в прятки. Шкет спрятался под одеяло, но уши торчат. ${P()} спрятался за маленькой подушкой и уверен, что его не видно. Маня честно считает до ста.`,
    draw: c => M(c, { x: 96, y: 506, s: 0.72, eyes: 'closed', arms: [-162, -162], armsOver: true })
      + K(c, { x: 214, y: 546, s: 0.8, eyes: 'closed' })
      + `<path d="M120 556C130 488 300 478 312 556Z" fill="url(#duvet-${c.uid})" stroke="#c9c6bd" stroke-width="2.4"/>`
      + Pg(c, { x: 330, y: 514, s: 0.64, eyes: 'happy' })
      + A.pillow(330, 470, 74, 44, '#f6e1e5'),
  },
  {
    id: 'book', title: 'Сказка на ночь', rarity: 'common', hint: 'вечером',
    when: evening,
    text: c => `Маня читает сказку на ночь. Шкет уснул на второй странице, но просит не останавливаться. А ${P()} больше всего любит место про море.`,
    draw: c => M(c, { x: 206, y: 506, s: 0.8, eyes: 'open', arms: [-34, -34], armsOver: true, extra: A.book(0, -62, 1.05) })
      + K(c, { x: 92, y: 524, s: 0.7, eyes: 'closed' })
      + Pg(c, { x: 336, y: 514, s: 0.6, eyes: 'happy' })
      + A.zzz(130, 450),
  },
  {
    id: 'strike', title: 'Забастовка', rarity: 'common',
    when: () => true,
    text: c => `${P()} объявил забастовку: он больше не подставка для ног. Требования — своя подушка и уважение. Шкет и Маня обдумывают.`,
    draw: c => A.sign(302, 380, ['Я НЕ', 'ПОДСТАВКА!'], 6)
      + M(c, { x: 344, y: 514, s: 0.56, eyes: 'wide', arms: [-30, -30] })
      + Pg(c, { x: 190, y: 516, s: 0.7, eyes: 'grumpy', flippers: [16, 84] })
      + K(c, { x: 66, y: 530, s: 0.62, eyes: 'wide' }),
  },
  {
    id: 'dance', title: 'Дискотека', rarity: 'common', hint: 'вечером',
    when: evening,
    text: c => `Включили музыку и танцуют. Маня — красиво, ${P()} — с достоинством, Шкет — как может.`,
    draw: c => M(c, { x: 104, y: 506, s: 0.74, eyes: 'happy', arms: [140, 150], anim: 'hop' })
      + Pg(c, { x: 316, y: 514, s: 0.64, eyes: 'happy', flippers: [70, 70], anim: 'wiggle' })
      + K(c, { x: 210, y: 524, s: 0.78, eyes: 'happy', mouth: 'open', pose: 'sit', anim: 'wiggle' })
      + A.notes(140, 330),
  },
  {
    id: 'box', title: 'Шкет обиделся', rarity: 'common', hint: 'если не заходить пару дней',
    when: c => c.away >= 36 * H, boost: () => true,
    text: c => `Тебя долго не было, и Шкет обиделся: сидит в коробке. Маня говорит, мандаринка поможет. Попробуй его покормить.`,
    draw: c => c.variant === 'resolved'
      ? M(c, { x: 104, y: 506, s: 0.72, eyes: 'happy', arms: [150, 150] })
        + A.boxBack(310, 552) + A.boxFront(310, 552, 'ОБИЖЕН') + `<path d="M266 520L354 534" stroke="#d9434b" stroke-width="4" stroke-linecap="round"/>`
        + K(c, { x: 210, y: 528, s: 0.8, eyes: 'happy', mouth: 'smile' }) + hearts([[220, 400], [170, 380]])
      : A.boxBack(160, 552) + K(c, { x: 166, y: 522, s: 0.78, eyes: 'grumpy' }) + A.boxFront(160, 552, 'ОБИЖЕН')
        + M(c, { x: 304, y: 508, s: 0.74, eyes: 'open', arms: [14, -40], extra: A.tangerine(-6, -78, 11) })
        + Pg(c, { x: 382, y: 522, s: 0.5, eyes: 'wide' }),
    resolved: { char: 'shket', text: c => `Отошёл! Мандаринка — лучшее извинение. Коробку Шкет оставил: вдруг ещё пригодится.` },
  },
  {
    id: 'fort', title: 'Подушечная крепость', rarity: 'common', hint: 'если не заходить сутки',
    when: c => c.away >= 20 * H, boost: () => true,
    text: c => `Пока тебя не было, построили крепость из подушек. На флаге — «Ждём Вету». Пароль — обнимашки. ${P()} стоит на страже.`,
    draw: c => A.pillowFort(c.uid, false)
      + M(c, { x: 166, y: 514, s: 0.5, eyes: 'happy', arms: [14, 14] })
      + K(c, { x: 200, y: 522, s: 0.52, eyes: 'happy', mouth: 'smile' })
      + A.pillowFort(c.uid, true) + A.flag(200, 384, 'Ждём Вету')
      + Pg(c, { x: 350, y: 520, s: 0.58, eyes: 'grumpy', flippers: [16, 50] })
      + A.note(96, 572, ['мы скучали'], -6, 110),
  },
  {
    id: 'throne', title: 'Месть Пингвина', rarity: 'rare',
    when: () => true,
    text: c => `Пока никого нет, ${P()} спит на твоей подушке, а Шкета с Маней положил в ногах. Говорит, это восстановление справедливости.`,
    draw: c => Pg(c, { x: 226, y: 420, s: 0.58, eyes: 'closed', tilt: -90 })
      + A.zzz(70, 370)
      + M(c, { x: 278, y: 532, s: 0.52, eyes: 'grumpy', legs: 'tucked', arms: [-30, -30] })
      + K(c, { x: 352, y: 540, s: 0.56, eyes: 'grumpy', flip: true }),
  },
  {
    id: 'sick', title: 'Больничка', rarity: 'rare',
    when: () => true,
    text: c => `Играют в больничку. Маню положили под капельницу с компотом, а Шкет держит её за ручку — как тогда держал тебя. Говорит, у него опыт.`,
    draw: c => A.ivStand(58, 520, 168, 470)
      + M(c, { x: 278, y: 488, s: 0.64, eyes: 'open', tilt: -90, arms: [14, 14] })
      + Pg(c, { x: 360, y: 520, s: 0.5, eyes: 'wide' })
      + K(c, { x: 272, y: 556, s: 0.74, eyes: 'open', mouth: 'smile', hat: 'nurse', flip: true })
      + hearts([[220, 400]]),
  },
  {
    id: 'meatball', title: 'В гости заходила тефтеля', rarity: 'rare',
    when: () => true,
    text: c => `Заходила Злая тефтеля. Ворчала, требовала подливы. Шкет предложил ей мандаринку — не помогло. ${P()} спрятался за Маню.`,
    draw: c => Pg(c, { x: 352, y: 508, s: 0.58, eyes: 'wide' })
      + M(c, { x: 312, y: 512, s: 0.66, eyes: 'wide', arms: [30, 30] })
      + K(c, { x: 94, y: 526, s: 0.7, eyes: 'open', extra: A.tangerine(96, -30, 10) })
      + A.meatball(204, 548, 34),
  },
  {
    id: 'onsen', title: 'Мандариновая ванна', rarity: 'rare',
    when: () => true,
    text: c => `Шкет устроил себе ванну с мандаринками, как настоящая японская капибара. Маня охраняет полотенце. ${P()} ждёт очередь, но вода тёплая, а он за холодную.`,
    draw: c => A.tub(160, 572, true) + K(c, { x: 150, y: 530, s: 0.72, eyes: 'closed', mouth: 'smile', onHead: 'tangerine' }) + A.tub(160, 572, false)
      + Pg(c, { x: 352, y: 512, s: 0.56, eyes: 'grumpy' })
      + M(c, { x: 296, y: 512, s: 0.66, eyes: 'happy', arms: [14, 14] }) + A.towel(298, 566),
  },

  /* ---------- особые дни ---------- */
  {
    id: 'month', title: 'Наше 19-е', rarity: 'special', hint: 'откроется 19-го числа',
    when: c => c.now.getDate() === CONFIG.since[2] && c.now.getMonth() !== CONFIG.since[1] && c.months >= 1,
    text: c => `Сегодня 19-е: ${c.months} ${plural(c.months, ['месяц', 'месяца', 'месяцев'])} как вы живёте вместе. Шкет, Маня и ${P()} испекли торт. Свечку задуваешь ты.`,
    note: c => `${cap(c.cheeky)}, ${c.months} ${plural(c.months, ['месяц', 'месяца', 'месяцев'])} вместе. Спасибо, что ты у меня есть. Люблю тебя.`,
    draw: c => A.banner(`${c.months} ${plural(c.months, ['месяц', 'месяца', 'месяцев'])}!`)
      + Pg(c, { x: 340, y: 516, s: 0.6, eyes: 'happy', hat: 'party', hatColor: '#ffd36b' })
      + M(c, { x: 92, y: 508, s: 0.7, eyes: 'happy', arms: [14, 150], hat: 'party' })
      + K(c, { x: 236, y: 500, s: 0.62, eyes: 'happy', mouth: 'smile', hat: 'party', hatColor: '#9fe0c8' })
      + A.cake(196, 572) + A.confetti(22, c.months),
  },
  {
    id: 'anniversary', title: 'Годовщина', rarity: 'special', hint: 'откроется 19 июля',
    when: c => c.now.getDate() === CONFIG.since[2] && c.now.getMonth() === CONFIG.since[1] && c.years >= 1,
    text: c => `${c.years} ${plural(c.years, ['год', 'года', 'лет'])} вместе! Все надели колпаки, ${P()} даже простил тебе ноги. Ждут только тебя.`,
    note: c => `${c.years} ${plural(c.years, ['год', 'года', 'лет'])} с тобой — лучшее, что со мной было. Моя ${c.cheeky}, люблю тебя.`,
    draw: c => A.banner(`${c.years} ${plural(c.years, ['год', 'года', 'лет'])} вместе!`, 286, '#c7a4f0')
      + Pg(c, { x: 340, y: 516, s: 0.6, eyes: 'happy', hat: 'party', hatColor: '#ffd36b', flippers: [16, 120] })
      + M(c, { x: 92, y: 508, s: 0.7, eyes: 'happy', arms: [150, 150], hat: 'party' })
      + party(c) + A.cake(170, 572, '') + A.confetti(40, 7),
  },
  {
    id: 'newyear', title: 'Новый год', rarity: 'special', hint: 'откроется под Новый год',
    when: c => (c.now.getMonth() === 11 && c.now.getDate() >= 25) || (c.now.getMonth() === 0 && c.now.getDate() <= 7),
    roomOpt: () => ({ snow: true }),
    text: c => `Нарядили ёлку. Шкет хотел быть звездой на макушке, Маня уговорила его быть просто шариком. ${P()} счастлив: наконец-то нормальная погода.`,
    note: c => `С Новым годом, ${c.nick}! Пусть он будет тёплым, как Маня, и сладким, как мандаринки Шкета.`,
    draw: c => A.tree(72, 530)
      + Pg(c, { x: 334, y: 516, s: 0.62, eyes: 'happy', hat: 'santa' })
      + M(c, { x: 226, y: 508, s: 0.7, eyes: 'happy', arms: [14, 150], hat: 'santa' })
      + K(c, { x: 150, y: 540, s: 0.62, eyes: 'happy', mouth: 'smile', hat: 'santa' }),
  },
  {
    id: 'feb14', title: '14 февраля', rarity: 'special', hint: 'откроется 14 февраля',
    when: c => c.now.getMonth() === 1 && c.now.getDate() === 14,
    text: c => `День всех влюблённых. Шкет надул сердечко, Маня покраснела, ${P()} сказал «фу», но в открытке подписался первым.`,
    note: c => `Ты моя валентинка, ${c.cheeky}.`,
    draw: c => A.balloon(220, 330, 196, 470)
      + Pg(c, { x: 340, y: 516, s: 0.6, eyes: 'grumpy' })
      + M(c, { x: 100, y: 508, s: 0.72, eyes: 'happy', arms: [-30, -30] })
      + K(c, { x: 196, y: 524, s: 0.78, eyes: 'happy', mouth: 'smile' })
      + hearts([[120, 320], [300, 330], [60, 380]]),
  },
  {
    id: 'mar8', title: '8 Марта', rarity: 'special', hint: 'откроется 8 марта',
    when: c => c.now.getMonth() === 2 && c.now.getDate() === 8,
    text: c => `Нарвали тебе цветов. Где — не говорят. ${P()} настаивает, что жёлтый выбирал он.`,
    note: c => `С 8 Марта, ${c.nick}! Ты у меня самая-самая.`,
    draw: c => Pg(c, { x: 340, y: 516, s: 0.6, eyes: 'happy' })
      + M(c, { x: 96, y: 508, s: 0.72, eyes: 'happy', arms: [14, 14] })
      + K(c, { x: 270, y: 530, s: 0.66, eyes: 'happy', mouth: 'smile', flip: true })
      + A.bouquet(196, 576, CONFIG.name),
  },
];

/* ---------- реплики ---------- */
const TALK = {
  shket: ['Я не толстый, я плюшевый.', '{Nick}, ты пришла!', 'Я тебя ждал. Маня тоже, но меньше.', 'Мандаринку бы…', 'Можно я сегодня сплю в серединке?', 'Я храбрый. Я с тобой на капельницу ходил.', 'Погладь за ушком. Нет, за другим.'],
  manya: ['Бе-е.', 'Шкет опять занял подушку.', 'Я овечка, мне можно спать днём.', '{Nick}, обними!', 'Я тебя ждала и считала овец. Сбилась на себе.', 'Шёрстка сегодня особенно мягкая. Проверь.', 'Я не трусиха, я осторожная.'],
  peng: ['Я не подставка. Я пингвин.', 'Ноги — это не подушка. Подушка — это подушка.', '{Nick}, а меня погладить?', 'Я большой, но ранимый.', 'Холодно? Мне — нормально.', 'Шкет опять ест мандарины без меня.'],
};
const HUNGRY = {
  shket: ['Я бы поел. Это намёк.', 'Кажется, в животе урчит. Или это Маня.'],
  manya: ['Клевера бы…', 'Бе-е. Голодное бе-е.'],
  peng: ['Рыбки не найдётся? Спрашиваю для себя.', 'Пингвины тоже кушают, если что.'],
};
const PET = {
  shket: ['Мррр… Капибары так не умеют, но я научился.', 'Ещё! За ушком!', 'Всё, я растаял.'],
  manya: ['Ещё, ещё! Бе-е-е!', 'Шёрстка любит, когда её гладят.', 'Маня довольна.'],
  peng: ['Ладно. Можно. Только недолго.', '…ещё чуть-чуть.', 'Я всё ещё обижен, но гладь.'],
};
const FOODS = [
  { id: 'tangerine', name: 'Мандаринка', icon: () => A.tangerine(0, 2, 14) },
  { id: 'clover', name: 'Клевер', icon: () => A.clover(0, -8, 1) },
  { id: 'fish', name: 'Рыбка', icon: () => A.fish(0, 0, 1.05, -12) },
  { id: 'cookie', name: 'Печенька', icon: () => A.cookie(0, 0, 15) },
  { id: 'watermelon', name: 'Арбуз', icon: () => A.watermelon(0, 6, 1.3) },
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

window.SCENES_API = {
  CONFIG, SCENES, byId: Object.fromEntries(SCENES.map(s => [s.id, s])),
  TALK, HUNGRY, PET, FOODS, LIKES, FEED,
  plural, cap, pick, makeCtx, daysTogether, monthsTogether,
};
})();
