// Genera los iconos PNG de la PWA, Electron y Capacitor a partir de un SVG, usando Chrome (Playwright).
// Uso: node scripts/generar-iconos.mjs        (CHROME_PATH opcional)
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const SALIDA = fileURLToPath(new URL('../public/icons/', import.meta.url));
mkdirSync(SALIDA, { recursive: true });

const AZUL = '#2383e2';
const TICK = 'M140 268l82 82 150-170';

/** Icono normal: esquinas redondeadas y fondo transparente. */
const redondeado = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="110" fill="${AZUL}"/><path d="${TICK}" fill="none" stroke="#fff" stroke-width="52" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
/** Cuadrado a sangre: lo usan iOS y los iconos "maskable" de Android (el sistema aplica su máscara). */
const cuadrado = (escala) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="${AZUL}"/><g transform="translate(256 256) scale(${escala}) translate(-256 -256)"><path d="${TICK}" fill="none" stroke="#fff" stroke-width="52" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`;

const iconos = [
  { archivo: 'icon-192.png', tam: 192, svg: redondeado, transparente: true },
  { archivo: 'icon-512.png', tam: 512, svg: redondeado, transparente: true },
  { archivo: 'maskable-512.png', tam: 512, svg: cuadrado(0.7), transparente: false }, // zona segura central
  { archivo: 'apple-touch-icon.png', tam: 180, svg: cuadrado(0.9), transparente: false },
  { archivo: 'favicon-32.png', tam: 32, svg: redondeado, transparente: true },
  { archivo: 'icon-1024.png', tam: 1024, svg: redondeado, transparente: true }, // origen para tiendas / electron
];

const navegador = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const pagina = await navegador.newPage();
for (const { archivo, tam, svg, transparente } of iconos) {
  await pagina.setViewportSize({ width: tam, height: tam });
  await pagina.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${tam}" height="${tam}" `)}</body></html>`);
  const png = await pagina.screenshot({ omitBackground: transparente, type: 'png' });
  writeFileSync(SALIDA + archivo, png);
  console.log(`✔ ${archivo} (${tam}×${tam}, ${png.length} bytes)`);
}
await navegador.close();
