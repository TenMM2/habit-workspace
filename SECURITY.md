# Security

## Web application & data layer

| Risk | Mitigation | Where |
|---|---|---|
| Access without a session | `ProtectedRoute`: every internal route redirects to `/login` | `components/ProtectedRoute.tsx` |
| Access to other users' data | Firestore: everything hangs under `users/{uid}` and only its owner can read/write. Local mode: `exigirUsuario` enforces the same rule on every operation | `firestore.rules`, `backend/localBackend.ts` |
| Passwords (local mode) | PBKDF2-SHA256, 150,000 iterations, random per-user salt; never stored in clear text | `backend/local/password.ts` |
| Brute force (local mode) | 5 failed attempts per email → 1-minute lockout; a hash is always verified so response timing does not reveal which accounts exist | `backend/localBackend.ts` |
| Sessions | 256-bit random token, 7-day expiry, deleted on sign-out | `backend/localBackend.ts` |
| Privilege escalation | Rules: email and creation date are immutable; `plan` only accepts `free`/`pro`; `billing` ≤ 24 entries | `firestore.rules` |
| Uploads | Images re-compressed in the browser to JPEG (≤ 260 KB); URLs must be `https://`; Storage rules: images < 5 MB in the owner's own folder only | `lib/image.ts`, `storage.rules` |
| XSS | React escapes all text; no `dangerouslySetInnerHTML`; assistant bold text is rendered in chunks, not as HTML | `components/AssistantWidget.tsx` |

## AI assistant & PHP proxy

| Risk | Mitigation | Where |
|---|---|---|
| Gemini API key leakage | Lives only on the server (`api/config.php` or environment variable), sent in a header (not the URL, so it never reaches logs); gitignored; never shipped to the browser | `api/gemini.php` |
| Proxy abuse | CORS origin allowlist, max 40 KB body, 12 messages, 2,000 chars per message, 20 requests/min per IP, role and type validation | `api/gemini.php` |
| Prompt injection | User data is fenced in a delimited block and the system prompt declares it to be data, not instructions. Verified with a malicious page name | `api/gemini.php` |
| Untrusted model output | Proposed pages are validated and clamped (types, lengths, counts) before creation; the user must confirm with a click | `lib/paginaPropuesta.ts` |
| Error leakage | The proxy returns generic status codes; details go to the server log only | `api/gemini.php` |
| Internal proxy files | `.htaccess` denies `config.php` and `config.sample.php` on Apache | `api/.htaccess` |
| Service unavailable / quota | Automatic retry on 429/500/503, then a deterministic local fallback assistant | `api/gemini.php`, `lib/assistantLocal.ts` |

## Desktop application (Electron)

| Risk | Mitigation | Where |
|---|---|---|
| Web content reaching Node / the OS | `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`; verified that `require`, `process` and `Buffer` do not exist in the page | `electron/main.cjs` |
| Exposed native API surface | `contextBridge` exposes only `window.desktop` (platform and versions), frozen and read-only | `electron/preload.cjs` |
| Injected code execution | CSP `script-src 'self'` (no `eval`, no inline scripts), `object-src 'none'`, `frame-src 'none'`; verified with `securitypolicyviolation` events | `electron/main.cjs` |
| Navigation to external sites | `will-navigate` and `setWindowOpenHandler`: only `app://`; `https` links open in the system browser | `electron/main.cjs` |
| Path traversal | Paths are normalized and anything outside `dist/` is rejected; verified with `%2e%2e/` | `electron/main.cjs` |
| Open proxy | Only `POST /api/gemini.php` is forwarded; every other route returns 404 | `electron/main.cjs` |
| Browser permissions (camera, location…) | All denied | `electron/main.cjs` |
| Multiple instances | `requestSingleInstanceLock` | `electron/main.cjs` |

## PWA & service worker

| Risk | Mitigation | Where |
|---|---|---|
| Private data in cache | The service worker does not intercept `/api/` or cross-origin requests; verified that nothing under `/api/` is cached | `public/sw.js` |
| Stale cache | Network-first navigations; each install purges `/assets/` from previous versions | `public/sw.js` |
| Inline scripts (blocks a strict CSP) | The theme script is an external file | `public/theme-init.js` |

## Repository hygiene

`.env*`, `api/config.php`, `api/cacert.pem`, `node_modules/`, `dist/` and `release/` are gitignored; no secrets are committed.

## Known limitations

- **Local mode is for personal use and demos.** Data lives in the user's browser: anyone with access to the computer and browser profile can inspect it. True multi-user operation requires Firebase or a server backend.
- **The Free-plan limit of 3 pages is enforced in the UI only.** Firestore rules cannot count documents; server-side enforcement needs a Cloud Function.
- **Payments are simulated:** changing plan only modifies the `plan` field. A real gateway (e.g. Stripe) must validate payment on the server.
- **The PHP proxy does not authenticate users.** It is designed for local use; in production it should verify the Firebase ID token and move rate limiting to a database.
- **Firebase rules and the Google sign-in flow have not been validated against a real Firebase project** in this release.
- No email verification in local mode.
- PHP's built-in server (`php -S`) is for development only.

## Reporting a vulnerability

This is an academic project. If you find a security issue, please open a private security advisory on the GitHub repository or contact the author directly.
