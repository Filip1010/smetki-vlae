import { describe, it, expect } from 'vitest';
import { parseVodovod } from '../../lib/parsers/vodovod';

const SAMPLE_BODY = `
Почитуван клиент,

Вашата сметка за вода за месец 5-2026
изнесува 237.00 денари.

Рок на плаќање 20.06.2026
`;

describe('parseVodovod', () => {
  it('parses all fields from a sample body', () => {
    const bill = parseVodovod(SAMPLE_BODY, 'msg-vod-001');
    expect(bill).not.toBeNull();
    expect(bill!.provider).toBe('Vodovod');
    expect(bill!.houseId).toBe('vlae');
    expect(bill!.amount).toBe(237);
    expect(bill!.month).toBe('05/2026');
    expect(bill!.dueDate).toBe('2026-06-20');
    expect(bill!.invoiceNumber).toBeNull();
    expect(bill!.gmailMessageId).toBe('msg-vod-001');
    expect(bill!.status).toBe('unpaid');
  });

  it('normalises single-digit month (5-2026 → 05/2026)', () => {
    const body = 'изнесува 100.00 денари\nза месец 1-2026';
    const bill = parseVodovod(body, 'msg-vod-002');
    expect(bill!.month).toBe('01/2026');
  });

  it('returns null when изнесува line is missing', () => {
    expect(parseVodovod('за месец 5-2026', 'msg-vod-003')).toBeNull();
  });

  it('returns null when amount is zero', () => {
    expect(parseVodovod('изнесува 0.00 денари', 'msg-vod-004')).toBeNull();
  });

  it('leaves month empty when месец line is absent', () => {
    const bill = parseVodovod('изнесува 150.00 денари', 'msg-vod-005');
    expect(bill!.month).toBe('');
  });
});
