import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { cambiarPlan, PRECIO_PRO } from '../../lib/db';
import { FREE_PAGE_LIMIT, type Plan } from '../../types';
import Estado from './Estado';
import { useAccion } from './useAccion';

const FREE = [`Hasta ${FREE_PAGE_LIMIT} páginas de hábitos`, 'Tracker diario y estadísticas', 'Asistente IA con límite de uso'];
const PRO = ['Páginas ilimitadas', 'Todo lo del plan Free', 'Asistente IA sin límites'];

function formatoEuros(n: number): string {
  return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

function Barra({ valor, maximo }: { valor: number; maximo: number | null }) {
  const pct = maximo ? Math.min(100, (valor * 100) / maximo) : 8;
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-hover" aria-hidden="true">
      <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Gestión de planes SIMULADA: cambia el campo `plan` y genera facturas ficticias; no hay cobro real. */
export default function PlansPanel({ avisoLimite = false }: { avisoLimite?: boolean }) {
  const { user } = useAuth();
  const { plan, pages, profile } = useData();
  const accion = useAccion();
  const [almacenamiento, setAlmacenamiento] = useState<string>('');

  useEffect(() => {
    navigator.storage
      ?.estimate?.()
      .then((e) => {
        if (e.usage !== undefined) setAlmacenamiento(`${(e.usage / 1024 / 1024).toFixed(1)} MB`);
      })
      .catch(() => undefined);
  }, []);

  const totalHabitos = pages.reduce((n, p) => n + p.habits.length, 0);
  const facturas = profile?.billing ?? [];

  function cambiar(nuevo: Plan) {
    if (!user) return;
    void accion.ejecutar(() => cambiarPlan(user.uid, nuevo, facturas), nuevo === 'pro' ? 'Ahora tienes el plan Pro (simulado).' : 'Has vuelto al plan Free.');
  }

  const tarjeta = (id: Plan, nombre: string, precio: string, items: string[]) => (
    <div className={`rounded-lg border p-4 ${plan === id ? 'border-accent' : 'border-line'}`}>
      <div className="font-semibold">{nombre}</div>
      <div className="mb-3 text-2xl font-semibold">{precio}</div>
      <ul className="mb-4 grid gap-1 text-sm text-muted">
        {items.map((t) => (
          <li key={t} className="flex gap-2">
            <Check size={16} className="mt-0.5 shrink-0 text-accent" /> {t}
          </li>
        ))}
      </ul>
      {plan === id ? (
        <button className="btn w-full" disabled>
          Plan actual
        </button>
      ) : (
        <button className={`btn w-full ${id === 'pro' ? 'btn-primary' : ''}`} disabled={accion.ocupado} onClick={() => cambiar(id)}>
          {id === 'pro' ? 'Mejorar a Pro' : 'Volver a Free'}
        </button>
      )}
    </div>
  );

  return (
    <div className="grid gap-8">
      {avisoLimite && plan === 'free' && (
        <div className="rounded-lg border border-accent bg-accent-soft p-3 text-sm" role="alert">
          <strong>Has alcanzado el límite del plan Free:</strong> {FREE_PAGE_LIMIT} páginas de hábitos. Mejora a Pro para crear más; tus páginas actuales no se tocan.
        </div>
      )}
      <section className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {tarjeta('free', 'Free', '0 €', FREE)}
          {tarjeta('pro', 'Pro', `${formatoEuros(PRECIO_PRO)}/mes`, PRO)}
        </div>
        <Estado estado={accion.estado} />
        <p className="text-xs text-muted">Simulación para el TFG: no se realiza ningún cobro real.</p>
      </section>

      <section className="grid gap-3">
        <h3 className="font-semibold">Uso del espacio de trabajo</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1">
            <div className="flex justify-between text-sm">
              <span>Páginas</span>
              <span className="text-muted">{plan === 'pro' ? `${pages.length} (sin límite)` : `${pages.length} de ${FREE_PAGE_LIMIT}`}</span>
            </div>
            <Barra valor={pages.length} maximo={plan === 'pro' ? null : FREE_PAGE_LIMIT} />
          </div>
          <div className="flex justify-between text-sm">
            <span>Hábitos creados</span>
            <span className="text-muted">{totalHabitos}</span>
          </div>
          {almacenamiento && (
            <div className="flex justify-between text-sm">
              <span>Almacenamiento usado</span>
              <span className="text-muted">{almacenamiento}</span>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-3">
        <h3 className="font-semibold">Historial de facturación</h3>
        {facturas.length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay facturas.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-muted">
              <tr>
                <th className="py-1 font-medium">Fecha</th>
                <th className="py-1 font-medium">Concepto</th>
                <th className="py-1 text-right font-medium">Importe</th>
              </tr>
            </thead>
            <tbody>
              {facturas.map((f) => (
                <tr key={f.id} className="border-t border-line">
                  <td className="py-1.5">{f.date}</td>
                  <td className="py-1.5">{f.concept}</td>
                  <td className="py-1.5 text-right">{formatoEuros(f.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
