import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile,
  verifyBeforeUpdateEmail,
  type User,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { nuevoId } from '../lib/ids';
import type { AppUser, DayEntry, HabitPage, Profile } from '../types';
import { BackendError, type Backend } from './types';

// Estructura:  users/{uid}/pages/{pageId}   y   users/{uid}/pages/{pageId}/days/{YYYY-MM-DD}
const pagesCol = (uid: string) => collection(db, 'users', uid, 'pages');
const pageDoc = (uid: string, pageId: string) => doc(db, 'users', uid, 'pages', pageId);
const daysCol = (uid: string, pageId: string) => collection(db, 'users', uid, 'pages', pageId, 'days');

const aAppUser = (u: User): AppUser => ({
  uid: u.uid,
  email: u.email ?? '',
  displayName: u.displayName ?? u.email?.split('@')[0] ?? 'Usuario',
  photoURL: u.photoURL,
});

/** Crea el perfil users/{uid} la primera vez que entra el usuario (correo o Google). */
async function asegurarPerfil(user: User, nombre?: string): Promise<void> {
  const ref = doc(db, 'users', user.uid);
  if ((await getDoc(ref)).exists()) return;
  await setDoc(ref, {
    displayName: (nombre ?? user.displayName ?? user.email?.split('@')[0] ?? 'Usuario').slice(0, 80),
    email: user.email,
    photoURL: user.photoURL ?? null,
    bannerURL: null,
    plan: 'free',
    billing: [],
    createdAt: serverTimestamp(),
  });
}

function usuarioActual(): User {
  if (!auth.currentUser) throw new BackendError('auth/requires-recent-login');
  return auth.currentUser;
}

function aPagina(id: string, x: Record<string, unknown>): HabitPage {
  return {
    id,
    title: typeof x.title === 'string' ? x.title : 'Sin título',
    icon: typeof x.icon === 'string' ? x.icon : '📓',
    avatarURL: typeof x.avatarURL === 'string' ? x.avatarURL : null,
    bannerURL: typeof x.bannerURL === 'string' ? x.bannerURL : 'preset:0',
    quote: typeof x.quote === 'string' ? x.quote : '',
    rules: Array.isArray(x.rules) ? (x.rules as string[]) : [],
    habits: Array.isArray(x.habits) ? (x.habits as HabitPage['habits']) : [],
  };
}

function aDia(fecha: string, x: Record<string, unknown>): DayEntry {
  return {
    date: fecha,
    note: typeof x.note === 'string' ? x.note : '',
    checks: (x.checks as Record<string, boolean> | undefined) ?? {},
  };
}

export const firebaseBackend: Backend = {
  mode: 'firebase',
  supportsGoogle: true,

  auth: {
    subscribe: (cb) => onAuthStateChanged(auth, (u) => cb(u ? aAppUser(u) : null)),
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
    async changePassword(current, next) {
      const u = usuarioActual();
      if (!u.email) throw new BackendError('auth/operation-not-allowed');
      await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, current));
      await updatePassword(u, next);
    },
    async changeEmail(password, newEmail) {
      const u = usuarioActual();
      if (!u.email) throw new BackendError('auth/operation-not-allowed');
      await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, password));
      await verifyBeforeUpdateEmail(u, newEmail);
      return `Te hemos enviado un enlace de verificación a ${newEmail}. El cambio se aplica al confirmarlo.`;
    },
  },

  profile: {
    subscribe: (uid, cb, onError) =>
      onSnapshot(
        doc(db, 'users', uid),
        (snap) => {
          if (!snap.exists()) return cb(null);
          const x = snap.data();
          cb({
            displayName: x.displayName ?? '',
            email: x.email ?? '',
            photoURL: x.photoURL ?? null,
            bannerURL: x.bannerURL ?? null,
            plan: x.plan === 'pro' ? 'pro' : 'free',
            billing: Array.isArray(x.billing) ? x.billing : [],
          } satisfies Profile);
        },
        onError
      ),
    async update(uid, changes) {
      await updateDoc(doc(db, 'users', uid), changes);
      if (changes.displayName !== undefined && auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: changes.displayName });
      }
    },
  },

  pages: {
    subscribe: (uid, cb, onError) =>
      onSnapshot(
        query(pagesCol(uid), orderBy('createdAt', 'asc')),
        (snap) => cb(snap.docs.map((d) => aPagina(d.id, d.data()))),
        onError
      ),
    async create(uid, title, banner) {
      return this.createFrom(uid, {
        title,
        icon: '📓',
        avatarURL: null,
        bannerURL: banner,
        quote: '',
        rules: [],
        habits: [
          { id: nuevoId(), name: 'Entrenar', emoji: '🏋️' },
          { id: nuevoId(), name: 'Lectura', emoji: '📚' },
          { id: nuevoId(), name: 'Estudio', emoji: '🧠' },
        ],
      });
    },
    async createFrom(uid, page) {
      const ref = await addDoc(pagesCol(uid), { ...page, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      return ref.id;
    },
    update: (uid, pageId, changes) => updateDoc(pageDoc(uid, pageId), { ...changes, updatedAt: serverTimestamp() }),
    /** Borra la página y todos sus días (Firestore no borra subcolecciones solo). */
    async remove(uid, pageId) {
      const dias = await getDocs(daysCol(uid, pageId));
      for (let i = 0; i < dias.docs.length; i += 400) {
        const batch = writeBatch(db);
        dias.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      await deleteDoc(pageDoc(uid, pageId));
    },
  },

  days: {
    subscribe: (uid, pageId, from, to, cb, onError) =>
      onSnapshot(
        query(daysCol(uid, pageId), where('date', '>=', from), where('date', '<=', to)),
        (snap) => {
          const out: Record<string, DayEntry> = {};
          snap.forEach((d) => {
            out[d.id] = aDia(d.id, d.data());
          });
          cb(out);
        },
        onError
      ),
    setCheck: (uid, pageId, date, habitId, done) =>
      setDoc(doc(daysCol(uid, pageId), date), { date, checks: { [habitId]: done } }, { merge: true }),
    setNote: (uid, pageId, date, note) => setDoc(doc(daysCol(uid, pageId), date), { date, note }, { merge: true }),
  },
};
