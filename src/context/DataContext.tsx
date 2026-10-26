import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { backend } from '../backend';
import { useAuth } from './AuthContext';
import { sincronizarOnboarding } from '../lib/onboarding';
import type { HabitPage, Plan, Profile } from '../types';

interface DataContextValue {
  profile: Profile | null;
  plan: Plan;
  pages: HabitPage[];
  loading: boolean;
  error: string;
}

const DataContext = createContext<DataContextValue | null>(null);

/** Escucha en tiempo real el perfil y las páginas del usuario conectado. */
export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pages, setPages] = useState<HabitPage[]>([]);
  // uid del usuario para el que ya han llegado las páginas. "Cargando" se deriva de aquí en vez de
  // guardarse aparte: así nunca hay un instante con usuario pero sin datos que parezca "no existe".
  const [cargadoPara, setCargadoPara] = useState<string | null>(null);
  const [error, setError] = useState('');
  const loading = Boolean(uid) && cargadoPara !== uid;

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setPages([]);
      setCargadoPara(null);
      return;
    }
    setError('');
    const fallo = (e: unknown) => {
      console.error(e);
      setError('No se pudieron cargar tus datos. Comprueba la conexión y los permisos.');
      setCargadoPara(uid);
    };

    const offProfile = backend.profile.subscribe(uid, setProfile, fallo);
    const offPages = backend.pages.subscribe(
      uid,
      (lista) => {
        setPages(lista);
        setCargadoPara(uid);
      },
      fallo
    );
    return () => {
      offProfile();
      offPages();
    };
  }, [uid]);

  useEffect(() => {
    sincronizarOnboarding(uid, profile?.onboarding);
  }, [uid, profile?.onboarding]);

  const value = useMemo<DataContextValue>(
    () => ({ profile, plan: profile?.plan ?? 'free', pages, loading, error }),
    [profile, pages, loading, error]
  );
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData debe usarse dentro de DataProvider');
  return ctx;
}
