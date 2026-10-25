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
  const [elegido, setElegido] = useState<string | null>(null);

  const fechas = useMemo(() => monthDays(cursor.year, cursor.month), [cursor]);
  const data = useAllDays(user?.uid ?? '', user ? pages : [], fechas[0], fechas[fechas.length - 1]);

  // Huecos hasta el primer lunes
  const huecos = (parseISO(fechas[0]).getDay() + 6) % 7;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
      <div className="mb-4 flex items-center">
        <h1 className="flex-1 text-3xl font-bold capitalize">{monthLabel(cursor.year, cursor.month)}</h1>
        <button type="button" className="rounded-md p-2 hover:bg-hover" aria-label="Mes anterior" onClick={() => { setElegido(null); setCursor((c) => shiftMonth(c.year, c.month, -1)); }}>
          <ChevronLeft size={18} />
        </button>
        <button type="button" className="rounded-md p-2 hover:bg-hover" aria-label="Mes siguiente" onClick={() => { setElegido(null); setCursor((c) => shiftMonth(c.year, c.month, 1)); }}>
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
            <button
              type="button"
              key={f}
              title={`${f}: ${hechos}/${total}`}
              aria-label={`Día ${dayNumber(f)}: ${hechos} de ${total} hábitos`}
              aria-pressed={elegido === f}
              onClick={() => setElegido(elegido === f ? null : f)}
              className={`grid aspect-square place-items-center rounded-md border text-sm ${f === hoy ? 'border-accent' : 'border-line'} ${elegido === f ? 'ring-2 ring-accent' : ''} ${futuro ? 'opacity-40' : ''}`}
              style={ratio > 0 ? { background: `color-mix(in srgb, var(--accent) ${Math.round(20 + ratio * 70)}%, transparent)` } : undefined}
            >
              {dayNumber(f)}
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-sm text-muted">Cuanto más intenso el color, más hábitos completaste ese día. Pulsa un día para ver el detalle.</p>

      {elegido && (
        <section className="mt-6 rounded-lg border border-line p-4" aria-label="Detalle del día">
          <h2 className="mb-3 font-semibold capitalize">
            {parseISO(elegido).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h2>
          {pages.length === 0 ? (
            <p className="text-sm text-muted">Aún no tienes páginas de hábitos.</p>
          ) : (
            <div className="grid gap-4">
              {pages.map((p) => {
                const entrada = data[p.id]?.[elegido];
                return (
                  <div key={p.id}>
                    <div className="mb-1 text-sm font-medium">
                      {p.icon} {p.title}
                    </div>
                    <ul className="grid gap-0.5 text-sm">
                      {p.habits.map((h) => {
                        const hecho = entrada?.checks?.[h.id] === true;
                        return (
                          <li key={h.id} className={hecho ? '' : 'text-muted'}>
                            {hecho ? '✔' : '○'} {h.emoji} {h.name}
                          </li>
                        );
                      })}
                    </ul>
                    {entrada?.note && <p className="mt-1 text-sm italic text-muted">«{entrada.note}»</p>}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
