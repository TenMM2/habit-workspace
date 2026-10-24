import type { AnalisisPagina } from './aiContext';
import { construirContexto } from './aiContext';
import { responderLocal } from './assistantLocal';
import { extraerPropuesta, type PaginaPropuesta } from './paginaPropuesta';

export interface Mensaje {
  rol: 'user' | 'assistant';
  texto: string;
}

export interface RespuestaAsistente {
  texto: string;
  pagina?: PaginaPropuesta;
  /** 'gemini' si respondió el modelo; 'respaldo' si se usaron las respuestas locales. */
  origen: 'gemini' | 'respaldo';
  /** Nombre del modelo que respondió (lo informa el proxy). */
  modelo?: string;
}

// En el móvil (Capacitor) no existe /api: se define la URL completa del proxy al compilar
const ENDPOINT = import.meta.env.VITE_ASSISTANT_URL || '/api/gemini.php';
const TIMEOUT_MS = 30_000;
const MAX_MENSAJES = 12;

/**
 * Pregunta al asistente. Intenta el proxy PHP (que guarda la API key de Gemini en el servidor);
 * si no está disponible, no hay clave o falla la red, responde con el modo de respaldo.
 */
export async function preguntarAsistente(
  historial: Mensaje[],
  analisis: AnalisisPagina[],
  hoy: string,
  ventana: number
): Promise<RespuestaAsistente> {
  const ultimaPregunta = [...historial].reverse().find((m) => m.rol === 'user')?.texto ?? '';
  const respaldo = (): RespuestaAsistente => ({ ...responderLocal(ultimaPregunta, analisis), origen: 'respaldo' });

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: historial.slice(-MAX_MENSAJES).map((m) => ({ role: m.rol, text: m.texto })),
        context: construirContexto(analisis, hoy, ventana),
      }),
      signal: controlador.signal,
    });
    if (!res.ok) return respaldo(); // 503 sin API key, 429 límite de uso, 404 sin proxy…

    const datos = (await res.json()) as { reply?: unknown; model?: unknown };
    if (typeof datos.reply !== 'string' || datos.reply.trim() === '') return respaldo();
    const { texto, pagina } = extraerPropuesta(datos.reply);
    const modelo = typeof datos.model === 'string' ? datos.model.slice(0, 40) : undefined;
    return { texto: texto || 'Aquí tienes la propuesta.', pagina, origen: 'gemini', modelo };
  } catch {
    return respaldo();
  } finally {
    clearTimeout(temporizador);
  }
}
