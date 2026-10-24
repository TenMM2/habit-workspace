/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  /** URL completa del proxy del asistente. Por defecto '/api/gemini.php' (Vite, Electron y producción). */
  readonly VITE_ASSISTANT_URL?: string;
}

/** API expuesta por electron/preload.cjs mediante contextBridge (solo existe en la app de escritorio). */
interface Window {
  desktop?: {
    readonly platform: string;
    readonly versions: { readonly electron: string; readonly chrome: string };
  };
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
