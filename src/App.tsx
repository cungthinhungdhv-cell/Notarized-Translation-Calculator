import { useState, useEffect, useCallback } from 'react';
import { FileDropZone } from './components/FileDropZone';
import { ProcessingStatus } from './components/ProcessingStatus';
import { DocumentResult } from './components/DocumentResult';
import { PriceSummary } from './components/PriceSummary';
import { loadConfig } from './services/config.service';
import { extractTextFromPDF } from './services/pdf.service';
import { initOCR, recognizeImage, recognizeImageFile, terminateOCR } from './services/ocr.service';
import { calculateDocumentPrice } from './services/pricing.service';
import type {
  AppConfig,
  DocumentResult as DocumentResultType,
  ProcessingProgress,
  PageResult,
} from './types';

function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [results, setResults] = useState<DocumentResultType[]>([]);
  const [progress, setProgress] = useState<ProcessingProgress | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadConfig().then(setConfig);
    return () => {
      terminateOCR();
    };
  }, []);

  const processFile = useCallback(
    async (file: File): Promise<DocumentResultType | null> => {
      if (!config) return null;

      const fileId = crypto.randomUUID();
      const isImage = file.type.startsWith('image/');

      try {
        let pages: PageResult[] = [];

        if (isImage) {
          setProgress({
            fileId,
            fileName: file.name,
            currentPage: 1,
            totalPages: 1,
            stage: 'ocr',
            ocrProgress: 0,
          });

          await initOCR(config.ocr.languages);
          const ocrResult = await recognizeImageFile(file, (p) => {
            setProgress((prev) =>
              prev ? { ...prev, ocrProgress: p } : null
            );
          });

          pages = [
            {
              pageNumber: 1,
              text: ocrResult.text,
              characterCount: ocrResult.characterCount,
              hasNativeText: false,
              extractionMethod: 'ocr',
            },
          ];
        } else {
          setProgress({
            fileId,
            fileName: file.name,
            currentPage: 0,
            totalPages: 0,
            stage: 'extracting',
            ocrProgress: 0,
          });

          const pdfResult = await extractTextFromPDF(file, (page, total) => {
            setProgress((prev) =>
              prev ? { ...prev, currentPage: page, totalPages: total } : null
            );
          });

          pages = pdfResult.pages;

          if (pdfResult.pagesNeedingOCR.length > 0) {
            setProgress((prev) =>
              prev ? { ...prev, stage: 'ocr', ocrProgress: 0 } : null
            );

            await initOCR(config.ocr.languages);

            for (const pageToOCR of pdfResult.pagesNeedingOCR) {
              setProgress((prev) =>
                prev
                  ? {
                      ...prev,
                      currentPage: pageToOCR.pageNumber,
                      ocrProgress: 0,
                    }
                  : null
              );

              const ocrResult = await recognizeImage(pageToOCR.imageData, (p) => {
                setProgress((prev) =>
                  prev ? { ...prev, ocrProgress: p } : null
                );
              });

              const pageIndex = pages.findIndex(
                (p) => p.pageNumber === pageToOCR.pageNumber
              );
              if (pageIndex !== -1) {
                pages[pageIndex] = {
                  ...pages[pageIndex],
                  text: ocrResult.text,
                  characterCount: ocrResult.characterCount,
                };
              }
            }
          }
        }

        setProgress((prev) =>
          prev ? { ...prev, stage: 'calculating', ocrProgress: 100 } : null
        );

        const result = calculateDocumentPrice(
          fileId,
          file.name,
          pages,
          config.pricing
        );

        return result;
      } catch (error) {
        console.error('Error processing file:', error);
        return null;
      }
    },
    [config]
  );

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      if (!config || isProcessing) return;

      setIsProcessing(true);
      const newResults: DocumentResultType[] = [];

      for (const file of files) {
        const result = await processFile(file);
        if (result) {
          newResults.push(result);
        }
      }

      setResults((prev) => [...prev, ...newResults]);
      setProgress(null);
      setIsProcessing(false);
    },
    [config, isProcessing, processFile]
  );

  const handleReset = useCallback(() => {
    setResults([]);
    setProgress(null);
  }, []);

  if (!config) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Калькулятор стоимости нотариального перевода от Ньунг
          </h1>
          <p className="text-gray-500">
            Загрузите документы для расчёта стоимости нотариального перевода
          </p>
        </header>

        <div className="space-y-6">
          <FileDropZone
            onFilesSelected={handleFilesSelected}
            acceptedTypes={['.pdf', '.jpg', '.jpeg', '.png', '.webp']}
            maxFiles={config.limits.maxFilesAtOnce}
            maxSizeMB={config.limits.maxFileSizeMB}
            disabled={isProcessing}
          />
          <p className="text-xs text-center text-gray-400 -mt-4">
            <span className="text-red-500">*</span> Ваши документы не загружаются на сервер — вся обработка происходит в браузере
          </p>

          {progress && <ProcessingStatus progress={progress} />}

          {results.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-700">Результаты</h2>
              {results.map((result) => (
                <DocumentResult
                  key={result.fileId}
                  result={result}
                  config={config}
                />
              ))}
            </div>
          )}

          <PriceSummary results={results} config={config} onReset={handleReset} />
        </div>

        <footer className="mt-12 text-center text-sm">
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
            <p className="font-medium text-gray-700 mb-4">
              Нотариальный перевод во Вьетнаме — Ньунг
            </p>
            <a
              href="https://t.me/Vietnam_Translator"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors mb-4"
            >
              Оформить заказ
            </a>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
              <a
                href="https://t.me/Nhung_Translator_Vietnam"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-600 hover:underline"
              >
                Telegram-канал
              </a>
              <span className="text-gray-300">•</span>
              <a
                href="https://t.me/nhung_translator_danang_reviews"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-600 hover:underline"
              >
                Отзывы клиентов
              </a>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            Мин. заказ:{' '}
            {new Intl.NumberFormat(config.ui.locale).format(
              config.pricing.minOrderPrice
            )}
            {config.ui.currency} | Цена за символ:{' '}
            {new Intl.NumberFormat(config.ui.locale).format(
              config.pricing.pricePerCharacter
            )}
            {config.ui.currency}
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
