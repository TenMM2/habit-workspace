// Empaqueta la aplicación de escritorio para Windows en release/ (carpeta desempaquetada con el .exe).
// Solo se incluyen dist/ (la web compilada), electron/ (proceso principal) y package.json.
// Uso: npm run desktop:pack
import { packager } from '@electron/packager';

const INCLUIDO = /^\/(dist|electron|package\.json)(\/|$)/;

const rutas = await packager({
  dir: '.',
  name: 'HabitWorkspace',
  platform: 'win32',
  arch: 'x64',
  out: 'release',
  overwrite: true,
  prune: false, // la app no usa dependencias de runtime fuera de dist/
  asar: true,
  // El filtro recibe la ruta relativa con "/" inicial; la raíz ("") siempre se conserva
  ignore: (ruta) => ruta !== '' && !INCLUIDO.test(ruta),
});

console.log('Aplicación empaquetada en:', rutas.join(', '));
