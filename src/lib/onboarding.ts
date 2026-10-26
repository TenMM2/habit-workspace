import { backend } from '../backend';
import type { HabitPage, Onboarding, Profile } from '../types';

export type PasoId = 'perfil' | 'pagina' | 'reglas' | 'habitos' | 'marca' | 'calendario' | 'asistente';

export interface PasoDef {
  id: PasoId;
  titulo: string;
  porQue: string;
  /** Texto de la ventanita del tour guiado. */
  tourTexto: string;
}

export const PASOS: PasoDef[] = [
  {
    id: 'perfil',
    titulo: 'Personaliza tu perfil y avatar',
    porQue: 'Sin tu nombre y foto el espacio de trabajo no se siente tuyo.',
    tourTexto: 'Aquí cambias tu nombre y tu foto de perfil. Se actualizan al instante en la barra lateral.',
  },
  {
    id: 'pagina',
    titulo: 'Crea o abre tu primera página de hábitos',
    porQue: 'Las páginas organizan tu mes con su propio banner, icono y objetivos.',
    tourTexto: 'Cada página tiene su banner, avatar y título editables en el sitio. Crea tantas como quieras con el botón «+».',
  },
  {
    id: 'reglas',
    titulo: 'Define tu cita y las reglas del mes',
    porQue: 'Las reglas claras mantienen la constancia cuando baja la motivación.',
    tourTexto: 'Escribe tu cita motivacional y añade reglas numeradas. Se editan haciendo clic y se guardan solas.',
  },
  {
    id: 'habitos',
    titulo: 'Configura tus hábitos diarios en la tabla',
    porQue: 'Añade hasta 8 hábitos con su emoji para medir tu mes sin scroll lateral.',
    tourTexto: 'Pulsa «Hábitos» para añadir, renombrar o quitar columnas. El máximo es 8 para que la tabla siempre quepa.',
  },
  {
    id: 'marca',
    titulo: 'Marca tu primer hábito completado',
    porQue: 'Un toque actualiza tu racha actual y el porcentaje de los últimos 7 días.',
    tourTexto: 'Un toque en una casilla marca el hábito de ese día. Los días futuros están bloqueados.',
  },
  {
    id: 'calendario',
    titulo: 'Explora el mapa de calor en el Calendario',
    porQue: 'Pulsa cualquier día para consultar qué hábitos cumpliste y tus notas.',
    tourTexto: 'Cuanto más intenso el color, más hábitos cumpliste ese día. Pulsa un día para ver su detalle.',
  },
  {
    id: 'asistente',
    titulo: 'Consulta al Asistente IA',
    porQue: 'Con tus datos reales, el asistente analiza qué hábito falla o te propone rutinas nuevas.',
    tourTexto: 'Pregúntale por tu resumen semanal o pídele que cree una página. Si no hay conexión, usa un modo de respaldo.',
  },
];

export const ONBOARDING_INICIAL: Onboarding = { pasos: [], oculto: false, tourVisto: false };

export function pasosPendientes(o: Onboarding | undefined): number {
  const hechos = new Set(o?.pasos ?? []);
  return PASOS.filter((p) => !hechos.has(p.id)).length;
}

/**
 * Para cuentas anteriores a esta función: deduce los pasos que los datos ya demuestran. Marca, calendario y
 * asistente no se deducen (no hay rastro fiable), así que siempre quedan pendientes y el usuario las descubre.
 */
export function inferirPasos(profile: Pick<Profile, 'photoURL'>, pages: HabitPage[]): PasoId[] {
  const hechos: PasoId[] = [];
  if (profile.photoURL) hechos.push('perfil');
  if (pages.length > 0) hechos.push('pagina');
  if (pages.some((p) => p.quote.trim() !== '' && p.rules.length > 0)) hechos.push('reglas');
  if (pages.some((p) => p.habits.length >= 3)) hechos.push('habitos');
  return hechos;
}

// ── Estado compartido con la capa de datos ────────────────────────────────────────────────────────
// Las acciones del usuario (crear página, marcar un hábito…) completan pasos sin que cada pantalla conozca el
// onboarding. Se guarda el último estado conocido para poder añadir un paso sin leer el perfil otra vez; es
// optimista, así que dos pasos completados casi a la vez no se pisan.
let actual: { uid: string; onb: Onboarding } | null = null;

/** Lo llama DataContext cada vez que llega el perfil del usuario. */
export function sincronizarOnboarding(uid: string | undefined, onb: Onboarding | undefined): void {
  actual = uid && onb ? { uid, onb } : null;
}

export function guardarOnboarding(uid: string, onb: Onboarding): Promise<void> {
  actual = { uid, onb };
  return backend.profile.update(uid, { onboarding: onb });
}

/** Marca un paso como hecho (no hace nada si ya lo estaba o si el perfil aún no tiene onboarding). */
export function marcarPaso(uid: string, id: PasoId): void {
  if (!actual || actual.uid !== uid || actual.onb.pasos.includes(id)) return;
  const siguiente: Onboarding = { ...actual.onb, pasos: [...actual.onb.pasos, id] };
  void guardarOnboarding(uid, siguiente).catch(() => undefined); // un fallo aquí nunca debe romper la acción del usuario
}
