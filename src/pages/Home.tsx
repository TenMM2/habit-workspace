import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

/** Pantalla interna provisional de la Fase 1: confirma que la sesión y la ruta protegida funcionan.
 *  La Fase 2 la sustituye por el layout con sidebar y el dashboard. */
export default function Home() {
  const { user, logout } = useAuth();
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Hola, {user?.displayName ?? user?.email}</h1>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button className="btn" type="button" onClick={() => void logout()}>
            <LogOut size={16} /> Salir
          </button>
        </div>
      </div>
      <p className="text-muted">Sesión iniciada correctamente. Tus datos se guardan en users/{user?.uid}.</p>
    </div>
  );
}
