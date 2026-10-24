// Recorrido de la interfaz en un navegador real (Playwright + Chrome).
// Requisitos: npm run dev (y npm run api para el asistente) y 'npm i -D playwright-core'.
// Uso: node e2e/run.mjs
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const BASE = 'http://localhost:5173';
const SHOTS = fileURLToPath(new URL('./capturas', import.meta.url));
mkdirSync(SHOTS, { recursive: true });
const resultados = [];
const errores = [];

async function paso(nombre, fn) {
  try {
    await fn();
    resultados.push(['OK   ', nombre]);
  } catch (e) {
    const txt = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 200)).catch(() => '?');
    resultados.push(['FALLO', `${nombre} → ${String(e.message).split('\n')[0].slice(0, 100)} | URL=${page.url()} | texto=${txt}`]);
  }
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'es-ES' });
const page = await ctx.newPage();
page.on('pageerror', (e) => errores.push('pageerror: ' + e.message));
page.on('console', (m) => m.type() === 'error' && errores.push('console.error: ' + m.text().slice(0, 200)));

const sinScrollLateral = async () =>
  page.evaluate(() => {
    const el = document.querySelector('main');
    return { main: el.scrollWidth - el.clientWidth, doc: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });

await paso('Ruta protegida: /calendario sin sesión redirige a /login', async () => {
  await page.goto(BASE + '/calendario');
  await page.waitForURL('**/login');
  await page.getByText('Modo local').waitFor();
});

await paso('Login con contraseña incorrecta muestra error', async () => {
  await page.getByLabel('Correo').fill('demo@habit.local');
  await page.getByLabel('Contraseña').fill('mala-mala');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByText('Correo o contraseña incorrectos').waitFor();
});

await paso('Entrar con la cuenta demo → vuelve a la ruta que pedía (/calendario)', async () => {
  await page.getByRole('button', { name: 'Entrar con la cuenta demo' }).click();
  await page.waitForURL('**/calendario');
});

await paso('Dashboard: métricas y la página de ejemplo', async () => {
  await page.getByRole('link', { name: 'Inicio' }).click();
  await page.getByText('días de racha').waitFor();
  await page.getByText('Mi rutina diaria').first().waitFor();
});
await page.screenshot({ path: SHOTS + '/1-dashboard.png' });

await paso('Página de hábitos: banner, título, cita, reglas y tracker', async () => {
  await page.locator('main').getByRole('link', { name: 'Mi rutina diaria' }).click();
  await page.getByLabel('Título de la página').waitFor();
  await page.getByText('La disciplina es elegir').waitFor();
  await page.getByLabel('Regla 1', { exact: true }).waitFor();
  await page.getByRole('table', { name: 'Seguimiento diario' }).waitFor();
});

await paso('Tracker sin scroll horizontal en escritorio', async () => {
  const s = await sinScrollLateral();
  if (s.main > 0 || s.doc > 0) throw new Error('scroll lateral: ' + JSON.stringify(s));
});
await page.screenshot({ path: SHOTS + '/2-pagina.png' });

await paso('Marcar un hábito de hoy con un clic y que persista tras recargar', async () => {
  const hoy = new Date().getDate();
  const casilla = page.getByRole('checkbox', { name: new RegExp(`^Lectura, día ${hoy}$`) });
  const antes = await casilla.getAttribute('aria-checked');
  await casilla.click();
  await page.waitForFunction(
    ([n, ant]) => {
      const el = [...document.querySelectorAll('[role=checkbox]')].find((x) => x.getAttribute('aria-label') === `Lectura, día ${n}`);
      return el && el.getAttribute('aria-checked') !== ant;
    },
    [hoy, antes]
  );
  await page.reload();
  // Tras recargar los datos llegan un instante después: se espera el valor guardado (distinto del inicial)
  await page
    .waitForFunction(
      ([n, ant]) => {
        const el = [...document.querySelectorAll('[role=checkbox]')].find((x) => x.getAttribute('aria-label') === `Lectura, día ${n}`);
        return el && el.getAttribute('aria-checked') !== ant;
      },
      [hoy, antes],
      { timeout: 8000 }
    )
    .catch(() => {
      throw new Error('no persistió tras recargar');
    });
});

await paso('Sesión persiste al recargar (sigue dentro)', async () => {
  if (page.url().includes('/login')) throw new Error('echado al login');
  await page.getByLabel('Título de la página').waitFor();
});

await paso('Editar el título en el sitio y que se refleje en la barra lateral', async () => {
  const t = page.getByLabel('Título de la página');
  await t.fill('Rutina editada');
  await t.blur();
  await page.locator('aside').first().getByText('Rutina editada').waitFor();
});

await paso('Añadir una regla y un hábito nuevo', async () => {
  await page.getByRole('button', { name: 'Añadir regla' }).click();
  await page.getByLabel('Regla 5', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Hábitos', exact: true }).click();
  await page.getByRole('button', { name: 'Añadir nuevo hábito' }).click();
  await page.getByLabel('Nombre del hábito 6').waitFor();
});

await paso('Filtro "Pendientes" reduce las filas', async () => {
  const filas = () => page.locator('[role=row]').count();
  const todas = await filas();
  await page.getByLabel('Filtrar días').selectOption('pendientes');
  const pend = await filas();
  if (!(pend < todas)) throw new Error(`todas=${todas} pendientes=${pend}`);
  await page.getByLabel('Filtrar días').selectOption('todos');
});

await paso('Cambio de tema Luna/Sol', async () => {
  const oscuro = () => page.evaluate(() => document.documentElement.classList.contains('dark'));
  const antes = await oscuro();
  await page.getByRole('button', { name: /Cambiar a modo/ }).first().click();
  if ((await oscuro()) === antes) throw new Error('no cambió');
  await page.screenshot({ path: SHOTS + '/3-tema.png' });
  await page.getByRole('button', { name: /Cambiar a modo/ }).first().click();
});

await paso('Buscador Ctrl+K navega a una página', async () => {
  await page.keyboard.press('Control+k');
  await page.getByRole('dialog', { name: 'Buscar' }).waitFor();
  await page.getByLabel('Buscar páginas').fill('calend');
  await page.keyboard.press('Enter');
  await page.waitForURL('**/calendario');
});

await paso('Ajustes: cambiar nombre', async () => {
  await page.getByRole('button', { name: /Usuario demo/ }).click();
  await page.getByRole('button', { name: 'Ajustes' }).click();
  await page.getByRole('dialog', { name: 'Ajustes' }).waitFor();
  const n = page.getByLabel('Nombre', { exact: true });
  await n.fill('Saúl Demo');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await page.getByText('Nombre actualizado.').waitFor();
});

await paso('Ajustes: contraseña incorrecta se rechaza y nueva demasiado corta se valida', async () => {
  await page.getByLabel('Contraseña actual', { exact: true }).fill('incorrecta');
  await page.getByLabel('Nueva contraseña', { exact: true }).fill('corta');
  await page.getByLabel('Repite la nueva contraseña').fill('corta');
  await page.getByRole('button', { name: 'Cambiar contraseña' }).click();
  await page.getByText('al menos 8 caracteres').waitFor();
});
await page.screenshot({ path: SHOTS + '/4-ajustes.png' });

await paso('Ajustes: pestaña Apariencia', async () => {
  await page.getByRole('tab', { name: /Apariencia/ }).click();
  await page.getByRole('radiogroup', { name: 'Tema de la aplicación' }).waitFor();
});

await paso('Ajustes: mejorar a Pro (simulado) genera factura y quita el límite', async () => {
  await page.getByRole('tab', { name: /Planes y facturación/ }).click();
  await page.getByRole('button', { name: 'Mejorar a Pro' }).click();
  await page.getByText('Ahora tienes el plan Pro').waitFor();
  await page.getByText('Suscripción Pro (mensual)').waitFor();
  await page.screenshot({ path: SHOTS + '/5-planes.png' });
  await page.keyboard.press('Escape');
});

await paso('Asistente IA: abrir, preguntar y recibir respuesta', async () => {
  await page.getByRole('button', { name: 'Abrir asistente IA' }).click();
  await page.getByRole('dialog', { name: 'Asistente IA' }).waitFor();
  await page.getByRole('button', { name: 'Resumen semanal' }).click();
  // Se espera la respuesta (no el "Pensando…" intermedio, que con el modo de respaldo dura milisegundos)
  const origen = await page
    .getByRole('dialog', { name: 'Asistente IA' })
    .getByText(/Gemini ·|Modo respaldo/)
    .first()
    .waitFor({ timeout: 70000 })
    .then(() => page.getByRole('dialog', { name: 'Asistente IA' }).getByText(/Gemini ·|Modo respaldo/).first().textContent());
  resultados.push(['INFO ', 'Asistente respondió con: ' + origen.trim()]);
});
await page.screenshot({ path: SHOTS + '/6-asistente.png' });

await paso('Asistente IA: «Crea una página de gimnasio» → botón → página creada y abierta', async () => {
  const campo = page.getByLabel('Mensaje para el asistente');
  await campo.fill('Crea una página de gimnasio');
  await campo.press('Enter');
  const boton = page.getByRole('button', { name: 'Crear esta página' });
  await boton.waitFor({ timeout: 60000 });
  await boton.click();
  await page.waitForURL('**/p/*');
  await page.getByLabel('Título de la página').waitFor();
});

await paso('Cerrar sesión devuelve al login y cierra el acceso', async () => {
  await page.getByRole('button', { name: /Saúl Demo|Usuario demo/ }).click();
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await page.waitForURL('**/login');
  await page.goto(BASE + '/');
  await page.waitForURL('**/login');
});

await paso('Registro de un usuario nuevo y aislamiento: no ve las páginas del demo', async () => {
  await page.getByRole('link', { name: 'Crear cuenta' }).click();
  await page.getByLabel('Nombre').fill('Ana Test');
  await page.getByLabel('Correo').fill('ana@test.com');
  await page.getByLabel('Contraseña (mín. 8 caracteres)').fill('secreto123');
  await page.getByLabel('Repite la contraseña').fill('secreto123');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await page.getByText('Aún no tienes páginas').waitFor();
  const visibles = await page.locator('aside').first().getByText('Rutina editada').count();
  if (visibles) throw new Error('¡ve páginas de otro usuario!');
});

// ---------- Móvil ----------
await paso('Móvil (390px): cajón lateral táctil y sin scroll lateral', async () => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.getByRole('button', { name: /barra lateral/ }).click();
  await page.locator('aside[aria-label="Barra lateral"]').last().waitFor();
  await page.screenshot({ path: SHOTS + '/7-movil-cajon.png' });
  const s = await sinScrollLateral();
  if (s.doc > 0) throw new Error('scroll lateral en móvil: ' + JSON.stringify(s));
});

await paso('Móvil: tracker de una página sin scroll horizontal', async () => {
  await page.reload();
  await page.getByRole('button', { name: /barra lateral/ }).click();
  await page.getByRole('button', { name: 'Añadir nueva página' }).last().click();
  await page.getByLabel('Título de la página').waitFor();
  await page.getByRole('table', { name: 'Seguimiento diario' }).waitFor();
  const s = await sinScrollLateral();
  if (s.main > 0 || s.doc > 0) throw new Error('scroll lateral: ' + JSON.stringify(s));
  await page.screenshot({ path: SHOTS + '/8-movil-tracker.png' });
});

await browser.close();
console.log(resultados.map((r) => r.join(' ')).join('\n'));
const relevantes = errores.filter((e) => !/favicon|Failed to load resource.*(404|400|503|502)/i.test(e));
console.log('\nErrores de consola/página:', relevantes.length ? '\n' + relevantes.slice(0, 8).join('\n') : 'ninguno');
const fallos = resultados.filter((r) => r[0].startsWith('FALLO')).length;
console.log(`\n${resultados.filter((r) => r[0].startsWith('OK')).length} OK, ${fallos} fallos`);
process.exit(fallos ? 1 : 0);
