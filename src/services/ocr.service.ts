const OCR_API_URL = import.meta.env.VITE_OCR_API_URL || 'https://notary-ocr.itripster.com';

// Ограничение размера картинки перед отправкой на OCR.
// Большие сканы (scale=2 на паспорте → ~16 МБ PNG) грузятся ~77с и распознаются ХУЖЕ.
// 2000px по длинной стороне + JPEG ~85% даёт ~3× ускорение и более чистый текст.
const MAX_OCR_DIMENSION = 2000;
const JPEG_QUALITY = 0.85;

export interface OCRResult {
  text: string;
  confidence: number;
  characterCount: number;
}

export async function initOCR(): Promise<void> {
  // PaddleOCR инициализируется на бэкенде, здесь ничего не нужно
}

function canvasToJpegBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b!), 'image/jpeg', JPEG_QUALITY)
  );
}

// Берёт source-canvas, при необходимости уменьшает до MAX_OCR_DIMENSION и кодирует в JPEG.
function downscaleCanvasToBlob(source: HTMLCanvasElement): Promise<Blob> {
  const longest = Math.max(source.width, source.height);
  const scale = Math.min(1, MAX_OCR_DIMENSION / longest);

  if (scale === 1) {
    return canvasToJpegBlob(source);
  }

  const dst = document.createElement('canvas');
  dst.width = Math.round(source.width * scale);
  dst.height = Math.round(source.height * scale);
  const ctx = dst.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, dst.width, dst.height);
  return canvasToJpegBlob(dst);
}

// Отправка картинки на бэкенд через XHR — чтобы видеть реальный прогресс загрузки,
// а во время инференса плавно подползать к 95% (бэкенд прогресс не стримит).
function postToOCR(
  blob: Blob,
  filename: string,
  onProgress?: (progress: number) => void
): Promise<OCRResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${OCR_API_URL}/api/ocr`);

    // 10..55% — реальная загрузка файла на сервер
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress?.(Math.min(55, 10 + (e.loaded / e.total) * 45));
      }
    };

    // 55..95% — сервер распознаёт (длительность неизвестна), асимптотически подползаем
    let creep = 55;
    let creepTimer: ReturnType<typeof setInterval> | undefined;
    xhr.upload.onload = () => {
      onProgress?.(55);
      creepTimer = setInterval(() => {
        creep = Math.min(95, creep + (95 - creep) * 0.08);
        onProgress?.(creep);
      }, 500);
    };

    const stopCreep = () => {
      if (creepTimer) clearInterval(creepTimer);
    };

    xhr.onload = () => {
      stopCreep();
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText) as OCRResult;
          onProgress?.(100);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      } else {
        reject(new Error(`OCR API error: ${xhr.status}`));
      }
    };

    xhr.onerror = () => {
      stopCreep();
      reject(new Error('OCR network error'));
    };

    const formData = new FormData();
    formData.append('file', blob, filename);
    xhr.send(formData);
  });
}

export async function recognizeImage(
  imageData: ImageData | HTMLImageElement | string,
  onProgress?: (progress: number) => void
): Promise<OCRResult> {
  onProgress?.(5);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  if (imageData instanceof ImageData) {
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);
  } else if (imageData instanceof HTMLImageElement) {
    canvas.width = imageData.naturalWidth;
    canvas.height = imageData.naturalHeight;
    ctx.drawImage(imageData, 0, 0);
  } else {
    const img = new Image();
    img.src = imageData;
    await img.decode();
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);
  }

  const blob = await downscaleCanvasToBlob(canvas);
  return postToOCR(blob, 'page.jpg', onProgress);
}

export async function recognizeImageFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<OCRResult> {
  onProgress?.(5);

  let blob: Blob = file;
  let filename = file.name;

  // Уменьшаем большие фото/сканы перед отправкой
  try {
    const bitmap = await createImageBitmap(file);
    const longest = Math.max(bitmap.width, bitmap.height);
    if (longest > MAX_OCR_DIMENSION || file.size > 2_000_000) {
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
      blob = await downscaleCanvasToBlob(canvas);
      filename = 'page.jpg';
    }
    bitmap.close?.();
  } catch {
    // если не получилось декодировать — отправляем оригинал как есть
    blob = file;
    filename = file.name;
  }

  return postToOCR(blob, filename, onProgress);
}

export async function terminateOCR(): Promise<void> {
  // Ничего — бэкенд управляет жизненным циклом PaddleOCR
}
