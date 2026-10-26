// Pruebas E2E del onboarding: panel «Primeros pasos» + tour guiado con ventanitas.
// Requisitos: npm run dev (puerto en BASE) y playwright-core. Uso: node e2e/onboarding.mjs
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const BASE = process.env.BASE_URL ?? process.env.BASE ?? 'http://localhost:5173';
const SHOTS = fileURLToPath(new URL('./capturas', import.meta.url));
mkdirSync(SHOTS, { recursive: true });
const resultados = [];
const consola = [];

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'es-ES' });
const page = await ctx.newPage();
page.setDefaultTimeout(8000);
let actual = '';
page.on('pageerror', (e) => consola.push(`${actual} → pageerror: ${e.message}`));
page.on('console', (m) => ['error', 'warning'].includes(m.type()) && consola.push(`${actual} → ${m.type()}: ${m.text().slice(0, 200)}`));
page.on('dialog', (d) => d.accept());

async function paso(nombre, fn) {
  actual = nombre;
  try {
    await fn();
    resultados.push(['OK   ', nombre]);
  } catch (e) {
    resultados.push(['FALLO', `${nombre} → ${String(e.message).split('\n').slice(0, 2).join(' ⏎ ').slice(0, 260)} | URL=${page.url().replace(BASE, '')}`]);
    await page.screenshot({ path: `${SHOTS}/onb-fallo-${resultados.length}.png` }).catch(() => {});
    await page.setViewportSize({ width: 1280, height: 800 }).catch(() => {});
  }
}
const exigir = (c, m) => {
  if (!c) throw new Error(m);
};

const panel = () => page.getByRole('region', { name: 'Primeros pasos' });
const tour = () => page.getByRole('dialog', { name: 'Tour guiado' });
const fila = (id) => page.locator(`li[data-paso="${id}"]`);
const titulo = async () => (await panel().getByRole('heading', { level: 2 }).textContent()).trim();
const estado = async (id) => (await fila(id).getAttribute('data-hecho')) === 'true';
const irInicio = async () => {
  await page.locator('aside:visible').first().getByRole('link', { name: 'Inicio' }).click();
  await panel().waitFor();
};
const cerrarTour = async () => {
  if (await tour().count()) {
    await page.keyboard.press('Escape');
    await tour().waitFor({ state: 'detached' });
  }
};
/** El recuadro iluminado envuelve al elemento real del paso. */
const focoSobre = async (selector) => {
  await page.waitForFunction(
    (sel) => {
      const foco = document.querySelector('[data-testid="tour-foco"]');
      const el = [...document.querySelectorAll(sel)].find((e) => e.getBoundingClientRect().width > 0);
      if (!foco || !el) return false;
      const f = foco.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      return f.left <= r.left + 1 && f.top <= r.top + 1 && f.right >= r.right - 1 && f.bottom >= r.bottom - 1;
    },
    selector,
    { timeout: 6000 }
  );
};
const dentroDePantalla = async () => {
  const r = await tour().evaluate((el) => {
    const b = el.getBoundingClientRect();
    return { l: b.left, t: b.top, r: b.right, b: b.bottom, vw: innerWidth, vh: innerHeight };
  });
  exigir(r.l >= 0 && r.t >= 0 && r.r <= r.vw && r.b <= r.vh, `la ventanita se sale de la pantalla: ${JSON.stringify(r)}`);
};
const pasoActual = async () => parseInt((await tour().getByText(/^Paso \d+ de 7$/).textContent()).match(/Paso (\d+)/)[1], 10);

// ───────────── Cuenta nueva ─────────────
await paso('Cuenta nueva: el tour se lanza solo (Paso 1 de 7) y Esc lo cierra', async () => {
  await page.goto(BASE + '/registro');
  await page.getByLabel('Nombre').fill('Onboarding Test');
  await page.getByLabel('Correo').fill(`onb${Date.now() % 1000000}@test.com`);
  await page.getByLabel('Contraseña (mín. 8 caracteres)').fill('secreto123');
  await page.getByLabel('Repite la contraseña').fill('secreto123');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await tour().waitFor();
  await tour().getByText('Paso 1 de 7').waitFor();
  await page.screenshot({ path: SHOTS + '/onb-1-tour-auto.png' });
  await page.keyboard.press('Escape');
  await tour().waitFor({ state: 'detached' });
});
await paso('El tour no vuelve a lanzarse solo tras recargar', async () => {
  await page.reload();
  await panel().waitFor();
  await page.waitForTimeout(800);
  exigir((await tour().count()) === 0, 'el tour reapareció');
});
await paso('Panel: «Primeros pasos: 7 pendientes para empezar», 7 filas y barra al 0 %', async () => {
  exigir((await titulo()) === 'Primeros pasos: 7 pendientes para empezar', 'título: ' + (await titulo()));
  exigir((await page.locator('li[data-paso]').count()) === 7, 'no hay 7 filas');
  exigir((await panel().getByRole('button', { name: /^Hacerlo/ }).count()) === 7, 'no hay 7 botones Hacerlo');
  exigir((await panel().getByRole('progressbar').getAttribute('aria-valuenow')) === '0', 'barra no está a 0');
  // cada fila: número, título en negrita y explicación
  const f = await fila('pagina').innerText();
  exigir(/2/.test(f) && f.includes('Crea o abre tu primera página') && f.includes('banner, icono y objetivos'), 'fila incompleta: ' + f);
  await page.screenshot({ path: SHOTS + '/onb-2-panel.png' });
});
await paso('Hacerlo (paso 2, sin páginas): crea la página, abre su ventanita y el paso queda «✓ Hecho»', async () => {
  await fila('pagina').getByRole('button', { name: /Hacerlo/ }).click();
  await tour().waitFor();
  exigir((await pasoActual()) === 2, 'no abrió el paso 2');
  await page.waitForURL('**/p/*');
  await focoSobre('[data-tour="cabecera"]');
  await dentroDePantalla();
  await cerrarTour();
  await irInicio();
  exigir((await titulo()) === 'Primeros pasos: 6 pendientes para empezar', 'título: ' + (await titulo()));
  exigir(await estado('pagina'), 'el paso 2 no figura como hecho');
  exigir((await fila('pagina').innerText()).includes('✓ Hecho'), 'no muestra «✓ Hecho»');
  exigir((await fila('pagina').getByRole('button', { name: /Hacerlo/ }).count()) === 0, 'sigue el botón Hacerlo');
});
await paso('Hacerlo (paso 3): lleva a la página y resalta cita y reglas; editarlas lo marca como hecho', async () => {
  await fila('reglas').getByRole('button', { name: /Hacerlo/ }).click();
  await page.waitForURL('**/p/*');
  await tour().waitFor();
  exigir((await pasoActual()) === 3, 'no abrió el paso 3');
  await focoSobre('[data-tour="reglas"]');
  await cerrarTour();
  await page.getByLabel('Cita motivacional').fill('Cada día cuenta');
  await page.getByLabel('Cita motivacional').blur();
  await page.waitForTimeout(400);
  await irInicio();
  exigir(await estado('reglas'), 'el paso 3 no se marcó');
});
await paso('Hacerlo (paso 4): resalta el botón «Hábitos»; añadir un hábito lo marca como hecho', async () => {
  await fila('habitos').getByRole('button', { name: /Hacerlo/ }).click();
  await page.waitForURL('**/p/*');
  await focoSobre('[data-tour="habitos-btn"]');
  await cerrarTour();
  await page.getByRole('button', { name: 'Hábitos', exact: true }).click();
  await page.getByRole('button', { name: 'Añadir nuevo hábito' }).click();
  await page.waitForTimeout(400);
  await irInicio();
  exigir(await estado('habitos'), 'el paso 4 no se marcó');
});
await paso('Hacerlo (paso 5): resalta la tabla; marcar una casilla lo da por hecho', async () => {
  await fila('marca').getByRole('button', { name: /Hacerlo/ }).click();
  await page.waitForURL('**/p/*');
  await focoSobre('[data-tour="tabla"]');
  await cerrarTour();
  const hoy = new Date().getDate();
  await page.getByRole('checkbox', { name: new RegExp(`día ${hoy}$`) }).first().click();
  await page.waitForTimeout(400);
  await irInicio();
  exigir(await estado('marca'), 'el paso 5 no se marcó');
});
await paso('Hacerlo (paso 6): navega a /calendario y resalta la cuadrícula; pulsar un día lo marca', async () => {
  await fila('calendario').getByRole('button', { name: /Hacerlo/ }).click();
  await page.waitForURL('**/calendario');
  await focoSobre('[data-tour="calendario-grid"]');
  await dentroDePantalla();
  await cerrarTour();
  await page.locator('button[aria-pressed][title]').nth(3).click();
  await page.waitForTimeout(400);
  await irInicio();
  exigir(await estado('calendario'), 'el paso 6 no se marcó');
});
await paso('Hacerlo (paso 7): abre el asistente y lo resalta; preguntar lo marca como hecho', async () => {
  await fila('asistente').getByRole('button', { name: /Hacerlo/ }).click();
  await page.getByRole('dialog', { name: 'Asistente IA' }).waitFor();
  await focoSobre('[data-tour="asistente-panel"]');
  await dentroDePantalla();
  await cerrarTour();
  await page.getByLabel('Mensaje para el asistente').fill('Resumen semanal');
  await page.getByLabel('Mensaje para el asistente').press('Enter');
  await page.waitForFunction(() => !document.querySelector('[role=dialog][aria-label="Asistente IA"] [role=status]'), null, { timeout: 70000 });
  await page.getByRole('button', { name: 'Cerrar asistente', exact: true }).click();
  await page.waitForTimeout(300);
  exigir(await estado('asistente'), 'el paso 7 no se marcó');
});
await paso('Hacerlo (paso 1): abre Ajustes con la foto de perfil resaltada; subir foto lo marca y llega a «¡Todo listo!»', async () => {
  await fila('perfil').getByRole('button', { name: /Hacerlo/ }).click();
  await page.getByRole('dialog', { name: 'Ajustes' }).waitFor();
  await focoSobre('[data-tour="perfil-foto"]');
  await dentroDePantalla();
  await page.screenshot({ path: SHOTS + '/onb-3-perfil.png' });
  const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64');
  await page.locator('[role=dialog][aria-label=Ajustes] input[type=file]').first().setInputFiles({ name: 'f.png', mimeType: 'image/png', buffer: PNG });
  await page.getByText('Imagen actualizada.').waitFor();
  await cerrarTour();
  await page.keyboard.press('Escape'); // cierra Ajustes
  await page.getByRole('dialog', { name: 'Ajustes' }).waitFor({ state: 'detached' });
  exigir((await titulo()) === '¡Todo listo! Has completado los primeros pasos', 'título final: ' + (await titulo()));
  exigir((await panel().getByRole('progressbar').getAttribute('aria-valuenow')) === '100', 'barra no está al 100');
  await page.screenshot({ path: SHOTS + '/onb-4-todo-listo.png' });
});
await paso('El progreso persiste en IndexedDB tras recargar', async () => {
  await page.reload();
  await panel().waitFor();
  await page.waitForFunction(() => document.querySelector('[aria-label="Primeros pasos"] h2')?.textContent?.includes('Todo listo'), null, { timeout: 6000 });
});
await paso('Reiniciar pasos: vuelven los 7 pendientes', async () => {
  await panel().getByRole('button', { name: 'Reiniciar pasos' }).click();
  await page.waitForFunction(() => document.querySelector('[aria-label="Primeros pasos"] h2')?.textContent === 'Primeros pasos: 7 pendientes para empezar');
  exigir((await panel().getByRole('button', { name: /^Hacerlo/ }).count()) === 7, 'faltan botones Hacerlo');
});
await paso('Ocultar guarda la preferencia: deja «Mostrar primeros pasos (7)», persiste tras F5 y se puede volver a mostrar', async () => {
  await panel().getByRole('button', { name: 'Ocultar' }).click();
  await page.getByRole('button', { name: 'Mostrar primeros pasos (7)' }).waitFor();
  exigir((await panel().count()) === 0, 'el panel sigue visible');
  await page.reload();
  await page.getByRole('button', { name: 'Mostrar primeros pasos (7)' }).waitFor();
  exigir((await panel().count()) === 0, 'el panel reapareció tras F5');
  await page.getByRole('button', { name: 'Mostrar primeros pasos (7)' }).click();
  await panel().waitFor();
});
await paso('Contraer/expandir el listado', async () => {
  await panel().getByRole('button', { name: 'Contraer primeros pasos' }).click();
  exigir((await page.locator('li[data-paso]').count()) === 0, 'no se contrajo');
  await panel().getByRole('button', { name: 'Expandir primeros pasos' }).click();
  exigir((await page.locator('li[data-paso]').count()) === 7, 'no se expandió');
});

// ───────────── Tour completo ─────────────
await paso('Tour completo: Siguiente recorre los 7 pasos, cambia de pantalla y resalta cada elemento', async () => {
  await panel().getByRole('button', { name: 'Iniciar tour guiado' }).click();
  const esperado = [
    ['Personaliza tu perfil y avatar', '[data-tour="perfil-foto"]', null],
    ['Crea o abre tu primera página', '[data-tour="cabecera"]', '/p/'],
    ['Define tu cita y las reglas', '[data-tour="reglas"]', '/p/'],
    ['Configura tus hábitos diarios', '[data-tour="habitos-btn"]', '/p/'],
    ['Marca tu primer hábito', '[data-tour="tabla"]', '/p/'],
    ['Explora el mapa de calor', '[data-tour="calendario-grid"]', '/calendario'],
    ['Consulta al Asistente IA', '[data-tour="asistente-panel"]', null],
  ];
  for (let i = 0; i < 7; i++) {
    await tour().waitFor();
    await tour().getByText(`Paso ${i + 1} de 7`).waitFor();
    await tour().getByText(esperado[i][0], { exact: false }).first().waitFor();
    await focoSobre(esperado[i][1]);
    await dentroDePantalla();
    if (esperado[i][2]) exigir(page.url().includes(esperado[i][2]), `paso ${i + 1}: ruta ${page.url()}`);
    if (i === 3) await page.screenshot({ path: SHOTS + '/onb-5-tour-paso4.png' });
    if (i < 6) await tour().getByRole('button', { name: 'Siguiente' }).click();
  }
  exigir((await tour().getByRole('button', { name: 'Finalizar' }).count()) === 1, 'el último paso no tiene «Finalizar»');
  await page.screenshot({ path: SHOTS + '/onb-6-tour-paso7.png' });
});
await paso('Anterior retrocede (también entre pantallas) y en el paso 1 está deshabilitado', async () => {
  await tour().getByRole('button', { name: 'Anterior' }).click();
  await tour().getByText('Paso 6 de 7').waitFor();
  await page.waitForURL('**/calendario');
  await focoSobre('[data-tour="calendario-grid"]');
  await tour().getByRole('button', { name: 'Anterior' }).click();
  await tour().getByText('Paso 5 de 7').waitFor();
  await page.waitForURL('**/p/*');
  for (let i = 5; i > 1; i--) await tour().getByRole('button', { name: 'Anterior' }).click();
  await tour().getByText('Paso 1 de 7').waitFor();
  exigir(await tour().getByRole('button', { name: 'Anterior' }).isDisabled(), '«Anterior» habilitado en el paso 1');
});
await paso('Teclado: → avanza, ← retrocede, Esc cierra', async () => {
  await page.keyboard.press('ArrowRight');
  await tour().getByText('Paso 2 de 7').waitFor();
  await page.keyboard.press('ArrowRight');
  await tour().getByText('Paso 3 de 7').waitFor();
  await page.keyboard.press('ArrowLeft');
  await tour().getByText('Paso 2 de 7').waitFor();
  await page.keyboard.press('Escape');
  await tour().waitFor({ state: 'detached' });
});
await paso('«Saltar tutorial» y «Finalizar» cierran el tour', async () => {
  await page.locator('aside:visible').first().getByRole('button', { name: 'Ver tutorial de la app' }).click();
  await tour().waitFor();
  await tour().getByRole('button', { name: 'Saltar tutorial' }).click();
  await tour().waitFor({ state: 'detached' });
  await page.locator('aside:visible').first().getByRole('button', { name: 'Ver tutorial de la app' }).click();
  for (let i = 0; i < 6; i++) await tour().getByRole('button', { name: 'Siguiente' }).click();
  await tour().getByRole('button', { name: 'Finalizar' }).click();
  await tour().waitFor({ state: 'detached' });
  await page.getByRole('dialog', { name: 'Ajustes' }).waitFor({ state: 'detached' });
});
await paso('Ajustes → Apariencia: «Ver tutorial de la app» lanza el tour y «Mostrar primeros pasos» recupera el panel', async () => {
  await irInicio();
  await panel().getByRole('button', { name: 'Ocultar' }).click();
  await page.locator('aside:visible').first().getByRole('button').filter({ has: page.locator('svg.lucide-chevron-up') }).click();
  await page.getByRole('button', { name: 'Ajustes' }).click();
  await page.getByRole('tab', { name: /Apariencia/ }).click();
  await page.getByRole('dialog', { name: 'Ajustes' }).getByRole('button', { name: 'Mostrar primeros pasos' }).click();
  await page.keyboard.press('Escape');
  await panel().waitFor();
  await page.locator('aside:visible').first().getByRole('button').filter({ has: page.locator('svg.lucide-chevron-up') }).click();
  await page.getByRole('button', { name: 'Ajustes' }).click();
  await page.getByRole('tab', { name: /Apariencia/ }).click();
  await page.getByRole('dialog', { name: 'Ajustes' }).getByRole('button', { name: 'Ver tutorial de la app' }).click();
  await tour().waitFor();
  await tour().getByText('Paso 1 de 7').waitFor();
  await focoSobre('[data-tour="perfil-foto"]'); // el modal se reabre en la pestaña correcta
  await cerrarTour();
});

// ───────────── Móvil ─────────────
await paso('Móvil (390 px): la ventanita cabe en pantalla en los 7 pasos y no hay scroll lateral', async () => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto(BASE + '/');
  await panel().waitFor();
  await panel().getByRole('button', { name: 'Iniciar tour guiado' }).click();
  for (let i = 0; i < 7; i++) {
    await tour().getByText(`Paso ${i + 1} de 7`).waitFor();
    await page.waitForTimeout(450);
    await dentroDePantalla();
    const lateral = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    exigir(lateral <= 0, `scroll lateral en el paso ${i + 1}`);
    if (i === 1) await page.screenshot({ path: SHOTS + '/onb-7-movil.png' });
    if (i < 6) await tour().getByRole('button', { name: 'Siguiente' }).click();
  }
  await cerrarTour();
  await page.setViewportSize({ width: 1280, height: 800 });
});

// ───────────── Cuenta demo ─────────────
await paso('Cuenta demo: lista con estados mezclados («✓ Hecho» y «Hacerlo») y sin tour automático', async () => {
  await page.locator('aside:visible').first().getByRole('button').filter({ has: page.locator('svg.lucide-chevron-up') }).click();
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await page.waitForURL('**/login');
  await page.getByRole('button', { name: 'Entrar con la cuenta demo' }).click();
  await page.waitForFunction(() => !location.pathname.includes('login'));
  await page.goto(BASE + '/');
  await panel().waitFor();
  await page.waitForTimeout(800);
  exigir((await tour().count()) === 0, 'la demo lanzó el tour sola');
  const hechos = await panel().getByText('✓ Hecho').count();
  const hacerlo = await panel().getByRole('button', { name: /^Hacerlo/ }).count();
  exigir(hechos >= 1 && hacerlo >= 2 && hechos + hacerlo === 7, `hechos=${hechos}, hacerlo=${hacerlo}`);
  await page.screenshot({ path: SHOTS + '/onb-8-demo.png' });
});
await paso('Cuenta demo: aislamiento — su progreso no depende del de la cuenta nueva', async () => {
  const t = await titulo();
  exigir(/Primeros pasos: [2-6] pendientes? para empezar/.test(t), 'título de la demo: ' + t);
});

// ───────────── Consola ─────────────
const ruido = /favicon|Failed to load resource|ERR_|\/api\/gemini/i;
await paso('Consola: sin errores, avisos ni excepciones durante todo el recorrido', async () => {
  const rel = consola.filter((c) => !ruido.test(c));
  exigir(rel.length === 0, `${rel.length} → ${rel.slice(0, 3).join(' || ')}`);
});

await browser.close();
console.log(resultados.map((r) => r.join(' ')).join('\n'));
const fallos = resultados.filter((r) => r[0].startsWith('FALLO')).length;
console.log(`\n${resultados.filter((r) => r[0].startsWith('OK')).length} OK, ${fallos} fallos`);
process.exit(fallos ? 1 : 0);
