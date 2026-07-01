/** Thin typed wrapper over the REST API. */
import type {
  Account,
  JournalEntry,
  NewAccount,
  NewJournalEntry,
  TrialBalance,
} from '@accounting/shared';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { errors?: string[] } | null;
    throw new Error(body?.errors?.join('; ') ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listAccounts: () => request<Account[]>('/accounts'),
  createAccount: (input: NewAccount) =>
    request<Account>('/accounts', { method: 'POST', body: JSON.stringify(input) }),
  listEntries: () => request<JournalEntry[]>('/entries'),
  createEntry: (input: NewJournalEntry) =>
    request<JournalEntry>('/entries', { method: 'POST', body: JSON.stringify(input) }),
  trialBalance: () => request<TrialBalance>('/reports/trial-balance'),
};
