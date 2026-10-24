import { useState } from 'react';
import { mensajeDeError } from '../../context/AuthContext';
import { ImagenError } from '../../lib/image';

export interface EstadoAccion {
  tipo: 'ok' | 'error';
  texto: string;
}

/** Ejecuta una acción asíncrona mostrando "ocupado" y un mensaje de éxito o error en español. */
export function useAccion() {
  const [estado, setEstado] = useState<EstadoAccion | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function ejecutar(accion: () => Promise<string | void>, exito = 'Cambios guardados.') {
    setEstado(null);
    setOcupado(true);
    try {
      const aviso = await accion();
      setEstado({ tipo: 'ok', texto: aviso || exito });
      return true;
    } catch (e) {
      setEstado({ tipo: 'error', texto: e instanceof ImagenError ? e.message : mensajeDeError(e) });
      return false;
    } finally {
      setOcupado(false);
    }
  }

  return {
    estado,
    ocupado,
    ejecutar,
    /** Muestra un error de validación propio sin llamar al backend. */
    falla: (texto: string) => setEstado({ tipo: 'error', texto }),
  };
}
