# Habit Workspace

React + Vite + TypeScript + Tailwind + Firebase (Auth, Firestore, Storage).

## Arranque
1. Crea un proyecto en https://console.firebase.google.com, añade una app web y activa:
   Authentication (Correo/contraseña y Google), Firestore y Storage.
2. `copy .env.example .env` y rellena las claves.
3. `npm install` y `npm run dev`
4. Reglas: `npm i -g firebase-tools`, `firebase login`, `firebase deploy --only firestore:rules,storage`

## Estado
- Fase 1: estructura, tema oscuro/claro, Firebase, reglas, login/registro/Google, rutas protegidas ✔
