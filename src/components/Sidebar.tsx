import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { CalendarDays, ChevronUp, Home, LogOut, Plus, Search, Settings, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { FREE_PAGE_LIMIT } from '../types';

interface Props {
  onNavigate: () => void;
  onSearch: () => void;
  onNewPage: () => void;
  onUpgrade: () => void;
  onAssistant: () => void;
  onSettings: () => void;
}

const enlace = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-hover ${isActive ? 'bg-hover font-medium' : 'text-muted'}`;

export default function Sidebar({ onNavigate, onSearch, onNewPage, onUpgrade, onAssistant, onSettings }: Props) {
  const { user, logout } = useAuth();
  const { pages, plan, profile } = useData();
  const [menu, setMenu] = useState(false);
  const nombre = profile?.displayName ?? user?.displayName ?? user?.email ?? 'Usuario';
  const foto = profile?.photoURL ?? user?.photoURL ?? null;

  return (
    <div className="flex h-full flex-col gap-1 p-2">
      <button
        type="button"
        onClick={onSearch}
        className="mb-1 flex items-center gap-2 rounded-md border border-line px-2 py-1.5 text-sm text-muted hover:bg-hover"
      >
        <Search size={15} /> Buscar
        <kbd className="ml-auto rounded border border-line px-1.5 text-xs">Ctrl K</kbd>
      </button>

      <nav className="grid gap-0.5" aria-label="Principal">
        <NavLink to="/" end className={enlace} onClick={onNavigate}>
          <Home size={16} /> Inicio
        </NavLink>
        <button type="button" className={enlace({ isActive: false })} onClick={onAssistant}>
          <Sparkles size={16} /> Asistente IA
        </button>
        <NavLink to="/calendario" className={enlace} onClick={onNavigate}>
          <CalendarDays size={16} /> Calendario
        </NavLink>
      </nav>

      <div className="mt-3 flex items-center justify-between px-2 text-xs font-medium uppercase tracking-wide text-muted">
        Mis páginas de hábitos
        <button type="button" className="rounded p-1 hover:bg-hover" onClick={onNewPage} aria-label="Añadir nueva página">
          <Plus size={14} />
        </button>
      </div>
      <nav className="grid min-h-0 flex-1 content-start gap-0.5 overflow-y-auto" aria-label="Páginas de hábitos">
        {pages.map((p) => (
          <NavLink key={p.id} to={`/p/${p.id}`} className={enlace} onClick={onNavigate}>
            <span className="w-5 text-center">{p.icon}</span>
            <span className="truncate">{p.title}</span>
          </NavLink>
        ))}
        <button
          type="button"
          onClick={onNewPage}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted hover:bg-hover"
        >
          <Plus size={16} /> Añadir nueva página
        </button>
      </nav>

      <div className="rounded-lg border border-line p-3 text-sm">
        {plan === 'free' ? (
          <>
            <div className="font-medium">Plan gratuito</div>
            <div className="mb-2 text-xs text-muted">
              {pages.length} de {FREE_PAGE_LIMIT} páginas usadas
            </div>
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-hover" aria-hidden="true">
              <div className="h-full bg-accent" style={{ width: `${Math.min(100, (pages.length * 100) / FREE_PAGE_LIMIT)}%` }} />
            </div>
          </>
        ) : (
          <div className="mb-3 flex items-center gap-1 font-medium">
            <Sparkles size={14} className="text-accent" /> Plan Pro
          </div>
        )}
        <button type="button" className="btn btn-primary w-full !py-1.5" onClick={onUpgrade}>
          {plan === 'free' ? 'Mejorar plan' : 'Gestionar plan'}
        </button>
      </div>

      <div className="relative">
        {menu && (
          <div className="absolute bottom-full left-0 right-0 mb-1 rounded-md border border-line bg-app p-1 shadow-lg">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-hover"
              onClick={() => {
                setMenu(false);
                onSettings();
              }}
            >
              <Settings size={15} /> Ajustes
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-hover"
              onClick={() => void logout()}
            >
              <LogOut size={15} /> Cerrar sesión
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => setMenu((m) => !m)}
          aria-expanded={menu}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-hover"
        >
          {foto ? (
            <img src={foto} alt="" className="h-6 w-6 rounded-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-xs font-semibold text-white">
              {nombre.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="truncate">{nombre}</span>
          <ChevronUp size={14} className="ml-auto text-muted" />
        </button>
      </div>
    </div>
  );
}
