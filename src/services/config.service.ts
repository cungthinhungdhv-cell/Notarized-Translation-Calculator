import yaml from 'js-yaml';
import type { AppConfig } from '../types';

const DEFAULT_CONFIG: AppConfig = {
  pricing: {
    minOrderPrice: 300000,
    pricePerCharacter: 500,
    countSpaces: false,
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
    const config = yaml.load(yamlText) as AppConfig;
    return { ...DEFAULT_CONFIG, ...config };
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
