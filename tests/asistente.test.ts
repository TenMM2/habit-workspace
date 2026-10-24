import { describe, expect, it } from 'vitest';
import { analizar, construirContexto } from '../src/lib/aiContext';
import { plantillaPara, responderLocal } from '../src/lib/assistantLocal';
import { extraerPropuesta, sanearPropuesta } from '../src/lib/paginaPropuesta';
import { addDays } from '../src/lib/dates';
import { porcentajeUltimosDias, rachaGlobal, resumenDia, type DaysByPage } from '../src/lib/stats';
import type { HabitPage } from '../src/types';

const HOY = '2026-10-24';
const pagina: HabitPage = {
  id: 'p1',
  title: 'Rutina',
  icon: '🔥',
  avatarURL: null,
  bannerURL: 'preset:0',
  quote: 'Constancia',
  rules: ['Regla uno'],
  habits: [
    { id: 'gym', name: 'Gimnasio', emoji: '🏋️' },
    { id: 'lee', name: 'Lectura', emoji: '📚' },
  ],
};

/** Marca `gym` los últimos 3 días (hoy incluido) y `lee` solo hace 10 días. */
function datos(): DaysByPage {
  const dias: DaysByPage['p1'] = {};
  for (let i = 0; i < 3; i++) {
    const f = addDays(HOY, -i);
    dias[f] = { date: f, note: '', checks: { gym: true } };
  }
  const f = addDays(HOY, -10);
  dias[f] = { date: f, note: '', checks: { lee: true } };
  return { p1: dias };
}

describe('análisis de hábitos', () => {
  it('calcula cumplimiento y racha por hábito', () => {
    const [p] = analizar([pagina], datos(), HOY, 14);
    const gym = p.habitos.find((h) => h.id === 'gym')!;
    const lee = p.habitos.find((h) => h.id === 'lee')!;
    expect(gym).toMatchObject({ hechos: 3, dias: 14, pct: 21, racha: 3 });
    expect(lee).toMatchObject({ hechos: 1, pct: 7, racha: 0 });
    expect(p.pct).toBe(14); // (3+1) / 28
  });

  it('la racha no se rompe si hoy aún no está marcado', () => {
    const d = datos();
    delete d.p1[HOY];
    const gym = analizar([pagina], d, HOY, 14)[0].habitos[0];
    expect(gym.racha).toBe(2);
  });

  it('el contexto incluye hábitos y datos, y respeta el límite de tamaño', () => {
    const texto = construirContexto(analizar([pagina], datos(), HOY, 14), HOY, 14);
    expect(texto).toContain('Gimnasio: 3/14');
    expect(texto).toContain('racha actual 3');
    expect(texto).toContain('2026-10-24 (sábado)');
    const enorme = analizar(
      Array.from({ length: 200 }, (_, i) => ({ ...pagina, id: `p${i}`, title: 'x'.repeat(60) })),
      {},
      HOY,
      14
    );
    expect(construirContexto(enorme, HOY, 14).length).toBeLessThan(6100);
  });

  it('sin páginas, el contexto lo indica', () => {
    expect(construirContexto([], HOY, 14)).toContain('no tiene ninguna página');
  });
});

describe('estadísticas globales del dashboard', () => {
  it('resumen del día, racha global y porcentaje semanal', () => {
    const d = datos();
    expect(resumenDia([pagina], d, HOY)).toEqual({ hechos: 1, total: 2 });
    expect(rachaGlobal([pagina], d, HOY, 60)).toBe(3);
    expect(porcentajeUltimosDias([pagina], d, HOY, 7)).toBe(Math.round((3 * 100) / 14));
  });
});

describe('propuestas de página del asistente (entrada no fiable)', () => {
  it('acepta una propuesta válida y recorta cantidades', () => {
    const p = sanearPropuesta({
      title: 'Gimnasio',
      icon: '🏋️',
      quote: 'Vamos',
      rules: Array.from({ length: 30 }, (_, i) => `r${i}`),
      habits: Array.from({ length: 20 }, (_, i) => ({ name: `h${i}`, emoji: '✅' })),
    });
    expect(p?.habits).toHaveLength(8);
    expect(p?.rules).toHaveLength(12);
  });

  it('rechaza lo que no es una propuesta', () => {
    expect(sanearPropuesta(null)).toBeNull();
    expect(sanearPropuesta('texto')).toBeNull();
    expect(sanearPropuesta({ title: '', habits: [{ name: 'a' }] })).toBeNull();
    expect(sanearPropuesta({ title: 'T', habits: [] })).toBeNull();
    expect(sanearPropuesta({ title: 'T', habits: [{ name: 5 }] })).toBeNull();
  });

  it('recorta textos excesivos y no deja pasar HTML como estructura', () => {
    const p = sanearPropuesta({ title: 'x'.repeat(500), habits: [{ name: '<img src=x onerror=alert(1)>', emoji: 'e'.repeat(50) }] });
    expect(p?.title).toHaveLength(80);
    expect(p?.habits[0].emoji.length).toBeLessThanOrEqual(8);
    // Se conserva como texto plano: React lo escapa al pintarlo
    expect(typeof p?.habits[0].name).toBe('string');
  });

  it('extrae el bloque ```pagina de la respuesta y lo quita del texto visible', () => {
    const r = extraerPropuesta('Aquí tienes.\n```pagina\n{"title":"Estudio","habits":[{"name":"Leer","emoji":"📚"}]}\n```');
    expect(r.texto).toBe('Aquí tienes.');
    expect(r.pagina?.title).toBe('Estudio');
  });

  it('un bloque con JSON roto no rompe nada', () => {
    const r = extraerPropuesta('Hola\n```pagina\n{no es json}\n```');
    expect(r.pagina).toBeUndefined();
    expect(r.texto).toBe('Hola');
  });

  it('sin bloque, devuelve el texto tal cual', () => {
    expect(extraerPropuesta('Solo texto')).toEqual({ texto: 'Solo texto' });
  });
});

describe('modo de respaldo (sin Gemini)', () => {
  const analisis = analizar([pagina], datos(), HOY, 14);

  it('entiende «crea una página de…» y propone la plantilla correcta', () => {
    const r = responderLocal('Crea una página de gimnasio', analisis);
    expect(r.pagina?.title).toBe('Entrenamiento');
    expect(responderLocal('hazme una rutina de lectura', analisis).pagina?.title).toBe('Lectura');
    expect(plantillaPara('algo raro').title).toBe('Mi rutina');
  });

  it('funciona aunque el usuario no tenga páginas', () => {
    expect(responderLocal('Resumen semanal', []).texto).toContain('Aún no tienes páginas');
    expect(responderLocal('crea una página de estudio', []).pagina).toBeDefined();
  });

  it('el resumen y los fallos usan los datos reales', () => {
    expect(responderLocal('Resumen semanal', analisis).texto).toContain('Gimnasio');
    const fallos = responderLocal('¿Qué hábitos estoy fallando?', analisis).texto;
    expect(fallos).toContain('Lectura');
  });

  it('rachas, consejos y mensaje de ayuda', () => {
    expect(responderLocal('¿Cómo van mis rachas?', analisis).texto).toContain('Gimnasio: 3 días');
    expect(responderLocal('Consejos de constancia', analisis).texto).toContain('Consejos de constancia');
    expect(responderLocal('blablabla', analisis).texto).toContain('Puedo ayudarte');
  });
});
