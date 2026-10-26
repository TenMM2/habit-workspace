import { Plus, X } from 'lucide-react';
import EditableText from '../EditableText';
import type { HabitPage } from '../../types';

interface Props {
  page: HabitPage;
  onChange: (cambios: Partial<Omit<HabitPage, 'id'>>) => Promise<void>;
}

const MAX_REGLAS = 12;

export default function RulesSection({ page, onChange }: Props) {
  const guardarReglas = (reglas: string[]) => void onChange({ rules: reglas });

  return (
    <section className="grid gap-6" aria-label="Mentalidad y reglas" data-tour="reglas">
      <blockquote className="border-l-4 border-accent pl-3">
        <EditableText
          ariaLabel="Cita motivacional"
          multiline
          allowEmpty
          maxLength={400}
          placeholder="Escribe una cita o frase que te motive…"
          className="py-1 text-lg italic"
          value={page.quote}
          onCommit={(v) => void onChange({ quote: v })}
        />
      </blockquote>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Reglas y objetivos</h2>
        <ol className="grid list-decimal gap-1 pl-6 marker:text-muted">
          {page.rules.map((regla, i) => (
            <li key={i} className="pl-1">
              <div className="group flex items-center gap-1">
                <EditableText
                  ariaLabel={`Regla ${i + 1}`}
                  value={regla}
                  maxLength={200}
                  onCommit={(v) => guardarReglas(page.rules.map((r, j) => (j === i ? v : r)))}
                />
                <button
                  type="button"
                  className="rounded p-1 text-muted opacity-100 hover:bg-hover md:opacity-0 md:group-hover:opacity-100"
                  aria-label={`Quitar regla ${i + 1}`}
                  onClick={() => guardarReglas(page.rules.filter((_, j) => j !== i))}
                >
                  <X size={14} />
                </button>
              </div>
            </li>
          ))}
        </ol>
        {page.rules.length < MAX_REGLAS && (
          <button
            type="button"
            className="mt-2 flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted hover:bg-hover"
            onClick={() => guardarReglas([...page.rules, 'Nueva regla'])}
          >
            <Plus size={14} /> Añadir regla
          </button>
        )}
      </div>
    </section>
  );
}
