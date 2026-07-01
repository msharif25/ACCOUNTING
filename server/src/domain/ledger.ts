/**
 * Pure double-entry accounting logic. No I/O, no framework types — everything
 * here is deterministic and unit-tested in `ledger.test.ts`.
 */
import type {
  Account,
  AccountType,
  JournalEntry,
  JournalLine,
  TrialBalance,
  TrialBalanceRow,
} from '@accounting/shared';

/**
 * Whether an account type increases with debits (its "normal balance" is a
 * debit). Assets and expenses are debit-normal; liabilities, equity and income
 * are credit-normal.
 */
const DEBIT_NORMAL: Record<AccountType, boolean> = {
  asset: true,
  expense: true,
  liability: false,
  equity: false,
  income: false,
};

export function isDebitNormal(type: AccountType): boolean {
  return DEBIT_NORMAL[type];
}

/**
 * Validate a set of journal lines for double-entry correctness. Returns a list
 * of human-readable error messages; an empty list means the entry is valid.
 */
export function validateLines(lines: JournalLine[]): string[] {
  const errors: string[] = [];

  if (!Array.isArray(lines) || lines.length < 2) {
    errors.push('An entry must have at least two lines.');
    return errors;
  }

  let totalDebit = 0;
  let totalCredit = 0;

  for (const [i, line] of lines.entries()) {
    const where = `line ${i + 1}`;
    if (!Number.isInteger(line.debit) || !Number.isInteger(line.credit)) {
      errors.push(`${where}: amounts must be integer cents.`);
    }
    if (line.debit < 0 || line.credit < 0) {
      errors.push(`${where}: amounts must be non-negative.`);
    }
    // Exactly one of debit/credit must be positive.
    if (line.debit > 0 === line.credit > 0) {
      errors.push(`${where}: exactly one of debit or credit must be greater than zero.`);
    }
    totalDebit += line.debit;
    totalCredit += line.credit;
  }

  if (totalDebit !== totalCredit) {
    errors.push(
      `Entry is not balanced: debits (${totalDebit}) must equal credits (${totalCredit}).`,
    );
  }

  return errors;
}

/** Sum the raw debit/credit cents posted to an account across all entries. */
function postings(accountId: string, entries: JournalEntry[]): { debit: number; credit: number } {
  let debit = 0;
  let credit = 0;
  for (const entry of entries) {
    for (const line of entry.lines) {
      if (line.accountId === accountId) {
        debit += line.debit;
        credit += line.credit;
      }
    }
  }
  return { debit, credit };
}

/**
 * The signed balance of an account in its normal-balance direction, in cents.
 * A positive result means the account carries its normal balance (e.g. a
 * positive asset balance), negative means the opposite.
 */
export function accountBalance(account: Account, entries: JournalEntry[]): number {
  const { debit, credit } = postings(account.id, entries);
  return isDebitNormal(account.type) ? debit - credit : credit - debit;
}

/**
 * Build a trial balance: one row per account with its net debit or credit
 * balance. When every entry is balanced, `totalDebit === totalCredit`.
 */
export function trialBalance(accounts: Account[], entries: JournalEntry[]): TrialBalance {
  const rows: TrialBalanceRow[] = accounts.map((account) => {
    const { debit, credit } = postings(account.id, entries);
    const net = debit - credit;
    return {
      accountId: account.id,
      name: account.name,
      type: account.type,
      debit: net > 0 ? net : 0,
      credit: net < 0 ? -net : 0,
    };
  });

  const totalDebit = rows.reduce((sum, row) => sum + row.debit, 0);
  const totalCredit = rows.reduce((sum, row) => sum + row.credit, 0);

  return { rows, totalDebit, totalCredit, balanced: totalDebit === totalCredit };
}
