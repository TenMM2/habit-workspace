import type { AppUser, DayEntry, HabitPage, Profile } from '../types';

export type Unsub = () => void;
export type OnError = (e: unknown) => void;

export type ProfileChanges = Partial<Pick<Profile, 'displayName' | 'photoURL' | 'bannerURL' | 'plan' | 'billing' | 'onboarding'>>;
export type PageChanges = Partial<Omit<HabitPage, 'id'>>;

/**
 * Contrato único de acceso a datos. La aplicación solo habla con esta interfaz; hay dos
 * implementaciones: Firebase (Auth + Firestore) y Local (IndexedDB, para trabajar sin cuenta de Firebase).
 */
export interface Backend {
  mode: 'firebase' | 'local';
  supportsGoogle: boolean;

  auth: {
    subscribe(cb: (user: AppUser | null) => void): Unsub;
    register(name: string, email: string, password: string): Promise<void>;
    login(email: string, password: string): Promise<void>;
    loginWithGoogle(): Promise<void>;
    resetPassword(email: string): Promise<void>;
    logout(): Promise<void>;
    changePassword(current: string, next: string): Promise<void>;
    /** Devuelve un aviso para mostrar al usuario (p. ej. "revisa tu correo para verificar"). */
    changeEmail(password: string, newEmail: string): Promise<string>;
  };

  profile: {
    subscribe(uid: string, cb: (p: Profile | null) => void, onError: OnError): Unsub;
    update(uid: string, changes: ProfileChanges): Promise<void>;
  };

  pages: {
    subscribe(uid: string, cb: (pages: HabitPage[]) => void, onError: OnError): Unsub;
    create(uid: string, title: string, banner: string): Promise<string>;
    update(uid: string, pageId: string, changes: PageChanges): Promise<void>;
    remove(uid: string, pageId: string): Promise<void>;
    /** Crea una página con contenido ya definido (lo usa el asistente IA). */
    createFrom(uid: string, page: Omit<HabitPage, 'id'>): Promise<string>;
  };

  days: {
    subscribe(
      uid: string,
      pageId: string,
      from: string,
      to: string,
      cb: (days: Record<string, DayEntry>) => void,
      onError: OnError
    ): Unsub;
    setCheck(uid: string, pageId: string, date: string, habitId: string, done: boolean): Promise<void>;
    setNote(uid: string, pageId: string, date: string, note: string): Promise<void>;
  };
}

/** Error con `code` estilo Firebase para reutilizar la traducción a español. */
export class BackendError extends Error {
  code: string;
  constructor(code: string, message = code) {
    super(message);
    this.code = code;
  }
}
