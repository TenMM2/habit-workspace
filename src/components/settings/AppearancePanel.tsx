import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function AppearancePanel() {
  const { theme, toggleTheme } = useTheme();
  const opcion = (valor: 'dark' | 'light', etiqueta: string, icono: JSX.Element) => (
    <button
      type="button"
      role="radio"
      aria-checked={theme === valor}
      onClick={() => theme !== valor && toggleTheme()}
      className={`flex flex-1 flex-col items-center gap-2 rounded-lg border p-4 ${theme === valor ? 'border-accent bg-hover' : 'border-line hover:bg-hover'}`}
    >
      {icono}
      <span className="text-sm">{etiqueta}</span>
    </button>
  );

  return (
    <section className="grid gap-3">
      <h3 className="font-semibold">Tema</h3>
      <div role="radiogroup" aria-label="Tema de la aplicación" className="flex gap-3">
        {opcion('dark', 'Oscuro (Luna)', <Moon size={22} />)}
        {opcion('light', 'Claro (Sol)', <Sun size={22} />)}
      </div>
      <p className="text-sm text-muted">También puedes cambiarlo en cualquier momento con el icono de la barra superior.</p>
      {window.desktop && (
        <p className="mt-2 rounded-md border border-line p-3 text-sm text-muted" data-testid="info-escritorio">
          Aplicación de escritorio · {window.desktop.platform} · Electron {window.desktop.versions.electron} · Chrome{' '}
          {window.desktop.versions.chrome.split('.')[0]}
        </p>
      )}
    </section>
  );
}
