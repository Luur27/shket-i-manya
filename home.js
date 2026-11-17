/* Занятия доступны со страницы «Дела» и прямо из комнат. */
window.HOME = {
  init({state, save, S, stage, scene, caption, home, inGame, cook, snack, readyDish, serveTo, bedtime, say, now, photo}) {
    const $ = id => document.getElementById(id);
    const sheet = $('daySheet'), content = $('dayContent');
    const names = {shket:'Шкет',manya:'Маня',peng:'Пингвин'}, ids=Object.keys(names);
    const hour=3600000, defaults={
      cup:{kind:'cup',color:'#e0ae90',mark:'♥'}, ball:{kind:'ball',color:'#c47e83',mark:'✿'},
      pillow:{kind:'pillow',color:'#bbb0cd',mark:'☾'},mat:{kind:'mat',color:'#96b6a6',mark:'❧'}
    };
    let chosen='shket', cleanup=()=>{}, active=false;
    const care=state.care || (state.care={});
    for(const id of ids) {
      const record=care[id] || (care[id]={});
      if(!Number.isFinite(record.drink))record.drink=state.first;
      if(!Number.isFinite(record.rest))record.rest=state.first;
    }
    const sets=state.homeItems || (state.homeItems={});
    WORLD.setHomeItems(sets);
    function selected(kind,id=chosen){
      return studio.workFor(kind,id) || S.FINDS.find(f=>f.id===sets[kind==='lamp'?'lamp':id+kind]&&state.unlocked.includes(f.id))||defaults[kind];
    }
    function cancel(){cleanup();cleanup=()=>{};handle=()=>{};active=false;sheet.hidden=true;}
    function begin(room,setup) {cancel();active=true;scene(room,setup);}
    function button(parent,label,fn,kind='mini'){
      const b=document.createElement('button');b.type='button';b.className=kind;b.textContent=label;b.onclick=fn;parent.append(b);return b;
    }
    function pictureButton(parent,id,label,fn){
      const b=button(parent,label,fn,'day-card');
      const image=document.createElement('img'); image.alt='';image.src='icons/day/'+id+'.jpg';b.prepend(image);return b;
    }
    function heading(label){const h=document.createElement('h3');h.textContent=label;content.append(h);}
    function group(){const g=document.createElement('div');g.className='day-options';content.append(g);return g;}
    function menuPage(title){if(!active){cleanup();cleanup=()=>{};} content.replaceChildren();$('dayTitle').textContent=title;sheet.hidden=false;sheet.scrollTop=0;}
    const percent = value => Math.max(0, Math.min(100, value));
    function fullUntil(id) {
      const r = care[id];
      if (Number.isFinite(r.fullUntil)) return r.fullUntil;
      return Math.max((state.fed[id]||0) + 10*hour, (r.meal||0) + 16*hour);
    }
    function levels(id, time=Date.now()) {
      const r = care[id];
      const waterUntil = r.drink + (r.played > r.drink ? 1 : 6)*hour;
      const restUntil = r.rest + (r.played > (r.wakeAt || r.rest) ? 13 : 15)*hour;
      const restAt = state.bedSince || time;
      const beforeNap = percent(100*(restUntil-restAt)/(15*hour));
      const napGain = state.bedSince ? 100*Math.max(0,time-restAt)/(2*hour) : 0;
      return {
        food: percent(100*(fullUntil(id)-time)/(16*hour)),
        water: percent(100*(waterUntil-time)/(6*hour)),
        sleep: percent(beforeNap+napGain)
      };
    }
    function statuses(id,t=Date.now()){
      const value=levels(id,t);
      return {
        food: value.food <= 20 ? 'Хочет есть' : (id==='manya'?'Сыта':'Сыт'),
        water: value.water <= 20 ? 'Хочет пить' : (id==='manya'?'Напилась':'Напился'),
        sleep: state.bedSince?'Спит':value.sleep <= 20?'Клонит в сон':(id==='manya'?'Бодра':'Бодр')
      };
    }
    function renderMeters(id) {
      const panel=document.createElement('div');
      panel.className='care-meters';
      const update=[];
      for(const [kind,title] of [['food','Сытость'],['water','Запас воды'],['sleep','Бодрость']]){
        const label=document.createElement('label'), name=document.createElement('span');
        const count=document.createElement('span'), meter=document.createElement('progress');
        label.className='care-meter';
        label.dataset.need=kind;
        name.textContent=title;
        meter.max=100;
        meter.setAttribute('aria-label',names[id]+' · '+title);
        label.append(name,count,meter);
        panel.append(label);
        update.push(values=>{
          const n=Math.round(values[kind]);
          count.textContent=n+'%';
          meter.value=n;
        });
      }
      content.append(panel);
      function refresh(){const values=levels(id);update.forEach(draw=>draw(values));}
      refresh();
      const timer=setInterval(()=>{if(!document.hidden)refresh();},15000);
      cleanup=()=>clearInterval(timer);
    }
    function treatMenu(id) {
      menuPage('Угощаем '+({shket:'Шкета',manya:'Маню',peng:'Пингвина'}[id]));
      const ready=readyDish();
      if(ready)button(content,'Подать: '+ready,()=>{cancel();serveTo(id);},'pill wide');
      button(content,ready?'Приготовить другое блюдо':'Приготовить блюдо',()=>{cancel();cook(id);},ready?'ghost-btn':'pill wide');
      heading('Быстрый перекус');
      const list=group();
      for(const food of S.FOODS){
        button(list,food.name,()=>{cancel();snack(id,food.id);});
      }
      button(content,'Назад',menu,'ghost-btn');
    }
    let invited=chosen;
    function invitation(){
      invited=chosen;
      for(const id of [chosen,...ids.filter(k=>k!==chosen)]){
        invited=id;
        const needs=statuses(id);
        if(needs.water==='Хочет пить')return names[id]+' хочет пить';
        if(needs.food==='Хочет есть')return names[id]+' хочет есть';
        if(needs.sleep==='Клонит в сон')return names[id]+' зевает';
      }
      return 'Чем займёмся?';
    }
    function menu(){
      cancel();menuPage('Дома с тобой');
      const toys=group();toys.classList.add('day-toys');
      for(const id of ids){const b=pictureButton(toys,id,names[id],()=>{chosen=id;menu();});b.setAttribute('aria-pressed',id===chosen);}
      renderMeters(chosen);
      const careBtns=group();
      button(careBtns,'Напоить',()=>water(chosen));button(careBtns,'Угостить',()=>treatMenu(chosen));
      button(careBtns,state.bedSince?'Разбудить':'Уложить спать',()=>{
        if(state.bedSince){cancel();bedtime();return;}
        menuPage('Кого положим рядом с Ветой?');const places=group();
        for(const id of ids)button(places,names[id],()=>{state.bedCompanion=id;cancel();bedtime();});
        button(content,'Как обычно',()=>{delete state.bedCompanion;cancel();bedtime();},'ghost-btn');
      });
      studio.wishlist(chosen);
      heading('Вместе');const games=group();games.classList.add('day-games');
      button(games,'⚽ Мяч с Пингвином',()=>ball(chosen));button(games,'⌕ Ушли гулять',()=>hunt(chosen));
      button(games,'Мастерская Мани',()=>studio.workshop(chosen));button(games,'Уголок у кровати',()=>studio.cornerShelf(chosen));
      button(games,'На кухню',()=>{cancel();cook();});button(games,'Мои находки',shelf);
      const known=S.HOME_STORIES.filter(s=>state.seen[s.id]).sort((a,b)=>state.seen[b.id]-state.seen[a.id]);
      if(known.length){
        heading('Недавно в гостях');const list=group();list.classList.add('day-stories');
        for(const s of known.slice(0,4)){
          if(s.draw)button(list,s.title,()=>story(s.id));
          else pictureButton(list,s.id,s.title,()=>story(s.id));
        }
      }
    }
    function shelf(){
      menuPage('Находки из кладовой');const tab=group();
      for(const id of ids){const b=button(tab,names[id],()=>{chosen=id;shelf();});b.setAttribute('aria-pressed',id===chosen);}
      const tools=group();
      button(tools,'Сшито с Маней',studio.collection);button(tools,'Ткани и узоры',studio.materials);button(tools,'Расставить вещи',()=>studio.cornerShelf(chosen));
      const finds=S.FINDS.filter(f=>state.unlocked.includes(f.id));
      if(!finds.length){const p=document.createElement('p');p.textContent='Открой сундук в кладовой. Находки для питья, игр и сна останутся здесь.';content.append(p);}
      const list=group();for(const f of finds)button(list,(selected(f.kind)?.id===f.id?'✓ ':'')+f.name,()=>{
        const key=f.kind==='lamp'?'lamp':chosen+f.kind;
        if(studio.isPlaced(f.id)){ studio.stow(f.id); }
        if(['pack','specs','lamp'].includes(f.kind)){
          const worn=sets[key]===f.id;
          if(worn)delete sets[key];else sets[key]=f.id;
          save();begin('bedroom',W=>S.LAYOUT.bedroom(W));
          caption(f.name,worn?'Убрали на полку.':f.kind==='lamp'?'Звёздочка светит у кровати.':names[chosen]+' примеряет подарок.',[['day-shelf','К находкам']]);
          handle=a=>{if(a==='day-shelf')shelf();};return;
        }
        sets[key]=f.id;save();
        if(f.kind==='cup')water(chosen);
        else if(f.kind==='ball')ball(chosen);
        else {
          begin('bedroom',W=>{S.LAYOUT.bedroom(W);W.pose(chosen,{x:0,z:-.2,eyes:'happy'});W.P.findItem(f,0,.45);});
          caption(names[chosen],f.kind==='mat'?'Теперь тут можно устроиться с книжкой.':'Мягко! Берём её с собой спать.',[['day-bed','Уложить спать']]);
        }
      });
      button(content,'К делам',menu,'ghost-btn');
    }
    function story(id,choice=0,assigned=null){
      const s=S.HOME_STORIES.find(x=>x.id===id);if(!s)return;
      begin('bedroom',W=>{
        if(s.draw)s.draw(W,choice>0);
        else if(assigned){
          const order=['shket','manya','peng'];
          for(const {part,toy} of assigned){
            const x=(toy-1)*1.08;
            W.pose(order[toy],{x,z:-.2,s:.70,ry:toy===0?-1.4:0,eyes:'happy'});
            const size=[.46,.23,.35][part];
            W.P.pillow(x,W.TOP+.12,.44,size,.13,size*.64,['#c8a0b8','#b3cbd1','#e5c29f'][part]);
          }
        }else W.P.homeStory(id,choice);
      });
      const actions=choice?[['day-replay','Ещё раз']]:s.picks.map((label,i)=>['day-pick'+(i+1),label]);
      const extra={woolSalon:'Расчесать шёрстку',socks:'Собрать пары',littleHike:'Собрать рюкзак',parcel:'Распаковать',pillowCouncil:'Раздать подушки',pengCorner:'Обустроить уголок'};
      if(extra[id]&&!choice)actions.unshift(['day-hands',extra[id]]);
      if(id==='woolSalon'&&choice)actions.unshift(['day-photo','Сфотографировать']);
      caption(s.title,assigned?'Все устроились на своих подушках.':choice?s.ends[choice-1]:s.line,actions);
      handle=act=>{
        if(act==='day-replay')story(id);
        else if(act==='day-photo')photo();
        else if(act==='day-hands'){
          if(id==='woolSalon')groom();
          else if(id==='parcel')studio.unwrap(()=>story(id,2));
          else if(id==='pengCorner')studio.cornerShelf('peng');
          else studio.sortScene(id,assigned=>story(id,1,assigned));
        }else if(act==='day-pick1'||act==='day-pick2')story(id,Number(act.slice(-1)));
      };
      if(choice && s.toy)WORLD.react(s.toy,'hop');
    }
    function groom(){
      begin('hall',W=>{
        W.pose('peng',{x:0,z:.12,s:.88,eyes:'happy'});W.pose('manya',{x:-1.25,z:-.36,s:.69,arms:['down','wave']});
        W.pose('shket',{x:1.18,z:-.22,s:.68,ry:-1.65});W.pose('veta',{visible:false});
      });
      let strokes=0,stroke=null;
      const comb=document.createElement('span');comb.className='wool-comb';comb.setAttribute('aria-hidden','true');comb.hidden=true;stage.append(comb);
      function instructions(){caption('Салон Мани','Проведи расчёской по Пингвину · '+strokes+' из 3',[['day-comb','Взмах расчёской']]);}
      function brush(){
        strokes++;WORLD.react('peng','squish');
        if(strokes===3){story('woolSalon');document.getElementById('story').textContent='Пёрышки приглажены. Что примерим для фото?';}
        else instructions();
      }
      function down(e){
        if(WORLD.pickHero(e.clientX,e.clientY)!=='peng')return;
        stroke=[e.clientX,e.clientY,e.pointerId];stage.setPointerCapture(e.pointerId);move(e);
      }
      function move(e){
        if(!stroke||stroke[2]!==e.pointerId)return;const box=stage.getBoundingClientRect();
        comb.hidden=false;comb.style.left=e.clientX-box.left+'px';comb.style.top=e.clientY-box.top+'px';
        if(Math.hypot(e.clientX-stroke[0],e.clientY-stroke[1])>36){stroke=[e.clientX,e.clientY,e.pointerId];brush();}
      }
      function stop(){stroke=null;comb.hidden=true;}
      stage.addEventListener('pointerdown',down);stage.addEventListener('pointermove',move);stage.addEventListener('pointerup',stop);stage.addEventListener('pointercancel',stop);
      cleanup=()=>{stage.removeEventListener('pointerdown',down);stage.removeEventListener('pointermove',move);stage.removeEventListener('pointerup',stop);stage.removeEventListener('pointercancel',stop);comb.remove();};
      instructions();handle=a=>{if(a==='day-comb')brush();};
    }
    let handle=()=>{};
    function action(act){if(act==='day-bed'){cancel();bedtime();return;}if(active)handle(act);}
    function water(id){
      let cup,jug;
      begin('kitchen',W=>{
        W.pose(id,{x:0,z:-.15,eyes:'wide',ry:id==='shket'?-1.45:0});
        ids.filter(k=>k!==id).forEach((k,i)=>W.pose(k,{x:i?1.25:-1.25,z:-.35,ry:k==='shket'?-1.4:0}));
        cup=W.P.findItem(selected('cup',id),0,.65);cup.scale.setScalar(1.6);
        jug=W.P.teapot(-.56,.55);
      });
      caption('Воды для '+({manya:'Мани',shket:'Шкета',peng:'Пингвина'}[id]),'Подержи кнопку, чтобы налить воду. Можно наливать короткими нажатиями.',[['day-pour','Налить воду']]);
      const b=$('gameBtns').firstElementChild;
      let amount=0, timer=0;
      function pour(step){
        amount=Math.min(1,amount+step);cup.userData.water.visible=true;
        cup.userData.water.scale.setScalar(.28+.72*amount);jug.rotation.z=-.32;
        b.style.setProperty('--fill',Math.round(amount*100)+'%');b.classList.add('pouring');
        b.textContent='Наливаем · '+Math.round(amount*100)+'%';
        if(amount>=1){stop();caption('Кружка полна','Можно передавать. Вода как раз прохладная.',[['day-serve','Подать кружку']]);}
      }
      function stop(){clearInterval(timer);timer=0;jug.rotation.z=0;}
      b.onpointerdown=e=>{if(timer)return;b.setPointerCapture(e.pointerId);pour(.22);if(amount<1)timer=setInterval(()=>pour(.055),65);};
      b.onlostpointercapture=b.onpointercancel=b.onpointerup=stop;
      cleanup=stop;
      handle=act=>{
        if(act!=='day-serve'||amount<1)return;
        const before=Math.round(levels(id).water);
        handle=()=>{};care[id].drink=Date.now();save();
        cup.position.set(.24,.37,.22);cup.rotation.z=-.28;cup.userData.water.visible=false;WORLD.react(id,'chomp');
        caption(names[id],({peng:'Вот теперь можно и второй тайм.',manya:'Бе-е… спасибо. Как раз такую водичку хотелось.',shket:'Один глоточек. И ещё один большой глоточек.'})[id]+' Запас воды '+before+' → 100%.',[['day-morewater','Напоить ещё кого-нибудь']]);handle=act=>{if(act==='day-morewater')menu();};
      };
      b.onclick=e=>{if(e.detail===0&&amount<1){pour(.25);stop();}};
    }
    const clues = {
      bedroom:'Там лежат подушки.', kitchen:'Там пахнет блинчиками.',
      bath:'Слышно, как капает вода.', balcony:'Ветер шевелит листья.',
      hall:'На стене кто-то видит своё отражение.', pantry:'Кто-то шуршит среди запасов.'
    };
    let lastHunt='';
    function hunt(owner=chosen){
      const target=S.pick(ids), goal=S.pick(Object.keys(clues));
      let place=Math.floor(Math.random()*WORLD.hidingLabels(goal).length);
      if(lastHunt===target+goal+place) place=(place+1)%WORLD.hidingLabels(goal).length;
      lastHunt=target+goal+place;
      const searched=new Map();
      function look(room, found=false) {
        const checked=searched.get(room)||new Set();
        searched.set(room,checked);
        begin(room,W=>W.huntLayout(room,target,room===goal?place:null,checked,found));
        if(found){
          WORLD.react(target,'hop');
          caption('Нашла!',names[target]+' выбирается из укрытия. «Я просто гулял! Женя же написал».'+studio.complete('hunt',owner),[['day-again','Спрятать снова']]);
          handle=a=>{if(a==='day-again')hunt(owner);};
          return;
        }
        const tap=e=>{const i=WORLD.hidingSpotAt(e.clientX,e.clientY);if(i!==null)handle('day-look'+i);};
        stage.addEventListener('click',tap);
        cleanup=()=>stage.removeEventListener('click',tap);
        const labels=WORLD.hidingLabels(room);
        const buttons=labels.map((label,i)=>['day-look'+i,(checked.has(i)?'✓ ':'')+label]);
        buttons.push(['day-map','В другую комнату']);
        caption(S.ROOMS.find(r=>r.id===room).name,'Женя оставил записку «Ушли гулять». '+clues[goal]+' Ищем '+({shket:'Шкета',manya:'Маню',peng:'Пингвина'}[target])+'.',buttons);
        handle=act=>{
          if(act==='day-map'){
            menuPage('Куда заглянем?');
            const list=group();
            for(const r of S.ROOMS)button(list,r.name,()=>look(r.id));
          }else if(act.startsWith('day-look')){
            const i=Number(act.slice('day-look'.length));
            checked.add(i);
            const hit=room===goal && i===place;
            look(room,hit);
            if(!hit)say(ids.find(k=>k!==target),room===goal?'Теплее! Где-то здесь шуршит.':'Тут пусто. В записке есть подсказка.');
          }
        };
      }
      look('bedroom');
    }
    function pickGuest(){
      menuPage('Кому подать блюдо?');
      const list=group();
      for(const id of ids)button(list,names[id],()=>{chosen=id;cancel();serveTo(id);});
    }
    function pickDrink(){
      menuPage('Кому налить воды?');const list=group();
      for(const id of ids)button(list,names[id],()=>{chosen=id;water(id);});
    }
    function ball(owner='peng'){
      let sphere,keeper,goals=0,shots=0,flight=null,raf,down=null,last=0,clock=0;
      begin('hall',W=>{
        W.pose('peng',{x:0,z:-.48,s:.52,flips:['out','out']});
        W.pose('shket',{x:-1.35,z:-.12,ry:-1.5,s:.64});W.pose('manya',{x:1.35,z:-.1,s:.68,arms:['wave','down']});
        W.P.goals();sphere=W.P.penaltyBall(selected('ball',owner));
      });
      const spot = sphere.position.clone();
      let returning = null;
      function score(text){caption('Ворота Пингвина',text+' · Голы '+goals+' из '+shots+' · Рекорд '+(state.ballBest||0),[['day-left','Влево'],['day-mid','По центру'],['day-right','Вправо']]);}
      score('Проведи пальцем вверх в сторону ворот. Длиннее взмах — сильнее бросок');
      function shoot(x,power){if(flight || returning)return;flight={x,power,t:0};}
      function tick(t){
        const dt=last?Math.min(.05,(t-last)/1000):0;last=t;clock+=dt;
        keeper=.72*Math.sin(clock*1.65);WORLD.moveHeroX('peng',keeper);
        if(flight){
          flight.t=Math.min(1,flight.t+dt*(1.4+flight.power*.8));const f=flight.t;
          sphere.position.set(flight.x*f,spot.y+Math.sin(Math.PI*f)*(.22+.46*flight.power),spot.z-f*1.4*flight.power);
          sphere.rotation.x-=dt*8;
          if(f===1){
            const wide=Math.abs(flight.x)>.97,short=flight.power<.86,saved=Math.abs(flight.x-keeper)<.34,goal=!wide&&!short&&!saved;
            shots++;if(goal)goals++;state.ballBest=Math.max(state.ballBest||0,goals);care.peng.played=Date.now();save();
            WORLD.react(goal?'manya':short||wide?'shket':'peng','hop');
            const wishThanks=studio.complete('ball',owner);
            score((goal?'Гол! Маня уже считает на копытцах':short?'Шкет подобрал недокатившийся мяч':wide?'Мимо штанги! Шкет возвращает мяч':'Пингвин поймал! Ещё удар?')+wishThanks);
            returning = {start:sphere.position.clone(),elapsed:0};
            flight = null;
          }
        } else if (returning) {
          returning.elapsed += dt;
          const progress = Math.min(1, returning.elapsed / .55);
          const smooth = progress * progress * (3 - 2 * progress);
          sphere.position.lerpVectors(returning.start, spot, smooth);
          sphere.rotation.x += dt * 7 * (1 - progress);
          if (progress === 1) { sphere.position.copy(spot); returning = null; }
        }
        raf=requestAnimationFrame(tick);
      }
      function start(e){down={x:e.clientX,y:e.clientY,id:e.pointerId};stage.setPointerCapture(e.pointerId);}
      function end(e){if(!down||e.pointerId!==down.id)return;const box=stage.getBoundingClientRect(),dy=(down.y-e.clientY)/box.height,dx=(e.clientX-down.x)/box.width;down=null;if(dy>.05)shoot(Math.max(-1.35,Math.min(1.35,dx*4)),Math.max(.5,Math.min(1.2,.60+dy*2)));}
      function abort(){down=null;}
      stage.addEventListener('pointerdown',start);stage.addEventListener('pointerup',end);stage.addEventListener('pointercancel',abort);
      raf=requestAnimationFrame(tick);
      cleanup=()=>{cancelAnimationFrame(raf);stage.removeEventListener('pointerdown',start);stage.removeEventListener('pointerup',end);stage.removeEventListener('pointercancel',abort);};
      handle=a=>{const x={'day-left':-.72,'day-mid':0,'day-right':.72}[a];if(x!==undefined)shoot(x,1);};
    }
    function giveSnack(id) {
      const t=Date.now();
      const remaining=Math.max(0,fullUntil(id)-t);
      care[id].fullUntil=t+Math.min(16*hour,remaining+6*hour);
      state.fed[id]=t;
    }
    function meal(id,drink) {
      const t=Date.now();
      state.fed[id]=t;
      care[id].meal=t;
      care[id].fullUntil=t+16*hour;
      if(drink) care[id].drink=t;
    }
    function sleep(){if(!state.bedSince)state.bedSince=Date.now();save();}
    function wake(){
      if(!state.bedSince)return;
      const t=Date.now();
      for(const id of ids){
        care[id].rest=t-(1-levels(id,t).sleep/100)*15*hour;
        care[id].wakeAt=t;
      }
      state.bedSince=0;save();
    }
    function tidyAfterAbsence(){
      if(state.last&&Date.now()-state.last>48*hour){
        for(const id of ids){meal(id,true);care[id].rest=Date.now();}
        save();return true;
      }
      return false;
    }
    const studio=createWorkshop({
      state,save,S,now,names,content,stage,button,heading,group,
      page:title=>{cancel();menuPage(title);},begin,caption,
      controls(fn,dispose=()=>{}){handle=fn;cleanup=dispose;},menu,ball,hunt,bedtime
    });
    $('btnDay').onclick=menu;$('dayClose').onclick=()=>{cancel();if(inGame())home();};
    return {studio,menu,showWish(id){
      chosen=id;cancel();menuPage(names[id]+' зовёт');
      studio.wishlist(id);button(content,'К делам',menu,'ghost-btn');
    },invitation,accept(){chosen=invited;menu();},shelf,pickDrink,pickGuest,water,hunt,ball,story,action,cancel,giveSnack,meal,sleep,wake,levels,statuses,tidyAfterAbsence,selected,get active(){return active;}};
  }
};
