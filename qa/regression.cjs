const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
const root = path.resolve(__dirname, '..');
const results = path.join(__dirname, 'results'); fs.mkdirSync(results, { recursive: true });
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const file = path.join(root, pathname === '/' ? 'index.html' : pathname);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, bytes) => {
    if (err) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', file.endsWith('.css') ? 'text/css' : file.endsWith('.json') ? 'application/json' : 'text/html');
    res.end(bytes);
  });
});
const passed = [];
function samplePdf() {
  const content = 'BT /F1 18 Tf 40 720 Td (1. Sample exam: 8 + 2 = 10) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`
  ];
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((o,i) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${i+1} 0 obj\n${o}\nendobj\n`; });
  const start = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n` + offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('');
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
  return Buffer.from(pdf);
}
async function check(name, fn) { await fn(); passed.push(name); console.log('PASS', name); }
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(url); await page.waitForFunction(() => typeof state !== 'undefined' && state.questions.length === 6);
    await check('default OCR stays local and zoom is enabled', async () => {
      assert.equal(await page.evaluate(() => state.freeEngineMode), 'local_best');
      assert(!await page.locator('meta[name=viewport]').getAttribute('content').then(x => /user-scalable=no|maximum-scale/.test(x)));
      assert.equal(await page.locator('#symbolReadToggle').isChecked(), false);
    });
    await check('paste text keeps markup inert', async () => {
      await page.getByRole('button', { name: '貼上文字', exact: true }).first().click();
      await page.locator('#pasteTextarea').fill('1. <img src=x onerror=alert(1)> 測試題目');
      await page.getByRole('button', { name: '產生報讀文字卡', exact: true }).click();
      assert.equal(await page.locator('#questionsList img').count(), 0);
      assert.match(await page.locator('#questionsList').innerText(), /<img/);
    });
    await check('dialogs focus, trap Tab, close with Escape and restore focus', async () => {
      const settings = page.locator('button[onclick="openSettingsModal()"]');
      await settings.click();
      await page.waitForFunction(() => document.activeElement.closest('#settingsModal'));
      await page.getByRole('button', { name: '儲存設定', exact: true }).focus();
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), '關閉視窗');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('header').inert);
      assert(await settings.evaluate(el => el === document.activeElement));
    });
    await check('share roundtrip uses fragment and safe regenerated IDs', async () => {
      await page.evaluate(() => { state.questions = [{ id: "x');window.injected=1;//", type: 'question', stem: '分享題目 <script>', options: ['選項一'] }]; openQrModal(); switchQrMode('withExam'); });
      const link = await page.locator('#shareUrlInput').inputValue(); assert(link.includes('#exam=')); assert(!link.includes('?exam='));
      const shared = await browser.newPage(); await shared.goto(link);
      await shared.waitForFunction(() => document.querySelector('#appStatus').textContent.includes('已載入分享'));
      assert.equal(await shared.evaluate(() => state.questions[0].id), 'q-import-0');
      await shared.locator('button[title="報讀此段文字"]').click();
      assert.equal(await shared.evaluate(() => window.injected), undefined);
      await shared.close(); await page.keyboard.press('Escape');
    });
    await check('invalid share never falls back to an unrelated exam', async () => {
      await page.goto(url + '#exam=broken');
      await page.waitForFunction(() => document.querySelector('#appStatus').textContent.includes('無法載入'));
      assert.equal(await page.evaluate(() => state.questions.length), 0);
    });
    await check('malformed schema is rejected before rendering', async () => {
      assert(await page.evaluate(() => { try { loadExamData({questions:[{stem:'x',options:{}}]}); return false; } catch { return true; } }));
    });
    await check('empty exam stays empty after reload', async () => {
      await page.goto(url + '?fresh=1'); await page.waitForFunction(() => typeof state !== 'undefined');
      await page.evaluate(() => saveCurrentExamToLocal()); await page.goto(url);
      assert.equal(await page.evaluate(() => state.questions.length), 0);
    });
    await check('blocked storage does not prevent startup', async () => {
      const blocked = await browser.newPage();
      await blocked.addInitScript(() => { Storage.prototype.getItem = () => { throw new Error('blocked'); }; Storage.prototype.setItem = () => { throw new Error('blocked'); }; Storage.prototype.removeItem = () => { throw new Error('blocked'); }; });
      await blocked.goto(url); await blocked.waitForFunction(() => typeof state !== 'undefined' && state.questions.length === 6);
      await blocked.close();
    });
    await check('updated PDF module renders a PDF and extracts its original text', async () => {
      await page.locator('#pdfInput').setInputFiles({name:'sample.pdf',mimeType:'application/pdf',buffer:samplePdf()});
      await page.waitForFunction(() => state.pages.length === 1 && state.pages[0].type === 'pdfPage' && document.getElementById('loadingOverlay').classList.contains('hidden'), {timeout:60000});
      assert.match(await page.locator('#questionsList').innerText(), /Sample exam/);
      assert.equal(await page.evaluate(async () => (await getPdfLibrary()).version), '4.10.38');
    });
    await page.goto(url + '?fresh=1');
    await check('upload displays original without automatic OCR; crop uses original resolution', async () => {
      await page.evaluate(async () => {
        const c = document.createElement('canvas'); c.width=2400; c.height=3200;
        const ctx=c.getContext('2d'); ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='black';ctx.font='70px sans-serif';ctx.fillText('測試 8 ÷ 2 = 4',100,200);
        const blob = await new Promise(r=>c.toBlob(r));
        const file = new File([blob], 'exam.png', {type:'image/png'});
        await handleImageUpload({target:{files:[file],value:''}});
      });
      assert.equal(await page.evaluate(() => state.pages[0].sourceImage.width), 2400);
      assert(await page.locator('#loadingOverlay').evaluate(el => el.classList.contains('hidden')));
      assert.equal(await page.evaluate(() => state.questions.length), 0);
      await page.evaluate(() => rotateCurrentCanvas(90));
      assert.equal(await page.evaluate(() => state.pages[0].sourceImage.width), 3200);
      await page.screenshot({ path: path.join(results, 'desktop.png'), fullPage: true });
    });
    await check('OCR failures terminate worker; cropped text waits for user playback', async () => {
      assert(await page.evaluate(async () => {
        const original = window.Tesseract; let terminated=false;
        window.Tesseract={createWorker:async()=>({setParameters:async()=>{},recognize:async()=>{throw new Error('test');},terminate:async()=>{terminated=true;}})};
        try { await recognizeLocally('x','chi_tra','6'); } catch {}
        window.Tesseract=original; return terminated;
      }));
      const outcome = await page.evaluate(async () => {
        const original = window.Tesseract; let spoken=false;
        const speak = speakLiveSpotlightText;
        speakLiveSpotlightText = () => { spoken=true; };
        window.Tesseract={createWorker:async()=>({setParameters:async()=>{},recognize:async()=>({data:{text:'框選測試'}}),terminate:async()=>{}})};
        await recognizeAndSpeakCroppedRegion(10,10,200,80);
        window.Tesseract=original; speakLiveSpotlightText=speak;
        return {spoken,text:state.questions[0].stem};
      });
      assert.equal(outcome.spoken,false); assert.equal(outcome.text,'框選測試');
    });
    await check('persistent backup excludes crop images and API credentials', async () => {
      const saved = await page.evaluate(() => {
        state.geminiApiKey='temporary-test-key';
        saveCurrentExamToLocal();
        const data=localStorage.getItem('sped_current_exam_v2'); state.geminiApiKey=''; return data;
      });
      assert(!saved.includes('cropThumb'));
      assert(!saved.includes('temporary-test-key'));
      assert(!saved.includes('data:image'));
    });
    await check('spotlight editing updates the selected card instead of a previous crop', async () => {
      await page.evaluate(() => {
        state.questions.push({id:'q-edit-test',type:'question',stem:'原文字',options:['原選項']});
        renderQuestions(); speakQuestionCard('q-edit-test'); stopAllSpeech();
        document.getElementById('liveSpotlightInput').value='修正文字'; saveSpotlightEdit(); stopAllSpeech();
      });
      assert.equal(await page.evaluate(() => state.questions.find(q=>q.id==='q-edit-test').stem),'修正文字');
      assert.equal(await page.evaluate(() => state.questions[0].stem),'框選測試');
    });
    await check('no horizontal overflow on phone/tablet; dialogs scroll', async () => {
      for (const width of [320, 390, 768]) {
        await page.setViewportSize({ width, height: 844 });
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `overflow at ${width}`);
        await page.evaluate(() => openSettingsModal());
        await page.waitForTimeout(50);
        assert(await page.locator('#settingsModal > div').evaluate(el => el.getBoundingClientRect().height <= innerHeight));
        await page.keyboard.press('Escape');
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: path.join(results, 'phone.png'), fullPage: true });
    });
    await check('demo discards prior source image; canceling a touch selection does not run OCR', async () => {
      await page.evaluate(() => loadDemoExam());
      assert.equal(await page.evaluate(() => state.pages.length),0);
      assert.match(await page.locator('#canvasSourceLabel').innerText(), /非原始試卷/);
      const result = await page.evaluate(() => {
        const el=document.getElementById('overlayCanvas');
        const capture=el.setPointerCapture; el.setPointerCapture=()=>{};
        el.dispatchEvent(new PointerEvent('pointerdown',{isPrimary:true,button:0,pointerId:1,clientX:20,clientY:20}));
        el.dispatchEvent(new PointerEvent('pointercancel',{pointerId:1}));
        el.setPointerCapture=capture; return isDrawingCrop;
      });
      assert.equal(result,false);
    });
    await check('accessibility audit: no serious or critical violations', async () => {
      await page.evaluate(() => loadDemoExam());
      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      const audits = [];
      for (const screen of ['demo', 'editor', 'settings']) {
        if (screen === 'editor') await page.evaluate(() => toggleTeacherEditMode());
        if (screen === 'settings') { await page.evaluate(() => openSettingsModal()); await page.waitForTimeout(50); }
        const audit = await page.evaluate(() => axe.run(document, {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
        audits.push({screen,violations:audit.violations});
      }
      fs.writeFileSync(path.join(results,'accessibility.json'),JSON.stringify(audits,null,2));
      const severe = audits.flatMap(a=>a.violations).filter(v => ['serious','critical'].includes(v.impact));
      assert.deepEqual(severe.map(v => ({id:v.id,nodes:v.nodes.map(n=>n.target)})), []);
      await page.keyboard.press('Escape');
      await page.evaluate(() => { toggleTeacherEditMode(); document.getElementById('appStatus').classList.add('hidden'); });
      await page.setViewportSize({width:1280,height:900});
      await page.screenshot({path:path.join(results,'demo-desktop.png'),fullPage:true});
      await page.setViewportSize({width:390,height:844});
      await page.screenshot({path:path.join(results,'demo-phone.png'),fullPage:true});
    });
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(results,'summary.json'),JSON.stringify({passed},null,2));
    console.log(`${passed.length} checks passed`);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode=1; }).finally(() => server.close());
