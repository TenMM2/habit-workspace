import { MAX_HABITS_PER_PAGE } from '../types';

/** Estructura de página que el asistente propone y el usuario decide si crear. */
export interface PaginaPropuesta {
  title: string;
  icon: string;
  quote: string;
  rules: string[];
  habits: { name: string; emoji: string }[];
}

const texto = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/**
 * Valida y normaliza una propuesta venida de un modelo de IA. Es entrada no fiable:
 * se comprueban tipos y se recortan longitudes y cantidades antes de usarla.
 */
export function sanearPropuesta(valor: unknown): PaginaPropuesta | null {
  if (typeof valor !== 'object' || valor === null) return null;
  const v = valor as Record<string, unknown>;
  const title = texto(v.title, 80);
  if (!title) return null;

  const habits = (Array.isArray(v.habits) ? v.habits : [])
    .map((h) => {
      const x = (typeof h === 'object' && h !== null ? h : {}) as Record<string, unknown>;
      return { name: texto(x.name, 40), emoji: texto(x.emoji, 8) || '✅' };
    })
    .filter((h) => h.name)
    .slice(0, MAX_HABITS_PER_PAGE);
  if (habits.length === 0) return null;

  const rules = (Array.isArray(v.rules) ? v.rules : [])
    .map((r) => texto(r, 200))
    .filter(Boolean)
    .slice(0, 12);

  return { title, icon: texto(v.icon, 8) || '📓', quote: texto(v.quote, 400), rules, habits };
}

const BLOQUE = /```pagina\s*([\s\S]*?)```/i;

/** Separa el texto visible de un posible bloque ```pagina {json}``` incluido en la respuesta. */
export function extraerPropuesta(respuesta: string): { texto: string; pagina?: PaginaPropuesta } {
  const m = BLOQUE.exec(respuesta);
  if (!m) return { texto: respuesta.trim() };
  const limpio = respuesta.replace(BLOQUE, '').trim();
  try {
    const pagina = sanearPropuesta(JSON.parse(m[1]));
    return pagina ? { texto: limpio, pagina } : { texto: limpio };
  } catch {
    return { texto: limpio };
  }
}
