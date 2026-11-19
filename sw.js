// Service worker: дозволяє встановити додаток на телефон і швидко відкривати його.
// Сюди ж у наступному етапі додаються пуш-сповіщення (подія 'push').
const CACHE = 'alimat-v10';
const ASSETS = ['./', 'index.html', 'css/app.css', 'config.js', 'icon.svg', 'js/core.js', 'js/demo-api.js', 'js/supa-api.js', 'js/app.js', 'js/library.js', 'js/accounts.js', 'logo.webp',
  'js/i18n/uk.js', 'js/i18n/pl.js', 'js/i18n/en.js', 'js/i18n/ru.js', 'js/i18n/es.js', 'js/i18n/ro.js', 'js/i18n/ne.js'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;     // дані Supabase — завжди з мережі
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
});
