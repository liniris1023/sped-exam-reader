# 五上國語期中評量（高組）第二頁 —— 只報讀題目、不作答
import sys, os, json, hashlib, asyncio, shutil
import certifi; certifi.where = lambda: '/root/.ccr/ca-bundle.crt'
import edge_tts

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = "/home/claude/sped-exam-reader"
NAME = "guoyu5-midterm"
OUT = f"{REPO}/{NAME}"
SITE_URL = f"https://liniris1023.github.io/sped-exam-reader/{NAME}/"
TITLE = "五上國語期中評量報讀"
os.makedirs(f"{OUT}/a", exist_ok=True)
os.makedirs(f"{OUT}/lib", exist_ok=True)
shutil.copy(f"{REPO}/social6-midterm/lib/qrcode.min.js", f"{OUT}/lib/qrcode.min.js")
for f in ("pic1.jpg", "pic2.jpg"):
    shutil.copy(f"{HERE}/{f}", f"{OUT}/{f}")

SECS = {
    "七": {"title": "七、選擇題", "say": "第七大題，選擇題。"},
    "八": {"title": "八、照樣寫短語：可以參考語詞箱的語詞", "say": "第八大題，照樣寫短語。可以參考語詞箱的語詞。"},
    "九": {"title": "九、接寫句子：請看圖片，完成句子，可以口語造句仿寫下來", "say": "第九大題，接寫句子。請看圖片，完成句子，可以口語造句，仿寫下來。"},
}

def ch(no, stem, say, opts):
    return {"t": "choice", "sec": "七", "no": no, "stem": stem, "say": f"第{no}題。" + say,
            "opts": [{"d": o, "s": f"{i+1}，{o.rstrip('。')}"} for i, o in enumerate(opts)]}

ITEMS = [
    ch(1, "在〔護送螃蟹過馬路〕一課，為什麼要護送螃蟹過馬路？",
       "在護送螃蟹過馬路一課，為什麼要護送螃蟹過馬路？",
       ["讓螃蟹吃飽", "讓螃蟹平安到海邊生寶寶", "讓螃蟹回到山上"]),
    ch(2, "在〔幸福筆記本〕一文中，作者是紀錄什麼樣的事情在筆記本上？",
       "在幸福筆記本一文中，作者是紀錄什麼樣的事情在筆記本上？",
       ["想去旅行的地點", "生活上覺得感恩的事情", "生活上不開心的事情"]),
    ch(3, "在〔做人做事做長久〕一課中，作者認為怎樣做，才能讓工作做得長久？",
       "在做人做事做長久一課中，作者認為怎樣做，才能讓工作做得長久？",
       ["多做幾種工作，增加經驗", "認真負責，把自己的工作做好", "不管到哪裡，都要幫助別人。"]),
    ch(4, "〔漫遊花東〕一課中，「綠色的浪」是指什麼？",
       "漫遊花東一課中，綠色的浪，是指什麼？",
       ["隨風搖動的稻子", "遠方的高山", "立霧溪的溪水"]),
    ch(5, "在〔孔雀錯了〕一課中，老師為什麼要講兩隻孔雀的故事？",
       "在孔雀錯了一課中，老師為什麼要講兩隻孔雀的故事？",
       ["想讓同學別再因為比成績而互相妒忌", "想讓同學發現自己的優點", "想讓大家放鬆心情"]),
    ch(6, "在〔特別的海〕一課中，龜山島附近的牛奶海，聞起來像什麼？",
       "在特別的海一課中，龜山島附近的牛奶海，聞起來像什麼？",
       ["新鮮的牛奶", "剛烤好的麵包", "壞掉的雞蛋"]),
    {"t": "phrase", "sec": "八", "no": 1,
     "ex": [["w", "拿"], ["b", "抹布"], ["b", "清潔"], ["b", "牆壁"]],
     "exSay": "第1題。例句：拿，抹布，清潔，牆壁。",
     "box": [["掃把", "毛巾", "剪刀"], ["清掃", "擦乾", "剪開"], ["地板", "雙手", "紙張"]],
     "q": [["w", "拿"], ["_", ""], ["_", ""], ["_", ""]],
     "qSay": "請照樣寫：拿，空格，空格，空格。"},
    {"t": "phrase", "sec": "八", "no": 2,
     "ex": [["b", "聞"], ["w", "起來就像"], ["b", "壞掉"], ["w", "的"], ["b", "雞蛋"]],
     "exSay": "第2題。例句：聞，起來就像，壞掉，的，雞蛋。",
     "box": [["看", "摸", "吃"], ["軟軟", "圓圓", "甜甜"], ["棉花糖", "皮球", "蛋糕"]],
     "q": [["_", ""], ["w", "起來就像"], ["_", ""], ["w", "的"], ["_", ""]],
     "qSay": "請照樣寫：空格，起來就像，空格，的，空格。"},
    {"t": "sentence", "sec": "九", "no": 1, "imgs": ["pic1.jpg", "pic2.jpg"],
     "q": [["w", "只要我在晚餐前寫完作業，"], ["w", "就可以"], ["_", ""], ["w", "。"]],
     "qSay": "只要我在晚餐前寫完作業，就可以，空格。"},
]
for it in ITEMS:
    if it["t"] == "phrase":
        it["boxSay"] = "詞語箱。" + "".join(f"{i+1}，{'、'.join(g)}。" for i, g in enumerate(it["box"]))

UI = {
    "hello": "五上國語期中評量，報讀。按開始報讀，老師會一題一題唸給你聽。",
    "end": "這是最後一題了。",
    "first": "這是第一題。",
    "toc": "題目目錄。點題號，就能到那一題。",
}

texts = set(UI.values())
for s in SECS.values(): texts.add(s["say"])
for it in ITEMS:
    for k in ("say", "exSay", "boxSay", "qSay"):
        if k in it: texts.add(it[k])
    for o in it.get("opts", []): texts.add(o["s"])
    for g in it.get("box", []):
        for w in g: texts.add(w)
    for g in [it.get("ex", [])]:
        for k, w in g:
            if w: texts.add(w)

aud = {t: "a/" + hashlib.md5(t.encode()).hexdigest()[:10] + ".mp3" for t in texts}
sem = asyncio.Semaphore(4)
async def gen(t, path):
    if os.path.exists(path) and os.path.getsize(path) > 0: return
    async with sem:
        err = None
        for _ in range(3):
            try:
                await edge_tts.Communicate(t, "zh-TW-HsiaoChenNeural").save(path); return
            except Exception as e:
                err = e; await asyncio.sleep(2)
        print("FAIL", t, err)
async def main():
    await asyncio.gather(*[gen(t, f"{OUT}/{p}") for t, p in aud.items()])
asyncio.run(main())
used = {os.path.basename(v) for v in aud.values()}
for f in os.listdir(f"{OUT}/a"):
    if f not in used: os.remove(f"{OUT}/a/{f}")
aud = {k: v for k, v in aud.items() if os.path.exists(f"{OUT}/{v}") and os.path.getsize(f"{OUT}/{v}") > 0}

tpl = open(f"{HERE}/template.html", encoding="utf-8").read()
data = json.dumps({"secs": SECS, "items": ITEMS, "ui": UI, "aud": aud, "url": SITE_URL}, ensure_ascii=False)
html = tpl.replace("/*DATA*/", data).replace("{{TITLE}}", TITLE)
open(f"{OUT}/index.html", "w", encoding="utf-8").write(html)
print("clips", len(aud), "of", len(texts))
