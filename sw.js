// Офлайн: свои файлы — сначала из сети (чтобы обновления приходили сразу), без сети — из кэша.
// three.js и шрифты Google — из кэша, если уже скачаны.
const CACHE = 'shket-manya-v6', MEDIA_CACHE = 'shket-manya-media-v1';
const SHELL = ['./', 'index.html', 'app.css', 'world.js', 'scenes.js', 'saves.js', 'cinema.js', 'app.js', 'media/penguin-film-v1.jpg', 'media/veta-film-v1.jpg', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];
const FILM_PATHS = ['media/penguin-film-v1.mp4', 'media/veta-film-v1.mp4'].map(path => new URL(path, self.registration.scope).pathname);
const CDN = ['cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('shket-manya-') && k !== CACHE && k !== MEDIA_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

/* Safari запрашивает видео частями. Офлайн-копию храним целиком,
   а на Range возвращаем только нужные байты с ответом 206. */
async function mediaRange(response, range) {
  const data = await response.arrayBuffer(), total = data.byteLength;
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  let start, end;
  if (match && (match[1] || match[2])) {
    if (!match[1]) { const count = Number(match[2]); start = Math.max(0, total - count); end = total - 1; }
    else { start = Number(match[1]); end = match[2] ? Math.min(Number(match[2]), total - 1) : total - 1; }
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= total || end < start) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${total}` } });
  return new Response(data.slice(start, end + 1), { status: 206, headers: {
    'Content-Type': 'video/mp4', 'Content-Length': String(end - start + 1),
    'Content-Range': `bytes ${start}-${end}/${total}`, 'Accept-Ranges': 'bytes',
  } });
}
async function mediaResponse(req) {
  const cache = await caches.open(MEDIA_CACHE), url = req.url;
  const stored = await cache.match(url);
  if (stored) return req.headers.has('range') ? mediaRange(stored, req.headers.get('range')) : stored;
  try {
    const response = await fetch(req);
    if (!req.headers.has('range') && response.status === 200) {
      const data = await response.arrayBuffer();
      const full = new Response(data, { headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(data.byteLength), 'Accept-Ranges': 'bytes' } });
      try { await cache.put(url, full.clone()); } catch (e) { /* онлайн-просмотр доступен и без места для копии */ }
      return full;
    }
    return response;
  } catch (e) { return new Response('Video is not saved offline', { status: 503, headers: { 'Content-Type': 'text/plain' } }); }
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin && FILM_PATHS.includes(url.pathname)) {
    e.respondWith(mediaResponse(req)); return;
  }
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('index.html')))
    );
  } else if (CDN.includes(url.hostname)) {
    e.respondWith(
      caches.match(req).then(r => r || fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; }))
    );
  }
});
