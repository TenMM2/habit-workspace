import type { EstadoAccion } from './useAccion';

export default function Estado({ estado }: { estado: EstadoAccion | null }) {
  return (
    <div className="min-h-5 text-sm" role="status" aria-live="polite">
      {estado && <span className={estado.tipo === 'error' ? 'text-red-500' : 'text-green-500'}>{estado.texto}</span>}
    </div>
  );
}
