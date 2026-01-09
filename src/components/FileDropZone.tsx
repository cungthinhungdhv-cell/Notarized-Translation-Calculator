import { useCallback, useState, useEffect } from 'react';
import { Upload, FileText, Image, Clipboard } from 'lucide-react';

interface FileDropZoneProps {
  onFilesSelected: (files: File[]) => void;
  acceptedTypes: string[];
  maxFiles: number;
  maxSizeMB: number;
  disabled?: boolean;
}

const ACCEPTED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
const ACCEPTED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

export function FileDropZone({
  onFilesSelected,
  maxFiles,
  maxSizeMB,
  disabled = false,
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasteHint, setPasteHint] = useState(false);

  const validateFiles = useCallback(
    (files: File[]): File[] => {
      const validFiles: File[] = [];
      const errors: string[] = [];

      if (files.length > maxFiles) {
        errors.push(`Максимум ${maxFiles} файлов за раз`);
        files = files.slice(0, maxFiles);
      }

      for (const file of files) {
        // Check by MIME type first (for pasted files that might not have extension)
        if (ACCEPTED_MIME_TYPES.includes(file.type)) {
          if (file.size > maxSizeMB * 1024 * 1024) {
            errors.push(`${file.name}: превышен лимит ${maxSizeMB}MB`);
            continue;
          }
          validFiles.push(file);
          continue;
        }

        // Fallback to extension check
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!ACCEPTED_EXTENSIONS.includes(ext)) {
          errors.push(`${file.name}: неподдерживаемый формат`);
          continue;
        }

        if (file.size > maxSizeMB * 1024 * 1024) {
          errors.push(`${file.name}: превышен лимит ${maxSizeMB}MB`);
          continue;
        }

        validFiles.push(file);
      }

      if (errors.length > 0) {
        setError(errors.join('. '));
        setTimeout(() => setError(null), 5000);
      }

      return validFiles;
    },
    [maxFiles, maxSizeMB]
  );

  // Handle Ctrl+V paste
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (disabled) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];

      for (const item of Array.from(items)) {
        // Handle files
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            // If pasted image doesn't have a proper name, give it one
            if (file.name === 'image.png' || !file.name) {
              const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
              const ext = file.type.split('/')[1] || 'png';
              const namedFile = new File([file], `pasted_${timestamp}.${ext}`, {
                type: file.type,
              });
              files.push(namedFile);
            } else {
              files.push(file);
            }
          }
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        const validFiles = validateFiles(files);
        if (validFiles.length > 0) {
          // Show visual feedback
          setPasteHint(true);
          setTimeout(() => setPasteHint(false), 1000);
          onFilesSelected(validFiles);
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [disabled, validateFiles, onFilesSelected]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      const validFiles = validateFiles(files);
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    },
    [disabled, validateFiles, onFilesSelected]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    if (disabled) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = ACCEPTED_EXTENSIONS.join(',');

    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      const validFiles = validateFiles(files);
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    };

    input.click();
  }, [disabled, validateFiles, onFilesSelected]);

  const isActive = isDragging || pasteHint;

  return (
    <div className="w-full">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-all duration-200 ease-in-out
          ${
            isActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className={`
            p-4 rounded-full
            ${isActive ? 'bg-blue-100' : 'bg-gray-100'}
          `}
          >
            <Upload
              className={`w-8 h-8 ${isActive ? 'text-blue-500' : 'text-gray-400'}`}
            />
          </div>

          <div>
            <p className="text-lg font-medium text-gray-700">
              {isDragging
                ? 'Отпустите файлы здесь'
                : pasteHint
                ? 'Файл вставлен!'
                : 'Перетащите, выберите или вставьте (Ctrl+V)'}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              PDF или изображения (JPG, PNG, WebP)
            </p>
          </div>

          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <FileText className="w-4 h-4" />
              <span>PDF</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Image className="w-4 h-4" />
              <span>Изображения</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Clipboard className="w-4 h-4" />
              <span>Ctrl+V</span>
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Максимум {maxFiles} файлов, до {maxSizeMB}MB каждый
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
