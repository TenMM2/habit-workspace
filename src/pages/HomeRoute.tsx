import { useOutletContext } from 'react-router-dom';
import Dashboard from './Dashboard';

export interface LayoutContext {
  nuevaPagina: () => void;
}

/** Conecta el dashboard con la acción "nueva página" que vive en el layout. */
export default function HomeRoute() {
  const { nuevaPagina } = useOutletContext<LayoutContext>();
  return <Dashboard onNewPage={nuevaPagina} />;
}
