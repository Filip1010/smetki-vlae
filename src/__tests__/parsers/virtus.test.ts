import { describe, it, expect } from 'vitest';
import { extractGrandTotal, extractMonth } from '../../lib/parsers/virtus';

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

  it('reads a labelled total sharing a line with its label', () => {
    const text = [
      'Ставка 1 500,00',
      'Ставка 2 598,00',
      'Вкупно за плаќање 1.098,00',
      'Доспеан долг 200,00',
    ].join('\n');
    expect(extractGrandTotal(text)).toBe(1098);
  });

  it('reads a labelled total pushed onto the following line', () => {
    expect(extractGrandTotal('Вкупно за уплата\n2.450,00\n')).toBe(2450);
  });

  it('prefers the labelled total over a later standalone number', () => {
    const text = 'Вкупно за плаќање 1.098,00\nСтр. 1\n7\n';
    expect(extractGrandTotal(text)).toBe(1098);
  });

  it('reads a four-digit total with a currency suffix', () => {
    expect(extractGrandTotal('Ставка\n4.293,00 ден.\n')).toBe(4293);
  });

  it('ignores bare row numbers when a decimal amount is present', () => {
    expect(extractGrandTotal('1\n2\n1.098,00\n3\n')).toBe(1098);
  });

  it('never returns the outstanding debt as the total', () => {
    expect(extractGrandTotal('Доспеан долг\n9.999,00\n')).toBeNull();
  });
});

describe('extractMonth', () => {
  const ARRIVED = new Date('2026-06-08T09:00:00Z');

  it('reads an explicit "за месец MM/YYYY"', () => {
    expect(extractMonth('Фактура за месец 05/2026', ARRIVED))
      .toEqual({ month: '05/2026', guessed: false });
  });

  it('reads a Macedonian month name with a year', () => {
    expect(extractMonth('Сметка за мај 2026 година', ARRIVED))
      .toEqual({ month: '05/2026', guessed: false });
  });

  it('reads a bare MM-YYYY token', () => {
    expect(extractMonth('период 5-2026', ARRIVED))
      .toEqual({ month: '05/2026', guessed: false });
  });

  it('falls back to the earliest DD.MM.YYYY date in the document', () => {
    expect(extractMonth('Датум на достасување 20.06.2026\nИздадена 31.05.2026', ARRIVED))
      .toEqual({ month: '05/2026', guessed: false });
  });

  it('rejects an out-of-range month rather than trusting it', () => {
    // "17/2026" is an invoice fragment, not a month — fall through to the date.
    expect(extractMonth('бр. 17/2026 од 31.05.2026', ARRIVED))
      .toEqual({ month: '05/2026', guessed: false });
  });

  it('guesses the prior month from the mail date when nothing is stated', () => {
    expect(extractMonth('Ваша фактура е во прилог', ARRIVED))
      .toEqual({ month: '05/2026', guessed: true });
  });

  it('wraps to December of the previous year for January mail', () => {
    expect(extractMonth('нема датум', new Date('2026-01-04T09:00:00Z')))
      .toEqual({ month: '12/2025', guessed: true });
  });
});
