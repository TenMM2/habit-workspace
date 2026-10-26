// Verificación de la aplicación de escritorio (Electron): arranque, aislamiento de seguridad y uso real.
// Requisitos: npm run build (genera dist/), playwright-core. Para probar el proxy: npm run api.
// Uso: node e2e/electron.mjs                      (ejecuta con `electron .`)
//      EXE="release/HabitWorkspace-win32-x64/HabitWorkspace.exe" node e2e/electron.mjs   (app empaquetada)
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { _electron as electron } from 'playwright-core';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const resultados = [];

async function paso(nombre, fn) {
  try {
    const detalle = await fn();
    resultados.push(['OK   ', nombre + (detalle ? ` → ${detalle}` : '')]);
  } catch (e) {
    resultados.push(['FALLO', `${nombre} → ${String(e.message).split('\n')[0].slice(0, 220)}`]);
  }
}

// Algunos editores definen ELECTRON_RUN_AS_NODE=1, que hace que Electron arranque como Node puro
const env = Object.fromEntries(Object.entries(process.env).filter(([k, v]) => k !== 'ELECTRON_RUN_AS_NODE' && v !== undefined));
// Perfil temporal limpio en cada ejecución: así la prueba no depende de sesiones ni datos anteriores
const perfil = mkdtempSync(join(tmpdir(), 'hw-electron-'));
const app = process.env.EXE
  ? await electron.launch({ executablePath: process.env.EXE, args: [`--user-data-dir=${perfil}`], env })
  : await electron.launch({ args: ['.', `--user-data-dir=${perfil}`], cwd: RAIZ, env });
const page = await app.firstWindow();
await page.setViewportSize({ width: 1280, height: 800 });
const errores = [];
page.on('pageerror', (e) => errores.push(e.message));

await paso('La ventana carga la app por el protocolo app:// (login)', async () => {
  await page.getByText('Bienvenido de nuevo').waitFor({ timeout: 20000 });
  if (!page.url().startsWith('app://hw/')) throw new Error('URL: ' + page.url());
  return page.url();
});

await paso('SEGURIDAD: la página NO tiene acceso a Node (require/process/Buffer)', async () => {
  const r = await page.evaluate(() => ({ require: typeof require, process: typeof process, buffer: typeof Buffer }));
  if (r.require !== 'undefined' || r.process !== 'undefined' || r.buffer !== 'undefined') throw new Error(JSON.stringify(r));
});

await paso('contextBridge: solo se expone window.desktop (solo lectura)', async () => {
  const r = await page.evaluate(() => {
    const d = window.desktop;
    let modificable = true;
    try {
      d.platform = 'hackeado';
      modificable = d.platform === 'hackeado';
    } catch {
      modificable = false;
    }
    return { plataforma: d.platform, claves: Object.keys(d).sort().join(','), modificable };
  });
  if (r.modificable || r.claves !== 'platform,versions') throw new Error(JSON.stringify(r));
  return r.plataforma;
});

await paso('SEGURIDAD: la CSP bloquea scripts en línea y eval() (eventos securitypolicyviolation)', async () => {
  // Nota: page.evaluate() ejecuta por CDP con allowUnsafeEvalBlockedByCSP=true, así que llamar a eval()
  // directamente no sirve de prueba. Se usa código en cadena ejecutado por la propia página (setTimeout)
  // y se observan las violaciones que registra el navegador.
  const r = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const violaciones = [];
        document.addEventListener('securitypolicyviolation', (e) => violaciones.push(e.violatedDirective + ':' + (e.blockedURI || 'inline')));
        window.__ejecutado = [];
        const s = document.createElement('script');
        s.textContent = 'window.__ejecutado.push("inline")';
        document.head.appendChild(s);
        setTimeout('window.__ejecutado.push("eval")', 0);
        setTimeout(() => resolve({ ejecutado: window.__ejecutado, violaciones }), 400);
      })
  );
  if (r.ejecutado.length) throw new Error('se ejecutó código no permitido: ' + JSON.stringify(r));
  if (r.violaciones.length < 2) throw new Error('la CSP no registró las violaciones: ' + JSON.stringify(r));
  return `${r.violaciones.length} violaciones bloqueadas`;
});

await paso('SEGURIDAD: no hay path traversal fuera de dist/', async () => {
  const r = await page.evaluate(async () => {
    const intentos = ['/%2e%2e/package.json', '/%2e%2e/%2e%2e/electron/main.cjs', '/..%2f..%2fpackage.json'];
    const out = [];
    for (const u of intentos) {
      const res = await fetch(u);
      out.push({ estado: res.status, filtrado: /habit-workspace"|require\('electron'\)/.test(await res.text()) });
    }
    return out;
  });
  if (r.some((x) => x.filtrado)) throw new Error('¡se filtró un archivo!: ' + JSON.stringify(r));
});

await paso('SEGURIDAD: el proxy solo admite POST /api/gemini.php', async () => {
  const r = await page.evaluate(async () => {
    const get = await fetch('/api/gemini.php');
    const otra = await fetch('/api/config.php', { method: 'POST', body: '{}' });
    const raiz = await fetch('/api/../package.json', { method: 'POST', body: '{}' });
    return [get.status, otra.status, raiz.status];
  });
  if (r[0] !== 404 || r[1] !== 404) throw new Error(JSON.stringify(r));
});

await paso('Proxy: POST inválido llega al PHP (400) o responde 503 si no hay servidor', async () => {
  const estado = await page.evaluate(async () => (await fetch('/api/gemini.php', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status);
  if (![400, 503].includes(estado)) throw new Error('estado ' + estado);
  return estado === 400 ? 'PHP respondió 400 (proxy activo)' : '503 (sin servidor PHP: modo respaldo)';
});

await paso('Entrar con la cuenta demo y ver el dashboard', async () => {
  // noWaitAfter: Playwright espera a que acabe la "navegación" y con el protocolo app:// no la da por terminada
  await page.getByRole('button', { name: 'Entrar con la cuenta demo' }).click({ noWaitAfter: true });
  await page.getByText('días de racha').waitFor({ timeout: 10000 });
});

await paso('Onboarding en escritorio: panel «Primeros pasos» y tour guiado con ventanita y foco', async () => {
  await page.getByRole('region', { name: 'Primeros pasos' }).waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: 'Iniciar tour guiado' }).click({ noWaitAfter: true });
  const t = page.getByRole('dialog', { name: 'Tour guiado' });
  await t.getByText('Paso 1 de 7').waitFor();
  await page.locator('[data-testid="tour-foco"]').waitFor();
  await page.keyboard.press('Escape');
  await t.waitFor({ state: 'detached' });
  await page.keyboard.press('Escape'); // por si el modal de Ajustes seguía abierto
});

await paso('Abrir una página de hábitos y marcar un hábito de hoy', async () => {
  await page.locator('main').getByRole('link', { name: 'Mi rutina diaria' }).click({ noWaitAfter: true });
  await page.getByRole('table', { name: 'Seguimiento diario' }).waitFor();
  const hoy = new Date().getDate();
  const casilla = page.getByRole('checkbox', { name: new RegExp(`^Diario, día ${hoy}$`) });
  const antes = await casilla.getAttribute('aria-checked');
  await casilla.click();
  await page.waitForFunction(
    ([n, ant]) => [...document.querySelectorAll('[role=checkbox]')].find((x) => x.getAttribute('aria-label') === `Diario, día ${n}`)?.getAttribute('aria-checked') !== ant,
    [hoy, antes]
  );
});

await paso('Recargar en una ruta profunda (/p/...) no expulsa al dashboard', async () => {
  const antes = page.url();
  await page.reload();
  await page.getByRole('table', { name: 'Seguimiento diario' }).waitFor({ timeout: 10000 });
  if (page.url() !== antes) throw new Error(`${antes} → ${page.url()}`);
});

await paso('Ajustes → Apariencia muestra que es la app de escritorio', async () => {
  await page.getByRole('button', { name: /Usuario demo/ }).click();
  await page.getByRole('button', { name: 'Ajustes' }).click();
  await page.getByRole('tab', { name: /Apariencia/ }).click();
  await page.getByTestId('info-escritorio').waitFor();
  return (await page.getByTestId('info-escritorio').textContent()).trim();
});

await paso('El tema oscuro/claro funciona en escritorio', async () => {
  await page.keyboard.press('Escape');
  const oscuro = () => page.evaluate(() => document.documentElement.classList.contains('dark'));
  const antes = await oscuro();
  await page.getByRole('button', { name: /Cambiar a modo/ }).first().click();
  if ((await oscuro()) === antes) throw new Error('no cambió');
});

await paso('El asistente responde (Gemini o modo respaldo)', async () => {
  await page.getByRole('button', { name: 'Abrir asistente IA' }).click();
  await page.getByRole('button', { name: 'Resumen semanal' }).click();
  await page.getByText(/Gemini ·|Modo respaldo/).first().waitFor({ timeout: 70000 });
  return (await page.getByText(/Gemini ·|Modo respaldo/).first().textContent()).trim();
});

// Va al final a propósito: una navegación bloqueada deja a Playwright esperando una navegación que
// nunca se completa, y no debe condicionar el resto de pasos.
await paso('SEGURIDAD: window.open y navegación a webs externas quedan bloqueadas', async () => {
  // Se usa http:// a propósito: los https se abren en el navegador del sistema (comportamiento previsto),
  // y la prueba no debe lanzar un navegador real.
  const antes = app.windows().length;
  await page.evaluate(() => window.open('http://example.invalid/'));
  await page.evaluate(() => {
    setTimeout(() => {
      location.href = 'http://example.invalid/';
    }, 0);
  });
  await page.waitForTimeout(1500);
  if (app.windows().length !== antes) throw new Error('se abrió otra ventana');
  if (!page.url().startsWith('app://hw/')) throw new Error('navegó a ' + page.url());
});

await paso('Tras el intento de navegación bloqueado la app sigue usable', async () => {
  // Se actúa directamente sobre el DOM: tras una navegación cancelada Playwright espera indefinidamente
  // antes de cada clic, así que su espera de "acciones" no sirve para esta comprobación.
  const r = await page.evaluate(async () => {
    document.querySelector('button[aria-label="Cerrar asistente IA"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      panelCerrado: !document.querySelector('[role=dialog][aria-label="Asistente IA"]'),
      tracker: !!document.querySelector('[role=table][aria-label="Seguimiento diario"]'),
      url: location.href,
    };
  });
  if (!r.panelCerrado || !r.tracker || !r.url.startsWith('app://hw/p/')) throw new Error(JSON.stringify(r));
});

await paso('Sin errores no controlados en la página', async () => {
  if (errores.length) throw new Error(errores.slice(0, 2).join(' | '));
});

await app.close();
rmSync(perfil, { recursive: true, force: true, maxRetries: 3 });
console.log(resultados.map((r) => r.join(' ')).join('\n'));
const fallos = resultados.filter((r) => r[0].startsWith('FALLO')).length;
console.log(`\n${resultados.length - fallos} OK, ${fallos} fallos`);
process.exit(fallos ? 1 : 0);
