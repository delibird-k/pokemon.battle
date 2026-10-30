/* PokÃ©mon Battle 3v3 - offline shell cache */
const CACHE_VERSION = 'pokemon-battle-shell-v2';
const SHELL_URLS = [
  './',
  './index.html',
  './ai.js',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js',
  'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    for (const url of SHELL_URLS) {
      try {
        const request = new Request(url, { mode: url.startsWith('http') && !url.startsWith(self.location.origin) ? 'no-cors' : 'same-origin' });
        const response = await fetch(request);
        if (response && (response.ok || response.type === 'opaque')) await cache.put(request, response);
      } catch (e) {
        // 1ã¤ã®å¤–éƒ¨CDNãŒå¤±æ•—ã—ã¦ã‚‚ã€Service Worker ã®ã‚¤ãƒ³ã‚¹ãƒˆãƒ¼ãƒ«å…¨ä½“ã¯å¤±æ•—ã•ã›ãªã„ã€‚
      }
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('pokemon-battle-shell-') && key !== CACHE_VERSION).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // PokÃ©API ã¨ä½¿ç”¨çŽ‡JSONã¯ã‚¢ãƒ—ãƒªå´ã® IndexedDB ã§ä¿å­˜ã™ã‚‹ãŸã‚ã€äºŒé‡ã‚­ãƒ£ãƒƒã‚·ãƒ¥ã—ãªã„ã€‚
  if (!isSameOrigin && (url.hostname === 'pokeapi.co' || url.hostname === 'poke.itlibra.com')) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_VERSION);
          await cache.put(request, response.clone());
        }
        return response;
      } catch (e) {
        const cache = await caches.open(CACHE_VERSION);
        return (await cache.match(request)) || (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }

  if (isSameOrigin) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_VERSION);
      try {
        const response = await fetch(request);
        if (response && response.ok) await cache.put(request, response.clone());
        return response;
      } catch (e) {
        return (await cache.match(request)) || Response.error();
      }
    })());
    return;
  }

  // CDNãƒ»ãƒ•ã‚©ãƒ³ãƒˆãƒ»ç”»åƒãªã©ã®å¤–éƒ¨GETã¯ã€å–å¾—æ¸ˆã¿ãªã‚‰ã‚­ãƒ£ãƒƒã‚·ãƒ¥ã‚’å„ªå…ˆã€‚
  // APIã®JSONãƒ‡ãƒ¼ã‚¿ã¯ã‚¢ãƒ—ãƒªå´ã®IndexedDBã‚­ãƒ£ãƒƒã‚·ãƒ¥ã‚‚ä½µç”¨ã™ã‚‹ã€‚
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_VERSION);
    const cached = await cache.match(request);
    if (cached) {
      fetch(request).then(response => {
        if (response && (response.ok || response.type === 'opaque')) cache.put(request, response.clone()).catch(() => {});
      }).catch(() => {});
      return cached;
    }
    try {
      const response = await fetch(request);
      if (response && (response.ok || response.type === 'opaque')) await cache.put(request, response.clone());
      return response;
    } catch (e) {
      return Response.error();
    }
  })());
});
