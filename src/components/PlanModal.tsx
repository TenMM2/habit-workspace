import { useState } from 'react';
import { Check } from 'lucide-react';
import Modal from './Modal';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { cambiarPlan } from '../lib/db';
import { FREE_PAGE_LIMIT } from '../types';

const FREE = [`Hasta ${FREE_PAGE_LIMIT} páginas de hábitos`, 'Tracker diario y estadísticas', 'Modo oscuro y claro'];
const PRO = ['Páginas ilimitadas', 'Todo lo del plan Free', 'Asistente IA sin límites'];

/** Gestión de plan SIMULADA: cambia el campo `plan` del usuario en Firestore, sin cobro real. */
export default function PlanModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { plan } = useData();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function cambiar(nuevo: 'free' | 'pro') {
    if (!user) return;
    setBusy(true);
    setError('');
    try {
      await cambiarPlan(user.uid, nuevo);
      onClose();
    } catch {
      setError('No se pudo cambiar el plan. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  const tarjeta = (nombre: string, precio: string, items: string[], activo: boolean, boton: JSX.Element) => (
    <div className={`rounded-lg border p-4 ${activo ? 'border-accent' : 'border-line'}`}>
      <div className="font-semibold">{nombre}</div>
      <div className="mb-3 text-2xl font-semibold">{precio}</div>
      <ul className="mb-4 grid gap-1 text-sm text-muted">
        {items.map((t) => (
          <li key={t} className="flex gap-2">
            <Check size={16} className="mt-0.5 shrink-0 text-accent" /> {t}
          </li>
        ))}
      </ul>
      {boton}
    </div>
  );

  return (
    <Modal title="Planes" onClose={onClose} wide>
      <div className="grid gap-3 sm:grid-cols-2">
        {tarjeta(
          'Free',
          '0 €',
          FREE,
          plan === 'free',
          plan === 'free' ? (
            <button className="btn w-full" disabled>
              Plan actual
            </button>
          ) : (
            <button className="btn w-full" disabled={busy} onClick={() => void cambiar('free')}>
              Volver a Free
            </button>
          )
        )}
        {tarjeta(
          'Pro',
          '4,99 €/mes',
          PRO,
          plan === 'pro',
          plan === 'pro' ? (
            <button className="btn w-full" disabled>
              Plan actual
            </button>
          ) : (
            <button className="btn btn-primary w-full" disabled={busy} onClick={() => void cambiar('pro')}>
              Mejorar a Pro
            </button>
          )
        )}
      </div>
      <p className="mt-4 text-xs text-muted">Simulación para el TFG: no se realiza ningún cobro real.</p>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </Modal>
  );
}
