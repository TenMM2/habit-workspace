import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Home, Search } from 'lucide-react';
import { useData } from '../context/DataContext';

interface Resultado {
  clave: string;
  etiqueta: string;
  ruta: string;
  icono: JSX.Element;
}

/** Buscador rápido (Ctrl+K): salta a una página o sección con el teclado. */
export default function SearchModal({ onClose }: { onClose: () => void }) {
  const { pages } = useData();
  const navigate = useNavigate();
  const [texto, setTexto] = useState('');
  const [activo, setActivo] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  const resultados = useMemo<Resultado[]>(() => {
    const todos: Resultado[] = [
      { clave: 'inicio', etiqueta: 'Inicio', ruta: '/', icono: <Home size={16} /> },
      { clave: 'cal', etiqueta: 'Calendario', ruta: '/calendario', icono: <CalendarDays size={16} /> },
      ...pages.map((p) => ({
        clave: p.id,
        etiqueta: p.title,
        ruta: `/p/${p.id}`,
        icono: <span className="text-sm">{p.icon}</span>,
      })),
    ];
    const t = texto.trim().toLowerCase();
    return t ? todos.filter((r) => r.etiqueta.toLowerCase().includes(t)) : todos;
  }, [pages, texto]);

  function ir(r: Resultado | undefined) {
    if (!r) return;
    navigate(r.ruta);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-start bg-black/50 p-4 pt-[15vh]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buscar"
        className="mx-auto w-full max-w-lg overflow-hidden rounded-xl border border-line bg-app shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-line px-3">
          <Search size={16} className="text-muted" />
          <input
            ref={inputRef}
            className="w-full bg-transparent py-3 text-sm outline-none"
            placeholder="Buscar páginas…"
            aria-label="Buscar páginas"
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              setActivo(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActivo((a) => Math.min(a + 1, resultados.length - 1));
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActivo((a) => Math.max(a - 1, 0));
              }
              if (e.key === 'Enter') ir(resultados[activo]);
            }}
          />
        </div>
        <ul className="max-h-72 overflow-y-auto p-1">
          {resultados.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">Sin resultados</li>}
          {resultados.map((r, i) => (
            <li key={r.clave}>
              <button
                type="button"
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${i === activo ? 'bg-hover' : ''}`}
                onMouseEnter={() => setActivo(i)}
                onClick={() => ir(r)}
              >
                {r.icono} <span className="truncate">{r.etiqueta}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
