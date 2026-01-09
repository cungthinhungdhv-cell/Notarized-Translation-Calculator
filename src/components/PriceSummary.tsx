import { Copy, Check, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import type { DocumentResult, AppConfig } from '../types';
import { formatPrice, formatNumber } from '../services/config.service';

interface PriceSummaryProps {
  results: DocumentResult[];
  config: AppConfig;
  onReset: () => void;
}

export function PriceSummary({ results, config, onReset }: PriceSummaryProps) {
  const [copied, setCopied] = useState(false);

  const totalPages = results.reduce((sum, r) => sum + r.pages.length, 0);
  const totalCharacters = results.reduce((sum, r) => sum + r.totalCharacters, 0);
  const priceByCharacters = results.reduce((sum, r) => sum + r.totalPrice, 0);
  const finalPrice = Math.max(config.pricing.minOrderPrice, priceByCharacters);
  const isMinimumApplied = priceByCharacters < config.pricing.minOrderPrice;

  const handleCopy = async () => {
    const text = generateSummaryText(results, config, totalPages, totalCharacters, priceByCharacters, finalPrice, isMinimumApplied);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (results.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Итого</h3>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-800">{results.length}</p>
          <p className="text-sm text-gray-500">документов</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-800">{totalPages}</p>
          <p className="text-sm text-gray-500">страниц</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-800">
            {formatNumber(totalCharacters, config.ui.locale)}
          </p>
          <p className="text-sm text-gray-500">символов</p>
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 mb-4">
        <p className="text-sm text-gray-500 mb-1">Стоимость нотариального перевода</p>
        <p className="text-3xl font-bold text-green-600">
          {formatPrice(finalPrice, config)}
        </p>
        {isMinimumApplied && (
          <p className="text-xs text-yellow-600 mt-2">
            Округлено до минимальной стоимости заказа ({formatPrice(config.pricing.minOrderPrice, config)})
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-500" />
              <span>Скопировано</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Скопировать</span>
            </>
          )}
        </button>

        <button
          onClick={onReset}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Сбросить</span>
        </button>
      </div>
    </div>
  );
}

function generateSummaryText(
  results: DocumentResult[],
  config: AppConfig,
  totalPages: number,
  totalCharacters: number,
  priceByCharacters: number,
  finalPrice: number,
  isMinimumApplied: boolean
): string {
  const lines: string[] = [
    'Расчёт стоимости нотариального перевода',
    '─'.repeat(40),
    '',
  ];

  for (const result of results) {
    lines.push(`${result.fileName}`);
    lines.push(`   Страниц: ${result.pages.length}`);
    lines.push(`   Символов: ${formatNumber(result.totalCharacters, config.ui.locale)}`);
    lines.push(`   Стоимость: ${formatPrice(result.totalPrice, config)}`);
    lines.push('');
  }

  lines.push('─'.repeat(40));
  lines.push(`Всего документов: ${results.length}`);
  lines.push(`Всего страниц: ${totalPages}`);
  lines.push(`Всего символов: ${formatNumber(totalCharacters, config.ui.locale)}`);
  lines.push('');

  if (isMinimumApplied) {
    lines.push(`По символам: ${formatPrice(priceByCharacters, config)}`);
    lines.push(`Мин. заказ: ${formatPrice(config.pricing.minOrderPrice, config)}`);
  }

  lines.push(`ИТОГО: ${formatPrice(finalPrice, config)}`);

  return lines.join('\n');
}
