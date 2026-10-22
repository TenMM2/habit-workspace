import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { DEFAULT_BANNER } from './banners';
import type { HabitPage, Plan } from '../types';

// Estructura:  users/{uid}/pages/{pageId}   y   users/{uid}/pages/{pageId}/days/{YYYY-MM-DD}
export const pagesCol = (uid: string) => collection(db, 'users', uid, 'pages');
export const pageDoc = (uid: string, pageId: string) => doc(db, 'users', uid, 'pages', pageId);
export const daysCol = (uid: string, pageId: string) => collection(db, 'users', uid, 'pages', pageId, 'days');

export const nuevoId = (): string => Math.random().toString(36).slice(2, 10);

export async function crearPagina(uid: string, titulo: string): Promise<string> {
  const ref = await addDoc(pagesCol(uid), {
    title: titulo,
    icon: '📓',
    avatarURL: null,
    bannerURL: DEFAULT_BANNER,
    quote: '',
    rules: [],
    habits: [
      { id: nuevoId(), name: 'Entrenar', emoji: '🏋️' },
      { id: nuevoId(), name: 'Lectura', emoji: '📚' },
      { id: nuevoId(), name: 'Estudio', emoji: '🧠' },
    ],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export function actualizarPagina(uid: string, pageId: string, cambios: Partial<Omit<HabitPage, 'id'>>): Promise<void> {
  return updateDoc(pageDoc(uid, pageId), { ...cambios, updatedAt: serverTimestamp() });
}

/** Borra la página y todos sus días (Firestore no borra subcolecciones solo). */
export async function borrarPagina(uid: string, pageId: string): Promise<void> {
  const dias = await getDocs(daysCol(uid, pageId));
  for (let i = 0; i < dias.docs.length; i += 400) {
    const batch = writeBatch(db);
    dias.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  await deleteDoc(pageDoc(uid, pageId));
}

export function marcarHabito(uid: string, pageId: string, fecha: string, habitId: string, hecho: boolean): Promise<void> {
  return setDoc(
    doc(daysCol(uid, pageId), fecha),
    { date: fecha, checks: { [habitId]: hecho } },
    { merge: true }
  );
}

export function guardarNota(uid: string, pageId: string, fecha: string, nota: string): Promise<void> {
  return setDoc(doc(daysCol(uid, pageId), fecha), { date: fecha, note: nota }, { merge: true });
}

/** Cambio de plan SIMULADO: no hay pasarela de pago. Solo actualiza el campo `plan` del perfil. */
export function cambiarPlan(uid: string, plan: Plan): Promise<void> {
  return updateDoc(doc(db, 'users', uid), { plan });
}
