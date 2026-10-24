import type { ReactNode } from 'react';
import { CheckSquare } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { modoLocal } from '../backend';

interface Props {
  title: string;
  subtitle: string;
  children: ReactNode;
}

/** Contenedor común de las pantallas de login y registro. */
export default function AuthShell({ title, subtitle, children }: Props) {
  return (
    <div className="relative grid min-h-screen place-items-center px-4 py-10">
      <ThemeToggle className="absolute right-4 top-4" />
      <main className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2 text-lg font-semibold">
          <CheckSquare className="text-accent" size={24} /> Habit Workspace
        </div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mb-6 mt-1 text-sm text-muted">{subtitle}</p>
        {modoLocal && (
          <div className="mb-4 rounded-md border border-line bg-side p-3 text-sm" role="note">
            <strong>Modo local:</strong> tus datos se guardan en este navegador (IndexedDB). Para usar Firebase, rellena el archivo <code>.env</code>.
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
