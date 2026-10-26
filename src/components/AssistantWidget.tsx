import { Fragment, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Send, Sparkles, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useAllDays } from '../hooks/useDays';
import { analizar } from '../lib/aiContext';
import { preguntarAsistente, type Mensaje } from '../lib/assistant';
import { DEFAULT_BANNER } from '../lib/banners';
import { todayISO } from '../lib/dates';
import { crearPaginaCon, nuevoId } from '../lib/db';
import { marcarPaso } from '../lib/onboarding';
import type { PaginaPropuesta } from '../lib/paginaPropuesta';
import { FREE_PAGE_LIMIT } from '../types';

const VENTANA = 30; // días de historial que ve el asistente

interface Burbuja extends Mensaje {
  id: number;
  pagina?: PaginaPropuesta;
  origen?: 'gemini' | 'respaldo';
  modelo?: string;
  creada?: boolean;
}

const SUGERENCIAS = ['Resumen semanal', '¿Qué hábitos estoy fallando?', 'Consejos de constancia', 'Crea una página de gimnasio'];

/** Negritas **así** sin usar innerHTML: el texto siempre se pinta como texto. */
function conNegritas(texto: string) {
  return texto.split('**').map((trozo, i) => (i % 2 === 1 ? <strong key={i}>{trozo}</strong> : <Fragment key={i}>{trozo}</Fragment>));
}

interface Props {
  abierto: boolean;
  onAbrir: (abierto: boolean) => void;
  onNecesitaPlan: () => void;
}

export default function AssistantWidget({ abierto, onAbrir, onNecesitaPlan }: Props) {
  const { user } = useAuth();
  const { pages, plan, profile } = useData();
  const navigate = useNavigate();

  const hoy = todayISO();
  const desde = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - (VENTANA - 1));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, [hoy]);
  // Solo se suscribe a los días mientras el panel está abierto
  const data = useAllDays(user?.uid ?? '', user ? pages : [], desde, hoy, abierto);
  const analisis = useMemo(() => analizar(pages, data, hoy, VENTANA), [pages, data, hoy]);

  const [mensajes, setMensajes] = useState<Burbuja[]>([]);
  const [texto, setTexto] = useState('');
  const [pensando, setPensando] = useState(false);
  const contador = useRef(0);
  const creando = useRef(new Set<number>());
  const fin = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fin.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, pensando]);

  useEffect(() => {
    if (abierto) campo.current?.focus();
  }, [abierto]);

  // Al cerrar sesión se borra la conversación
  useEffect(() => {
    if (!user) setMensajes([]);
  }, [user]);

  async function enviar(pregunta: string) {
    const limpia = pregunta.trim();
    if (!limpia || pensando) return;
    if (user) marcarPaso(user.uid, 'asistente');
    const nueva: Burbuja = { id: ++contador.current, rol: 'user', texto: limpia.slice(0, 2000) };
    const historial = [...mensajes, nueva];
    setMensajes(historial);
    setTexto('');
    setPensando(true);
    const r = await preguntarAsistente(historial, analisis, hoy, VENTANA);
    setMensajes((m) => [...m, { id: ++contador.current, rol: 'assistant', texto: r.texto, pagina: r.pagina, origen: r.origen, modelo: r.modelo }]);
    setPensando(false);
  }

  async function crear(burbuja: Burbuja) {
    if (!user || !burbuja.pagina || creando.current.has(burbuja.id)) return;
    if (plan === 'free' && pages.length >= FREE_PAGE_LIMIT) {
      onNecesitaPlan();
      return;
    }
    const p = burbuja.pagina;
    creando.current.add(burbuja.id); // un doble clic no debe crear la página dos veces
    try {
      const id = await crearPaginaCon(user.uid, {
        title: p.title,
        icon: p.icon,
        avatarURL: null,
        bannerURL: profile?.bannerURL ?? DEFAULT_BANNER,
        quote: p.quote,
        rules: p.rules,
        habits: p.habits.map((h) => ({ id: nuevoId(), name: h.name, emoji: h.emoji })),
      });
      setMensajes((m) => m.map((x) => (x.id === burbuja.id ? { ...x, creada: true } : x)));
      navigate(`/p/${id}`);
    } catch {
      creando.current.delete(burbuja.id);
      setMensajes((m) => [...m, { id: ++contador.current, rol: 'assistant', texto: 'No pude crear la página. Inténtalo de nuevo.' }]);
    }
  }

  const ultima = [...mensajes].reverse().find((m) => m.origen);
  const ultimoOrigen = ultima?.origen;

  return (
    <>
      {abierto && (
        <section
          role="dialog"
          aria-label="Asistente IA"
          data-tour="asistente-panel"
          className="fixed bottom-20 right-4 z-40 flex h-[min(34rem,calc(100vh-7rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-line bg-app shadow-2xl"
        >
          <header className="flex items-center gap-2 border-b border-line px-3 py-2">
            <Sparkles size={16} className="text-accent" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">Asistente de hábitos</div>
              <div className="text-xs text-muted">
                {ultimoOrigen === 'respaldo' ? 'Modo respaldo (sin Gemini)' : ultimoOrigen === 'gemini' ? `Gemini · ${ultima?.modelo ?? 'Flash'}` : 'Conoce tus hábitos y tu progreso'}
              </div>
            </div>
            <button type="button" className="rounded p-1 text-muted hover:bg-hover" aria-label="Cerrar asistente" onClick={() => onAbrir(false)}>
              <X size={16} />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-3" aria-live="polite">
            {mensajes.length === 0 && (
              <div className="grid gap-3 text-sm">
                <p className="text-muted">Hola, soy tu asistente. Conozco tus páginas y tu progreso de los últimos {VENTANA} días. ¿Qué quieres saber?</p>
                <div className="flex flex-wrap gap-2">
                  {SUGERENCIAS.map((s) => (
                    <button key={s} type="button" className="rounded-full border border-line px-3 py-1 text-left text-xs hover:bg-hover" onClick={() => void enviar(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-3">
              {mensajes.map((m) => (
                <div key={m.id} className={m.rol === 'user' ? 'justify-self-end' : 'justify-self-start'}>
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                      m.rol === 'user' ? 'ml-auto bg-accent text-white' : 'border border-line bg-side'
                    }`}
                  >
                    {conNegritas(m.texto)}
                  </div>
                  {m.pagina && (
                    <div className="mt-2 max-w-[85%] rounded-lg border border-line p-3 text-sm">
                      <div className="mb-1 font-medium">
                        {m.pagina.icon} {m.pagina.title}
                      </div>
                      <div className="mb-2 text-xs text-muted">{m.pagina.habits.map((h) => `${h.emoji} ${h.name}`).join(' · ')}</div>
                      <button type="button" className="btn btn-primary !py-1 text-xs" disabled={m.creada} onClick={() => void crear(m)}>
                        <Plus size={14} /> {m.creada ? 'Página creada' : 'Crear esta página'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {pensando && (
                <div className="justify-self-start rounded-lg border border-line bg-side px-3 py-2 text-sm text-muted" role="status">
                  Pensando…
                </div>
              )}
              <div ref={fin} />
            </div>
          </div>

          <form
            className="flex gap-2 border-t border-line p-2"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              void enviar(texto);
            }}
          >
            <input
              ref={campo}
              className="input"
              placeholder="Escribe tu pregunta…"
              aria-label="Mensaje para el asistente"
              maxLength={500}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
            <button type="submit" className="btn btn-primary !px-3" disabled={pensando || !texto.trim()} aria-label="Enviar">
              <Send size={16} />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => onAbrir(!abierto)}
        aria-label={abierto ? 'Cerrar asistente IA' : 'Abrir asistente IA'}
        aria-expanded={abierto}
        className="fixed bottom-4 right-4 z-40 grid h-12 w-12 place-items-center rounded-full bg-accent text-white shadow-lg transition-transform hover:scale-105"
      >
        {abierto ? <X size={20} /> : <Sparkles size={20} />}
      </button>
    </>
  );
}
