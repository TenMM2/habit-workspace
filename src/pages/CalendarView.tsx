import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useAllDays } from '../hooks/useDays';
import { dayNumber, monthDays, monthLabel, parseISO, shiftMonth, todayISO } from '../lib/dates';
import { resumenDia } from '../lib/stats';

const CABECERA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/** Calendario mensual: el color de cada día indica qué parte de todos tus hábitos cumpliste. */
export default function CalendarView() {
  const { user } = useAuth();
  const { pages } = useData();
  const hoy = todayISO();
  const ahora = new Date();
  const [cursor, setCursor] = useState({ year: ahora.getFullYear(), month: ahora.getMonth() });

  const fechas = useMemo(() => monthDays(cursor.year, cursor.month), [cursor]);
  const data = useAllDays(user?.uid ?? '', user ? pages : [], fechas[0], fechas[fechas.length - 1]);

  // Huecos hasta el primer lunes
  const huecos = (parseISO(fechas[0]).getDay() + 6) % 7;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
      <div className="mb-4 flex items-center">
        <h1 className="flex-1 text-3xl font-bold capitalize">{monthLabel(cursor.year, cursor.month)}</h1>
        <button type="button" className="rounded-md p-2 hover:bg-hover" aria-label="Mes anterior" onClick={() => setCursor((c) => shiftMonth(c.year, c.month, -1))}>
          <ChevronLeft size={18} />
        </button>
        <button type="button" className="rounded-md p-2 hover:bg-hover" aria-label="Mes siguiente" onClick={() => setCursor((c) => shiftMonth(c.year, c.month, 1))}>
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center text-xs text-muted">
        {CABECERA.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-1.5">
        {Array.from({ length: huecos }, (_, i) => (
          <div key={`h${i}`} />
        ))}
        {fechas.map((f) => {
          const { hechos, total } = resumenDia(pages, data, f);
          const ratio = total ? hechos / total : 0;
          const futuro = f > hoy;
          return (
            <div
              key={f}
              title={`${f}: ${hechos}/${total}`}
              className={`grid aspect-square place-items-center rounded-md border text-sm ${f === hoy ? 'border-accent' : 'border-line'} ${futuro ? 'opacity-40' : ''}`}
              style={ratio > 0 ? { background: `color-mix(in srgb, var(--accent) ${Math.round(20 + ratio * 70)}%, transparent)` } : undefined}
            >
              {dayNumber(f)}
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-sm text-muted">Cuanto más intenso el color, más hábitos completaste ese día.</p>
    </div>
  );
}
