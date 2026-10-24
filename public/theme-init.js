// Aplica el tema guardado antes de pintar para evitar el parpadeo.
// Es un archivo externo (no inline) para poder usar una política CSP estricta sin 'unsafe-inline' en scripts.
try {
  var t = localStorage.getItem('hw-theme');
  document.documentElement.classList.toggle('dark', t !== 'light');
} catch (e) {}
