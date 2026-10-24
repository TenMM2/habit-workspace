/**
 * Hash de contraseñas con PBKDF2-SHA256 (Web Crypto) y sal aleatoria por usuario.
 * Formato guardado: pbkdf2$<iteraciones>$<sal base64>$<hash base64>
 * Nunca se guarda la contraseña en claro.
 */
const ITERACIONES = 150_000;

const aBase64 = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes));
const deBase64 = (s: string): Uint8Array => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derivar(password: string, sal: Uint8Array, iteraciones: number): Promise<Uint8Array> {
  const clave = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: sal as BufferSource, iterations: iteraciones },
    clave,
    256
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const sal = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivar(password, sal, ITERACIONES);
  return `pbkdf2$${ITERACIONES}$${aBase64(sal)}$${aBase64(hash)}`;
}

export async function verifyPassword(password: string, guardado: string): Promise<boolean> {
  const [alg, iter, sal, hash] = guardado.split('$');
  if (alg !== 'pbkdf2' || !iter || !sal || !hash) return false;
  const calculado = await derivar(password, deBase64(sal), Number(iter));
  const esperado = deBase64(hash);
  if (calculado.length !== esperado.length) return false;
  // Comparación sin cortocircuito para no filtrar información por tiempos
  let diferencia = 0;
  for (let i = 0; i < calculado.length; i++) diferencia |= calculado[i] ^ esperado[i];
  return diferencia === 0;
}

export function nuevoToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join('');
}
