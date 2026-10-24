import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { backend } from '../backend';
import type { AppUser } from '../types';

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  register: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Traduce los códigos de error (Firebase o locales) a mensajes claros en español. */
export function mensajeDeError(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: unknown }).code) : '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Correo o contraseña incorrectos.';
    case 'auth/email-already-in-use':
      return 'Ya existe una cuenta con ese correo.';
    case 'auth/weak-password':
      return 'La contraseña es demasiado corta.';
    case 'auth/invalid-email':
      return 'El correo no es válido.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Inténtalo más tarde.';
    case 'auth/requires-recent-login':
      return 'Por seguridad, vuelve a iniciar sesión y repite la operación.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Has cerrado la ventana de Google antes de terminar.';
    case 'auth/popup-blocked':
      return 'El navegador bloqueó la ventana de Google. Permite las ventanas emergentes.';
    case 'auth/network-request-failed':
      return 'Sin conexión. Revisa tu red.';
    case 'local/google-unavailable':
      return 'El acceso con Google solo está disponible con Firebase configurado.';
    case 'local/reset-unavailable':
      return 'En modo local no se envían correos. Puedes cambiar la contraseña desde Ajustes una vez dentro.';
    case 'permission-denied':
    case 'firestore/permission-denied':
      return 'No tienes permiso para realizar esta acción.';
    case 'invalid-argument':
      return 'Los datos introducidos no son válidos.';
    default:
      return 'Ha ocurrido un error. Inténtalo de nuevo.';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(
    () =>
      backend.auth.subscribe((u) => {
        setUser(u);
        setLoading(false);
      }),
    []
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      register: backend.auth.register,
      login: backend.auth.login,
      loginWithGoogle: backend.auth.loginWithGoogle,
      resetPassword: backend.auth.resetPassword,
      logout: backend.auth.logout,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
