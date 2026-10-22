import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** true si el archivo .env está rellenado; la app lo usa para avisar en vez de fallar en blanco. */
export const firebaseConfigured = Object.values(firebaseConfig).every(
  (v) => typeof v === 'string' && v.length > 0
);

// Con la configuración vacía se usan valores de relleno para que la interfaz arranque
// y muestre el aviso de configuración en lugar de lanzar una excepción al importar.
const app = initializeApp(
  firebaseConfigured
    ? firebaseConfig
    : { apiKey: 'sin-configurar', authDomain: 'localhost', projectId: 'sin-configurar', appId: 'sin-configurar' }
);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
