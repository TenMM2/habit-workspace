// Lanza Electron desde npm. Existe por una trampa de entorno: algunos editores (VS Code y derivados)
// definen ELECTRON_RUN_AS_NODE=1 en sus terminales, y con esa variable Electron arranca como Node
// puro ("Cannot read properties of undefined (reading 'registerSchemesAsPrivileged')").
// Aquí se elimina antes de lanzar el proceso.
// Uso: node scripts/lanzar-electron.mjs [argumentos de la app, p. ej. --dev-url=http://localhost:5173]
import { spawn } from 'node:child_process';
import electron from 'electron'; // en Node, este módulo exporta la ruta al ejecutable

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const hijo = spawn(electron, ['.', ...process.argv.slice(2)], { stdio: 'inherit', env });
hijo.on('close', (codigo) => process.exit(codigo ?? 0));
hijo.on('error', (e) => {
  console.error('No se pudo iniciar Electron:', e.message);
  process.exit(1);
});
