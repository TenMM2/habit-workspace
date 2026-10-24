import { backend } from '../backend';
import type { PageChanges, ProfileChanges } from '../backend/types';
import type { HabitPage, Invoice, Plan } from '../types';
import { todayISO } from './dates';
import { nuevoId } from './ids';

// Fachada sobre el backend activo (Firebase o local). Los componentes solo usan estas funciones.
export { nuevoId };

export const crearPagina = (uid: string, titulo: string, banner: string): Promise<string> =>
  backend.pages.create(uid, titulo, banner);

export const crearPaginaCon = (uid: string, pagina: Omit<HabitPage, 'id'>): Promise<string> =>
  backend.pages.createFrom(uid, pagina);

export const actualizarPagina = (uid: string, pageId: string, cambios: PageChanges): Promise<void> =>
  backend.pages.update(uid, pageId, cambios);

export const borrarPagina = (uid: string, pageId: string): Promise<void> => backend.pages.remove(uid, pageId);

export const marcarHabito = (uid: string, pageId: string, fecha: string, habitId: string, hecho: boolean): Promise<void> =>
  backend.days.setCheck(uid, pageId, fecha, habitId, hecho);

export const guardarNota = (uid: string, pageId: string, fecha: string, nota: string): Promise<void> =>
  backend.days.setNote(uid, pageId, fecha, nota);

export const actualizarPerfil = (uid: string, cambios: ProfileChanges): Promise<void> => backend.profile.update(uid, cambios);

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
