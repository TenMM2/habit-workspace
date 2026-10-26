import { createContext, useContext } from 'react';
import type { PasoId } from '../lib/onboarding';

export interface TourControl {
  /** Lanza el tour completo desde el primer paso. */
  iniciar: () => void;
  /** Botón «Hacerlo» de la lista: lleva al usuario al elemento exacto de ese paso con su ventanita. */
  hacer: (id: PasoId) => void;
  activo: boolean;
}

export const TourContext = createContext<TourControl | null>(null);

export function useTour(): TourControl {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour debe usarse dentro del Layout');
  return ctx;
}
