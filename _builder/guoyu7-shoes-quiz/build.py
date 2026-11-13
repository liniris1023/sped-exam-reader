import json, hashlib, re, shutil, os, sys
sys.path.insert(0,'/home/claude')
from data import P
URL = sys.argv[1] if len(sys.argv)>1 else ''
def parse(src): return re.sub(r'\{([^}|]+)(?:\|[^}]*)?\}', r'\1', src)
def clauses(t):
    e=[]; i=0
    while i < len(t):
        if t[i] in '，。；！？：':
            j=i+1
            if j<len(t) and t[j]=='」': j+=1
            e.append(j); i=j; continue
        i+=1
    if not e or e[-1]!=len(t): e.append(len(t))
    out=[]; s=0
    for x in e: out.append(t[s:x]); s=x
    return out
LAB=['認識仰光','第1段','第2段（上）','第2段（下）','第3段（上）','第3段（下）','第4段（上）','第4段（下）','第5段','第6段']
SHORT=['仰光','1','2上','2下','3上','3下','4上','4下','5','6']
HELP='先選一段，再一題一題作答。每一題都可以按喇叭聽題目和選項，選好答案後按下一題。全部做完，按交卷。'
PP=[]
for i,p in enumerate(P):
    PP.append({"t":p["t"],"q":p["q"],"cl":[clauses(parse(x)) for x in p["text"]],"img":f"p{i}_scene","cap":p["cap"]})
D={"P":PP,"LAB":LAB,"SHORT":SHORT,"HELP":HELP}
ABCD='ABCD'
S={HELP,'還有題目沒有作答喔','每一題都作答了，檢查好就可以交卷','交卷完成！老師會幫你看答案。'}
S.update(f'你選了{c}' for c in ABCD)
for p in PP:
    for cs in p['cl']: S.update(cs)
    for j,q in enumerate(p['q']):
        S.add(f'第{j+1}題。{q[0]}'); S.add(f'第{j+1}題，還沒作答')
        for k,o in enumerate(q[1]):
            S.add(f'{ABCD[k]}，{o}'); S.add(f'第{j+1}題，{ABCD[k]}，{o}')
clean=lambda s:s.replace('「','').replace('」','')
AUD={clean(s):hashlib.md5(clean(s).encode()).hexdigest()[:10] for s in S if s.strip()}
os.makedirs('qz/site/a',exist_ok=True); os.makedirs('qz/site/img',exist_ok=True)
for i in range(10): shutil.copy(f'site/img/p{i}_scene.jpg','qz/site/img/')
reuse=0
for t,h in AUD.items():
    if os.path.exists(f'site/a/{h}.mp3') and not os.path.exists(f'qz/site/a/{h}.mp3'): shutil.copy(f'site/a/{h}.mp3','qz/site/a/'); reuse+=1
json.dump(AUD,open('qz/aud.json','w'),ensure_ascii=False)
h=open('qz/tpl.html').read().replace('__DATA__',json.dumps(D,ensure_ascii=False)).replace('__AUD__',json.dumps(AUD,ensure_ascii=False)).replace('__URL__',json.dumps(URL))
open('qz/site/index.html','w').write(h)
print(len(AUD),'reused',reuse)
