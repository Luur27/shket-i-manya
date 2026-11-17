/* Выкройки, материалы и сохранение работ Веты. */
window.STUDIO = (() => {
  const fabrics = {
    cream: ['Сливки','#ead7b7','#856553'], aqua: ['Морская пена','#9bc7bc','#486f70'],
    rose: ['Чайная роза','#d99aa2','#824d60'], plum: ['Слива','#9983b0','#514368'],
    denim: ['Джинса','#7399bb','#324f70'], honey: ['Мёд','#dfb05e','#895b31'],
    moss: ['Мох','#93ac77','#506442'], cocoa: ['Какао','#b6937e','#684b46']
  };
  const prints = {fish:['Рыбки','рыбками'],star:['Звёзды','звёздами'],berry:['Ягодки','ягодками'],
    moon:['Месяцы','месяцами'],heart:['Сердца','сердцами'],leaf:['Листочки','листочками'],
    capy:['Капибары','капибарами'],paw:['Лапки','лапками'],orange:['Мандарины','мандаринами']};
  const kinds = {pillow:'Подушка', mat:'Плед', bow:'Бант'};
  const toys = ['peng','manya','shket'];
  const basic = ['cream','aqua','rose','fish','star','berry'];
  const extras = ['plum','moon','denim','heart','honey','leaf','moss','paw','cocoa','orange','capy'];
  const has=(obj,id)=>Object.hasOwn(obj,id);
  const stitchCount=10;
  function design(d){return d && has(kinds,d.kind) && has(fabrics,d.fabric) && has(prints,d.print);}
  function available(st,id){return basic.includes(id)||st.materials.includes(id);}
  function key(d){return ['made',d.owner,d.kind,d.fabric,d.print].join('-');}
  function item(d){
    return {id:key(d),kind:d.kind,fabric:d.fabric,color:fabrics[d.fabric][1],ink:fabrics[d.fabric][2],print:d.print,
      owner:d.owner,name:(d.kind==='mat'&&d.print==='capy'?'Коврик-капибара':kinds[d.kind]+' с '+prints[d.print][1])+' · '+fabrics[d.fabric][0]};
  }
  function dayIndex(date){return Math.floor(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())/86400000);}
  function fresh(date){return {start:dayIndex(date),materials:[],made:[],layout:{},thanks:{},draft:null};}
  function valid(st,unlocked=[]){
    const dict=o=>o && typeof o==='object' && !Array.isArray(o);
    if(!dict(st)||!Number.isSafeInteger(st.start)||!Array.isArray(st.materials)||!st.materials.every(k=>extras.includes(k))||
        !Array.isArray(st.made)||!dict(st.layout)||!dict(st.thanks))return false;
    const owned=new Set(unlocked);
    for(const d of st.made){
      if(!design(d)||!toys.includes(d.owner)||!available(st,d.fabric)||!available(st,d.print)||owned.has(key(d)))return false;
      owned.add(key(d));
    }
    const validDraft=d=>design(d)&&toys.includes(d.owner)&&available(st,d.fabric)&&available(st,d.print)&&Number.isInteger(d.stitches)&&d.stitches>=0&&d.stitches<=stitchCount;
    if(st.draft!=null&&!validDraft(st.draft))return false;
    if(st.parked!==undefined&&(!Array.isArray(st.parked)||!st.parked.every(validDraft)))return false;
    if(st.lastKit && !(design({kind:'mat',...st.lastKit}) && available(st,st.lastKit.fabric) && available(st,st.lastKit.print)))return false;
    if(st.lastRest!==undefined&&!st.made.some(d=>d.kind!=='bow'&&key(d)===st.lastRest))return false;
    if(st.nextRest!==undefined&&!st.made.some(d=>d.kind!=='bow'&&key(d)===st.nextRest))return false;
    return Object.entries(st.layout).every(([id,p])=>owned.has(id)&&dict(p)&&Number.isFinite(p.x)&&Math.abs(p.x)<=2&&Number.isFinite(p.z)&&Math.abs(p.z)<=1.3&&[0,1,2,3].includes(p.turn)) &&
      Object.entries(st.thanks).every(([id,n])=>toys.includes(id)&&Number.isSafeInteger(n));
  }
  function motif(c,id,x,y,r,ink){
    c.save();c.translate(x,y);c.scale(r,r);c.fillStyle=c.strokeStyle=ink;c.lineWidth=.10;c.lineJoin='round';
    const oval=(x,y,w,h,angle=0)=>{c.beginPath();c.ellipse(x,y,w,h,angle,0,Math.PI*2);c.fill();};
    c.beginPath();
    if(id==='fish'){
      oval(-.13,0,.72,.42);c.moveTo(.4,0);c.lineTo(.97,-.43);c.lineTo(.97,.43);c.fill();
      c.fillStyle='#fff5dd';oval(-.48,-.07,.09,.09);
    }else if(id==='star'){for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,rad=i%2?.4:.92;c[i?'lineTo':'moveTo'](Math.cos(a)*rad,Math.sin(a)*rad);}c.closePath();c.fill();}
    else if(id==='berry'){for(const [a,b] of [[-.36,.15],[.34,.2],[0,.55]])oval(a,b,.37,.37);c.beginPath();c.moveTo(-.35,-.12);c.quadraticCurveTo(.15,-.95,.43,-.72);c.stroke();}
    else if(id==='moon'){c.arc(0,0,.8,.32*Math.PI,1.72*Math.PI);c.quadraticCurveTo(-.48,0,.43,.68);c.fill();}
    else if(id==='heart'){c.moveTo(0,.8);c.bezierCurveTo(-1.7,-.35,-.65,-1.15,0,-.40);c.bezierCurveTo(.65,-1.15,1.7,-.35,0,.8);c.fill();}
    else if(id==='leaf'){oval(0,0,.78,.35,-.66);c.strokeStyle='#fff0cf';c.beginPath();c.moveTo(-.56,.45);c.lineTo(.55,-.42);c.stroke();}
    else if(id==='paw'){oval(0,.28,.53,.41);for(const [a,b] of [[-.59,-.12],[-.24,-.53],[.21,-.54],[.57,-.15]])oval(a,b,.19,.24);}
    else if(id==='capy'){oval(-.10,.15,.77,.42);oval(.44,-.11,.45,.35);oval(.69,-.05,.29,.21);oval(.29,-.40,.12,.14);c.fillStyle='#fff1cf';oval(.57,-.20,.055,.06);}
    else{oval(0,.12,.7,.64);oval(.27,-.61,.36,.13,-.35);}
    c.restore();
  }
  function textile(c,w,h,d){
    const [,color,ink]=fabrics[d.fabric];c.fillStyle=color;c.fillRect(0,0,w,h);
    c.strokeStyle='rgba(255,250,230,.17)';c.lineWidth=1;c.beginPath();
    for(let x=0;x<w;x+=5){c.moveTo(x,0);c.lineTo(x,h);}for(let y=0;y<h;y+=4){c.moveTo(0,y);c.lineTo(w,y);}c.stroke();
    for(let row=0;row<4;row++)for(let col=-1;col<4;col++)motif(c,d.print,(col+.5+(row%2)*.5)*w/3,(row+.5)*h/4,Math.min(w/3,h/4)*.23,ink);
  }
  return {fabrics,prints,kinds,toys,basic,extras,stitchCount,available,key,item,dayIndex,fresh,valid,motif,textile};
})();
