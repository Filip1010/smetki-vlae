import { describe, it, expect } from 'vitest';
import { extractGrandTotal } from '../../lib/parsers/virtus';

const SAMPLE_PDF_TEXT = `
Фактура 5-2026-0-0-485-12345
Месец: 05/2026
Наслов          Износ
Услуга 1       500,00
Услуга 2       598,00
1.098,00
Доспеан долг 200,00
`;

const PDF_NO_TOTAL = `
Некои линии без број
Доспеан долг 200,00
`;

const PDF_MULTIPLE_CANDIDATES = `
Item A     300,00
Item B     200,00
500,00
Доспеан долг
`;

describe('extractGrandTotal', () => {
  it('returns the last standalone MK-format number before Доспеан долг', () => {
    expect(extractGrandTotal(SAMPLE_PDF_TEXT)).toBe(1098);
  });

  it('returns null when no standalone number appears before Доспеан долг', () => {
    expect(extractGrandTotal(PDF_NO_TOTAL)).toBeNull();
  });

  it('uses the last candidate, not the first', () => {
    expect(extractGrandTotal(PDF_MULTIPLE_CANDIDATES)).toBe(500);
  });

  it('returns null for empty string', () => {
    expect(extractGrandTotal('')).toBeNull();
  });

  it('handles text with no Доспеан долг marker (searches entire text)', () => {
    const text = 'random\n1.200,00\nmore text';
    expect(extractGrandTotal(text)).toBe(1200);
  });
});
