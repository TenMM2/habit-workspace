import { firebaseConfigured } from '../lib/firebase';
import { firebaseBackend } from './firebaseBackend';
import { crearLocalBackend } from './localBackend';
import type { Backend } from './types';

/**
 * Selección automática del backend:
 *  - con las claves de Firebase en .env → Firebase (Auth + Firestore)
 *  - sin claves → base de datos local persistente (IndexedDB)
 */
export const backend: Backend = firebaseConfigured ? firebaseBackend : crearLocalBackend();

export const modoLocal = backend.mode === 'local';
