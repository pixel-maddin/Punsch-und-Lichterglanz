/*
 * Service Worker — installierbar und offline spielbar.
 * NETZ ZUERST, Cache als Rückfall: Es gibt keinen Build-Schritt, und
 * mit „Cache zuerst" sähe man nach einer Änderung tagelang die alte
 * Fassung. Offline kommt trotzdem alles aus dem Cache.
 */
const VERSION = 'adventshaus-20260929j';   // bei jedem Update erhöhen (wie ?v= in index.html)
const SCHALE = ['./', './index.html', './styles.css', './manifest.webmanifest', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SCHALE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((n) => Promise.all(n.filter((x) => x !== VERSION).map((x) => caches.delete(x))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok && res.status === 200) { const kopie = res.clone(); caches.open(VERSION).then((c) => c.put(req, kopie)); }
      return res;
    }).catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
  );
});
