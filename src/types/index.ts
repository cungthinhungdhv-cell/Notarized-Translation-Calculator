export interface PricingConfig {
  minOrderPrice: number;
  pricePerCharacter: number;
  countSpaces: boolean;
}

export interface OCRConfig {
  languages: string[];
}

export interface LimitsConfig {
  maxFileSizeMB: number;
  maxFilesAtOnce: number;
}

export interface UIConfig {
  currency: string;
  locale: string;
}

export interface AppConfig {
  pricing: PricingConfig;
  ocr: OCRConfig;
  limits: LimitsConfig;
  ui: UIConfig;
}

export interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: 'pdf' | 'image';
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface PageResult {
  pageNumber: number;
  text: string;
  characterCount: number;
  hasNativeText: boolean;
  extractionMethod: 'native' | 'ocr';
}

export interface PageBreakdown {
  pageNumber: number;
  characterCount: number;
  price: number;
}

export interface DocumentResult {
  fileId: string;
  fileName: string;
  pages: PageBreakdown[];
  totalCharacters: number;
  totalPrice: number;
}

export interface ProcessingProgress {
  fileId: string;
  fileName: string;
  currentPage: number;
  totalPages: number;
  stage: 'loading' | 'extracting' | 'ocr' | 'calculating' | 'done';
  ocrProgress: number;
}
