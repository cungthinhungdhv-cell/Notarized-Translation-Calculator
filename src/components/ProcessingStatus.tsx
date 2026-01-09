import { Loader2, FileText, ScanSearch, Calculator, CheckCircle } from 'lucide-react';
import type { ProcessingProgress } from '../types';

interface ProcessingStatusProps {
  progress: ProcessingProgress | null;
}

const STAGE_INFO = {
  loading: {
    label: 'Загрузка файла',
    icon: FileText,
  },
  extracting: {
    label: 'Извлечение текста',
    icon: FileText,
  },
  ocr: {
    label: 'Распознавание (OCR)',
    icon: ScanSearch,
  },
  calculating: {
    label: 'Расчёт стоимости',
    icon: Calculator,
  },
  done: {
    label: 'Готово',
    icon: CheckCircle,
  },
};

export function ProcessingStatus({ progress }: ProcessingStatusProps) {
  if (!progress) return null;

  const stageInfo = STAGE_INFO[progress.stage];
  const Icon = stageInfo.icon;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-4">
        {progress.stage !== 'done' ? (
          <div className="relative">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : (
          <CheckCircle className="w-8 h-8 text-green-500" />
        )}

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Icon className="w-4 h-4 text-gray-500" />
            <span className="font-medium text-gray-700">{stageInfo.label}</span>
          </div>

          <p className="text-sm text-gray-500 truncate">{progress.fileName}</p>

          {progress.totalPages > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              Страница {progress.currentPage} из {progress.totalPages}
            </p>
          )}
        </div>
      </div>

      {progress.stage === 'ocr' && progress.ocrProgress > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Распознавание</span>
            <span>{Math.round(progress.ocrProgress)}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress.ocrProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
