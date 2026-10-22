/**
 * Recorta y comprime una imagen a JPEG y la devuelve como data URL.
 * Se guarda dentro de Firestore (sin Storage) para mantener el proyecto en el plan gratuito;
 * por eso se limita el peso: un documento de Firestore admite como máximo 1 MiB.
 */
const MAX_CHARS = 350_000; // ≈ 260 KB de imagen

function cargar(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen.'));
    };
    img.src = url;
  });
}

export async function comprimirImagen(file: File, ancho: number, alto: number): Promise<string> {
  if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) {
    throw new Error('Formato no válido. Usa PNG, JPG, WebP o GIF.');
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error('La imagen es demasiado grande (máx. 15 MB).');
  }
  const img = await cargar(file);

  // Recorte tipo "cover": rellena todo el lienzo sin deformar
  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Tu navegador no permite procesar imágenes.');
  const escala = Math.max(ancho / img.width, alto / img.height);
  const w = img.width * escala;
  const h = img.height * escala;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, ancho, alto);
  ctx.drawImage(img, (ancho - w) / 2, (alto - h) / 2, w, h);

  for (let calidad = 0.85; calidad >= 0.4; calidad -= 0.15) {
    const data = canvas.toDataURL('image/jpeg', calidad);
    if (data.length <= MAX_CHARS) return data;
  }
  throw new Error('La imagen sigue siendo demasiado pesada. Prueba con otra más simple.');
}

/** Solo se aceptan URLs https. Evita javascript:, data: arbitrarios y contenido mixto. */
export function esUrlHttpsValida(valor: string): boolean {
  try {
    return new URL(valor).protocol === 'https:';
  } catch {
    return false;
  }
}
