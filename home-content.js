/* Домашние занятия, находки и меню кухни. */
(function(S) {
'use strict';
const finds = [
  ['fishCup','Кружка с рыбкой','cup','#80b6d3','🐟'], ['starBall','Мяч со звёздами','ball','#e6a852','★'],
  ['plumPillow','Сливовая подушка','pillow','#b690c4','☾'], ['mintMat','Мятный коврик','mat','#7abca9','❧'],
  ['berryCup','Ягодная чашка','cup','#cf8291','●'], ['seaBall','Морской мяч','ball','#639bb6','≈'],
  ['fishPillow','Подушка с рыбкой','pillow','#85b6cc','🐟'], ['apricotMat','Плед «Абрикос»','mat','#e4a476','☀'],
  ['orangePack','Мандариновый рюкзак','pack','#e9a353','❧'], ['starLamp','Ночник-звезда','lamp','#f9ce75','★'],
  ['heartSpecs','Очки-сердечки','specs','#d67282','♥'],
  ['leafCup','Кружка Мани','cup','#8bb895','❧'], ['melonBall','Арбузный мяч','ball','#84b27c','✦'],
  ['honeyPillow','Медовая подушка','pillow','#e5b75e','✿'], ['nightMat','Коврик со звёздами','mat','#9887b5','★'],
];
S.FINDS = finds.map(([id,name,kind,color,mark]) => ({id,name,kind,color,mark}));
const stories = [
  ['littleHike','Поход до кухни','shket','До кухни целых два порога. Что положим Шкету в рюкзак?',['Мандаринку','Кружку'],['Привал у первого порога. Мандаринка до кухни не дошла.','Шкет налил Мане воды и объявил кухню найденной.']],
  ['woolSalon','Салон Мани','manya','Маня открыла салон перед зеркалом. Пингвин уже взял талончик. Как его украсим?',['Бантик','Корона'],['Пингвин попросил сделать фото. Только «для документов».','Его Величество разрешил почесать себя за крылом.']],
  ['pengCorner','Место у кровати','peng','Пингвин примеряет уголок у кровати. Что сюда постелим?',['Коврик','Подушку'],['Пингвин потоптался на коврике и позвал Шкета в гости.','Пингвин обнял рыбку. Сегодня подушка есть и у него.']],
  ['pillowCouncil','Подушечный совет','manya','На троих две большие подушки и одна крошечная. Кому достанется большая?',['Мане и Шкету','Пингвину'],['Шкет подвинулся. На одной большой поместились сразу двое.','«А ноги чьи будут?» — спросил Пингвин и уснул первым.']],
  ['socks','Носочная катастрофа','shket','Шкет нырнул в бельё. Остался один полосатый носок. Где его пара?',['В корзине','На ухе Мани'],['Из корзины выглянула Маня. А на ухе у неё — пропажа!','Точно! Маня думала, это новый колпак.']],
  ['parcel','Посылка от Жени','peng','На коробке написано «Вете и троим сообщникам». Как откроем?',['Потянуть за бант','Поднять крышку'],['На дне три печеньки. Шкет умеет считать именно до трёх.','Маня развернула записку. «Обнимите Вету за меня». Все трое уже бегут.']],
];
S.HOME_STORIES = stories.map(([id,title,toy,line,picks,ends])=>({id,title,toy,line,picks,ends}));
for (const story of S.HOME_STORIES) {
  const scene = { id: story.id, title: story.title, rarity: 'common', activity: true, when: () => true,
    text: () => story.line, setup: W => W.P.homeStory(story.id, 0) };
  S.SCENES.push(scene);
  S.byId[scene.id] = scene;
}
Object.assign(S.INGREDIENTS, { berries:'Ягоды', curd:'Творог', oats:'Хлопья' });
Object.assign(S.COOK_LINES.add,{ berries:['Одну в миску, одну на пробу!'], curd:['Белые облачка!'], oats:['Хлопья шуршат, как дождик.'] });
S.RECIPES.push(
  {id:'turnovers',name:'Яблочные конвертики',short:'Конвертики',need:['apple','flour','egg'],bake:true,likes:{shket:2,manya:1,peng:1}},
  {id:'curdcakes',name:'Сырники с ягодами',short:'Сырники',need:['curd','flour','egg','berries'],bake:true,likes:{shket:1,manya:2,peng:1}},
  {id:'fishbake',name:'Рыбная запеканка',short:'Запеканка',need:['fish','carrot','milk','egg'],bake:true,likes:{shket:1,manya:1,peng:2}},
  {id:'oatcookies',name:'Мандариновое овсяное печенье',short:'Печенье',need:['oats','tangerine','egg'],bake:true,likes:{shket:2,manya:2,peng:1}},
  {id:'berrymilk',name:'Ягодный коктейль',short:'Коктейль',need:['berries','milk'],drink:true,likes:{shket:2,manya:2,peng:1}},
  {id:'parfait',name:'Творожок с яблоком и ягодами',short:'Творожок',need:['curd','apple','berries'],likes:{shket:1,manya:2,peng:2}}
);
})(window.SCENES_API);
