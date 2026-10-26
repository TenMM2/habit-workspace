import { backend } from '../backend';
import type { PageChanges, ProfileChanges } from '../backend/types';
import type { HabitPage, Invoice, Plan } from '../types';
import { todayISO } from './dates';
import { nuevoId } from './ids';
import { marcarPaso } from './onboarding';

// Fachada sobre el backend activo (Firebase o local). Los componentes solo usan estas funciones.
export { nuevoId };

export async function crearPagina(uid: string, titulo: string, banner: string): Promise<string> {
  const id = await backend.pages.create(uid, titulo, banner);
  marcarPaso(uid, 'pagina');
  return id;
}

export async function crearPaginaCon(uid: string, pagina: Omit<HabitPage, 'id'>): Promise<string> {
  const id = await backend.pages.createFrom(uid, pagina);
  marcarPaso(uid, 'pagina');
  return id;
}

// Algunas acciones completan pasos del onboarding («Primeros pasos»); un fallo ahí nunca afecta a la acción en sí
export async function actualizarPagina(uid: string, pageId: string, cambios: PageChanges): Promise<void> {
  await backend.pages.update(uid, pageId, cambios);
  if ('quote' in cambios || 'rules' in cambios) marcarPaso(uid, 'reglas');
  if ('habits' in cambios) marcarPaso(uid, 'habitos');
}

export const borrarPagina = (uid: string, pageId: string): Promise<void> => backend.pages.remove(uid, pageId);

export async function marcarHabito(uid: string, pageId: string, fecha: string, habitId: string, hecho: boolean): Promise<void> {
  await backend.days.setCheck(uid, pageId, fecha, habitId, hecho);
  if (hecho) marcarPaso(uid, 'marca');
}

export const guardarNota = (uid: string, pageId: string, fecha: string, nota: string): Promise<void> =>
  backend.days.setNote(uid, pageId, fecha, nota);

export async function actualizarPerfil(uid: string, cambios: ProfileChanges): Promise<void> {
  await backend.profile.update(uid, cambios);
  if (cambios.photoURL || cambios.displayName !== undefined) marcarPaso(uid, 'perfil');
}

export const PRECIO_PRO = 4.99;

/**
 * Cambio de plan SIMULADO: no hay pasarela de pago. Actualiza el campo `plan` y, al mejorar a Pro,
 * añade una factura ficticia al historial de facturación.
 */
export function cambiarPlan(uid: string, plan: Plan, facturasActuales: Invoice[]): Promise<void> {
  const cambios: ProfileChanges = { plan };
  if (plan === 'pro') {
    cambios.billing = [
      { id: nuevoId(), date: todayISO(), concept: 'Suscripción Pro (mensual)', amount: PRECIO_PRO },
      ...facturasActuales,
    ].slice(0, 24);
  }
  return backend.profile.update(uid, cambios);
}
