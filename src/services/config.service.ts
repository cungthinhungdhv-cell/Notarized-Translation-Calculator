import yaml from 'js-yaml';
import type { AppConfig } from '../types';

const DEFAULT_CONFIG: AppConfig = {
  pricing: {
    minOrderPrice: 580000,
    pricePerCharacter: 500,
    countSpaces: false,
    notaryCopyTranslation: 50000,
    notaryCopyPassport: 50000,
  },
  ocr: {
    languages: ['rus', 'eng'],
  },
  limits: {
    maxFileSizeMB: 50,
    maxFilesAtOnce: 10,
  },
  ui: {
    currency: '₫',
    locale: 'ru-RU',
  },
};

export async function loadConfig(): Promise<AppConfig> {
  try {
    const response = await fetch('/config/pricing.yaml');
    if (!response.ok) {
      console.warn('Failed to load config, using defaults');
      return DEFAULT_CONFIG;
    }
    const yamlText = await response.text();
    const config = (yaml.load(yamlText) ?? {}) as Partial<AppConfig>;
    // Глубокий мёрж: yaml может не содержать какие-то поля (напр. цены копий) —
    // тогда берём значения из DEFAULT_CONFIG, а не теряем их.
    return {
      pricing: { ...DEFAULT_CONFIG.pricing, ...config.pricing },
      ocr: { ...DEFAULT_CONFIG.ocr, ...config.ocr },
      limits: { ...DEFAULT_CONFIG.limits, ...config.limits },
      ui: { ...DEFAULT_CONFIG.ui, ...config.ui },
    };
  } catch (error) {
    console.warn('Error loading config, using defaults:', error);
    return DEFAULT_CONFIG;
  }
}

export function formatPrice(amount: number, config: AppConfig): string {
  const formatted = new Intl.NumberFormat(config.ui.locale).format(amount);
  return `${formatted}${config.ui.currency}`;
}

export function formatNumber(num: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(num);
}
