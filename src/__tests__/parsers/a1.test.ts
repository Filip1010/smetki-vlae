import { describe, it, expect } from 'vitest';
import { parseA1 } from '../../lib/parsers/a1';

const SAMPLE_BODY = `
Почитуван Клиент,

Сметка за месец: 05/2026
Број на фактура: 108770496041
Износ: 2.013,00 ден.
Рок на плаќање: 15.06.2026
`;

describe('parseA1', () => {
  it('parses all fields from a sample body', () => {
    const bill = parseA1(SAMPLE_BODY, 'msg-a1-001');
    expect(bill).not.toBeNull();
    expect(bill!.provider).toBe('A1');
    expect(bill!.houseId).toBe('resen');
    expect(bill!.amount).toBe(2013);
    expect(bill!.month).toBe('05/2026');
    expect(bill!.dueDate).toBe('2026-06-15');
    expect(bill!.invoiceNumber).toBe('108770496041');
    expect(bill!.gmailMessageId).toBe('msg-a1-001');
    expect(bill!.status).toBe('unpaid');
  });

  it('returns null when Износ line is missing', () => {
    const body = 'Сметка за месец: 05/2026\nРок на плаќање: 15.06.2026';
    expect(parseA1(body, 'msg-a1-002')).toBeNull();
  });

  it('returns null when amount is zero or invalid', () => {
    expect(parseA1('Износ: 0,00 ден.', 'msg-a1-003')).toBeNull();
    expect(parseA1('Износ: abc ден.', 'msg-a1-004')).toBeNull();
  });

  it('sets invoiceNumber to null when missing', () => {
    const bill = parseA1('Износ: 500,00 ден.', 'msg-a1-005');
    expect(bill).not.toBeNull();
    expect(bill!.invoiceNumber).toBeNull();
  });

  it('sets id and fetchedAt automatically', () => {
    const bill = parseA1(SAMPLE_BODY, 'msg-a1-006');
    expect(bill!.id).toBeTruthy();
    expect(bill!.fetchedAt).toBeTruthy();
  });
});
