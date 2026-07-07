/**
 * service-worker.js
 *
 * PWAのオフライン利用を実現するためのService Worker。
 * アプリシェル一式をインストール時にキャッシュし、以降はキャッシュ優先で応答する
 * (Cache First戦略)。ネットワークから取得できた場合はキャッシュを更新する。
 */

const CACHE_NAME = 'juggler-analyzer-cache-v1';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './machineData.js',
  './calculator.js',
  './bayes.js',
  './charts.js',
  './ui.js',
  './app.js',
  './manifest.json',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
