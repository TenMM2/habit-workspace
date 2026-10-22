import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const aOscuro = theme === 'light';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`rounded-md p-2 text-muted transition-colors hover:bg-hover hover:text-fg ${className}`}
      aria-label={aOscuro ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
      title={aOscuro ? 'Modo oscuro' : 'Modo claro'}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
