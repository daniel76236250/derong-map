// 得榮少年單張投遞：讓網頁和地圖存在手機裡（第二次打開更快，沒網路也能打開）
const CACHE = "derong-v2";
const CORE = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
function withTimeout(p, ms) { return new Promise((res, rej) => { const t = setTimeout(() => rej(new Error("timeout")), ms); p.then(v => { clearTimeout(t); res(v); }, e => { clearTimeout(t); rej(e); }); }); }
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const u = new URL(req.url);
  if (u.origin === self.location.origin) {
    // 同一個網站的檔案：有網路時取最新版（沒更新時伺服器只回「沒變」，不會重新下載），網路慢或沒網路時用手機裡的版本
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const hit = await c.match(req, { ignoreSearch: true }) || (req.mode === "navigate" ? await c.match("./index.html") : null);
      if (!hit) { const r = await fetch(req); if (r && r.ok) c.put(req, r.clone()); return r; }
      try { const r = await withTimeout(fetch(req), u.pathname.endsWith("config.js") ? 3000 : 5000); if (r && r.ok) { c.put(req, r.clone()); return r; } return hit; }
      catch (err) { return hit; }
    })());
    return;
  }
  if (/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) {
    e.respondWith(caches.open(CACHE).then(async c => { const hit = await c.match(req); if (hit) return hit; const r = await fetch(req); if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }));
  }
  // Google 試算表的資料一律直接連線，不存在手機裡
});
