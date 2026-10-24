import type { HabitPage } from '../types';
import { addDays, lastDays, parseISO } from './dates';
import type { DaysByPage } from './stats';

export interface AnalisisHabito {
  id: string;
  nombre: string;
  emoji: string;
  hechos: number; // días marcados dentro de la ventana
  dias: number; // días de la ventana
  pct: number; // 0–100
  racha: number; // días seguidos hasta hoy (o ayer si hoy aún no está marcado)
}

export interface AnalisisPagina {
  id: string;
  titulo: string;
  quote: string;
  reglas: string[];
  pct: number;
  habitos: AnalisisHabito[];
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** Calcula, por hábito, cumplimiento y racha en la ventana de `ventana` días que termina hoy. */
export function analizar(pages: HabitPage[], data: DaysByPage, hoy: string, ventana: number): AnalisisPagina[] {
  const fechas = lastDays(hoy, ventana);
  return pages.map((p) => {
    const habitos = p.habits.map((h): AnalisisHabito => {
      const marcado = (f: string) => data[p.id]?.[f]?.checks?.[h.id] === true;
      const hechos = fechas.filter(marcado).length;
      let dia = hoy;
      if (!marcado(dia)) dia = addDays(dia, -1);
      let racha = 0;
      while (racha < ventana && marcado(dia)) {
        racha++;
        dia = addDays(dia, -1);
      }
      return { id: h.id, nombre: h.name, emoji: h.emoji, hechos, dias: ventana, pct: Math.round((hechos * 100) / ventana), racha };
    });
    const total = habitos.reduce((n, h) => n + h.dias, 0);
    const hechos = habitos.reduce((n, h) => n + h.hechos, 0);
    return { id: p.id, titulo: p.title, quote: p.quote, reglas: p.rules, pct: total ? Math.round((hechos * 100) / total) : 0, habitos };
  });
}

const LIMITE_CONTEXTO = 6000;

/** Texto compacto con los hábitos del usuario, que se envía al asistente como contexto. */
export function construirContexto(analisis: AnalisisPagina[], hoy: string, ventana: number): string {
  const lineas = [`Fecha de hoy: ${hoy} (${DIAS[parseISO(hoy).getDay()]}).`];
  if (analisis.length === 0) {
    lineas.push('El usuario todavía no tiene ninguna página de hábitos.');
  } else {
    lineas.push(`El usuario tiene ${analisis.length} página(s) de hábitos. Datos de los últimos ${ventana} días:`);
    for (const p of analisis) {
      lineas.push(`\nPágina "${p.titulo}" — cumplimiento global ${p.pct}%.`);
      if (p.quote) lineas.push(`  Cita: ${p.quote}`);
      if (p.reglas.length) lineas.push(`  Reglas: ${p.reglas.map((r, i) => `${i + 1}) ${r}`).join(' ')}`);
      for (const h of p.habitos) {
        lineas.push(`  - ${h.emoji} ${h.nombre}: ${h.hechos}/${h.dias} días (${h.pct}%), racha actual ${h.racha}`);
      }
    }
  }
  const texto = lineas.join('\n');
  return texto.length > LIMITE_CONTEXTO ? `${texto.slice(0, LIMITE_CONTEXTO)}\n[…recortado]` : texto;
}
