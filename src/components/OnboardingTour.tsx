import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { colocarPopover, type Caja, type Colocacion } from '../lib/tourPosition';

interface Props {
  indice: number;
  total: number;
  titulo: string;
  texto: string;
  /** Selector CSS del elemento real que se ilumina; si no existe en pantalla, la ventanita se centra. */
  selector: string | null;
  onAnterior: () => void;
  onSiguiente: () => void;
  onCerrar: () => void;
}

const ESPERA_MAX_MS = 3000;
const RELLENO = 6;

/** Primer elemento visible que cumple el selector (la barra lateral existe dos veces: escritorio y cajón móvil). */
function buscar(selector: string): HTMLElement | null {
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

const aCaja = (r: DOMRect): Caja => ({ top: r.top, left: r.left, width: r.width, height: r.height });
const igual = (a: Caja | null, b: Caja | null) =>
  a === b || (!!a && !!b && Math.abs(a.top - b.top) < 1 && Math.abs(a.left - b.left) < 1 && Math.abs(a.width - b.width) < 1 && Math.abs(a.height - b.height) < 1);

/**
 * Tour guiado propio (sin librerías): oscurece la pantalla, ilumina el elemento real y muestra una ventanita con
 * título, explicación y controles. Se recoloca si cambia el tamaño de la ventana, hay scroll o el elemento se mueve.
 */
export default function OnboardingTour({ indice, total, titulo, texto, selector, onAnterior, onSiguiente, onCerrar }: Props) {
  const [caja, setCaja] = useState<Caja | null>(null);
  const [pos, setPos] = useState<Colocacion | null>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const siguienteRef = useRef<HTMLButtonElement>(null);
  const ultimo = indice === total - 1;

  // Localiza el elemento (puede tardar en aparecer si hay que cambiar de ruta) y sigue su posición
  useEffect(() => {
    setCaja(null);
    if (!selector) return;
    let desplazado = false;
    const inicio = Date.now();
    const medir = () => {
      const el = buscar(selector);
      if (!el) {
        if (Date.now() - inicio > ESPERA_MAX_MS) setCaja((c) => (c === null ? c : null));
        return;
      }
      if (!desplazado) {
        desplazado = true;
        el.scrollIntoView({ block: 'center', inline: 'nearest' });
      }
      const nueva = aCaja(el.getBoundingClientRect());
      setCaja((c) => (igual(c, nueva) ? c : nueva));
    };
    medir();
    const id = window.setInterval(medir, 150);
    window.addEventListener('resize', medir);
    window.addEventListener('scroll', medir, true);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('resize', medir);
      window.removeEventListener('scroll', medir, true);
    };
  }, [selector, indice]);

  // Coloca la ventanita una vez que se conoce su tamaño real
  useLayoutEffect(() => {
    const p = popRef.current;
    if (!p) return;
    const nueva = colocarPopover(caja, { w: 340, h: p.offsetHeight }, window.innerWidth, window.innerHeight);
    setPos((a) => (a && a.top === nueva.top && a.left === nueva.left && a.width === nueva.width ? a : nueva));
  }, [caja, indice, titulo, texto]);

  useEffect(() => {
    siguienteRef.current?.focus();
  }, [indice]);

  // Teclado: flechas para moverse y Esc para cerrar (sin interferir al escribir en un campo).
  // El oyente se registra una sola vez, en fase de captura y leyendo siempre las últimas funciones desde una referencia:
  // si se volviera a registrar en cada render, otro oyente de Esc (el del modal de Ajustes) podría provocar un render
  // en mitad del mismo evento y este oyente se perdería.
  const ultimas = useRef({ indice, ultimo, onAnterior, onSiguiente, onCerrar });
  ultimas.current = { indice, ultimo, onAnterior, onSiguiente, onCerrar };
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      const u = ultimas.current;
      const t = e.target as HTMLElement | null;
      const escribiendo = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if (e.key === 'Escape') u.onCerrar();
      else if (!escribiendo && e.key === 'ArrowRight') u.ultimo ? u.onCerrar() : u.onSiguiente();
      else if (!escribiendo && e.key === 'ArrowLeft' && u.indice > 0) u.onAnterior();
    };
    document.addEventListener('keydown', alTeclear, true);
    return () => document.removeEventListener('keydown', alTeclear, true);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[70]" data-testid="tour">
      {caja ? (
        <div
          aria-hidden="true"
          data-testid="tour-foco"
          className="absolute rounded-lg border-2 border-accent transition-all duration-200"
          style={{
            top: caja.top - RELLENO,
            left: caja.left - RELLENO,
            width: caja.width + RELLENO * 2,
            height: caja.height + RELLENO * 2,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
          }}
        />
      ) : (
        <div aria-hidden="true" className="absolute inset-0 bg-black/55" />
      )}

      <div
        ref={popRef}
        role="dialog"
        aria-label="Tour guiado"
        aria-live="polite"
        className="pointer-events-auto absolute rounded-xl border border-line bg-app p-4 shadow-2xl"
        style={{ top: pos?.top ?? 0, left: pos?.left ?? 0, width: pos?.width ?? 340, visibility: pos ? 'visible' : 'hidden' }}
      >
        <div className="mb-2 flex items-center justify-between text-xs text-muted">
          <span>
            Paso {indice + 1} de {total}
          </span>
          <span className="flex gap-1" aria-hidden="true">
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === indice ? 'bg-accent' : i < indice ? 'bg-accent/50' : 'bg-hover'}`} />
            ))}
          </span>
        </div>
        <h2 className="mb-1 font-semibold">{titulo}</h2>
        <p className="mb-4 text-sm text-muted">{texto}</p>
        <div className="flex items-center gap-2">
          <button type="button" className="mr-auto text-sm text-muted hover:text-fg hover:underline" onClick={onCerrar}>
            Saltar tutorial
          </button>
          <button type="button" className="btn !py-1 text-sm" onClick={onAnterior} disabled={indice === 0}>
            Anterior
          </button>
          <button ref={siguienteRef} type="button" className="btn btn-primary !py-1 text-sm" onClick={ultimo ? onCerrar : onSiguiente}>
            {ultimo ? 'Finalizar' : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>
  );
}
