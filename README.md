<div align="center">

# ✅ Habit Workspace

**Plataforma multiplataforma de seguimiento de hábitos con asistente de IA**

*Trabajo de Fin de Grado conjunto · DAW + DAM · Diciembre de 2026*

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Auth%20%2B%20Firestore-FFCA28?logo=firebase&logoColor=black)
![IndexedDB](https://img.shields.io/badge/IndexedDB-modo%20local-555)
![PHP](https://img.shields.io/badge/PHP-8.4-777BB4?logo=php&logoColor=white)
![Gemini](https://img.shields.io/badge/Google-Gemini-4285F4?logo=googlegemini&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-offline-5A0FC8?logo=pwa&logoColor=white)
![Electron](https://img.shields.io/badge/Electron-45-47848F?logo=electron&logoColor=white)
![Capacitor](https://img.shields.io/badge/Capacitor-8-119EFF?logo=capacitor&logoColor=white)
![Tests](https://img.shields.io/badge/tests-85%20✔-brightgreen)

[Memoria del TFG](docs/MEMORIA_TFG.md) · [Guía de defensa](docs/GUIA_DEFENSA.md) · [Seguridad](SECURITY.md) · [Guía multiplataforma](docs/MULTIPLATAFORMA.md)

</div>

---

## Qué es

Habit Workspace es una aplicación para planificar y registrar hábitos diarios con la sencillez de Notion o Google Tasks. Cada persona crea
tantas **páginas** como quiera —con banner, icono, título, cita motivacional, reglas y una tabla de seguimiento mensual—, ve su racha y su
cumplimiento en un panel y un calendario, y conversa con un **asistente de IA** que conoce sus datos y puede proponer páginas nuevas.

**Una sola base de código, cuatro formas de usarla:**

| | Canal | Titulación | Estado |
|---|---|---|---|
| 🌐 | Aplicación web (React + TypeScript) | DAW | ✅ Verificado |
| 📲 | PWA instalable que funciona **sin conexión** | DAW / DAM | ✅ Verificado |
| 🖥️ | Programa de escritorio para Windows (**Electron**, `.exe`) | DAM | ✅ Verificado |
| 📱 | App Android/iOS (**Capacitor**) | DAM | 🟡 Estructura lista; APK sin compilar |

## Arquitectura

```
┌───────────────────────── Frontend React + TypeScript ─────────────────────────┐
│  Interfaz → Contextos (Auth · Data · Theme) → interfaz Backend                │
└────────────────────────────────┬──────────────────────────────┬───────────────┘
        con claves en .env       │         sin claves           │  POST /api/gemini.php
             ┌───────────────────┘                └────────┐     ▼
     Firebase (Auth + Firestore)          IndexedDB local   │  Proxy PHP 8.4 ──▶ Google Gemini
                                (PBKDF2 · sesiones · demo)  │  (la clave solo vive aquí)
                                                            └─ sin clave / error → modo de respaldo
```

La app habla con **una única interfaz de datos** con dos implementaciones intercambiables (Firebase o local), elegida automáticamente. Diagramas
completos (arquitectura, modelo de datos, flujos de autenticación y de IA) en la [memoria](docs/MEMORIA_TFG.md) y en [`docs/diagramas/`](docs/diagramas/).

## Funcionalidades

**Fase 1 · Base y autenticación**
- Tema oscuro por defecto con interruptor Luna/Sol, sin parpadeo al cargar
- Registro, login, recuperación de contraseña y Google (con Firebase)
- Rutas protegidas: sin sesión no se ve nada interno

**Fase 2 · Espacio de trabajo**
- Barra lateral colapsable (cajón táctil en móvil) y buscador rápido `Ctrl + K`
- Panel con racha, hábitos de hoy, % semanal y calendario mensual
- **Páginas de hábitos** editables en el sitio: banner (galería, URL o imagen), avatar superpuesto, título, cita y reglas
- **Tracker mensual** de un toque, **sin scroll lateral** (ni en móvil), con notas por día y filtros

**Fase 3 · Cuenta, planes y asistente**
- Ajustes: perfil, foto, banner por defecto, correo, contraseña, tema
- Planes Free/Pro **simulados** con uso del espacio e historial de facturación
- Asistente flotante con el contexto de tus hábitos (resumen semanal, qué fallas, consejos, crear páginas)
- Proxy en PHP que oculta la API key, y **modo de respaldo** si no hay IA

**Fase 4 · Multiplataforma**
- PWA con manifest, iconos (192/512/maskable/Apple) y Service Worker; funciona sin conexión
- Electron seguro: aislamiento de contexto, sandbox, `contextBridge`, protocolo `app://`, CSP estricta
- Proyecto Android de Capacitor sincronizado

## Seguridad (resumen)

| Medida | Detalle |
|---|---|
| Aislamiento por usuario | Reglas de Firestore por `uid`; en local, comprobación en cada operación |
| Contraseñas | PBKDF2-SHA256, 150 000 iteraciones, sal por usuario |
| Fuerza bruta | Bloqueo tras 5 fallos; sin pistas de qué cuentas existen |
| Clave de Gemini | Solo en el servidor PHP, en cabecera; nunca en el navegador ni en Git |
| Proxy | Orígenes permitidos, límites de tamaño y de frecuencia (20/min/IP) |
| IA | Datos delimitados como «datos, no instrucciones»; salida validada; nada se crea sin confirmación |
| Electron | `nodeIntegration` off, `contextIsolation` + `sandbox` on, CSP, navegación y permisos restringidos |

Detalle y **limitaciones conocidas** (p. ej. el límite del plan Free solo está en la interfaz) en [SECURITY.md](SECURITY.md).

## Resultados de las pruebas

Todas ejecutadas sobre el código entregado:

| Nivel | Herramienta | Resultado |
|---|---|---|
| Compilación estricta | `tsc --noEmit` | ✅ sin errores |
| Empaquetado | `vite build` | ✅ (1,0 MB JS · 268 KB comprimido) |
| Unitarias | Vitest + fake-indexeddb | ✅ **35 / 35** |
| E2E web (Chrome) | Playwright | ✅ **23 / 23** |
| E2E PWA — instalabilidad y **modo sin conexión** (Chrome) | Playwright + CDP | ✅ **11 / 11** |
| E2E Electron — también contra el `.exe` empaquetado | Playwright `_electron` | ✅ **16 / 16** |

Además de que pasen, se comprobó que **detectan fallos**: se rompió a propósito el bloqueo por intentos y el aislamiento entre usuarios, y los tests fallaron.

## Cómo ejecutarlo

### Requisitos
Node.js 20+ · (opcional) PHP 8.x para el asistente con Gemini · Google Chrome para las pruebas E2E.

### 1 · Instalar

```bash
git clone https://github.com/TenMM2/habit-workspace.git
cd habit-workspace
npm install
```

### 2 · Aplicación web

```bash
npm run dev            # http://localhost:5173
```

Pulsa **«Entrar con la cuenta demo»** o usa:

| Correo | Contraseña |
|---|---|
| `demo@habit.local` | `123456` |

> Sin claves de Firebase la app usa una base de datos **local** (IndexedDB) y crea la cuenta demo con una página de ejemplo y tres semanas de historial.
> Para usar Firebase: copia `.env.example` a `.env`, rellénalo y publica `firestore.rules`.

### 3 · Asistente de IA (proxy PHP) — opcional

En **otra terminal**:

```bash
cp api/config.sample.php api/config.php      # y pon tu clave de https://aistudio.google.com/apikey
npm run api                                   # http://localhost:8787
```

También vale la variable de entorno `GEMINI_API_KEY`. **Sin clave o sin PHP el asistente funciona igual en modo de respaldo.**

### 4 · Aplicación de escritorio (Electron)

```bash
npm run desktop         # compila y abre la aplicación como programa de Windows
npm run desktop:pack    # genera release/HabitWorkspace-win32-x64/HabitWorkspace.exe
```

### 5 · PWA (instalable y sin conexión)

```bash
npm run build && npm run preview     # http://localhost:4173 → icono «Instalar» en la barra del navegador
```

### 6 · Móvil (Capacitor)

```bash
npm run cap:android     # build + sincroniza + abre Android Studio (requiere el SDK de Android)
```

### 7 · Pruebas

```bash
npm test                  # 35 unitarias
node e2e/run.mjs          # 23 pasos web   (con `npm run dev` en marcha)
node e2e/pwa.mjs          # 11 pasos PWA   (con `npm run preview` en marcha)
node e2e/electron.mjs     # 16 pasos Electron
```

## Estructura

```
src/            Aplicación React + TypeScript (backend/, components/, context/, hooks/, lib/, pages/)
api/            Proxy PHP hacia Gemini
electron/       Proceso principal y preload (escritorio)
android/        Proyecto Capacitor
public/         manifest, service worker e iconos
tests/  e2e/    Pruebas unitarias y de navegador
docs/           Memoria del TFG, guía de defensa, guía multiplataforma y diagramas
scripts/        Iconos, empaquetado, lanzador de Electron y exportación de diagramas
```

## Documentación

| Documento | Contenido |
|---|---|
| [📘 Memoria del TFG](docs/MEMORIA_TFG.md) | Resumen/Abstract, objetivos DAW y DAM, arquitectura, datos, seguridad, pruebas, conclusiones |
| [🎤 Guía de defensa](docs/GUIA_DEFENSA.md) | Checklist previo, guion de 15 minutos y las 10 preguntas difíciles |
| [🔒 Seguridad](SECURITY.md) | Medidas aplicadas y limitaciones conocidas |
| [📦 Multiplataforma](docs/MULTIPLATAFORMA.md) | PWA, Electron y Capacitor paso a paso |

## Limitaciones conocidas

Se declaran abiertamente: el login con Google y las reglas de Firestore están implementados pero **no verificados contra un proyecto real de Firebase**;
el **APK de Android no está compilado**; los **pagos están simulados** y el límite del plan Free solo se controla en la interfaz; el proxy PHP está
pensado para uso local. Detalle en la memoria (apartado 9) y en [SECURITY.md](SECURITY.md).

## Autor

**Saúl Lázaro Casterad** · TFG DAW + DAM · Tutor: tutor asignado del departamento de Informática.

*Declaración de transparencia: en el desarrollo se usó un asistente de IA de programación (Claude Code) como herramienta de apoyo; ver el apartado 3.3 de la memoria.*
