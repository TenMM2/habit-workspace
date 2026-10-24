import type { AnalisisHabito, AnalisisPagina } from './aiContext';
import type { PaginaPropuesta } from './paginaPropuesta';

export interface RespuestaIA {
  texto: string;
  pagina?: PaginaPropuesta;
}

/** Minúsculas y sin tildes, para comparar palabras clave. */
const normalizar = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const PLANTILLAS: { claves: string[]; pagina: PaginaPropuesta }[] = [
  {
    claves: ['gimnasio', 'entren', 'fitness', 'deporte', 'musculo', 'correr', 'fuerza'],
    pagina: {
      title: 'Entrenamiento',
      icon: '🏋️',
      quote: 'No cuentes los días, haz que los días cuenten.',
      rules: ['Entrenar como mínimo 4 días a la semana', 'Calentar 10 minutos antes de empezar', 'Dormir al menos 7 horas', 'Registrar el peso de cada ejercicio'],
      habits: [
        { name: 'Entrenar', emoji: '🏋️' },
        { name: 'Proteína', emoji: '🥩' },
        { name: 'Agua (2 L)', emoji: '💧' },
        { name: 'Estiramientos', emoji: '🧘' },
        { name: 'Dormir 7 h', emoji: '😴' },
      ],
    },
  },
  {
    claves: ['estudi', 'ingles', 'idioma', 'examen', 'oposicion', 'aprender', 'curso'],
    pagina: {
      title: 'Estudio',
      icon: '📖',
      quote: 'Un poco cada día supera a mucho un solo día.',
      rules: ['Estudiar a la misma hora cada día', 'Sesiones de 25 minutos con 5 de descanso', 'Repasar lo de ayer antes de empezar', 'Móvil fuera de la mesa'],
      habits: [
        { name: 'Estudio (1 h)', emoji: '📖' },
        { name: 'Repaso', emoji: '🔁' },
        { name: 'Inglés (20 min)', emoji: '🗣️' },
        { name: 'Ejercicios', emoji: '📝' },
      ],
    },
  },
  {
    claves: ['lectura', 'leer', 'libro'],
    pagina: {
      title: 'Lectura',
      icon: '📚',
      quote: 'Un lector vive mil vidas antes de morir.',
      rules: ['Leer 20 páginas al día', 'Un libro cada dos semanas', 'Apuntar una idea de cada sesión'],
      habits: [
        { name: 'Leer 20 páginas', emoji: '📚' },
        { name: 'Anotar una idea', emoji: '✍️' },
        { name: 'Sin pantallas antes de dormir', emoji: '🌙' },
      ],
    },
  },
  {
    claves: ['medita', 'bienestar', 'salud mental', 'ansiedad', 'calma', 'mindful', 'estres'],
    pagina: {
      title: 'Bienestar',
      icon: '🧘',
      quote: 'La calma también se entrena.',
      rules: ['Meditar 10 minutos por la mañana', 'Salir a caminar a diario', 'Escribir tres cosas por las que dar las gracias'],
      habits: [
        { name: 'Meditar', emoji: '🧘' },
        { name: 'Caminar 30 min', emoji: '🚶' },
        { name: 'Gratitud', emoji: '🙏' },
        { name: 'Dormir a hora', emoji: '😴' },
      ],
    },
  },
  {
    claves: ['dieta', 'nutri', 'comida', 'alimenta', 'adelgaz', 'peso'],
    pagina: {
      title: 'Alimentación',
      icon: '🥗',
      quote: 'Lo que comes hoy es tu energía de mañana.',
      rules: ['Cocinar en casa casi todos los días', 'Fruta o verdura en cada comida', 'Sin ultraprocesados entre semana'],
      habits: [
        { name: 'Comida sana', emoji: '🥗' },
        { name: 'Agua (2 L)', emoji: '💧' },
        { name: 'Sin azúcar añadido', emoji: '🚫' },
        { name: 'Fruta', emoji: '🍎' },
      ],
    },
  },
];

const PLANTILLA_GENERAL: PaginaPropuesta = {
  title: 'Mi rutina',
  icon: '🔥',
  quote: 'La constancia vence al talento cuando el talento no es constante.',
  rules: ['Elegir pocos hábitos y hacerlos bien', 'Nunca fallar dos días seguidos', 'Revisar el progreso cada domingo'],
  habits: [
    { name: 'Ejercicio', emoji: '🏃' },
    { name: 'Lectura', emoji: '📚' },
    { name: 'Estudio', emoji: '🧠' },
    { name: 'Diario', emoji: '✍️' },
  ],
};

export function plantillaPara(peticion: string): PaginaPropuesta {
  const t = normalizar(peticion);
  return PLANTILLAS.find((p) => p.claves.some((c) => t.includes(c)))?.pagina ?? PLANTILLA_GENERAL;
}

function todosLosHabitos(analisis: AnalisisPagina[]): (AnalisisHabito & { pagina: string })[] {
  return analisis.flatMap((p) => p.habitos.map((h) => ({ ...h, pagina: p.titulo })));
}

const lista = (hs: (AnalisisHabito & { pagina: string })[]): string =>
  hs.map((h) => `• ${h.emoji} ${h.nombre} (${h.pagina}): ${h.hechos}/${h.dias} días, ${h.pct}%`).join('\n');

function resumen(analisis: AnalisisPagina[]): string {
  const hs = todosLosHabitos(analisis);
  const ordenados = [...hs].sort((a, b) => b.pct - a.pct);
  const mejor = ordenados[0];
  const peor = ordenados[ordenados.length - 1];
  const media = Math.round(hs.reduce((n, h) => n + h.pct, 0) / hs.length);
  const lineas = [`Resumen de los últimos días: cumples de media un ${media}% de tus hábitos.`];
  for (const p of analisis) lineas.push(`• ${p.titulo}: ${p.pct}%`);
  lineas.push(`\nLo mejor: ${mejor.emoji} ${mejor.nombre} (${mejor.pct}%${mejor.racha > 1 ? `, racha de ${mejor.racha} días` : ''}).`);
  if (peor.id !== mejor.id) lineas.push(`Lo que más cuesta: ${peor.emoji} ${peor.nombre} (${peor.pct}%).`);
  lineas.push(media >= 70 ? '\nVas muy bien. Mantén el ritmo y no falles dos días seguidos.' : '\nEl objetivo de esta semana: sube un poco el hábito que más cuesta, no todos a la vez.');
  return lineas.join('\n');
}

function fallos(analisis: AnalisisPagina[]): string {
  const peores = todosLosHabitos(analisis)
    .filter((h) => h.pct < 60)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 4);
  if (peores.length === 0) return 'Ahora mismo no hay ningún hábito por debajo del 60%. ¡Buen trabajo! Sigue vigilando que ninguno baje.';
  return `Estos son los hábitos que más estás fallando:\n${lista(peores)}\n\nSugerencia: hazlos más pequeños (versión de 2 minutos), ponlos justo después de algo que ya haces cada día y no intentes recuperar los días perdidos: empieza hoy.`;
}

function rachas(analisis: AnalisisPagina[]): string {
  const hs = todosLosHabitos(analisis).sort((a, b) => b.racha - a.racha);
  const activas = hs.filter((h) => h.racha > 0).slice(0, 5);
  if (activas.length === 0) return 'Ahora mismo no tienes ninguna racha activa. Marca hoy un hábito y empieza una nueva: el primer día es el más importante.';
  return `Tus rachas activas:\n${activas.map((h) => `• ${h.emoji} ${h.nombre}: ${h.racha} ${h.racha === 1 ? 'día' : 'días'}`).join('\n')}`;
}

function consejos(analisis: AnalisisPagina[]): string {
  const base = [
    '1. Empieza pequeño: un hábito que te lleve menos de 2 minutos es difícil de saltarse.',
    '2. Asócialo a algo que ya haces (después del café, al llegar a casa…).',
    '3. Regla de oro: nunca falles dos días seguidos.',
    '4. Marca el hábito en cuanto lo hagas: ver la racha crecer motiva.',
  ];
  const peor = [...todosLosHabitos(analisis)].sort((a, b) => a.pct - b.pct)[0];
  const personal = peor ? `\nPara ti en concreto: ${peor.emoji} ${peor.nombre} es el que más cuesta (${peor.pct}%). Prueba a ponerlo a primera hora.` : '';
  return `Consejos de constancia:\n${base.join('\n')}${personal}`;
}

const AYUDA =
  'Puedo ayudarte con tus hábitos. Prueba a pedirme:\n• Un resumen semanal\n• Qué hábitos estás fallando\n• Consejos de constancia\n• Tus rachas\n• «Crea una página de gimnasio» (o estudio, lectura, dieta, bienestar…)';

/**
 * Respuestas de respaldo, sin IA: reglas sencillas sobre los datos reales del usuario.
 * Se usan cuando el proxy de Gemini no está disponible o aún no hay API key.
 */
export function responderLocal(pregunta: string, analisis: AnalisisPagina[]): RespuestaIA {
  const t = normalizar(pregunta);

  if (/(crea|crear|genera|generar|haz|hazme|nueva|monta|dise)/.test(t) && /(pagina|rutina|tracker|plantilla)/.test(t)) {
    const pagina = plantillaPara(pregunta);
    return { texto: `Te propongo esta página: «${pagina.title}», con ${pagina.habits.length} hábitos y ${pagina.rules.length} reglas. Puedes crearla con un clic y editarla después.`, pagina };
  }

  if (analisis.length === 0) {
    return { texto: 'Aún no tienes páginas de hábitos, así que no tengo datos que analizar. Pídeme, por ejemplo, «Crea una página de gimnasio» y te preparo una.' };
  }

  if (/(resumen|semana|semanal|balance)/.test(t)) return { texto: resumen(analisis) };
  if (/(fall|peor|flojo|descuid|mal\b|no cumpl|baj|cuesta)/.test(t)) return { texto: fallos(analisis) };
  if (/racha/.test(t)) return { texto: rachas(analisis) };
  if (/(consejo|constancia|motiv|mejorar|ayuda|como|tips)/.test(t)) return { texto: consejos(analisis) };

  return { texto: AYUDA };
}
