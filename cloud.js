/* 報讀網站共用：學生交卷後，把簡要版、精細版作答 PDF 上傳到老師的 Google 雲端資料夾。
   上傳網址（Google Apps Script 網頁應用程式）只要改這一行，所有報讀網站都會跟著換。 */
window.CLOUD_URL = "";
window.CLOUD_FOLDER = "1WuNUMyN5rID8lUBLb58BLSZg1CB-Gm2h";

window.cloudUpload = async function (payload) {
  if (!window.CLOUD_URL) throw new Error("尚未設定雲端上傳網址");
  const toB64 = blob => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1] || "");
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });
  const files = [];
  for (const f of payload.files) files.push({ name: f.name, data: await toB64(f.blob) });
  const body = JSON.stringify(Object.assign({}, payload, { files, folder: window.CLOUD_FOLDER }));
  let lastErr = null;
  for (let tryNo = 0; tryNo < 3; tryNo++) {
    try {
      const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 90000);
      const r = await fetch(window.CLOUD_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body, signal: ctl.signal });
      clearTimeout(tm);
      const j = await r.json();
      if (j && j.ok) return j;
      lastErr = new Error((j && j.error) || "上傳失敗");
    } catch (e) { lastErr = e; }
    await new Promise(r => setTimeout(r, 1500 * (tryNo + 1)));
  }
  throw lastErr || new Error("上傳失敗");
};
