const DATA=/*DATA*/;
const SECS=DATA.secs, AUD=DATA.aud, NUM="1234", CIR="①②③④", TF=["○","✕"], TFW=["對","錯"];
const ITEMS=[];
SECS.forEach((s,si)=>s.items.forEach((it,ii)=>{it.id=s.id+"_"+ii; it.si=si; it.ii=ii; it.t=it.t||s.type; ITEMS.push(it);}));
ITEMS.forEach(it=>{ if(it.g!=null){ it.gj=ITEMS.filter(x=>x.si===it.si&&x.g===it.g).indexOf(it); } });
const $=id=>document.getElementById(id);
const esc=t=>String(t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const SPK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9a4 4 0 0 1 0 6"/><path d="M18.5 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
const TICK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"/></svg>';
const FS=[20,24,28,32], RATES=[["慢",0.8],["正常",1],["快",1.2]];
const KEY="sci6-midterm-1151-pub";
let st={ans:{},i:0,fs:1,hc:false,rate:1,t0:null,t1:null};
try{const x=JSON.parse(localStorage.getItem(KEY)||"null"); if(x&&typeof x==="object")st=Object.assign(st,x);}catch(e){}
const SITE_URL="https://liniris1023.github.io/sped-exam-reader/sci6-midterm/";
let TEACHER=false;
function save(){ if(TEACHER)return; try{localStorage.setItem(KEY,JSON.stringify(st));}catch(e){} }

/* 標記 → HTML：~字~ 底線、□ 方框、換行 */
function M(t){ let h=esc(t).replace(/~([^~]+)~/g,'<u class="em">$1</u>');
  return h.replace(/□/g,'<span class="sq"></span>').replace(/\n/g,"<br>"); }
const ansStr=v=>v==null?"":String(v);

/* result code for the teacher's QR */
function encodeRes0(){ const a=ITEMS.map(it=>{const v=st.ans[it.id]; if(v==null||v==="")return "x"; if(it.t==="text") return "t"+[...String(v)].map(c=>c.codePointAt(0).toString(36)).join("_"); return String(v);}).join(".");
  const mins=st.t0&&st.t1?Math.max(1,Math.round((st.t1-st.t0)/60000)):0;
  return "r-"+a+"-"+Math.floor((st.t1||Date.now())/60000).toString(36)+"-"+mins.toString(36); }
function decodeRes0(h){ const m=/^r-([0-9a-z_.]+)-([0-9a-z]+)-([0-9a-z]+)$/.exec(h); if(!m)return null; const parts=m[1].split(".");
  if(parts.length!==ITEMS.length)return null;
  const ans={}; ITEMS.forEach((it,i)=>{ const c=parts[i]; if(c==="x")return; if(it.t==="text"&&c[0]==="t"){ ans[it.id]=c.slice(1).split("_").map(x=>String.fromCodePoint(parseInt(x,36))).join(""); return; }
    ans[it.id]=(it.t==="check"||it.multi)?c:+c; });
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
function show(v){ view=v; $("bar").hidden = v!=="q"; ({home:renderHome,q:renderQ,check:renderCheck,done:renderDone})[v](); setProgress(); if(v!=="q")window.scrollTo(0,0); }
const symOf=it=>it.sym||SECS[it.si].sym||TF;
const mTxt=(it,v)=>ansStr(v).split("").map(d=>SECS[it.si].groups[it.g].bank[+d][0]).join("、");
const ckTxt=v=>ansStr(v).split("").map(d=>CIR[+d]).join("");

/* ---------- home ---------- */
function renderHome(){
  const started=answered()>0||st.t0;
  $("main").innerHTML=`<section class="screen">
    <p class="eyebrow">115 學年度第一學期　期中學業評量</p>
    <h1>六年級 自然科<br>報讀作答</h1>
    <div class="facts"><span class="fact">${SECS.length} 大題</span><span class="fact">${ITEMS.length} 小題</span><span class="fact">滿分 100 分</span><span class="fact">全部在平板上作答</span></div>
    <p style="margin:0;font-size:1.6rem;font-weight:900">六年級　自然科</p>
    ${nameHTML()}
    <div class="row">
      <button class="big" id="startBtn" type="button" style="font-size:1.8rem;min-height:5.5rem;padding-inline:2.4rem">${started?"繼續作答":"開始作答"}</button>
      ${started?'<button class="ghost" id="resetBtn" type="button">清除答案，重新作答</button>':""}
    </div>
    <ol class="help">
      <li>按 <b>藍色喇叭</b> 聽題目，可以一直重聽。</li>
      <li>是非題：對的按 <b>○</b>，錯的按 <b>✕</b>；打✓／╳ 的題目：對的按 <b>✓</b>，錯的按 <b>╳</b>。</li>
      <li>選擇題、配合題：點大按鈕選答案。勾選題：對的都要勾，可以勾很多個。</li>
      <li>有圖片的題目，點圖片可以放大。配合題的圖片也可以點一下放大。</li>
      <li>寫完按「交卷」，作答紀錄會自動上傳給老師。</li>
    </ol>
    <div id="resetBox"></div>
    <div class="qrbox"><div id="homeQR"></div><p>掃描 QR Code 打開這個報讀網站</p></div>
  </section>`;
  drawQR($("homeQR"),SITE_URL,220);
  wireName();
  $("startBtn").onclick=()=>{ if(!takeName())return; if(!st.t0){st.t0=Date.now();save();} show(st.t1?"done":"q"); window.scrollTo(0,0);};
  if($("resetBtn")) $("resetBtn").onclick=()=>{ $("resetBox").innerHTML=`<div class="warnbox"><p>確定要清除全部答案嗎？清除後不能復原。</p>
      <div class="row"><button class="big" id="yesReset" type="button" style="background:var(--bad);color:#fff">確定清除</button><button class="ghost" id="noReset" type="button">不要清除</button></div></div>`;
    $("noReset").onclick=()=>{$("resetBox").innerHTML="";};
    $("yesReset").onclick=()=>{ st.ans={}; st.i=0; st.t0=null; st.t1=null; st.name=""; st.up=null; save(); renderHome(); setProgress(); }; };
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
  const G=(it.g!=null&&s.groups)?s.groups[it.g]:null;
  if(G){
    h+=`<div class="passage"><div class="ptop ctxtop"><b>${esc(G.title)}</b><button class="speaker pill ctxspk" id="ctxSpk" type="button" aria-label="${G.readEach===false?"聽文章":"聽說明"}">${SPK}${G.readEach===false?"聽文章":"聽說明"}</button></div><p class="ctxp${G.readEach===false?" longp":""}" id="ctx">${M(G.ctx)}</p>${G.img?`<figure class="mfig gfig"><img class="zoomable" src="img/${G.img}.png" alt="${esc(G.alt)}"><figcaption>點圖片可以放大</figcaption></figure>`:""}</div>`;
  }
  h+=`<div class="card"><div class="qhead"><span class="qnum">${esc(it.lab)}</span><button class="speaker pill" id="stemSpk" type="button" aria-label="唸題目">${SPK}唸題目</button></div>`;
  if(it.t==="tf"){
    h+=`<p class="stem" id="stem">${M(it.stem)}</p>`;
    h+=`<div class="picks tfs" role="radiogroup" aria-label="對或錯">${symOf(it).map((c,k)=>`<button type="button" role="radio" aria-checked="${a===k}" data-tf="${k}" aria-label="${TFW[k]}"><span class="sym">${c}</span><span class="w">${TFW[k]}</span></button>`).join("")}</div>`;
  } else if(it.t==="choice"){
    h+=`<p class="stem" id="stem">${M(it.stem)}</p>`;
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
  } else {
    const on=ansStr(a);
    h+=`<p class="stem" id="stem">${M(it.stem)}</p>`;
    h+=`<div class="opts" aria-label="可以勾很多個">`+it.o.map((o,k)=>`<div class="opt"><button class="optbtn ckbtn" type="button" role="checkbox" aria-checked="${on.includes(k)}" data-ck="${k}"><span class="box ckbox">${TICK}</span><span><b class="cno">${CIR[k]}</b> ${M(o)}</span></button><button class="speaker" type="button" data-s="${k}" aria-label="唸選項 ${k+1}">${SPK}</button></div>`).join("")+`</div>`;
    h+=`<div class="padshow"><span class="val${on?"":" empty"}" id="val">${on?"勾了 "+ckTxt(on):"點一下打勾，再點一次取消"}</span><button class="speaker pill" id="mySpk" type="button">${SPK}唸我勾的</button></div>`;
  }
  h+=`</div>`;
  h+=`<details class="nav" id="navd"><summary>全部題目（點題號可跳題）</summary>`+SECS.map(sx=>`<div class="navsec"><b>${sx.no}、${M(sx.zh)}</b><div class="grid">${sx.items.map(x=>{const n=ITEMS.indexOf(x);return `<button type="button" data-go="${n}" class="${isDone(x)?"done":""}" aria-current="${n===st.i}"${n>reach()?" disabled":""}>${esc(x.lab)}</button>`;}).join("")}</div></div>`).join("")+`</details>`;
  h+=`</section>`;
  const navOpen=$("navd")&&$("navd").open;
  $("main").innerHTML=h; if(navOpen)$("navd").open=true;
  // wire
  $("secSpk").onclick=()=>speak([{segs:s.introSay}]);
  const readStem=(auto)=>{ const parts=[{segs:it.stemSay,el:$("stem")}];
    if(G&&((G.readEach!==false&&!G.once)||(auto&&it.gj===0))) parts.unshift({segs:G.ctxSay,el:$("ctx")});
    if(it.t==="match"){ const bs=[...document.querySelectorAll("[data-m]")]; G.bankSay.forEach((seg,k)=>parts.push({segs:[seg],el:bs[k]})); }
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
  if($("txtin")){ const ti=$("txtin"); ti.oninput=()=>{ const v=ti.value; if(v.trim()==="") delete st.ans[it.id]; else st.ans[it.id]=v.trim(); if(st.t1)st.t1=null; save(); $("nextBtn").classList.toggle("locked",!isDone(it)); setProgress(); }; }
  document.querySelectorAll("[data-s]").forEach(b=>b.onclick=()=>{const k=+b.dataset.s; speak([{segs:it.optSay[k],el:b.previousElementSibling}]);});
  document.querySelectorAll("[data-ck]").forEach(b=>b.onclick=()=>{ const d=b.dataset.ck; let v=ansStr(st.ans[it.id]); const had=v.includes(d);
    v=had?v.replace(d,""):v+d; v=v.split("").sort().join(""); setAns(v); say1((had?"取消":"勾了")+(+d+1)+"號"); });
  if($("mySpk")&&it.t==="text") $("mySpk").onclick=()=>{ const v=ansStr(st.ans[it.id]); if(!v){ say1("你還沒有寫"); return; } speak([{segs:[["zh","你寫的是"],["zh",v]],el:$("txtin")}]); };
  else if($("mySpk")&&it.t==="match") $("mySpk").onclick=()=>{ const v=ansStr(st.ans[it.id]); if(!v){ say1("你還沒有選"); return; } speak([{segs:[["zh","你選了"],...v.split("").map(d=>G.bankSay[+d])],el:$("stem")}]); };
  else if($("mySpk")) $("mySpk").onclick=()=>{ const v=ansStr(st.ans[it.id]); if(!v){ say1("你還沒有勾"); return; }
    speak([{segs:[["zh","你勾了"],...v.split("").map(d=>["zh",(+d+1)+"號"])],el:$("val")}]); };
  document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>go(+b.dataset.go));
  document.querySelectorAll(".zoomable").forEach(im=>im.onclick=()=>zoom(im.src,im.alt));
  // bottom bar
  $("prevBtn").disabled=st.i===0;
  $("nextBtn").classList.toggle("locked",!isDone(it));
  const last=st.i===ITEMS.length-1; $("nextBtn").textContent=last?"檢查並交卷 →":"下一題 →"; $("nextBtn").classList.toggle("finish",last);
  prefetch([...it.stemSay,...(it.optSay||[]).flat(),...s.introSay,...(G?G.ctxSay:[]),...(it.t==="match"?G.bankSay:[])]);
  setProgress();
  if(keepScroll) window.scrollTo(0,y); else { window.scrollTo(0,0); readStem(true); } /* 換到新題目就自動唸 */
}
function zoom(src,alt){ const d=document.createElement("div"); d.className="zoom"; d.innerHTML=`<img src="${src}" alt="${esc(alt)}"><button type="button">關閉 ✕</button>`;
  d.onclick=()=>d.remove(); document.body.appendChild(d); d.querySelector("button").focus(); }
function setAns(v){ const it=ITEMS[st.i]; if(v===""||v==null) delete st.ans[it.id]; else st.ans[it.id]=v; if(st.t1)st.t1=null; save(); renderQ(true); }
function pick(k,msg){ const it=ITEMS[st.i]; st.ans[it.id]=k; if(st.t1)st.t1=null; save(); renderQ(true); say1(msg); }
function reach(){ const n=ITEMS.findIndex(x=>!isDone(x)); return n<0?ITEMS.length-1:n; }
function go(n){ stopSpeak(); st.i=Math.max(0,Math.min(ITEMS.length-1,n)); save(); show("q"); }
$("prevBtn").onclick=()=>go(st.i-1);
$("nextBtn").onclick=()=>{ const it=ITEMS[st.i];
  if(!isDone(it)){ say1(it.t==="check"?"請先勾選答案，才能到下一題。":it.t==="text"?"請先寫好答案，才能到下一題。":"請先選一個答案，才能到下一題。"); const b=$("nextBtn"); b.classList.remove("shake"); void b.offsetWidth; b.classList.add("shake"); return; }
  if(st.i===ITEMS.length-1){stopSpeak(); show("check");} else go(st.i+1); };
document.addEventListener("keydown",e=>{ if(view!=="q"||/INPUT|TEXTAREA/.test(document.activeElement.tagName))return;
  if(e.key==="ArrowRight")$("nextBtn").click(); if(e.key==="ArrowLeft"&&st.i>0)go(st.i-1); });

/* ---------- check & submit ---------- */
function renderCheck(){
  const miss=ITEMS.filter(it=>!isDone(it));
  $("main").innerHTML=`<section class="screen">
    <h1>檢查一下</h1>
    ${miss.length?`<div class="warnbox"><p>還有 ${miss.length} 題沒有寫：</p><div class="miss">${miss.map(it=>`<button type="button" data-go="${ITEMS.indexOf(it)}">${SECS[it.si].no}-${esc(it.lab)}</button>`).join("")}</div></div>`
      :`<p style="margin:0;font-weight:900;font-size:1.3rem;color:var(--ok)">全部 ${ITEMS.length} 題都寫完了！</p>`}
    <div class="row">
      <button class="big" id="submitBtn" type="button" style="background:var(--stu);color:var(--stu-fg)"${miss.length?" disabled":""}>${miss.length?"寫完才能交卷":"交卷"}</button>
      <button class="ghost" id="backBtn" type="button">回去檢查題目</button>
    </div></section>`;
  say1(miss.length?"還有題目沒寫，要回去檢查嗎？":"全部寫完了，可以交卷。");
  document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>go(+b.dataset.go));
  $("backBtn").onclick=()=>go(st.i);
  $("submitBtn").onclick=()=>{ if(ITEMS.some(it=>!isDone(it)))return; st.t1=Date.now(); save(); show("done"); };
}
function renderDone(){
  $("main").innerHTML=`<section class="screen">
    <div class="done-mark" aria-hidden="true">✓</div>
    <h1>${TEACHER?"老師批改：作答紀錄":"交卷完成"}</h1>
    <p class="donename">姓名：${esc(st.name||"（沒有填）")}</p>
    <p style="margin:0;font-weight:700">六年級　已答 ${answered()} / ${ITEMS.length} 題　交卷 ${fmt(st.t1)}</p>
    <div class="row"><button class="big" id="pdf_brief" type="button" disabled>簡要版 PDF 製作中…</button><button class="big" id="pdf_full" type="button" disabled>精細版 PDF 製作中…</button>
      ${TEACHER?'<button class="ghost" id="leaveBtn" type="button">離開批改畫面</button>':'<button class="ghost" id="reviewBtn" type="button">回去修改答案</button>'}</div>
    <p class="status" id="pdfStatus" role="status"></p>
    ${TEACHER?"":'<p class="status" id="cloudStatus" role="status"></p><div class="row" id="cloudRow"></div>'}
    ${TEACHER?"":`<div class="qrbox"><div id="resQR"></div><p>老師用手機掃描，就能看到作答並下載 PDF</p></div>`}
    <p class="pdfnote" style="margin:0;font-size:.95rem;line-height:1.6"><b>簡要版</b>：分數＋每題對錯一覽，答錯的題目標紅色並附參考答案（約 1–2 頁）。<br><b>精細版</b>：每一題的題目、學生作答、參考答案與批改，適合存檔或檢討。</p>
    <details class="nav"${TEACHER?" open":""}><summary>看簡要版（分數＋對錯一覽）</summary><div class="sheetprev" id="prev_brief"></div></details>
    <details class="nav"><summary>看精細版（每題題目與作答）</summary><div class="sheetprev" id="prev_full"></div></details>
  </section>`;
  if(!TEACHER){ say1("已經交卷，請把作答紀錄交給老師。"); drawQR($("resQR"),SITE_URL+"#"+encodeRes(),260);
    $("reviewBtn").onclick=()=>{ st.t1=null; save(); go(st.i); }; }
  else $("leaveBtn").onclick=()=>{ try{history.replaceState(null,"",location.pathname+location.search);}catch(e){} location.hash=""; leaveTeacher(); };
  makePDFs();
}

/* ---------- answer sheet (PDF) ---------- */
function valText(it,v){ if(v==null||v==="")return null; const s=SECS[it.si];
  if(it.t==="tf") return symOf(it)[v]; if(it.t==="choice") return NUM[v]+"　"+it.o[v];
  if(it.t==="text") return String(v);
  if(it.t==="match"&&it.multi) return ansStr(v).split("").map(d=>{const b=s.groups[it.g].bank[+d]; return b[0]+" "+b[1];}).join("、");
  if(it.t==="match"){ const b=s.groups[it.g].bank[v]; return b[0]+"　"+b[1]; }
  return ansStr(v)?"勾 "+ckTxt(v):null; }
const stuText=it=>valText(it,st.ans[it.id]);
const keyText=it=>valText(it,it.a);
function score(it){ if(!isDone(it))return 0; const s=SECS[it.si];
  if(it.t==="check"){ const v=ansStr(st.ans[it.id]); let n=0; for(let k=0;k<it.o.length;k++) if(v.includes(k)===it.a.includes(k)) n++; return n*s.per; }
  if(it.t==="text"){ const v=String(st.ans[it.id]).replace(/[\s（）()、，,／/。]/g,""); return (it.acc||[it.a]).includes(v)?s.per:0; }
  return String(st.ans[it.id])===String(it.a)?s.per:0; }
const maxOf=it=>it.t==="check"?it.o.length*SECS[it.si].per:SECS[it.si].per;
function fmt(t){ if(!t)return "—"; const d=new Date(t), p=x=>String(x).padStart(2,"0"); return `${d.getFullYear()}/${p(d.getMonth()+1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; }
function shortAns(it,v){ if(v==null||v==="")return null; const s=SECS[it.si];
  if(it.t==="tf") return SECS[it.si].sym?["✓","✗"][v]:["◯","✕"][v]; if(it.t==="choice") return it.o.length<=2?it.o[v]:CIR[v];
  if(it.t==="text") return String(v); if(it.t==="match"&&it.multi) return mTxt(it,v);
  if(it.t==="match"){ const b=s.groups[it.g].bank[v]; return /^[0-9]$/.test(b[0])?b[0]+" "+b[1]:b[0]; }
  return ansStr(v)?ansStr(v).split("").map(d=>CIR[+d]).join("、"):null; }
function _oldBrief(){
  const mins=st.t0&&st.t1?Math.max(1,Math.round((st.t1-st.t0)/60000)):null;
  const B=[]; let auto=0; SECS.forEach(s=>s.items.forEach(it=>auto+=score(it)));
  const RED="#D11A1A";
  B.push(`<div><h2>115 學年度第一學期 期中學業評量　六年級自然科　作答結果</h2>
    <div class="who" style="margin-top:8px"><span>六年 ＿＿ 班</span><span>交卷：${fmt(st.t1)}</span><span>作答時間：約 ${mins??"—"} 分鐘</span></div>
    <div style="display:flex;justify-content:center;align-items:baseline;gap:10px;margin-top:10px"><span style="font-size:18px;font-weight:900">分數</span><span style="font-size:46px;font-weight:900;line-height:1">${auto}</span><span style="font-size:18px;font-weight:700">/ 100</span></div>
    <div style="display:flex;justify-content:center;gap:16px;flex-wrap:wrap;font-size:14px;font-weight:700;margin-top:6px">${SECS.map(s=>`<span>${s.no}、${s.zh} ${s.items.reduce((t,it)=>t+score(it),0)}/${s.pct}</span>`).join("")}</div>
    <p style="margin:6px 0 0;text-align:center;font-size:12.5px">黑字＝答對　<b style="color:${RED}">紅字＝答錯（→後面是正確答案）</b>　打✓✗題每格分開計分</p></div>`);
  SECS.forEach(s=>{
    const cells=s.items.map(it=>{ const v=shortAns(it,st.ans[it.id]), got=score(it), full=got===maxOf(it);
      const col=full?"#111":RED, bd=full?"#BFC5CC":RED, bg=full?"#FFF":"#FDECEC";
      const key=full?"":`<span style="font-size:14px;font-weight:700;white-space:nowrap">→正確 ${esc(shortAns(it,it.a))}</span>`;
      const pts=it.t==="check"?`<span style="font-size:12px;font-weight:700">${got}/${maxOf(it)}分</span>`:"";
      const w=it.t==="check"?"width:100%":"min-width:118px", big="19px";
      return `<div style="${w};box-sizing:border-box;border:2px solid ${bd};background:${bg};color:${col};border-radius:6px;padding:4px 8px;display:flex;align-items:center;gap:8px;font-weight:900">
        <span style="font-size:13px;min-width:34px">${esc(it.lab)}</span><span style="font-size:${v==null?"17px":big};white-space:nowrap">${v==null?"未答":esc(v)}</span>${key}${pts}</div>`; }).join("");
    B.push(`<div><h3>${s.no}、${s.zh}（${s.perNote||"每題 "+s.per+" 分"}）</h3><div style="display:flex;flex-wrap:wrap;gap:6px">${cells}</div></div>`);
  });
  return B;
}
function sheetBlocks(){
  const mins=st.t0&&st.t1?Math.max(1,Math.round((st.t1-st.t0)/60000)):null;
  const B=[];
  B.push(`<div><div><h2>115 學年度第一學期 期中學業評量　六年級自然科</h2><p class="sub">作答紀錄（精細版・報讀版・學生平板作答）</p></div>
    <div class="who"><span>六年 ＿＿ 班</span><span>姓名 <b>${esc(st.name||"　　　　　")}</b></span></div>
    <div class="who" style="font-size:12.5px;font-weight:500"><span>交卷時間：${fmt(st.t1)}</span><span>作答時間：約 ${mins??"—"} 分鐘</span><span>已作答：${answered()} / ${ITEMS.length} 題</span></div></div>`);
  let auto=0;
  const rows=SECS.map(s=>{ const p=s.items.reduce((t,it)=>t+score(it),0); auto+=p;
    const n=s.items.some(it=>it.t==="check")?null:s.items.filter(it=>score(it)>0).length;
    return `<tr><td>${s.no}、${M(s.zh)}</td><td class="c">${s.pct}</td><td class="c">${n==null?"":`對 ${n} / ${s.items.length} 題　`}<b>${p}</b> 分</td><td class="c">______ 分</td></tr>`; }).join("");
  B.push(`<div><h3>成績</h3><table><tr><th>大題</th><th style="width:60px">配分</th><th>電腦批改</th><th style="width:120px">老師確認得分</th></tr>${rows}
    <tr class="tot"><td>合計</td><td class="c">100</td><td class="c">電腦批改 <b>${auto}</b> / 100 分</td><td class="c">總分 ______</td></tr></table>
    <p class="ctx" style="margin:6px 0 0">電腦批改依參考答案計分，請老師對照學校答案卷確認。</p></div>`);
  SECS.forEach(s=>{
    const head=`<tr><th style="width:56px">題號</th><th>題目／學生作答</th><th style="width:150px">參考答案</th><th style="width:60px">批改</th></tr>`;
    let lastG=-1;
    const body=s.items.map(it=>{ const t=stuText(it); let pre="";
      if(it.g!=null&&s.groups&&it.g!==lastG){ lastG=it.g; const g=s.groups[it.g];
        pre=`<tr><td colspan="4" class="ctx" style="background:#F6F7F9"><b>${esc(g.title||"")}</b>　${g.readEach===false?"（文章略）":(g.ctx?M(g.ctx):"")}${it.t==="match"&&g.bank?"<br>代號："+g.bank.map(b=>b[0]+" "+esc(b[1])).join("、"):""}</td></tr>`; }
      const ansCell = t==null ? `<span class="no">（未作答）</span>` : `<span style="color:#C2410C;font-weight:900">學生作答：</span><b>${esc(t)}</b>`;
      const ctx = it.t==="check" ? M(it.stem)+"<br>"+it.o.map((o,k)=>CIR[k]+esc(o)).join("<br>") : M(it.stem||"");
      const mark = it.t==="check" ? `<b>${score(it)}</b> / ${maxOf(it)}` : (score(it)>0?'<span class="ok">○</span>':'<span class="no">✕</span>');
      return pre+`<tr><td class="c"><b>${esc(it.lab)}</b></td><td><div class="ctx">${ctx}</div>${ansCell}</td><td>${esc(keyText(it)||"")}</td><td class="c">${mark}</td></tr>`; }).join("");
    B.push(`<div><h3>${s.no}、${M(s.zh)}（${s.perNote||"每題 "+s.per+" 分"}）</h3><table>${head}${body}</table></div>`);
  });
  return B;
}
const BR={title:"115 學年度第一學期 期中學業評量　六年級自然科", cls:"六年 ＿＿ 班", note:"",
  manual:s=>(s.type==="paper"||s.type==="rec")?s.type:null,
  score:it=>score(it), max:it=>maxOf(it), known:it=>it.a!=null&&it.a!=="",
  short:(it,v)=>{ if(v==null||v==="")return null; const s=SECS[it.si];
    if(it.t==="tf") return esc((typeof symOf==="function"?symOf(it):TF)[v]);
    if(it.t==="choice") return esc(it.o.length<=2?it.o[v]:CIR[v]);
    if(it.t==="text"||it.t==="fill") return M(typeof showVal==="function"?showVal(it,v):String(v));
    if(it.t==="match"&&it.multi) return esc(mTxt(it,v));
    if(it.t==="match"){ const b=s.groups[it.g].bank[v]; return esc(/^[0-9]$/.test(b[0])?b[0]+" "+b[1]:b[0]); }
    if(it.t==="check") return esc(ansStr(v)?ansStr(v).split("").map(d=>CIR[+d]).join("、"):"");
    return esc(String(v)); }};
const PDF_BASE="六上自然期中評量";
/* ---------- 老師版：簡要版（分數＋對錯一覽）／精細版（每題題目、作答、參考答案） ---------- */
const _no=s=>typeof NO==="function"?NO(s):s.no+"、";
const PDFMODES={brief:"簡要版",full:"精細版"};
function briefBlocks(){
  const mins=st.t0&&st.t1?Math.max(1,Math.round((st.t1-st.t0)/60000)):null;
  const RED="#D11A1A"; let auto=0, autoMax=0;
  SECS.forEach(s=>{ if(BR.manual(s))return; autoMax+=s.pct; s.items.forEach(it=>auto+=BR.score(it)); });
  const secScore=s=>{ const m=BR.manual(s); if(m==="paper")return "紙本＿＿/"+s.pct; if(m==="rec")return "錄音＿＿/"+s.pct; if(m==="listen")return "聽力＿＿/"+s.pct;
    return s.items.reduce((t,it)=>t+BR.score(it),0)+"/"+s.pct; };
  const B=[];
  B.push(`<div><h2>${BR.title}　作答結果（簡要版）</h2>
    <div class="who" style="margin-top:8px"><span>${BR.cls}</span><span>姓名：<b>${esc(st.name||"＿＿＿＿")}</b></span><span>交卷：${fmt(st.t1)}</span><span>作答時間：約 ${mins??"—"} 分鐘</span><span>已作答：${answered()} / ${ITEMS.length} 題</span></div>
    <div style="display:flex;justify-content:center;align-items:baseline;gap:10px;margin-top:10px"><span style="font-size:18px;font-weight:900">${autoMax<100?"電腦批改":"分數"}</span><span style="font-size:46px;font-weight:900;line-height:1">${auto}</span><span style="font-size:18px;font-weight:700">/ ${autoMax}</span>${autoMax<100?`<span style="font-size:16px;font-weight:700;margin-left:14px">＋老師批改 ＿＿ / ${100-autoMax}　＝ 總分 ＿＿＿</span>`:""}</div>
    <div style="display:flex;justify-content:center;gap:6px 16px;flex-wrap:wrap;font-size:14px;font-weight:700;margin-top:6px">${SECS.map(s=>`<span>${_no(s)}${s.zh} ${secScore(s)}</span>`).join("")}</div>
    <p style="margin:6px 0 0;text-align:center;font-size:12.5px">黑字＝答對　<b style="color:${RED}">紅字＝答錯（→後面是參考答案）</b>　灰框＝請老師批改${BR.note?"　"+BR.note:""}</p></div>`);
  SECS.forEach(s=>{
    const m=BR.manual(s); const head=`<h3>${_no(s)}${s.zh}（${s.perNote||(s.per?"每題 "+s.per+" 分":s.pct+" 分")}）</h3>`;
    if(m==="paper"){
      B.push(`<div>${head}<p style="margin:0;font-size:15px;font-weight:700;display:flex;flex-wrap:wrap;gap:2px 12px"><span>寫在紙上，請老師批改紙本。</span>${s.items.map(it=>`<span style="white-space:nowrap">${esc(it.lab)} ${isDone(it)?"✓":"（未按完成）"}</span>`).join("")}</p></div>`); return; }
    if(m==="rec"){
      B.push(`<div>${head}<table>${s.items.map(it=>{ const t=st.ans[it.id];
        return `<tr><td class="c" style="width:56px"><b>${esc(it.lab)}</b></td><td>${t?`<b style="font-size:15px">${esc(t)}</b>`:'<span class="no">（未作答）</span>'}</td><td class="c" style="width:80px;color:#999">___ / ${it.pts||""}</td></tr>`; }).join("")}</table>
        <p style="margin:4px 0 0;font-size:12px">口說文字由電腦語音辨識產生，請依學生原意批改。</p></div>`); return; }
    const cells=s.items.map(it=>{ const v=BR.short(it,st.ans[it.id]);
      if(m==="listen"||!BR.known(it)) return `<div style="min-width:118px;box-sizing:border-box;border:2px dashed #9AA3AC;background:#F4F5F7;color:#111;border-radius:6px;padding:4px 8px;display:flex;align-items:center;gap:8px;font-weight:900"><span style="font-size:13px;min-width:34px">${esc(it.lab)}</span><span style="font-size:19px;white-space:nowrap">${v==null?"未答":v}</span><span style="font-size:13px;color:#777">○ ✕</span></div>`;
      const got=BR.score(it), full=got===BR.max(it);
      const col=full?"#111":RED, bd=full?"#BFC5CC":RED, bg=full?"#FFF":"#FDECEC";
      const key=full?"":`<span style="font-size:14px;font-weight:700;white-space:nowrap">→${BR.short(it,it.a)}</span>`;
      const pts=it.t==="check"?`<span style="font-size:12px;font-weight:700">${got}/${BR.max(it)}分</span>`:"";
      const w=it.t==="check"?"width:100%":"min-width:118px";
      return `<div style="${w};box-sizing:border-box;border:2px solid ${bd};background:${bg};color:${col};border-radius:6px;padding:4px 8px;display:flex;align-items:center;gap:8px;font-weight:900">
        <span style="font-size:13px;min-width:34px">${esc(it.lab)}</span><span style="font-size:${v==null?"17px":"19px"};white-space:nowrap">${v==null?"未答":v}</span>${key}${pts}</div>`; }).join("");
    B.push(`<div>${head}${m==="listen"?'<p style="margin:0 0 4px;font-size:12.5px">聽力題：學生在平板上的作答，請老師依聽力題本對答案。</p>':""}<div style="display:flex;flex-wrap:wrap;gap:6px">${cells}</div></div>`);
  });
  return B;
}
function layoutPages(mode){
  const host=$("report"); host.innerHTML=""; const blocks=(mode==="brief"?briefBlocks:sheetBlocks)(); const out=[];
  let pg=null; const newPage=()=>{ pg=document.createElement("div"); pg.className="pg"; host.appendChild(pg); out.push(pg); };
  newPage();
  const place=blk=>{ pg.appendChild(blk);
    if(pg.scrollHeight>1123 && pg.children.length>1){ pg.removeChild(blk);
      const tb=blk.querySelector&&blk.querySelector("table");
      if(tb&&tb.rows.length>3){
        const h3=blk.querySelector("h3"), rows=[...tb.rows], hd=rows.shift();
        let cur=null; const start=(first)=>{ const b=document.createElement("div"); if(first&&h3)b.appendChild(h3.cloneNode(true)); const t=document.createElement("table"); t.appendChild(hd.cloneNode(true)); b.appendChild(t); pg.appendChild(b); cur=t; };
        start(true);
        rows.forEach(r=>{ cur.appendChild(r); if(pg.scrollHeight>1123&&cur.rows.length>2){ cur.removeChild(r); newPage(); start(false); cur.appendChild(r);} });
      } else { newPage(); pg.appendChild(blk); } } };
  blocks.forEach(html=>{ const d=document.createElement("div"); d.innerHTML=html; [...d.children].forEach(place); });
  out.forEach((p,i)=>{ const f=document.createElement("div"); f.className="foot"; f.textContent=`${PDFMODES[mode]}　第 ${i+1} / ${out.length} 頁`; p.appendChild(f); });
  return out;
}
let pdfBlobs={};
async function buildPDF(mode){
  try{
    if(!window.html2canvas||!window.jspdf) return false;
    try{ await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,3000))]); }catch(e){}
    const pages=layoutPages(mode);
    await Promise.all([...$("report").querySelectorAll("img")].map(im=>im.complete?0:new Promise(r=>{im.onload=im.onerror=r;})));
    const doc=new window.jspdf.jsPDF({unit:"pt",format:"a4",compress:true}); const prev=$("prev_"+mode);
    for(let i=0;i<pages.length;i++){
      const c=await html2canvas(pages[i],{scale:2,backgroundColor:"#FFFFFF",useCORS:true,logging:false});
      const url=c.toDataURL("image/jpeg",0.9);
      if(i)doc.addPage(); doc.addImage(url,"JPEG",0,0,595.28,841.89);
      if(prev){ const im=new Image(); im.src=url; im.alt=`${PDFMODES[mode]}第 ${i+1} 頁`; prev.appendChild(im); }
    }
    pdfBlobs[mode]=doc.output("blob"); return true;
  }catch(e){ console.error(e); return false; }
}
/* ---------- 姓名＋雲端上傳（共用 ../cloud.js） ---------- */
const IS_TEST=/-test$/.test(KEY);
(function(){ try{
  document.head.insertAdjacentHTML("beforeend",`<style>
.namebox{display:flex;flex-direction:column;align-items:center;gap:.4rem;margin:.2rem 0}
.namebox label{font-size:1.5rem;font-weight:900}
.namebox input{font:inherit;font-size:1.9rem;font-weight:900;text-align:center;width:min(16em,90vw);max-width:100%;padding:.5rem .8rem;border:4px solid currentColor;border-radius:.8rem;background:#fff;color:#111}
.namebox input:focus{outline:4px solid #F5B700;outline-offset:2px}
.namewarn{margin:0;min-height:1.4em;color:var(--bad,#C00);font-weight:900;font-size:1.2rem}
.donename{margin:0;font-size:1.5rem;font-weight:900}
</style>`);
  if(!window.cloudUpload){ const sc=document.createElement("script"); sc.src="../cloud.js?t="+Math.floor(Date.now()/60000); document.head.appendChild(sc); }
}catch(e){} })();
function nameHTML(){ return `<div class="namebox"><label for="nameIn">請輸入你的名字</label>
      <input id="nameIn" type="text" maxlength="12" autocomplete="off" enterkeyhint="go" value="${esc(st.name||"")}" placeholder="例如：王小明">
      <p id="nameWarn" class="namewarn" role="alert"></p></div>`; }
function wireName(){ const el=$("nameIn"); if(!el)return;
  el.addEventListener("keydown",e=>{ if(e.key==="Enter"){ e.preventDefault(); const b=$("startBtn"); if(b)b.click(); } });
  el.addEventListener("input",()=>{ const w=$("nameWarn"); if(w)w.textContent=""; }); }
function takeName(){ const el=$("nameIn"); const nm=((el&&el.value)||"").replace(/\s+/g,"").slice(0,12);
  if(!nm){ const w=$("nameWarn"); if(w)w.textContent="請先輸入你的名字，才能開始作答。";
    if(el){ el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); el.focus(); }
    try{ say1("請先輸入你的名字，才能開始作答。"); }catch(e){} return false; }
  st.name=nm; save(); return true; }
function stamp(t){ const d=new Date(t||Date.now()), p=x=>String(x).padStart(2,"0"); return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`; }
let cloudBusy=false;
async function cloudSend(force){
  const s=$("cloudStatus"); if(!s||TEACHER) return;
  const t1=st.t1, row=$("cloudRow");
  if(!force && st.up===t1){ s.className="status ok"; s.textContent="☁ 作答 PDF（簡要版、精細版）已上傳到老師的雲端資料夾。"; return; }
  if(cloudBusy) return;
  for(let k=0;k<20&&!window.cloudUpload;k++) await new Promise(r=>setTimeout(r,250));
  if(!window.cloudUpload||!window.CLOUD_URL){ s.className="status"; s.textContent="（雲端上傳還沒設定好，請用下載按鈕把 PDF 交給老師。）"; return; }
  if(!pdfBlobs.brief||!pdfBlobs.full){ s.className="status bad"; s.textContent="PDF 沒有做出來，不能上傳雲端。"; return; }
  cloudBusy=true; if(row) row.innerHTML="";
  s.className="status"; s.textContent="☁ 正在把作答 PDF 上傳到老師的雲端…請不要關掉這個畫面。";
  const nm=st.name||"未填姓名", base=(IS_TEST&&!/測試/.test(PDF_BASE)?"【測試】":"")+nm+"_"+PDF_BASE, ts=stamp(t1);
  try{
    await window.cloudUpload({exam:PDF_BASE.split("_")[0], title:BR.title, name:nm, test:IS_TEST, site:SITE_URL, submitted:fmt(t1),
      files:[{name:`${base}_簡要版_${ts}.pdf`,blob:pdfBlobs.brief},{name:`${base}_精細版_${ts}.pdf`,blob:pdfBlobs.full}]});
    if(st.t1===t1){ st.up=t1; save(); }
    const s2=$("cloudStatus"); if(s2){ s2.className="status ok"; s2.textContent="☁ 上傳完成！簡要版、精細版都已存到老師的雲端資料夾。"; }
  }catch(e){ console.error(e); const s2=$("cloudStatus"), r2=$("cloudRow");
    if(s2){ s2.className="status bad"; s2.textContent="☁ 上傳雲端沒有成功（可能是網路不穩）。請按「重新上傳雲端」，或用下載按鈕交給老師。"; }
    if(r2){ r2.innerHTML='<button class="big" id="cloudRetry" type="button">重新上傳雲端</button>'; $("cloudRetry").onclick=()=>cloudSend(true); } }
  cloudBusy=false;
}
async function makePDFs(){ await makePDFs0(); if(!TEACHER&&view==="done") cloudSend(false); }
function encodeRes(){ return encodeRes0()+(st.name?"~"+encodeURIComponent(st.name):""); }
function decodeRes(h){ let nm=""; const k=h.indexOf("~"); if(k>=0){ try{nm=decodeURIComponent(h.slice(k+1));}catch(e){nm=h.slice(k+1);} h=h.slice(0,k); }
  const r=decodeRes0(h); if(r) r.name=nm; return r; }
async function makePDFs0(){
  pdfBlobs={};
  for(const mode of ["brief","full"]){
    const ok=await buildPDF(mode); const b=$("pdf_"+mode); if(!b)return;
    if(ok){ b.disabled=false; b.textContent=`下載${PDFMODES[mode]} PDF`; b.onclick=()=>downloadPDF(mode); }
    else { b.textContent=`${PDFMODES[mode]} PDF 製作失敗`; $("pdfStatus").className="status bad"; $("pdfStatus").textContent="PDF 沒有做出來。請老師打開下方預覽直接批改，或重新整理頁面再試一次。"; renderSheetFallback(mode); }
  }
}
function renderSheetFallback(mode){ const prev=$("prev_"+mode); if(!prev)return; prev.innerHTML=""; layoutPages(mode).forEach(p=>{ const c=p.cloneNode(true); c.style.height="auto"; const w=document.createElement("div"); w.style.overflowX="auto"; w.appendChild(c); prev.appendChild(w); }); }
async function downloadPDF(mode){
  const s=$("pdfStatus"); s.className="status"; s.textContent="";
  const fname=PDF_BASE+"_"+PDFMODES[mode]+".pdf", blob=pdfBlobs[mode];
  try{
    const file=new File([blob],fname,{type:"application/pdf"});
    if(navigator.canShare&&navigator.canShare({files:[file]})&&/iPad|iPhone|Android/i.test(navigator.userAgent)){
      try{ await navigator.share({files:[file],title:fname}); s.className="status ok"; s.textContent="已送出："+fname; return; }catch(e){ if(e&&e.name==="AbortError"){ s.textContent="沒有下載。想下載時再按一次按鈕。"; return; } }
    }
    const url=URL.createObjectURL(blob), a=document.createElement("a"); a.href=url; a.download=fname; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000); s.className="status ok"; s.textContent="已下載："+fname; return;
  }catch(e){ s.className="status bad"; s.textContent="這個畫面不能下載檔案。請老師打開下方預覽直接批改。"; }
}

let saved=null;
function checkHash(){ const h=(location.hash||"").slice(1); const r=decodeRes(h);
  if(r){ if(!TEACHER){ saved=st; } TEACHER=true; st=Object.assign({},saved||st,{ans:r.ans,t0:r.t0,t1:r.t1,i:0,name:r.name||""}); stopSpeak(); show("done"); return true; }
  return false; }
function leaveTeacher(){ if(!TEACHER)return; TEACHER=false; if(saved)st=saved; saved=null; show(st.t1?"done":"home"); }
window.addEventListener("hashchange",()=>{ if(!checkHash()) leaveTeacher(); });
applySettings();
if(!checkHash()) show(st.t1?"done":"home");
