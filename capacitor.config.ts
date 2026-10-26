import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor empaqueta la web compilada (dist/) dentro de una app nativa Android/iOS.
 * Guía completa: docs/MULTIPLATAFORMA.md
 *
 * Por defecto el WebView sirve la app por https://localhost (más seguro). Para probar el asistente IA
 * contra el proxy PHP del portátil (http://10.0.2.2:8787 desde el emulador de Android) hay que permitir
 * http, lo que se activa solo con la variable CAP_LOCAL_API=1:
 *     CAP_LOCAL_API=1 npx cap sync android
 */
const apiLocal = process.env.CAP_LOCAL_API === '1';

const config: CapacitorConfig = {
  appId: 'dev.tenmm2.habitworkspace',
  appName: 'Habit Workspace',
  webDir: 'dist',
  backgroundColor: '#191919',
  server: {
    androidScheme: apiLocal ? 'http' : 'https',
    cleartext: apiLocal,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
