# Habit Workspace

Plataforma de productividad y seguimiento de hábitos: páginas personalizables (banner, icono, reglas, tracker diario), dashboard, calendario y un asistente IA.
TFG de DAW/DAM. **Stack:** React + Vite + TypeScript + Tailwind · Firebase (Auth, Firestore) o base de datos local · proxy PHP para Gemini · PWA.

## Arranque rápido (modo local, sin cuentas ni claves)

```
npm install
npm run dev          # http://localhost:5173
```

Pulsa **«Entrar con la cuenta demo»** (`demo@habit.local` / `123456`): trae una página de ejemplo con 3 semanas de historial.

Sin claves de Firebase en `.env`, la app usa una **base de datos local persistente** (IndexedDB): usuarios con contraseña hasheada (PBKDF2), sesiones con caducidad, aislamiento entre usuarios y suscripciones en tiempo real. Los datos viven en el navegador y sobreviven a cerrarlo.

## Asistente IA (Gemini)

El navegador **nunca** ve la API key: habla con un proxy PHP (`api/gemini.php`).

```
npm run api          # servidor PHP en http://localhost:8787 (Vite reenvía /api a él)
```

Pon la clave en `api/config.php` (copia de `config.sample.php`) o en la variable de entorno `GEMINI_API_KEY`.
Sin clave, o si Gemini no responde, el asistente usa un **modo de respaldo** con reglas sobre tus datos reales (resumen semanal, hábitos que fallan, rachas, consejos, y crear páginas).
En Windows sin XAMPP, `api/cacert.pem` (certificados raíz, descargable de curl.se/ca/cacert.pem) hace falta para HTTPS.

> **Modelo:** el proyecto empezó con `gemini-2.5-flash`, que Google ya no ofrece a cuentas nuevas. El defecto es `gemini-3.5-flash`, configurable con `model` en `api/config.php`.

## Usar Firebase en vez del modo local

1. Crea un proyecto en la consola de Firebase, añade una app web y activa Authentication (correo y Google) y Firestore.
2. `copy .env.example .env` y rellena las claves. La app cambia sola a Firebase.
3. Publica las reglas: `firebase deploy --only firestore:rules,storage`

Las fotos y banners se guardan comprimidos dentro de Firestore (no se usa Storage, para seguir en el plan gratuito). `storage.rules` queda como parte de la documentación de seguridad.

## Pruebas

```
npm test                 # 35 pruebas unitarias (backend local, seguridad, asistente)
npm run build            # tsc + vite build
node e2e/run.mjs         # 23 pasos en Chrome real (requiere npm run dev y npm run api)
```

## Estructura

```
src/backend/    contrato común + implementación Firebase + implementación local (IndexedDB)
src/lib/        fechas, estadísticas, contexto y respuestas del asistente, imágenes
src/components/ layout, sidebar, ajustes, asistente flotante, tracker
api/gemini.php  proxy PHP hacia Gemini
firestore.rules, storage.rules   reglas de seguridad
tests/, e2e/    pruebas unitarias y de navegador
```

## Seguridad

Ver [SECURITY.md](SECURITY.md).

## Estado

- Fase 1: base, tema, Firebase, reglas, autenticación ✔
- Fase 2: layout, dashboard, calendario, páginas de hábitos y tracker ✔
- Fase 3: ajustes de cuenta, planes simulados, asistente IA con proxy PHP ✔
- Fase 4: PWA, Capacitor/Electron y guía de defensa (pendiente)
