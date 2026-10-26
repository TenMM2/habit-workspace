export interface Habit {
  id: string;
  name: string;
  emoji: string;
}

export interface HabitPage {
  id: string;
  title: string;
  icon: string; // emoji, se usa si no hay avatarURL
  avatarURL: string | null; // URL https o imagen comprimida (data URL)
  bannerURL: string; // 'preset:N', URL https o data URL
  quote: string;
  rules: string[];
  habits: Habit[];
}

/** Un día del tracker: users/{uid}/pages/{pageId}/days/{YYYY-MM-DD} */
export interface DayEntry {
  date: string;
  note: string;
  checks: Record<string, boolean>;
}

export type Plan = 'free' | 'pro';

/** Factura SIMULADA del historial de facturación (no hay pasarela de pago real). */
export interface Invoice {
  id: string;
  date: string; // YYYY-MM-DD
  concept: string;
  amount: number; // euros
}

/** Progreso del onboarding («Primeros pasos» y tour guiado). Se guarda en el perfil del usuario. */
export interface Onboarding {
  pasos: string[]; // ids de los pasos completados
  oculto: boolean; // el usuario ocultó el panel de primeros pasos
  tourVisto: boolean; // el tour ya se mostró (o se saltó): no vuelve a lanzarse solo
}

export interface Profile {
  displayName: string;
  email: string;
  photoURL: string | null;
  bannerURL: string | null; // banner por defecto de las páginas nuevas
  plan: Plan;
  billing: Invoice[];
  onboarding?: Onboarding; // ausente en cuentas anteriores a esta función
}

/** Usuario autenticado, independiente del backend (Firebase o local). */
export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
}

export const FREE_PAGE_LIMIT = 3;
export const MAX_HABITS_PER_PAGE = 8;
