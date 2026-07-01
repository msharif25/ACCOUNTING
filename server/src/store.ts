/**
 * In-memory data store with seed data. This is intentionally the *only* place
 * that holds mutable state, so it can later be swapped for a real database
 * (e.g. SQLite/Postgres) without touching the domain logic or routes.
 */
import { randomUUID } from 'node:crypto';
import type { Account, JournalEntry, NewAccount, NewJournalEntry } from '@accounting/shared';

export class Store {
  private accounts: Account[] = [];
  private entries: JournalEntry[] = [];

  constructor() {
    this.seed();
  }

  listAccounts(): Account[] {
    return [...this.accounts];
  }

  getAccount(id: string): Account | undefined {
    return this.accounts.find((a) => a.id === id);
  }

  createAccount(input: NewAccount): Account {
    const account: Account = { id: randomUUID(), ...input };
    this.accounts.push(account);
    return account;
  }

  listEntries(): JournalEntry[] {
    return [...this.entries];
  }

  createEntry(input: NewJournalEntry): JournalEntry {
    const entry: JournalEntry = { id: randomUUID(), ...input };
    this.entries.push(entry);
    return entry;
  }

  private seed(): void {
    const cash = this.createAccount({ name: 'Cash', type: 'asset' });
    const equipment = this.createAccount({ name: 'Equipment', type: 'asset' });
    const payable = this.createAccount({ name: 'Accounts Payable', type: 'liability' });
    const capital = this.createAccount({ name: 'Owner Capital', type: 'equity' });
    const revenue = this.createAccount({ name: 'Sales Revenue', type: 'income' });
    this.createAccount({ name: 'Rent Expense', type: 'expense' });

    // Owner invests $5,000.00 to start the business.
    this.createEntry({
      date: '2026-01-01',
      description: 'Owner investment',
      lines: [
        { accountId: cash.id, debit: 500000, credit: 0 },
        { accountId: capital.id, debit: 0, credit: 500000 },
      ],
    });

    // Buy $1,200.00 of equipment on credit.
    this.createEntry({
      date: '2026-01-05',
      description: 'Purchase equipment on account',
      lines: [
        { accountId: equipment.id, debit: 120000, credit: 0 },
        { accountId: payable.id, debit: 0, credit: 120000 },
      ],
    });

    // Cash sale of $800.00.
    this.createEntry({
      date: '2026-01-10',
      description: 'Cash sale',
      lines: [
        { accountId: cash.id, debit: 80000, credit: 0 },
        { accountId: revenue.id, debit: 0, credit: 80000 },
      ],
    });
  }
}
