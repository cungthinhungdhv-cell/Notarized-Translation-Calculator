const OCR_API_URL = import.meta.env.VITE_OCR_API_URL || 'https://notary-ocr.itripster.com';

export interface OCRResult {
  text: string;
  confidence: number;
  characterCount: number;
}

export async function initOCR(): Promise<void> {
  // PaddleOCR инициализируется на бэкенде, здесь ничего не нужно
}

export async function recognizeImage(
  imageData: ImageData | HTMLImageElement | string,
  onProgress?: (progress: number) => void
): Promise<OCRResult> {
  onProgress?.(10);

  let blob: Blob;

  if (imageData instanceof ImageData) {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);
    blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), 'image/png')
    );
  } else if (imageData instanceof HTMLImageElement) {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.naturalWidth;
    canvas.height = imageData.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(imageData, 0, 0);
    blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), 'image/png')
    );
  } else {
    const res = await fetch(imageData);
    blob = await res.blob();
  }

  onProgress?.(30);

  const formData = new FormData();
  formData.append('file', blob, 'page.png');

  const response = await fetch(`${OCR_API_URL}/api/ocr`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`OCR API error: ${response.status}`);
  }

  onProgress?.(100);

  return await response.json();
}

export async function recognizeImageFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<OCRResult> {
  onProgress?.(10);

  const formData = new FormData();
  formData.append('file', file);

  onProgress?.(30);

  const response = await fetch(`${OCR_API_URL}/api/ocr`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`OCR API error: ${response.status}`);
  }

  onProgress?.(100);

  return await response.json();
}

export async function terminateOCR(): Promise<void> {
  // Ничего — бэкенд управляет жизненным циклом PaddleOCR
}
