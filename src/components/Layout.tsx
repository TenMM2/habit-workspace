import { useCallback, useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { PanelLeft } from 'lucide-react';
import Sidebar from './Sidebar';
import SearchModal from './SearchModal';
import SettingsModal, { type PestanaAjustes } from './SettingsModal';
import AssistantWidget from './AssistantWidget';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { DEFAULT_BANNER } from '../lib/banners';
import { crearPagina } from '../lib/db';
import { FREE_PAGE_LIMIT } from '../types';

const CLAVE_COLAPSADA = 'hw-sidebar-collapsed';

function leerColapsada(): boolean {
  try {
    return localStorage.getItem(CLAVE_COLAPSADA) === '1';
  } catch {
    return false;
  }
}

export default function Layout() {
  const { user } = useAuth();
  const { pages, plan, profile, error } = useData();
  const navigate = useNavigate();

  const [colapsada, setColapsada] = useState(leerColapsada); // escritorio
  const [cajon, setCajon] = useState(false); // móvil / tablet
  const [buscando, setBuscando] = useState(false);
  const [ajustes, setAjustes] = useState<PestanaAjustes | null>(null);
  const [asistente, setAsistente] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_COLAPSADA, colapsada ? '1' : '0');
    } catch {
      /* sin almacenamiento: no se recuerda */
    }
  }, [colapsada]);

  // Atajo Ctrl+K / Cmd+K
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setBuscando(true);
      }
    };
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, []);

  const nuevaPagina = useCallback(async () => {
    if (!user) return;
    if (plan === 'free' && pages.length >= FREE_PAGE_LIMIT) {
      setAjustes('plan');
      return;
    }
    try {
      const id = await crearPagina(user.uid, 'Nueva página', profile?.bannerURL ?? DEFAULT_BANNER);
      setCajon(false);
      navigate(`/p/${id}`);
    } catch {
      alert('No se pudo crear la página. Inténtalo de nuevo.');
    }
  }, [user, plan, pages.length, profile?.bannerURL, navigate]);

  const cerrarCajon = () => setCajon(false);
  /** Acciones de la barra lateral; en móvil primero se cierra el cajón. */
  const accion = (fn: () => void) => () => {
    setCajon(false);
    fn();
  };

  const barra = (
    <Sidebar
      onNavigate={cerrarCajon}
      onSearch={accion(() => setBuscando(true))}
      onNewPage={() => void nuevaPagina()}
      onUpgrade={accion(() => setAjustes('plan'))}
      onAssistant={accion(() => setAsistente(true))}
      onSettings={accion(() => setAjustes('cuenta'))}
    />
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Escritorio */}
      {!colapsada && (
        <aside className="hidden w-64 shrink-0 border-r border-line bg-side md:block" aria-label="Barra lateral">
          {barra}
        </aside>
      )}

      {/* Móvil / tablet: cajón táctil */}
      {cajon && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={cerrarCajon}>
          <div className="absolute inset-0 bg-black/50" />
          <aside
            className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-line bg-side shadow-xl"
            onClick={(e) => e.stopPropagation()}
            aria-label="Barra lateral"
          >
            {barra}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-1 border-b border-line px-3 py-2">
          <button
            type="button"
            className="rounded-md p-2 text-muted hover:bg-hover hover:text-fg"
            onClick={() => (window.matchMedia('(min-width: 768px)').matches ? setColapsada((c) => !c) : setCajon(true))}
            aria-label="Mostrar u ocultar la barra lateral"
          >
            <PanelLeft size={18} />
          </button>
          <div className="flex-1" />
          <ThemeToggle />
        </header>
        {error && (
          <div className="border-b border-line bg-side px-4 py-2 text-sm text-red-500" role="alert">
            {error}
          </div>
        )}
        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet context={{ nuevaPagina: () => void nuevaPagina() }} />
        </main>
      </div>

      {buscando && <SearchModal onClose={() => setBuscando(false)} />}
      {ajustes && <SettingsModal inicial={ajustes} onClose={() => setAjustes(null)} />}
      <AssistantWidget abierto={asistente} onAbrir={setAsistente} onNecesitaPlan={() => setAjustes('plan')} />
    </div>
  );
}
