const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** Fecha local en formato YYYY-MM-DD (no usa UTC, para que "hoy" sea el hoy del usuario). */
export function toISO(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export const todayISO = (): string => toISO(new Date());

export const parseISO = (s: string): Date => new Date(`${s}T12:00:00`);

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** Todas las fechas de un mes. `month` va de 0 a 11. */
export function monthDays(year: number, month: number): string[] {
  const total = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: total }, (_, i) => toISO(new Date(year, month, i + 1)));
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export const monthLabel = (year: number, month: number): string => `${MESES[month]} ${year}`;

export const weekdayShort = (iso: string): string => DIAS[parseISO(iso).getDay()];

export const dayNumber = (iso: string): number => parseISO(iso).getDate();

/** Últimos `n` días terminando en `end` (incluido), del más antiguo al más reciente. */
export function lastDays(end: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(end, i - (n - 1)));
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return 'Buenas noches';
  if (h < 13) return 'Buenos días';
  if (h < 21) return 'Buenas tardes';
  return 'Buenas noches';
}
