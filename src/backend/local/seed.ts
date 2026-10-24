import { addDays, todayISO } from '../../lib/dates';
import { nuevoId } from '../../lib/ids';
import type { HabitPage } from '../../types';

export const DEMO_EMAIL = 'demo@habit.local';
export const DEMO_PASSWORD = '123456';

/** Página de ejemplo con el aspecto de una rutina real. */
export function paginaDemo(): { page: Omit<HabitPage, 'id'>; checks: { date: string; ids: string[]; note: string }[] } {
  const habits = [
    { id: nuevoId(), name: 'Gimnasio', emoji: '🏋️' },
    { id: nuevoId(), name: 'Dieta', emoji: '🥗' },
    { id: nuevoId(), name: 'Inglés', emoji: '🗣️' },
    { id: nuevoId(), name: 'Lectura', emoji: '📚' },
    { id: nuevoId(), name: 'Diario', emoji: '✍️' },
  ];
  const page: Omit<HabitPage, 'id'> = {
    title: 'Mi rutina diaria',
    icon: '🔥',
    avatarURL: null,
    bannerURL: 'preset:2',
    quote: 'La disciplina es elegir entre lo que quieres ahora y lo que más quieres.',
    rules: [
      'Entrenar mínimo 4 días a la semana',
      'Estudiar inglés 20 minutos cada día',
      'Leer 10 páginas antes de dormir',
      'Móvil fuera del dormitorio',
    ],
    habits,
  };

  // Historial de las últimas 3 semanas, con un patrón determinista (sin azar) para que sea reproducible
  const hoy = todayISO();
  const checks: { date: string; ids: string[]; note: string }[] = [];
  for (let i = 20; i >= 1; i--) {
    const fecha = addDays(hoy, -i);
    const ids = habits.filter((_, h) => (i * 7 + h * 3) % 5 !== 0 && !(h === 0 && i % 7 === 3)).map((h) => h.id);
    checks.push({ date: fecha, ids, note: i % 6 === 0 ? 'Buen día, mucha energía' : '' });
  }
  return { page, checks };
}
