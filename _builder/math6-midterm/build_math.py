import sys, json, hashlib, asyncio, os, re
sys.path.insert(0, os.path.dirname(__file__))
import certifi; certifi.where = lambda: '/root/.ccr/ca-bundle.crt'
import edge_tts
from data_math import build, UI, ui_extra

REPO = "/home/claude/sped-exam-reader"
OUT = f"{REPO}/math6-midterm"
os.makedirs(f"{OUT}/a", exist_ok=True)
import shutil
shutil.copytree(os.path.join(os.path.dirname(os.path.abspath(__file__)),"img"), f"{OUT}/img", dirs_exist_ok=True)
shutil.copytree(f"{REPO}/social6-midterm/lib", f"{OUT}/lib", dirs_exist_ok=True)

secs = build()
texts = set()
def walk(x):
    if isinstance(x, list):
        if len(x) == 2 and x[0] == "zh" and isinstance(x[1], str): texts.add(x[1]); return
        for y in x: walk(y)
    elif isinstance(x, dict):
        for k, v in x.items(): walk(v)
walk(secs)
texts |= set(UI) | set(ui_extra())

aud = {}
for t in sorted(texts):
    aud["zh|" + t] = "a/" + hashlib.md5(t.encode()).hexdigest()[:10] + ".mp3"

sem = asyncio.Semaphore(4)
async def gen(t, path):
    if os.path.exists(path) and os.path.getsize(path) > 0: return
    async with sem:
        for _ in range(3):
            try:
                await edge_tts.Communicate(t, "zh-TW-HsiaoChenNeural").save(path); return
            except Exception as e:
                err = e; await asyncio.sleep(2)
        print("FAIL", t, err)
async def main():
    await asyncio.gather(*[gen(t, f"{OUT}/{p}") for t, p in ((k[3:], v) for k, v in aud.items())])
asyncio.run(main())
# remove clips no longer used
used={os.path.basename(v) for v in aud.values()}
for f in os.listdir(f"{OUT}/a"):
    if f not in used: os.remove(f"{OUT}/a/{f}")
# drop missing clips (browser voice fallback)
aud = {k: v for k, v in aud.items() if os.path.exists(f"{OUT}/{v}") and os.path.getsize(f"{OUT}/{v}") > 0}

src = open(f"{REPO}/math6-exam1/index.html", encoding="utf-8").read()
head = src[:src.index("<script>\nconst DATA=")]
head = head.replace("<title>六上數學第一次評量報讀</title>", "<title>六上數學期中評量報讀</title>")
head = head.replace('<meta charset="utf-8">', '<meta charset="utf-8"><meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"><meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0">',1)
for a_, b_ in [("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js","lib/html2canvas.min.js"),
               ("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js","lib/jspdf.umd.min.js"),
               ("https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js","lib/qrcode.min.js")]:
    assert a_ in head; head = head.replace(a_, b_)
extra = open(os.path.join(os.path.dirname(__file__), "math_extra.css"), encoding="utf-8").read()
head = head.replace('<button class="prev" id="prevBtn" type="button">← 上一題</button>', '<button class="prev" id="prevBtn" type="button">← 上一題</button>\n  <button class="tocbtn" id="tocBtn" type="button">📋 考卷目錄</button>', 1)
assert 'id="tocBtn"' in head
head = head.replace('<div class="wrap">\n  <div class="tools"', "<style>\n" + extra + "\n</style>\n" + '<div class="wrap">\n  <div class="tools"', 1)
js = open(os.path.join(os.path.dirname(__file__), "math_app.js"), encoding="utf-8").read()
js = js.replace("/*DATA*/", json.dumps({"secs": secs, "aud": aud}, ensure_ascii=False))
open(f"{OUT}/index.html", "w", encoding="utf-8").write(head + "<script>\n" + js + "</script>\n\n</body></html>\n")
print("clips", len(aud), "of", len(texts))

# ---------- 測試版（math6-midterm-test）：可自由跳題、一鍵填答、直接交卷；音檔共用正式版 ----------
html = open(f"{OUT}/index.html", encoding="utf-8").read()
def rep(a, b):
    global html
    assert a in html, a[:60]
    html = html.replace(a, b)
rep("<title>六上數學期中評量報讀</title>", "<title>六上數學期中評量報讀測試版</title>")
rep('"a/', '"../math6-midterm/a/')
rep('src="img/${', 'src="../math6-midterm/img/${')
rep('src="lib/', 'src="../math6-midterm/lib/')
rep("</style>\n<div class=\"wrap\">", ".testbar{margin-top:.6rem;border:3px dashed var(--bad);color:var(--bad);border-radius:.7rem;padding:.4rem .8rem;font-weight:900;font-size:.85rem;display:flex;flex-wrap:wrap;gap:.4rem .8rem;align-items:center}\n.testbar .tool{color:var(--fg)}\n</style>\n<div class=\"wrap\">")
rep('  <main id="main"></main>', '<div class="testbar" role="note"><b>測試版</b>　可以自由跳題，不用每題都寫；作答不會影響學生的正式版。\n  <span class="row" style="gap:.4rem"><button type="button" class="tool" id="tFill">一鍵隨機填答</button><button type="button" class="tool" id="tSubmit">直接交卷看 PDF</button><button type="button" class="tool" id="tClear">清除全部答案</button></span></div>\n  <main id="main"></main>')
rep('const KEY="math6-midterm-1151-pub";', 'const KEY="math6-midterm-1151-pub-test";')
rep('sped-exam-reader/math6-midterm/";', 'sped-exam-reader/math6-midterm-test/";')
rep('const PDF_BASE="六上數學期中評量";', 'const PDF_BASE="六上數學期中評量_測試版";')
rep("applySettings();\nif(!checkHash())", """$("tFill").onclick=()=>{ ITEMS.forEach(it=>{ const r=n=>Math.floor(Math.random()*n);
  if(it.t==="choice")st.ans[it.id]=r(it.o.length);
  else if(it.t==="paper")st.ans[it.id]=1;
  else if(it.kind==="multi"){ let v=""; for(let k=0;k<it.mk.length;k++) if(Math.random()<.3)v+=k; st.ans[it.id]=v||"2"; }
  else if(it.kind==="text")st.ans[it.id]=["互質","質數","合數"][r(3)];
  else st.ans[it.id]=Math.random()<.6?String(it.a):String(r(20)); });
  if(!st.t0)st.t0=Date.now(); save(); show(view==="home"?"home":"q"); };
$("tSubmit").onclick=()=>{ stopSpeak(); if(!st.t0)st.t0=Date.now(); st.t1=Date.now(); save(); show("done"); };
$("tClear").onclick=()=>{ stopSpeak(); st.ans={}; st.i=0; st.t0=null; st.t1=null; save(); show("home"); };
applySettings();
if(!checkHash())""")
os.makedirs(f"{REPO}/math6-midterm-test", exist_ok=True)
open(f"{REPO}/math6-midterm-test/index.html", "w", encoding="utf-8").write(html)
print("test version written")
