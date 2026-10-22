import { Link } from 'react-router-dom';
import { Flame, Layers, Plus, Target, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useAllDays } from '../hooks/useDays';
import { greeting, lastDays, todayISO } from '../lib/dates';
import { marcarHabito } from '../lib/db';
import { hechosEnDia, porcentajeUltimosDias, rachaGlobal, resumenDia } from '../lib/stats';

const VENTANA = 60; // días que se consultan para la racha

interface Props {
  onNewPage: () => void;
}

export default function Dashboard({ onNewPage }: Props) {
  const { user } = useAuth();
  const { pages, profile, loading } = useData();
  const hoy = todayISO();
  const dias = lastDays(hoy, VENTANA);
  const data = useAllDays(user?.uid ?? '', user ? pages : [], dias[0], hoy);

  if (!user) return null;
  if (loading) return <p className="p-8 text-muted" role="status">Cargando…</p>;

  const nombre = (profile?.displayName ?? user.displayName ?? '').split(' ')[0];
  const hoyRes = resumenDia(pages, data, hoy);
  const racha = rachaGlobal(pages, data, hoy, VENTANA);

  const metricas = [
    { icono: <Flame size={18} />, valor: racha >= VENTANA ? `${VENTANA}+` : String(racha), etiqueta: racha === 1 ? 'día de racha' : 'días de racha' },
    { icono: <Target size={18} />, valor: `${hoyRes.hechos}/${hoyRes.total}`, etiqueta: 'hábitos de hoy' },
    { icono: <TrendingUp size={18} />, valor: `${porcentajeUltimosDias(pages, data, hoy, 7)}%`, etiqueta: 'últimos 7 días' },
    { icono: <Layers size={18} />, valor: String(pages.length), etiqueta: pages.length === 1 ? 'página' : 'páginas' },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8">
      <h1 className="text-3xl font-bold">
        {greeting()}
        {nombre ? `, ${nombre}` : ''}
      </h1>
      <p className="mb-6 mt-1 text-muted">Así va tu constancia.</p>

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {metricas.map((m) => (
          <div key={m.etiqueta} className="rounded-lg border border-line p-4">
            <div className="mb-2 text-accent">{m.icono}</div>
            <div className="text-2xl font-semibold">{m.valor}</div>
            <div className="text-sm text-muted">{m.etiqueta}</div>
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Hoy</h2>
      {pages.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-10 text-center">
          <p className="mb-4 text-muted">Aún no tienes páginas. Crea la primera para empezar a registrar hábitos.</p>
          <button type="button" className="btn btn-primary" onClick={onNewPage}>
            <Plus size={16} /> Crear mi primera página
          </button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {pages.map((p) => {
            const hechos = hechosEnDia(p, data[p.id]?.[hoy]);
            const total = p.habits.length;
            return (
              <div key={p.id} className="rounded-lg border border-line p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-xl">{p.icon}</span>
                  <Link to={`/p/${p.id}`} className="min-w-0 flex-1 truncate font-medium hover:underline">
                    {p.title}
                  </Link>
                  <span className="text-sm text-muted">
                    {hechos}/{total}
                  </span>
                </div>
                <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-hover" aria-hidden="true">
                  <div className="h-full bg-accent transition-all" style={{ width: `${total ? (hechos * 100) / total : 0}%` }} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.habits.map((h) => {
                    const hecho = data[p.id]?.[hoy]?.checks?.[h.id] === true;
                    return (
                      <button
                        key={h.id}
                        type="button"
                        role="checkbox"
                        aria-checked={hecho}
                        onClick={() => void marcarHabito(user.uid, p.id, hoy, h.id, !hecho).catch(() => alert('No se pudo guardar.'))}
                        className={`flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors ${
                          hecho ? 'border-accent bg-accent-soft' : 'border-line hover:bg-hover'
                        }`}
                      >
                        <span>{h.emoji}</span> {h.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <button
            type="button"
            onClick={onNewPage}
            className="grid min-h-24 place-items-center rounded-lg border border-dashed border-line text-muted hover:bg-hover"
          >
            <span className="flex items-center gap-1">
              <Plus size={16} /> Añadir nueva página
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
