import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { mensajeDeError, useAuth } from '../context/AuthContext';
import AuthShell from '../components/AuthShell';
import GoogleButton from '../components/GoogleButton';
import { backend, modoLocal } from '../backend';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../backend/local/seed';

export default function Login() {
  const { user, loading, login, loginWithGoogle, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destino = (location.state as { from?: string } | null)?.from ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to={destino} replace />;

  async function ejecutar(accion: () => Promise<void>, alTerminar?: () => void) {
    setError('');
    setInfo('');
    setBusy(true);
    try {
      await accion();
      alTerminar?.();
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setBusy(false);
    }
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    void ejecutar(() => login(email.trim(), password), () => navigate(destino, { replace: true }));
  }

  function olvido() {
    if (!email.trim()) {
      setError('Escribe tu correo arriba y vuelve a pulsar "¿Olvidaste la contraseña?".');
      return;
    }
    void ejecutar(
      () => resetPassword(email.trim()),
      () => setInfo('Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña.')
    );
  }

  return (
    <AuthShell title="Bienvenido de nuevo" subtitle="Entra para seguir con tus hábitos.">
      {backend.supportsGoogle ? (
        <>
          <GoogleButton
            disabled={busy}
            onClick={() => void ejecutar(loginWithGoogle, () => navigate(destino, { replace: true }))}
          />
          <p className="my-4 text-center text-xs text-muted">o con tu correo</p>
        </>
      ) : (
        modoLocal && (
          <>
            <button
              type="button"
              className="btn w-full"
              disabled={busy}
              onClick={() => void ejecutar(() => login(DEMO_EMAIL, DEMO_PASSWORD), () => navigate(destino, { replace: true }))}
            >
              Entrar con la cuenta demo
            </button>
            <p className="my-4 text-center text-xs text-muted">o con tu correo</p>
          </>
        )
      )}

      <form onSubmit={enviar} className="grid gap-3" noValidate>
        <label className="grid gap-1 text-sm text-muted">
          Correo
          <input
            className="input"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm text-muted">
          Contraseña
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <div className="min-h-5 text-sm" role="alert" aria-live="polite">
          {error && <span className="text-red-500">{error}</span>}
          {info && <span className="text-muted">{info}</span>}
        </div>

        <button className="btn btn-primary" type="submit" disabled={busy || !email || !password}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <div className="mt-4 flex justify-between text-sm">
        <button type="button" className="text-accent hover:underline" onClick={olvido} disabled={busy}>
          ¿Olvidaste la contraseña?
        </button>
        <Link to="/registro" className="text-accent hover:underline">
          Crear cuenta
        </Link>
      </div>
    </AuthShell>
  );
}
