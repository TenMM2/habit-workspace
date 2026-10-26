import { nuevoId } from '../lib/ids';
import { MAX_HABITS_PER_PAGE, type AppUser, type DayEntry, type HabitPage, type Plan, type Profile } from '../types';
import { BackendError, type Backend, type Unsub } from './types';
import { hashPassword, nuevoToken, verifyPassword } from './local/password';
import { DEMO_EMAIL, DEMO_PASSWORD, paginaDemo } from './local/seed';
import { LocalStore } from './local/store';

interface LocalUser extends Profile {
  uid: string;
  passwordHash: string;
  createdAt: number;
}
interface LocalPage extends Omit<HabitPage, 'id'> {
  uid: string;
  id: string;
  createdAt: number;
  updatedAt: number;
}
interface LocalSession {
  token: string;
  uid: string;
  expires: number;
}

type Topic = 'session' | 'profile' | 'pages' | 'days';
type Almacen = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const CLAVE_SESION = 'hw-local-session';
const DURACION_SESION_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_INTENTOS = 5;
const BLOQUEO_MS = 60_000;
const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const RE_EMAIL = /^[^\s@]+@[^\s@]+$/;

function almacenNavegador(): Almacen | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

interface Opciones {
  /** Dónde se guarda el token de sesión (por defecto localStorage). */
  almacenSesion?: Almacen | null;
  /** Crear el usuario demo y su página de ejemplo la primera vez. */
  sembrar?: boolean;
}

/**
 * Backend local: simula Auth + Firestore sobre IndexedDB. Reproduce lo importante de un backend real:
 * usuarios con contraseña hasheada (PBKDF2), sesiones con caducidad, aislamiento de datos por usuario
 * (equivalente a firestore.rules), límite de intentos de login y suscripciones en tiempo real.
 */
export function crearLocalBackend(opciones: Opciones = {}): Backend & { ready: Promise<void>; store: LocalStore } {
  const almacenSesion = opciones.almacenSesion === undefined ? almacenNavegador() : opciones.almacenSesion;
  const store = new LocalStore();
  const suscriptores = new Map<Topic, Set<() => void>>();
  const intentos = new Map<string, { n: number; hasta: number }>();
  let uidActual: string | null = null;

  // ---------- Utilidades ----------
  const notificar = (t: Topic) => suscriptores.get(t)?.forEach((fn) => fn());

  function suscribir(topic: Topic, fn: () => void): Unsub {
    let activo = true;
    const envuelta = () => activo && fn();
    if (!suscriptores.has(topic)) suscriptores.set(topic, new Set());
    suscriptores.get(topic)!.add(envuelta);
    void ready.then(envuelta); // primera emisión cuando los datos están cargados
    return () => {
      activo = false;
      suscriptores.get(topic)?.delete(envuelta);
    };
  }

  /** Equivale a las reglas de seguridad: solo se accede a los datos del usuario con sesión. */
  function exigirUsuario(uid: string): LocalUser {
    const u = store.get<LocalUser>('users', uid);
    if (!uid || uid !== uidActual || !u) throw new BackendError('permission-denied');
    return u;
  }

  function paginaPropia(uid: string, pageId: string): LocalPage {
    exigirUsuario(uid);
    const p = store.get<LocalPage>('pages', `${uid}/${pageId}`);
    if (!p) throw new BackendError('permission-denied');
    return p;
  }

  const aAppUser = (u: LocalUser): AppUser => ({ uid: u.uid, email: u.email, displayName: u.displayName, photoURL: u.photoURL });
  const aPerfil = (u: LocalUser): Profile => ({
    displayName: u.displayName,
    email: u.email,
    photoURL: u.photoURL,
    bannerURL: u.bannerURL,
    plan: u.plan,
    billing: u.billing,
    onboarding: u.onboarding,
  });
  const aPagina = (p: LocalPage): HabitPage => ({
    id: p.id,
    title: p.title,
    icon: p.icon,
    avatarURL: p.avatarURL,
    bannerURL: p.bannerURL,
    quote: p.quote,
    rules: p.rules,
    habits: p.habits,
  });

  function validarPagina(p: Partial<Omit<HabitPage, 'id'>>): void {
    if (p.title !== undefined && (p.title.length < 1 || p.title.length > 80)) throw new BackendError('invalid-argument', 'Título no válido');
    if (p.quote !== undefined && p.quote.length > 400) throw new BackendError('invalid-argument', 'Cita demasiado larga');
    if (p.rules !== undefined && (p.rules.length > 12 || p.rules.some((r) => typeof r !== 'string' || r.length > 200)))
      throw new BackendError('invalid-argument', 'Reglas no válidas');
    if (p.habits !== undefined && (p.habits.length > MAX_HABITS_PER_PAGE || p.habits.some((h) => !h.id || !h.name || h.name.length > 40)))
      throw new BackendError('invalid-argument', 'Hábitos no válidos');
  }

  async function crearSesion(uid: string): Promise<void> {
    const sesion: LocalSession = { token: nuevoToken(), uid, expires: Date.now() + DURACION_SESION_MS };
    await store.put('sessions', sesion.token, sesion);
    try {
      almacenSesion?.setItem(CLAVE_SESION, sesion.token);
    } catch {
      /* sin almacenamiento: la sesión dura hasta cerrar la pestaña */
    }
    uidActual = uid;
    notificar('session');
    notificar('profile');
    notificar('pages');
  }

  async function sembrarDemo(): Promise<void> {
    if (store.list('users').length > 0) return;
    const uid = `u_${nuevoId()}`;
    const demo: LocalUser = {
      uid,
      email: DEMO_EMAIL,
      displayName: 'Usuario demo',
      photoURL: null,
      bannerURL: null,
      plan: 'free',
      billing: [],
      // La demo arranca con pasos mezclados (hechos y pendientes) para poder enseñar el panel en la defensa
      onboarding: { pasos: ['pagina', 'reglas', 'habitos'], oculto: false, tourVisto: true },
      passwordHash: await hashPassword(DEMO_PASSWORD),
      createdAt: Date.now(),
    };
    await store.put('users', uid, demo);
    const { page, checks } = paginaDemo();
    const pageId = nuevoId();
    const ahora = Date.now();
    await store.put('pages', `${uid}/${pageId}`, { ...page, uid, id: pageId, createdAt: ahora, updatedAt: ahora } satisfies LocalPage);
    for (const c of checks) {
      const entry: DayEntry = { date: c.date, note: c.note, checks: Object.fromEntries(c.ids.map((id) => [id, true])) };
      await store.put('days', `${uid}/${pageId}/${c.date}`, entry);
    }
  }

  async function restaurarSesion(): Promise<void> {
    let token: string | null = null;
    try {
      token = almacenSesion?.getItem(CLAVE_SESION) ?? null;
    } catch {
      token = null;
    }
    if (!token) return;
    const s = store.get<LocalSession>('sessions', token);
    if (s && s.expires > Date.now() && store.get('users', s.uid)) {
      uidActual = s.uid;
    } else {
      if (s) await store.remove('sessions', token);
      try {
        almacenSesion?.removeItem(CLAVE_SESION);
      } catch {
        /* nada que limpiar */
      }
    }
  }

  const ready: Promise<void> = (async () => {
    await store.init();
    if (opciones.sembrar !== false) await sembrarDemo();
    await restaurarSesion();
  })();

  const buscarPorEmail = (email: string) => store.list<LocalUser>('users').find((u) => u.email === email);

  // ---------- Backend ----------
  return {
    mode: 'local',
    supportsGoogle: false,
    ready,
    store,

    auth: {
      subscribe: (cb) =>
        suscribir('session', () => {
          const u = uidActual ? store.get<LocalUser>('users', uidActual) : undefined;
          cb(u ? aAppUser(u) : null);
        }),

      async register(name, email, password) {
        await ready;
        const correo = email.trim().toLowerCase();
        if (!RE_EMAIL.test(correo)) throw new BackendError('auth/invalid-email');
        if (password.length < 6) throw new BackendError('auth/weak-password');
        if (name.trim().length < 1 || name.length > 80) throw new BackendError('invalid-argument');
        if (buscarPorEmail(correo)) throw new BackendError('auth/email-already-in-use');
        const uid = `u_${nuevoId()}`;
        const usuario: LocalUser = {
          uid,
          email: correo,
          displayName: name.trim(),
          photoURL: null,
          bannerURL: null,
          plan: 'free',
          billing: [],
          onboarding: { pasos: [], oculto: false, tourVisto: false }, // cuenta nueva: el tour se lanza solo la primera vez
          passwordHash: await hashPassword(password),
          createdAt: Date.now(),
        };
        await store.put('users', uid, usuario);
        await crearSesion(uid);
      },

      async login(email, password) {
        await ready;
        const correo = email.trim().toLowerCase();
        const estado = intentos.get(correo);
        if (estado && estado.n >= MAX_INTENTOS && estado.hasta > Date.now()) throw new BackendError('auth/too-many-requests');
        const u = buscarPorEmail(correo);
        // Se verifica siempre un hash, exista o no el usuario, para no revelar qué cuentas existen por tiempos
        const hash = u?.passwordHash ?? (await hashPassword('relleno-sin-usuario'));
        const ok = (await verifyPassword(password, hash)) && !!u;
        if (!ok) {
          const n = (estado && estado.hasta > Date.now() ? estado.n : 0) + 1;
          intentos.set(correo, { n, hasta: Date.now() + BLOQUEO_MS });
          throw new BackendError('auth/invalid-credential');
        }
        intentos.delete(correo);
        await crearSesion(u!.uid);
      },

      async loginWithGoogle() {
        throw new BackendError('local/google-unavailable');
      },

      async resetPassword() {
        throw new BackendError('local/reset-unavailable');
      },

      async logout() {
        await ready;
        try {
          const token = almacenSesion?.getItem(CLAVE_SESION);
          if (token) await store.remove('sessions', token);
          almacenSesion?.removeItem(CLAVE_SESION);
        } catch {
          /* ya no había sesión guardada */
        }
        uidActual = null;
        notificar('session');
        notificar('profile');
        notificar('pages');
        notificar('days');
      },

      async changePassword(current, next) {
        await ready;
        if (!uidActual) throw new BackendError('permission-denied');
        const u = exigirUsuario(uidActual);
        if (!(await verifyPassword(current, u.passwordHash))) throw new BackendError('auth/invalid-credential');
        if (next.length < 6) throw new BackendError('auth/weak-password');
        await store.put('users', u.uid, { ...u, passwordHash: await hashPassword(next) });
      },

      async changeEmail(password, newEmail) {
        await ready;
        if (!uidActual) throw new BackendError('permission-denied');
        const u = exigirUsuario(uidActual);
        if (!(await verifyPassword(password, u.passwordHash))) throw new BackendError('auth/invalid-credential');
        const correo = newEmail.trim().toLowerCase();
        if (!RE_EMAIL.test(correo)) throw new BackendError('auth/invalid-email');
        const otro = buscarPorEmail(correo);
        if (otro && otro.uid !== u.uid) throw new BackendError('auth/email-already-in-use');
        await store.put('users', u.uid, { ...u, email: correo });
        notificar('session');
        notificar('profile');
        return 'Correo actualizado.';
      },
    },

    profile: {
      subscribe(uid, cb) {
        return suscribir('profile', () => {
          const u = store.get<LocalUser>('users', uid);
          cb(u && uid === uidActual ? aPerfil(u) : null);
        });
      },
      async update(uid, changes) {
        await ready;
        const u = exigirUsuario(uid);
        if (changes.displayName !== undefined && (changes.displayName.trim().length < 1 || changes.displayName.length > 80))
          throw new BackendError('invalid-argument');
        if (changes.plan !== undefined && !(['free', 'pro'] as Plan[]).includes(changes.plan)) throw new BackendError('invalid-argument');
        const o = changes.onboarding;
        if (
          o !== undefined &&
          (!Array.isArray(o.pasos) ||
            o.pasos.length > 20 ||
            o.pasos.some((p) => typeof p !== 'string' || p.length > 30) ||
            typeof o.oculto !== 'boolean' ||
            typeof o.tourVisto !== 'boolean')
        )
          throw new BackendError('invalid-argument');
        await store.put('users', uid, { ...u, ...changes });
        notificar('profile');
        notificar('session');
      },
    },

    pages: {
      subscribe(uid, cb) {
        return suscribir('pages', () => {
          if (uid !== uidActual) return cb([]);
          const lista = store.list<LocalPage>('pages', `${uid}/`);
          lista.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
          cb(lista.map(aPagina));
        });
      },
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
        await ready;
        exigirUsuario(uid);
        validarPagina(page);
        const id = nuevoId();
        const ahora = Date.now();
        await store.put('pages', `${uid}/${id}`, { ...page, uid, id, createdAt: ahora, updatedAt: ahora } satisfies LocalPage);
        notificar('pages');
        return id;
      },
      async update(uid, pageId, changes) {
        await ready;
        const p = paginaPropia(uid, pageId);
        validarPagina(changes);
        await store.put('pages', `${uid}/${pageId}`, { ...p, ...changes, id: p.id, uid, updatedAt: Date.now() });
        notificar('pages');
      },
      async remove(uid, pageId) {
        await ready;
        paginaPropia(uid, pageId);
        for (const [clave] of store.entries('days', `${uid}/${pageId}/`)) await store.remove('days', clave);
        await store.remove('pages', `${uid}/${pageId}`);
        notificar('pages');
        notificar('days');
      },
    },

    days: {
      subscribe(uid, pageId, from, to, cb) {
        return suscribir('days', () => {
          const out: Record<string, DayEntry> = {};
          if (uid === uidActual) {
            for (const d of store.list<DayEntry>('days', `${uid}/${pageId}/`)) {
              if (d.date >= from && d.date <= to) out[d.date] = d;
            }
          }
          cb(out);
        });
      },
      async setCheck(uid, pageId, date, habitId, done) {
        await ready;
        paginaPropia(uid, pageId);
        if (!RE_FECHA.test(date) || !habitId) throw new BackendError('invalid-argument');
        const clave = `${uid}/${pageId}/${date}`;
        const actual = store.get<DayEntry>('days', clave) ?? { date, note: '', checks: {} };
        await store.put('days', clave, { ...actual, checks: { ...actual.checks, [habitId]: done } });
        notificar('days');
      },
      async setNote(uid, pageId, date, note) {
        await ready;
        paginaPropia(uid, pageId);
        if (!RE_FECHA.test(date) || note.length > 200) throw new BackendError('invalid-argument');
        const clave = `${uid}/${pageId}/${date}`;
        const actual = store.get<DayEntry>('days', clave) ?? { date, note: '', checks: {} };
        await store.put('days', clave, { ...actual, note });
        notificar('days');
      },
    },
  };
}
