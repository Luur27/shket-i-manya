/* Занятия доступны со страницы «Дела» и прямо из комнат. */
window.HOME = {
  init({state, save, S, stage, scene, caption, home, inGame, cook, snack, bedtime, say}) {
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
      return S.FINDS.find(f=>f.id===sets[kind==='lamp'?'lamp':id+kind]&&state.unlocked.includes(f.id))||defaults[kind];
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
    function menuPage(title){content.replaceChildren();$('dayTitle').textContent=title;sheet.hidden=false;sheet.scrollTop=0;}
    function statuses(id,t=Date.now()){
      const r=care[id],fed=state.fed[id]||0;
      const meal=Math.max(fed+10*hour,(r.meal||0)+16*hour);
      const thirst=Math.max(r.drink+6*hour-(r.played>r.drink?5*hour:0),r.drink);
      const energy=r.rest+15*hour-(r.played>r.rest?2*hour:0);
      return {food: t>=meal?'Хочет есть':'Сыт'+(id==='manya'?'а':''),water:t>=thirst?'Хочет пить':'Напил'+(id==='manya'?'ась':'ся'),sleep:state.bedSince?'Спит':t>=energy?'Клонит в сон':'Бодр'+(id==='manya'?'а':'')};
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
      const labels=statuses(chosen),p=document.createElement('p');p.className='day-needs';p.textContent=Object.values(labels).join(' · ');content.append(p);
      const careBtns=group();
      button(careBtns,'Напоить',()=>water(chosen));button(careBtns,'Угостить',()=>{cancel();snack(chosen);});
      button(careBtns,state.bedSince?'Разбудить':'Уложить спать',()=>{
        if(state.bedSince){cancel();bedtime();return;}
        menuPage('Кого положим рядом с Ветой?');const places=group();
        for(const id of ids)button(places,names[id],()=>{state.bedCompanion=id;cancel();bedtime();});
        button(content,'Как обычно',()=>{delete state.bedCompanion;cancel();bedtime();},'ghost-btn');
      });
      heading('Вместе');const games=group();games.classList.add('day-games');
      button(games,'⚽ Мяч с Пингвином',()=>ball(chosen));button(games,'⌕ Ушли гулять',hunt);
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
      const finds=S.FINDS.filter(f=>state.unlocked.includes(f.id));
      if(!finds.length){const p=document.createElement('p');p.textContent='Открой сундук в кладовой. Находки для питья, игр и сна останутся здесь.';content.append(p);}
      const list=group();for(const f of finds)button(list,(selected(f.kind)?.id===f.id?'✓ ':'')+f.name,()=>{
        const key=f.kind==='lamp'?'lamp':chosen+f.kind;
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
    function story(id,choice=0){
      const s=S.HOME_STORIES.find(x=>x.id===id);if(!s)return;
      begin('bedroom',W=>s.draw?s.draw(W,choice>0):W.P.homeStory(id,choice));
      caption(s.title,choice?s.ends[choice-1]:s.line,choice?[['day-replay','Ещё раз']]:s.picks.map((label,i)=>['day-pick'+(i+1),label]));
      handle=(act)=>{if(act==='day-replay')story(id);else if(act==='day-pick1'||act==='day-pick2')story(id,Number(act.slice(-1)));};
      if(choice && s.toy)WORLD.react(s.toy,'hop');
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
        handle=()=>{};care[id].drink=Date.now();save();
        cup.position.set(.24,.37,.22);cup.rotation.z=-.28;cup.userData.water.visible=false;WORLD.react(id,'chomp');
        caption(names[id],({peng:'Вот теперь можно и второй тайм.',manya:'Бе-е… спасибо. Как раз такую водичку хотелось.',shket:'Один глоточек. И ещё один большой глоточек.'})[id],[['day-morewater','Напоить ещё кого-нибудь']]);handle=act=>{if(act==='day-morewater')menu();};
      };
      b.onclick=e=>{if(e.detail===0&&amount<1){pour(.25);stop();}};
    }
    const spots=[
      ['bedroom','Там лежат подушки.',['За подушкой','Под пледом','В коробке']],
      ['kitchen','Там пахнет блинчиками.',['За кастрюлей','У чайника','За скатертью']],
      ['bath','Слышно, как капает вода.',['За полотенцем','У ванны','За корзиной']],
      ['balcony','Ветер шевелит листья.',['За горшком','У перил','За лейкой']],
      ['hall','На стене кто-то видит своё отражение.',['За шарфом','У зеркала','У двери']],
      ['pantry','Кто-то шуршит среди запасов.',['За сундуком','За коробкой','За метлой']]
    ];
    let lastHunt='';
    function hunt(){
      const target=S.pick(ids),goal=S.pick(spots);
      let place=Math.floor(Math.random()*3);
      if(lastHunt===target+goal[0]+place)place=(place+1)%3;
      lastHunt=target+goal[0]+place;
      const searched=new Set();
      function look(room){
        const row=spots.find(x=>x[0]===room),roomName=S.ROOMS.find(x=>x.id===room).name;
        begin(room,W=>{S.LAYOUT[room](W);W.pose(target,{visible:false});W.P.hidingPlaces(row[2], [0,1,2].filter(i=>searched.has(room+i)));});
        const tap=e=>{const i=WORLD.hidingSpotAt(e.clientX,e.clientY);if(i!==null)handle('day-look'+i);};
        stage.addEventListener('click',tap);cleanup=()=>stage.removeEventListener('click',tap);
        caption(roomName,'Женя оставил записку «Ушли гулять». Ищем '+({shket:'Шкета',manya:'Маню',peng:'Пингвина'}[target])+'. '+goal[1],
          [...row[2].map((label,i)=>['day-look'+i,(searched.has(room+i)?'✓ ':'')+label]),['day-map','В другую комнату']]);
        handle=act=>{
          if(act==='day-map'){menuPage('Куда заглянем?');const list=group();for(const r of S.ROOMS)button(list,r.name,()=>look(r.id));return;}
          if(!act.startsWith('day-look'))return;
          const i=Number(act.slice(-1));searched.add(room+i);
          if(row===goal&&i===place){
            begin(room,W=>{S.LAYOUT[room](W);W.P.hidingPlaces(row[2],[i]);W.pose(target,{x:(i-1)*.94,z:.48,y:W.TOP+.16,s:.56,eyes:'happy'});W.P.hearts([[(i-1)*.94,1.55,.48]]);});WORLD.react(target,'hop');
            caption('Нашла!',names[target]+' выглядывает. «Я просто гулял! Женя же написал».',[['day-again','Спрятать снова']]);handle=a=>{if(a==='day-again')hunt();};
          }else {look(room);say(ids.find(k=>k!==target),row===goal?'Теплее! Где-то здесь шуршит.':'Тут пусто. В записке есть подсказка.');}
        };
      }
      look('bedroom');
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
        W.P.goals();sphere=W.P.findItem(selected('ball',owner),0,.91);
      });
      function score(text){caption('Ворота Пингвина',text+' · Голы '+goals+' из '+shots+' · Рекорд '+(state.ballBest||0),[['day-left','Влево'],['day-mid','По центру'],['day-right','Вправо']]);}
      score('Проведи пальцем вверх в сторону ворот. Длиннее взмах — сильнее бросок');
      function shoot(x,power){if(flight)return;flight={x,power,t:0};}
      function tick(t){
        const dt=last?Math.min(.05,(t-last)/1000):0;last=t;clock+=dt;
        keeper=.72*Math.sin(clock*1.65);WORLD.moveHeroX('peng',keeper);
        if(flight){
          flight.t=Math.min(1,flight.t+dt*(1.4+flight.power*.8));const f=flight.t;
          sphere.position.set(flight.x*f,.175+Math.sin(Math.PI*f)*(.22+.46*flight.power),.91-f*1.4*flight.power);
          sphere.rotation.x-=dt*8;
          if(f===1){
            const wide=Math.abs(flight.x)>.97,short=flight.power<.86,saved=Math.abs(flight.x-keeper)<.34,goal=!wide&&!short&&!saved;
            shots++;if(goal)goals++;state.ballBest=Math.max(state.ballBest||0,goals);care.peng.played=Date.now();save();
            WORLD.react(goal?'manya':short||wide?'shket':'peng','hop');
            score(goal?'Гол! Маня уже считает на копытцах':short?'Шкет подобрал недокатившийся мяч':wide?'Мимо штанги! Шкет возвращает мяч':'Пингвин поймал! Ещё удар?');
            sphere.position.set(0,.175,.91);flight=null;
          }
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
    function meal(id,drink){const t=Date.now();state.fed[id]=t;care[id].meal=t;if(drink)care[id].drink=t;}
    function sleep(){if(!state.bedSince)state.bedSince=Date.now();save();}
    function wake(){
      if(!state.bedSince)return;
      const t=Date.now(),nap=Math.max(0,t-state.bedSince);
      for(const id of ids)care[id].rest=Math.min(t,Math.max(t-15*hour,care[id].rest)+nap*8);
      state.bedSince=0;save();
    }
    function tidyAfterAbsence(){
      if(state.last&&Date.now()-state.last>48*hour){
        for(const id of ids){meal(id,true);care[id].rest=Date.now();}
        save();return true;
      }
      return false;
    }
    $('btnDay').onclick=menu;$('dayClose').onclick=()=>{sheet.hidden=true;if(inGame())home();};
    return {menu,invitation,accept(){chosen=invited;menu();},shelf,pickDrink,water,hunt,ball,story,action,cancel,meal,sleep,wake,statuses,tidyAfterAbsence,selected,get active(){return active;}};
  }
};
