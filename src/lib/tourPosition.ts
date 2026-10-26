export interface Caja {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface Colocacion {
  top: number;
  left: number;
  width: number;
  lado: 'abajo' | 'arriba' | 'derecha' | 'izquierda' | 'centro';
}

const MARGEN = 8;
const HUECO = 14;

const acotar = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max));

/**
 * Calcula dónde poner la ventanita junto al elemento resaltado, sin salirse de la pantalla.
 * En pantallas estrechas se comporta como una hoja inferior (o superior si el elemento está abajo).
 */
export function colocarPopover(objetivo: Caja | null, popover: { w: number; h: number }, vw: number, vh: number): Colocacion {
  const estrecho = vw < 640;
  const ancho = estrecho ? vw - MARGEN * 2 : Math.min(popover.w, vw - MARGEN * 2);

  if (!objetivo) {
    return { top: Math.max(MARGEN, (vh - popover.h) / 2), left: (vw - ancho) / 2, width: ancho, lado: 'centro' };
  }

  const centroX = objetivo.left + objetivo.width / 2;
  const centroY = objetivo.top + objetivo.height / 2;

  if (estrecho) {
    const arriba = centroY > vh / 2;
    return { top: arriba ? MARGEN : Math.max(MARGEN, vh - popover.h - MARGEN), left: MARGEN, width: ancho, lado: arriba ? 'arriba' : 'abajo' };
  }

  const abajo = objetivo.top + objetivo.height + HUECO;
  if (abajo + popover.h <= vh - MARGEN) {
    return { top: abajo, left: acotar(centroX - ancho / 2, MARGEN, vw - ancho - MARGEN), width: ancho, lado: 'abajo' };
  }
  const arriba = objetivo.top - HUECO - popover.h;
  if (arriba >= MARGEN) {
    return { top: arriba, left: acotar(centroX - ancho / 2, MARGEN, vw - ancho - MARGEN), width: ancho, lado: 'arriba' };
  }
  const derecha = objetivo.left + objetivo.width + HUECO;
  if (derecha + ancho <= vw - MARGEN) {
    return { top: acotar(centroY - popover.h / 2, MARGEN, vh - popover.h - MARGEN), left: derecha, width: ancho, lado: 'derecha' };
  }
  const izquierda = objetivo.left - HUECO - ancho;
  if (izquierda >= MARGEN) {
    return { top: acotar(centroY - popover.h / 2, MARGEN, vh - popover.h - MARGEN), left: izquierda, width: ancho, lado: 'izquierda' };
  }
  // El elemento ocupa casi toda la pantalla: la ventanita queda abajo, encima de él
  return { top: Math.max(MARGEN, vh - popover.h - MARGEN), left: (vw - ancho) / 2, width: ancho, lado: 'centro' };
}
