/** Galería integrada de banners (degradados CSS: no dependen de internet ni de Storage). */
export const BANNER_PRESETS: string[] = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  'linear-gradient(135deg, #434343 0%, #000000 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
];

export const DEFAULT_BANNER = 'preset:0';

/** Devuelve el degradado si el valor es 'preset:N'; null si es una imagen. */
export function presetGradient(value: string): string | null {
  const m = /^preset:(\d+)$/.exec(value);
  if (!m) return null;
  return BANNER_PRESETS[Number(m[1])] ?? BANNER_PRESETS[0];
}
