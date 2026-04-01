/**
 * Предобработка изображений для улучшения качества OCR:
 * - Конвертация в grayscale
 * - Увеличение контраста (adaptive thresholding через Otsu-подобный метод)
 */

export function preprocessImageData(imageData: ImageData): ImageData {
  const { data, width, height } = imageData;
  const result = new ImageData(width, height);
  const out = result.data;

  // Шаг 1: grayscale
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < gray.length; i++) {
    const offset = i * 4;
    gray[i] = Math.round(data[offset] * 0.299 + data[offset + 1] * 0.587 + data[offset + 2] * 0.114);
  }

  // Шаг 2: Otsu threshold
  const threshold = otsuThreshold(gray);

  // Шаг 3: бинаризация
  for (let i = 0; i < gray.length; i++) {
    const val = gray[i] >= threshold ? 255 : 0;
    const offset = i * 4;
    out[offset] = val;
    out[offset + 1] = val;
    out[offset + 2] = val;
    out[offset + 3] = 255;
  }

  return result;
}

export function preprocessCanvasFile(file: File): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const processed = preprocessImageData(imageData);
      ctx.putImageData(processed, 0, 0);

      URL.revokeObjectURL(img.src);
      resolve(canvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    img.src = URL.createObjectURL(file);
  });
}

function otsuThreshold(gray: Uint8Array): number {
  const histogram = new Uint32Array(256);
  for (let i = 0; i < gray.length; i++) {
    histogram[gray[i]]++;
  }

  const total = gray.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * histogram[i];

  let sumB = 0;
  let wB = 0;
  let maxVariance = 0;
  let threshold = 0;

  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;

    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const variance = wB * wF * (mB - mF) * (mB - mF);

    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = t;
    }
  }

  return threshold;
}
