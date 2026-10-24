import { useRef, useState } from 'react';
import { ImagePlus, Trash2, Upload } from 'lucide-react';
import EditableText from '../EditableText';
import { BANNER_PRESETS, presetGradient } from '../../lib/banners';
import { comprimirImagen, esUrlHttpsValida } from '../../lib/image';
import type { HabitPage } from '../../types';

interface Props {
  page: HabitPage;
  onChange: (cambios: Partial<Omit<HabitPage, 'id'>>) => Promise<void>;
  onDelete: () => void;
}

type Panel = 'banner' | 'avatar' | null;

export default function PageHeader({ page, onChange, onDelete }: Props) {
  const [panel, setPanel] = useState<Panel>(null);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fichero = useRef<HTMLInputElement>(null);

  const gradiente = presetGradient(page.bannerURL);

  async function guardar(cambios: Partial<Omit<HabitPage, 'id'>>) {
    setError('');
    setBusy(true);
    try {
      await onChange(cambios);
      setUrl('');
    } catch {
      setError('No se pudo guardar. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  async function subir(file: File | undefined, tipo: 'banner' | 'avatar') {
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      const data = tipo === 'banner' ? await comprimirImagen(file, 1200, 300) : await comprimirImagen(file, 160, 160);
      await onChange(tipo === 'banner' ? { bannerURL: data } : { avatarURL: data });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la imagen.');
    } finally {
      setBusy(false);
      if (fichero.current) fichero.current.value = '';
    }
  }

  function usarUrl(tipo: 'banner' | 'avatar') {
    const limpia = url.trim();
    if (!esUrlHttpsValida(limpia)) return setError('Escribe una URL válida que empiece por https://');
    void guardar(tipo === 'banner' ? { bannerURL: limpia } : { avatarURL: limpia });
  }

  return (
    <header>
      {/* Banner */}
      <div className="group relative h-40 w-full overflow-hidden bg-hover sm:h-52" style={gradiente ? { background: gradiente } : undefined}>
        {!gradiente && <img src={page.bannerURL} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />}
        <div className="absolute bottom-2 right-3 flex gap-2 opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <button type="button" className="btn !bg-app !py-1 text-xs" onClick={() => setPanel(panel === 'banner' ? null : 'banner')}>
            <ImagePlus size={14} /> Cambiar banner
          </button>
          <button type="button" className="btn !bg-app !py-1 text-xs text-red-500" onClick={onDelete}>
            <Trash2 size={14} /> Borrar página
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl px-4 sm:px-8">
        {/* Avatar superpuesto sobre el borde inferior izquierdo del banner */}
        <button
          type="button"
          onClick={() => setPanel(panel === 'avatar' ? null : 'avatar')}
          className="relative z-10 -mt-10 grid h-20 w-20 place-items-center overflow-hidden rounded-2xl border-4 border-[var(--bg-app)] bg-side text-4xl shadow-md sm:h-24 sm:w-24 sm:text-5xl"
          aria-label="Cambiar icono de la página"
        >
          {page.avatarURL ? (
            <img src={page.avatarURL} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            page.icon
          )}
        </button>

        {panel && (
          <div className="mt-3 grid gap-3 rounded-lg border border-line bg-side p-3 text-sm">
            {panel === 'banner' && (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                {BANNER_PRESETS.map((g, i) => (
                  <button
                    key={g}
                    type="button"
                    aria-label={`Banner ${i + 1}`}
                    className={`h-10 rounded-md border-2 ${page.bannerURL === `preset:${i}` ? 'border-accent' : 'border-transparent'}`}
                    style={{ background: g }}
                    onClick={() => void guardar({ bannerURL: `preset:${i}` })}
                  />
                ))}
              </div>
            )}
            {panel === 'avatar' && (
              <label className="grid gap-1 text-muted">
                Emoji
                <input
                  className="input !w-24 text-center text-xl"
                  maxLength={4}
                  defaultValue={page.icon}
                  aria-label="Emoji del icono"
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== page.icon) void guardar({ icon: v, avatarURL: null });
                  }}
                />
              </label>
            )}
            <div className="flex flex-wrap gap-2">
              <input
                className="input min-w-0 flex-1"
                placeholder="https://… (URL de imagen)"
                aria-label="URL de la imagen"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <button type="button" className="btn" disabled={busy || !url} onClick={() => usarUrl(panel)}>
                Usar URL
              </button>
              <button type="button" className="btn" disabled={busy} onClick={() => fichero.current?.click()}>
                <Upload size={14} /> Subir imagen
              </button>
              {panel === 'avatar' && page.avatarURL && (
                <button type="button" className="btn" disabled={busy} onClick={() => void guardar({ avatarURL: null })}>
                  Quitar imagen
                </button>
              )}
              <input
                ref={fichero}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => void subir(e.target.files?.[0], panel)}
              />
            </div>
            <div className="min-h-4 text-xs text-red-500" role="alert">
              {error}
            </div>
          </div>
        )}

        <EditableText
          ariaLabel="Título de la página"
          value={page.title}
          maxLength={80}
          className="mt-2 text-3xl font-bold sm:text-4xl"
          onCommit={(v) => void guardar({ title: v })}
        />
      </div>
    </header>
  );
}
