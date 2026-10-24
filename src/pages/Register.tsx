import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { mensajeDeError, useAuth } from '../context/AuthContext';
import AuthShell from '../components/AuthShell';
import GoogleButton from '../components/GoogleButton';
import { backend } from '../backend';

export default function Register() {
  const { user, loading, register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  async function ejecutar(accion: () => Promise<void>) {
    setError('');
    setBusy(true);
    try {
      await accion();
      navigate('/', { replace: true });
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setBusy(false);
    }
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setError('Escribe tu nombre.');
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    if (password !== confirm) return setError('Las contraseñas no coinciden.');
    void ejecutar(() => register(name.trim(), email.trim(), password));
  }

  return (
    <AuthShell title="Crea tu cuenta" subtitle="Tu espacio de hábitos, privado y solo tuyo.">
      {backend.supportsGoogle && (
        <>
          <GoogleButton disabled={busy} onClick={() => void ejecutar(loginWithGoogle)} />
          <p className="my-4 text-center text-xs text-muted">o con tu correo</p>
        </>
      )}

      <form onSubmit={enviar} className="grid gap-3" noValidate>
        <label className="grid gap-1 text-sm text-muted">
          Nombre
          <input className="input" type="text" autoComplete="name" maxLength={80} required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="grid gap-1 text-sm text-muted">
          Correo
          <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="grid gap-1 text-sm text-muted">
          Contraseña (mín. 8 caracteres)
          <input className="input" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <label className="grid gap-1 text-sm text-muted">
          Repite la contraseña
          <input className="input" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </label>

        <div className="min-h-5 text-sm text-red-500" role="alert" aria-live="polite">
          {error}
        </div>

        <button className="btn btn-primary" type="submit" disabled={busy || !email || !password}>
          {busy ? 'Creando…' : 'Crear cuenta'}
        </button>
      </form>

      <p className="mt-4 text-sm text-muted">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="text-accent hover:underline">
          Entrar
        </Link>
      </p>
    </AuthShell>
  );
}
