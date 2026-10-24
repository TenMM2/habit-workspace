// Verificación de la PWA en Chrome real: manifest, instalabilidad, service worker y uso SIN conexión.
// Requisitos: npm run build && npm run preview (http://localhost:4173) y playwright-core.
// Uso: node e2e/pwa.mjs
import { chromium } from 'playwright-core';

const BASE = process.env.BASE_URL ?? 'http://localhost:4173';
const resultados = [];

async function paso(nombre, fn) {
  try {
    const detalle = await fn();
    resultados.push(['OK   ', nombre + (detalle ? ` → ${detalle}` : '')]);
  } catch (e) {
    resultados.push(['FALLO', `${nombre} → ${String(e.message).split('\n')[0].slice(0, 200)}`]);
  }
}

const navegador = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const ctx = await navegador.newContext({ viewport: { width: 1280, height: 800 }, locale: 'es-ES' });
const page = await ctx.newPage();

await page.goto(BASE + '/login');
await page.getByText('Bienvenido de nuevo').waitFor();

await paso('El HTML enlaza el manifest y los iconos de iOS', async () => {
  const n = await page.evaluate(() => ({
    manifest: document.querySelector('link[rel=manifest]')?.getAttribute('href'),
    apple: document.querySelector('link[rel=apple-touch-icon]')?.getAttribute('href'),
    tema: document.querySelector('meta[name=theme-color]')?.getAttribute('content'),
  }));
  if (!n.manifest || !n.apple || !n.tema) throw new Error(JSON.stringify(n));
});

await paso('El manifest es válido y todos sus iconos existen (PNG)', async () => {
  const m = await (await page.request.get(BASE + '/manifest.webmanifest')).json();
  if (m.display !== 'standalone') throw new Error('display no es standalone');
  const tamanos = m.icons.map((i) => i.sizes);
  if (!tamanos.includes('192x192') || !tamanos.includes('512x512')) throw new Error('faltan 192/512');
  if (!m.icons.some((i) => i.purpose === 'maskable')) throw new Error('falta icono maskable');
  for (const icono of m.icons) {
    const r = await page.request.get(BASE + icono.src);
    if (!r.ok()) throw new Error(`${icono.src} → ${r.status()}`);
  }
  return `${m.icons.length} iconos`;
});

await paso('Chrome no detecta errores de instalabilidad', async () => {
  const cdp = await ctx.newCDPSession(page);
  const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
  // 'in-incognito' es propio de la prueba: el contexto de Playwright es efímero y Chrome no instala en incógnito
  const reales = installabilityErrors.filter((e) => e.errorId !== 'in-incognito');
  if (reales.length) throw new Error(reales.map((e) => e.errorId).join(', '));
});

await paso('El service worker se registra y toma el control', async () => {
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 8000 });
});

await paso('El app shell queda en caché (index, JS y CSS con hash)', async () => {
  const claves = await page.evaluate(async () => {
    const out = [];
    for (const nombre of await caches.keys()) for (const r of await (await caches.open(nombre)).keys()) out.push(new URL(r.url).pathname);
    return out;
  });
  const js = claves.filter((c) => /^\/assets\/.+\.js$/.test(c)).length;
  const css = claves.filter((c) => /^\/assets\/.+\.css$/.test(c)).length;
  if (!claves.includes('/index.html') || js < 1 || css < 1) throw new Error(JSON.stringify(claves));
  return `${claves.length} recursos`;
});

await paso('SIN CONEXIÓN: la app arranca desde la caché', async () => {
  await ctx.setOffline(true);
  await page.reload();
  await page.getByText('Bienvenido de nuevo').waitFor({ timeout: 8000 });
});

await paso('SIN CONEXIÓN: se puede entrar y usar la app (datos locales)', async () => {
  await page.getByRole('button', { name: 'Entrar con la cuenta demo' }).click();
  await page.getByText('días de racha').waitFor({ timeout: 8000 });
  await page.locator('main').getByRole('link', { name: 'Mi rutina diaria' }).click();
  await page.getByRole('table', { name: 'Seguimiento diario' }).waitFor();
});

await paso('SIN CONEXIÓN: una ruta profunda recargada también funciona (fallback a index)', async () => {
  await page.reload();
  await page.getByRole('table', { name: 'Seguimiento diario' }).waitFor({ timeout: 8000 });
});

await paso('SIN CONEXIÓN: el asistente cae al modo de respaldo en vez de romperse', async () => {
  await page.getByRole('button', { name: 'Abrir asistente IA' }).click();
  await page.getByRole('button', { name: 'Consejos de constancia' }).click();
  await page.getByText(/Modo respaldo/).waitFor({ timeout: 15000 });
});

await ctx.setOffline(false);

await paso('Las peticiones /api/ nunca se guardan en caché', async () => {
  const api = await page.evaluate(async () => {
    const out = [];
    for (const nombre of await caches.keys()) for (const r of await (await caches.open(nombre)).keys()) out.push(new URL(r.url).pathname);
    return out.filter((p) => p.startsWith('/api/'));
  });
  if (api.length) throw new Error('hay /api/ en caché: ' + api.join(','));
});

await paso('Móvil (390×800): contenido adaptado sin scroll horizontal', async () => {
  await page.setViewportSize({ width: 390, height: 800 });
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (desborde > 0) throw new Error('desborde ' + desborde);
});

await navegador.close();
console.log(resultados.map((r) => r.join(' ')).join('\n'));
const fallos = resultados.filter((r) => r[0].startsWith('FALLO')).length;
console.log(`\n${resultados.length - fallos} OK, ${fallos} fallos`);
process.exit(fallos ? 1 : 0);
