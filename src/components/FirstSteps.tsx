import { useState } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff, Play, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTour } from '../context/TourContext';
import { guardarOnboarding, ONBOARDING_INICIAL, PASOS, pasosPendientes } from '../lib/onboarding';

/** Checklist de «Primeros pasos» del Dashboard. El progreso se guarda en el perfil del usuario. */
export default function FirstSteps() {
  const { user } = useAuth();
  const { profile } = useData();
  const tour = useTour();
  const [plegado, setPlegado] = useState(false);
  const onb = profile?.onboarding;
  if (!user || !onb) return null;

  const hechos = new Set(onb.pasos);
  const pendientes = pasosPendientes(onb);
  const porcentaje = Math.round(((PASOS.length - pendientes) * 100) / PASOS.length);
  const guardar = (cambios: Partial<typeof onb>) => void guardarOnboarding(user.uid, { ...onb, ...cambios }).catch(() => alert('No se pudo guardar.'));

  if (onb.oculto) {
    return (
      <div className="mb-6">
        <button type="button" className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted hover:bg-hover" onClick={() => guardar({ oculto: false })}>
          <Eye size={14} /> Mostrar primeros pasos ({pendientes})
        </button>
      </div>
    );
  }

  const titulo =
    pendientes === 0
      ? '¡Todo listo! Has completado los primeros pasos'
      : `Primeros pasos: ${pendientes} ${pendientes === 1 ? 'pendiente' : 'pendientes'} para empezar`;

  return (
    <section className="mb-8 rounded-lg border border-line" aria-label="Primeros pasos" data-tour="primeros-pasos">
      <div className="flex flex-wrap items-center gap-2 p-4">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{titulo}</h2>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-hover" role="progressbar" aria-label="Progreso de los primeros pasos" aria-valuemin={0} aria-valuemax={100} aria-valuenow={porcentaje}>
              <div className="h-full bg-accent transition-all" style={{ width: `${porcentaje}%` }} />
            </div>
            <span className="text-xs text-muted">
              {PASOS.length - pendientes}/{PASOS.length}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary !py-1 text-sm" onClick={tour.iniciar}>
            <Play size={14} /> Iniciar tour guiado
          </button>
          <button type="button" className="btn !py-1 text-sm" onClick={() => guardar({ oculto: true })}>
            <EyeOff size={14} /> Ocultar
          </button>
          <button
            type="button"
            className="rounded-md p-1.5 text-muted hover:bg-hover"
            aria-label={plegado ? 'Expandir primeros pasos' : 'Contraer primeros pasos'}
            aria-expanded={!plegado}
            onClick={() => setPlegado((p) => !p)}
          >
            {plegado ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
      </div>

      {!plegado && (
        <>
          <ol className="border-t border-line">
            {PASOS.map((p, i) => {
              const hecho = hechos.has(p.id);
              return (
                <li key={p.id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0" data-paso={p.id} data-hecho={hecho}>
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs ${hecho ? 'bg-accent text-white' : 'border border-line text-muted'}`}>{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className={`font-bold ${hecho ? 'text-muted line-through' : ''}`}>{p.titulo}</div>
                    <div className="text-sm text-muted">{p.porQue}</div>
                  </div>
                  {hecho ? (
                    <span className="shrink-0 text-sm text-accent">✓ Hecho</span>
                  ) : (
                    <button type="button" className="btn shrink-0 !py-1 text-sm" onClick={() => tour.hacer(p.id)} aria-label={`Hacerlo: ${p.titulo}`}>
                      Hacerlo
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
          <div className="flex justify-end border-t border-line px-4 py-2">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg hover:underline"
              onClick={() => guardar({ ...ONBOARDING_INICIAL, tourVisto: true })}
            >
              <RotateCcw size={13} /> Reiniciar pasos
            </button>
          </div>
        </>
      )}
    </section>
  );
}
