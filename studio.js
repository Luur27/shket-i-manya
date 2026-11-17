/* Мастерская, личные просьбы и вещи в спальне используют общее сохранение. */
window.createWorkshop = function({state,save,S,now,names,content,stage,button,heading,group,page,begin,caption,controls,menu,ball,hunt,bedtime}) {
  const D=STUDIO, st=state.studio || (state.studio=D.fresh(now()));
  const parts={pillow:'подушку',mat:'плед',bow:'бант'};
  const genitive={peng:'Пингвина',manya:'Мани',shket:'Шкета'};
  const startDesign={peng:['pillow','aqua','fish'],manya:['bow','rose','star'],shket:['mat','cream','berry']};
  const greetings={
    peng:'Сошьём мне подушку с рыбками? Я даже знаю, какой стороной на ней лежать.',
    manya:'Вета, давай вместе сошьём бант со звёздочками. Я подержу ткань!',
    shket:'Мне бы плед с ягодками. Да, я знаю, что их нельзя будет съесть.'
  };
  const days=()=>D.dayIndex(now());
  const wishes={peng:['make','ball','hunt','place'],manya:['hunt','make','place','ball'],shket:['ball','place','make','hunt']};
  let items=[],layout=[];
  function sync(){
    items=st.made.map(D.item);
    const all=items.concat(S.FINDS.filter(f=>state.unlocked.includes(f.id)));
    layout=Object.entries(st.layout).map(([id,p])=>({item:all.find(f=>f.id===id),...p})).filter(e=>isDecor(e.item));
    WORLD.setStudio(items,layout);
  }
  function isDecor(f){return f && ['mat','pillow','lamp','cup','ball'].includes(f.kind);}
  function workFor(kind,id){return items.find(f=>f.id===state.homeItems[id+kind]);}
  function dayOffset(){return Math.max(0,days()-st.start);}
  function request(id) {
    let action=wishes[id][dayOffset()%4];
    if(action==='place'&&!decorables().length)action='make';
    const lines={
      make:greetings[id],
      ball:id==='peng'?'Вета, я уже в воротах. Пробьёшь мне один пенальти?':'Давай пробьём пенальти Пингвину? Я буду за тебя болеть!',
      hunt:'Похоже, опять кто-то «ушёл гулять». Поищем вместе?',
      place:'В уголке у кровати как-то пусто. Поставим туда что-нибудь наше?'
    };
    return {action,line:lines[action],done:st.thanks[id]===days()};
  }
  function featured(){
    const order=D.toys.slice(dayOffset()%3).concat(D.toys.slice(0,dayOffset()%3));
    return order.find(id=>!request(id).done);
  }
  function complete(action,id,design) {
    const wish=request(id);
    if(wish.done || wish.action!==action)return '';
    if(action==='make' && (design.kind!==startDesign[id][0] || design.print!==startDesign[id][2]))return '';
    st.thanks[id]=days();save();
    return ' '+names[id]+({make:' прижимает подарок. «Ты запомнила!»',ball:' довольно кивает. «Вот это был удар!»',hunt:' радуется. «С тобой мы всех найдём!»',place:' оглядывает уголок. «Так и оставим!»'})[action];
  }
  function wishlist(id) {
    const w=request(id), card=document.createElement('div');card.className='wish-card';
    const text=document.createElement('p');
    text.textContent=w.done?names[id]+' вспоминает, чем вы сегодня занимались. «Спасибо, Вета».':names[id]+' просит: «'+w.line+'»';
    card.append(text);content.append(card);
    if(!w.done)button(card,({make:'Сшить подарок',ball:'Играть в мяч',hunt:'Искать вместе',place:'Обустроить уголок'})[w.action],()=>startRequest(id));
  }
  function startRequest(id){
    const w=request(id);
    if(w.done)return menu();
    if(w.action==='make')return workshop(id,true);
    if(w.action==='ball')return ball(id);
    if(w.action==='hunt')return hunt(id);
    return cornerShelf(id);
  }
  function designFor(owner) {
    const [kind,fabric,print]=startDesign[owner];
    return {kind,fabric,print,owner,stitches:0};
  }
  function sayText(parent,text){
    const el=document.createElement('p');el.textContent=text;parent.append(el);return el;
  }
  function preview(parent,d,large=false){
    const c=document.createElement('canvas');c.width=720;c.height=450;c.className='fabric-preview';parent.append(c);
    const g=c.getContext('2d');g.scale(2,2);
    g.fillStyle='#dfc4a2';g.fillRect(0,0,360,225);
    g.strokeStyle='#c5a98c';g.lineWidth=1;
    for(let k=0;k<4;k++){g.beginPath();g.moveTo(0,15+k*63);g.bezierCurveTo(90,25+k*63,260,5+k*63,360,18+k*63);g.stroke();}
    const shape=new Path2D();
    if(d.kind==='bow'){
      shape.moveTo(45,38);shape.quadraticCurveTo(105,25,180,87);shape.quadraticCurveTo(249,28,315,38);
      shape.quadraticCurveTo(337,109,313,186);shape.quadraticCurveTo(246,183,180,132);
      shape.quadraticCurveTo(98,190,46,184);shape.quadraticCurveTo(30,104,45,38);
    }else{
      const m=d.kind==='mat'?18:30;shape.moveTo(m+14,28);shape.quadraticCurveTo(180,17,346-m,28);
      shape.quadraticCurveTo(360-m,28,360-m,45);shape.quadraticCurveTo(369-m,113,360-m,181);
      shape.quadraticCurveTo(359-m,197,345-m,197);shape.quadraticCurveTo(180,207,m+15,197);
      shape.quadraticCurveTo(m,196,m,181);shape.quadraticCurveTo(m-9,115,m,43);shape.quadraticCurveTo(m,28,m+14,28);
    }
    shape.closePath();g.fillStyle=D.fabrics[d.fabric][1];g.shadowBlur=9;g.shadowColor='#967852';g.shadowOffsetY=4;g.fill(shape);
    g.shadowBlur=0;g.shadowOffsetY=0;g.save();g.clip(shape);D.textile(g,360,225,d);
    if(d.kind==='bow'){g.fillStyle=D.fabrics[d.fabric][2];g.fillRect(167,68,26,88);}
    g.restore();g.strokeStyle=D.fabrics[d.fabric][2];g.lineWidth=2;g.stroke(shape);
    if(!large)c.setAttribute('aria-label',D.item(d).name);
    return {c,g};
  }
  function selectRow(label,options,field,draft,render) {
    heading(label);const row=group();row.classList.add('studio-choices');
    for(const [key,def] of Object.entries(options)){
      if(field!=='kind' && !D.available(st,key))continue;
      const b=button(row,typeof def==='string'?def:def[0],()=>{
        const sheet=content.closest('.sheet'),scroll=sheet.scrollTop;
        draft[field]=key;save();render();sheet.scrollTop=scroll;
      });
      b.setAttribute('aria-pressed',draft[field]===key);
      if(field==='fabric')b.style.setProperty('--swatch',def[1]);
    }
  }
  function workshop(owner='manya',requested=false,kit=null){
    if(st.draft){
      const desired=designFor(owner);
      if(kit){desired.fabric=kit.fabric;desired.print=kit.print;}
      const different=st.draft.owner!==owner || st.draft.kind!==desired.kind || st.draft.print!==desired.print || (kit && kit.fabric!==st.draft.fabric);
      if((requested || kit) && different){
        page('На столе у Мани');sayText(content,'Здесь начатая работа для '+genitive[st.draft.owner]+'.');
        button(content,'Продолжить её',resume,'pill wide');
        button(content,kit?'Отложить и взять новый отрез':'Отложить и начать просьбу',()=>{const parked=st.parked||(st.parked=[]);
          const index=parked.findIndex(d=>d.owner===owner&&d.kind===desired.kind&&d.print===desired.print&&(!kit||d.fabric===desired.fabric));
          const next=index<0?desired:parked.splice(index,1)[0];
          parked.push(st.draft);st.draft=next;save();resume();},'ghost-btn');
        return;
      }
      return resume();
    }
    st.draft=designFor(owner);
    if(kit){st.draft.fabric=kit.fabric;st.draft.print=kit.print;}
    save();resume();
  }
  function resume(){
    if(st.draft.stitches===D.stitchCount)return wrap();
    if(st.draft.stitches)return sew();
    designer();
  }
  function designer(){
    const d=st.draft;
    page('Мастерская Мани');
    const p=document.createElement('div');p.className='studio-sample';content.append(p);preview(p,d);
    selectRow('Что сошьём?',D.kinds,'kind',d,designer);
    selectRow('Ткань',D.fabrics,'fabric',d,designer);selectRow('Узор',D.prints,'print',d,designer);
    button(content,'Взять иголку',sew,'pill wide');
    button(content,'Корзинка с материалами',materials,'ghost-btn');
  }
  function seamPoints(kind){
    if(kind==='bow')return [[52,46],[106,54],[156,86],[202,86],[256,55],[307,47],[308,175],[244,158],[193,126],[151,133]];
    const m=kind==='mat'?29:42;
    return [[m+4,42],[114,39],[191,38],[263,40],[352-m,43],[354-m,110],[352-m,181],[247,186],[135,186],[m+4,182]];
  }
  function sew(){
    const d=st.draft,points=seamPoints(d.kind);
    page('Шьём с Маней');
    sayText(content,'Веди пальцем по точкам за золотой бусиной.');
    const holder=document.createElement('div');content.append(holder);
    const {c,g}=preview(holder,d,true);c.classList.add('needle-pad');
    const base=g.getImageData(0,0,c.width,c.height);
    const count=sayText(content,'');count.setAttribute('role','status');
    const tap=button(content,'Сделать стежок',advance,'mini');
    function draw(){
      g.putImageData(base,0,0);g.lineWidth=3;g.strokeStyle='#fff9e5';g.lineCap='round';g.setLineDash([7,4]);
      g.beginPath();points.slice(0,d.stitches).forEach(([x,y],i)=>g[i?'lineTo':'moveTo'](x,y));g.stroke();g.setLineDash([]);
      points.forEach(([x,y],i)=>{
        g.beginPath();g.arc(x,y,i===d.stitches?7:3,0,2*Math.PI);g.fillStyle=i===d.stitches?'#ffcd64':i<d.stitches?'#fff7df':'#665654';g.fill();
        if(i===d.stitches){g.lineWidth=2;g.strokeStyle='#63492c';g.stroke();}
      });
      count.textContent='Стежки '+d.stitches+' из '+D.stitchCount;
    }
    function advance(){
      if(st.draft!==d||d.stitches>=D.stitchCount)return;
      d.stitches++;save();holder.parentElement.querySelector('.ghost-btn')?.setAttribute('hidden','');
      if(d.stitches===D.stitchCount){tap.disabled=true;wrap();return;}
      draw();
    }
    let pointer=null,last=null;
    function trace(e){
      if(pointer!==e.pointerId)return;
      const r=c.getBoundingClientRect();
      const end=[360*(e.clientX-r.left)/r.width,225*(e.clientY-r.top)/r.height];
      let start=last||end;
      while(d.stitches<points.length){
        const [x,y]=points[d.stitches],dx=end[0]-start[0],dy=end[1]-start[1];
        const u=Math.max(0,Math.min(1,((x-start[0])*dx+(y-start[1])*dy)/(dx*dx+dy*dy||1)));
        const match=[start[0]+u*dx,start[1]+u*dy];
        if(Math.hypot(x-match[0],y-match[1])>15)break;
        advance();start=match;
      }
      last=end;
    }
    c.onpointerdown=e=>{if(pointer!==null)return;pointer=e.pointerId;last=null;c.setPointerCapture(pointer);trace(e);};
    c.onpointermove=trace;
    c.onpointerup=c.onpointercancel=c.onlostpointercapture=()=>{pointer=null;last=null;};
    draw();
    if(!d.stitches)button(content,'К выкройке',()=>{if(d.stitches===0)designer();},'ghost-btn');
  }
  function wrap(){
    const d=st.draft;
    page('Кому подарим?');preview(content,d);sayText(content,D.item(d).name);
    const row=group();for(const id of D.toys)button(row,names[id],()=>gift(id));
  }
  function gift(id){
    const d=st.draft;if(!d||d.stitches!==D.stitchCount)return;
    const work={kind:d.kind,fabric:d.fabric,print:d.print,owner:id},item=D.item(work);
    if(!st.made.some(x=>D.key(x)===item.id))st.made.push(work);
    delete st.layout[item.id];state.homeItems[id+item.kind]=item.id;
    st.draft=st.parked?.pop()||null;if(!st.parked?.length)delete st.parked;
    if(item.kind!=='bow')st.nextRest=item.id;
    const thank=complete('make',id,work);
    sync();save();showGift(item,thank);
  }
  function showGift(item,thank=''){
    begin('bedroom',W=>{
      S.LAYOUT.bedroom(W);
      const other=D.toys.filter(k=>k!==item.owner);
      W.pose(item.owner,{x:0,z:-.12,eyes:'happy',ry:item.owner==='shket'?-1.35:0});
      other.forEach((k,i)=>W.pose(k,{x:i?1.22:-1.22,z:-.55,s:.65,ry:k==='shket'?-1.4:0}));
      if(item.kind!=='bow')W.P.findItem(item,.08,.47);
    });
    const options=item.kind==='bow'?[['studio-shelf','Мои работы']]:[['studio-place','Найти место'],['day-bed','Уложить с подарком'],['studio-shelf','Мои работы']];
    caption(item.name,'Подарок для '+genitive[item.owner]+'.'+thank,options);
    controls(a=>{if(a==='studio-place')position(item,item.owner);if(a==='studio-shelf')collection();});
  }
  function collection(){
    page('Сшито с Маней');
    if(!items.length)sayText(content,'Здесь будут подушки, пледы и банты, которые ты сшьёшь для игрушек.');
    for(const it of items.slice().reverse()){
      const row=document.createElement('div');row.className='work-row';content.append(row);
      const thumb=document.createElement('div');row.append(thumb);preview(thumb,it);
      const box=document.createElement('div');row.append(box);
      const title=document.createElement('b');title.textContent=it.name;box.append(title);
      sayText(box,'Для '+genitive[it.owner]);
      button(box,it.kind==='bow'?(workFor('bow',it.owner)?.id===it.id?'Снять бант':'Надеть бант'):'Взять к себе',()=>{
        if(it.kind==='bow'&&workFor('bow',it.owner)?.id===it.id){delete state.homeItems[it.owner+'bow'];save();collection();return;}
        state.homeItems[it.owner+it.kind]=it.id;delete st.layout[it.id];sync();save();showGift(it);
      });
      if(isDecor(it))button(box,'Поставить',()=>position(it,it.owner));
    }
    button(content,'Сшить вещь',()=>workshop(),'pill wide');
  }
  function reward(){
    const id=D.extras.find(k=>!st.materials.includes(k));
    if(!id){
      const fabric=Object.keys(D.fabrics)[days()%Object.keys(D.fabrics).length];
      const print=Object.keys(D.prints)[(days()+2)%Object.keys(D.prints).length];
      st.lastKit={fabric,print};save();
      return {name:'Набор дня: '+D.fabrics[fabric][0]+' и '+D.prints[print][0].toLowerCase(),kind:'mat',color:D.fabrics[fabric][1],mark:'✂',fabric,print};
    }
    st.materials.push(id);
    st.lastKit={fabric:D.fabrics[id]?id:'aqua',print:D.prints[id]?id:'fish'};
    save();
    const name=D.fabrics[id]?'Отрез «'+D.fabrics[id][0]+'»':'Узор «'+D.prints[id][0]+'»';
    return {name,kind:'mat',color:D.fabrics[id]?.[1]||'#d9acac',mark:D.prints[id]? '✿':'✂'};
  }
  function fromChest(){
    const kit=st.lastKit || null;
    workshop('manya',false,kit);
  }
  function materials(){
    page('Корзинка Мани');
    for(const [title,table] of [['Ткани',D.fabrics],['Узоры',D.prints]]){
      heading(title);const row=group();
      for(const [id,def] of Object.entries(table)){
        const sample=document.createElement('span');sample.className='material-chip';sample.textContent=def[0];
        if(!D.available(st,id)){sample.classList.add('locked-material');sample.title='Найдётся в сундуке';sample.textContent+=' · в сундуке';}
        else if(table===D.fabrics)sample.style.borderLeft='10px solid '+def[1];
        row.append(sample);
      }
    }
    button(content,'За шитьё',()=>workshop(),'pill wide');
  }
  function decorables(){return items.concat(S.FINDS.filter(f=>state.unlocked.includes(f.id))).filter(isDecor);}
  function tour(owner){
    begin('bedroom',W=>{W.focusCorner();for(const id of [...D.toys,'veta'])W.pose(id,{visible:false});});
    caption('Уголок у кровати',layout.length?'Можно передвинуть вещь или добавить ещё одну.':'Здесь можно разложить подарки и находки.',[['studio-list','Расставить вещи']]);
    controls(a=>{if(a==='studio-list')cornerShelf(owner);});
  }
  function cornerShelf(owner='peng'){
    page('Уголок у кровати');const available=decorables();
    if(!available.length)sayText(content,'Сшей первую подушку или загляни в сундук за находкой.');
    const row=group();
    for(const it of available)button(row,(st.layout[it.id]?'✓ ':'')+it.name+(it.owner?' · '+names[it.owner]:''),()=>position(it,owner));
    button(content,'Посмотреть уголок',()=>tour(owner),'mini');
    button(content,'В мастерскую',()=>workshop(owner),'mini');
  }
  function position(item,owner){
    const rest=layout.filter(e=>e.item.id!==item.id);
    const clamp=p=>WORLD.cornerPosition(item,p,rest);
    let pos=st.layout[item.id]||clamp({x:0,z:0,turn:0});
    if(!pos){
      for(let z=-1;z<=1&&!pos;z+=.14)for(let x=-1.7;x<=1.7&&!pos;x+=.14)pos=clamp({x,z,turn:0});
    }
    if(!pos){cornerShelf(owner);sayText(content,'Пока тесно. Выбери поставленную вещь и убери на полку.');return;}
    const entries=()=>[...rest,{item,...pos}];
    begin('bedroom',W=>{
      W.focusCorner();for(const id of [...D.toys,'veta'])W.pose(id,{visible:false});
      WORLD.setStudio(items,entries());
    });
    let dragging=null;
    function move(x,z,turn=pos.turn){
      const next=clamp({x,z,turn});
      if(!next){document.getElementById('story').textContent='Здесь тесно. Выбери свободное место.';return;}
      pos=next;WORLD.moveCorner(entries());document.getElementById('story').textContent='Коснись места на ковре или подвинь вещь стрелками.';
    }
    function locate(e){const hit=WORLD.cornerPoint(e.clientX,e.clientY);if(hit)move(hit.x,hit.z);}
    function down(e){dragging=e.pointerId;stage.setPointerCapture(dragging);locate(e);}
    function drag(e){if(dragging===e.pointerId)locate(e);}
    function up(){dragging=null;}
    stage.addEventListener('pointerdown',down);stage.addEventListener('pointermove',drag);stage.addEventListener('pointerup',up);stage.addEventListener('pointercancel',up);
    const actions=[['studio-left','←'],['studio-up','↑'],['studio-down','↓'],['studio-right','→'],['studio-rotate','Повернуть'],['studio-keep','Поставить']];
    if(st.layout[item.id])actions.push(['studio-remove','На полку']);
    caption(item.name,'Коснись места на ковре или подвинь вещь стрелками.',actions);
    const steps={'studio-left':[-.2,0],'studio-right':[.2,0],'studio-up':[0,-.16],'studio-down':[0,.16]};
    controls(a=>{
      if(steps[a])move(pos.x+steps[a][0],pos.z+steps[a][1]);
      if(a==='studio-rotate')move(pos.x,pos.z,(pos.turn+1)%4);
      if(a==='studio-keep'){
        const old=st.layout[item.id];const changed=!old||old.x!==pos.x||old.z!==pos.z||old.turn!==pos.turn;
        st.layout[item.id]={x:pos.x,z:pos.z,turn:pos.turn};
        for(const id of D.toys)if(state.homeItems[id+item.kind]===item.id)delete state.homeItems[id+item.kind];
        const thanks=changed?complete('place',owner):'';
        sync();save();tour(owner);if(thanks)document.getElementById('story').textContent=thanks.trim();
      }
      if(a==='studio-remove'){
        delete st.layout[item.id];if(item.kind==='lamp')delete state.homeItems.lamp;
        sync();save();tour(owner);
      }
    },()=>{
      stage.removeEventListener('pointerdown',down);stage.removeEventListener('pointermove',drag);stage.removeEventListener('pointerup',up);stage.removeEventListener('pointercancel',up);
      sync();
    });
  }
  function sortScene(id,finish){
    const spec={
      socks:{title:'Бельевая корзина',hint:'Соедини два одинаковых носка.',things:['Полоски','Горошек','Ромбики'],targets:['Полоски','Горошек','Ромбики']},
      littleHike:{title:'Собираем Шкета',hint:'Положи в рюкзак карту, кружку и мандаринку.',things:['Карта','Кружка','Мандаринка'],targets:['Рюкзак']},
      pillowCouncil:{title:'Подушки на троих',hint:'Раздай игрушкам по подушке.',things:['Большая','Маленькая','Мягкая'],targets:['Шкет','Маня','Пингвин']}
    }[id];
    page(spec.title);const hint=sayText(content,spec.hint);hint.setAttribute('role','status');
    const board=document.createElement('div');board.className='sorting-board';content.append(board);
    const sources=document.createElement('div'),bins=document.createElement('div');board.append(sources,bins);
    const placed=new Map();let picked=null;
    function tile(parent,index,text,source){
      const b=button(parent,text,()=>source?pick(index):drop(index),'sort-tile');b.dataset[source?'piece':'bin']=index;
      if(id==='socks'){
        const c=document.createElement('canvas');c.width=90;c.height=82;b.prepend(c);
        const g=c.getContext('2d');g.beginPath();g.moveTo(37,9);g.lineTo(68,9);g.lineTo(68,49);g.quadraticCurveTo(66,63,31,73);g.bezierCurveTo(4,77,1,58,17,51);g.lineTo(37,43);g.closePath();g.save();g.clip();
        g.fillStyle=['#98bbbe','#d99399','#ac9aba'][index];g.fillRect(0,0,90,82);g.fillStyle='#fff1cf';
        for(let y=13;y<82;y+=14){if(index===0)g.fillRect(0,y,90,5);else for(let x=6;x<90;x+=16){g.beginPath();if(index===1)g.arc(x,y,3,0,2*Math.PI);else{g.moveTo(x,y-5);g.lineTo(x+4,y);g.lineTo(x,y+5);g.lineTo(x-4,y);}g.fill();}}g.restore();
      }else{
        const symbol=document.createElement('span');symbol.textContent=source?(id==='littleHike'?['🗺️','☕','🍊'][index]:'▰'):(id==='littleHike'?'🎒':['🟤','🐑','🐧'][index]);b.prepend(symbol);
      }
      return b;
    }
    function pick(i){
      if(placed.has(i))return;picked=i;
      sources.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.piece)===i));
    }
    function drop(j){
      if(picked==null||placed.has(picked))return;
      if(id==='socks'&&picked!==j){hint.textContent='У этого носка другой узор. Где его пара?';return;}
      if(id!=='littleHike'&&[...placed.values()].includes(j))return;
      placed.set(picked,j);
      sources.querySelector('[data-piece="'+picked+'"]').disabled=true;
      const bin=bins.querySelector('[data-bin="'+j+'"]');
      if(id!=='littleHike')bin.disabled=true;
      bin.append(document.createTextNode(' ✓'));picked=null;
      hint.textContent=placed.size+' из '+spec.things.length;
      if(placed.size===spec.things.length)finish(id==='pillowCouncil'?[...placed].map(([part,toy])=>({part,toy})):null);
    }
    for(let i=0;i<spec.things.length;i++)tile(sources,i,spec.things[i],true);
    let gesture=null,ghost=null;
    function clearDrag(){gesture=null;ghost?.remove();ghost=null;}
    board.onpointerdown=e=>{
      const source=e.target.closest('[data-piece]');
      if(!source||source.disabled||gesture)return;
      gesture={id:e.pointerId,source,index:Number(source.dataset.piece),x:e.clientX,y:e.clientY};
      board.setPointerCapture(e.pointerId);
    };
    board.onpointermove=e=>{
      if(gesture?.id!==e.pointerId)return;
      if(!ghost){
        if(Math.hypot(gesture.x-e.clientX,gesture.y-e.clientY)<7)return;
        pick(gesture.index);
        ghost=gesture.source.cloneNode(true);delete ghost.dataset.piece;
        const original=gesture.source.querySelector('canvas');
        if(original)ghost.querySelector('canvas').getContext('2d').drawImage(original,0,0);
        ghost.classList.add('piece-ghost');board.append(ghost);
      }
      ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';
    };
    board.onpointerup=e=>{
      if(gesture?.id!==e.pointerId)return;
      const i=gesture.index,dragged=ghost||Math.hypot(gesture.x-e.clientX,gesture.y-e.clientY)>7;
      clearDrag();pick(i);
      if(dragged){
        for(const dest of bins.querySelectorAll('[data-bin]')){
          const r=dest.getBoundingClientRect();
          if(e.clientX>=r.left && e.clientX<=r.right && e.clientY>=r.top && e.clientY<=r.bottom){drop(Number(dest.dataset.bin));break;}
        }
      }
    };
    board.onlostpointercapture=board.onpointercancel=clearDrag;
    const order=id==='socks'?[2,0,1]:spec.targets.map((_,i)=>i);
    for(const i of order)tile(bins,i,spec.targets[i],false);
  }
  function unwrap(finish){
    page('Посылка от Жени');
    const panel=document.createElement('div');panel.className='parcel-pad';content.append(panel);
    const lid=document.createElement('div');lid.className='parcel-lid';const tag=document.createElement('span');tag.textContent='Вете';lid.append(tag);panel.append(lid);
    const hint=sayText(content,'Потяни ленту вправо.');let step=0,origin;
    const advance=()=>{
      if(step===0){step++;panel.classList.add('untied');hint.textContent='Теперь подними крышку.';b.textContent='Поднять крышку';}
      else finish();
    };
    const b=button(content,'Развязать бант',advance);
    panel.onpointerdown=e=>{origin=[e.clientX,e.clientY];panel.setPointerCapture(e.pointerId);};
    panel.onpointerup=e=>{if(origin&&(step===0?e.clientX-origin[0]>30:origin[1]-e.clientY>30))advance();origin=null;};
    panel.onpointercancel=()=>{origin=null;};
  }
  sync();
  return {sortScene,unwrap,workshop,collection,materials,reward,fromChest,isPlaced:id=>!!st.layout[id],stow(id){delete st.layout[id];sync();save();},workFor,request,wishlist,featured,startRequest,complete,cornerShelf,position,tour,sync,
    getPending:()=>st.nextRest, takeRest(){const id=st.nextRest;st.lastRest=id;delete st.nextRest;return id;},
    lastRest:()=>st.lastRest};
};
