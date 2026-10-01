/**
 * PFT service worker — makes the web app installable (PWA) and resilient offline.
 *
 * No build plugin: Vite copies `public/sw.js` to `dist/sw.js` verbatim, so this
 * file must not import anything — it runs standalone in the worker scope.
 *
 * Strategy (deliberately boring):
 *  - Navigations → network first, falling back to the cached app shell.
 *    Firestore data still needs the network; the shell + signed-in session
 *    coming back offline is what "installed app" feels like.
 *  - Same-origin GETs (hashed JS/CSS, icons, manifest) → cache first with
 *    stale-while-revalidate, so repeat visits are instant but never stale.
 *  - Cross-origin (Firebase, Google Fonts, Firestore) → never intercepted.
 *  - `firebase.json` serves this file as `no-cache`, so an updated worker is
 *    picked up on the next visit instead of being frozen by the CDN.
 */

const VERSION = 'pft-v1'
const STATIC_CACHE = `${VERSION}-static`
const RUNTIME_CACHE = `${VERSION}-runtime`

const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // App navigation: try the network so data is fresh, fall back to the shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches
            .open(RUNTIME_CACHE)
            .then((cache) => cache.put('./index.html', copy))
            .catch(() => {})
          return response
        })
        .catch(() =>
          caches
            .match('./index.html')
            .then((cached) => cached || caches.match('./')),
        ),
    )
    return
  }

  // Only cache our own origin — Firebase / Google traffic stays live.
  if (url.origin !== self.location.origin) return
  if (url.pathname.endsWith('/sw.js')) return

  event.respondWith(
    caches.match(request).then((cached) => {
      const refresh = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone()
            caches
              .open(RUNTIME_CACHE)
              .then((cache) => cache.put(request, copy))
              .catch(() => {})
          }
          return response
        })
        .catch(() => cached)
      // Served from cache instantly, refreshed in the background.
      return cached || refresh
    }),
  )
})
