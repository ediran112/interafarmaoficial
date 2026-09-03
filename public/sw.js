// Interafarma Service Worker — cache do app shell e passagem transparente
// para chamadas de API (que precisam sempre bater no servidor).

const VERSION = 'v1';
const CACHE = `interafarma-${VERSION}`;

// Shell mínimo — assets essenciais do carregamento inicial.
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icon-maskable.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Somente GET é cacheável.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Ignora domínios externos (Google Fonts, OpenAI, Firebase, etc).
  if (url.origin !== self.location.origin) return;

  // API — network only, sem cache (dados sempre frescos).
  if (url.pathname.startsWith('/api/')) return;

  // Navegação (HTML) — network first com fallback pra shell cacheado.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put('/', clone)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('/') || caches.match('/index.html'))
    );
    return;
  }

  // Assets estáticos — cache first, revalida em background.
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res.ok && res.status < 400) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// Recebe mensagens do app (ex: forçar atualização do SW)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
