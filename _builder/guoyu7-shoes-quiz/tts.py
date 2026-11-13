import ssl, asyncio, json, os, edge_tts, edge_tts.communicate as c
c._SSL_CTX = ssl.create_default_context(cafile='/root/.ccr/ca-bundle.crt')
AUD=json.load(open('qz/aud.json'))
sem=asyncio.Semaphore(6)
async def one(t,h):
    f=f'qz/site/a/{h}.mp3'
    if os.path.exists(f) and os.path.getsize(f)>2000: return
    async with sem:
        for k in range(4):
            try:
                await edge_tts.Communicate(t,"zh-TW-HsiaoChenNeural",rate="-10%").save(f); return
            except Exception as e:
                await asyncio.sleep(2)
        print('FAIL',t)
async def m(): await asyncio.gather(*[one(t,h) for t,h in AUD.items()])
asyncio.run(m())
