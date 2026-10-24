// Convierte docs/MEMORIA_TFG.md en docs/MEMORIA_TFG.docx (Word) con los diagramas PNG incrustados.
// Requiere Pandoc (https://pandoc.org; en Windows: winget install JohnMacFarlane.Pandoc).
// Uso: node scripts/exportar-word.mjs        (PANDOC=ruta\pandoc.exe si no está en el PATH)
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import { describirDiagrama } from './diagramas.mjs';

const DOCS = fileURLToPath(new URL('../docs/', import.meta.url));
const ORIGEN = DOCS + 'MEMORIA_TFG.md';
const DESTINO = DOCS + 'MEMORIA_TFG.docx';

function buscarPandoc() {
  const candidatos = [process.env.PANDOC, 'pandoc', join(homedir(), 'AppData/Local/Pandoc/pandoc.exe'), 'C:/Program Files/Pandoc/pandoc.exe'].filter(Boolean);
  for (const c of candidatos) {
    if (spawnSync(c, ['--version'], { stdio: 'ignore' }).status === 0) return c;
  }
  throw new Error('No se encuentra Pandoc. Instálalo (winget install JohnMacFarlane.Pandoc) o define la variable PANDOC.');
}

const saltoDePagina = '```{=openxml}\n<w:p><w:r><w:br w:type="page"/></w:r></w:p>\n```';
const campoIndice =
  '```{=openxml}\n<w:p><w:r><w:fldChar w:fldCharType="begin" w:dirty="true"/></w:r><w:r><w:instrText xml:space="preserve"> TOC \\o "1-2" \\h \\z \\u </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>Pulsa F9 (o clic derecho ▸ Actualizar campo) para generar el índice.</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>\n```';

/** Reparte el ancho de las columnas según el contenido: Pandoc usa la longitud de los guiones del separador. */
function ajustarTablas(md) {
  const lineas = md.split('\n');
  const salida = [];
  for (let i = 0; i < lineas.length; i++) {
    const separador = /^\|(\s*:?-{3,}:?\s*\|)+\s*$/.test(lineas[i]);
    if (!separador || i === 0 || !lineas[i - 1].startsWith('|')) {
      salida.push(lineas[i]);
      continue;
    }
    const celdas = (l) => l.trim().replace(/^\||\|$/g, '').split('|');
    const filas = [lineas[i - 1]];
    for (let j = i + 1; j < lineas.length && lineas[j].startsWith('|'); j++) filas.push(lineas[j]);
    const n = celdas(lineas[i]).length;
    const pesos = Array.from({ length: n }, (_, c) => {
      const largos = filas.map((f) => (celdas(f)[c] ?? '').replace(/[*`_]/g, '').trim().length);
      const media = largos.reduce((a, b) => a + b, 0) / largos.length;
      return Math.min(70, Math.max(8, Math.round(media)));
    });
    salida.push('|' + pesos.map((p) => '-'.repeat(p)).join('|') + '|');
  }
  return salida.join('\n');
}

function prepararMarkdown(md) {
  // La nota de exportación es para quien edita el .md, no para el documento final
  md = md.replace(/^> \*\*Nota para exportar[\s\S]*?\n\n/m, '');
  // Índice manual (con enlaces internos) → campo de índice real de Word
  md = md.replace(/## Índice[\s\S]*?\n---\n/, `**Índice**\n\n${campoIndice}\n\n${saltoDePagina}\n`);
  // Bloques Mermaid → imágenes PNG numeradas con pie de figura
  let n = 0;
  md = md.replace(/```mermaid\n([\s\S]*?)```/g, (_, codigo) => {
    const { nombre, titulo } = describirDiagrama(codigo, n);
    n++;
    return `![Figura ${n}. ${titulo}](diagramas/${nombre}.png){width=95%}`;
  });
  // Los enlaces a otros .md de docs/ no funcionan dentro de un Word: se dejan como texto
  md = md.replace(/\[([^\]]+)\]\((?:\.\.\/)?(?:docs\/)?[A-Z_]+\.md\)/g, '$1');
  return ajustarTablas(md);
}

/** Retoca los estilos de Pandoc: tipografía, tamaños y tablas con bordes y cabecera sombreada. */
async function mejorarEstilos(ruta) {
  const zip = await JSZip.loadAsync(readFileSync(ruta));
  let s = await zip.file('word/styles.xml').async('string');

  s = s.replace(/<w:rFonts w:asciiTheme="minorHAnsi"[^>]*\/>/, '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri" />');
  s = s.replace(/<w:rFonts w:asciiTheme="majorHAnsi"[^>]*\/>/g, '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri" />');
  s = s.replace(/<w:sz w:val="24" \/>\s*<w:szCs w:val="24" \/>(\s*<w:lang w:val=")en-US/, '<w:sz w:val="22" /><w:szCs w:val="22" />$1es-ES');
  s = s.replace('<w:spacing w:after="200" />', '<w:spacing w:after="120" w:line="276" w:lineRule="auto" />');

  const bordes = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
    .map((l) => `<w:${l} w:val="single" w:sz="4" w:space="0" w:color="BFBFBF" />`)
    .join('');
  s = s.replace(
    /(<w:style w:type="table" w:default="1" w:styleId="Table">[\s\S]*?)<w:tblPr>[\s\S]*?<\/w:tblPr>[\s\S]*?<\/w:style>/,
    `$1<w:rPr><w:sz w:val="19" /><w:szCs w:val="19" /></w:rPr>` +
      `<w:tblPr><w:tblInd w:w="0" w:type="dxa" /><w:tblBorders>${bordes}</w:tblBorders>` +
      `<w:tblCellMar><w:top w:w="40" w:type="dxa" /><w:left w:w="100" w:type="dxa" /><w:bottom w:w="40" w:type="dxa" /><w:right w:w="100" w:type="dxa" /></w:tblCellMar></w:tblPr>` +
      `<w:tblStylePr w:type="firstRow"><w:rPr><w:b /></w:rPr><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="DCE6F2" /><w:vAlign w:val="bottom" /></w:tcPr></w:tblStylePr></w:style>`
  );
  zip.file('word/styles.xml', s);

  // Pide a Word actualizar los campos (índice) al abrir
  let ajustes = await zip.file('word/settings.xml').async('string');
  if (!ajustes.includes('w:updateFields')) ajustes = ajustes.replace(/<w:settings[^>]*>/, (m) => `${m}<w:updateFields w:val="true" />`);
  zip.file('word/settings.xml', ajustes);

  writeFileSync(ruta, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
}

const pandoc = buscarPandoc();
const temporal = mkdtempSync(join(tmpdir(), 'memoria-'));
const mdTemporal = join(temporal, 'memoria.md');
writeFileSync(mdTemporal, prepararMarkdown(readFileSync(ORIGEN, 'utf8')));

const resultado = spawnSync(
  pandoc,
  [
    mdTemporal,
    '-f', 'markdown-smart+pipe_tables+link_attributes+implicit_figures',
    '-t', 'docx',
    '--shift-heading-level-by=-1', // «## 1. Resumen» pasa a Título 1 y el «# Habit Workspace» inicial, a título del documento
    '--resource-path', DOCS,
    '--metadata', 'lang=es-ES',
    '-o', DESTINO,
  ],
  { encoding: 'utf8', cwd: DOCS }
);
rmSync(temporal, { recursive: true, force: true });
if (resultado.status !== 0) {
  console.error(resultado.stderr);
  process.exit(1);
}
if (resultado.stderr.trim()) console.warn('Avisos de Pandoc:\n' + resultado.stderr.trim());

await mejorarEstilos(DESTINO);
console.log(`✔ ${DESTINO} generado`);
