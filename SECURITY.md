# Seguridad

| Riesgo | Medida | Dónde |
|---|---|---|
| Acceso sin sesión | `ProtectedRoute`: toda ruta interna redirige a `/login` | `components/ProtectedRoute.tsx` |
| Acceso a datos ajenos | Firestore: todo cuelga de `users/{uid}` y solo lo lee/escribe su dueño. Modo local: `exigirUsuario` aplica la misma regla | `firestore.rules`, `backend/localBackend.ts` |
| Contraseñas (modo local) | PBKDF2-SHA256, 150 000 iteraciones, sal aleatoria por usuario; nunca en claro | `backend/local/password.ts` |
| Fuerza bruta (modo local) | 5 fallos por correo → bloqueo de 1 min; siempre se verifica un hash para no revelar qué cuentas existen por tiempos | `backend/localBackend.ts` |
| Sesiones | Token aleatorio de 256 bits, caduca a los 7 días, se elimina al cerrar sesión | `backend/localBackend.ts` |
| Escalada de privilegios | Reglas: el correo y la fecha de alta no se pueden modificar; `plan` solo admite `free`/`pro`; `billing` ≤ 24 entradas | `firestore.rules` |
| Subidas | Imágenes recomprimidas en el navegador a JPEG (≤ 260 KB); URLs solo `https://`; Storage: solo imágenes < 5 MB en la carpeta propia | `lib/image.ts`, `storage.rules` |
| XSS | React escapa todo el texto; no se usa `dangerouslySetInnerHTML`; las negritas del asistente se pintan por trozos, no con HTML | `components/AssistantWidget.tsx` |
| API key de Gemini | Solo en el servidor (`api/config.php` o entorno), en cabecera (no en la URL, para no aparecer en logs); `.gitignore` | `api/gemini.php` |
| Abuso del proxy | Solo orígenes permitidos (CORS), tamaño máx. 40 KB, 12 mensajes, 20 peticiones/min por IP, validación de roles y tipos | `api/gemini.php` |
| Inyección de instrucciones (prompt injection) | Los datos del usuario van en un bloque delimitado y el sistema indica que son datos, no órdenes. Comprobado con un nombre de página malicioso | `api/gemini.php` |
| Salida de la IA no fiable | Las páginas propuestas se validan y recortan (tipos, longitudes, cantidades) antes de crearse; el usuario confirma con un clic | `lib/paginaPropuesta.ts` |
| Fugas de errores | El proxy devuelve códigos genéricos; el detalle va al log del servidor | `api/gemini.php` |
| Archivos internos del proxy | `.htaccess` deniega `config.php` y `config.sample.php` en Apache | `api/.htaccess` |

## Aplicación de escritorio (Electron)

| Riesgo | Medida | Dónde |
|---|---|---|
| La web accede a Node / al sistema | `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`; comprobado: `require`, `process` y `Buffer` no existen en la página | `electron/main.cjs` |
| API expuesta a la web | `contextBridge` expone solo `window.desktop` (plataforma y versiones), congelado y de solo lectura | `electron/preload.cjs` |
| Ejecución de código inyectado | CSP `script-src 'self'` (sin `eval` ni scripts en línea), `object-src 'none'`, `frame-src 'none'`; comprobado con eventos `securitypolicyviolation` | `electron/main.cjs` |
| Navegación a sitios externos | `will-navigate` y `setWindowOpenHandler`: solo `app://`; los enlaces `https` se abren en el navegador del sistema | `electron/main.cjs` |
| Lectura de archivos fuera de la app (*path traversal*) | La ruta se normaliza y se rechaza lo que quede fuera de `dist/`; comprobado con `%2e%2e/` | `electron/main.cjs` |
| Proxy abierto | Solo se reenvía `POST /api/gemini.php`; cualquier otra ruta responde 404 | `electron/main.cjs` |
| Permisos del navegador (cámara, ubicación…) | Todos denegados | `electron/main.cjs` |
| Varias instancias | `requestSingleInstanceLock` | `electron/main.cjs` |

## PWA y service worker

| Riesgo | Medida | Dónde |
|---|---|---|
| Datos privados en caché | El service worker no intercepta `/api/` ni otros orígenes; comprobado que no hay nada de `/api/` en caché | `public/sw.js` |
| Caché obsoleta | Navegaciones «red primero»; en cada instalación se eliminan los `/assets/` de versiones anteriores | `public/sw.js` |
| Scripts en línea (necesarios para una CSP estricta) | El script del tema es un archivo externo | `public/theme-init.js` |

## Limitaciones conocidas (para la memoria)

- **El modo local es para uso personal y demostraciones.** Los datos viven en el navegador del usuario: quien tenga acceso al ordenador y al perfil del navegador puede inspeccionarlos. Un modo multiusuario real exige Firebase o un backend.
- **El límite de 3 páginas del plan Free solo se controla en la interfaz.** Las reglas de Firestore no pueden contar documentos; para forzarlo hace falta una Cloud Function.
- **Los pagos están simulados**: cambiar de plan solo modifica el campo `plan`. Una pasarela real (p. ej. Stripe) debe validar el pago en servidor.
- **El proxy PHP no autentica al usuario.** Está pensado para uso local; en producción habría que verificar el token de Firebase y mover el límite de uso a una base de datos.
- Registro sin verificación de correo electrónico en el modo local.
- El servidor PHP integrado (`php -S`) es solo para desarrollo.
