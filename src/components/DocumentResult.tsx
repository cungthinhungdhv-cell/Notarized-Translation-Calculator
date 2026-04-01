import { useState } from 'react';
import { ChevronDown, ChevronUp, FileText, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import type { DocumentResult as DocumentResultType, AppConfig } from '../types';
import { formatPrice, formatNumber } from '../services/config.service';

const LOW_CONFIDENCE_THRESHOLD = 60;

interface DocumentResultProps {
  result: DocumentResultType;
  config: AppConfig;
}

export function DocumentResult({ result, config }: DocumentResultProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTextForPage, setShowTextForPage] = useState<number | null>(null);

  const hasLowConfidence = result.pages.some(
    (p) => p.extractionMethod === 'ocr' && p.confidence != null && p.confidence < LOW_CONFIDENCE_THRESHOLD
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-gray-400" />
          <div className="text-left">
            <p className="font-medium text-gray-800 truncate max-w-[200px] sm:max-w-none">
              {result.fileName}
            </p>
            <p className="text-sm text-gray-500">
              {result.pages.length} стр. | {formatNumber(result.totalCharacters, config.ui.locale)} символов
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasLowConfidence && (
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          )}
          <span className="font-bold text-lg text-green-600">
            {formatPrice(result.totalPrice, config)}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50">
          {hasLowConfidence && (
            <div className="mx-4 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2 items-start">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700">
                Плохое качество документа. Реальное количество символов может отличаться.
                Рекомендуем загрузить документ лучшего качества.
                Текущая точность распознавания — {Math.round(
                  result.pages.reduce((min, p) =>
                    p.extractionMethod === 'ocr' && p.confidence != null
                      ? Math.min(min, p.confidence)
                      : min, 100
                  )
                )}%.
              </p>
            </div>
          )}
          <div className="p-4 space-y-2">
            {result.pages.map((page) => {
              return (
                <div key={page.pageNumber}>
                  <div className="bg-white rounded-lg p-3 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Стр. {page.pageNumber}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowTextForPage(
                            showTextForPage === page.pageNumber ? null : page.pageNumber
                          );
                        }}
                        className="text-blue-500 hover:text-blue-700 transition-colors p-1 rounded hover:bg-blue-50"
                        title={showTextForPage === page.pageNumber ? 'Скрыть текст' : 'Показать распознанный текст'}
                      >
                        {showTextForPage === page.pageNumber ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-500">
                        {formatNumber(page.characterCount, config.ui.locale)} симв.
                      </span>
                      <span className="font-medium text-gray-800">
                        {formatPrice(page.price, config)}
                      </span>
                    </div>
                  </div>
                  {showTextForPage === page.pageNumber && (
                    <div className="mt-1 mx-1 p-3 bg-white border border-gray-200 rounded-lg">
                      <p className="text-xs text-gray-400 mb-2">
                        Распознанный текст ({formatNumber(page.characterCount, config.ui.locale)} символов без пробелов):
                      </p>
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap break-words font-mono leading-relaxed max-h-64 overflow-y-auto">
                        {page.text || '(текст не распознан)'}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
