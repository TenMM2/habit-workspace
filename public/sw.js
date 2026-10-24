/* Service Worker de Habit Workspace.
 *
 * Objetivo: que la app se instale y arranque SIN conexión.
 *  - Se precachea el "app shell": index.html y los archivos con hash que enlaza (JS y CSS).
 *  - Navegaciones: red primero (así las actualizaciones llegan) y, si no hay red, el index.html cacheado.
 *  - Archivos estáticos propios: caché primero.
 *  - /api/* y cualquier otro origen NUNCA se interceptan: las respuestas del asistente y las peticiones
 *    con datos del usuario no se guardan en caché.
 * Los datos del usuario no pasan por aquí: en modo local viven en IndexedDB y en modo Firebase el SDK
 * gestiona su propia persistencia.
 */
const CACHE = 'habit-workspace-shell';
const BASE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/theme-init.js',
  '/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-512.png',
  '/icons/apple-touch-icon.png',
];

/** Archivos con hash (/assets/...) que referencia el index.html actual. */
async function activosDelIndex() {
  const respuesta = await fetch('/index.html', { cache: 'no-store' });
  const html = await respuesta.text();
  return [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
}

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const activos = await activosDelIndex();
      await cache.addAll([...BASE, ...activos]);

      // Limpieza: se eliminan los /assets/ de versiones anteriores que el nuevo index ya no usa
      const vigentes = new Set(activos);
      for (const peticion of await cache.keys()) {
        const ruta = new URL(peticion.url).pathname;
        if (ruta.startsWith('/assets/') && !vigentes.has(ruta)) await cache.delete(peticion);
      }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;
  const url = new URL(peticion.url);

  if (peticion.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (peticion.mode === 'navigate') {
    evento.respondWith(
      fetch(peticion)
        .then((respuesta) => {
          const copia = respuesta.clone();
          if (respuesta.ok) caches.open(CACHE).then((c) => c.put('/index.html', copia));
          return respuesta;
        })
        .catch(async () => (await caches.match('/index.html')) ?? Response.error())
    );
    return;
  }

  evento.respondWith(
    caches.match(peticion).then(
      (guardada) =>
        guardada ??
        fetch(peticion).then((respuesta) => {
          if (respuesta.ok) {
            const copia = respuesta.clone();
            caches.open(CACHE).then((c) => c.put(peticion, copia));
          }
          return respuesta;
        })
    )
  );
});
