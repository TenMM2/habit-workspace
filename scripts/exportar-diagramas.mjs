// Extrae los diagramas Mermaid de docs/*.md, comprueba que su sintaxis es válida y los exporta a PNG y SVG
// en docs/diagramas/ para insertarlos en Word/PDF. Usa Chrome (Playwright) y mermaid desde un CDN.
// Uso: node scripts/exportar-diagramas.mjs
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { describirDiagrama, extraerMermaid } from './diagramas.mjs';

const DOCS = fileURLToPath(new URL('../docs/', import.meta.url));
const SALIDA = DOCS + 'diagramas/';
mkdirSync(SALIDA, { recursive: true });

const diagramas = [];
for (const archivo of readdirSync(DOCS).filter((f) => f.endsWith('.md'))) {
  for (const codigo of extraerMermaid(readFileSync(DOCS + archivo, 'utf8'))) diagramas.push({ archivo, codigo });
}

const navegador = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const pagina = await navegador.newPage({ deviceScaleFactor: 2 });
await pagina.setContent('<html><body style="margin:16px;background:#fff"><div id="d"></div></body></html>');
await pagina.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js' });
await pagina.evaluate(() => window.mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'strict' }));

let errores = 0;
for (const [i, { archivo, codigo }] of diagramas.entries()) {
  const { nombre } = describirDiagrama(codigo, i);
  try {
    const svg = await pagina.evaluate(async ([c, id]) => (await window.mermaid.render(id, c)).svg, [codigo, `m${i}`]);
    await pagina.evaluate((s) => (document.getElementById('d').innerHTML = s), svg);
    await pagina.locator('#d svg').first().screenshot({ path: `${SALIDA}${nombre}.png`, type: 'png' });
    writeFileSync(`${SALIDA}${nombre}.svg`, svg);
    console.log(`✔ ${archivo} → docs/diagramas/${nombre}.png`);
  } catch (e) {
    errores++;
    console.log(`✘ ${archivo} (diagrama ${i + 1}) → ${String(e.message).split('\n')[0]}`);
  }
}
await navegador.close();
console.log(`\n${diagramas.length - errores}/${diagramas.length} diagramas válidos`);
process.exit(errores ? 1 : 0);
