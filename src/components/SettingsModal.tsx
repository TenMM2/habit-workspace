import { useState } from 'react';
import { CreditCard, Palette, User } from 'lucide-react';
import Modal from './Modal';
import AccountPanel from './settings/AccountPanel';
import AppearancePanel from './settings/AppearancePanel';
import PlansPanel from './settings/PlansPanel';

export type PestanaAjustes = 'cuenta' | 'apariencia' | 'plan';

const PESTANAS: { id: PestanaAjustes; etiqueta: string; icono: JSX.Element }[] = [
  { id: 'cuenta', etiqueta: 'Mi cuenta y perfil', icono: <User size={15} /> },
  { id: 'apariencia', etiqueta: 'Apariencia', icono: <Palette size={15} /> },
  { id: 'plan', etiqueta: 'Planes y facturación', icono: <CreditCard size={15} /> },
];

export default function SettingsModal({ inicial, avisoLimite = false, onClose }: { inicial: PestanaAjustes; avisoLimite?: boolean; onClose: () => void }) {
  const [pestana, setPestana] = useState<PestanaAjustes>(inicial);

  return (
    <Modal title="Ajustes" onClose={onClose} wide>
      <div role="tablist" aria-label="Secciones de ajustes" className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={pestana === p.id}
            onClick={() => setPestana(p.id)}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm ${
              pestana === p.id ? 'border-accent font-medium' : 'border-transparent text-muted hover:text-fg'
            }`}
          >
            {p.icono} {p.etiqueta}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {pestana === 'cuenta' && <AccountPanel />}
        {pestana === 'apariencia' && <AppearancePanel />}
        {pestana === 'plan' && <PlansPanel avisoLimite={avisoLimite} />}
      </div>
    </Modal>
  );
}
