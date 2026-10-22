import type { DayEntry, HabitPage } from '../types';
import { addDays, lastDays } from './dates';

export type DaysByPage = Record<string, Record<string, DayEntry>>;

/** Hábitos marcados en un día (solo cuentan los que siguen existiendo en la página). */
export function hechosEnDia(page: HabitPage, entry: DayEntry | undefined): number {
  if (!entry) return 0;
  return page.habits.filter((h) => entry.checks?.[h.id] === true).length;
}

export interface ResumenDia {
  hechos: number;
  total: number;
}

/** Suma de todas las páginas para una fecha. */
export function resumenDia(pages: HabitPage[], data: DaysByPage, fecha: string): ResumenDia {
  let hechos = 0;
  let total = 0;
  for (const p of pages) {
    total += p.habits.length;
    hechos += hechosEnDia(p, data[p.id]?.[fecha]);
  }
  return { hechos, total };
}

/**
 * Racha global: días consecutivos con al menos un hábito marcado en cualquier página.
 * Si hoy aún no hay nada marcado no se rompe: se cuenta desde ayer.
 */
export function rachaGlobal(pages: HabitPage[], data: DaysByPage, hoy: string, maxDias: number): number {
  let dia = hoy;
  if (resumenDia(pages, data, dia).hechos === 0) dia = addDays(dia, -1);
  let racha = 0;
  for (let i = 0; i < maxDias; i++) {
    if (resumenDia(pages, data, dia).hechos === 0) break;
    racha++;
    dia = addDays(dia, -1);
  }
  return racha;
}

/** Porcentaje de cumplimiento de los últimos `n` días (0–100). */
export function porcentajeUltimosDias(pages: HabitPage[], data: DaysByPage, hoy: string, n: number): number {
  let hechos = 0;
  let total = 0;
  for (const d of lastDays(hoy, n)) {
    const r = resumenDia(pages, data, d);
    hechos += r.hechos;
    total += r.total;
  }
  return total === 0 ? 0 : Math.round((hechos * 100) / total);
}
