import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  register: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Crea el perfil users/{uid} la primera vez que entra el usuario (correo o Google). */
async function asegurarPerfil(user: User, nombre?: string): Promise<void> {
  const ref = doc(db, 'users', user.uid);
  const existente = await getDoc(ref);
  if (existente.exists()) return;
  await setDoc(ref, {
    displayName: (nombre ?? user.displayName ?? user.email?.split('@')[0] ?? 'Usuario').slice(0, 80),
    email: user.email,
    photoURL: user.photoURL ?? null,
    bannerURL: null,
    plan: 'free',
    createdAt: serverTimestamp(),
  });
}

/** Traduce los códigos de error de Firebase a mensajes claros en español. */
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
      return 'La contraseña debe tener al menos 8 caracteres.';
    case 'auth/invalid-email':
      return 'El correo no es válido.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Inténtalo más tarde.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Has cerrado la ventana de Google antes de terminar.';
    case 'auth/popup-blocked':
      return 'El navegador bloqueó la ventana de Google. Permite las ventanas emergentes.';
    case 'auth/network-request-failed':
      return 'Sin conexión. Revisa tu red.';
    case 'permission-denied':
    case 'firestore/permission-denied':
      return 'No tienes permiso para realizar esta acción.';
    default:
      return 'Ha ocurrido un error. Inténtalo de nuevo.';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async register(name, email, password) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name });
        await asegurarPerfil(cred.user, name);
      },
      async login(email, password) {
        await signInWithEmailAndPassword(auth, email, password);
      },
      async loginWithGoogle() {
        const cred = await signInWithPopup(auth, googleProvider);
        await asegurarPerfil(cred.user);
      },
      async resetPassword(email) {
        await sendPasswordResetEmail(auth, email);
      },
      async logout() {
        await signOut(auth);
      },
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
