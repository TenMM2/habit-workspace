// Extrae los diagramas Mermaid de docs/*.md, comprueba que su sintaxis es válida y los exporta a PNG
// en docs/diagramas/ para insertarlos en Word/PDF. Usa Chrome (Playwright) y mermaid desde un CDN.
// Uso: node scripts/exportar-diagramas.mjs
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const DOCS = fileURLToPath(new URL('../docs/', import.meta.url));
const SALIDA = DOCS + 'diagramas/';
mkdirSync(SALIDA, { recursive: true });

/** Nombre de archivo a partir del título/tipo del diagrama. */
const NOMBRES = [
  [/^gantt/, 'planificacion'],
  [/flowchart TB/, 'arquitectura'],
  [/Usuario.*\n.*Pantalla de login|login/s, 'flujo-autenticacion'],
  [/Widget del asistente/, 'flujo-asistente-ia'],
  [/erDiagram/, 'modelo-datos'],
  [/flowchart LR/, 'multiplataforma'],
];

const diagramas = [];
for (const archivo of readdirSync(DOCS).filter((f) => f.endsWith('.md'))) {
  const texto = readFileSync(DOCS + archivo, 'utf8');
  for (const m of texto.matchAll(/```mermaid\n([\s\S]*?)```/g)) diagramas.push({ archivo, codigo: m[1].trim() });
}

const navegador = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const pagina = await navegador.newPage({ deviceScaleFactor: 2 });
await pagina.setContent('<html><body style="margin:16px;background:#fff"><div id="d"></div></body></html>');
await pagina.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js' });
await pagina.evaluate(() => window.mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'strict' }));

let errores = 0;
const usados = new Set();
for (const [i, { archivo, codigo }] of diagramas.entries()) {
  const nombre = (NOMBRES.find(([re]) => re.test(codigo))?.[1] ?? `diagrama-${i + 1}`).replace(/[^a-z0-9-]/g, '');
  const unico = usados.has(nombre) ? `${nombre}-${i + 1}` : nombre;
  usados.add(unico);
  try {
    const svg = await pagina.evaluate(async ([c, id]) => (await window.mermaid.render(id, c)).svg, [codigo, `m${i}`]);
    await pagina.evaluate((s) => (document.getElementById('d').innerHTML = s), svg);
    const caja = await pagina.locator('#d svg').first();
    await caja.screenshot({ path: `${SALIDA}${unico}.png`, type: 'png' });
    writeFileSync(`${SALIDA}${unico}.svg`, svg);
    console.log(`✔ ${archivo} → docs/diagramas/${unico}.png`);
  } catch (e) {
    errores++;
    console.log(`✘ ${archivo} (diagrama ${i + 1}) → ${String(e.message).split('\n')[0]}`);
  }
}
await navegador.close();
console.log(`\n${diagramas.length - errores}/${diagramas.length} diagramas válidos`);
process.exit(errores ? 1 : 0);
