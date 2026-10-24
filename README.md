<div align="center">

# ✅ Habit Workspace

**A full-stack, multiplatform habit tracker & workspace with a context-aware AI assistant**

*Local-First · Offline-First · Web · PWA · Desktop · Mobile*

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5%20strict-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind%20CSS-3-06B6D4?logo=tailwindcss&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Auth%20%2B%20Firestore-FFCA28?logo=firebase&logoColor=black)
![IndexedDB](https://img.shields.io/badge/IndexedDB-local--first-555)
![PHP](https://img.shields.io/badge/PHP-8.4-777BB4?logo=php&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini-3.5%20Flash-4285F4?logo=googlegemini&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-offline-5A0FC8?logo=pwa&logoColor=white)
![Electron](https://img.shields.io/badge/Electron-45-47848F?logo=electron&logoColor=white)
![Capacitor](https://img.shields.io/badge/Capacitor-8-119EFF?logo=capacitor&logoColor=white)
![Unit tests](https://img.shields.io/badge/unit%20tests-35%20passing-brightgreen)
![E2E](https://img.shields.io/badge/E2E%20checks-50%20passing-brightgreen)

[Security](SECURITY.md) · [Multiplatform guide](docs/MULTIPLATAFORMA.md) · [Thesis (ES)](docs/MEMORIA_TFG.md) · [Defense guide (ES)](docs/GUIA_DEFENSA.md)

</div>

---

## Overview

Habit Workspace is a habit tracker built around the simplicity of Notion and Google Tasks. Users create as many **pages** as they like — each with a
banner, avatar, title, motivational quote, personal rules and a monthly tracking table — follow their streaks and completion rate on a dashboard and
calendar, and chat with an **AI assistant** that knows their data and can propose new pages.

**One codebase, four delivery channels:**

| | Channel | Status |
|---|---|---|
| 🌐 | Web app (React + TypeScript) | ✅ Verified |
| 📲 | Installable **PWA** that works fully offline | ✅ Verified |
| 🖥️ | **Electron** desktop app for Windows (`.exe`) | ✅ Verified |
| 📱 | Android / iOS via **Capacitor** | 🟡 Project scaffolded and synced; APK not built |

## Architecture

```
┌──────────────────────── React + TypeScript frontend ────────────────────────┐
│  UI → Contexts (Auth · Data · Theme) → `Backend` interface                  │
└───────────────────────────────┬──────────────────────────────┬──────────────┘
     Firebase keys in .env      │        no keys (default)     │  POST /api/gemini.php
        ┌───────────────────────┘               └──────────┐   ▼
 Firebase (Auth + Firestore)                IndexedDB (local-first)   PHP 8.4 proxy ──▶ Gemini 3.5 Flash
                                   PBKDF2 · sessions · seeded demo     (API key lives only here)
                                                                        └─ no key / error → local fallback mode
```

The app talks to a **single `Backend` interface** with two interchangeable implementations — Firebase or local IndexedDB — selected automatically at
startup. Full diagrams (architecture, data model, auth and AI flows) are in the thesis and in [`docs/diagramas/`](docs/diagramas/).

## Key features

- **Flicker-free Dark/Light theming** — CSS-variable design tokens, dark by default, applied by an external pre-paint script (keeps the CSP strict).
- **Dynamic habit pages** — inline-editable banner (gallery, URL or compressed upload), overlapping avatar, title, quote and rules.
- **Monthly tracker with no horizontal scroll** — a CSS grid (`minmax(0, 1fr)`) that fits any viewport, including phones; one-tap check-ins, per-day notes and filters.
- **Dashboard & calendar** — streak, today's habits, weekly completion rate, monthly calendar, `Ctrl + K` quick search.
- **Context-aware AI assistant (Gemini 3.5 Flash)** — receives a compact summary of the last 30 days, answers weekly summaries and "what am I failing?" questions, and proposes new pages. **Hardened against prompt injection**: user data is fenced as *data, not instructions*, model output is schema-validated, and nothing is created without explicit user confirmation.
- **Graceful degradation** — if the API key, PHP, quota or network is unavailable, a deterministic local fallback assistant takes over.
- **Accounts & plans** — profile, avatar, default banner, email/password changes, simulated Free/Pro plans with usage and billing history.
- **Local-First auth** — PBKDF2-SHA256 (150k iterations), per-user salts, 7-day sessions, 5-attempt lockout, per-user data isolation, seeded demo account.
- **Secure Electron shell** — context isolation, sandbox, `contextBridge`, custom `app://` protocol, strict CSP, restricted navigation and permissions.

## Quality

| Level | Tool | Result |
|---|---|---|
| Strict type-check | `tsc --noEmit` | ✅ no errors |
| Production build | `vite build` | ✅ (≈1.0 MB JS · 268 KB gzipped) |
| Unit / integration | Vitest + fake-indexeddb | ✅ **35 / 35** |
| E2E — web (Chrome) | Playwright | ✅ **23 / 23** |
| E2E — PWA installability & **offline mode** | Playwright + CDP | ✅ **11 / 11** |
| E2E — Electron (also against the packaged `.exe`) | Playwright `_electron` | ✅ **16 / 16** |

That is **35 unit tests + 50 E2E checks** across Web, PWA and Electron. Beyond passing, the tests were verified to *catch regressions*: the brute-force
lockout and the cross-user isolation were deliberately broken, and the corresponding tests failed.

## Getting started

**Requirements:** Node.js 20+ · (optional) PHP 8.x for the Gemini proxy · Google Chrome for the E2E suites.

```bash
git clone https://github.com/TenMM2/habit-workspace.git
cd habit-workspace
npm install
```

### Web app

```bash
npm run dev            # http://localhost:5173
```

Click **"Entrar con la cuenta demo"** (demo account) or sign in with:

| Email | Password |
|---|---|
| `demo@habit.local` | `123456` |

> Without Firebase keys the app runs on a **local IndexedDB database** and seeds the demo account with an example page and three weeks of history.
> To use Firebase, copy `.env.example` to `.env`, fill it in and deploy `firestore.rules`.

### AI assistant (PHP proxy) — optional

In a second terminal:

```bash
cp api/config.sample.php api/config.php      # add your key from https://aistudio.google.com/apikey
npm run api                                   # http://localhost:8787
```

The `GEMINI_API_KEY` environment variable also works. **Without a key or PHP, the assistant still works in fallback mode.**

### Desktop app (Electron)

```bash
npm run desktop         # builds and launches the app as a native Windows program
npm run desktop:pack    # produces release/HabitWorkspace-win32-x64/HabitWorkspace.exe
```

### PWA (installable, offline)

```bash
npm run build && npm run preview     # http://localhost:4173 → "Install" icon in the address bar
```

### Mobile (Capacitor)

```bash
npm run cap:android     # build + sync + open Android Studio (requires the Android SDK)
```

### Tests

```bash
npm test                  # 35 unit tests
node e2e/run.mjs          # 23 web checks   (with `npm run dev` running)
node e2e/pwa.mjs          # 11 PWA checks   (with `npm run preview` running)
node e2e/electron.mjs     # 16 Electron checks
```

## Project structure

```
src/            React + TypeScript app (backend/, components/, context/, hooks/, lib/, pages/)
api/            PHP proxy to Gemini
electron/       Main process and preload (desktop)
android/        Capacitor project
public/         Web manifest, service worker, icons
tests/  e2e/    Unit tests and browser tests
docs/           Thesis, defense guide, multiplatform guide and diagrams (in Spanish)
scripts/        Icon generation, packaging, Electron launcher, diagram/Word export
```

## Documentation

> **Note:** *Academic Thesis & Defense documentation inside `docs/` are written in Spanish* (this project was delivered as a Spanish university final-year thesis).

| Document | Language | Content |
|---|---|---|
| [Thesis (Memoria del TFG)](docs/MEMORIA_TFG.md) · [Word](docs/MEMORIA_TFG.docx) | Spanish (English abstract) | Objectives, architecture, data model, security, testing, conclusions |
| [Defense guide](docs/GUIA_DEFENSA.md) | Spanish | 15-minute script and anticipated examiner questions |
| [Multiplatform guide](docs/MULTIPLATAFORMA.md) | Spanish | PWA, Electron and Capacitor step by step |
| [Security policy](SECURITY.md) | English | Implemented measures and known limitations |

## Design approach & scope

The project is **Local-First and Offline-First**: data lives on the user's device (IndexedDB), giving data ownership, privacy, zero infrastructure cost
and full offline operation in both the PWA and the Electron app. The **Firebase** and **Capacitor** adapters are implemented as an **extensible
architecture** for a future cloud deployment (cross-device sync, app stores).

Verified scope, stated plainly: the test suites validate the primary local mode; the cloud adapters (Firebase, Android APK) have **not been validated
against real services** in this release; **payments are simulated** and the Free-plan limit is enforced in the UI only; the PHP proxy is designed for
local use. See [SECURITY.md](SECURITY.md) and sections 4.5 and 9 of the thesis.

## Author

**Saúl Lázaro Casterad** — Final-year project, Web (DAW) and Multiplatform (DAM) Application Development.

*Transparency note: an AI coding assistant (Claude Code) was used as a support tool during development; see section 3.3 of the thesis.*
