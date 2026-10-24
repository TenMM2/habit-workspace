# Guía multiplataforma

Una sola base de código (`src/`) se distribuye por cuatro canales. Todos parten de la web compilada en `dist/` (`npm run build`).

| Canal | Qué es | Estado | Comando |
|---|---|---|---|
| Web | Navegador | ✅ Verificado | `npm run dev` |
| **PWA** | Web instalable, con uso sin conexión | ✅ Verificado (11 comprobaciones) | `npm run build` + `npm run preview` |
| **Electron** | Programa de Windows | ✅ Verificado (16 comprobaciones, también el `.exe`) | `npm run desktop` |
| **Capacitor** | App Android/iOS | 🟡 Estructura sincronizada; APK sin compilar | `npm run cap:android` |

---

## 1 · PWA (móvil, tablet y PC desde el navegador)

**Archivos:** `public/manifest.webmanifest`, `public/sw.js`, `public/icons/*`, `src/lib/pwa.ts`.

```powershell
npm run build
npm run preview          # http://localhost:4173
```

- **Instalar:** en Chrome/Edge aparece el icono de instalar en la barra de direcciones. En Android, «Añadir a pantalla de inicio»; en iOS, *Compartir → Añadir a pantalla de inicio*.
- **Probar sin conexión:** DevTools → *Application* → *Service Workers* → marcar *Offline*, o pestaña *Network* → *Offline*, y recargar.
- **El service worker solo se registra en producción** (`vite build`); en `npm run dev` no, para no cachear durante el desarrollo.
- **Regenerar los iconos** (se renderizan desde un SVG con Chrome): `npm run icons`.
- Para instalar la PWA en un **móvil real** hace falta servirla por HTTPS (o `localhost`); por ejemplo, con un túnel como `cloudflared`/`ngrok`, o desplegándola en un hosting estático.

## 2 · Electron (escritorio Windows)

**Archivos:** `electron/main.cjs` (proceso principal), `electron/preload.cjs` (puente `contextBridge`), `scripts/lanzar-electron.mjs`, `scripts/empaquetar.mjs`.

```powershell
npm run desktop          # compila y abre la aplicación
npm run electron:dev     # con recarga en vivo (necesita `npm run dev` en otra terminal)
npm run desktop:pack     # genera release\HabitWorkspace-win32-x64\HabitWorkspace.exe
```

- **El asistente en escritorio:** abre otra terminal con `npm run api`. Electron reenvía `POST /api/gemini.php` al servidor PHP de `http://localhost:8787` (se cambia con la variable `HW_API_TARGET`). Sin PHP, el asistente usa el modo de respaldo.
- **Datos:** la app de escritorio guarda los suyos en su propio perfil (`%APPDATA%\Habit Workspace`), independientes de los del navegador.
- **`ELECTRON_RUN_AS_NODE`:** algunos editores la definen y Electron arranca como Node (error `registerSchemesAsPrivileged`). El lanzador `lanzar-electron.mjs` la elimina; si ejecutas Electron a mano, hazlo desde una terminal sin esa variable.
- **Seguridad:** ver el apartado 8.2 de la memoria (aislamiento de contexto, sandbox, protocolo `app://`, CSP, navegación y permisos restringidos).
- **Para distribuir en serio** haría falta un instalador firmado (p. ej. `electron-builder`) y un icono `.ico`; fuera del alcance de este TFG.

## 3 · Capacitor (Android / iOS)

**Archivos:** `capacitor.config.ts`, `android/` (proyecto nativo generado).

Ya está hecho: `npx cap add android` y `npx cap sync android`. Para compilar necesitas:

1. **Android Studio** con un SDK de Android y, opcionalmente, un emulador.
2. Variable `ANDROID_HOME` (o abrir el proyecto desde Android Studio, que la gestiona).

```powershell
npm run cap:android      # build + cap sync android + abre Android Studio
```

En Android Studio: *Run ▸ Run 'app'* (emulador o móvil con depuración USB) o *Build ▸ Build APK(s)*.

**El asistente de IA en el móvil.** En un teléfono no existe la ruta relativa `/api`: hay que darle la URL absoluta del proxy al compilar.

```powershell
# .env
VITE_ASSISTANT_URL=http://10.0.2.2:8787/gemini.php     # 10.0.2.2 = el portátil, visto desde el emulador de Android

$env:CAP_LOCAL_API = "1"                                  # permite http (solo para esta prueba)
npm run cap:sync
```

Con `CAP_LOCAL_API=1`, `capacitor.config.ts` cambia el esquema a `http` y activa `cleartext`; sin la variable, el WebView usa `https://localhost`
(más seguro). En producción el proxy debería ir por HTTPS.

**iOS** requiere un Mac con Xcode: `npm i @capacitor/ios` → `npx cap add ios` → `npx cap open ios`.

**Iconos y *splash* nativos:** `npm i -D @capacitor/assets` y colocar `assets/icon.png` (1024×1024, ya existe `public/icons/icon-1024.png`).

## Resumen de verificación

```powershell
npm run build                    # tsc + vite build
npm test                         # 35 pruebas unitarias
node e2e/run.mjs                 # 23 pasos (web; necesita `npm run dev`)
node e2e/pwa.mjs                 # 11 pasos (PWA; necesita `npm run preview`)
node e2e/electron.mjs            # 16 pasos (Electron; necesita `npm run build`)
$env:EXE="release\HabitWorkspace-win32-x64\HabitWorkspace.exe"; node e2e/electron.mjs   # lo mismo, sobre el .exe
```

Los scripts de `e2e/` usan `playwright-core` y Google Chrome (`CHROME_PATH` si no está en la ruta por defecto).
