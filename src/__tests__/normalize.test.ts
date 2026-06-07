import { describe, it, expect } from 'vitest';
import { parseMKDAmount, parseDate, parseMonth, monthPrior } from '../lib/normalize';

describe('parseMKDAmount', () => {
  it('parses MK format with thousands separator', () => {
    expect(parseMKDAmount('2.013,00')).toBe(2013);
    expect(parseMKDAmount('1.098,00')).toBe(1098);
  });

  it('parses plain decimal format', () => {
    expect(parseMKDAmount('4293.00')).toBe(4293);
    expect(parseMKDAmount('237.00')).toBe(237);
  });

  it('returns null for empty string', () => {
    expect(parseMKDAmount('')).toBeNull();
  });

  it('returns null for zero', () => {
    expect(parseMKDAmount('0')).toBeNull();
    expect(parseMKDAmount('0,00')).toBeNull();
  });

  it('returns null for NaN', () => {
    expect(parseMKDAmount('abc')).toBeNull();
  });
});

describe('parseDate', () => {
  it('converts DD.MM.YYYY to YYYY-MM-DD', () => {
    expect(parseDate('15.06.2026')).toBe('2026-06-15');
    expect(parseDate('06.02.2026')).toBe('2026-02-06');
    expect(parseDate('20.06.2026')).toBe('2026-06-20');
  });

  it('returns null when no date found', () => {
    expect(parseDate('no date here')).toBeNull();
  });
});

describe('parseMonth', () => {
  it('normalises MM/YYYY', () => {
    expect(parseMonth('05/2026')).toBe('05/2026');
  });

  it('zero-pads single-digit month from slash format', () => {
    expect(parseMonth('5/2026')).toBe('05/2026');
  });

  it('converts M-YYYY (Vodovod format) to MM/YYYY', () => {
    expect(parseMonth('5-2026')).toBe('05/2026');
    expect(parseMonth('12-2026')).toBe('12/2026');
  });

  it('returns null when no pattern matches', () => {
    expect(parseMonth('no month')).toBeNull();
  });
});

describe('monthPrior', () => {
  it('returns the previous month', () => {
    expect(monthPrior('02/2026')).toBe('01/2026');
    expect(monthPrior('06/2026')).toBe('05/2026');
  });

  it('wraps January back to December of the prior year', () => {
    expect(monthPrior('01/2026')).toBe('12/2025');
  });

  it('returns null for invalid input', () => {
    expect(monthPrior('bad')).toBeNull();
  });
});
