// ============================================================
// Vale Digital — sw_vd_v15_2_2.js  (subir como sw.js al repo goeapp/vale)
// v15.2.2 (12-nov-2026) — el chequeo de versión nueva (index.html?chequeo=…) va siempre directo a la red
//   y no se guarda (así no llena el caché). Al activarse borra el caché de la v15.1.0.
// v15.1.0 (11-nov-2026) — para que la PWA se instale y abra sin señal.
//  · La página (index.html): primero la red, si no hay señal la guardada.
//    Así cada versión nueva se ve al abrir, sin pasos extra.
//  · Librerías, tipografías e íconos (jsdelivr, Google Fonts): la guardada y se
//    actualiza por detrás.
//  · Supabase (datos y login) NUNCA pasa por acá: va siempre directo a la red.
//    Lo que se carga sin señal lo guarda la PWA en su propia cola.
// ============================================================
const VERSION = 'vd-v15.2.2';
const BASE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
const CDN = /^https:\/\/(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(BASE.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (/supabase\.co$/.test(url.hostname)) return;                       // datos y login: siempre a la red
  if (url.searchParams.has('chequeo')) return;                            // v15.2.2: chequeo de versión → red, sin guardar
  if (req.mode === 'navigate') {                                          // la página: red primero
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(VERSION).then(x => x.put('./index.html', c)); return r; })
      .catch(() => caches.match('./index.html').then(r => r || caches.match('./'))));
    return;
  }
  if (url.origin === location.origin || CDN.test(req.url)) {              // archivos: guardado + se actualiza por detrás
    e.respondWith(caches.open(VERSION).then(async c => {
      const guardada = await c.match(req);
      const red = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(() => null);
      return guardada || (await red) || new Response('', { status: 504, statusText: 'Sin señal' });
    }));
  }
});
