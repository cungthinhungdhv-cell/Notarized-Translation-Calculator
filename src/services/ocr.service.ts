import Tesseract from 'tesseract.js';
import { preprocessImageData, preprocessCanvasFile } from './image-preprocessing.service';

export interface OCRResult {
  text: string;
  confidence: number;
  characterCount: number;
}

let worker: Tesseract.Worker | null = null;
let currentLanguages: string[] = [];
let progressCallback: ((progress: number) => void) | null = null;

export async function initOCR(languages: string[] = ['rus', 'eng']): Promise<void> {
  if (worker && arraysEqual(currentLanguages, languages)) {
    return;
  }

  if (worker) {
    await worker.terminate();
  }

  const langString = languages.join('+');
  worker = await Tesseract.createWorker(langString, 1, {
    logger: (m: Tesseract.LoggerMessage) => {
      if (m.status === 'recognizing text' && progressCallback) {
        progressCallback(m.progress * 100);
      }
    },
  });
  currentLanguages = [...languages];
}

function arraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export async function recognizeImage(
  imageData: ImageData | HTMLImageElement | string,
  onProgress?: (progress: number) => void
): Promise<OCRResult> {
  if (!worker) {
    await initOCR();
  }

  progressCallback = onProgress || null;

  let input: HTMLCanvasElement | HTMLImageElement | string;

  if (imageData instanceof ImageData) {
    const processed = preprocessImageData(imageData);
    const canvas = document.createElement('canvas');
    canvas.width = processed.width;
    canvas.height = processed.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(processed, 0, 0);
    input = canvas;
  } else {
    input = imageData;
  }

  const result = await worker!.recognize(input);

  progressCallback = null;
  const text = result.data.text;

  return {
    text,
    confidence: result.data.confidence,
    characterCount: text.replace(/\s/g, '').length,
  };
}

export async function recognizeImageFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<OCRResult> {
  if (!worker) {
    await initOCR();
  }

  progressCallback = onProgress || null;

  const preprocessed = await preprocessCanvasFile(file);
  const result = await worker!.recognize(preprocessed);

  progressCallback = null;
  const text = result.data.text;

  return {
    text,
    confidence: result.data.confidence,
    characterCount: text.replace(/\s/g, '').length,
  };
}

export async function terminateOCR(): Promise<void> {
  if (worker) {
    await worker.terminate();
    worker = null;
    currentLanguages = [];
  }
}
