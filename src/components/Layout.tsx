import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { PanelLeft } from 'lucide-react';
import Sidebar from './Sidebar';
import SearchModal from './SearchModal';
import SettingsModal, { type PestanaAjustes } from './SettingsModal';
import AssistantWidget from './AssistantWidget';
import ThemeToggle from './ThemeToggle';
import OnboardingTour from './OnboardingTour';
import { TourContext } from '../context/TourContext';
import { guardarOnboarding, inferirPasos, PASOS, type PasoId } from '../lib/onboarding';
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
  const { pages, plan, profile, error, loading } = useData();
  const navigate = useNavigate();
  const location = useLocation();

  const [colapsada, setColapsada] = useState(leerColapsada); // escritorio
  const [cajon, setCajon] = useState(false); // móvil / tablet
  const [buscando, setBuscando] = useState(false);
  const [ajustes, setAjustes] = useState<PestanaAjustes | null>(null);
  const [asistente, setAsistente] = useState(false);
  const [avisoLimite, setAvisoLimite] = useState(false);
  const creando = useRef(false); // evita páginas duplicadas (y saltarse el límite Free) con clics rápidos
  const [ajustesKey, setAjustesKey] = useState(0); // fuerza un modal nuevo (pestaña inicial correcta) cada vez que se abre
  const [tour, setTour] = useState<number | null>(null); // índice del paso del tour guiado, o null si está cerrado
  const abiertoPorTour = useRef(false);
  const autoLanzado = useRef(false);

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

  const abrirAjustes = useCallback((pestana: PestanaAjustes, limite = false) => {
    setAvisoLimite(limite);
    setAjustesKey((k) => k + 1);
    setAjustes(pestana);
  }, []);

  const nuevaPagina = useCallback(async () => {
    if (!user || creando.current) return;
    if (plan === 'free' && pages.length >= FREE_PAGE_LIMIT) {
      abrirAjustes('plan', true);
      return;
    }
    creando.current = true;
    try {
      const id = await crearPagina(user.uid, 'Nueva página', profile?.bannerURL ?? DEFAULT_BANNER);
      setCajon(false);
      navigate(`/p/${id}`);
    } catch {
      alert('No se pudo crear la página. Inténtalo de nuevo.');
    } finally {
      // Se libera tras un instante para que `pages` ya refleje la página nueva antes de comprobar el límite otra vez
      setTimeout(() => (creando.current = false), 150);
    }
  }, [user, plan, pages.length, profile?.bannerURL, navigate, abrirAjustes]);

  // ── Onboarding ────────────────────────────────────────────────────────────────────────────────────
  // Cuentas anteriores a esta función: se deducen los pasos ya cumplidos y no se lanza el tour solo
  useEffect(() => {
    if (!user || !profile || loading || profile.onboarding) return;
    void guardarOnboarding(user.uid, { pasos: inferirPasos(profile, pages), oculto: false, tourVisto: true }).catch(() => undefined);
  }, [user, profile, loading, pages]);

  // Cuenta nueva: el tour se lanza solo la primera vez
  useEffect(() => {
    const o = profile?.onboarding;
    if (user && o && !o.tourVisto && !autoLanzado.current && tour === null && !loading) {
      autoLanzado.current = true;
      setTour(0);
      // Se da por visto al lanzarlo, no al cerrarlo: así no reaparece aunque se recargue la página con el tour abierto
      void guardarOnboarding(user.uid, { ...o, tourVisto: true }).catch(() => undefined);
    }
  }, [user, profile?.onboarding, loading, tour]);

  const primeraPagina = pages[0]?.id;
  const pasoActual = tour === null ? null : PASOS[tour];
  /** Dónde está el elemento que ilumina cada paso (con alternativa si aún no hay páginas). */
  const destino = useMemo(() => {
    if (!pasoActual) return null;
    const pagina = (selector: string) =>
      primeraPagina ? { ruta: `/p/${primeraPagina}`, selector } : { ruta: null, selector: '[data-tour="nueva-pagina"]' };
    switch (pasoActual.id) {
      case 'perfil':
        return { ruta: null, selector: '[data-tour="perfil-foto"]' };
      case 'pagina':
        return pagina('[data-tour="cabecera"]');
      case 'reglas':
        return pagina('[data-tour="reglas"]');
      case 'habitos':
        return pagina('[data-tour="habitos-btn"]');
      case 'marca':
        return pagina('[data-tour="tabla"]');
      case 'calendario':
        return { ruta: '/calendario', selector: '[data-tour="calendario-grid"]' };
      case 'asistente':
        return { ruta: null, selector: '[data-tour="asistente-panel"]' };
    }
  }, [pasoActual, primeraPagina]);

  // Prepara la pantalla de cada paso: abre/cierra el modal o el asistente y navega a la ruta del paso
  useEffect(() => {
    if (tour === null || !destino || !pasoActual) return;
    if (pasoActual.id === 'perfil') {
      abrirAjustes('cuenta');
      abiertoPorTour.current = true;
    } else if (abiertoPorTour.current) {
      setAjustes(null);
      abiertoPorTour.current = false;
    }
    if (pasoActual.id === 'asistente') setAsistente(true);
    setCajon(false);
    if (destino.ruta && location.pathname !== destino.ruta) navigate(destino.ruta);
    // La ruta actual no es dependencia a propósito: solo se navega al cambiar de paso, no cada vez que el usuario se mueve
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour, destino?.ruta]);

  const cerrarTour = useCallback(() => {
    setTour(null);
    if (abiertoPorTour.current) {
      setAjustes(null);
      abiertoPorTour.current = false;
    }
    const o = profile?.onboarding;
    if (user && o && !o.tourVisto) void guardarOnboarding(user.uid, { ...o, tourVisto: true }).catch(() => undefined);
  }, [user, profile?.onboarding]);

  const hacerPaso = useCallback(
    async (id: PasoId) => {
      if (id === 'pagina' && pages.length === 0) await nuevaPagina();
      setTour(PASOS.findIndex((p) => p.id === id));
    },
    [pages.length, nuevaPagina]
  );
  const control = useMemo(
    () => ({ iniciar: () => setTour(0), hacer: (id: PasoId) => void hacerPaso(id), activo: tour !== null }),
    [hacerPaso, tour]
  );

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
      onUpgrade={accion(() => abrirAjustes('plan'))}
      onAssistant={accion(() => setAsistente(true))}
      onSettings={accion(() => abrirAjustes('cuenta'))}
      onTour={accion(() => setTour(0))}
    />
  );

  return (
    <TourContext.Provider value={control}>
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
      {ajustes && <SettingsModal key={ajustesKey} inicial={ajustes} avisoLimite={avisoLimite} onClose={() => setAjustes(null)} />}
      <AssistantWidget abierto={asistente} onAbrir={setAsistente} onNecesitaPlan={() => abrirAjustes('plan', true)} />
      {tour !== null && pasoActual && destino && (
        <OnboardingTour
          indice={tour}
          total={PASOS.length}
          titulo={pasoActual.titulo}
          texto={pasoActual.tourTexto}
          selector={destino.selector}
          onAnterior={() => setTour((i) => (i === null ? i : Math.max(0, i - 1)))}
          onSiguiente={() => setTour((i) => (i === null ? i : Math.min(PASOS.length - 1, i + 1)))}
          onCerrar={cerrarTour}
        />
      )}
    </div>
    </TourContext.Provider>
  );
}
