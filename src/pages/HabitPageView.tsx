import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import PageHeader from '../components/page/PageHeader';
import RulesSection from '../components/page/RulesSection';
import Tracker from '../components/page/Tracker';
import { actualizarPagina, borrarPagina } from '../lib/db';
import type { HabitPage } from '../types';

export default function HabitPageView() {
  const { pageId = '' } = useParams();
  const { user } = useAuth();
  const { pages, loading } = useData();
  const navigate = useNavigate();

  if (!user) return null;
  const page = pages.find((p) => p.id === pageId);

  if (loading) return <p className="p-8 text-muted" role="status">Cargando…</p>;
  if (!page) return <Navigate to="/" replace />;

  const cambiar = (cambios: Partial<Omit<HabitPage, 'id'>>) => actualizarPagina(user.uid, page.id, cambios);

  async function borrar() {
    if (!page || !user) return;
    if (!confirm(`¿Borrar "${page.title}" y todo su historial? No se puede deshacer.`)) return;
    try {
      await borrarPagina(user.uid, page.id);
      navigate('/', { replace: true });
    } catch {
      alert('No se pudo borrar la página.');
    }
  }

  return (
    <article className="pb-24">
      <PageHeader page={page} onChange={cambiar} onDelete={() => void borrar()} />
      <div className="mx-auto grid max-w-4xl gap-10 px-4 pt-6 sm:px-8">
        <RulesSection page={page} onChange={cambiar} />
        <Tracker uid={user.uid} page={page} onChange={cambiar} />
      </div>
    </article>
  );
}
