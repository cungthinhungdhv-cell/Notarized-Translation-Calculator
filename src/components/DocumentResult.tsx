import { useState } from 'react';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import type { DocumentResult as DocumentResultType, AppConfig } from '../types';
import { formatPrice, formatNumber } from '../services/config.service';

interface DocumentResultProps {
  result: DocumentResultType;
  config: AppConfig;
}

export function DocumentResult({ result, config }: DocumentResultProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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
          <div className="p-4 space-y-2">
            {result.pages.map((page) => (
              <div
                key={page.pageNumber}
                className="bg-white rounded-lg p-3 flex items-center justify-between text-sm"
              >
                <span className="text-gray-500">Стр. {page.pageNumber}</span>
                <div className="flex items-center gap-4">
                  <span className="text-gray-500">
                    {formatNumber(page.characterCount, config.ui.locale)} симв.
                  </span>
                  <span className="font-medium text-gray-800">
                    {formatPrice(page.price, config)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
