import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { pagesCol } from '../lib/db';
import { useAuth } from './AuthContext';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setPages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const fallo = () => setError('No se pudieron cargar tus datos. Comprueba la conexión y las reglas de Firestore.');

    const offProfile = onSnapshot(
      doc(db, 'users', uid),
      (snap) => setProfile(snap.exists() ? (snap.data() as Profile) : null),
      fallo
    );
    const offPages = onSnapshot(
      query(pagesCol(uid), orderBy('createdAt', 'asc')),
      (snap) => {
        setPages(
          snap.docs.map((d) => {
            const x = d.data();
            return {
              id: d.id,
              title: x.title ?? 'Sin título',
              icon: x.icon ?? '📓',
              avatarURL: x.avatarURL ?? null,
              bannerURL: x.bannerURL ?? 'preset:0',
              quote: x.quote ?? '',
              rules: Array.isArray(x.rules) ? x.rules : [],
              habits: Array.isArray(x.habits) ? x.habits : [],
            };
          })
        );
        setLoading(false);
      },
      (e) => {
        fallo();
        console.error(e);
        setLoading(false);
      }
    );
    return () => {
      offProfile();
      offPages();
    };
  }, [uid]);

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
