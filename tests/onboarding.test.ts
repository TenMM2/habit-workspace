import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { crearLocalBackend } from '../src/backend/localBackend';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../src/backend/local/seed';
import { inferirPasos, PASOS, pasosPendientes } from '../src/lib/onboarding';
import { colocarPopover } from '../src/lib/tourPosition';
import type { AppUser, HabitPage, Profile } from '../src/types';

function almacen() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}
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
const perfilDe = (b: ReturnType<typeof crearLocalBackend>, uid: string) => primero<Profile | null>((cb) => b.profile.subscribe(uid, cb, () => {}));
const usuarioDe = (b: ReturnType<typeof crearLocalBackend>) => primero<AppUser | null>((cb) => b.auth.subscribe(cb));

beforeEach(() => {
  (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
});

const pagina = (extra: Partial<HabitPage> = {}): HabitPage => ({
  id: 'p1',
  title: 'T',
  icon: '📓',
  avatarURL: null,
  bannerURL: 'preset:0',
  quote: '',
  rules: [],
  habits: [],
  ...extra,
});

describe('pasos del onboarding', () => {
  it('son 7, con ids únicos, título y explicación', () => {
    expect(PASOS).toHaveLength(7);
    expect(new Set(PASOS.map((p) => p.id)).size).toBe(7);
    for (const p of PASOS) {
      expect(p.titulo.length).toBeGreaterThan(5);
      expect(p.porQue.length).toBeGreaterThan(10);
      expect(p.tourTexto.length).toBeGreaterThan(10);
    }
  });

  it('pasosPendientes cuenta los que faltan', () => {
    expect(pasosPendientes(undefined)).toBe(7);
    expect(pasosPendientes({ pasos: [], oculto: false, tourVisto: false })).toBe(7);
    expect(pasosPendientes({ pasos: ['pagina', 'marca'], oculto: false, tourVisto: true })).toBe(5);
    expect(pasosPendientes({ pasos: PASOS.map((p) => p.id), oculto: false, tourVisto: true })).toBe(0);
    // ids desconocidos no cuentan como pasos hechos
    expect(pasosPendientes({ pasos: ['inventado'], oculto: false, tourVisto: true })).toBe(7);
  });

  it('inferirPasos deduce solo lo que los datos demuestran', () => {
    expect(inferirPasos({ photoURL: null }, [])).toEqual([]);
    expect(inferirPasos({ photoURL: 'data:image/jpeg;base64,xx' }, [])).toEqual(['perfil']);
    expect(inferirPasos({ photoURL: null }, [pagina()])).toEqual(['pagina']);
    const completa = pagina({ quote: 'Algo', rules: ['a'], habits: [1, 2, 3].map((n) => ({ id: String(n), name: 'h' + n, emoji: '✅' })) });
    expect(inferirPasos({ photoURL: null }, [completa])).toEqual(['pagina', 'reglas', 'habitos']);
    // una cita sin reglas (o reglas sin cita) no cuenta
    expect(inferirPasos({ photoURL: null }, [pagina({ quote: 'Algo' })])).toEqual(['pagina']);
  });
});

describe('persistencia del onboarding (IndexedDB)', () => {
  it('una cuenta nueva empieza con el tour sin ver y todos los pasos pendientes', async () => {
    const b = crearLocalBackend({ almacenSesion: almacen() });
    await b.ready;
    await b.auth.register('Ana', 'ana@test.com', 'secreto123');
    const u = (await usuarioDe(b))!;
    const p = (await perfilDe(b, u.uid))!;
    expect(p.onboarding).toEqual({ pasos: [], oculto: false, tourVisto: false });
  });

  it('la cuenta demo arranca con pasos mezclados (hechos y pendientes) y sin tour automático', async () => {
    const b = crearLocalBackend({ almacenSesion: almacen() });
    await b.ready;
    await b.auth.login(DEMO_EMAIL, DEMO_PASSWORD);
    const u = (await usuarioDe(b))!;
    const o = (await perfilDe(b, u.uid))!.onboarding!;
    expect(o.tourVisto).toBe(true);
    const pendientes = pasosPendientes(o);
    expect(pendientes).toBeGreaterThanOrEqual(2);
    expect(pendientes).toBeLessThan(PASOS.length);
  });

  it('guardar progreso, ocultar y reiniciar sobreviven a una nueva instancia', async () => {
    const sesion = almacen();
    const a = crearLocalBackend({ almacenSesion: sesion });
    await a.ready;
    await a.auth.register('Ana', 'ana@test.com', 'secreto123');
    const u = (await usuarioDe(a))!;
    await a.profile.update(u.uid, { onboarding: { pasos: ['pagina', 'marca'], oculto: true, tourVisto: true } });

    const b = crearLocalBackend({ almacenSesion: sesion });
    await b.ready;
    expect((await perfilDe(b, u.uid))!.onboarding).toEqual({ pasos: ['pagina', 'marca'], oculto: true, tourVisto: true });

    await b.profile.update(u.uid, { onboarding: { pasos: [], oculto: false, tourVisto: true } });
    expect((await perfilDe(b, u.uid))!.onboarding!.pasos).toEqual([]);
  });

  it('rechaza un onboarding con forma inválida', async () => {
    const b = crearLocalBackend({ almacenSesion: almacen() });
    await b.ready;
    await b.auth.register('Ana', 'ana@test.com', 'secreto123');
    const u = (await usuarioDe(b))!;
    const malos = [
      { pasos: 'pagina', oculto: false, tourVisto: false },
      { pasos: [1, 2], oculto: false, tourVisto: false },
      { pasos: new Array(50).fill('x'), oculto: false, tourVisto: false },
      { pasos: [], oculto: 'si', tourVisto: false },
      { pasos: ['x'.repeat(100)], oculto: false, tourVisto: false },
    ];
    for (const o of malos) {
      await expect(b.profile.update(u.uid, { onboarding: o as never })).rejects.toMatchObject({ code: 'invalid-argument' });
    }
  });

  it('el onboarding de un usuario no es visible ni modificable por otro', async () => {
    const b = crearLocalBackend({ almacenSesion: almacen() });
    await b.ready;
    await b.auth.register('Ana', 'ana@test.com', 'secreto123');
    const ana = (await usuarioDe(b))!;
    await b.auth.logout();
    await b.auth.login(DEMO_EMAIL, DEMO_PASSWORD);
    await expect(b.profile.update(ana.uid, { onboarding: { pasos: [], oculto: true, tourVisto: true } })).rejects.toBeDefined();
  });
});

describe('colocación de la ventanita del tour', () => {
  const caja = (top: number, left: number, width: number, height: number) => ({ top, left, width, height });
  const pop = { w: 340, h: 180 };

  it('sin elemento se centra', () => {
    const c = colocarPopover(null, pop, 1280, 800);
    expect(c.lado).toBe('centro');
    expect(c.left).toBeCloseTo((1280 - 340) / 2);
  });

  it('prefiere ir debajo del elemento y se mantiene dentro de la pantalla', () => {
    const c = colocarPopover(caja(100, 20, 120, 40), pop, 1280, 800);
    expect(c.lado).toBe('abajo');
    expect(c.top).toBeGreaterThan(140);
    expect(c.left).toBeGreaterThanOrEqual(8);
    expect(c.left + c.width).toBeLessThanOrEqual(1280 - 8);
  });

  it('si no cabe debajo, va encima', () => {
    const c = colocarPopover(caja(700, 600, 100, 40), pop, 1280, 800);
    expect(c.lado).toBe('arriba');
    expect(c.top + pop.h).toBeLessThanOrEqual(700);
  });

  it('un elemento alto a la izquierda lleva la ventanita a su derecha', () => {
    const c = colocarPopover(caja(10, 10, 250, 780), pop, 1280, 800);
    expect(c.lado).toBe('derecha');
    expect(c.left).toBeGreaterThan(260);
  });

  it('en móvil es una hoja que ocupa todo el ancho, arriba o abajo según dónde esté el elemento', () => {
    const bajo = colocarPopover(caja(100, 20, 100, 40), pop, 390, 800);
    expect(bajo.lado).toBe('abajo');
    expect(bajo.width).toBe(390 - 16);
    expect(bajo.top + pop.h).toBeLessThanOrEqual(800);
    const alto = colocarPopover(caja(700, 20, 100, 40), pop, 390, 800);
    expect(alto.lado).toBe('arriba');
    expect(alto.top).toBe(8);
  });

  it('nunca se sale de la pantalla, sea cual sea la posición del elemento', () => {
    for (const [vw, vh] of [[1280, 800], [820, 1000], [390, 800], [320, 568]]) {
      for (let t = 0; t <= vh; t += 97) {
        for (let l = 0; l <= vw; l += 89) {
          const c = colocarPopover(caja(t, l, 80, 40), pop, vw, vh);
          expect(c.left).toBeGreaterThanOrEqual(0);
          expect(c.left + c.width).toBeLessThanOrEqual(vw);
          expect(c.top).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
});
