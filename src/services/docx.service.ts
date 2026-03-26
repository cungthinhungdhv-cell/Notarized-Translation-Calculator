import mammoth from 'mammoth';
import type { PageResult } from '../types';

export async function extractTextFromDocx(file: File): Promise<PageResult[]> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const text = result.value;

  return [
    {
      pageNumber: 1,
      text,
      characterCount: text.replace(/\s/g, '').length,
      hasNativeText: true,
      extractionMethod: 'native',
    },
  ];
}
