import { Copy, Check, RotateCcw, Plus, Minus } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { DocumentResult, AppConfig } from '../types';
import { formatPrice, formatNumber } from '../services/config.service';

interface PriceSummaryProps {
  results: DocumentResult[];
  config: AppConfig;
  onReset: () => void;
}

interface CounterRowProps {
  label: string;
  hint?: string;
  unitPrice: number;
  unitSuffix?: string;
  multiplier?: number;
  count: number;
  minCount?: number;
  freeCount?: number;
  onChange: (next: number) => void;
  config: AppConfig;
}

function CounterRow({
  label,
  hint,
  unitPrice,
  unitSuffix = 'шт',
  multiplier = 1,
  count,
  minCount = 0,
  freeCount = 0,
  onChange,
  config,
}: CounterRowProps) {
  // Бесплатные (включённые) копии не тарифицируются
  const chargeableCount = Math.max(0, count - freeCount);
  const lineTotal = unitPrice * multiplier * chargeableCount;
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="text-sm text-gray-700">{label}</p>
        <p className="text-xs text-gray-400">
          {hint ? `${hint} · ` : ''}
          {formatPrice(unitPrice, config)} / {unitSuffix}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {lineTotal > 0 && (
          <span className="text-sm font-medium text-gray-700 w-20 text-right tabular-nums">
            {formatPrice(lineTotal, config)}
          </span>
        )}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onChange(Math.max(minCount, count - 1))}
            disabled={count <= minCount}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Уменьшить"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-6 text-center text-sm font-medium tabular-nums">{count}</span>
          <button
            type="button"
            onClick={() => onChange(count + 1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
            aria-label="Увеличить"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function PriceSummary({ results, config, onReset }: PriceSummaryProps) {
  const [copied, setCopied] = useState(false);
  // 1 копия перевода включена в стоимость по умолчанию
  const [translationCopies, setTranslationCopies] = useState(1);
  const [passportCopies, setPassportCopies] = useState(0);

  // Сбрасываем доп. услуги, когда заказ очищен
  useEffect(() => {
    if (results.length === 0) {
      setTranslationCopies(1);
      setPassportCopies(0);
    }
  }, [results.length]);

  const totalPages = results.reduce((sum, r) => sum + r.pages.length, 0);
  const totalCharacters = results.reduce((sum, r) => sum + r.totalCharacters, 0);
  const priceByCharacters = results.reduce((sum, r) => sum + r.totalPrice, 0);

  const translationPrice = Math.max(config.pricing.minOrderPrice, priceByCharacters);
  const isMinimumApplied = priceByCharacters < config.pricing.minOrderPrice;

  // Копия перевода считается за страницу (весь перевод = totalPages),
  // 1-я копия включена в стоимость → платные = copies - 1. Копия паспорта — за штуку.
  const extraTranslationCopies = Math.max(0, translationCopies - 1);
  const translationCopiesPrice =
    extraTranslationCopies * totalPages * config.pricing.notaryCopyTranslation;
  const passportCopiesPrice =
    passportCopies * totalPages * config.pricing.notaryCopyPassport;
  const finalPrice = translationPrice + translationCopiesPrice + passportCopiesPrice;

  const handleCopy = async () => {
    const text = generateSummaryText({
      results,
      config,
      totalPages,
      totalCharacters,
      priceByCharacters,
      translationPrice,
      isMinimumApplied,
      translationCopies: extraTranslationCopies,
      translationCopiesPrice,
      passportCopies,
      passportCopiesPrice,
      finalPrice,
    });
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

      {/* Дополнительные нотариальные услуги */}
      <div className="bg-white rounded-lg p-4 mb-4 divide-y divide-gray-100">
        <p className="text-sm font-medium text-gray-600 pb-1">Нотариальные копии</p>
        <CounterRow
          label="Нотариальные копии перевода"
          hint="1-я копия включена в стоимость"
          unitPrice={config.pricing.notaryCopyTranslation}
          unitSuffix="страница"
          multiplier={totalPages}
          count={translationCopies}
          minCount={1}
          freeCount={1}
          onChange={setTranslationCopies}
          config={config}
        />
        <CounterRow
          label="Нотариальные копии паспорта"
          unitPrice={config.pricing.notaryCopyPassport}
          unitSuffix="страница"
          multiplier={totalPages}
          count={passportCopies}
          onChange={setPassportCopies}
          config={config}
        />
      </div>

      <div className="bg-white rounded-lg p-4 mb-4">
        {(translationCopiesPrice > 0 || passportCopiesPrice > 0) && (
          <div className="space-y-1 mb-3 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Перевод</span>
              <span>{formatPrice(translationPrice, config)}</span>
            </div>
            {translationCopiesPrice > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Доп. нотар. копии перевода ({extraTranslationCopies} × {totalPages} стр.)</span>
                <span>{formatPrice(translationCopiesPrice, config)}</span>
              </div>
            )}
            {passportCopiesPrice > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Нотар. копии паспорта ({passportCopies} × {totalPages} стр.)</span>
                <span>{formatPrice(passportCopiesPrice, config)}</span>
              </div>
            )}
          </div>
        )}

        <p className="text-sm text-gray-500 mb-1">Итоговая стоимость</p>
        <p className="text-3xl font-bold text-green-600">
          {formatPrice(finalPrice, config)}
        </p>
        {isMinimumApplied && (
          <p className="text-xs text-yellow-600 mt-2">
            Перевод округлён до минимальной стоимости заказа ({formatPrice(config.pricing.minOrderPrice, config)})
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

interface SummaryTextParams {
  results: DocumentResult[];
  config: AppConfig;
  totalPages: number;
  totalCharacters: number;
  priceByCharacters: number;
  translationPrice: number;
  isMinimumApplied: boolean;
  translationCopies: number;
  translationCopiesPrice: number;
  passportCopies: number;
  passportCopiesPrice: number;
  finalPrice: number;
}

function generateSummaryText(p: SummaryTextParams): string {
  const { config } = p;
  const lines: string[] = [
    'Расчёт стоимости нотариального перевода',
    '─'.repeat(40),
    '',
  ];

  for (const result of p.results) {
    lines.push(`${result.fileName}`);
    lines.push(`   Страниц: ${result.pages.length}`);
    lines.push(`   Символов: ${formatNumber(result.totalCharacters, config.ui.locale)}`);
    lines.push(`   Стоимость: ${formatPrice(result.totalPrice, config)}`);
    lines.push('');
  }

  lines.push('─'.repeat(40));
  lines.push(`Всего документов: ${p.results.length}`);
  lines.push(`Всего страниц: ${p.totalPages}`);
  lines.push(`Всего символов: ${formatNumber(p.totalCharacters, config.ui.locale)}`);
  lines.push('');

  lines.push(`Перевод: ${formatPrice(p.translationPrice, config)}`);
  if (p.isMinimumApplied) {
    lines.push(`   (по символам ${formatPrice(p.priceByCharacters, config)}, мин. заказ ${formatPrice(config.pricing.minOrderPrice, config)})`);
  }
  if (p.translationCopiesPrice > 0) {
    lines.push(`Доп. нотар. копии перевода (${p.translationCopies} × ${p.totalPages} стр.): ${formatPrice(p.translationCopiesPrice, config)}`);
  }
  if (p.passportCopiesPrice > 0) {
    lines.push(`Нотар. копии паспорта (${p.passportCopies} × ${p.totalPages} стр.): ${formatPrice(p.passportCopiesPrice, config)}`);
  }
  lines.push('');
  lines.push(`ИТОГО: ${formatPrice(p.finalPrice, config)}`);

  return lines.join('\n');
}
