import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { PageResult } from '../types';

// Set up the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const MIN_TEXT_THRESHOLD = 50;

export interface PDFExtractionResult {
  pages: PageResult[];
  pagesNeedingOCR: { pageNumber: number; imageData: ImageData }[];
}

async function renderPageToImage(
  page: pdfjsLib.PDFPageProxy,
  scale: number = 2
): Promise<ImageData> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await page.render({
    canvasContext: context,
    viewport,
    canvas,
  } as any).promise;

  return context.getImageData(0, 0, canvas.width, canvas.height);
}

export async function extractTextFromPDF(
  file: File,
  onProgress?: (page: number, total: number) => void
): Promise<PDFExtractionResult> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: PageResult[] = [];
  const pagesNeedingOCR: { pageNumber: number; imageData: ImageData }[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');

    const hasNativeText = text.trim().length >= MIN_TEXT_THRESHOLD;

    if (hasNativeText) {
      pages.push({
        pageNumber: i,
        text,
        characterCount: text.replace(/\s/g, '').length,
        hasNativeText: true,
        extractionMethod: 'native',
      });
    } else {
      const imageData = await renderPageToImage(page);
      pagesNeedingOCR.push({ pageNumber: i, imageData });
      pages.push({
        pageNumber: i,
        text: '',
        characterCount: 0,
        hasNativeText: false,
        extractionMethod: 'ocr',
      });
    }

    onProgress?.(i, pdf.numPages);
  }

  return { pages, pagesNeedingOCR };
}

export async function getPDFPageCount(file: File): Promise<number> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  return pdf.numPages;
}
