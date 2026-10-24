'use strict';
/**
 * Proceso principal de la aplicación de escritorio (Electron).
 *
 * Seguridad (checklist oficial de Electron):
 *  - nodeIntegration desactivado, contextIsolation y sandbox activados: la web no puede tocar Node.
 *  - La página se sirve por un protocolo propio `app://` desde la carpeta dist (sin servidor local).
 *  - Navegación restringida: solo se permite `app://`; los enlaces externos https se abren en el navegador.
 *  - Política CSP estricta y todos los permisos del navegador (cámara, ubicación…) denegados.
 *  - El proxy hacia la API solo reenvía UNA ruta (/api/gemini.php) al servidor PHP local.
 */
const { app, BrowserWindow, Menu, net, protocol, session, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ESQUEMA = 'app';
const ORIGEN = `${ESQUEMA}://hw`;
const DIST = path.join(__dirname, '..', 'dist');
const API_LOCAL = process.env.HW_API_TARGET || 'http://localhost:8787';
const RUTA_API_PERMITIDA = '/api/gemini.php';

// Modo desarrollo: electron . --dev-url=http://localhost:5173 (carga el servidor de Vite con recarga en vivo)
const argDev = process.argv.find((a) => a.startsWith('--dev-url='));
const DEV_URL = argDev ? argDev.slice('--dev-url='.length) : process.env.ELECTRON_DEV_URL || '';

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

protocol.registerSchemesAsPrivileged([
  // `standard` + `secure` hacen que IndexedDB, localStorage y fetch funcionen como en un origen https
  { scheme: ESQUEMA, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
]);

function respuestaJson(estado, cuerpo) {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'content-type': 'application/json; charset=utf-8' } });
}

/** Reenvía solo /api/gemini.php al servidor PHP local (npm run api). No es un proxy abierto. */
async function proxyApi(peticion, url) {
  if (url.pathname !== RUTA_API_PERMITIDA || peticion.method !== 'POST') return respuestaJson(404, { error: 'not_found' });
  try {
    return await net.fetch(`${API_LOCAL}/gemini.php`, {
      method: 'POST',
      headers: { 'content-type': peticion.headers.get('content-type') || 'application/json' },
      body: Buffer.from(await peticion.arrayBuffer()),
    });
  } catch {
    // El renderer interpreta esto como "sin proxy" y usa las respuestas de respaldo
    return respuestaJson(503, { error: 'api_unavailable' });
  }
}

/** Sirve dist/ con "fallback" a index.html para las rutas de la SPA (/login, /p/xxx…). */
function registrarProtocolo() {
  protocol.handle(ESQUEMA, async (peticion) => {
    const url = new URL(peticion.url);
    if (url.pathname.startsWith('/api/')) return proxyApi(peticion, url);

    let archivo = path.normalize(path.join(DIST, decodeURIComponent(url.pathname)));
    // Evita el path traversal: nunca se sirve nada fuera de dist/
    if (archivo !== DIST && !archivo.startsWith(DIST + path.sep)) return new Response('Prohibido', { status: 403 });
    if (!fs.existsSync(archivo) || !fs.statSync(archivo).isFile()) archivo = path.join(DIST, 'index.html');
    return net.fetch(pathToFileURL(archivo).toString());
  });
}

function origenPermitido(url) {
  return url.startsWith(`${ORIGEN}/`) || (DEV_URL !== '' && url.startsWith(DEV_URL));
}

function abrirEnNavegador(url) {
  try {
    if (new URL(url).protocol === 'https:') void shell.openExternal(url);
  } catch {
    /* URL no válida: se ignora */
  }
}

function endurecerSesion() {
  const sesion = session.defaultSession;
  sesion.setPermissionRequestHandler((_wc, _permiso, responder) => responder(false));
  sesion.setPermissionCheckHandler(() => false);
  if (!DEV_URL) {
    // En desarrollo se omite: Vite inyecta scripts en línea para la recarga en caliente
    sesion.webRequest.onHeadersReceived((detalles, devolver) => {
      devolver({ responseHeaders: { ...detalles.responseHeaders, 'Content-Security-Policy': [CSP] } });
    });
  }
}

function crearVentana() {
  const ventana = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 380,
    minHeight: 560,
    show: false,
    backgroundColor: '#191919',
    title: 'Habit Workspace',
    icon: path.join(DIST, 'icons', 'icon-512.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
    },
  });

  ventana.once('ready-to-show', () => ventana.show());
  ventana.webContents.setWindowOpenHandler(({ url }) => {
    abrirEnNavegador(url);
    return { action: 'deny' };
  });
  ventana.webContents.on('will-navigate', (evento, url) => {
    if (!origenPermitido(url)) {
      evento.preventDefault();
      abrirEnNavegador(url);
    }
  });

  void ventana.loadURL(DEV_URL || `${ORIGEN}/`);
  return ventana;
}

// Una sola instancia: abrir otra vez la app enfoca la ventana existente
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [ventana] = BrowserWindow.getAllWindows();
    if (ventana) {
      if (ventana.isMinimized()) ventana.restore();
      ventana.focus();
    }
  });

  // Ningún <webview> y ninguna ventana secundaria pueden saltarse estas reglas
  app.on('web-contents-created', (_e, contenido) => {
    contenido.on('will-attach-webview', (evento) => evento.preventDefault());
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    registrarProtocolo();
    endurecerSesion();
    crearVentana();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) crearVentana();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
