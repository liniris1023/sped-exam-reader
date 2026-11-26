/* 森林注音拼拼樂 — 主程式 */
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const pick=a=>a[Math.random()*a.length|0];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ================= 注音基本資料 ================= */
const INI=[...'ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙ'];
const MED=[...'ㄧㄨㄩ'];
const FIN=[...'ㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦ'];
const INI_ROWS=['ㄅㄆㄇㄈ','ㄉㄊㄋㄌ','ㄍㄎㄏ','ㄐㄑㄒ','ㄓㄔㄕㄖ','ㄗㄘㄙ'];
const TM={1:'',2:'ˊ',3:'ˇ',4:'ˋ',5:'˙'};
const TNAME={1:'一聲',2:'二聲',3:'三聲',4:'四聲',5:'輕聲'};
const TSHOW={1:'ˉ',2:'ˊ',3:'ˇ',4:'ˋ',5:'˙'};
function toneSVG(t,sz=60,col='#b2306b'){const w=sz,h=sz,sw=Math.max(4,sz/9);
  const p={1:`<line x1="${w*.15}" y1="${h*.5}" x2="${w*.85}" y2="${h*.5}"/>`,2:`<line x1="${w*.25}" y1="${h*.8}" x2="${w*.75}" y2="${h*.2}"/>`,
   3:`<polyline fill="none" points="${w*.22},${h*.25} ${w*.5},${h*.78} ${w*.78},${h*.25}"/>`,4:`<line x1="${w*.25}" y1="${h*.2}" x2="${w*.75}" y2="${h*.8}"/>`,
   5:`<circle cx="${w/2}" cy="${h/2}" r="${sz/8}" fill="${col}" stroke="none"/>`}[t];
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`}
const CATN={i:'聲母',m:'介音',f:'韻母',t:'聲調'};
const cat=c=>INI.includes(c)?'i':MED.includes(c)?'m':FIN.includes(c)?'f':'';
const hex=s=>[...s].map(c=>c.codePointAt(0).toString(16).padStart(4,'0')).join('');
const SIMILAR=['ㄅㄆㄇㄈ','ㄉㄊㄋㄌ','ㄍㄎㄏ','ㄐㄑㄒ','ㄓㄗㄔㄘㄕㄙㄖ','ㄚㄛㄜㄝ','ㄞㄟㄠㄡ','ㄢㄣㄤㄥ','ㄧㄨㄩ'];

/* 題庫 */
const BANK=window.BANK.map(r=>({zy:r[0],i:r[1],m:r[2],f:r[3],t:r[4],n:r[5],ch:r[6],chk:!!r[7],common:!!r[8]}));
const BYZY={};BANK.forEach(b=>{BYZY[b.zy]=b});
const BASE={};BANK.forEach(b=>{const k=b.i+b.m+b.f;(BASE[k]=BASE[k]||[]).push(b.t)});
const PICS=window.PICS;const PICBY={};PICS.forEach(p=>{(PICBY[p.zy]=PICBY[p.zy]||[]).push(p)});
const zyOf=(i,m,f,t)=>i+m+f+TM[t];

/* ================= 儲存 ================= */
const LS={get(k,d){try{const v=localStorage.getItem('fz_'+k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem('fz_'+k,JSON.stringify(v))}catch(e){}}};
const PRESET={
  low:{pic:true,partial:true,four:true,catkb:false,fullkb:false,giveTone:true,toneHint:true,slow:true,hintBtn:true,errPos:true,review:true,showSlots:true,modes:['listen','pic','missF','missI']},
  mid:{pic:false,partial:false,four:false,catkb:true,fullkb:false,giveTone:false,toneHint:true,slow:false,hintBtn:true,errPos:true,review:true,showSlots:true,modes:['listen','pic']},
  high:{pic:false,partial:false,four:false,catkb:false,fullkb:true,giveTone:false,toneHint:false,slow:false,hintBtn:false,errPos:true,review:true,showSlots:false,modes:['listen']},
  seed:{review:true,modes:['findSym']}
};
const DEFCFG=()=>({inis:INI.slice(),noIni:true,types:[2],meds:MED.slice(),fins:FIN.slice(),tones:[1,2,3,4],level:'low',count:10,commonOnly:true,
  seedSyms:[...'ㄅㄆㄇㄈ'],seedOpts:4,seedSimilar:true,
  scaf:{low:{...PRESET.low},mid:{...PRESET.mid},high:{...PRESET.high},seed:{...PRESET.seed}}});
let CFG=Object.assign(DEFCFG(),LS.get('cfg',{}));
Object.keys(PRESET).forEach(l=>{CFG.scaf[l]=Object.assign({...PRESET[l]},(CFG.scaf||{})[l]||{})});
const saveCfg=()=>LS.set('cfg',CFG);
let STUDENTS=LS.get('students',['宣軒','粲鈞','登輝','測試者']);
if(!LS.get('addTester',false)){if(!STUDENTS.includes('測試者'))STUDENTS.push('測試者');LS.set('students',STUDENTS);LS.set('addTester',true)}
let ME=null; // 目前學生
const SCAF_NAMES={pic:'圖片提示',partial:'部分注音提示',four:'四個注音選項',catkb:'分類注音鍵盤',fullkb:'完整注音鍵盤',giveTone:'直接提供聲調',toneHint:'聲調選項提示（只出現存在的聲調）',slow:'慢速拼讀按鈕',hintBtn:'按鍵式提示',errPos:'錯誤位置提示',review:'錯題複習',showSlots:'顯示定位格數量'};
const MODE_NAMES={listen:'聽音拼注音',pic:'看圖拼注音',missI:'補上缺少的聲母',missM:'補上缺少的介音',missF:'補上缺少的韻母',tone:'選擇正確聲調'};
const LEVELS=['seed','low','mid','high'];
const LV_NAMES={seed:'基礎・森林小種子',low:'低階・森林小萌芽',mid:'中階・森林探險家',high:'高階・森林拼音王'};

/* 獎勵 / 森林居民 */
const RESIDENTS=[
  {id:'rabbit',name:'兔兔',img:'pic/c_rabbit.webp',need:0},
  {id:'squirrel',name:'松松',img:'pic/c_squirrel.webp',need:10},
  {id:'tanuki',name:'狸狸',img:'pic/c_tanuki.webp',need:25},
  {id:'fox',name:'狐狐',img:'pic/c_fox.webp',need:45},
  {id:'bear',name:'小熊',img:'pic/w_熊.webp',need:70},
  {id:'deer',name:'小鹿',img:'pic/w_鹿.webp',need:100},
  {id:'frog',name:'青蛙',img:'pic/w_蛙.webp',need:130},
  {id:'duck',name:'鴨鴨',img:'pic/w_鴨.webp',need:165},
  {id:'sheep',name:'綿羊',img:'pic/w_羊.webp',need:200},
  {id:'turtle',name:'烏龜',img:'pic/w_龜.webp',need:250}];
const FRUITS=['🍎','🍐','🍊','🍑','🍇','🍓'];
const rw=()=>{const all=LS.get('rewards',{});return all[ME]||(all[ME]={leaves:0,fruits:0,gifts:0})};
function addReward(k,n=1){const all=LS.get('rewards',{});const r=all[ME]||{leaves:0,fruits:0,gifts:0};const before=unlocked(r.leaves).length;r[k]+=n;all[ME]=r;LS.set('rewards',all);updateBar();return unlocked(r.leaves).length>before}
const unlocked=l=>RESIDENTS.filter(x=>l>=x.need);

/* ================= 語音 ================= */
const AU={rate:LS.get('rate',1),token:0,cur:null,over:{},missing:new Set()};
const symKey=c=>'sym_'+hex(c), sylKey=zy=>'syl_'+hex(zy), toneKey=t=>'tone_'+t, picKey=ch=>'pic_'+hex(ch);
function aurl(k){return AU.over[k]||('audio/'+k+'.mp3')}
function playOne(k){return new Promise(res=>{
  const a=new Audio(aurl(k));a.playbackRate=AU.rate;a.preservesPitch=true;AU.cur=a;let done=false;
  const fin=()=>{if(!done){done=true;res()}};
  a.onended=fin;a.onerror=()=>{AU.missing.add(k);fin()};
  a.play().catch(fin);
  setTimeout(fin,8000);
})}
function stopAudio(){AU.token++;if(AU.cur){try{AU.cur.pause()}catch(e){}}clearLit()}
async function seq(list){
  stopAudio();const t=AU.token;
  for(const it of list){
    if(t!==AU.token)return false;
    if(typeof it==='number'){await sleep(it/AU.rate);continue}
    const o=typeof it==='string'?{k:it}:it;
    o.on&&o.on();await playOne(o.k);
    if(t!==AU.token)return false;
    o.off&&o.off();await sleep(o.gap!=null?o.gap:180);
  }
  return t===AU.token;
}
const say=(...k)=>seq(k);
function clearLit(){$$('.lit').forEach(e=>e.classList.remove('lit'))}
/* 教師自訂音檔（IndexedDB） */
const IDB={db:null,open(){return new Promise(r=>{try{const q=indexedDB.open('forestzy',1);q.onupgradeneeded=()=>q.result.createObjectStore('audio');q.onsuccess=()=>{this.db=q.result;r()};q.onerror=()=>r()}catch(e){r()}})},
  put(k,blob){return new Promise(r=>{const tx=this.db.transaction('audio','readwrite');tx.objectStore('audio').put(blob,k);tx.oncomplete=r;tx.onerror=r})},
  del(k){return new Promise(r=>{const tx=this.db.transaction('audio','readwrite');tx.objectStore('audio').delete(k);tx.oncomplete=r;tx.onerror=r})},
  all(){return new Promise(r=>{if(!this.db)return r({});const out={};const tx=this.db.transaction('audio');const st=tx.objectStore('audio');const c=st.openCursor();c.onsuccess=()=>{const cur=c.result;if(cur){out[cur.key]=cur.value;cur.continue()}else r(out)};c.onerror=()=>r(out)})}};
async function loadOverrides(){await IDB.open();const all=await IDB.all();for(const k in all){AU.over[k]=URL.createObjectURL(all[k])}}

/* ================= 共用 UI ================= */
const view=$('#view');
function setTitle(t){$('#title').textContent=t}
function updateBar(){
  $('#who').innerHTML=ME?`🙂 ${esc(ME)}`:'';
  if(ME){const r=rw();$('#leaves').innerHTML=`🍃 ${r.leaves}　${FRUITS[0]} ${r.fruits}　🎁 ${r.gifts}`;$('#leaves').classList.remove('hide')}else $('#leaves').classList.add('hide');
}
function popCard(html,ms=1400){const p=$('#pop');p.innerHTML=`<div class="card">${html}</div>`;p.classList.remove('hide');clearTimeout(popCard.t);popCard.t=setTimeout(()=>p.classList.add('hide'),ms)}
function flyLeaf(fromEl){
  const r=(fromEl||view).getBoundingClientRect(), to=$('#leaves').getBoundingClientRect();
  const s=document.createElement('div');s.className='leaf-fly';s.textContent='🍃';
  s.style.left=(r.left+r.width/2)+'px';s.style.top=(r.top+r.height/2)+'px';document.body.appendChild(s);
  requestAnimationFrame(()=>{s.style.left=(to.left+10)+'px';s.style.top=(to.top)+'px';s.style.transform='scale(.5) rotate(360deg)'});
  setTimeout(()=>{s.remove();$('#leaves').classList.add('bounce');setTimeout(()=>$('#leaves').classList.remove('bounce'),1300)},950);
}
function modal(html){$('#modal').innerHTML=`<div class="panel">${html}</div>`;$('#modal').classList.remove('hide')}
function closeModal(){$('#modal').classList.add('hide');$('#modal').innerHTML=''}
$('#modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal()});
function keyHTML(c,extra=''){const k=cat(c);return `<button class="key ${k} ${extra}" data-s="${c}">${c}</button>`}
function toneKeyHTML(t,extra=''){return `<button class="key t ${extra}" data-t="${t}">${toneSVG(t,34)}<small>${TNAME[t]}</small></button>`}
function fullKeyboard(opts={}){
  const row=(lab,arr,cls)=>`<div class="kbrow"><div class="lab">${lab}</div>${arr.map(c=>keyHTML(c,cls&&cls(c)||'')).join('')}</div>`;
  let h='<div class="kb">';
  if(!opts.only||opts.only==='i')h+=row('聲母',INI,opts.cls);
  if(opts.compact&&!opts.only){h+=`<div class="kbrow"><div class="lab">介音</div>${MED.map(c=>keyHTML(c,opts.cls&&opts.cls(c)||'')).join('')}<div class="lab" style="margin-left:10px">韻母</div>${FIN.map(c=>keyHTML(c,opts.cls&&opts.cls(c)||'')).join('')}</div>`}
  else{
  if(!opts.only||opts.only==='m')h+=row('介音',MED,opts.cls);
  if(!opts.only||opts.only==='f')h+=row('韻母',FIN,opts.cls);}
  if(opts.tones)h+=`<div class="kbrow"><div class="lab">聲調</div>${opts.tones.map(t=>toneKeyHTML(t,opts.tcls&&opts.tcls(t)||'')).join('')}</div>`;
  return h+'</div>';
}
/* 直式注音：slots=[{s,c,cls,idx}], tone */
let SLOTH=106;
let SLOT_OFF=470;
function slotSize(){const s=Math.round(Math.max(66,Math.min(104,(innerHeight-SLOT_OFF)/3)));document.documentElement.style.setProperty('--s',s+'px');return s}
function vzHTML(slots,tone,o={}){SLOTH=slotSize()+6;
  const dot=tone===5?`<div class="dot ${o.toneCls||''}" data-tone="1">${toneSVG(5,40)}</div>`:'';
  const col=slots.map((x,k)=>`<div class="slot ${x.c||''} ${x.s?'fill':''} ${x.cls||''}" data-idx="${k}">${x.s||''}${o.tags&&!x.s&&x.c?`<span class="tag">${CATN[x.c]}</span>`:''}</div>`).join('');
  let tn='';
  if(tone&&tone!==1&&tone!==5){tn=`<div class="tonebox ${o.toneCls||''}" data-tone="1" style="margin-top:${(slots.length-1)*SLOTH}px">${toneSVG(tone,52)}</div>`}
  else if(o.toneEmpty){tn=`<div class="tonebox empty" data-tone="1" style="margin-top:${Math.max(0,slots.length-1)*SLOTH}px">調</div>`}
  else tn=`<div class="tonebox"></div>`;
  return `<div class="vz"><div class="col">${dot}${col}<div class="tn" style="top:${tone===5?40+6:0}px">${tn}</div></div></div>`;
}
function exampleOf(zy){const b=BYZY[zy];if(!b)return '';const p=PICBY[zy];return p?p[0].ch:b.ch}

/* ================= 畫面：選名字 ================= */
function goNames(){
  stopAudio();ME=null;updateBar();setTitle('森林注音拼拼樂');$('#homeBtn').classList.add('hide');
  const imgs=['c_rabbit','c_squirrel','c_tanuki','c_fox'];
  view.innerHTML=`<div class="panel" style="text-align:center"><div class="sign">🌳 請選出你的名字</div>
  <div class="names">${STUDENTS.map((n,k)=>`<button class="namecard" data-n="${esc(n)}"><img src="pic/${imgs[k%4]}.webp" alt="">${esc(n)}</button>`).join('')}
  <button class="namecard" data-t="1" style="font-size:30px;background:var(--wood-l)"><span style="font-size:80px">🏡</span>老師</button></div></div>`;
  view.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>{ME=b.dataset.n;LS.set('me',ME);say('name_'+ME);goHome()});
  view.querySelector('[data-t]').onclick=()=>{ME='老師';goTeacher()};
  setTimeout(()=>say('ins_name'),300);
}
/* ================= 首頁 ================= */
function goHome(){
  stopAudio();updateBar();setTitle('森林注音拼拼樂');$('#homeBtn').classList.remove('hide');
  const r=rw(), un=unlocked(r.leaves);
  view.innerHTML=`${taskBanner()}<div class="home">
   <button class="door a" id="dFree"><img src="pic/c_rabbit.webp" alt=""><div>自由拼音<br><small>點一點，聽一聽</small></div></button>
   <button class="door b" id="dQuiz"><img src="pic/c_squirrel.webp" alt=""><div>拼音闖關<br><small>森林冒險去</small></div></button>
   <button class="door c" id="dTea"><img src="pic/c_tanuki.webp" alt=""><div>老師專區<br><small>出題・紀錄</small></div></button></div>
   <div class="panel yard"><div class="stat">🍃 葉子 <b>${r.leaves}</b></div><div class="stat">🍎 水果 <b>${r.fruits}</b></div><div class="stat">🎁 禮物 <b>${r.gifts}</b></div>
   <div class="residents">${RESIDENTS.map(x=>un.includes(x)?`<img src="${x.img}" title="${x.name}" alt="${x.name}">`:`<div class="lock" title="再收集 ${x.need-r.leaves} 片葉子">🔒</div>`).join('')}</div>
   <div style="flex:1"></div><button class="sbtn" id="swName">換人</button></div>`;
  $('#dFree').onclick=goFree;$('#dQuiz').onclick=goLevels;$('#dTea').onclick=()=>teacherGate();$('#swName').onclick=goNames;
  bindTaskBanner();if(myTasks().length)setTimeout(()=>say('ins_task'),700);
}
function teacherGate(){
  modal(`<div style="text-align:center"><div class="sign">老師專區</div><p style="font-size:24px">請老師按住下面的按鈕 2 秒</p>
  <button class="big w" id="hold" style="width:280px">🔒 按住開啟</button><p><button class="sbtn" onclick="closeModal()">取消</button></p></div>`);
  let t=null;const b=$('#hold');
  const start=e=>{e.preventDefault();b.textContent='⏳ 繼續按住…';t=setTimeout(()=>{closeModal();goTeacher()},1800)};
  const end=()=>{clearTimeout(t);b.textContent='🔒 按住開啟'};
  b.addEventListener('pointerdown',start);b.addEventListener('pointerup',end);b.addEventListener('pointerleave',end);
}

/* ================= 自由拼音 ================= */
const FREE={mode:'2',slots:[],tone:0,act:0,last:null};
function goFree(){SLOT_OFF=470;
  stopAudio();setTitle('自由拼音');FREE.slots=[];FREE.tone=0;FREE.act=0;
  view.innerHTML=`<div class="panel">
   <div class="work3">
     <div class="ctlL"><div class="seg" id="fMode"><button data-m="2">二拼</button><button data-m="3">三拼</button><button data-m="free">自由</button></div><button class="big g" id="fSlow">🐢 慢速拼讀</button><button class="big y" id="fFull">🔊 完整拼讀</button><button class="big" id="fRep">🔁 重複播放</button></div>
     <div class="vzwrap" id="fVz"></div>
     <div class="ctlR"><div class="row2"><button class="big" id="fBack">⌫ 退格</button><button class="big" id="fClr">🧹 清除</button></div>
     <button class="big w" id="fRe">🌱 重新拼音</button><div class="example" id="fEx"></div>
     <div class="speed">🐢<input type="range" id="rate" min="0.6" max="1.3" step="0.1" value="${AU.rate}">🐇</div></div>
     <div class="kbArea"><div class="msg" id="fMsg"></div>${fullKeyboard({tones:[1,2,3,4,5],compact:true})}</div></div></div>`;
  $$('#fMode button').forEach(b=>{b.classList.toggle('on',b.dataset.m===FREE.mode);b.onclick=()=>{FREE.mode=b.dataset.m;goFree()}});
  $('#rate').oninput=e=>{AU.rate=+e.target.value;LS.set('rate',AU.rate)};
  view.querySelectorAll('.key[data-s]').forEach(k=>k.onclick=()=>freeKey(k.dataset.s,k));
  view.querySelectorAll('.key[data-t]').forEach(k=>k.onclick=()=>{FREE.tone=+k.dataset.t;say(toneKey(FREE.tone));freeRender()});
  $('#fSlow').onclick=()=>freePlay(true);$('#fFull').onclick=()=>freePlay(false);$('#fRep').onclick=()=>FREE.last?seq(FREE.last):freePlay(false);
  $('#fBack').onclick=()=>{const filled=FREE.slots.map((s,i)=>s?i:-1).filter(i=>i>=0);if(FREE.tone){FREE.tone=0}else if(filled.length){const k=filled.pop();FREE.slots[k]='';FREE.act=FREE.mode==='free'?k:k}freeRender()};
  $('#fClr').onclick=()=>{stopAudio();freeReset();freeRender()};
  $('#fRe').onclick=()=>{stopAudio();freeReset();freeRender();say('ins_free')};
  freeReset();freeRender();say('ins_free');
}
function freeReset(){const n=FREE.mode==='3'?3:FREE.mode==='2'?2:3;FREE.slots=Array(n).fill('');FREE.tone=0;FREE.act=0;FREE.last=null}
function freeCats(){return FREE.mode==='3'?['i','m','f']:FREE.mode==='free'?['i','m','f']:['','']}
function freeKey(s,el){
  const c=cat(s);let k;
  if(FREE.mode==='2'){k=FREE.act;}
  else{k=['i','m','f'].indexOf(c);if(FREE.mode==='3'&&FREE.act!==k&&FREE.slots[FREE.act]===''){/* 三拼依類別放入 */}}
  if(FREE.mode==='2'&&k>=FREE.slots.length){$('#fMsg').textContent='格子滿了，點格子可以修改喔';$('#fMsg').className='msg warn';say(symKey(s));return}
  FREE.slots[k]=s;
  if(FREE.mode==='2'){const nx=FREE.slots.findIndex(x=>!x);FREE.act=nx<0?FREE.slots.length:nx}
  say(symKey(s));freeRender();
}
function freeParse(){
  let i='',m='',f='';
  for(const s of FREE.slots){if(!s)continue;const c=cat(s);if(c==='i'&&!i&&!m&&!f)i=s;else if(c==='m'&&!m&&!f)m=s;else if(c==='f'&&!f)f=s;else return null}
  return {i,m,f};
}
function freeRender(){
  const cats=freeCats();
  const slots=FREE.slots.map((s,k)=>({s,c:s?cat(s):(cats[k]||''),cls:(k===FREE.act?'act':'')+(FREE.mode==='free'&&!s?' ghost':'')}));
  $('#fVz').innerHTML=vzHTML(slots,FREE.tone||0,{tags:FREE.mode!=='2'});
  $$('#fVz .slot').forEach(el=>el.onclick=()=>{FREE.act=+el.dataset.idx;const s=FREE.slots[FREE.act];if(s)say(symKey(s));freeRender()});
  view.querySelectorAll('.key[data-t]').forEach(k=>k.classList.toggle('sel',+k.dataset.t===FREE.tone));
  // 合法檢查
  const p=freeParse(), msg=$('#fMsg'), ex=$('#fEx');msg.className='msg';msg.textContent='';ex.innerHTML='';
  const filled=FREE.slots.filter(Boolean).length;
  const need=FREE.mode==='free'?1:FREE.slots.length;
  if(!p){msg.className='msg warn';msg.textContent='順序要是「聲母→介音→韻母」喔';return}
  if(filled>=need){
    const base=p.i+p.m+p.f, tones=BASE[base];
    if(!tones){msg.className='msg warn';msg.textContent='🌱 這樣拼沒有這個音喔，換一個試試看';FREE.warned!==base&&say('ins_invalid');FREE.warned=base;return}
    if(FREE.tone&&!tones.includes(FREE.tone)){msg.className='msg warn';msg.textContent=`這個音沒有${TNAME[FREE.tone]}，可以試試：${tones.map(t=>TNAME[t]).join('、')}`;return}
    if(FREE.tone){const zy=zyOf(p.i,p.m,p.f,FREE.tone);msg.textContent='拼好了！按「完整拼讀」聽聽看';ex.innerHTML=`例如：<b>${exampleOf(zy)}</b>`}
    else msg.textContent='再選一個聲調吧';
  }
}
function freePlay(slow){
  const p=freeParse();if(!p)return;
  const items=[];const els=()=>$$('#fVz .slot');
  if(slow){FREE.slots.forEach((s,k)=>{if(s)items.push({k:symKey(s),on:()=>{clearLit();els()[k].classList.add('lit')},gap:350})});
    if(FREE.tone&&FREE.tone!==1)items.push({k:toneKey(FREE.tone),on:()=>{clearLit();const t=$('#fVz [data-tone]');t&&t.classList.add('lit')},gap:350})}
  const base=p.i+p.m+p.f;
  if(FREE.tone&&BASE[base]&&BASE[base].includes(FREE.tone)){items.push({k:sylKey(zyOf(p.i,p.m,p.f,FREE.tone)),on:()=>{clearLit();els().forEach(e=>e.classList.add('lit'))},off:clearLit})}
  else if(!slow&&items.length===0){$('#fMsg').className='msg warn';$('#fMsg').textContent=!BASE[base]?'這樣拼沒有這個音喔':FREE.tone?'這個音沒有這個聲調喔':'先選一個聲調吧';}
  if(items.length){FREE.last=items;seq(items)}
}

/* ================= 老師任務 ================= */
const MCODE={listen:'L',pic:'P',missI:'I',missM:'M',missF:'F',tone:'T',findSym:'S'};
const MDEC=Object.fromEntries(Object.entries(MCODE).map(([k,v])=>[v,k]));
const getTasks=()=>LS.get('tasks',[]), saveTasks=t=>LS.set('tasks',t);
function itemsFor(task,name){return (task.items[name]||task.items['*']||[])}
function myTasks(){return getTasks().filter(t=>t.students.includes(ME)&&!(t.done||{})[ME])}
const SITE_URL='https://liniris1023.github.io/sped-exam-reader/forest-zhuyin/';
function b64u(str){return btoa(String.fromCharCode(...new TextEncoder().encode(str))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function unb64u(s){s=s.replace(/-/g,'+').replace(/_/g,'/');const bin=atob(s);return new TextDecoder().decode(Uint8Array.from(bin,c=>c.charCodeAt(0)))}
function encItem(q){return q.sym?q.sym:q.zy+MCODE[q.mode]}
function decItem(c){const last=c.slice(-1);if(MDEC[last]&&c.length>1)return {zy:c.slice(0,-1),mode:MDEC[last]};return {sym:c,mode:'findSym'}}
function taskURL(t){const o={v:1,id:t.id,n:t.name,l:t.level,s:t.students,c:t.created,i:{}};for(const k in t.items)o.i[k]=t.items[k].map(encItem).join(',');return SITE_URL+'#t='+b64u(JSON.stringify(o))}
function importTaskFromHash(){
  const h=location.hash;if(!h.startsWith('#t='))return null;
  try{const o=JSON.parse(unb64u(h.slice(3)));const items={};for(const k in o.i)items[k]=o.i[k]?o.i[k].split(',').map(decItem):[];
    const t={id:o.id,name:o.n,level:o.l,students:o.s,created:o.c,items,done:{}};
    const all=getTasks();if(!all.some(x=>x.id===t.id)){all.push(t);saveTasks(all)}
    history.replaceState(null,'',location.pathname+location.search);return t}catch(e){console.warn(e);return null}
}
function qrSVG(text,size=300){try{const q=qrcode(0,'L');q.addData(text);q.make();const n=q.getModuleCount();return q.createSvgTag({cellSize:Math.max(2,Math.floor(size/(n+4))),margin:2,scalable:true})}catch(e){return '<p>QR 產生失敗（題目太多，請減少題數）</p>'}}
function taskBanner(){
  const ts=myTasks();if(!ts.length)return '';
  return `<div class="panel taskbox"><div class="sign" style="font-size:24px">📮 老師的任務</div><div class="tasklist">${ts.map(t=>`<button class="taskcard" data-task="${t.id}"><b>${esc(t.name)}</b><small>${LV_NAMES[t.level]}・${itemsFor(t,ME).length} 題</small><span>▶ 開始</span></button>`).join('')}</div></div>`;
}
function bindTaskBanner(){$$('[data-task]').forEach(b=>b.onclick=()=>{const t=getTasks().find(x=>x.id===b.dataset.task);if(t)startRound(t.level,itemsFor(t,ME),false,t)})}

/* ================= 拼音闖關：選程度 ================= */
function goLevels(){
  stopAudio();setTitle('拼音闖關');
  view.innerHTML=`${taskBanner()}<div class="panel" style="text-align:center"><div class="sign">選擇今天的冒險</div>
  <div class="lvcards four"><button class="lv s" data-l="seed"><img src="pic/w_葉.webp" alt=""><div>🌰 森林小種子<br><small>基礎・聽音找注音</small></div></button>
  <button class="lv l" data-l="low"><img src="pic/c_rabbit.webp" alt=""><div>🌱 森林小萌芽<br><small>低階・四選一</small></div></button>
  <button class="lv m" data-l="mid"><img src="pic/c_squirrel.webp" alt=""><div>🧭 森林探險家<br><small>中階・一步一步拼</small></div></button>
  <button class="lv h" data-l="high"><img src="pic/c_fox.webp" alt=""><div>👑 森林拼音王<br><small>高階・自己拼</small></div></button></div></div>`;
  $$('.lv').forEach(b=>b.onclick=()=>startRound(b.dataset.l));
  bindTaskBanner();
  say('ins_level');
}

/* ================= 出題引擎 ================= */
function poolOf(cfg){
  return BANK.filter(b=>{
    if(b.n===1)return false;
    if(!cfg.types.includes(b.n))return false;
    if(cfg.commonOnly&&!b.common&&!PICBY[b.zy])return false;
    if(b.i){if(!cfg.inis.includes(b.i))return false}else if(!cfg.noIni)return false;
    if(b.m&&!cfg.meds.includes(b.m))return false;
    if(b.f&&!cfg.fins.includes(b.f))return false;
    if(!cfg.tones.includes(b.t))return false;
    return true;
  });
}
function modeFits(b,mode){
  if(mode==='pic')return !!PICBY[b.zy];
  if(mode==='missI')return !!b.i&&b.n>=2;
  if(mode==='missM')return !!b.m&&b.n>=2;
  if(mode==='missF')return !!b.f&&b.n>=2;
  return true;
}
function genQuestions(cfg,level,count){
  const sc=cfg.scaf[level];let modes=sc.modes&&sc.modes.length?sc.modes:['listen'];
  const pool=poolOf(cfg);if(!pool.length)return [];
  const out=[];const used=new Set();
  const picPool=shuffle(pool.filter(b=>PICBY[b.zy]));
  for(let n=0;n<count*6&&out.length<count;n++){
    const mode=modes[out.length%modes.length];
    let cand;
    if(mode==='pic'&&picPool.length){cand=picPool.find(b=>!used.has(b.zy))}
    if(!cand){const c=shuffle(pool).filter(b=>!used.has(b.zy)&&modeFits(b,mode));cand=c[0]}
    if(!cand){const c=shuffle(pool).filter(b=>!used.has(b.zy));if(!c.length)break;cand=c[0];out.push({zy:cand.zy,mode:'listen'});used.add(cand.zy);continue}
    used.add(cand.zy);out.push({zy:cand.zy,mode:modeFits(cand,mode)?mode:'listen'});
  }
  return shuffle(out);
}

function genSeed(cfg,count){
  const pool=cfg.seedSyms.length?cfg.seedSyms:[...'ㄅㄆㄇㄈ'];const out=[];let bag=[];
  while(out.length<count){if(!bag.length)bag=shuffle(pool);let x=bag.shift();if(out.length&&out[out.length-1].sym===x&&pool.length>1){bag.push(x);x=bag.shift()}out.push({sym:x,mode:'findSym'})}
  return out;
}
function genFor(level,count){return level==='seed'?genSeed(CFG,count):genQuestions(CFG,level,count)}
/* ================= 拼音闖關：作答 ================= */
let R=null; // round state
function startRound(level,fixedItems,isReview,task){
  stopAudio();
  const items=fixedItems?fixedItems.slice():genFor(level,CFG.count);
  if(!items.length){modal(`<div class="sign">沒有題目</div><p style="font-size:24px">目前老師的設定找不到合適的音節，請老師到「老師專區」放寬聲母、韻母或聲調範圍。</p><button class="big g" onclick="closeModal()">好</button>`);return}
  R={level,sc:CFG.scaf[level]||{},items,idx:0,streak:0,log:[],isReview:!!isReview,task:task||null,start:Date.now()};
  showQ();
}
function seedOptions(sym){
  const n=Math.max(2,Math.min(8,CFG.seedOpts||4));const all=[...INI,...MED,...FIN];
  const sel=CFG.seedSyms.filter(x=>x!==sym);
  const sim=CFG.seedSimilar?(SIMILAR.find(g=>g.includes(sym))||'').split('').filter(x=>x!==sym):[];
  let d=shuffle(sel.filter(x=>sim.includes(x))).concat(shuffle(sel.filter(x=>!sim.includes(x))));
  if(d.length<n-1)d=d.concat(shuffle(sim.filter(x=>!d.includes(x))));
  if(d.length<n-1)d=d.concat(shuffle(all.filter(x=>x!==sym&&!d.includes(x))));
  return shuffle([sym,...d.slice(0,n-1)]);
}
function showSeed(){
  const it=R.items[R.idx],sym=it.sym;
  const Q={it,sym,seed:true,first:true,wrongs:[],hints:0,done:false,elim:{},opts:seedOptions(sym)};R.Q=Q;
  const pct=Math.round(R.idx/R.items.length*100);
  view.innerHTML=`<div class="panel">
   <div class="qhead"><span class="sign" style="font-size:22px;padding:6px 16px">${R.isReview?'錯題複習':R.task?'📮 '+esc(R.task.name):LV_NAMES.seed}</span><div class="prog"><i style="width:${pct}%"></i></div><b style="font-size:26px">第 ${R.idx+1} / ${R.items.length} 題</b>
    <div class="speed">🐢<input type="range" id="rate" min="0.6" max="1.3" step="0.1" value="${AU.rate}">🐇</div></div>
   <div class="noteRow"><div class="stepnote">聽一聽，找出你聽到的注音</div><div class="msg" id="qMsg"></div></div>
   <div class="work3"><div class="ctlL"><button class="big y" id="qPlay">🔊 再聽一次</button></div>
    <div class="vzwrap"><button class="seedcard" id="seedCard">❓</button></div>
    <div class="ctlR"><img src="pic/c_rabbit.webp" alt="" style="height:120px"></div>
    <div class="kbArea"><div class="opts seedopts" id="qInput">${Q.opts.map(x=>keyHTML(x)).join('')}</div></div></div></div>`;
  $('#rate').oninput=e=>{AU.rate=+e.target.value;LS.set('rate',AU.rate)};
  $('#qPlay').onclick=()=>say(symKey(sym));$('#seedCard').onclick=()=>{if(!Q.done)say(symKey(sym))};
  $$('#qInput .key').forEach(k=>k.onclick=()=>seedPick(k.dataset.s,k));
  setTimeout(()=>seq(R.idx===0?['ins_find',250,symKey(sym)]:[symKey(sym)]),250);
}
async function seedPick(x,el){
  const Q=R.Q;if(Q.done||el.classList.contains('wrongx')){say(symKey(x));return}
  if(x!==Q.sym){Q.first=false;Q.wrongs.push(x);el.classList.add('wrongx');$('#qMsg').className='msg warn';$('#qMsg').textContent='沒關係，再聽一次！';
    seq([symKey(x),250,pick(['try1','try2']),150,symKey(Q.sym)]);return}
  Q.done=true;const c=$('#seedCard');c.textContent=x;c.className='seedcard ok '+cat(x);
  $$('#qInput .key').forEach(k=>{if(k!==el)k.classList.add('off')});el.classList.add('sel');
  $('#qMsg').className='msg';$('#qMsg').textContent=pick(['答對了！🍃','好棒喔！🍃','太厲害了！🍃']);
  R.log.push({zy:Q.sym,i:INI.includes(Q.sym)?Q.sym:'',m:MED.includes(Q.sym)?Q.sym:'',f:FIN.includes(Q.sym)?Q.sym:'',t:0,n:0,mode:'findSym',first:Q.first,final:true,hints:0,wrongs:Q.wrongs.slice(),target:Q.sym});
  const unlock=addReward('leaves',1);flyLeaf(c);
  if(Q.first)R.streak++;else R.streak=0;let fruit=false;if(R.streak>0&&R.streak%3===0){addReward('fruits',1);fruit=true}
  $('.ctlR').innerHTML=`<button class="big g" id="qNext">${R.idx+1<R.items.length?'➡️ 下一題':'🏁 看成果'}</button>`;
  $('#qNext').onclick=()=>{stopAudio();R.idx++;R.idx<R.items.length?showQ():finishRound()};
  await seq([symKey(Q.sym),200,pick(['good1','good2','good3']),150,symKey(Q.sym)]);
  if(fruit){popCard(`<span style="font-size:80px">${pick(FRUITS)}</span>連續答對三題！`,1600);await say('fruit')}
  if(unlock){const r=rw();const nu=unlocked(r.leaves).slice(-1)[0];popCard(`<img src="${nu.img}" alt="">${nu.name} 搬來森林了！`,2000);await say('unlock')}
}
function compsOf(b){return [['i',b.i],['m',b.m],['f',b.f]].filter(x=>x[1])}
function showQ(){
  stopAudio();
  if(R.items[R.idx].mode==='findSym')return showSeed();
  const it=R.items[R.idx], b=BYZY[it.zy], sc=CFG.scaf[R.level]||R.sc;R.sc=sc;
  const comps=compsOf(b);
  const Q={it,b,comps,ans:comps.map(()=>''),given:comps.map(()=>false),tone:0,toneGiven:false,act:0,tries:0,wrongs:[],hints:0,first:true,done:false,elim:{},flex:false};
  R.Q=Q;
  // 決定已提供的部分
  const missMap={missI:'i',missM:'m',missF:'f'};
  if(missMap[it.mode]){comps.forEach((c,k)=>{if(c[0]!==missMap[it.mode]){Q.ans[k]=c[1];Q.given[k]=true}});Q.tone=b.t;Q.toneGiven=true}
  else if(it.mode==='tone'){comps.forEach((c,k)=>{Q.ans[k]=c[1];Q.given[k]=true})}
  else{
    if(sc.partial&&comps.length>=2){const blank=pick(comps.map((c,k)=>k).filter(k=>k>0||comps.length===2&&Math.random()<.3));
      comps.forEach((c,k)=>{if(k!==blank){Q.ans[k]=c[1];Q.given[k]=true}})}
    if(sc.giveTone){Q.tone=b.t;Q.toneGiven=true}
  }
  Q.input=sc.four?'opts':sc.catkb?'cat':'full';
  SLOT_OFF=Q.input==='full'?560:500;
  Q.flex=(Q.input==='full'&&!sc.showSlots&&!Q.given.some(Boolean));
  if(Q.flex){Q.ans=['','',''];Q.given=[false,false,false]}
  Q.act=Q.ans.findIndex((a,k)=>!a&&!Q.given[k]);
  const pct=Math.round(R.idx/R.items.length*100);
  const showPic=(it.mode==='pic')||(sc.pic&&PICBY[b.zy]);
  const pp=PICBY[b.zy]&&PICBY[b.zy][0];
  view.innerHTML=`<div class="panel">
   <div class="qhead"><span class="sign" style="font-size:22px;padding:6px 16px">${R.isReview?'錯題複習':R.task?'📮 '+esc(R.task.name):LV_NAMES[R.level]}</span><div class="prog"><i style="width:${pct}%"></i></div><b style="font-size:26px">第 ${R.idx+1} / ${R.items.length} 題</b>
    <div class="speed">🐢<input type="range" id="rate" min="0.6" max="1.3" step="0.1" value="${AU.rate}">🐇</div></div>
   <div class="noteRow"><div class="stepnote" id="qNote"></div><div class="msg" id="qMsg"></div></div>
   <div class="work3">
    <div class="ctlL"><button class="big y" id="qPlay">🔊 播放題目</button>
     ${sc.slow?'<button class="big g" id="qSlow">🐢 慢速拼讀</button>':''}
     ${sc.hintBtn?'<button class="big" id="qHint">💡 提示</button>':''}
     <button class="big" id="qMine">👂 拼讀我的答案</button></div>
    <div class="vzwrap" id="qVz"></div>
    <div class="ctlR"><div class="center" id="qPicSlot">${showPic&&pp?`<div class="picbox"><img src="pic/w_${pp.ch}.webp" alt=""></div>`:''}</div>
     ${Q.input!=='opts'?'<div class="row2"><button class="big" id="qBack">⌫ 退格</button><button class="big" id="qClr">🧹 重來</button></div>':''}
     <button class="big g" id="qOk">✅ 確定答案</button></div>
    <div class="kbArea"><div id="qInput"></div></div></div></div>`;
  $('#rate').oninput=e=>{AU.rate=+e.target.value;LS.set('rate',AU.rate)};
  $('#qPlay').onclick=()=>playTarget();
  if($('#qSlow'))$('#qSlow').onclick=()=>slowTarget(false);
  if($('#qHint'))$('#qHint').onclick=doHint;
  $('#qMine').onclick=playMine;
  if($('#qBack'))$('#qBack').onclick=()=>{if(Q.done)return;if(Q.tone&&!Q.toneGiven){Q.tone=0}else{let k=-1;Q.ans.forEach((a,i)=>{if(a&&!Q.given[i])k=i});if(k>=0){Q.ans[k]='';Q.act=k}}renderQ()};
  if($('#qClr'))$('#qClr').onclick=()=>{if(Q.done)return;Q.ans=Q.ans.map((a,k)=>Q.given[k]?a:'');if(!Q.toneGiven)Q.tone=0;Q.act=Q.ans.findIndex((a,k)=>!a&&!Q.given[k]);renderQ()};
  $('#qOk').onclick=submit;
  renderQ();
  setTimeout(()=>{const pre=it.mode==='tone'?'ins_tone':(it.mode.startsWith('miss')&&Q.input==='opts')?'ins_pick':'ins_listen';
    seq([pre,250,...targetKeys()])},250);
}
function targetKeys(){const Q=R.Q;const pp=PICBY[Q.b.zy];if(Q.it.mode==='pic'&&pp)return [picKey(pp[0].ch)];return [sylKey(Q.b.zy)]}
function playTarget(){seq(targetKeys())}
function slowTarget(markHint){
  const Q=R.Q;const items=[];const els=()=>$$('#qVz .slot');
  Q.comps.forEach((c,k)=>items.push({k:symKey(c[1]),on:()=>{clearLit();const e=els()[k];e&&e.classList.add('lit')},gap:380}));
  if(Q.b.t!==1)items.push({k:toneKey(Q.b.t),gap:380});
  items.push({k:sylKey(Q.b.zy),on:()=>{clearLit();els().forEach(e=>e.classList.add('lit'))},off:clearLit});
  if(markHint)Q.hints++;
  return seq(items);
}
function curParse(){
  const Q=R.Q;
  if(Q.flex){let i='',m='',f='';for(const s of Q.ans){if(!s)continue;const c=cat(s);if(c==='i'&&!i&&!m&&!f)i=s;else if(c==='m'&&!m&&!f)m=s;else if(c==='f'&&!f)f=s;else return null}return{i,m,f}}
  const o={i:'',m:'',f:''};let ok=true;Q.ans.forEach((s,k)=>{if(s){const c=cat(s);if(o[c])ok=false;o[c]=s}});return ok?o:null;
}
function playMine(){
  const Q=R.Q;const items=[];const els=()=>$$('#qVz .slot');
  Q.ans.forEach((s,k)=>{if(s)items.push({k:symKey(s),on:()=>{clearLit();els()[k]&&els()[k].classList.add('lit')},gap:320})});
  const p=curParse();
  if(p&&Q.tone){const zy=zyOf(p.i,p.m,p.f,Q.tone);if(BYZY[zy])items.push({k:sylKey(zy),on:()=>{clearLit();els().forEach(e=>e.classList.add('lit'))},off:clearLit});
    else{$('#qMsg').className='msg warn';$('#qMsg').textContent='這樣拼沒有這個音喔，再想想看'}}
  if(items.length)seq(items);
}
function needTone(){const Q=R.Q;return !Q.toneGiven}
function stepNow(){
  const Q=R.Q;
  if(Q.act>=0&&Q.act<Q.ans.length&&!Q.ans[Q.act]&&!Q.given[Q.act])return Q.flex?'any':Q.comps[Q.act][0];
  const k=Q.ans.findIndex((a,i)=>!a&&!Q.given[i]&&(!Q.flex||i===0));
  if(k>=0){Q.act=k;return Q.flex?'any':Q.comps[k][0]}
  if(needTone()&&!Q.tone)return 't';
  return 'done';
}
function renderQ(){
  const Q=R.Q,sc=R.sc;
  const st=stepNow();
  const slots=Q.ans.map((s,k)=>{const c=Q.flex?(s?cat(s):''):Q.comps[k][0];
    return {s,c,cls:[Q.given[k]?'given':'',(k===Q.act&&!s&&!Q.done)?'act':'',Q.flex&&!s&&k>0&&!Q.ans[k-1]?'ghost':''].join(' ')}});
  $('#qVz').innerHTML=vzHTML(slots,Q.tone||0,{toneEmpty:needTone()&&!Q.tone&&!Q.done});
  $$('#qVz .slot').forEach(el=>el.onclick=()=>{if(Q.done)return;const k=+el.dataset.idx;if(Q.given[k])return;Q.act=k;if(Q.ans[k])say(symKey(Q.ans[k]));renderQ()});
  const t=$('#qVz [data-tone]');if(t)t.onclick=()=>{if(Q.done||Q.toneGiven)return;Q.tone=0;renderQ()};
  // 提示文字
  const note=$('#qNote');
  if(Q.done)note.innerHTML='';
  else if(st==='t')note.innerHTML='最後選 <b class="t">聲調</b>';
  else if(st==='any')note.innerHTML='聽一聽，自己拼出來';
  else if(st==='done')note.innerHTML='拼好了！按 <b class="t">👂 拼讀我的答案</b> 聽聽看，再按 <b class="f">✅ 確定</b>';
  else note.innerHTML=`現在選 <b class="${st}">${CATN[st]}</b>`;
  // 輸入區
  const box=$('#qInput');
  if(Q.done){box.innerHTML='';return}
  const legalTones=BASE[Q.b.i+Q.b.m+Q.b.f]||[1,2,3,4];
  const toneList=sc.toneHint?[1,2,3,4,5].filter(t=>legalTones.includes(t)):[1,2,3,4,5];
  if(Q.input==='opts'){
    if(st==='t'){box.innerHTML=`<div class="opts">${toneList.map(t=>toneKeyHTML(t,Q.elim['t'+t]?'wrongx':'')).join('')}</div>`}
    else if(st==='done'){box.innerHTML=''}
    else{const k=Q.act,right=Q.comps[k][1];
      if(!Q.opts||Q.opts.k!==k){Q.opts={k,list:makeOptions(right,Q.comps[k][0],Q.comps.length===2&&k===1)}}
      box.innerHTML=`<div class="opts">${Q.opts.list.map(s=>keyHTML(s,Q.elim[k+s]?'wrongx':'')).join('')}</div>`}
  }else if(Q.input==='cat'){
    if(st==='t')box.innerHTML=`<div class="opts">${toneList.map(t=>toneKeyHTML(t)).join('')}</div>`;
    else if(st==='done')box.innerHTML=`<div class="center" style="font-size:22px;color:var(--muted)">點上面的格子可以修改</div>`;
    else box.innerHTML=fullKeyboard({only:st});
  }else{
    box.innerHTML=fullKeyboard({tones:Q.toneGiven?null:toneList,compact:true});
  }
  box.querySelectorAll('.key[data-s]').forEach(k=>k.onclick=()=>inputSym(k.dataset.s,k));
  box.querySelectorAll('.key[data-t]').forEach(k=>{k.classList.toggle('sel',+k.dataset.t===Q.tone);k.onclick=()=>inputTone(+k.dataset.t,k)});
}
function makeOptions(right,c,cross){
  let pool=c==='i'?INI:c==='m'?MED:FIN;
  if(cross)pool=MED.concat(FIN);
  const sim=(SIMILAR.find(g=>g.includes(right))||'').split('').filter(x=>x!==right&&pool.includes(x));
  const rest=shuffle(pool.filter(x=>x!==right&&!sim.includes(x)));
  const d=shuffle(sim).slice(0,2).concat(rest).slice(0,3);
  return shuffle([right,...d]);
}
function inputSym(s,el){
  const Q=R.Q;if(Q.done||(el&&el.classList.contains('wrongx'))){say(symKey(s));return}
  if(Q.input==='opts'){
    const k=Q.act,right=Q.comps[k][1];
    if(s===right){Q.ans[k]=s;Q.opts=null;say(symKey(s));Q.act=Q.ans.findIndex((a,i)=>!a&&!Q.given[i]);renderQ();
      const st=stepNow();if(st==='done')setTimeout(()=>submit(),700);else if(st==='t')setTimeout(()=>say('ins_pick_t'),900)}
    else{wrongPick(k+s,s,Q.comps[k][0])}
    return;
  }
  if(Q.flex){const k=Q.act>=0&&Q.act<3?Q.act:Q.ans.findIndex(a=>!a);if(k<0){say(symKey(s));return}Q.ans[k]=s;Q.act=Q.ans.findIndex(a=>!a);}
  else{let k=Q.act;if(k<0||Q.given[k]){k=Q.ans.findIndex((a,i)=>!a&&!Q.given[i])}if(k<0){say(symKey(s));$('#qMsg').textContent='點格子可以修改喔';return}
    Q.ans[k]=s;Q.act=Q.ans.findIndex((a,i)=>!a&&!Q.given[i]);}
  say(symKey(s));renderQ();
}
function inputTone(t,el){
  const Q=R.Q;if(Q.done||Q.toneGiven||(el&&el.classList.contains('wrongx'))){say(toneKey(t));return}
  if(Q.input==='opts'){
    if(t===Q.b.t){Q.tone=t;say(toneKey(t));renderQ();setTimeout(()=>submit(),700)}
    else wrongPick('t'+t,null,'t',t);
    return;
  }
  Q.tone=t;say(toneKey(t));renderQ();
}
function wrongPick(key,s,c,t){
  const Q=R.Q;Q.first=false;Q.elim[key]=true;Q.wrongs.push(c==='t'?'聲調':s);
  $('#qMsg').className='msg warn';$('#qMsg').textContent='沒關係，再聽一次！';
  renderQ();seq([c==='t'?toneKey(t):symKey(s),250,pick(['try1','try2']),200,...targetKeys()]);
}
function submit(){
  const Q=R.Q;if(Q.done)return;
  const p=curParse();
  if(!p||(!Q.tone)){ $('#qMsg').className='msg warn';$('#qMsg').textContent=!Q.tone?'還沒選聲調喔':'還沒拼完喔';return}
  const ok=p.i===Q.b.i&&p.m===Q.b.m&&p.f===Q.b.f&&Q.tone===Q.b.t;
  if(ok)return correct();
  Q.tries++;Q.first=false;
  // 記錄錯誤符號
  const wrongPos=[];
  if(Q.flex){['i','m','f'].forEach(c=>{if(p[c]!==Q.b[c])Q.wrongs.push(p[c]||('少了'+CATN[c]))})}
  else Q.ans.forEach((s,k)=>{if(!Q.given[k]&&s!==Q.comps[k][1]){wrongPos.push(k);Q.wrongs.push(s)}});
  if(Q.tone!==Q.b.t)Q.wrongs.push('聲調');
  const msg=$('#qMsg');msg.className='msg warn';
  if(Q.tries===1){msg.textContent='再聽一次，你可以的！';seq(['try1',200,...targetKeys()]);return}
  if(Q.tries===2){
    if(R.sc.errPos){
      msg.textContent='閃閃發亮的地方再想想看';
      const els=$$('#qVz .slot');
      if(Q.flex){Q.ans.forEach((s,k)=>{const c=cat(s);if(s&&Q.b[c]!==s)els[k]&&els[k].classList.add('bad')})}
      else wrongPos.forEach(k=>els[k]&&els[k].classList.add('bad'));
      if(Q.tone!==Q.b.t){const t=$('#qVz [data-tone]');t&&t.classList.add('lit')}
      seq(['ins_hint_wrong',200,...targetKeys()]);
    }else{msg.textContent='再試一次！';seq(['try2',200,...targetKeys()])}
    return;
  }
  // 第三次：示範正確答案
  showAnswer();
}
function showAnswer(){
  const Q=R.Q;Q.done=true;Q.final=false;
  Q.flex=false;Q.ans=Q.comps.map(c=>c[1]);Q.given=Q.comps.map(()=>true);Q.tone=Q.b.t;
  renderQ();$$('#qVz .slot').forEach(e=>e.classList.add('ok'));
  $('#qMsg').className='msg';$('#qMsg').textContent='沒關係，我們一起聽正確的拼音';
  logQ(false);
  seq(['ins_show',200]).then(ok=>{if(ok)slowTarget(false)});
  nextBtn();
}
async function correct(){
  const Q=R.Q;Q.done=true;
  renderQ();$$('#qVz .slot').forEach(e=>e.classList.add('ok'));
  $('#qMsg').className='msg';$('#qMsg').textContent=pick(['答對了！🍃','好棒喔！🍃','太厲害了！🍃','你拼對了！🍃']);
  logQ(true);
  const unlock=addReward('leaves',1);flyLeaf($('#qVz'));
  if(Q.first){R.streak++}else R.streak=0;
  let fruit=false;if(R.streak>0&&R.streak%3===0){addReward('fruits',1);fruit=true}
  nextBtn();
  await seq([pick(['good1','good2','good3','good4']),150,sylKey(Q.b.zy)]);
  if(fruit){popCard(`<span style="font-size:80px">${pick(FRUITS)}</span>連續答對三題！`,1600);await say('fruit')}
  if(unlock){const r=rw();const nu=unlocked(r.leaves).slice(-1)[0];popCard(`<img src="${nu.img}" alt="">${nu.name} 搬來森林了！`,2000);await say('unlock')}
}
function nextBtn(){
  $('#qInput').innerHTML=`<div class="center"><button class="big g" id="qNext" style="min-width:300px">${R.idx+1<R.items.length?'➡️ 下一題':'🏁 看成果'}</button></div>`;
  $('#qOk').disabled=true;$('#qNext').onclick=()=>{stopAudio();R.idx++;R.idx<R.items.length?showQ():finishRound()};
}
function logQ(final){
  const Q=R.Q;
  R.log.push({zy:Q.b.zy,i:Q.b.i,m:Q.b.m,f:Q.b.f,t:Q.b.t,n:Q.b.n,mode:Q.it.mode,first:Q.first&&final,final,hints:Q.hints,wrongs:Q.wrongs.slice()});
}
function doHint(){
  const Q=R.Q;if(Q.done)return;Q.hints++;
  const st=stepNow();const msg=$('#qMsg');msg.className='msg';
  const pp=PICBY[Q.b.zy];
  if(Q.hints===1){msg.textContent='💡 仔細聽，慢慢念';const old=AU.rate;AU.rate=.75;seq(targetKeys()).then(()=>{AU.rate=old});
    if(pp&&!$('.picbox')){$('#qPicSlot').insertAdjacentHTML('afterbegin',`<div class="picbox"><img src="pic/w_${pp[0].ch}.webp" alt=""></div>`)}return}
  if(st==='t'){msg.textContent=`💡 是「${TNAME[Q.b.t]}」喔`;say(toneKey(Q.b.t));return}
  if(st==='any'||st==='done'){const k=Q.comps[0];msg.textContent=`💡 第一個音是「${k[1]}」`;say(symKey(k[1]));return}
  const right=Q.comps[Q.act][1];msg.textContent=`💡 聽聽看這個${CATN[st]}`;say(symKey(right));
  if(Q.input!=='opts'){const el=[...$$('#qInput .key[data-s]')].find(e=>e.dataset.s===right);if(el){el.classList.add('sel');setTimeout(()=>el.classList.remove('sel'),2500)}}
}
function finishRound(){
  stopAudio();
  const L=R.log, n=L.length||1;
  const first=L.filter(x=>x.first).length, fin=L.filter(x=>x.final).length;
  const by=(f,list=L)=>{const o={};list.forEach(x=>{const k=f(x);o[k]=o[k]||[0,0];o[k][1]++;if(x.first)o[k][0]++});return o};
  const wrongSym={};L.forEach(x=>x.wrongs.forEach(w=>wrongSym[w]=(wrongSym[w]||0)+1));
  const rec={date:new Date().toISOString(),student:ME,level:R.level,review:R.isReview,count:L.length,
    inis:[...new Set(L.map(x=>x.i).filter(Boolean))],fins:[...new Set(L.map(x=>x.m+x.f))],
    byType:by(x=>x.n===0?'認注音':x.n===3?'三拼':'二拼'),byTone:by(x=>TNAME[x.t],L.filter(x=>x.n>0)),first,final:fin,task:R.task?R.task.name:'',hints:L.reduce((a,x)=>a+x.hints,0),
    wrongSym,wrongList:L.filter(x=>!x.first).map(x=>x.zy)};
  const all=LS.get('records',[]);all.push(rec);LS.set('records',all);
  if(R.task&&!R.isReview){const ts=getTasks();const t=ts.find(x=>x.id===R.task.id);if(t){t.done=t.done||{};t.done[ME]=rec.date;saveTasks(ts)}}
  addReward('gifts',1);
  const wrongItems=L.filter(x=>!x.first).map(x=>x.n===0?{sym:x.zy,mode:'findSym'}:{zy:x.zy,mode:'listen'});
  view.innerHTML=`<div class="panel" style="text-align:center"><div class="sign">🎁 ${R.task&&!R.isReview?'任務完成！':'完成這一回！'}</div>
   <div style="margin:14px 0"><img src="pic/c_rabbit.webp" class="bounce" style="height:120px" alt=""><img src="pic/c_squirrel.webp" class="bounce" style="height:120px" alt=""><img src="pic/c_fox.webp" class="bounce" style="height:120px" alt=""></div>
   <div class="summary"><div>完成題數<b>${L.length}</b></div><div>一次就答對<b>${first}</b></div><div>最後答對<b>${fin}</b></div><div>獲得葉子<b>🍃${fin}</b></div></div>
   <div class="center">${R.sc.review&&wrongItems.length&&!R.isReview?`<button class="big p" id="rv">🔁 錯題複習（${wrongItems.length} 題）</button>`:''}
   <button class="big g" id="again">${R.task?'再練一次這個任務':'再玩一次'}</button><button class="big" id="home2">回首頁</button></div></div>`;
  popCard(`<span style="font-size:80px">🎁</span>獲得森林禮物！`,1800);
  say('ins_done','gift');
  const lv=R.level;
  if($('#rv'))$('#rv').onclick=()=>{say('ins_review');startRound(lv,wrongItems,true)};
  const tk=R.task,its=R.items;
  $('#again').onclick=()=>tk?startRound(lv,its,true,tk):startRound(lv);
  $('#home2').onclick=goHome;
}

/* ================= 老師專區 ================= */
let TTAB='set', PREVIEW=null;
function goTeacher(){
  stopAudio();setTitle('老師專區');$('#homeBtn').classList.remove('hide');updateBar();
  view.innerHTML=`<div class="panel"><div class="tabs">${[['set','📝 出題設定'],['preview','👀 出題預覽'],['task','📮 派任務'],['rec','📊 學習紀錄'],['audio','🔊 語音校對'],['more','⚙️ 學生名單・QR']].map(([k,n])=>`<button data-k="${k}" class="${TTAB===k?'on':''}">${n}</button>`).join('')}</div><div id="tBody"></div></div>`;
  $$('.tabs button').forEach(b=>b.onclick=()=>{TTAB=b.dataset.k;goTeacher()});
  ({set:tSet,preview:tPreview,task:tTask,rec:tRec,audio:tAudio,more:tMore})[TTAB]();
}
function chkRow(arr,sel,fmt=x=>x,cls=''){return arr.map(x=>`<button class="chk ${cls} ${sel.includes(x)?'on':''}" data-v="${x}">${fmt(x)}</button>`).join('')}
function bindChk(box,arr,key,num){box.querySelectorAll('.chk').forEach(b=>b.onclick=()=>{const v=num?+b.dataset.v:b.dataset.v;const a=CFG[key];const i=a.indexOf(v);i>=0?a.splice(i,1):a.push(v);saveCfg();b.classList.toggle('on');poolInfo()})}
function poolInfo(){if(CFG.level==='seed'){const e=$('#poolN');if(e)e.innerHTML=CFG.seedSyms.length?`基礎題練習的注音：<b>${CFG.seedSyms.join(' ')}</b>`:`<span style="color:var(--red)">請至少勾選一個注音</span>`;return}const n=poolOf(CFG).length;const e=$('#poolN');if(e)e.innerHTML=n?`目前符合條件的合法音節：<b>${n}</b> 個`:`<span style="color:var(--red)">目前沒有符合的音節，請放寬條件</span>`}
function tSet(){
  const lv=CFG.level, sc=CFG.scaf[lv];
  $('#tBody').innerHTML=`<div class="msg" id="poolN"></div><div class="tgrid">
  <div class="tsec" style="grid-column:1/-1"><h3>1. 聲母選擇（可多選）</h3><div id="sIni" class="kb">${INI_ROWS.map(r=>`<div class="kbrow">${chkRow([...r],CFG.inis)}</div>`).join('')}
   <div class="kbrow"><button class="chk txt ${CFG.noIni?'on':''}" id="noIni">無聲母音節（如 ㄧㄚ、ㄨㄛ）</button></div></div>
   <div class="row" style="margin-top:10px"><button class="sbtn g" id="iAll">全選</button><button class="sbtn" id="iNone">全部取消</button>
   <select id="combo"><option value="">— 常用出題組合 —</option>${Object.keys(LS.get('combos',{})).map(k=>`<option>${esc(k)}</option>`).join('')}</select>
   <button class="sbtn" id="cSave">💾 儲存目前組合</button><button class="sbtn r" id="cDel">刪除組合</button></div><p class="hint">設定會自動記住（上次選擇）。</p></div>
  <div class="tsec"><h3>2. 拼音題型（可多選）</h3><div class="row" id="sType">${chkRow([2,3],CFG.types,x=>x===2?'二拼':'三拼','txt')}</div><p class="hint">兩個都勾 = 二拼、三拼混合出題</p>
   <h3 style="margin-top:14px">4. 聲調範圍（可多選）</h3><div class="row" id="sTone">${chkRow([1,2,3,4,5],CFG.tones,x=>TNAME[x],'txt')}</div>
   <h3 style="margin-top:14px">7. 題目數量</h3><div class="row" id="sCnt">${[5,10,15,20].map(n=>`<button class="chk txt ${CFG.count===n?'on':''}" data-n="${n}">${n} 題</button>`).join('')}<input type="number" id="cntX" min="1" max="60" value="${CFG.count}" style="width:100px"> 題</div>
   <div class="tog" style="margin-top:10px">只出常用生活字音節 <div class="sw ${CFG.commonOnly?'on':''}" id="swCommon"></div></div></div>
  <div class="tsec"><h3>3. 介音與韻母範圍（可多選）</h3><div class="row" id="sMed">${chkRow(MED,CFG.meds)}</div><div class="row" id="sFin" style="margin-top:8px">${chkRow(FIN,CFG.fins)}</div>
   <div class="row" style="margin-top:8px"><button class="sbtn g" id="fAll">全選</button><button class="sbtn" id="fNone">全部取消</button></div><p class="hint">預設為全部適用韻母；可只勾已教過的。</p></div>
  <div class="tsec"><h3>5. 練習程度</h3><div class="row" id="sLv">${LEVELS.map(l=>`<button class="chk txt ${lv===l?'on':''}" data-l="${l}">${LV_NAMES[l]}</button>`).join('')}</div>
   <p class="hint">下方「出題方式」與「鷹架」是 <b>${LV_NAMES[lv]}</b> 的設定。學生選這個程度時就會套用。</p><button class="sbtn" id="lvReset">↺ 還原這個程度的預設鷹架</button>
   ${lv==='seed'?'':`<h3 style="margin-top:14px">6. 出題方式（可多選）</h3><div class="row" id="sMode">${Object.keys(MODE_NAMES).map(m=>`<button class="chk txt ${sc.modes.includes(m)?'on':''}" data-m="${m}">${MODE_NAMES[m]}</button>`).join('')}</div>`}</div>
  ${lv==='seed'?`<div class="tsec"><h3>基礎題：聽音找注音</h3><p class="hint">學生聽到一個注音，從選項中找出來。請勾選要練習的注音符號：</p>
   <div class="kb" id="sSeed"><div class="kbrow">${chkRow(INI,CFG.seedSyms)}</div><div class="kbrow">${chkRow(MED,CFG.seedSyms)}${chkRow(FIN,CFG.seedSyms)}</div></div>
   <div class="row" style="margin-top:8px"><button class="sbtn g" id="sdIni">全部聲母</button><button class="sbtn g" id="sdFin">全部介音韻母</button><button class="sbtn" id="sdNone">全部取消</button></div>
   <h3 style="margin-top:12px">選項數量</h3><div class="row" id="sdOpt">${[2,3,4,6].map(n=>`<button class="chk txt ${CFG.seedOpts===n?'on':''}" data-o="${n}">${n} 個</button>`).join('')}</div>
   <div class="tog">優先用長得像的注音當選項（如 ㄅ／ㄆ、ㄉ／ㄊ）<div class="sw ${CFG.seedSimilar?'on':''}" id="sdSim"></div></div></div>`:`<div class="tsec"><h3>8. 鷹架設定（${LV_NAMES[lv]}）</h3>${Object.keys(SCAF_NAMES).map(k=>`<div class="tog">${SCAF_NAMES[k]}<div class="sw ${sc[k]?'on':''}" data-k="${k}"></div></div>`).join('')}
   <p class="hint">輸入方式優先順序：四個注音選項 → 分類注音鍵盤 → 完整注音鍵盤。「顯示定位格數量」關閉時（高階），學生要自己判斷二拼或三拼。</p></div>`}
  </div><div class="center" style="margin-top:16px"><button class="big y" id="goPrev">👀 預覽題目</button><button class="big g" id="goStart">📮 派任務給學生</button></div>`;
  const B=$('#tBody');
  $('#sIni').querySelectorAll('.chk[data-v]').forEach(b=>b.onclick=()=>{const a=CFG.inis,v=b.dataset.v,i=a.indexOf(v);i>=0?a.splice(i,1):a.push(v);saveCfg();b.classList.toggle('on');poolInfo()});
  $('#noIni').onclick=e=>{CFG.noIni=!CFG.noIni;saveCfg();e.currentTarget.classList.toggle('on');poolInfo()};
  $('#iAll').onclick=()=>{CFG.inis=INI.slice();saveCfg();tSet()};$('#iNone').onclick=()=>{CFG.inis=[];CFG.noIni=false;saveCfg();tSet()};
  bindChk($('#sType'),[2,3],'types',true);bindChk($('#sTone'),[1,2,3,4,5],'tones',true);bindChk($('#sMed'),MED,'meds');bindChk($('#sFin'),FIN,'fins');
  $('#fAll').onclick=()=>{CFG.meds=MED.slice();CFG.fins=FIN.slice();saveCfg();tSet()};$('#fNone').onclick=()=>{CFG.meds=[];CFG.fins=[];saveCfg();tSet()};
  $$('#sCnt .chk').forEach(b=>b.onclick=()=>{CFG.count=+b.dataset.n;saveCfg();tSet()});
  $('#cntX').onchange=e=>{CFG.count=Math.max(1,Math.min(60,+e.target.value||10));saveCfg();tSet()};
  $('#swCommon').onclick=e=>{CFG.commonOnly=!CFG.commonOnly;saveCfg();e.currentTarget.classList.toggle('on');poolInfo()};
  $$('#sLv .chk').forEach(b=>b.onclick=()=>{CFG.level=b.dataset.l;saveCfg();tSet()});
  $('#lvReset').onclick=()=>{CFG.scaf[lv]={...PRESET[lv]};if(lv==='seed'){CFG.seedOpts=4;CFG.seedSimilar=true}saveCfg();tSet()};
  if($('#sMode'))$$('#sMode .chk').forEach(b=>b.onclick=()=>{const a=sc.modes,m=b.dataset.m,i=a.indexOf(m);i>=0?a.splice(i,1):a.push(m);saveCfg();b.classList.toggle('on')});
  B.querySelectorAll('.sw[data-k]').forEach(s=>s.onclick=()=>{const k=s.dataset.k;sc[k]=!sc[k];
    if(k==='four'&&sc.four){sc.catkb=false;sc.fullkb=false}if(k==='catkb'&&sc.catkb){sc.four=false;sc.fullkb=false}if(k==='fullkb'&&sc.fullkb){sc.four=false;sc.catkb=false}
    saveCfg();tSet()});
  $('#combo').onchange=e=>{const c=LS.get('combos',{})[e.target.value];if(c){Object.assign(CFG,JSON.parse(JSON.stringify(c)));saveCfg();tSet()}};
  $('#cSave').onclick=()=>{const n=prompt('幫這個出題組合取個名字（例如：ㄅㄆㄇㄈ＋一二聲）');if(!n)return;const c=LS.get('combos',{});c[n]=JSON.parse(JSON.stringify(CFG));LS.set('combos',c);tSet()};
  $('#cDel').onclick=()=>{const v=$('#combo').value;if(!v)return;const c=LS.get('combos',{});delete c[v];LS.set('combos',c);tSet()};
  if($('#sSeed')){$$('#sSeed .chk').forEach(b=>b.onclick=()=>{const a=CFG.seedSyms,v=b.dataset.v,i=a.indexOf(v);i>=0?a.splice(i,1):a.push(v);saveCfg();b.classList.toggle('on');poolInfo()});
    $('#sdIni').onclick=()=>{CFG.seedSyms=[...new Set([...CFG.seedSyms,...INI])];saveCfg();tSet()};$('#sdFin').onclick=()=>{CFG.seedSyms=[...new Set([...CFG.seedSyms,...MED,...FIN])];saveCfg();tSet()};
    $('#sdNone').onclick=()=>{CFG.seedSyms=[];saveCfg();tSet()};$$('#sdOpt .chk').forEach(b=>b.onclick=()=>{CFG.seedOpts=+b.dataset.o;saveCfg();tSet()});
    $('#sdSim').onclick=e=>{CFG.seedSimilar=!CFG.seedSimilar;saveCfg();e.currentTarget.classList.toggle('on')}}
  $('#goPrev').onclick=()=>{PREVIEW=null;TTAB='preview';goTeacher()};
  $('#goStart').onclick=startForStudent;
  poolInfo();
}
function startForStudent(){if(!PREVIEW)PREVIEW=genFor(CFG.level,CFG.count);TASKSRC='same';TTAB='task';goTeacher()}
function tPreview(){
  const isSeed=CFG.level==='seed';
  if(PREVIEW&&PREVIEW.length&&((PREVIEW[0].mode==='findSym')!==isSeed))PREVIEW=null;
  if(!PREVIEW)PREVIEW=genFor(CFG.level,CFG.count);
  const fx='';
  $('#tBody').innerHTML=`<div class="tsec"><h3>出題預覽（${LV_NAMES[CFG.level]}，${PREVIEW.length} 題）</h3>${fx}
   <div class="qlist">${PREVIEW.map((q,k)=>`<div class="qitem"><span>${k+1}.</span><b>${q.sym||q.zy}</b><small>${q.sym?'聽音找注音':exampleOf(q.zy)+'・'+MODE_NAMES[q.mode]}</small><button data-p="${k}" title="試聽">🔊</button><button data-d="${k}" title="刪除">✕</button></div>`).join('')||'<p>沒有題目</p>'}</div>
   <div class="row" style="margin-top:12px"><span style="font-size:20px">手動新增：</span><input type="text" id="addZy" placeholder="例如 ㄊㄨˋ" style="width:180px"><select id="addMode">${Object.keys(MODE_NAMES).map(m=>`<option value="${m}">${MODE_NAMES[m]}</option>`).join('')}</select><button class="sbtn g" id="addBtn">＋ 新增</button></div>
   <div id="addKb" style="margin-top:8px"></div>
   <p class="hint">可直接用下面的注音按鈕輸入；第一聲不用加調號，輕聲把「˙」放在最後。</p>
   <div class="center" style="margin-top:14px"><button class="big y" id="reroll">🎲 重新隨機出題</button><button class="big w" id="saveCombo">💾 儲存常用設定</button><button class="big g" id="startS">📮 用這份題目派任務</button></div></div>`;
  $('#addKb').innerHTML=`<div class="kbrow">${[...INI,...MED,...FIN].map(c=>`<button class="key ${cat(c)}" style="min-width:48px;min-height:48px;font-size:28px" data-a="${c}">${c}</button>`).join('')}${['ˊ','ˇ','ˋ','˙'].map(c=>`<button class="key t" style="min-width:48px;min-height:48px;font-size:28px" data-a="${c}">${c}</button>`).join('')}<button class="sbtn" id="addBs">⌫</button></div>`;
  $$('#addKb [data-a]').forEach(b=>b.onclick=()=>{$('#addZy').value+=b.dataset.a});
  $('#addBs').onclick=()=>{const v=[...$('#addZy').value];v.pop();$('#addZy').value=v.join('')};
  $$('.qitem [data-p]').forEach(b=>b.onclick=()=>{const q=PREVIEW[+b.dataset.p];say(q.sym?symKey(q.sym):sylKey(q.zy))});
  $$('.qitem [data-d]').forEach(b=>b.onclick=()=>{PREVIEW.splice(+b.dataset.d,1);tPreview()});
  $('#addBtn').onclick=()=>{let v=$('#addZy').value.trim().replace(/ˉ/g,'');
    if(isSeed){const ok=[...v].filter(c=>cat(c));if(!ok.length){alert('請輸入注音符號');return}ok.forEach(c=>PREVIEW.push({sym:c,mode:'findSym'}));tPreview();return}if(v.startsWith('˙'))v=v.slice(1)+'˙';const b=BYZY[v];const m=$('#addMode').value;
    if(!b||b.n===1){alert('「'+v+'」不在合法二拼／三拼音節題庫中，請再確認。');return}
    PREVIEW.push({zy:v,mode:modeFits(b,m)?m:'listen'});tPreview()};
  $('#reroll').onclick=()=>{PREVIEW=genFor(CFG.level,CFG.count);tPreview()};
  $('#saveCombo').onclick=()=>{const n=prompt('常用設定名稱');if(!n)return;const c=LS.get('combos',{});c[n]=JSON.parse(JSON.stringify(CFG));LS.set('combos',c);alert('已儲存')};
  $('#startS').onclick=startForStudent;
}
let TASKSRC='rand', TASKSTU=null, TASKLV=null;
function tTask(){
  const lv=TASKLV||CFG.level;TASKSTU=TASKSTU||STUDENTS.filter(n=>n!=='測試者');
  const d=new Date();const defName=`${d.getMonth()+1}/${d.getDate()} 注音任務`;
  const ts=getTasks().slice().reverse();
  $('#tBody').innerHTML=`<div class="tgrid"><div class="tsec"><h3>建立任務</h3>
   <div class="row"><span style="font-size:20px">任務名稱</span><input type="text" id="tkName" value="${esc(defName)}" style="flex:1"></div>
   <h3 style="margin-top:12px">給誰（可多選）</h3><div class="row" id="tkStu">${STUDENTS.map(n=>`<button class="chk txt ${TASKSTU.includes(n)?'on':''}" data-v="${esc(n)}">${esc(n)}</button>`).join('')}<button class="sbtn" id="tkAll">全選</button></div>
   <h3 style="margin-top:12px">程度</h3><div class="row" id="tkLv">${LEVELS.map(l=>`<button class="chk txt ${lv===l?'on':''}" data-l="${l}">${LV_NAMES[l]}</button>`).join('')}</div>
   <h3 style="margin-top:12px">題目來源</h3><div class="row" id="tkSrc">${[['rand','每位學生各自隨機（依出題設定）'],['same','大家同一份（出題預覽的題目）'],['wrong','依每位學生自己的錯題']].map(([k,n])=>`<button class="chk txt ${TASKSRC===k?'on':''}" data-s="${k}">${n}</button>`).join('')}</div>
   <p class="hint">題數：${CFG.count} 題（在「出題設定」修改）。「依錯題」若錯題不夠，會用出題設定補滿。${TASKSRC==='same'&&PREVIEW?`目前預覽題單 ${PREVIEW.length} 題。`:''}</p>
   <div class="center" style="margin-top:10px"><button class="big g" id="tkMake">📮 建立任務</button></div></div>
   <div class="tsec"><h3>任務清單</h3><p class="hint">學生選名字後，首頁和「拼音闖關」就會出現自己的任務。<br>學生用<b>別台平板</b>時，請按「📱 任務 QR」讓學生掃描，任務就會送到那台平板。完成狀態只記在學生作答的那台裝置。</p>
   <div class="alist" style="max-height:520px">${ts.map(t=>`<div class="ar" style="flex-wrap:wrap"><b style="min-width:0">${esc(t.name)}</b><span style="flex:1">${LV_NAMES[t.level]}・${Object.values(t.items)[0].length} 題<br>${t.students.map(n=>`${esc(n)} ${(t.done||{})[n]?'✅':'⏳'}`).join('　')}</span>
    <button class="sbtn g" data-qr="${t.id}">📱 任務 QR</button><button class="sbtn" data-go="${t.id}">▶ 讓學生開始</button><button class="sbtn r" data-del="${t.id}">🗑</button></div>`).join('')||'<p>還沒有任務</p>'}</div></div></div>`;
  $$('#tkStu .chk').forEach(b=>b.onclick=()=>{const v=b.dataset.v,i=TASKSTU.indexOf(v);i>=0?TASKSTU.splice(i,1):TASKSTU.push(v);b.classList.toggle('on')});
  $('#tkAll').onclick=()=>{TASKSTU=STUDENTS.slice();tTask()};
  $$('#tkLv .chk').forEach(b=>b.onclick=()=>{TASKLV=b.dataset.l;tTask()});
  $$('#tkSrc .chk').forEach(b=>b.onclick=()=>{TASKSRC=b.dataset.s;tTask()});
  $('#tkMake').onclick=()=>{
    if(!TASKSTU.length){alert('請選擇學生');return}
    const name=$('#tkName').value.trim()||defName;const items={};
    if(TASKSRC==='same'){let p=PREVIEW&&PREVIEW.length&&((PREVIEW[0].mode==='findSym')===(lv==='seed'))?PREVIEW:genFor(lv,CFG.count);items['*']=p.slice()}
    else TASKSTU.forEach(n=>{
      let list=[];
      if(TASKSRC==='wrong'){const zs=[...new Set(LS.get('records',[]).filter(r=>r.student===n).flatMap(r=>r.wrongList||[]))];
        list=shuffle(zs).filter(z=>lv==='seed'?cat(z):BYZY[z]&&BYZY[z].n>1).slice(0,CFG.count).map(z=>lv==='seed'?{sym:z,mode:'findSym'}:{zy:z,mode:'listen'})}
      if(list.length<CFG.count){const used=new Set(list.map(q=>q.zy||q.sym));list=list.concat(genFor(lv,CFG.count*2).filter(q=>!used.has(q.zy||q.sym)).slice(0,CFG.count-list.length))}
      items[n]=list});
    if(!Object.values(items).every(l=>l.length)){alert('目前的出題設定找不到題目，請放寬範圍');return}
    const t={id:Date.now().toString(36),name,level:lv,students:TASKSTU.slice(),created:new Date().toISOString(),items,done:{}};
    const all=getTasks();all.push(t);saveTasks(all);tTask();showTaskQR(t.id)};
  $$('[data-qr]').forEach(b=>b.onclick=()=>showTaskQR(b.dataset.qr));
  $$('[data-del]').forEach(b=>b.onclick=()=>{if(confirm('刪除這個任務？')){saveTasks(getTasks().filter(t=>t.id!==b.dataset.del));tTask()}});
  $$('[data-go]').forEach(b=>b.onclick=()=>{const t=getTasks().find(x=>x.id===b.dataset.go);
    modal(`<div style="text-align:center"><div class="sign">誰要開始？</div><div class="center" style="margin-top:14px">${t.students.map(n=>`<button class="big g" data-n="${esc(n)}">${esc(n)}</button>`).join('')}<button class="big" onclick="closeModal()">取消</button></div></div>`);
    $$('#modal [data-n]').forEach(x=>x.onclick=()=>{closeModal();ME=x.dataset.n;updateBar();$('#homeBtn').classList.remove('hide');startRound(t.level,itemsFor(t,ME),false,t)})});
}
function showTaskQR(id){
  const t=getTasks().find(x=>x.id===id);if(!t)return;const url=taskURL(t);
  modal(`<div style="text-align:center"><div class="sign">📱 ${esc(t.name)}</div><p style="font-size:20px">給：${t.students.map(esc).join('、')}<br>學生用平板掃描，任務就會出現在學生端</p>
   <div class="taskqr">${qrSVG(url,420)}</div><div class="center"><button class="big y" id="dlQR">⬇ 下載 QR 圖片</button><button class="sbtn" id="cpUrl">複製任務連結</button><button class="big g" onclick="closeModal()">關閉</button></div></div>`);
  $('#dlQR').onclick=()=>downloadTaskQR(t,url);
  $('#cpUrl').onclick=()=>{navigator.clipboard&&navigator.clipboard.writeText(url).then(()=>alert('已複製'))};
}
function downloadTaskQR(t,url){
  const q=qrcode(0,'L');q.addData(url);q.make();const n=q.getModuleCount();
  const cell=Math.max(6,Math.floor(720/(n+8))),qs=cell*(n+8),W=Math.max(qs,760),H=qs+230;
  const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
  g.fillStyle='#fffaf0';g.fillRect(0,0,W,H);
  g.fillStyle='#6d4826';g.font='bold 44px WK, "Microsoft JhengHei", sans-serif';g.textAlign='center';g.fillText('📮 '+t.name,W/2,64);
  g.font='30px WK, "Microsoft JhengHei", sans-serif';g.fillStyle='#3b3227';g.fillText('給：'+t.students.join('、')+'　'+LV_NAMES[t.level]+'・'+Object.values(t.items)[0].length+' 題',W/2,112);
  const ox=(W-qs)/2,oy=140;g.fillStyle='#fff';g.fillRect(ox,oy,qs,qs);g.fillStyle='#000';
  for(let r=0;r<n;r++)for(let k=0;k<n;k++)if(q.isDark(r,k))g.fillRect(ox+(k+4)*cell,oy+(r+4)*cell,cell,cell);
  g.fillStyle='#8a7b66';g.font='24px WK, "Microsoft JhengHei", sans-serif';g.fillText('森林注音拼拼樂・用平板掃描，任務就會出現在學生端',W/2,oy+qs+50);
  c.toBlob(b=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=(t.name.replace(/[\\/:*?"<>|]/g,'_'))+'_任務QR.png';document.body.appendChild(a);a.click();a.remove()},'image/png');
}
function pct(a,b){return b?Math.round(a/b*100)+'%':'—'}
function tRec(){
  const all=LS.get('records',[]);
  const f=tRec.who||'全部';
  const list=all.filter(r=>f==='全部'||r.student===f).slice().reverse();
  const agg={};list.forEach(r=>Object.entries(r.wrongSym||{}).forEach(([k,v])=>agg[k]=(agg[k]||0)+v));
  const top=Object.entries(agg).sort((a,b)=>b[1]-a[1]).slice(0,12);
  $('#tBody').innerHTML=`<div class="tsec"><div class="row"><h3 style="margin:0">學習紀錄</h3><select id="who">${['全部',...STUDENTS].map(n=>`<option ${n===f?'selected':''}>${esc(n)}</option>`).join('')}</select>
   <button class="sbtn" id="csv">⬇ 匯出 CSV</button><button class="sbtn r" id="clr">清除紀錄</button></div>
   <p style="font-size:20px">常錯的注音：${top.length?top.map(([k,v])=>`<b style="font-size:28px">${esc(k)}</b>×${v}`).join('　'):'（目前沒有）'}</p>
   <div class="row"><button class="sbtn g" id="reWrong">🎯 用常錯題目重新出題</button><button class="sbtn g" id="reSym">🎯 針對常錯聲母・韻母・聲調設定出題範圍</button></div>
   <div style="overflow:auto;margin-top:10px"><table class="rec"><tr><th>日期</th><th>學生</th><th>程度</th><th>題數</th><th>首次正確率</th><th>最終正確率</th><th>二拼／認注音</th><th>三拼</th><th>各聲調</th><th>提示</th><th>錯誤注音</th><th>錯題</th></tr>
   ${list.map(r=>`<tr><td>${new Date(r.date).toLocaleString('zh-TW',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</td><td>${esc(r.student)}</td><td>${(LV_NAMES[r.level]||'').slice(0,2)}${r.review?'<br>複習':''}${r.task?'<br>📮'+esc(r.task):''}</td><td>${r.count}</td><td>${pct(r.first,r.count)}</td><td>${pct(r.final,r.count)}</td>
   <td>${r.byType['認注音']?'認注音 '+pct(...r.byType['認注音']):r.byType['二拼']?pct(...r.byType['二拼']):'—'}</td><td>${r.byType['三拼']?pct(...r.byType['三拼']):'—'}</td><td style="font-size:14px">${Object.entries(r.byTone).map(([k,v])=>k+' '+pct(...v)).join('<br>')}</td><td>${r.hints}</td>
   <td>${Object.entries(r.wrongSym||{}).map(([k,v])=>esc(k)+'×'+v).join(' ')}</td><td style="font-size:18px">${(r.wrongList||[]).join(' ')}</td></tr>`).join('')||'<tr><td colspan="12">還沒有紀錄</td></tr>'}</table></div></div>`;
  $('#who').onchange=e=>{tRec.who=e.target.value;tRec()};
  $('#clr').onclick=()=>{if(confirm('確定清除'+(f==='全部'?'全部':f+' 的')+'學習紀錄？')){LS.set('records',f==='全部'?[]:all.filter(r=>r.student!==f));tRec()}};
  $('#csv').onclick=()=>{const rows=[['日期','學生','程度','題數','首次正確','最終正確','提示次數','錯誤注音','錯題']].concat(list.map(r=>[r.date,r.student,LV_NAMES[r.level],r.count,r.first,r.final,r.hints,Object.entries(r.wrongSym||{}).map(([k,v])=>k+'x'+v).join(' '),(r.wrongList||[]).join(' ')]));
    const blob=new Blob(['﻿'+rows.map(r=>r.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\n')],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='森林注音拼拼樂_學習紀錄.csv';a.click()};
  $('#reWrong').onclick=()=>{const zs=[...new Set(list.flatMap(r=>r.wrongList||[]))];if(!zs.length){alert('目前沒有錯題');return}
    const syl=zs.filter(z=>BYZY[z]&&BYZY[z].n>1);if(!syl.length){alert('目前沒有拼音錯題');return}if(CFG.level==='seed'){CFG.level='low';saveCfg()}
    PREVIEW=shuffle(syl).slice(0,Math.max(CFG.count,5)).map(z=>({zy:z,mode:'listen'}));TTAB='preview';goTeacher()};
  $('#reSym').onclick=()=>{const ks=Object.keys(agg);const ini=ks.filter(k=>INI.includes(k)),fin=ks.filter(k=>FIN.includes(k)),med=ks.filter(k=>MED.includes(k));
    if(!ini.length&&!fin.length&&!med.length){alert('目前沒有常錯的注音符號紀錄');return}
    if(ini.length)CFG.inis=ini;if(fin.length)CFG.fins=fin;if(med.length)CFG.meds=MED.slice();saveCfg();TTAB='set';goTeacher();alert('已把出題範圍改成常錯的：'+[...ini,...med,...fin].join('、'))};
}
function tAudio(){
  const q=(tAudio.q||'').trim();
  const confirmed=LS.get('aok',{});
  let items=[];
  if(!q){items=[...INI,...MED,...FIN].map(c=>({k:symKey(c),label:c,note:'注音符號'})).concat([1,2,3,4,5].map(t=>({k:toneKey(t),label:TNAME[t],note:'聲調'})))}
  else if(q==='待校對'){items=BANK.filter(b=>b.chk&&b.n>1&&(b.common||PICBY[b.zy])).map(b=>({k:sylKey(b.zy),label:b.zy,note:'音檔用字：'+b.ch,chk:true}))}
  else if(q==='看圖題'){items=PICS.map(p=>({k:picKey(p.ch),label:p.zy,note:p.ch+'，'+p.w}))}
  else{items=BANK.filter(b=>b.zy.includes(q)||b.ch===q).slice(0,120).map(b=>({k:sylKey(b.zy),label:b.zy,note:'音檔用字：'+b.ch+(b.chk?'（待校對）':''),chk:b.chk}))}
  const miss=[...AU.missing];
  $('#tBody').innerHTML=`<div class="tsec"><h3>語音試聽・校對・替換</h3>
   <div class="row"><input type="text" id="aq" placeholder="輸入注音或國字搜尋，例如 ㄍㄨㄚ" value="${esc(q==='待校對'||q==='看圖題'?'':q)}" style="width:300px"><button class="sbtn g" id="aGo">搜尋</button>
   <button class="sbtn" id="aSym">37 注音＋聲調</button><button class="sbtn" id="aChk">待校對清單</button><button class="sbtn" id="aPic">看圖題音檔</button></div>
   <p class="hint">按 ▶ 試聽；「✔ 已確認」會記在本機；發音不對可「📁 換音檔」上傳 mp3，或「🎙 錄音」用老師自己的聲音（存在這台平板／電腦）。${miss.length?`<br><span style="color:var(--red)">播放時找不到的音檔：${miss.join('、')}</span>`:''}</p>
   <div class="alist">${items.map(x=>`<div class="ar"><b>${esc(x.label)}</b><span style="flex:1">${esc(x.note)} ${AU.over[x.k]?'<span class="badge rec">已替換</span>':''} ${confirmed[x.k]?'<span class="badge ok">已確認</span>':x.chk?'<span class="badge">待校對</span>':''}</span>
    <button class="sbtn" data-play="${x.k}">▶</button><button class="sbtn" data-ok="${x.k}">✔ 已確認</button><button class="sbtn" data-up="${x.k}">📁 換音檔</button><button class="sbtn" data-rec="${x.k}">🎙 錄音</button>${AU.over[x.k]?`<button class="sbtn r" data-rm="${x.k}">還原</button>`:''}</div>`).join('')}</div></div>`;
  $('#aGo').onclick=()=>{tAudio.q=$('#aq').value;tAudio()};$('#aq').onkeydown=e=>{if(e.key==='Enter'){tAudio.q=$('#aq').value;tAudio()}};
  $('#aSym').onclick=()=>{tAudio.q='';tAudio()};$('#aChk').onclick=()=>{tAudio.q='待校對';tAudio()};$('#aPic').onclick=()=>{tAudio.q='看圖題';tAudio()};
  $$('[data-play]').forEach(b=>b.onclick=()=>say(b.dataset.play));
  $$('[data-ok]').forEach(b=>b.onclick=()=>{const c=LS.get('aok',{});c[b.dataset.ok]=1;LS.set('aok',c);tAudio()});
  $$('[data-rm]').forEach(b=>b.onclick=async()=>{await IDB.del(b.dataset.rm);delete AU.over[b.dataset.rm];tAudio()});
  $$('[data-up]').forEach(b=>b.onclick=()=>{const inp=document.createElement('input');inp.type='file';inp.accept='audio/*';inp.onchange=async()=>{const f=inp.files[0];if(!f)return;if(!IDB.db){alert('此瀏覽器無法儲存音檔');return}await IDB.put(b.dataset.up,f);AU.over[b.dataset.up]=URL.createObjectURL(f);tAudio()};inp.click()});
  $$('[data-rec]').forEach(b=>b.onclick=()=>recordFor(b.dataset.rec));
}
async function recordFor(k){
  if(!navigator.mediaDevices||!window.MediaRecorder){alert('這個瀏覽器不支援錄音，請改用「換音檔」');return}
  let stream;try{stream=await navigator.mediaDevices.getUserMedia({audio:true})}catch(e){alert('無法使用麥克風');return}
  const mr=new MediaRecorder(stream);const ch=[];mr.ondataavailable=e=>ch.push(e.data);
  modal(`<div style="text-align:center"><div class="sign">🎙 錄音中…</div><p style="font-size:24px">請念出這個音，念完按「停止」</p><button class="big p" id="stopRec">⏹ 停止</button></div>`);
  mr.onstop=async()=>{stream.getTracks().forEach(t=>t.stop());const blob=new Blob(ch,{type:mr.mimeType||'audio/webm'});
    modal(`<div style="text-align:center"><div class="sign">確認錄音</div><p><button class="big y" id="rPlay">▶ 試聽</button></p><div class="center"><button class="big g" id="rSave">💾 使用這段錄音</button><button class="big" id="rCancel">取消</button></div></div>`);
    const url=URL.createObjectURL(blob);$('#rPlay').onclick=()=>new Audio(url).play();
    $('#rSave').onclick=async()=>{if(IDB.db)await IDB.put(k,blob);AU.over[k]=url;closeModal();tAudio()};$('#rCancel').onclick=closeModal};
  mr.start();$('#stopRec').onclick=()=>mr.stop();
}
function tMore(){
  $('#tBody').innerHTML=`<div class="tgrid"><div class="tsec"><h3>學生名單</h3><p class="hint">一行一位，學生進入網站時會先選自己的名字。</p>
   <textarea id="stuList" style="width:100%;min-height:160px;font-size:26px;font-family:inherit;border-radius:12px;border:2px solid var(--wood-l);padding:8px">${STUDENTS.join('\n')}</textarea>
   <div class="row"><button class="sbtn g" id="stuSave">💾 儲存名單</button><button class="sbtn r" id="rwClr">重設所有獎勵</button></div></div>
   <div class="tsec"><h3>QR Code</h3><div class="qrbox"><img src="pic/qr.png" alt="QR code"><div style="font-size:18px;word-break:break-all">平板掃描即可開啟：<br><b>${location.origin.includes('github.io')?location.href.split('#')[0]:'https://liniris1023.github.io/sped-exam-reader/forest-zhuyin/'}</b></div></div></div></div>`;
  $('#stuSave').onclick=()=>{STUDENTS=$('#stuList').value.split('\n').map(s=>s.trim()).filter(Boolean);LS.set('students',STUDENTS);alert('已儲存')};
  $('#rwClr').onclick=()=>{if(confirm('確定把所有學生的葉子、水果、禮物歸零？')){LS.set('rewards',{});alert('已重設')}};
}
function showQR(){modal(`<div style="text-align:center"><div class="sign">掃描 QR Code 開啟</div><p><img src="pic/qr.png" style="width:300px;height:300px" alt="QR code"></p><p style="font-size:20px;word-break:break-all">https://liniris1023.github.io/sped-exam-reader/forest-zhuyin/</p><button class="big g" onclick="closeModal()">關閉</button></div>`)}

/* ================= 啟動 ================= */
$('#homeBtn').onclick=()=>{stopAudio();ME&&ME!=='老師'?goHome():goNames()};
$('#qrBtn').onclick=showQR;
loadOverrides().then(()=>{});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAudio()});
const IMPORTED=importTaskFromHash();
goNames();
if(IMPORTED)setTimeout(()=>popCard(`📮 收到老師任務：${esc(IMPORTED.name)}<br><small style="font-size:22px">給 ${IMPORTED.students.map(esc).join('、')}</small>`,3000),400);
