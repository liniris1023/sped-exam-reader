/**
 * 報讀網站 作答 PDF 上傳服務（Google Apps Script 網頁應用程式）
 * 學生交卷後，網站會把「簡要版」「精細版」PDF 送到這裡，存進老師的雲端資料夾：
 *   報讀作答結果（FOLDER_ID）／<考試名稱>／姓名_考試_簡要版_時間.pdf
 *   測試版的作答會放在 ／測試版／<考試名稱>／
 * 部署：部署 → 新增部署作業 → 類型「網頁應用程式」→ 執行身分「我」→ 存取權「所有人」。
 */
const FOLDER_ID = '1WuNUMyN5rID8lUBLb58BLSZg1CB-Gm2h';
const MAX_BYTES = 25 * 1024 * 1024;

function doGet() {
  return out_({ ok: true, msg: '報讀網站上傳服務運作中', folder: DriveApp.getFolderById(FOLDER_ID).getName() });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const d = JSON.parse(e.postData.contents);
    if (!d || !Array.isArray(d.files) || !d.files.length || d.files.length > 4) throw new Error('沒有檔案');
    lock.waitLock(30000);
    let folder = DriveApp.getFolderById(FOLDER_ID);
    if (d.test) folder = sub_(folder, '測試版');
    folder = sub_(folder, clean_(d.exam || '報讀作答'));
    const saved = [];
    d.files.forEach(function (f) {
      const bytes = Utilities.base64Decode(String(f.data || ''));
      if (!bytes.length || bytes.length > MAX_BYTES) throw new Error('檔案大小不對');
      const name = clean_(f.name || 'answer.pdf').replace(/(\.pdf)?$/i, '.pdf');
      const file = folder.createFile(Utilities.newBlob(bytes, 'application/pdf', name));
      file.setDescription([d.title, '姓名：' + (d.name || ''), '交卷：' + (d.submitted || ''), d.site || ''].join('\n'));
      saved.push({ name: name, id: file.getId() });
    });
    return out_({ ok: true, folder: folder.getName(), files: saved });
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

function sub_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}
function clean_(s) { return String(s).replace(/[\\\/:*?"<>|\n\r]/g, '').slice(0, 120) || '未命名'; }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
