// Catálogo de diagramas Mermaid de la memoria: identifica cada bloque por su contenido y le da nombre de archivo y título.
// Lo comparten exportar-diagramas.mjs (PNG/SVG) y exportar-word.mjs (inserta los PNG en el .docx).
export const DIAGRAMAS = [
  { patron: /^gantt/, nombre: 'planificacion', titulo: 'Planificación del TFG' },
  { patron: /^flowchart TB/, nombre: 'arquitectura', titulo: 'Arquitectura del sistema' },
  { patron: /Pantalla de login/, nombre: 'flujo-autenticacion', titulo: 'Flujo de autenticación' },
  { patron: /Widget del asistente/, nombre: 'flujo-asistente-ia', titulo: 'Flujo del asistente de IA' },
  { patron: /^erDiagram/, nombre: 'modelo-datos', titulo: 'Modelo de datos' },
  { patron: /^flowchart LR/, nombre: 'multiplataforma', titulo: 'Distribución multiplataforma' },
];

/** Devuelve { nombre, titulo } del diagrama; si no está catalogado, uno genérico según su posición. */
export function describirDiagrama(codigo, indice) {
  return DIAGRAMAS.find((d) => d.patron.test(codigo.trim())) ?? { nombre: `diagrama-${indice + 1}`, titulo: `Diagrama ${indice + 1}` };
}

/** Extrae los bloques ```mermaid de un texto Markdown, en orden. */
export function extraerMermaid(markdown) {
  return [...markdown.matchAll(/```mermaid\n([\s\S]*?)```/g)].map((m) => m[1].trim());
}
