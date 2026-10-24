/** Aplicación de escritorio (Electron): el preload expone `window.desktop`. */
export const esEscritorio = (): boolean => typeof window !== 'undefined' && 'desktop' in window;

/**
 * Registra el service worker (instalable y uso sin conexión).
 * Solo en producción: en desarrollo el caché estorbaría al recargar con HMR.
 * En Electron no se registra: los archivos ya están empaquetados dentro de la aplicación.
 */
export function registrarServiceWorker(): void {
  if (!import.meta.env.PROD || esEscritorio() || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((e) => console.warn('No se pudo registrar el service worker', e));
  });
}
