import { useRef, useState, type FormEvent } from 'react';
import { Upload } from 'lucide-react';
import { backend } from '../../backend';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { BANNER_PRESETS, presetGradient } from '../../lib/banners';
import { actualizarPerfil } from '../../lib/db';
import { comprimirImagen } from '../../lib/image';
import Estado from './Estado';
import { useAccion } from './useAccion';

function Seccion({ titulo, children, tour }: { titulo: string; children: React.ReactNode; tour?: string }) {
  return (
    <section className="grid gap-3 border-b border-line pb-6 last:border-0" data-tour={tour}>
      <h3 className="font-semibold">{titulo}</h3>
      {children}
    </section>
  );
}

export default function AccountPanel() {
  const { user } = useAuth();
  const { profile } = useData();
  const uid = user?.uid ?? '';

  const nombre = useAccion();
  const foto = useAccion();
  const banner = useAccion();
  const correo = useAccion();
  const clave = useAccion();

  const [nuevoNombre, setNuevoNombre] = useState(profile?.displayName ?? user?.displayName ?? '');
  const [nuevoCorreo, setNuevoCorreo] = useState('');
  const [claveCorreo, setClaveCorreo] = useState('');
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repite, setRepite] = useState('');
  const ficheroFoto = useRef<HTMLInputElement>(null);
  const ficheroBanner = useRef<HTMLInputElement>(null);

  async function subir(file: File | undefined, ancho: number, alto: number, campo: 'photoURL' | 'bannerURL', accion: ReturnType<typeof useAccion>) {
    if (!file) return;
    await accion.ejecutar(async () => {
      const data = await comprimirImagen(file, ancho, alto);
      await actualizarPerfil(uid, { [campo]: data });
    }, 'Imagen actualizada.');
  }

  function guardarNombre(e: FormEvent) {
    e.preventDefault();
    void nombre.ejecutar(() => actualizarPerfil(uid, { displayName: nuevoNombre.trim() }), 'Nombre actualizado.');
  }

  function cambiarCorreo(e: FormEvent) {
    e.preventDefault();
    void correo
      .ejecutar(() => backend.auth.changeEmail(claveCorreo, nuevoCorreo.trim()))
      .then((ok) => {
        if (ok) {
          setNuevoCorreo('');
          setClaveCorreo('');
        }
      });
  }

  function cambiarClave(e: FormEvent) {
    e.preventDefault();
    if (nueva.length < 8) return clave.falla('La nueva contraseña debe tener al menos 8 caracteres.');
    if (nueva !== repite) return clave.falla('Las contraseñas nuevas no coinciden.');
    void clave.ejecutar(() => backend.auth.changePassword(actual, nueva), 'Contraseña cambiada.').then((ok) => {
      if (ok) {
        setActual('');
        setNueva('');
        setRepite('');
      }
    });
  }

  const inicial = (profile?.displayName ?? user?.displayName ?? '?').charAt(0).toUpperCase();
  const gradienteBanner = profile?.bannerURL ? presetGradient(profile.bannerURL) : null;

  return (
    <div className="grid gap-6">
      <Seccion titulo="Foto de perfil" tour="perfil-foto">
        <div className="flex items-center gap-4">
          {profile?.photoURL ? (
            <img src={profile.photoURL} alt="Tu foto de perfil" className="h-16 w-16 rounded-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="grid h-16 w-16 place-items-center rounded-full bg-accent text-2xl font-semibold text-white">{inicial}</span>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn" disabled={foto.ocupado} onClick={() => ficheroFoto.current?.click()}>
              <Upload size={14} /> Cambiar foto
            </button>
            {profile?.photoURL && (
              <button type="button" className="btn" disabled={foto.ocupado} onClick={() => void foto.ejecutar(() => actualizarPerfil(uid, { photoURL: null }), 'Foto eliminada.')}>
                Quitar
              </button>
            )}
            <input
              ref={ficheroFoto}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                void subir(e.target.files?.[0], 160, 160, 'photoURL', foto);
                e.target.value = '';
              }}
            />
          </div>
        </div>
        <Estado estado={foto.estado} />
      </Seccion>

      <Seccion titulo="Nombre">
        <form onSubmit={guardarNombre} className="flex gap-2">
          <input className="input" aria-label="Nombre" maxLength={80} value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} />
          <button className="btn btn-primary" type="submit" disabled={nombre.ocupado || nuevoNombre.trim() === '' || nuevoNombre.trim() === profile?.displayName}>
            Guardar
          </button>
        </form>
        <Estado estado={nombre.estado} />
      </Seccion>

      <Seccion titulo="Banner por defecto de las páginas nuevas">
        <div
          className="h-20 overflow-hidden rounded-lg bg-hover"
          style={gradienteBanner ? { background: gradienteBanner } : undefined}
        >
          {profile?.bannerURL && !gradienteBanner && <img src={profile.bannerURL} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />}
        </div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {BANNER_PRESETS.map((g, i) => (
            <button
              key={g}
              type="button"
              aria-label={`Banner ${i + 1}`}
              className={`h-9 rounded-md border-2 ${profile?.bannerURL === `preset:${i}` ? 'border-accent' : 'border-transparent'}`}
              style={{ background: g }}
              onClick={() => void banner.ejecutar(() => actualizarPerfil(uid, { bannerURL: `preset:${i}` }), 'Banner por defecto actualizado.')}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn" disabled={banner.ocupado} onClick={() => ficheroBanner.current?.click()}>
            <Upload size={14} /> Subir imagen
          </button>
          <input
            ref={ficheroBanner}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              void subir(e.target.files?.[0], 1200, 300, 'bannerURL', banner);
              e.target.value = '';
            }}
          />
        </div>
        <Estado estado={banner.estado} />
      </Seccion>

      <Seccion titulo="Correo">
        <p className="text-sm text-muted">
          Actual: <span className="text-fg">{profile?.email ?? user?.email}</span>
        </p>
        <form onSubmit={cambiarCorreo} className="grid gap-2">
          <input className="input" type="email" aria-label="Nuevo correo" placeholder="Nuevo correo" autoComplete="email" value={nuevoCorreo} onChange={(e) => setNuevoCorreo(e.target.value)} />
          <input className="input" type="password" aria-label="Contraseña actual para confirmar" placeholder="Tu contraseña actual" autoComplete="current-password" value={claveCorreo} onChange={(e) => setClaveCorreo(e.target.value)} />
          <button className="btn justify-self-start" type="submit" disabled={correo.ocupado || !nuevoCorreo || !claveCorreo}>
            Cambiar correo
          </button>
        </form>
        <Estado estado={correo.estado} />
      </Seccion>

      <Seccion titulo="Contraseña">
        <form onSubmit={cambiarClave} className="grid gap-2">
          <input className="input" type="password" aria-label="Contraseña actual" placeholder="Contraseña actual" autoComplete="current-password" value={actual} onChange={(e) => setActual(e.target.value)} />
          <input className="input" type="password" aria-label="Nueva contraseña" placeholder="Nueva contraseña (mín. 8 caracteres)" autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} />
          <input className="input" type="password" aria-label="Repite la nueva contraseña" placeholder="Repite la nueva contraseña" autoComplete="new-password" value={repite} onChange={(e) => setRepite(e.target.value)} />
          <button className="btn justify-self-start" type="submit" disabled={clave.ocupado || !actual || !nueva || !repite}>
            Cambiar contraseña
          </button>
        </form>
        <Estado estado={clave.estado} />
      </Seccion>
    </div>
  );
}
