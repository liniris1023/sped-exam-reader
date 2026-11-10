const DATA=/*DATA*/;
const SECS=DATA.secs, AUD=DATA.aud, NUM="1234", CIR="①②③④", TF=["○","✕"], TFW=["對","錯"];
const ITEMS=[];
SECS.forEach((s,si)=>s.items.forEach((it,ii)=>{it.id=s.id+"_"+ii; it.si=si; it.ii=ii; it.t=it.t||s.type; ITEMS.push(it);}));
ITEMS.forEach(it=>{ if(it.g!=null){ it.gj=ITEMS.filter(x=>x.si===it.si&&x.g===it.g).indexOf(it); } });
const $=id=>document.getElementById(id);
const esc=t=>String(t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const SPK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9a4 4 0 0 1 0 6"/><path d="M18.5 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
const PEN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>';
const TICK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"/></svg>';
const FS=[20,24,28,32], RATES=[["慢",0.8],["正常",1],["快",1.2]];
const KEY="math5-midterm-1151-pub";
let st={ans:{},i:0,fs:1,hc:false,rate:1,t0:null,t1:null};
try{const x=JSON.parse(localStorage.getItem(KEY)||"null"); if(x&&typeof x==="object")st=Object.assign(st,x);}catch(e){}
const SITE_URL="https://liniris1023.github.io/sped-exam-reader/math5-midterm/";
let TEACHER=false;
function save(){ if(TEACHER)return; try{localStorage.setItem(KEY,JSON.stringify(st));}catch(e){} }

/* 標記 → HTML：~字~ 底線、□ 方框、換行 */
function M(t,box){ let h=esc(t).replace(/~([^~]+)~/g,'<u class="em">$1</u>');
  h=h.replace(/\[([^\[\]|]*)\|([^\[\]|]*)\|([^\[\]|]*)\]/g,(m,w,n,d)=>`<span class="mx">${w}<span class="fr"><span>${n}</span><span>${d}</span></span></span>`);
  h=h.replace(/\{(\d+)\}/g,(m,k)=>box?box(+k):"（　）");
  return h.replace(/□/g,'<span class="sq"></span>').replace(/\n/g,"<br>"); }
const FIG=(img,alt)=>`<figure class="mfig"><img class="zoomable" src="img/${img}.png" alt="${esc(alt)}"><figcaption>點圖片可以放大</figcaption></figure>`;
const isT=it=>it.t==="text"||it.kind==="text"||it.kind==="num"||it.kind==="pick";
const ansStr=v=>v==null?"":String(v);

/* result code for the teacher's QR */
function encodeRes(){ const a=ITEMS.map(it=>{const v=st.ans[it.id]; if(v==null||v==="")return "x"; if(isT(it)) return "t"+[...String(v)].map(c=>c.codePointAt(0).toString(36)).join("_"); return String(v);}).join(".");
  const mins=st.t0&&st.t1?Math.max(1,Math.round((st.t1-st.t0)/60000)):0;
  return "r-"+a+"-"+Math.floor((st.t1||Date.now())/60000).toString(36)+"-"+mins.toString(36); }
function decodeRes(h){ const m=/^r-([0-9a-z_.]+)-([0-9a-z]+)-([0-9a-z]+)$/.exec(h); if(!m)return null; const parts=m[1].split(".");
  if(parts.length!==ITEMS.length)return null;
  const ans={}; ITEMS.forEach((it,i)=>{ const c=parts[i]; if(c==="x")return; if(isT(it)&&c[0]==="t"){ ans[it.id]=c.slice(1).split("_").map(x=>String.fromCodePoint(parseInt(x,36))).join(""); return; }
    ans[it.id]=(it.t==="check"||it.multi||it.kind==="multi")?c:+c; });
  const t1=parseInt(m[2],36)*60000, mins=parseInt(m[3],36); return {ans,t1,t0:mins?t1-mins*60000:null}; }
function drawQR(el,text,size){ el.innerHTML=""; if(!window.QRCode){ el.textContent=text; return; }
  try{ new QRCode(el,{text,width:size,height:size,colorDark:"#000000",colorLight:"#FFFFFF",correctLevel:QRCode.CorrectLevel.M}); }catch(e){ el.textContent=text; } }
let view="home";

/* ---------- speech: edge-tts clips (曉臻) first, browser voice as backup ---------- */
const synth=window.speechSynthesis; let vZh=null;
function pickVoice(){ if(!synth)return; const v=synth.getVoices();
  vZh=v.find(x=>/zh[-_]TW/i.test(x.lang)&&/HsiaoChen|曉臻/i.test(x.name))||v.find(x=>/zh[-_]TW/i.test(x.lang))||v.find(x=>/^zh/i.test(x.lang))||null; }
if(synth){pickVoice(); synth.onvoiceschanged=pickVoice;}
const urls={}; const player=new Audio(); let playTok=0;
function clipURL(seg){ const p=AUD[seg[0]+"|"+seg[1]]; if(!p)return Promise.resolve(null);
  if(!urls[p]) urls[p]=fetch(p).then(r=>{if(!r.ok)throw 0; return r.blob();}).then(b=>URL.createObjectURL(b)).catch(()=>{delete urls[p]; return null;});
  return urls[p]; }
function prefetch(list){ list.forEach(s=>clipURL(s)); }
function audioSay(url,tok){ return new Promise(res=>{ if(tok!==playTok){res();return;} let done=false; const fin=()=>{if(!done){done=true;res();}};
  player.onended=fin; player.onerror=fin; player.src=url; player.playbackRate=RATES[st.rate][1]; player.preservesPitch=true;
  const p=player.play(); if(p&&p.catch)p.catch(fin); }); }
function synthSay(seg,tok){ return new Promise(res=>{ if(!synth||tok!==playTok){ $("live").textContent=seg[1]; res(); return; }
  const u=new SpeechSynthesisUtterance(seg[1]); u.lang="zh-TW"; if(vZh)u.voice=vZh;
  u.rate=RATES[st.rate][1]*0.95; let done=false; const fin=()=>{if(!done){done=true;res();}};
  u.onend=fin; u.onerror=fin; synth.speak(u); setTimeout(fin,Math.max(4000,seg[1].length*300)); }); }
function clearReading(){document.querySelectorAll(".reading").forEach(e=>e.classList.remove("reading"));}
async function speak(parts){
  const tok=++playTok; try{player.pause();}catch(e){} if(synth)synth.cancel(); clearReading();
  for(const p of parts){ if(tok!==playTok)return; clearReading(); if(p.el){p.el.classList.add("reading"); follow(p.el);}
    for(const seg of p.segs){ if(tok!==playTok)return; const url=await clipURL(seg); if(tok!==playTok)return;
      if(url) await audioSay(url,tok); else await synthSay(seg,tok); }
    if(tok===playTok) await new Promise(r=>setTimeout(r,200)); }
  if(tok===playTok)clearReading(); }
const say1=t=>speak([{segs:[["zh",t]]}]);
function stopSpeak(){ playTok++; try{player.pause();}catch(e){} if(synth)synth.cancel(); clearReading(); }
function follow(el){ try{ const r=el.getBoundingClientRect(), top=$("tools").offsetHeight+12, bar=$("bar"), bottom=window.innerHeight-(bar.hidden?0:bar.offsetHeight)-12;
  if(r.top>=top&&r.bottom<=bottom)return; const smooth=!matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({top:Math.max(0,window.scrollY+r.top-top-Math.max(0,(bottom-top-r.height)/2)),behavior:smooth?"smooth":"auto"}); }catch(e){} }

/* ---------- settings ---------- */
function applySettings(){ document.documentElement.style.fontSize=FS[st.fs]+"px";
  if(st.hc)document.documentElement.setAttribute("data-contrast","hc"); else document.documentElement.removeAttribute("data-contrast");
  $("hc").setAttribute("aria-pressed",String(!!st.hc)); $("rate").textContent="語速："+RATES[st.rate][0]; }
$("fsDown").onclick=()=>{st.fs=Math.max(0,st.fs-1);save();applySettings();};
$("fsUp").onclick=()=>{st.fs=Math.min(FS.length-1,st.fs+1);save();applySettings();};
$("hc").onclick=()=>{st.hc=!st.hc;save();applySettings();};
$("rate").onclick=()=>{st.rate=(st.rate+1)%RATES.length;save();applySettings();};
$("homeBtn").onclick=()=>{stopSpeak(); if(TEACHER){ try{history.replaceState(null,"",location.pathname+location.search);}catch(e){} leaveTeacher(); show("home"); } else show("home");};

/* ---------- helpers ---------- */
const isDone=it=>{const v=st.ans[it.id]; return v!=null&&String(v).trim()!=="";};
const answered=()=>ITEMS.filter(isDone).length;
function setProgress(){ $("prog").textContent = view==="q" ? `第 ${st.i+1} / ${ITEMS.length} 題　已答 ${answered()}` : `已答 ${answered()} / ${ITEMS.length}`; }
function show(v){ view=v; $("bar").hidden = v!=="q"&&v!=="toc"; ({home:renderHome,q:renderQ,check:renderCheck,done:renderDone,toc:renderToc})[v](); setProgress(); if(v!=="q")window.scrollTo(0,0); }
const symOf=it=>SECS[it.si].sym||TF;
const mTxt=(it,v)=>ansStr(v).split("").map(d=>SECS[it.si].groups[it.g].bank[+d][0]).join("、");
function showVal(it,v){ if(v==null||v==="")return ""; if(it.kind==="multi")return ansStr(v).split("").map(d=>it.mk[+d]).join("、"); return String(v); }
function fillLine(s,g,curK){ return M(g.line,k=>{ const it=s.items.find(x=>x.k===k), sv=showVal(it,st.ans[it.id]), cur=k===curK;
  return `<button type="button" class="bx${cur?" cur":""}${sv?" filled":""}" data-bk="${k}" aria-label="${esc((it.bl?"括號"+it.bl:"括號")+(sv?"，寫了 "+sv:"，還沒寫"))}">${it.bl?`<i>${it.bl}</i>`:""}<b>${sv?M(sv):"&nbsp;"}</b></button>`; }); }
const CH_SAY={".":"點","×":"乘"};
const charSegs=v=>[...String(v)].map(c=>["zh",CH_SAY[c]||c]);
const ckTxt=v=>ansStr(v).split("").map(d=>CIR[+d]).join("");

/* ---------- home ---------- */
function renderHome(){
  const started=answered()>0||st.t0;
  $("main").innerHTML=`<section class="screen">
    <p class="eyebrow">115 學年度第一學期　期中學業評量</p>
    <h1>五年級 數學科<br>報讀作答</h1>
    <div class="facts"><span class="fact">4 大題</span><span class="fact">${ITEMS.length} 題</span><span class="fact">滿分 100 分</span><span class="fact">畫圖題、應用題寫在答案紙</span></div>
    <p style="margin:0;font-size:1.6rem;font-weight:900">五年級　數學科</p>
    <div class="row">
      <button class="big" id="startBtn" type="button" style="font-size:1.8rem;min-height:5.5rem;padding-inline:2.4rem">${started?"繼續作答":"開始作答"}</button>
      ${started?'<button class="ghost" id="resetBtn" type="button">清除答案，重新作答</button>':""}
    </div>
    <ol class="help">
      <li>按 <b>藍色喇叭</b> 聽題目，可以一直重聽。</li>
      <li>選擇題：點 1、2、3、4 大按鈕選答案。</li>
      <li>填充題：用下面的大按鈕填格子；點題目裡的格子可以換格子。</li>
      <li>第㉗格、第三大題、應用題：聽完題目，在 <b>答案紙</b> 上畫圖或寫算式和答案，寫好再按大按鈕。</li>
      <li>可以自由按「上一題」「下一題」；按下面中間的 <b>考卷目錄</b> 可以直接跳到任何一題。</li>
      <li>有圖片的題目，點圖片可以放大。</li>
      <li>寫完按「交卷」，再按「下載作答 PDF」交給老師。</li>
    </ol>
    <div id="resetBox"></div>
    <div class="qrbox"><div id="homeQR"></div><p>掃描 QR Code 打開這個報讀網站</p></div>
  </section>`;
  drawQR($("homeQR"),SITE_URL,220);
  $("startBtn").onclick=()=>{ if(!st.t0){st.t0=Date.now();save();} show(st.t1?"done":"q"); window.scrollTo(0,0);};
  if($("resetBtn")) $("resetBtn").onclick=()=>{ $("resetBox").innerHTML=`<div class="warnbox"><p>確定要清除全部答案嗎？清除後不能復原。</p>
      <div class="row"><button class="big" id="yesReset" type="button" style="background:var(--bad);color:#fff">確定清除</button><button class="ghost" id="noReset" type="button">不要清除</button></div></div>`;
    $("noReset").onclick=()=>{$("resetBox").innerHTML="";};
    $("yesReset").onclick=()=>{ st.ans={}; st.i=0; st.t0=null; st.t1=null; save(); renderHome(); setProgress(); }; };
}

/* ---------- question ---------- */
function secHead(s){
  return `<div class="sec">
    <div class="sech"><b>${s.no}、${M(s.zh)}</b><small>（${s.pct} 分，${s.perNote||"每題 "+s.per+" 分"}）</small></div>
    <div class="row"><button class="speaker pill" id="secSpk" type="button" aria-label="唸大題說明">${SPK}大題說明</button></div>
  </div>`;
}
function renderQ(keepScroll){
  const y=window.scrollY; const it=ITEMS[st.i], s=SECS[it.si], a=st.ans[it.id];
  let h=`<section class="screen" style="gap:.8rem">`+secHead(s);
  const G=(it.g!=null&&s.groups&&s.groups[it.g].ctx!=null)?s.groups[it.g]:null;
  if(G){
    h+=`<div class="passage"><div class="ptop ctxtop"><b>${esc(G.title)}</b><button class="speaker pill ctxspk" id="ctxSpk" type="button" aria-label="${G.readEach===false?"聽文章":"聽說明"}">${SPK}${G.readEach===false?"聽文章":"聽說明"}</button></div><p class="ctxp${G.readEach===false?" longp":""}" id="ctx">${M(G.ctx)}</p>${G.img?`<figure class="mfig gfig"><img class="zoomable" src="img/${G.img}.png" alt="${esc(G.alt)}"><figcaption>點圖片可以放大</figcaption></figure>`:""}</div>`;
  }
  h+=`<div class="card"><div class="qhead"><span class="qnum">${esc(it.lab)}</span><button class="speaker pill" id="stemSpk" type="button" aria-label="唸題目">${SPK}唸題目</button></div>`;
  if(it.t==="tf"){
    h+=`<p class="stem" id="stem">${M(it.stem)}</p>`;
    h+=`<div class="picks tfs" role="radiogroup" aria-label="對或錯">${symOf(it).map((c,k)=>`<button type="button" role="radio" aria-checked="${a===k}" data-tf="${k}" aria-label="${TFW[k]}"><span class="sym">${c}</span><span class="w">${TFW[k]}</span></button>`).join("")}</div>`;
  } else if(it.t==="choice"){
    h+=`<p class="stem" id="stem">${M(it.stem)}</p>`;
    if(it.img) h+=FIG(it.img,it.alt);
    h+=`<div class="opts" role="radiogroup" aria-label="選項">`+it.o.map((o,k)=>`<div class="opt"><button class="optbtn" type="button" role="radio" aria-checked="${a===k}" data-k="${k}"><span class="no">${NUM[k]}</span><span>${M(o)}</span></button><button class="speaker" type="button" data-s="${k}" aria-label="唸選項 ${k+1}">${SPK}</button></div>`).join("")+`</div>`;
  } else if(it.t==="match"){
    const g=s.groups[it.g], mv=ansStr(a);
    const shown=it.multi?(mv?mTxt(it,mv):"&nbsp;"):(a!=null?g.bank[a][0]:"&nbsp;");
    h+=`<p class="stem mstem" id="stem"><span class="bx mbx${isDone(it)?" filled":""} cur"><b>${shown}</b></span><span>${M(it.stem)}</span></p>`;
    h+=`<div class="row"><button class="speaker pill" id="bankSpk" type="button">${SPK}聽全部代號</button>${it.multi?`<button class="speaker pill" id="mySpk" type="button">${SPK}唸我選的</button>`:""}</div>`;
    h+=`<div class="codes" role="${it.multi?"group":"radiogroup"}" aria-label="代號">${g.bank.map((b,k)=>`<button type="button" role="${it.multi?"checkbox":"radio"}" aria-checked="${it.multi?mv.includes(k):a===k}" data-m="${k}"><span class="code">${b[0]}</span><span class="cw">${esc(b[1])}</span></button>`).join("")}</div>`;
  } else if(it.t==="text"){
    h+=`<p class="stem" id="stem">${M(it.stem)}</p>`;
    h+=`<div class="txtwrap"><input class="txtin" id="txtin" type="text" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="在這裡寫答案" placeholder="在這裡寫答案" value="${esc(ansStr(a))}"><button class="speaker pill" id="mySpk" type="button">${SPK}唸我寫的</button></div>`;
  } else if(it.t==="fill"){
    h+=`<p class="mline${[6,7,8,9].includes(it.g)?" mbig":""}" id="stem">${fillLine(s,s.groups[it.g],it.k)}</p>`;
    (s.groups[it.g].imgs||[]).forEach(x=>{h+=FIG(x[0],x[1]);});
    if(it.kind==="num"){
      h+=`<div class="pad"><div class="padshow"><span class="val${a?"":" empty"}" id="val">${a?esc(a):"按下面的按鈕"}</span><button class="speaker pill" id="mySpk" type="button">${SPK}唸我寫的</button></div>
        <div class="keys">${[...(it.nd?[]:[1,2,3,4,5,6,7,8,9,0]),...(it.keys||[])].map(d=>`<button type="button" data-d="${d}" aria-label="${CH_SAY[d]||d}">${d}</button>`).join("")}</div>
        <div class="keys2"><button type="button" id="bsBtn">⌫ 刪掉一個</button><button type="button" id="clrBtn">全部清除</button></div></div>`;
    } else if(it.kind==="pick"){
      const on=ansStr(a);
      h+=`<div class="pad"><div class="padshow"><span class="val${on?"":" empty"}" id="val">${on?esc(on):"點一個大按鈕選答案"}</span><button class="speaker pill" id="mySpk" type="button">${SPK}唸我選的</button></div>
        <div class="keys pkkeys" role="radiogroup">${it.pk.map((p,k)=>`<button type="button" role="radio" data-pk="${k}" aria-checked="${on===p}" aria-label="${esc(it.pkSay[k])}" class="${on===p?"on":""}">${esc(p)}</button>`).join("")}</div></div>`;
    } else if(it.kind==="text"){
      h+=`<div class="txtwrap"><input class="txtin" id="txtin" type="text" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="在這裡寫答案" placeholder="在這裡寫答案" value="${esc(ansStr(a))}"><button class="speaker pill" id="mySpk" type="button">${SPK}唸我寫的</button></div>`;
    } else {
      const on=ansStr(a);
      h+=`<div class="pad"><div class="padshow"><span class="val${on?"":" empty"}" id="val">${on?M(showVal(it,on)):"點分數選，再點一次取消"}</span><button class="speaker pill" id="mySpk" type="button">${SPK}唸我選的</button></div>
        <div class="keys frkeys">${it.mk.map((f,k)=>`<button type="button" data-mk="${k}" aria-pressed="${on.includes(k)}" aria-label="${esc(it.mkSay[k])}" class="${on.includes(k)?"on":""}">${M(f)}</button>`).join("")}</div></div>`;
    }
  } else if(it.t==="paper"){
    h+=`<p class="stem" id="stem">${M(it.stem)}</p>`;
    if(it.img) h+=`<figure class="mfig"><img class="zoomable" src="img/${it.img}.png" alt="${esc(it.alt)}"><figcaption>點圖片可以放大</figcaption></figure>`;
    h+=`<div class="paperbox">${PEN}<span>${esc(s.note)}<br>（${s.no}-${esc(it.lab)}，${it.pts} 分）</span></div>`;
    h+=`<button class="big paperdone" id="paperDone" type="button">${a!=null?"✓ ":""}我在答案紙寫好了，下一題 →</button>`;
  } else {
    const on=ansStr(a);
    h+=`<p class="stem" id="stem">${M(it.stem)}</p>`;
    h+=`<div class="opts" aria-label="可以勾很多個">`+it.o.map((o,k)=>`<div class="opt"><button class="optbtn ckbtn" type="button" role="checkbox" aria-checked="${on.includes(k)}" data-ck="${k}"><span class="box ckbox">${TICK}</span><span><b class="cno">${CIR[k]}</b> ${M(o)}</span></button><button class="speaker" type="button" data-s="${k}" aria-label="唸選項 ${k+1}">${SPK}</button></div>`).join("")+`</div>`;
    h+=`<div class="padshow"><span class="val${on?"":" empty"}" id="val">${on?"勾了 "+ckTxt(on):"點一下打勾，再點一次取消"}</span><button class="speaker pill" id="mySpk" type="button">${SPK}唸我勾的</button></div>`;
  }
  h+=`</div>`;
  h+=`</section>`;
  $("main").innerHTML=h;
  // wire
  $("secSpk").onclick=()=>speak([{segs:s.introSay}]);
  const readStem=(auto)=>{ const parts=[{segs:it.stemSay,el:$("stem")}];
    if(G&&(G.readEach!==false||(auto&&it.gj===0))) parts.unshift({segs:G.ctxSay,el:$("ctx")});
    if(it.t==="match"){ const bs=[...document.querySelectorAll("[data-m]")]; G.bankSay.forEach((seg,k)=>parts.push({segs:[seg],el:bs[k]})); }
    if(it.kind==="multi"){ const bs=[...document.querySelectorAll("[data-mk]")]; it.mkSegs.forEach((seg,k)=>parts.push({segs:[seg],el:bs[k]})); }
    if(it.optSay){ const bs=[...document.querySelectorAll("[data-k],[data-ck]")]; it.optSay.forEach((seg,k)=>parts.push({segs:seg,el:bs[k]})); }
    speak(parts); };
  $("stemSpk").onclick=()=>readStem(false);
  if($("ctxSpk")) $("ctxSpk").onclick=()=>speak([{segs:s.groups[it.g].ctxSay,el:$("ctx")}]);
  if($("bankSpk")) $("bankSpk").onclick=()=>{ const g=s.groups[it.g], bs=[...document.querySelectorAll("[data-m]")];
    speak(g.bankSay.map((seg,k)=>({segs:[seg],el:bs[k]}))); };
  document.querySelectorAll("[data-tf]").forEach(b=>b.onclick=()=>pick(+b.dataset.tf,"你選的是"+TFW[+b.dataset.tf]));
  document.querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>pick(+b.dataset.k,"你選的是"+(+b.dataset.k+1)+"號"));
  document.querySelectorAll("[data-m]").forEach(b=>b.onclick=()=>{ const k=+b.dataset.m;
    if(it.multi){ const d=String(k); let v=ansStr(st.ans[it.id]); const had=v.includes(d); v=had?v.replace(d,""):v+d; v=v.split("").sort().join(""); setAns(v); say1((had?G.offSay:G.onSay)[k]); }
    else pick(k,G.pickSay[k]); });
  document.querySelectorAll("[data-d]").forEach(b=>b.onclick=()=>{ const v=ansStr(st.ans[it.id]); if(v.length>=8){say1("最多只能寫8個字");return;} setAns(v+b.dataset.d); say1(CH_SAY[b.dataset.d]||b.dataset.d); });
  if($("bsBtn")) $("bsBtn").onclick=()=>{ setAns(ansStr(st.ans[it.id]).slice(0,-1)); say1("刪掉一個"); };
  if($("clrBtn")) $("clrBtn").onclick=()=>{ setAns(""); say1("全部清除"); };
  document.querySelectorAll("[data-pk]").forEach(b=>b.onclick=()=>{ const k=+b.dataset.pk; setAns(it.pk[k]); say1(it.pickSay[k]); });
  document.querySelectorAll("[data-mk]").forEach(b=>b.onclick=()=>{ const k=+b.dataset.mk, d=String(k); let v=ansStr(st.ans[it.id]); const had=v.includes(d);
    v=had?v.replace(d,""):v+d; v=v.split("").sort().join(""); setAns(v); say1((had?it.offSay:it.onSay)[k]); });
  document.querySelectorAll("[data-bk]").forEach(b=>b.onclick=()=>jumpBlank(s,+b.dataset.bk));
  if($("paperDone")) $("paperDone").onclick=()=>{ st.ans[it.id]=1; if(st.t1)st.t1=null; save(); if(st.i===ITEMS.length-1){stopSpeak(); show("check");} else go(st.i+1); };
  if($("txtin")){ const ti=$("txtin"); ti.oninput=()=>{ const v=ti.value; if(v.trim()==="") delete st.ans[it.id]; else st.ans[it.id]=v.trim(); if(st.t1)st.t1=null; save(); $("nextBtn").classList.remove("locked"); setProgress(); }; }
  document.querySelectorAll("[data-s]").forEach(b=>b.onclick=()=>{const k=+b.dataset.s; speak([{segs:it.optSay[k],el:b.previousElementSibling}]);});
  document.querySelectorAll("[data-ck]").forEach(b=>b.onclick=()=>{ const d=b.dataset.ck; let v=ansStr(st.ans[it.id]); const had=v.includes(d);
    v=had?v.replace(d,""):v+d; v=v.split("").sort().join(""); setAns(v); say1((had?"取消":"勾了")+(+d+1)+"號"); });
  if($("mySpk")&&it.t==="fill"&&it.kind==="num") $("mySpk").onclick=()=>{ const v=ansStr(st.ans[it.id]); if(!v){ say1("你還沒有寫答案"); return; } speak([{segs:[["zh","你寫的是"],...charSegs(v)],el:$("val")}]); };
  else if($("mySpk")&&it.t==="fill"&&it.kind==="multi") $("mySpk").onclick=()=>{ const v=ansStr(st.ans[it.id]); if(!v){ say1("你還沒有選"); return; } speak([{segs:[["zh","你選了"],...v.split("").map(d=>it.mkSegs[+d])],el:$("val")}]); };
  else if($("mySpk")&&it.kind==="pick") $("mySpk").onclick=()=>{ const v=ansStr(st.ans[it.id]); if(!v){ say1("你還沒有選"); return; } say1(it.pickSay[it.pk.indexOf(v)]); };
  else if($("mySpk")&&(it.t==="text"||it.kind==="text")) $("mySpk").onclick=()=>{ const v=ansStr(st.ans[it.id]); if(!v){ say1("你還沒有寫"); return; } speak([{segs:[["zh","你寫的是"],["zh",v]],el:$("txtin")}]); };
  else if($("mySpk")&&it.t==="match") $("mySpk").onclick=()=>{ const v=ansStr(st.ans[it.id]); if(!v){ say1("你還沒有選"); return; } speak([{segs:[["zh","你選了"],...v.split("").map(d=>G.bankSay[+d])],el:$("stem")}]); };
  else if($("mySpk")) $("mySpk").onclick=()=>{ const v=ansStr(st.ans[it.id]); if(!v){ say1("你還沒有勾"); return; }
    speak([{segs:[["zh","你勾了"],...v.split("").map(d=>["zh",(+d+1)+"號"])],el:$("val")}]); };
  document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>go(+b.dataset.go));
  document.querySelectorAll(".zoomable").forEach(im=>im.onclick=()=>zoom(im.src,im.alt));
  // bottom bar
  $("prevBtn").disabled=st.i===0;
  $("nextBtn").classList.remove("locked");
  const last=st.i===ITEMS.length-1; $("nextBtn").textContent=last?"檢查並交卷 →":"下一題 →"; $("nextBtn").classList.toggle("finish",last);
  prefetch([...it.stemSay,...(it.optSay||[]).flat(),...s.introSay,...(G?G.ctxSay:[]),...(it.t==="match"?G.bankSay:[]),...(it.mkSegs||[])]);
  setProgress();
  if(keepScroll) window.scrollTo(0,y); else { window.scrollTo(0,0); readStem(true); } /* 換到新題目就自動唸 */
}
function zoom(src,alt){ const d=document.createElement("div"); d.className="zoom"; d.innerHTML=`<img src="${src}" alt="${esc(alt)}"><button type="button">關閉 ✕</button>`;
  d.onclick=()=>d.remove(); document.body.appendChild(d); d.querySelector("button").focus(); }
function setAns(v){ const it=ITEMS[st.i]; if(v===""||v==null) delete st.ans[it.id]; else st.ans[it.id]=v; if(st.t1)st.t1=null; save(); renderQ(true); }
function pick(k,msg){ const it=ITEMS[st.i]; st.ans[it.id]=k; if(st.t1)st.t1=null; save(); renderQ(true); say1(msg); }
function jumpBlank(s,k){ const it=s.items.find(x=>x.k===k); if(!it)return; const n=ITEMS.indexOf(it);
  if(n>reach()){ say1("請先寫好答案，才能到下一題。"); return; }
  if(n!==st.i){ stopSpeak(); st.i=n; save(); renderQ(true); }
  speak([{segs:it.stemSay,el:$("stem")}]); }
function reach(){ return ITEMS.length-1; } /* 數學要寫在答案紙，學生可以自由換題 */
function go(n){ stopSpeak(); bindNext(); st.i=Math.max(0,Math.min(ITEMS.length-1,n)); save(); show("q"); }
$("prevBtn").onclick=()=>go(st.i-1);
bindNext();
$("tocBtn").onclick=()=>{ stopSpeak(); show("toc"); };
document.addEventListener("keydown",e=>{ if(view!=="q"||/INPUT|TEXTAREA/.test(document.activeElement.tagName))return;
  if(e.key==="ArrowRight")$("nextBtn").click(); if(e.key==="ArrowLeft"&&st.i>0)go(st.i-1); });

/* ---------- 考卷目錄 ---------- */
function renderToc(){
  $("main").innerHTML=`<section class="screen toc">
    <h1>考卷目錄</h1>
    <p class="tochelp">點題號就能跳到那一題。<span class="tdone">✓ 綠色</span>＝已經寫好，<span class="tcur">黃框</span>＝現在這一題。</p>
    ${SECS.map(sx=>`<div class="tocsec"><h2>${sx.no}、${M(sx.zh)}<small>（${sx.pct} 分）</small></h2><div class="tocgrid">${sx.items.map(x=>{const n=ITEMS.indexOf(x);
      return `<button type="button" data-go="${n}" class="${isDone(x)?"done":""}${n===st.i?" cur":""}" aria-label="${esc(sx.no+"之"+x.lab)}${isDone(x)?"，已寫好":"，還沒寫"}">${isDone(x)?'<i aria-hidden="true">✓</i>':""}${esc(x.lab)}</button>`;}).join("")}</div></div>`).join("")}
    <div class="row"><button class="big" id="tocBack" type="button">回到第 ${st.i+1} 題</button><button class="ghost" id="tocCheck" type="button">檢查並交卷</button></div>
  </section>`;
  document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>go(+b.dataset.go));
  $("tocBack").onclick=()=>go(st.i); $("tocCheck").onclick=()=>{ stopSpeak(); show("check"); };
  $("prevBtn").disabled=true; $("nextBtn").textContent="回到題目 →"; $("nextBtn").classList.remove("finish"); $("nextBtn").onclick=()=>go(st.i);
  say1("考卷目錄。點題號，就能跳到那一題。");
}
function bindNext(){ $("nextBtn").onclick=()=>{ if(st.i===ITEMS.length-1){stopSpeak(); show("check");} else go(st.i+1); }; }

/* ---------- check & submit ---------- */
function renderCheck(){
  const miss=ITEMS.filter(it=>!isDone(it));
  $("main").innerHTML=`<section class="screen">
    <h1>檢查一下</h1>
    ${miss.length?`<div class="warnbox"><p>還有 ${miss.length} 題沒有寫：</p><div class="miss">${miss.map(it=>`<button type="button" data-go="${ITEMS.indexOf(it)}">${SECS[it.si].no}-${esc(it.lab)}</button>`).join("")}</div></div>`
      :`<p style="margin:0;font-weight:900;font-size:1.3rem;color:var(--ok)">全部 ${ITEMS.length} 題都寫完了！</p>`}
    <div class="row">
      <button class="big" id="submitBtn" type="button" style="background:var(--stu);color:var(--stu-fg)">${miss.length?"還是要交卷":"交卷"}</button>
      <button class="ghost" id="backBtn" type="button">回去檢查題目</button><button class="ghost" id="tocBtn2" type="button">考卷目錄</button>
    </div></section>`;
  say1(miss.length?"還有題目沒寫，要回去檢查嗎？可以按考卷目錄找題目。":"全部寫完了，可以交卷。");
  document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>go(+b.dataset.go));
  $("backBtn").onclick=()=>go(st.i); $("tocBtn2").onclick=()=>show("toc");
  $("submitBtn").onclick=()=>{ st.t1=Date.now(); save(); show("done"); };
}
let pdfBlob=null, pages=[];
function renderDone(){
  $("main").innerHTML=`<section class="screen">
    <div class="done-mark" aria-hidden="true">✓</div>
    <h1>${TEACHER?"老師批改：作答紀錄":"交卷完成"}</h1>
    <p style="margin:0;font-weight:700">五年級　已答 ${answered()} / ${ITEMS.length} 題　交卷 ${fmt(st.t1)}</p>
    <div class="row"><button class="big" id="pdfBtn" type="button" disabled>正在製作作答 PDF…</button>
      ${TEACHER?'<button class="ghost" id="leaveBtn" type="button">離開批改畫面</button>':'<button class="ghost" id="reviewBtn" type="button">回去修改答案</button>'}</div>
    <p class="status" id="pdfStatus" role="status"></p>
    ${TEACHER?"":`<div class="qrbox"><div id="resQR"></div><p>老師用手機掃描，就能看到作答並下載 PDF</p></div>`}
    <details class="nav"${TEACHER?" open":""}><summary>看作答紀錄（PDF 內容）</summary><div class="sheetprev" id="sheetPrev"></div></details>
  </section>`;
  if(!TEACHER){ say1("已經交卷，請把作答紀錄交給老師。"); drawQR($("resQR"),SITE_URL+"#"+encodeRes(),260);
    $("reviewBtn").onclick=()=>{ st.t1=null; save(); go(st.i); }; }
  else $("leaveBtn").onclick=()=>{ try{history.replaceState(null,"",location.pathname+location.search);}catch(e){} location.hash=""; leaveTeacher(); };
  buildPDF().then(ok=>{ const b=$("pdfBtn"); if(!b)return;
    if(ok){ b.disabled=false; b.textContent="下載作答 PDF 給老師"; b.onclick=downloadPDF; }
    else { b.textContent="PDF 製作失敗"; $("pdfStatus").className="status bad"; $("pdfStatus").textContent="PDF 沒有做出來。請老師打開下方「看作答紀錄」直接批改，或重新整理頁面再試一次。"; renderSheetFallback(); } });
}

/* ---------- answer sheet (PDF) ---------- */
function valText(it,v){ if(v==null||v==="")return null; const s=SECS[it.si];
  if(it.t==="tf") return symOf(it)[v]; if(it.t==="choice") return NUM[v]+"　"+it.o[v];
  if(it.t==="text"||it.t==="fill") return showVal(it,v);
  if(it.t==="paper") return "寫在答案紙";
  if(it.t==="match"&&it.multi) return ansStr(v).split("").map(d=>{const b=s.groups[it.g].bank[+d]; return b[0]+" "+b[1];}).join("、");
  if(it.t==="match"){ const b=s.groups[it.g].bank[v]; return b[0]+"　"+b[1]; }
  return ansStr(v)?"勾 "+ckTxt(v):null; }
const stuText=it=>valText(it,st.ans[it.id]);
const keyText=it=>valText(it,it.a);
function score(it){ if(!isDone(it))return 0; const s=SECS[it.si];
  if(it.t==="check"){ const v=ansStr(st.ans[it.id]); let n=0; for(let k=0;k<it.o.length;k++) if(v.includes(k)===it.a.includes(k)) n++; return n*s.per; }
  if(it.t==="paper") return 0;
  if(it.t==="text"||it.kind==="text"||it.kind==="num"||it.kind==="pick"){ const v=String(st.ans[it.id]).replace(/[\s（）()]/g,"").replace(/[xX*＊](?=\d)/g,"×").toUpperCase().replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-65248)).replace(/．/g,".");
    const acc=it.acc||[it.a]; if(acc.includes(v))return s.per;
    if(/^\d*\.?\d+$/.test(v)&&acc.some(x=>/^\d*\.?\d+$/.test(x)&&parseFloat(x)===parseFloat(v)))return s.per; return 0; }
  return String(st.ans[it.id])===String(it.a)?s.per:0; }
const maxOf=it=>it.t==="check"?it.o.length*SECS[it.si].per:SECS[it.si].per;
function fmt(t){ if(!t)return "—"; const d=new Date(t), p=x=>String(x).padStart(2,"0"); return `${d.getFullYear()}/${p(d.getMonth()+1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; }
function sheetBlocks(){
  const mins=st.t0&&st.t1?Math.max(1,Math.round((st.t1-st.t0)/60000)):null;
  const B=[];
  B.push(`<div><div><h2>115 學年度第一學期 期中學業評量　五年級數學科</h2><p class="sub">作答紀錄（報讀版・學生平板作答；畫圖題、應用題寫在答案紙）</p></div>
    <div class="who"><span>五年 ＿＿ 班</span><span>姓名 <b>　　　　　</b></span></div>
    <div class="who" style="font-size:12.5px;font-weight:500"><span>交卷時間：${fmt(st.t1)}</span><span>作答時間：約 ${mins??"—"} 分鐘</span><span>已作答：${answered()} / ${ITEMS.length} 題</span></div></div>`);
  let auto=0, autoMax=0;
  const rows=SECS.map(s=>{
    if(s.type==="paper") return `<tr><td>${s.no}、${M(s.zh)}（寫在答案紙）</td><td class="c">${s.pct}</td><td class="c">請老師批改答案紙</td><td class="c">______ 分</td></tr>`;
    autoMax+=s.pct; const p=s.items.reduce((t,it)=>t+score(it),0); auto+=p;
    const n=s.items.some(it=>it.t==="check")?null:s.items.filter(it=>score(it)>0).length;
    return `<tr><td>${s.no}、${M(s.zh)}</td><td class="c">${s.pct}</td><td class="c">${n==null?"":`對 ${n} / ${s.items.length} ${s.type==="fill"?"格":"題"}　`}<b>${p}</b> 分</td><td class="c">______ 分</td></tr>`; }).join("");
  B.push(`<div><h3>成績</h3><table><tr><th>大題</th><th style="width:60px">配分</th><th>電腦批改</th><th style="width:120px">老師確認得分</th></tr>${rows}
    <tr class="tot"><td>合計</td><td class="c">100</td><td class="c">電腦批改 <b>${auto}</b> / ${autoMax} 分；老師批改 ______ / ${100-autoMax} 分</td><td class="c">總分 ______</td></tr></table>
    <p class="ctx" style="margin:6px 0 0">電腦批改依參考答案計分，請老師對照學校答案卷確認。</p></div>`);
  SECS.forEach(s=>{
    if(s.type==="paper"){
      const head=`<tr><th style="width:56px">題號</th><th>題目</th><th style="width:260px">參考答案（做法僅供參考）</th><th style="width:64px">得分</th></tr>`;
      let lastG=-1;
      const body=s.items.map(it=>{ let pre="";
        if(it.g!=null&&it.g!==lastG){ lastG=it.g; const g=s.groups[it.g]; pre=`<tr><td colspan="4" class="ctx" style="background:#F6F7F9"><b>${esc(g.title)}</b>　${M(g.ctx)}</td></tr>`; }
        return pre+`<tr><td class="c"><b>${esc(it.lab)}</b></td><td class="ctx">${M(it.stem)}<br><span style="color:#111;font-weight:700">${isDone(it)?"✓ 學生已在答案紙作答":"（未按完成）"}</span></td><td class="keyl">${it.key.map(k=>M(k)).join("<br>")}</td><td class="c"><span style="color:#999">___ / ${it.pts}</span></td></tr>`; }).join("");
      B.push(`<div><h3>${s.no}、${M(s.zh)}（${s.pct} 分，寫在答案紙上）</h3><table>${head}${body}</table></div>`); return; }
    const head=`<tr><th style="width:56px">題號</th><th>題目／學生作答</th><th style="width:150px">參考答案</th><th style="width:60px">批改</th></tr>`;
    let lastG=-1;
    const body=s.items.map(it=>{ const t=stuText(it); let pre="";
      if(it.t==="fill"&&it.g!==lastG){ lastG=it.g; pre=`<tr><td colspan="4" class="ctx" style="background:#F6F7F9"><b>${esc(s.groups[it.g].title)}</b>　${M(s.groups[it.g].line,k=>{const x=s.items.find(y=>y.k===k); return `（${x.bl||"　"}）`;})}</td></tr>`; }
      if(it.t==="match"&&it.g!==lastG){ lastG=it.g; const g=s.groups[it.g];
        pre=`<tr><td colspan="4" class="ctx" style="background:#F6F7F9"><b>${esc(g.title)}</b>　${M(g.ctx)}<br>代號：${g.bank.map(b=>b[0]+" "+esc(b[1])).join("、")}</td></tr>`; }
      const ansCell = t==null ? `<span class="no">（未作答）</span>` : `<span style="color:#C2410C;font-weight:900">學生作答：</span><b>${M(t)}</b>`;
      if(it.g!=null&&s.groups&&it.t!=="match"&&it.t!=="fill"&&it.gj===0){ const g=s.groups[it.g]; pre+=`<tr><td colspan="4" class="ctx" style="background:#F6F7F9"><b>${esc(g.title)}</b>　${g.readEach===false?"（文章略）":M(g.ctx)}</td></tr>`; }
      const ctx = it.t==="check" ? M(it.stem)+"<br>"+it.o.map((o,k)=>CIR[k]+esc(o)).join("<br>") : it.t==="fill" ? "括號"+(it.bl||"") : M(it.stem);
      const mark = it.t==="check" ? `<b>${score(it)}</b> / ${maxOf(it)}` : (score(it)>0?'<span class="ok">○</span>':'<span class="no">✕</span>');
      return pre+`<tr><td class="c"><b>${esc(it.lab)}</b></td><td><div class="ctx">${ctx}</div>${ansCell}</td><td>${M(keyText(it))}</td><td class="c">${mark}</td></tr>`; }).join("");
    B.push(`<div><h3>${s.no}、${M(s.zh)}（${s.perNote||"每題 "+s.per+" 分"}）</h3><table>${head}${body}</table></div>`);
  });
  return B;
}
function layoutPages(){
  const host=$("report"); host.innerHTML=""; const blocks=sheetBlocks(); const out=[];
  let pg=null; const newPage=()=>{ pg=document.createElement("div"); pg.className="pg"; host.appendChild(pg); out.push(pg); };
  newPage();
  blocks.forEach(html=>{ const d=document.createElement("div"); d.innerHTML=html; const blk=d.firstElementChild;
    pg.appendChild(blk);
    if(pg.scrollHeight>1123 && pg.children.length>1){ pg.removeChild(blk);
      const tb=blk.querySelector("table");
      if(tb&&tb.rows.length>3){
        const h3=blk.querySelector("h3"), rows=[...tb.rows], hd=rows.shift();
        let cur=null; const start=(first)=>{ const b=document.createElement("div"); if(first&&h3)b.appendChild(h3.cloneNode(true)); const t=document.createElement("table"); t.appendChild(hd.cloneNode(true)); b.appendChild(t); pg.appendChild(b); cur=t; };
        start(true);
        rows.forEach(r=>{ cur.appendChild(r); if(pg.scrollHeight>1123&&cur.rows.length>2){ cur.removeChild(r); newPage(); start(false); cur.appendChild(r);} });
      } else { newPage(); pg.appendChild(blk); } } });
  out.forEach((p,i)=>{ const f=document.createElement("div"); f.className="foot"; f.textContent=`第 ${i+1} / ${out.length} 頁`; p.appendChild(f); });
  return out;
}
async function buildPDF(){
  try{
    if(!window.html2canvas||!window.jspdf) return false;
    try{ await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,3000))]); }catch(e){}
    pages=layoutPages();
    const doc=new window.jspdf.jsPDF({unit:"pt",format:"a4",compress:true}); const prev=$("sheetPrev");
    for(let i=0;i<pages.length;i++){
      const c=await html2canvas(pages[i],{scale:2,backgroundColor:"#FFFFFF",useCORS:true,logging:false});
      const url=c.toDataURL("image/jpeg",0.9);
      if(i)doc.addPage(); doc.addImage(url,"JPEG",0,0,595.28,841.89);
      if(prev){ const im=new Image(); im.src=url; im.alt=`作答紀錄第 ${i+1} 頁`; prev.appendChild(im); }
    }
    pdfBlob=doc.output("blob"); return true;
  }catch(e){ console.error(e); return false; }
}
function renderSheetFallback(){ const prev=$("sheetPrev"); if(!prev)return; prev.innerHTML=""; layoutPages().forEach(p=>{ const c=p.cloneNode(true); c.style.height="auto"; const w=document.createElement("div"); w.style.overflowX="auto"; w.appendChild(c); prev.appendChild(w); }); }
async function downloadPDF(){
  const s=$("pdfStatus"); s.className="status"; s.textContent="";
  const fname="五上數學期中評量.pdf";
  try{
    const file=new File([pdfBlob],fname,{type:"application/pdf"});
    if(navigator.canShare&&navigator.canShare({files:[file]})&&/iPad|iPhone|Android/i.test(navigator.userAgent)){
      try{ await navigator.share({files:[file],title:fname}); s.className="status ok"; s.textContent="已送出："+fname; return; }catch(e){ if(e&&e.name==="AbortError"){ s.textContent="沒有下載。想下載時再按一次按鈕。"; return; } }
    }
    const url=URL.createObjectURL(pdfBlob), a=document.createElement("a"); a.href=url; a.download=fname; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000); s.className="status ok"; s.textContent="已下載："+fname+"，請交給老師。"; return;
  }catch(e){ s.className="status bad"; s.textContent="這個畫面不能下載檔案。請老師打開下方「看作答紀錄」直接批改。"; }
}

let saved=null;
function checkHash(){ const h=(location.hash||"").slice(1); const r=decodeRes(h);
  if(r){ if(!TEACHER){ saved=st; } TEACHER=true; st=Object.assign({},saved||st,{ans:r.ans,t0:r.t0,t1:r.t1,i:0}); stopSpeak(); show("done"); return true; }
  return false; }
function leaveTeacher(){ if(!TEACHER)return; TEACHER=false; if(saved)st=saved; saved=null; show(st.t1?"done":"home"); }
window.addEventListener("hashchange",()=>{ if(!checkHash()) leaveTeacher(); });
applySettings();
if(!checkHash()) show(st.t1?"done":"home");
