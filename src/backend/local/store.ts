/**
 * Almacén local persistente sobre IndexedDB.
 *
 * Todo el contenido se carga en memoria al arrancar (los datos de una persona son pequeños) y
 * cada escritura se guarda también en IndexedDB. Así las lecturas son instantáneas y los datos
 * sobreviven a cerrar el navegador. Si IndexedDB no está disponible (navegación privada
 * restrictiva) la app sigue funcionando, pero solo durante la sesión.
 */
export const STORES = ['users', 'pages', 'days', 'sessions'] as const;
export type StoreName = (typeof STORES)[number];

const DB_NAME = 'habit-workspace-local';
const DB_VERSION = 1;

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      for (const s of STORES) {
        if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function leerTodo(db: IDBDatabase, store: StoreName): Promise<Map<string, unknown>> {
  return new Promise((resolve, reject) => {
    const out = new Map<string, unknown>();
    const req = db.transaction(store, 'readonly').objectStore(store).openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        out.set(String(cursor.key), cursor.value);
        cursor.continue();
      } else {
        resolve(out);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export class LocalStore {
  private db: IDBDatabase | null = null;
  private data = new Map<StoreName, Map<string, unknown>>();
  /** true si la persistencia en IndexedDB está activa. */
  persistent = false;

  async init(): Promise<void> {
    for (const s of STORES) this.data.set(s, new Map());
    try {
      this.db = await abrir();
      for (const s of STORES) this.data.set(s, await leerTodo(this.db, s));
      this.persistent = true;
    } catch (e) {
      console.warn('IndexedDB no disponible: los datos locales solo duran esta sesión.', e);
      this.db = null;
    }
  }

  get<T>(store: StoreName, key: string): T | undefined {
    return this.data.get(store)?.get(key) as T | undefined;
  }

  /** Todos los valores cuya clave empieza por `prefix` (p. ej. "uid/pageId/"). */
  list<T>(store: StoreName, prefix = ''): T[] {
    const out: T[] = [];
    for (const [k, v] of this.data.get(store) ?? []) {
      if (k.startsWith(prefix)) out.push(v as T);
    }
    return out;
  }

  entries<T>(store: StoreName, prefix = ''): [string, T][] {
    const out: [string, T][] = [];
    for (const [k, v] of this.data.get(store) ?? []) {
      if (k.startsWith(prefix)) out.push([k, v as T]);
    }
    return out;
  }

  async put(store: StoreName, key: string, value: unknown): Promise<void> {
    this.data.get(store)?.set(key, value);
    await this.escribir(store, (os) => os.put(value, key));
  }

  async remove(store: StoreName, key: string): Promise<void> {
    this.data.get(store)?.delete(key);
    await this.escribir(store, (os) => os.delete(key));
  }

  private escribir(store: StoreName, op: (os: IDBObjectStore) => IDBRequest): Promise<void> {
    const db = this.db;
    if (!db) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      op(tx.objectStore(store));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }
}
