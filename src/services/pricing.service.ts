import type { PricingConfig, PageResult, PageBreakdown, DocumentResult } from '../types';

export function countCharacters(text: string, countSpaces: boolean): number {
  if (countSpaces) {
    return text.length;
  }
  return text.replace(/\s/g, '').length;
}

export function calculateDocumentPrice(
  fileId: string,
  fileName: string,
  pages: PageResult[],
  config: PricingConfig
): DocumentResult {
  const pagesBreakdown: PageBreakdown[] = pages.map((page) => {
    const charCount = countCharacters(page.text, config.countSpaces);
    const price = charCount * config.pricePerCharacter;

    return {
      pageNumber: page.pageNumber,
      characterCount: charCount,
      price,
    };
  });

  return {
    fileId,
    fileName,
    pages: pagesBreakdown,
    totalCharacters: pagesBreakdown.reduce((sum, p) => sum + p.characterCount, 0),
    totalPrice: pagesBreakdown.reduce((sum, p) => sum + p.price, 0),
  };
}
