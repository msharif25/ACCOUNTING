import { describe, expect, it } from 'vitest';
import type { Account, JournalEntry } from '@accounting/shared';
import { accountBalance, trialBalance, validateLines } from './ledger.js';

const cash: Account = { id: 'a-cash', name: 'Cash', type: 'asset' };
const revenue: Account = { id: 'a-rev', name: 'Sales Revenue', type: 'income' };

/** A balanced entry: $100.00 of cash received for sales revenue. */
const sale: JournalEntry = {
  id: 'e1',
  date: '2026-01-01',
  description: 'Cash sale',
  lines: [
    { accountId: cash.id, debit: 10000, credit: 0 },
    { accountId: revenue.id, debit: 0, credit: 10000 },
  ],
};

describe('validateLines', () => {
  it('accepts a balanced two-line entry', () => {
    expect(validateLines(sale.lines)).toEqual([]);
  });

  it('rejects an entry with fewer than two lines', () => {
    expect(validateLines([{ accountId: cash.id, debit: 10000, credit: 0 }])).toContain(
      'An entry must have at least two lines.',
    );
  });

  it('rejects an unbalanced entry', () => {
    const errors = validateLines([
      { accountId: cash.id, debit: 10000, credit: 0 },
      { accountId: revenue.id, debit: 0, credit: 9000 },
    ]);
    expect(errors.some((e) => e.includes('not balanced'))).toBe(true);
  });

  it('rejects a line with both a debit and a credit', () => {
    const errors = validateLines([
      { accountId: cash.id, debit: 10000, credit: 10000 },
      { accountId: revenue.id, debit: 0, credit: 10000 },
    ]);
    expect(errors.some((e) => e.includes('exactly one'))).toBe(true);
  });

  it('rejects non-integer (fractional-cent) amounts', () => {
    const errors = validateLines([
      { accountId: cash.id, debit: 100.5, credit: 0 },
      { accountId: revenue.id, debit: 0, credit: 100.5 },
    ]);
    expect(errors.some((e) => e.includes('integer cents'))).toBe(true);
  });
});

describe('accountBalance', () => {
  it('computes a debit-normal (asset) balance', () => {
    expect(accountBalance(cash, [sale])).toBe(10000);
  });

  it('computes a credit-normal (income) balance', () => {
    expect(accountBalance(revenue, [sale])).toBe(10000);
  });
});

describe('trialBalance', () => {
  it('balances when all entries are balanced', () => {
    const tb = trialBalance([cash, revenue], [sale]);
    expect(tb.totalDebit).toBe(10000);
    expect(tb.totalCredit).toBe(10000);
    expect(tb.balanced).toBe(true);
  });
});
