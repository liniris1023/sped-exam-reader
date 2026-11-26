import json, base64, os, asyncio, hashlib, subprocess, re
import ssl, edge_tts
import edge_tts.communicate as C
C._SSL_CTX = ssl.create_default_context(cafile='/root/.ccr/ca-bundle.crt')

ROOT = '/home/claude/site'
IMG = '/home/claude/img'
SIMG = f'{ROOT}/img'
HW = '/home/claude/hw/package'
AUD = f'{ROOT}/aud'
os.makedirs(AUD, exist_ok=True)

CH = [
  dict(c='虫', zy='ㄏㄨㄟ', t='ˇ', py='huǐ', color='#5cb85c', light='#e6f6e2', pic='bug', anc_pic='snake', key='bug',
       strokes=['豎', '橫折', '橫', '豎', '挑', '點'],
       hello='虫。虫。蚊子、蝴蝶的字裡面，都有虫。',
       story=['很久很久以前，古人看到一條小蛇，頭大大的，身體彎彎的。',
              '古人就把小蛇畫下來，變成「甲骨文」。',
              '後來，字慢慢變成「金文」。',
              '再變成「小篆」，越來越整齊。',
              '最後，變成我們現在寫的「虫」。'],
       tip='「虫」像一條頭大大、身體彎彎的小蛇。蚊子、蝴蝶、螞蟻的字，左邊都有「虫」，所以都和小蟲子有關。',
       words=[dict(w='蚊', parts='虫＋文', full='蚊子', zy='ㄨㄣˊ', t='', pic='mosquito', say='虫加上文，變成蚊子的蚊。'),
              dict(w='蝴', parts='虫＋胡', full='蝴蝶', zy='ㄏㄨˊ', t='', pic='butterfly', say='虫加上胡，變成蝴蝶的蝴。')]),
  dict(c='羽', zy='ㄩ', t='ˇ', py='yǔ', color='#4aa3df', light='#e3f2fc', pic='feather', anc_pic='wings', key='feather',
       strokes=['橫折鉤', '點', '挑', '橫折鉤', '點', '挑'],
       hello='羽。羽。羽毛的羽。',
       story=['古人看到小鳥的翅膀，上面有一根一根的羽毛。',
              '古人就把羽毛畫下來，變成「甲骨文」。',
              '後來變成「金文」，像兩根並排的羽毛。',
              '再變成「小篆」。',
              '最後，變成我們現在寫的「羽」。'],
       tip='「羽」左右兩邊長得一模一樣，就像小鳥的一對翅膀。',
       words=[dict(w='羽毛', parts='', full='羽毛', zy='ㄩˇ ㄇㄠˊ', t='', pic='feather', say='羽毛。小鳥身上有羽毛。'),
              dict(w='羽球', parts='', full='羽球', zy='ㄩˇ ㄑㄧㄡˊ', t='', pic='shuttle', say='羽球。我們一起打羽球。')]),
  dict(c='魚', zy='ㄩ', t='ˊ', py='yú', color='#f08a3e', light='#fdeedf', pic='fish', anc_pic='fishup', key='fish',
       strokes=['撇', '橫撇', '豎', '橫折', '橫', '豎', '橫', '點', '點', '點', '點'],
       hello='魚。魚。小魚的魚。',
       story=['古人看到水裡游來游去的魚。',
              '古人就把魚畫下來，變成「甲骨文」，頭在上面，尾巴在下面。',
              '後來變成「金文」，還看得到魚鱗。',
              '再變成「小篆」。',
              '最後，變成我們現在寫的「魚」。'],
       tip='「魚」上面是魚頭，中間的「田」像魚身上的鱗片，下面四個點是魚尾巴。',
       words=[dict(w='魚缸', parts='', full='魚缸', zy='ㄩˊ ㄍㄤ', t='', pic='bowl', say='魚缸。小金魚住在魚缸裡。'),
              dict(w='魚丸', parts='', full='魚丸', zy='ㄩˊ ㄨㄢˊ', t='', pic='fishball', say='魚丸。魚丸湯好好喝。')]),
  dict(c='貝', zy='ㄅㄟ', t='ˋ', py='bèi', color='#e86f9a', light='#fde6ee', pic='shell', anc_pic='cowrie', key='shell',
       strokes=['豎', '橫折', '橫', '橫', '橫', '撇', '點'],
       hello='貝。貝。貝殼的貝。',
       story=['古人在海邊撿到漂亮的貝殼。',
              '古人就把貝殼畫下來，變成「甲骨文」。',
              '後來變成「金文」。',
              '再變成「小篆」，下面長出兩隻腳。',
              '最後，變成我們現在寫的「貝」。'],
       tip='「貝」就是貝殼。很久以前，人們把貝殼當作錢來用喔！',
       words=[dict(w='貝殼', parts='', full='貝殼', zy='ㄅㄟˋ ㄎㄜˊ', t='', pic='shell', say='貝殼。我在海邊撿貝殼。'),
              dict(w='貝果', parts='', full='貝果', zy='ㄅㄟˋ ㄍㄨㄛˇ', t='', pic='bagel', say='貝果。早餐吃貝果。')]),
]

EXTRA_SAY = {
  'welcome': '歡迎來到象形字樂園！今天我們要認識四個象形字：虫、羽、魚、貝。',
  'right': '答對了，你好棒！',
  'wrong': '再想一想喔！',
  'pick_pic': '看看圖片，這是哪一個字呢？',
  'pick_anc': '這是古時候的字，它變成了現在的哪一個字呢？',
  'write': '換你寫寫看，一筆一筆照著順序寫喔。',
  'write_ok': '寫完了，好厲害！',
  'all_done': '全部完成了，你真是象形字小高手！',
  'stroke_intro': '我們來看筆順，一筆一筆跟著寫。',
}

def lines():
    L = dict(EXTRA_SAY)
    for ch in CH:
        k = ch['key']
        L[f'{k}_hello'] = ch['hello']
        L[f'{k}_tip'] = ch['tip']
        for i, s in enumerate(ch['story']):
            L[f'{k}_story{i}'] = s
        L[f'{k}_strokes'] = f'{ch["c"]}，一共有{len(ch["strokes"])}畫。' + '、'.join(f'第{["一","二","三","四","五","六","七","八","九","十","十一"][i]}畫{n}' for i, n in enumerate(ch['strokes'])) + '。'
        for i, n in enumerate(ch['strokes']):
            L[f'{k}_s{i}'] = n
        for i, w in enumerate(ch['words']):
            L[f'{k}_w{i}'] = w['say']
        L[f'{k}_name'] = ch['c']
    return L

async def tts_all(L):
    sem = asyncio.Semaphore(4)
    async def one(key, text):
        fn = f'{AUD}/{key}.mp3'
        h = hashlib.md5(text.encode()).hexdigest()[:8]
        hf = f'{AUD}/{key}.txt'
        if os.path.exists(fn) and os.path.exists(hf) and open(hf).read() == h and os.path.getsize(fn) > 0:
            return
        async with sem:
            for attempt in range(3):
                try:
                    text = text.replace('虫', '毀')
                    c = edge_tts.Communicate(text, 'zh-TW-HsiaoChenNeural', rate='-12%', proxy='http://127.0.0.1:34843')
                    await c.save(fn)
                    open(hf, 'w').write(h)
                    return
                except Exception as e:
                    print('retry', key, e)
                    await asyncio.sleep(2)
    await asyncio.gather(*[one(k, v) for k, v in L.items()])

def b64file(p, mime):
    return f'data:{mime};base64,' + base64.b64encode(open(p, 'rb').read()).decode()

def build():
    L = lines()
    asyncio.run(tts_all(L))
    audio = {k: b64file(f'{AUD}/{k}.mp3', 'audio/mpeg') for k in L}
    pics = {}
    for n in ['bug', 'feather', 'fish', 'shell', 'mosquito', 'butterfly', 'shuttle', 'bowl', 'fishball', 'bagel', 'wings', 'fishup', 'cowrie', 'snake']:
        p = f'{IMG}/{n}.png'
        if os.path.exists(p):
            # jpeg-ish compression via PIL to keep size small
            from PIL import Image
            im = Image.open(p).convert('RGB')
            im.thumbnail((520, 520))
            q = f'/tmp/{n}.webp'
            im.save(q, 'WEBP', quality=86)
            pics[n] = b64file(q, 'image/webp')
    for ch in CH:
        for kind in ['oracle', 'bronze', 'seal']:
            pics[f'{ch["key"]}_{kind}'] = b64file(f'{SIMG}/{ch["key"]}_{kind}.png', 'image/png')
    hz = {ch['c']: json.load(open(f'{HW}/{ch["c"]}.json')) for ch in CH}
    # font subset
    tpl = open(f'{ROOT}/template.html', encoding='utf-8').read()
    alltext = tpl + json.dumps(CH, ensure_ascii=False) + json.dumps(EXTRA_SAY, ensure_ascii=False) + '甲骨文金文小篆楷書'
    chars = ''.join(sorted(set(alltext)))
    open('/tmp/chars.txt', 'w').write(chars)
    subprocess.run(['pyftsubset', '/home/claude/hw/kai.ttf', '--text-file=/tmp/chars.txt', '--flavor=woff2',
                    '--output-file=/tmp/kai_sub.woff2', '--layout-features=*'], check=True)
    font = b64file('/tmp/kai_sub.woff2', 'font/woff2')
    hwjs = open('/tmp/package/dist/hanzi-writer.min.js').read()
    data = dict(CH=CH, pics=pics, audio=audio, hz=hz)
    html = (tpl.replace('/*__FONT__*/', font)
               .replace('/*__HWJS__*/', hwjs)
               .replace('/*__DATA__*/', 'const DATA=' + json.dumps(data, ensure_ascii=False) + ';'))
    os.makedirs(f'{ROOT}/out', exist_ok=True)
    out = f'{ROOT}/out/象形字樂園_虫羽魚貝.html'
    open(out, 'w', encoding='utf-8').write(html)
    print(out, os.path.getsize(out) // 1024, 'KB')

if __name__ == '__main__':
    build()
