// Margin service worker: keeps the app and its libraries on the device so it opens offline.
// To publish an update: replace index.html in the repository and change VERSION below.
const VERSION = 'margin-1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
const LIBS = [
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js'
];
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(SHELL);
    await Promise.all(LIBS.map(u => fetch(u, {mode: 'cors'}).then(r => r.ok && c.put(u, r)).catch(() => {})));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => { for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k); await self.clients.claim(); })());
});
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const same = new URL(r.url).origin === location.origin, external = /cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com/.test(r.url);
  if (!same && !external) return;
  e.respondWith((async () => {
    const c = await caches.open(VERSION), hit = await c.match(r, {ignoreSearch: same});
    const net = fetch(r).then(res => { if (res && res.ok) c.put(r, res.clone()); return res; }).catch(() => null);
    if (hit) { if (same) e.waitUntil(net); return hit; }   // app files: show what is saved now, refresh it quietly for next time; libraries and fonts: saved copy first
    const res = await net; if (res) return res;
    if (r.mode === 'navigate') { const idx = await c.match('index.html'); if (idx) return idx; }
    return Response.error();
  })());
});
