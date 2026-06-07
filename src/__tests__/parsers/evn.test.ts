import { describe, it, expect } from 'vitest';
import { parseEVN } from '../../lib/parsers/evn';

const SAMPLE_BODY = `
Почитуван клиент,

Ве известуваме дека Вашата сметка за електрична енергија
изнесува износ од 4293.00 денари.

Рок на плаќање до 06.02.2026

Број на фактура: ФЕ-1159869027
`;

describe('parseEVN', () => {
  it('parses all fields from a sample body', () => {
    const bill = parseEVN(SAMPLE_BODY, 'msg-evn-001');
    expect(bill).not.toBeNull();
    expect(bill!.provider).toBe('EVN');
    expect(bill!.houseId).toBe('vlae');
    expect(bill!.amount).toBe(4293);
    expect(bill!.dueDate).toBe('2026-02-06');
    expect(bill!.month).toBe('01/2026');
    expect(bill!.invoiceNumber).toBe('ФЕ-1159869027');
    expect(bill!.gmailMessageId).toBe('msg-evn-001');
    expect(bill!.status).toBe('unpaid');
  });

  it('derives billing month as one month prior to due date', () => {
    const body = 'износ од 1000.00 денари\nрок на плаќање до 15.01.2026';
    const bill = parseEVN(body, 'msg-evn-002');
    expect(bill!.month).toBe('12/2025');
  });

  it('returns null when износ line is missing', () => {
    expect(parseEVN('рок на плаќање до 06.02.2026', 'msg-evn-003')).toBeNull();
  });

  it('returns null when amount is zero', () => {
    expect(parseEVN('износ од 0.00 денари', 'msg-evn-004')).toBeNull();
  });

  it('sets invoiceNumber to null when ФЕ- pattern is absent', () => {
    const bill = parseEVN('износ од 500.00 денари', 'msg-evn-005');
    expect(bill!.invoiceNumber).toBeNull();
  });
});
