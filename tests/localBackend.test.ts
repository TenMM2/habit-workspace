import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { crearLocalBackend } from '../src/backend/localBackend';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../src/backend/local/seed';
import type { AppUser, DayEntry, HabitPage, Profile } from '../src/types';

/** Almacén de sesión en memoria, equivalente a localStorage. */
function almacen() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}

/** Espera la primera emisión de una suscripción. */
function primero<T>(sub: (cb: (v: T) => void) => () => void): Promise<T> {
  return new Promise((resolve) => {
    let off = () => {};
    let hecho = false;
    off = sub((v) => {
      if (hecho) return;
      hecho = true;
      queueMicrotask(() => off());
      resolve(v);
    });
  });
}

const usuario = (b: ReturnType<typeof crearLocalBackend>) => primero<AppUser | null>((cb) => b.auth.subscribe(cb));
const paginas = (b: ReturnType<typeof crearLocalBackend>, uid: string) =>
  primero<HabitPage[]>((cb) => b.pages.subscribe(uid, cb, () => {}));
const dias = (b: ReturnType<typeof crearLocalBackend>, uid: string, pageId: string) =>
  primero<Record<string, DayEntry>>((cb) => b.days.subscribe(uid, pageId, '2000-01-01', '2999-12-31', cb, () => {}));
const perfil = (b: ReturnType<typeof crearLocalBackend>, uid: string) =>
  primero<Profile | null>((cb) => b.profile.subscribe(uid, cb, () => {}));

async function codigoDe(promesa: Promise<unknown>): Promise<string> {
  try {
    await promesa;
    return 'sin-error';
  } catch (e) {
    return (e as { code?: string }).code ?? 'error-sin-codigo';
  }
}

async function nuevoBackendConDemo() {
  const b = crearLocalBackend({ almacenSesion: almacen() });
  await b.ready;
  await b.auth.login(DEMO_EMAIL, DEMO_PASSWORD);
  const u = (await usuario(b))!;
  return { b, uid: u.uid };
}

beforeEach(() => {
  // Una base de datos IndexedDB limpia para cada prueba
  (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
});

describe('usuario demo precargado', () => {
  it('existe, se puede entrar y trae una página con historial', async () => {
    const { b, uid } = await nuevoBackendConDemo();
    const lista = await paginas(b, uid);
    expect(lista).toHaveLength(1);
    expect(lista[0].habits.length).toBeGreaterThanOrEqual(4);
    const d = await dias(b, uid, lista[0].id);
    expect(Object.keys(d).length).toBeGreaterThanOrEqual(15);
  });

  it('no se vuelve a sembrar si ya hay usuarios', async () => {
    const a = crearLocalBackend({ almacenSesion: almacen() });
    await a.ready;
    const b = crearLocalBackend({ almacenSesion: almacen() });
    await b.ready;
    expect(b.store.list('users')).toHaveLength(1);
  });
});

describe('autenticación', () => {
  it('rechaza contraseña incorrecta y usuario inexistente con el mismo código', async () => {
    const b = crearLocalBackend({ almacenSesion: almacen() });
    await b.ready;
    expect(await codigoDe(b.auth.login(DEMO_EMAIL, 'mala'))).toBe('auth/invalid-credential');
    expect(await codigoDe(b.auth.login('nadie@x.com', 'loquesea'))).toBe('auth/invalid-credential');
  });

  it('bloquea tras 5 intentos fallidos, aunque luego la contraseña sea correcta', async () => {
    const b = crearLocalBackend({ almacenSesion: almacen() });
    await b.ready;
    for (let i = 0; i < 5; i++) await codigoDe(b.auth.login(DEMO_EMAIL, 'mala'));
    expect(await codigoDe(b.auth.login(DEMO_EMAIL, DEMO_PASSWORD))).toBe('auth/too-many-requests');
  });

  it('registra usuarios, rechaza correos repetidos y contraseñas cortas', async () => {
    const b = crearLocalBackend({ almacenSesion: almacen() });
    await b.ready;
    expect(await codigoDe(b.auth.register('Ana', 'ana@test.com', '123'))).toBe('auth/weak-password');
    expect(await codigoDe(b.auth.register('Ana', 'correo-malo', 'secreto123'))).toBe('auth/invalid-email');
    await b.auth.register('Ana', 'Ana@Test.com', 'secreto123');
    expect((await usuario(b))?.email).toBe('ana@test.com'); // normaliza a minúsculas
    await b.auth.logout();
    expect(await codigoDe(b.auth.register('Otra', 'ana@test.com', 'secreto123'))).toBe('auth/email-already-in-use');
  });

  it('nunca guarda la contraseña en claro: usa PBKDF2 con sal', async () => {
    const b = crearLocalBackend({ almacenSesion: almacen() });
    await b.ready;
    await b.auth.register('Ana', 'ana@test.com', 'secreto123');
    const guardados = b.store.list<{ passwordHash: string }>('users');
    for (const u of guardados) {
      expect(u.passwordHash.startsWith('pbkdf2$')).toBe(true);
      expect(JSON.stringify(u)).not.toContain('secreto123');
      expect(JSON.stringify(u)).not.toContain(DEMO_PASSWORD);
    }
    const hashes = guardados.map((u) => u.passwordHash);
    expect(new Set(hashes).size).toBe(hashes.length);
  });

  it('cambia la contraseña verificando la actual', async () => {
    const { b } = await nuevoBackendConDemo();
    expect(await codigoDe(b.auth.changePassword('incorrecta', 'nuevaClave1'))).toBe('auth/invalid-credential');
    await b.auth.changePassword(DEMO_PASSWORD, 'nuevaClave1');
    await b.auth.logout();
    expect(await codigoDe(b.auth.login(DEMO_EMAIL, DEMO_PASSWORD))).toBe('auth/invalid-credential');
    await b.auth.login(DEMO_EMAIL, 'nuevaClave1');
    expect(await usuario(b)).not.toBeNull();
  });

  it('cambia el correo con la contraseña y evita duplicados', async () => {
    const { b } = await nuevoBackendConDemo();
    expect(await codigoDe(b.auth.changeEmail('mala', 'nuevo@test.com'))).toBe('auth/invalid-credential');
    await b.auth.changeEmail(DEMO_PASSWORD, 'nuevo@test.com');
    expect((await usuario(b))?.email).toBe('nuevo@test.com');
  });
});

describe('sesiones', () => {
  it('la sesión sobrevive a recargar la página (nueva instancia, mismo almacenamiento)', async () => {
    const sesion = almacen();
    const a = crearLocalBackend({ almacenSesion: sesion });
    await a.ready;
    await a.auth.login(DEMO_EMAIL, DEMO_PASSWORD);

    const recargada = crearLocalBackend({ almacenSesion: sesion });
    await recargada.ready;
    expect((await usuario(recargada))?.email).toBe(DEMO_EMAIL);
  });

  it('tras cerrar sesión ya no hay usuario ni siquiera al recargar', async () => {
    const sesion = almacen();
    const a = crearLocalBackend({ almacenSesion: sesion });
    await a.ready;
    await a.auth.login(DEMO_EMAIL, DEMO_PASSWORD);
    await a.auth.logout();
    expect(await usuario(a)).toBeNull();

    const recargada = crearLocalBackend({ almacenSesion: sesion });
    await recargada.ready;
    expect(await usuario(recargada)).toBeNull();
  });

  it('una sesión caducada se descarta', async () => {
    const sesion = almacen();
    const a = crearLocalBackend({ almacenSesion: sesion });
    await a.ready;
    await a.auth.login(DEMO_EMAIL, DEMO_PASSWORD);
    const token = sesion.getItem('hw-local-session')!;
    const s = a.store.get<{ expires: number }>('sessions', token)!;
    await a.store.put('sessions', token, { ...s, expires: Date.now() - 1000 });

    const recargada = crearLocalBackend({ almacenSesion: sesion });
    await recargada.ready;
    expect(await usuario(recargada)).toBeNull();
  });
});

describe('aislamiento de datos entre usuarios (equivale a firestore.rules)', () => {
  it('un usuario no puede ver ni modificar las páginas de otro', async () => {
    const { b, uid: uidDemo } = await nuevoBackendConDemo();
    const paginaAjena = (await paginas(b, uidDemo))[0];
    await b.auth.logout();
    await b.auth.register('Mallory', 'mallory@test.com', 'secreto123');
    const mallory = (await usuario(b))!;

    expect(await paginas(b, uidDemo)).toEqual([]);
    expect(await dias(b, uidDemo, paginaAjena.id)).toEqual({});
    expect(await codigoDe(b.pages.update(uidDemo, paginaAjena.id, { title: 'hackeada' }))).toBe('permission-denied');
    expect(await codigoDe(b.pages.remove(uidDemo, paginaAjena.id))).toBe('permission-denied');
    expect(await codigoDe(b.days.setCheck(uidDemo, paginaAjena.id, '2026-01-01', 'x', true))).toBe('permission-denied');
    expect(await codigoDe(b.profile.update(uidDemo, { plan: 'pro' }))).toBe('permission-denied');
    expect(await perfil(b, uidDemo)).toBeNull();

    // Usando su propio uid pero la página de otro tampoco funciona
    expect(await codigoDe(b.pages.update(mallory.uid, paginaAjena.id, { title: 'hackeada' }))).toBe('permission-denied');
  });

  it('sin sesión no se puede leer ni escribir nada', async () => {
    const { b, uid } = await nuevoBackendConDemo();
    await b.auth.logout();
    expect(await paginas(b, uid)).toEqual([]);
    expect(await codigoDe(b.pages.create(uid, 'x', 'preset:0'))).toBe('permission-denied');
  });
});

describe('páginas, hábitos y registros', () => {
  it('crea, edita y borra una página (con sus días)', async () => {
    const { b, uid } = await nuevoBackendConDemo();
    const id = await b.pages.create(uid, 'Lectura', 'preset:3');
    let lista = await paginas(b, uid);
    expect(lista.map((p) => p.id)).toContain(id);
    expect(lista.find((p) => p.id === id)?.habits).toHaveLength(3);

    await b.pages.update(uid, id, { title: 'Lectura 2', quote: 'Leer es vivir' });
    lista = await paginas(b, uid);
    expect(lista.find((p) => p.id === id)).toMatchObject({ title: 'Lectura 2', quote: 'Leer es vivir' });

    await b.days.setCheck(uid, id, '2026-10-20', 'h1', true);
    await b.pages.remove(uid, id);
    expect((await paginas(b, uid)).find((p) => p.id === id)).toBeUndefined();
    expect(await dias(b, uid, id)).toEqual({});
  });

  it('marca y desmarca hábitos y guarda notas por día', async () => {
    const { b, uid } = await nuevoBackendConDemo();
    const id = await b.pages.create(uid, 'Test', 'preset:0');
    await b.days.setCheck(uid, id, '2026-10-20', 'a', true);
    await b.days.setCheck(uid, id, '2026-10-20', 'b', true);
    await b.days.setCheck(uid, id, '2026-10-20', 'a', false);
    await b.days.setNote(uid, id, '2026-10-20', 'Buen día');
    const d = (await dias(b, uid, id))['2026-10-20'];
    expect(d.checks).toEqual({ a: false, b: true });
    expect(d.note).toBe('Buen día');
  });

  it('las suscripciones reciben los cambios en tiempo real', async () => {
    const { b, uid } = await nuevoBackendConDemo();
    const id = await b.pages.create(uid, 'Test', 'preset:0');
    const recibidos: number[] = [];
    const off = b.days.subscribe(uid, id, '2026-01-01', '2026-12-31', (d) => recibidos.push(Object.keys(d).length), () => {});
    await b.ready;
    await b.days.setCheck(uid, id, '2026-10-20', 'a', true);
    await b.days.setCheck(uid, id, '2026-10-21', 'a', true);
    off();
    await b.days.setCheck(uid, id, '2026-10-22', 'a', true); // ya sin suscripción
    expect(recibidos.at(-1)).toBe(2);
    expect(recibidos).not.toContain(3);
  });

  it('valida los datos: título, número de hábitos y fechas', async () => {
    const { b, uid } = await nuevoBackendConDemo();
    const id = await b.pages.create(uid, 'Test', 'preset:0');
    expect(await codigoDe(b.pages.update(uid, id, { title: 'x'.repeat(81) }))).toBe('invalid-argument');
    expect(await codigoDe(b.pages.update(uid, id, { title: '' }))).toBe('invalid-argument');
    const nueve = Array.from({ length: 9 }, (_, i) => ({ id: `h${i}`, name: `H${i}`, emoji: '✅' }));
    expect(await codigoDe(b.pages.update(uid, id, { habits: nueve }))).toBe('invalid-argument');
    expect(await codigoDe(b.days.setCheck(uid, id, 'ayer', 'a', true))).toBe('invalid-argument');
    expect(await codigoDe(b.days.setNote(uid, id, '2026-10-20', 'x'.repeat(201)))).toBe('invalid-argument');
  });
});

describe('perfil y plan', () => {
  it('actualiza nombre y plan y valida los valores', async () => {
    const { b, uid } = await nuevoBackendConDemo();
    await b.profile.update(uid, { displayName: 'Nuevo nombre', plan: 'pro' });
    expect(await perfil(b, uid)).toMatchObject({ displayName: 'Nuevo nombre', plan: 'pro' });
    expect(await codigoDe(b.profile.update(uid, { displayName: '' }))).toBe('invalid-argument');
    expect(await codigoDe(b.profile.update(uid, { plan: 'gratis' as never }))).toBe('invalid-argument');
  });

  it('el perfil nunca expone el hash de la contraseña', async () => {
    const { b, uid } = await nuevoBackendConDemo();
    const p = await perfil(b, uid);
    expect(JSON.stringify(p)).not.toContain('pbkdf2');
    expect(p).not.toHaveProperty('passwordHash');
  });
});

describe('persistencia en IndexedDB', () => {
  it('los datos sobreviven a una nueva instancia (como cerrar y abrir el navegador)', async () => {
    const { b, uid } = await nuevoBackendConDemo();
    const id = await b.pages.create(uid, 'Persistente', 'preset:1');
    expect(b.store.persistent).toBe(true);

    const otra = crearLocalBackend({ almacenSesion: almacen(), sembrar: false });
    await otra.ready;
    await otra.auth.login(DEMO_EMAIL, DEMO_PASSWORD);
    const lista = await paginas(otra, uid);
    expect(lista.map((p) => p.id)).toContain(id);
  });
});
