import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, MessageSquare, Plus, Settings2, Trash2 } from 'lucide-react';
import EditableText from '../EditableText';
import { useDays } from '../../hooks/useDays';
import { guardarNota, marcarHabito, nuevoId } from '../../lib/db';
import { dayNumber, monthDays, monthLabel, shiftMonth, todayISO, weekdayShort } from '../../lib/dates';
import { hechosEnDia } from '../../lib/stats';
import { MAX_HABITS_PER_PAGE, type HabitPage } from '../../types';

interface Props {
  uid: string;
  page: HabitPage;
  onChange: (cambios: Partial<Omit<HabitPage, 'id'>>) => Promise<void>;
}

type Filtro = 'todos' | 'pendientes' | 'completos';

/** Una sola rejilla: las columnas se reparten el ancho disponible (minmax(0,1fr)), así no hay scroll horizontal. */
const COLUMNAS =
  'grid-cols-[3.5rem_repeat(var(--n),minmax(0,1fr))] sm:grid-cols-[5.5rem_repeat(var(--n),minmax(0,1fr))_minmax(0,2.5fr)]';

export default function Tracker({ uid, page, onChange }: Props) {
  const hoy = todayISO();
  const ahora = new Date();
  const [cursor, setCursor] = useState({ year: ahora.getFullYear(), month: ahora.getMonth() });
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [gestionando, setGestionando] = useState(false);
  const [notaAbierta, setNotaAbierta] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fechas = useMemo(() => monthDays(cursor.year, cursor.month), [cursor]);
  const dias = useDays(uid, page.id, fechas[0], fechas[fechas.length - 1]);
  const n = page.habits.length;

  const resumen = useMemo(() => {
    let hechos = 0;
    let posibles = 0;
    for (const f of fechas) {
      if (f > hoy) break;
      posibles += n;
      hechos += hechosEnDia(page, dias[f]);
    }
    return posibles ? Math.round((hechos * 100) / posibles) : 0;
  }, [fechas, dias, page, hoy, n]);

  const visibles = fechas.filter((f) => {
    const completo = n > 0 && hechosEnDia(page, dias[f]) === n;
    if (filtro === 'completos') return completo;
    if (filtro === 'pendientes') return f <= hoy && !completo;
    return true;
  });

  async function intentar(accion: Promise<void>) {
    setError('');
    try {
      await accion;
    } catch {
      setError('No se pudo guardar el cambio. Revisa tu conexión.');
    }
  }

  const guardarHabitos = (habits: HabitPage['habits']) => intentar(onChange({ habits }));

  return (
    <section aria-label="Tracker diario">
      {/* Barra de herramientas */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center">
          <button type="button" className="rounded-md p-1.5 hover:bg-hover" aria-label="Mes anterior" onClick={() => setCursor((c) => shiftMonth(c.year, c.month, -1))}>
            <ChevronLeft size={18} />
          </button>
          <h2 className="min-w-36 text-center text-lg font-semibold capitalize">{monthLabel(cursor.year, cursor.month)}</h2>
          <button type="button" className="rounded-md p-1.5 hover:bg-hover" aria-label="Mes siguiente" onClick={() => setCursor((c) => shiftMonth(c.year, c.month, 1))}>
            <ChevronRight size={18} />
          </button>
        </div>
        <button
          type="button"
          className="btn !py-1 text-xs"
          onClick={() => setCursor({ year: ahora.getFullYear(), month: ahora.getMonth() })}
        >
          Hoy
        </button>
        <span className="text-sm text-muted">{resumen}% cumplido</span>

        <div className="ml-auto flex items-center gap-2">
          <select
            className="input !w-auto !py-1 text-xs"
            aria-label="Filtrar días"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value as Filtro)}
          >
            <option value="todos">Todos los días</option>
            <option value="pendientes">Pendientes</option>
            <option value="completos">Completos</option>
          </select>
          <button type="button" className="btn !py-1 text-xs" data-tour="habitos-btn" aria-expanded={gestionando} onClick={() => setGestionando((g) => !g)}>
            <Settings2 size={14} /> Hábitos
          </button>
        </div>
      </div>

      {/* Gestión de hábitos (columnas) */}
      {gestionando && (
        <div className="mb-4 grid gap-2 rounded-lg border border-line bg-side p-3">
          {page.habits.map((h, i) => (
            <div key={h.id} className="flex items-center gap-2">
              <input
                className="input !w-14 text-center"
                aria-label={`Emoji del hábito ${h.name}`}
                maxLength={4}
                defaultValue={h.emoji}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== h.emoji) void guardarHabitos(page.habits.map((x, j) => (j === i ? { ...x, emoji: v } : x)));
                }}
              />
              <EditableText
                ariaLabel={`Nombre del hábito ${i + 1}`}
                value={h.name}
                maxLength={40}
                className="text-sm"
                onCommit={(v) => void guardarHabitos(page.habits.map((x, j) => (j === i ? { ...x, name: v } : x)))}
              />
              <button
                type="button"
                className="rounded p-1.5 text-muted hover:bg-hover hover:text-red-500"
                aria-label={`Eliminar hábito ${h.name}`}
                onClick={() => {
                  if (confirm(`¿Eliminar el hábito "${h.name}"?`)) void guardarHabitos(page.habits.filter((_, j) => j !== i));
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {n < MAX_HABITS_PER_PAGE ? (
            <button
              type="button"
              className="flex items-center gap-1 justify-self-start rounded-md px-2 py-1 text-sm text-muted hover:bg-hover"
              onClick={() => void guardarHabitos([...page.habits, { id: nuevoId(), name: 'Nuevo hábito', emoji: '✅' }])}
            >
              <Plus size={14} /> Añadir nuevo hábito
            </button>
          ) : (
            <p className="text-xs text-muted">Máximo {MAX_HABITS_PER_PAGE} hábitos por página para que la tabla quepa sin scroll lateral.</p>
          )}
        </div>
      )}

      {error && (
        <p className="mb-2 text-sm text-red-500" role="alert">
          {error}
        </p>
      )}

      {n === 0 ? (
        <p className="py-8 text-center text-muted">Esta página no tiene hábitos. Pulsa «Hábitos» para añadir el primero.</p>
      ) : (
        <div role="table" aria-label="Seguimiento diario" data-tour="tabla" style={{ '--n': n } as React.CSSProperties}>
          {/* Cabecera */}
          <div role="row" className={`grid ${COLUMNAS} items-end gap-1 border-b border-line pb-1 text-center text-xs text-muted`}>
            <div role="columnheader" className="text-left">Día</div>
            {page.habits.map((h) => (
              <div key={h.id} role="columnheader" title={h.name} className="min-w-0">
                <div className="text-lg leading-none">{h.emoji}</div>
                <div className="hidden truncate sm:block">{h.name}</div>
              </div>
            ))}
            <div role="columnheader" className="hidden text-left sm:block">Notas</div>
          </div>

          {/* Filas */}
          {visibles.length === 0 && <p className="py-6 text-center text-sm text-muted">No hay días que coincidan con el filtro.</p>}
          {visibles.map((f) => {
            const entry = dias[f];
            const futuro = f > hoy;
            const esHoy = f === hoy;
            const abierta = notaAbierta === f;
            return (
              <div key={f} role="row" className={`border-b border-line ${esHoy ? 'bg-hover' : ''}`}>
                <div className={`grid ${COLUMNAS} items-center gap-1 py-1`}>
                  <button
                    type="button"
                    role="rowheader"
                    className="flex items-baseline gap-1 text-left text-sm sm:cursor-default"
                    onClick={() => setNotaAbierta(abierta ? null : f)}
                    aria-label={`Día ${dayNumber(f)}, ${entry?.note ? 'con nota' : 'sin nota'}`}
                  >
                    <span className="font-medium">{dayNumber(f)}</span>
                    <span className="text-xs text-muted">{weekdayShort(f)}</span>
                    {entry?.note && <MessageSquare size={11} className="text-muted sm:hidden" />}
                  </button>

                  {page.habits.map((h) => {
                    const hecho = entry?.checks?.[h.id] === true;
                    return (
                      <div key={h.id} role="cell" className="grid place-items-center">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={hecho}
                          aria-label={`${h.name}, día ${dayNumber(f)}`}
                          disabled={futuro}
                          onClick={() => void intentar(marcarHabito(uid, page.id, f, h.id, !hecho))}
                          className={`grid h-9 w-full max-w-11 place-items-center rounded-md border text-lg transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
                            hecho ? 'border-accent bg-accent-soft' : 'border-line hover:bg-hover'
                          }`}
                        >
                          {hecho ? h.emoji : ''}
                        </button>
                      </div>
                    );
                  })}

                  <div role="cell" className="hidden sm:block">
                    <EditableText
                      ariaLabel={`Nota del día ${dayNumber(f)}`}
                      value={entry?.note ?? ''}
                      allowEmpty
                      maxLength={200}
                      placeholder={futuro ? '' : 'Añadir nota…'}
                      className="text-sm"
                      onCommit={(v) => void intentar(guardarNota(uid, page.id, f, v))}
                    />
                  </div>
                </div>
                {abierta && (
                  <div className="pb-2 sm:hidden">
                    <EditableText
                      ariaLabel={`Nota del día ${dayNumber(f)}`}
                      value={entry?.note ?? ''}
                      allowEmpty
                      maxLength={200}
                      placeholder="Añadir nota…"
                      className="text-sm"
                      onCommit={(v) => void intentar(guardarNota(uid, page.id, f, v))}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
