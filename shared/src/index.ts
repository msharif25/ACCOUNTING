/**
 * Shared domain types used by both the server and the web client.
 *
 * Money is always represented as an integer number of **cents** to avoid
 * floating-point rounding errors. Format to a decimal string only at the UI
 * boundary (see `web/src/format.ts`).
 */

export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';

export const ACCOUNT_TYPES: readonly AccountType[] = [
  'asset',
  'liability',
  'equity',
  'income',
  'expense',
];

export interface Account {
  id: string;
  /** Human-readable account name, e.g. "Cash" or "Accounts Payable". */
  name: string;
  type: AccountType;
}

export interface JournalLine {
  accountId: string;
  /** Debit amount in integer cents. Exactly one of debit/credit is > 0. */
  debit: number;
  /** Credit amount in integer cents. Exactly one of debit/credit is > 0. */
  credit: number;
}

export interface JournalEntry {
  id: string;
  /** ISO calendar date, `YYYY-MM-DD`. */
  date: string;
  description: string;
  lines: JournalLine[];
}

/** Payload accepted by `POST /api/entries` (server assigns the `id`). */
export interface NewJournalEntry {
  date: string;
  description: string;
  lines: JournalLine[];
}

/** Payload accepted by `POST /api/accounts` (server assigns the `id`). */
export interface NewAccount {
  name: string;
  type: AccountType;
}

export interface TrialBalanceRow {
  accountId: string;
  name: string;
  type: AccountType;
  /** Net debit balance in cents (0 if the account nets to a credit). */
  debit: number;
  /** Net credit balance in cents (0 if the account nets to a debit). */
  credit: number;
}

export interface TrialBalance {
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  /** `totalDebit === totalCredit` whenever every entry is balanced. */
  balanced: boolean;
}
